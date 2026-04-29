import crypto from 'node:crypto';
import { ensureMongoReady, getMongoDb, getMongoHealth, getMyCoachCollectionNames } from './mongo.js';
import { getS3Health, uploadMyCoachAudioObject, deleteMyCoachAudioObjects } from './s3.js';
import { safeFileName } from './storage.js';

const COLLECTIONS = getMyCoachCollectionNames();

export async function getPersistenceStatus() {
  const [mongo, s3] = await Promise.all([getMongoHealth(), getS3Health()]);

  return {
    mode: mongo.configured ? 'mongodb' : 'unconfigured',
    mongo,
    s3,
  };
}

export async function listCustomers() {
  const collection = await getCollection(COLLECTIONS.customers);
  const rows = await collection.find({}, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
  return rows.map(mapCustomerRecord);
}

export async function createCustomer(payload) {
  const collection = await getCollection(COLLECTIONS.customers);
  const now = nowIso();
  const row = {
    id: crypto.randomUUID(),
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    notes: payload.notes,
    status: payload.status,
    metadata: sanitizeObject(payload.metadata),
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(row);
  return mapCustomerRecord(row);
}

export async function getCustomer(customerId) {
  const collection = await getCollection(COLLECTIONS.customers);
  const row = await collection.findOne({ id: customerId }, { projection: { _id: 0 } });
  return mapCustomerRecord(row);
}

export async function updateCustomer(customerId, payload) {
  const collection = await getCollection(COLLECTIONS.customers);
  const next = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    notes: payload.notes,
    status: payload.status,
    metadata: sanitizeObject(payload.metadata),
    updatedAt: nowIso(),
  };

  await collection.updateOne({ id: customerId }, { $set: next });
  return getCustomer(customerId);
}

export async function deleteCustomer(customerId) {
  const sessions = await listCustomerSessions(customerId);
  const audioAssets = await listCustomerAudioAssets(customerId);
  await deleteAudioAssetsByIds(audioAssets.map((asset) => asset.id));

  const db = await getMongoDb();
  await Promise.all([
    db.collection(COLLECTIONS.customers).deleteOne({ id: customerId }),
    db.collection(COLLECTIONS.sessions).deleteMany({ customerId }),
    db.collection(COLLECTIONS.reports).deleteMany({ customerId }),
    db.collection(COLLECTIONS.audioAssets).deleteMany({ customerId }),
  ]);

  return sessions.length;
}

export async function listSessions() {
  const collection = await getCollection(COLLECTIONS.sessions);
  const rows = await collection.find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return rows.map(mapSessionRecord);
}

export async function listCustomerSessions(customerId) {
  const collection = await getCollection(COLLECTIONS.sessions);
  const rows = await collection.find({ customerId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return rows.map(mapSessionRecord);
}

export async function createSession(payload) {
  const collection = await getCollection(COLLECTIONS.sessions);
  const now = nowIso();
  const row = {
    id: crypto.randomUUID(),
    customerId: payload.customerId,
    title: payload.title,
    mode: payload.mode,
    status: payload.status,
    visitNumber: (await countCustomerSessions(payload.customerId)) + 1,
    transcriptText: '',
    transcript: [],
    analysis: {},
    reportId: null,
    processingStartedAt: null,
    processingCompletedAt: null,
    errorMessage: null,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(row);
  return mapSessionRecord(row);
}

export async function getSession(sessionId) {
  const collection = await getCollection(COLLECTIONS.sessions);
  const row = await collection.findOne({ id: sessionId }, { projection: { _id: 0 } });
  return mapSessionRecord(row);
}

export async function updateSession(sessionId, patch) {
  const collection = await getCollection(COLLECTIONS.sessions);
  const current = await getSession(sessionId);
  if (!current) return null;

  const next = {
    title: patch.title ?? current.title,
    mode: patch.mode ?? current.mode,
    status: patch.status ?? current.status,
    transcriptText: patch.transcriptText ?? current.transcriptText ?? '',
    transcript: Array.isArray(patch.transcript) ? patch.transcript : current.transcript ?? [],
    analysis: patch.analysis && typeof patch.analysis === 'object' ? patch.analysis : current.analysis ?? {},
    reportId: patch.reportId !== undefined ? patch.reportId : current.reportId ?? null,
    processingStartedAt:
      patch.processingStartedAt !== undefined ? patch.processingStartedAt : current.processingStartedAt ?? null,
    processingCompletedAt:
      patch.processingCompletedAt !== undefined ? patch.processingCompletedAt : current.processingCompletedAt ?? null,
    errorMessage: patch.errorMessage !== undefined ? patch.errorMessage : current.errorMessage ?? null,
    updatedAt: nowIso(),
  };

  await collection.updateOne({ id: sessionId }, { $set: next });
  return getSession(sessionId);
}

export async function deleteSession(sessionId) {
  const audioAssets = await listSessionAudioAssets(sessionId);
  await deleteAudioAssetsByIds(audioAssets.map((asset) => asset.id));

  const db = await getMongoDb();
  await Promise.all([
    db.collection(COLLECTIONS.sessions).deleteOne({ id: sessionId }),
    db.collection(COLLECTIONS.audioAssets).deleteMany({ sessionId }),
    db.collection(COLLECTIONS.reports).deleteMany({ sessionId }),
  ]);
}

export async function listCustomerAudioAssets(customerId) {
  const collection = await getCollection(COLLECTIONS.audioAssets);
  const rows = await collection.find({ customerId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return rows.map(mapAudioRecord);
}

export async function listSessionAudioAssets(sessionId) {
  const collection = await getCollection(COLLECTIONS.audioAssets);
  const rows = await collection.find({ sessionId }, { projection: { _id: 0 } }).sort({ createdAt: 1 }).toArray();
  return rows.map(mapAudioRecord);
}

export async function createAudioAssets(session, clips) {
  const collection = await getCollection(COLLECTIONS.audioAssets);
  const createdAt = nowIso();
  const rows = [];

  for (const [index, clip] of clips.entries()) {
    const audioId = crypto.randomUUID();
    const filename = `${safeFileName(clip.filename || `session-${session.id}-${Date.now()}-${index + 1}`, 'audio')}${mimeExtension(
      clip.mimeType,
    )}`;
    const buffer = Buffer.from(clip.audioBase64, 'base64');
    const uploaded = await uploadMyCoachAudioObject({
      audioId,
      customerId: session.customerId,
      sessionId: session.id,
      filename,
      mimeType: clip.mimeType,
      buffer,
    });

    const row = {
      id: audioId,
      sessionId: session.id,
      customerId: session.customerId,
      filename,
      mimeType: clip.mimeType,
      filePath: uploaded.filePath,
      bucket: uploaded.bucket,
      storageKey: uploaded.storageKey,
      sizeBytes: uploaded.sizeBytes,
      source: clip.source,
      transcriptText: String(clip.transcriptText || ''),
      durationMs: Number.isFinite(Number(clip.durationMs)) ? Number(clip.durationMs) : null,
      createdAt,
    };

    await collection.insertOne(row);
    rows.push(mapAudioRecord(row));
  }

  return rows;
}

export async function createAudioAssetsFromUploads(session, clips) {
  const collection = await getCollection(COLLECTIONS.audioAssets);
  const createdAt = nowIso();
  const rows = [];

  for (const [index, clip] of clips.entries()) {
    const filename = `${safeFileName(clip.filename || `session-${session.id}-${Date.now()}-${index + 1}`, 'audio')}${mimeExtension(
      clip.mimeType,
    )}`;

    const row = {
      id: clip.audioId,
      sessionId: session.id,
      customerId: session.customerId,
      filename,
      mimeType: clip.mimeType,
      filePath: clip.filePath,
      bucket: clip.bucket,
      storageKey: clip.storageKey,
      sizeBytes: clip.sizeBytes ?? null,
      source: clip.source,
      transcriptText: String(clip.transcriptText || ''),
      durationMs: Number.isFinite(Number(clip.durationMs)) ? Number(clip.durationMs) : null,
      createdAt,
    };

    await collection.insertOne(row);
    rows.push(mapAudioRecord(row));
  }

  return rows;
}

export async function listCustomerReports(customerId) {
  const collection = await getCollection(COLLECTIONS.reports);
  const rows = await collection.find({ customerId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray();
  return rows.map(mapReportRecord);
}

export async function createReport(payload) {
  const collection = await getCollection(COLLECTIONS.reports);
  const now = nowIso();
  const row = {
    id: crypto.randomUUID(),
    sessionId: payload.sessionId,
    customerId: payload.customerId,
    overallScore: payload.overallScore,
    grade: payload.grade,
    masterCopyVersion: payload.masterCopyVersion,
    masterCopyHash: payload.masterCopyHash,
    report: sanitizeObject(payload.report),
    reportPath: payload.reportPath || null,
    createdAt: now,
    updatedAt: now,
  };

  await collection.insertOne(row);
  return mapReportRecord(row);
}

export async function listReports() {
  const [rows, sessions, customers] = await Promise.all([
    (await getCollection(COLLECTIONS.reports)).find({}, { projection: { _id: 0 } }).sort({ createdAt: -1 }).toArray(),
    listSessions(),
    listCustomers(),
  ]);

  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return rows.map((row) => {
    const report = mapReportRecord(row);
    return {
      ...report,
      sessionTitle: sessionMap.get(report.sessionId)?.title || '',
      sessionCreatedAt: sessionMap.get(report.sessionId)?.createdAt || null,
      customerName: customerMap.get(report.customerId)?.name || '',
    };
  });
}

export async function getReport(reportId) {
  const collection = await getCollection(COLLECTIONS.reports);
  const row = await collection.findOne({ id: reportId }, { projection: { _id: 0 } });
  return mapReportRecord(row);
}

export async function updateReport(reportId, patch) {
  const collection = await getCollection(COLLECTIONS.reports);
  const current = await getReport(reportId);
  if (!current) return null;

  const next = {
    report: patch.report && typeof patch.report === 'object' ? patch.report : current.report,
    overallScore: patch.overallScore ?? current.overallScore,
    grade: patch.grade ?? current.grade,
    updatedAt: nowIso(),
  };

  await collection.updateOne({ id: reportId }, { $set: next });
  return getReport(reportId);
}

export async function deleteReport(reportId) {
  await (await getCollection(COLLECTIONS.reports)).deleteOne({ id: reportId });
}

export async function getLatestCompletedReportForCustomer(customerId, excludedSessionId = null) {
  const collection = await getCollection(COLLECTIONS.reports);
  const rows = await collection.find({ customerId }, { projection: { _id: 0 } }).sort({ createdAt: -1 }).limit(10).toArray();
  const matched = rows.map(mapReportRecord).find((row) => (excludedSessionId ? row.sessionId !== excludedSessionId : true));
  return matched || null;
}

async function countCustomerSessions(customerId) {
  return (await getCollection(COLLECTIONS.sessions)).countDocuments({ customerId });
}

async function deleteAudioAssetsByIds(audioIds) {
  const ids = [...new Set((audioIds || []).map((id) => String(id || '').trim()).filter(Boolean))];
  if (!ids.length) return;

  const collection = await getCollection(COLLECTIONS.audioAssets);
  const rows = await collection.find({ id: { $in: ids } }, { projection: { _id: 0, storageKey: 1 } }).toArray();
  await deleteMyCoachAudioObjects(rows.map((row) => row.storageKey));
}

async function getCollection(name) {
  const db = await ensureMongoReady();
  return db.collection(name);
}

function mapCustomerRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    name: row.name || '',
    phone: row.phone || '',
    email: row.email || '',
    notes: row.notes || '',
    status: row.status || 'active',
    metadata: sanitizeObject(row.metadata),
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapSessionRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    customerId: row.customerId,
    title: row.title || '',
    mode: row.mode || 'analysis',
    status: row.status || 'draft',
    visitNumber: Number(row.visitNumber || 1),
    transcriptText: row.transcriptText || '',
    transcript: Array.isArray(row.transcript) ? row.transcript : [],
    analysis: sanitizeObject(row.analysis),
    reportId: row.reportId || null,
    processingStartedAt: row.processingStartedAt || null,
    processingCompletedAt: row.processingCompletedAt || null,
    errorMessage: row.errorMessage || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapReportRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.sessionId,
    customerId: row.customerId,
    overallScore: Number(row.overallScore || 0),
    grade: row.grade || 'D',
    masterCopyVersion: row.masterCopyVersion || null,
    masterCopyHash: row.masterCopyHash || null,
    report: sanitizeObject(row.report),
    reportPath: row.reportPath || null,
    createdAt: row.createdAt,
    updatedAt: row.updatedAt,
  };
}

function mapAudioRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    sessionId: row.sessionId,
    customerId: row.customerId,
    filename: row.filename,
    mimeType: row.mimeType,
    filePath: row.filePath,
    bucket: row.bucket || null,
    storageKey: row.storageKey || null,
    sizeBytes: row.sizeBytes ?? null,
    source: row.source,
    transcriptText: row.transcriptText || '',
    durationMs: row.durationMs ?? null,
    createdAt: row.createdAt,
  };
}

function sanitizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : Array.isArray(value) ? value : {};
}

function nowIso() {
  return new Date().toISOString();
}

function mimeExtension(mimeType) {
  const normalized = String(mimeType || '').toLowerCase();
  if (normalized.includes('webm')) return '.webm';
  if (normalized.includes('mp4')) return '.mp4';
  if (normalized.includes('mpeg') || normalized.includes('mp3')) return '.mp3';
  if (normalized.includes('wav')) return '.wav';
  return '.bin';
}
