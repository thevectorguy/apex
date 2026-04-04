import crypto from 'node:crypto';
import path from 'node:path';
import './networkTls.js';
import { getDb, mapAudioRow, mapCustomerRow, mapReportRow, mapSessionRow, nowIso } from './db.js';
import { audioRoot } from './paths.js';
import { safeFileName, writeBufferFile } from './storage.js';

function getSupabaseConfig() {
  return {
    url: process.env.SUPABASE_URL || '',
    secretKey: process.env.SUPABASE_SECRET_KEY || process.env.SUPABASE_SERVICE_ROLE_KEY || '',
    audioBucket: process.env.SUPABASE_AUDIO_BUCKET || 'my-coach-audio',
  };
}

export function isSupabaseConfigured() {
  const config = getSupabaseConfig();
  return Boolean(config.url && config.secretKey);
}

export function getPersistenceStatus() {
  const config = getSupabaseConfig();
  return {
    mode: isSupabaseConfigured() ? 'supabase' : 'sqlite',
    supabase: {
      urlConfigured: Boolean(config.url),
      secretConfigured: Boolean(config.secretKey),
      usingLegacyServiceRoleEnv: Boolean(!process.env.SUPABASE_SECRET_KEY && process.env.SUPABASE_SERVICE_ROLE_KEY),
      audioBucket: config.audioBucket,
    },
  };
}

export async function listCustomers() {
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect('customers', { order: ['updated_at.desc'] });
    return rows.map(mapCustomerRow);
  }

  return getDb().prepare('SELECT * FROM customers ORDER BY updated_at DESC').all().map(mapCustomerRow);
}

export async function createCustomer(payload) {
  const now = nowIso();
  const row = {
    id: crypto.randomUUID(),
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    notes: payload.notes,
    status: payload.status,
    metadata_json: payload.metadata,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const [created] = await supabaseInsert('customers', row);
    return mapCustomerRow(created);
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO customers (id, name, phone, email, notes, status, metadata_json, created_at, updated_at)
    VALUES (@id, @name, @phone, @email, @notes, @status, @metadata_json, @created_at, @updated_at)
  `).run({
    ...row,
    metadata_json: JSON.stringify(payload.metadata),
  });
  return mapCustomerRow(db.prepare('SELECT * FROM customers WHERE id = ?').get(row.id));
}

export async function getCustomer(customerId) {
  if (isSupabaseConfigured()) {
    const [row] = await supabaseSelect('customers', { filters: { id: ['eq', customerId] }, limit: 1 });
    return mapCustomerRow(row);
  }

  return mapCustomerRow(getDb().prepare('SELECT * FROM customers WHERE id = ?').get(customerId));
}

export async function updateCustomer(customerId, payload) {
  const row = {
    name: payload.name,
    phone: payload.phone,
    email: payload.email,
    notes: payload.notes,
    status: payload.status,
    metadata_json: payload.metadata,
    updated_at: nowIso(),
  };

  if (isSupabaseConfigured()) {
    const [updated] = await supabaseUpdate('customers', { id: ['eq', customerId] }, row);
    return mapCustomerRow(updated);
  }

  const db = getDb();
  db.prepare(`
    UPDATE customers
    SET name = @name, phone = @phone, email = @email, notes = @notes, status = @status, metadata_json = @metadata_json, updated_at = @updated_at
    WHERE id = @id
  `).run({
    ...row,
    id: customerId,
    metadata_json: JSON.stringify(payload.metadata),
  });
  return mapCustomerRow(db.prepare('SELECT * FROM customers WHERE id = ?').get(customerId));
}

export async function deleteCustomer(customerId) {
  if (isSupabaseConfigured()) {
    await supabaseDelete('customers', { id: ['eq', customerId] });
    return;
  }

  getDb().prepare('DELETE FROM customers WHERE id = ?').run(customerId);
}

export async function listSessions() {
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect('coach_sessions', { order: ['created_at.desc'] });
    return rows.map(mapSessionRow);
  }

  return getDb().prepare('SELECT * FROM coach_sessions ORDER BY created_at DESC').all().map(mapSessionRow);
}

export async function listCustomerSessions(customerId) {
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect('coach_sessions', {
      filters: { customer_id: ['eq', customerId] },
      order: ['created_at.desc'],
    });
    return rows.map(mapSessionRow);
  }

  return getDb()
    .prepare('SELECT * FROM coach_sessions WHERE customer_id = ? ORDER BY created_at DESC')
    .all(customerId)
    .map(mapSessionRow);
}

export async function createSession(payload) {
  const now = nowIso();
  const visitNumber = (await countCustomerSessions(payload.customerId)) + 1;
  const row = {
    id: crypto.randomUUID(),
    customer_id: payload.customerId,
    title: payload.title,
    mode: payload.mode,
    status: payload.status,
    visit_number: visitNumber,
    transcript_text: '',
    transcript_json: [],
    analysis_json: {},
    report_id: null,
    processing_started_at: null,
    processing_completed_at: null,
    error_message: null,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const [created] = await supabaseInsert('coach_sessions', row);
    return mapSessionRow(created);
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO coach_sessions (id, customer_id, title, mode, status, visit_number, transcript_text, transcript_json, analysis_json, report_id, processing_started_at, processing_completed_at, error_message, created_at, updated_at)
    VALUES (@id, @customer_id, @title, @mode, @status, @visit_number, @transcript_text, @transcript_json, @analysis_json, @report_id, @processing_started_at, @processing_completed_at, @error_message, @created_at, @updated_at)
  `).run({
    ...row,
    transcript_json: '[]',
    analysis_json: '{}',
  });
  return mapSessionRow(db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(row.id));
}

export async function getSession(sessionId) {
  if (isSupabaseConfigured()) {
    const [row] = await supabaseSelect('coach_sessions', { filters: { id: ['eq', sessionId] }, limit: 1 });
    return mapSessionRow(row);
  }

  return mapSessionRow(getDb().prepare('SELECT * FROM coach_sessions WHERE id = ?').get(sessionId));
}

export async function updateSession(sessionId, patch) {
  const normalized = {
    title: patch.title,
    mode: patch.mode,
    status: patch.status,
    transcript_text: patch.transcriptText,
    transcript_json: patch.transcript,
    analysis_json: patch.analysis,
    report_id: patch.reportId,
    processing_started_at: patch.processingStartedAt,
    processing_completed_at: patch.processingCompletedAt,
    error_message: patch.errorMessage,
    updated_at: nowIso(),
  };

  if (isSupabaseConfigured()) {
    const [updated] = await supabaseUpdate('coach_sessions', { id: ['eq', sessionId] }, normalized);
    return mapSessionRow(updated);
  }

  const db = getDb();
  const existing = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(sessionId);
  if (!existing) return null;
  const current = mapSessionRow(existing);
  db.prepare(`
    UPDATE coach_sessions
    SET title = @title,
        mode = @mode,
        status = @status,
        transcript_text = @transcript_text,
        transcript_json = @transcript_json,
        analysis_json = @analysis_json,
        report_id = @report_id,
        processing_started_at = @processing_started_at,
        processing_completed_at = @processing_completed_at,
        error_message = @error_message,
        updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: sessionId,
    title: normalized.title ?? current.title,
    mode: normalized.mode ?? current.mode,
    status: normalized.status ?? current.status,
    transcript_text: normalized.transcript_text ?? current.transcriptText ?? '',
    transcript_json: JSON.stringify(normalized.transcript_json ?? current.transcript ?? []),
    analysis_json: JSON.stringify(normalized.analysis_json ?? current.analysis ?? {}),
    report_id: normalized.report_id ?? current.reportId ?? null,
    processing_started_at: normalized.processing_started_at ?? current.processingStartedAt ?? null,
    processing_completed_at: normalized.processing_completed_at ?? current.processingCompletedAt ?? null,
    error_message: normalized.error_message ?? current.errorMessage ?? null,
    updated_at: normalized.updated_at,
  });
  return mapSessionRow(db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(sessionId));
}

export async function deleteSession(sessionId) {
  if (isSupabaseConfigured()) {
    await supabaseDelete('coach_sessions', { id: ['eq', sessionId] });
    return;
  }

  getDb().prepare('DELETE FROM coach_sessions WHERE id = ?').run(sessionId);
}

export async function listCustomerAudioAssets(customerId) {
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect('audio_assets', {
      filters: { customer_id: ['eq', customerId] },
      order: ['created_at.desc'],
    });
    return rows.map(mapAudioRow);
  }

  return getDb()
    .prepare('SELECT * FROM audio_assets WHERE customer_id = ? ORDER BY created_at DESC')
    .all(customerId)
    .map(mapAudioRow);
}

export async function listSessionAudioAssets(sessionId) {
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect('audio_assets', {
      filters: { session_id: ['eq', sessionId] },
      order: ['created_at.asc'],
    });
    return rows.map(mapAudioRow);
  }

  return getDb()
    .prepare('SELECT * FROM audio_assets WHERE session_id = ? ORDER BY created_at ASC')
    .all(sessionId)
    .map(mapAudioRow);
}

export async function createAudioAssets(session, clips) {
  const createdAt = nowIso();
  const rows = [];

  for (const [index, clip] of clips.entries()) {
    const audioId = crypto.randomUUID();
    const filename = `${safeFileName(clip.filename || `session-${session.id}-${Date.now()}-${index + 1}`, 'audio')}${mimeExtension(clip.mimeType)}`;
    const objectPath = `${session.id}/${filename}`;
    const buffer = Buffer.from(clip.audioBase64, 'base64');

    let storedPath = objectPath;
    if (isSupabaseConfigured()) {
      storedPath = await uploadAudioToSupabase(objectPath, buffer, clip.mimeType);
      const [inserted] = await supabaseInsert('audio_assets', {
        id: audioId,
        session_id: session.id,
        customer_id: session.customerId,
        filename,
        mime_type: clip.mimeType,
        file_path: storedPath,
        source: clip.source,
        transcript_text: String(clip.transcriptText || ''),
        duration_ms: Number.isFinite(Number(clip.durationMs)) ? Number(clip.durationMs) : null,
        created_at: createdAt,
      });
      rows.push(mapAudioRow(inserted));
      continue;
    }

    const filePath = writeBufferFile(path.join(audioRoot, session.id), filename, buffer);
    const db = getDb();
    db.prepare(`
      INSERT INTO audio_assets (id, session_id, customer_id, filename, mime_type, file_path, source, transcript_text, duration_ms, created_at)
      VALUES (@id, @session_id, @customer_id, @filename, @mime_type, @file_path, @source, @transcript_text, @duration_ms, @created_at)
    `).run({
      id: audioId,
      session_id: session.id,
      customer_id: session.customerId,
      filename,
      mime_type: clip.mimeType,
      file_path: filePath,
      source: clip.source,
      transcript_text: String(clip.transcriptText || ''),
      duration_ms: Number.isFinite(Number(clip.durationMs)) ? Number(clip.durationMs) : null,
      created_at: createdAt,
    });
    rows.push(mapAudioRow(db.prepare('SELECT * FROM audio_assets WHERE id = ?').get(audioId)));
  }

  return rows;
}

export async function listCustomerReports(customerId) {
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect('reports', {
      filters: { customer_id: ['eq', customerId] },
      order: ['created_at.desc'],
    });
    return rows.map(mapReportRow);
  }

  return getDb()
    .prepare('SELECT * FROM reports WHERE customer_id = ? ORDER BY created_at DESC')
    .all(customerId)
    .map(mapReportRow);
}

export async function createReport(payload) {
  const now = nowIso();
  const row = {
    id: crypto.randomUUID(),
    session_id: payload.sessionId,
    customer_id: payload.customerId,
    overall_score: payload.overallScore,
    grade: payload.grade,
    master_copy_version: payload.masterCopyVersion,
    master_copy_hash: payload.masterCopyHash,
    report_json: payload.report,
    report_path: payload.reportPath || null,
    created_at: now,
    updated_at: now,
  };

  if (isSupabaseConfigured()) {
    const [created] = await supabaseInsert('reports', row);
    return mapReportRow(created);
  }

  const db = getDb();
  db.prepare(`
    INSERT INTO reports (id, session_id, customer_id, overall_score, grade, master_copy_version, master_copy_hash, report_json, report_path, created_at, updated_at)
    VALUES (@id, @session_id, @customer_id, @overall_score, @grade, @master_copy_version, @master_copy_hash, @report_json, @report_path, @created_at, @updated_at)
  `).run({
    ...row,
    report_json: JSON.stringify(payload.report),
    report_path: payload.reportPath || '',
  });
  return mapReportRow(db.prepare('SELECT * FROM reports WHERE id = ?').get(row.id));
}

export async function listReports() {
  const reports = isSupabaseConfigured()
    ? (await supabaseSelect('reports', { order: ['created_at.desc'] })).map(mapReportRow)
    : getDb().prepare('SELECT * FROM reports ORDER BY created_at DESC').all().map(mapReportRow);

  const sessions = await listSessions();
  const customers = await listCustomers();
  const sessionMap = new Map(sessions.map((session) => [session.id, session]));
  const customerMap = new Map(customers.map((customer) => [customer.id, customer]));

  return reports.map((report) => ({
    ...report,
    sessionTitle: sessionMap.get(report.sessionId)?.title || '',
    sessionCreatedAt: sessionMap.get(report.sessionId)?.createdAt || null,
    customerName: customerMap.get(report.customerId)?.name || customerMap.get(report.customerId)?.customerName || '',
  }));
}

export async function getReport(reportId) {
  if (isSupabaseConfigured()) {
    const [row] = await supabaseSelect('reports', { filters: { id: ['eq', reportId] }, limit: 1 });
    return mapReportRow(row);
  }

  return mapReportRow(getDb().prepare('SELECT * FROM reports WHERE id = ?').get(reportId));
}

export async function updateReport(reportId, patch) {
  const row = {
    report_json: patch.report,
    overall_score: patch.overallScore,
    grade: patch.grade,
    updated_at: nowIso(),
  };

  if (isSupabaseConfigured()) {
    const [updated] = await supabaseUpdate('reports', { id: ['eq', reportId] }, row);
    return mapReportRow(updated);
  }

  const db = getDb();
  db.prepare(`
    UPDATE reports
    SET report_json = @report_json, overall_score = @overall_score, grade = @grade, updated_at = @updated_at
    WHERE id = @id
  `).run({
    id: reportId,
    report_json: JSON.stringify(patch.report),
    overall_score: patch.overallScore,
    grade: patch.grade,
    updated_at: row.updated_at,
  });
  return mapReportRow(db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId));
}

export async function deleteReport(reportId) {
  if (isSupabaseConfigured()) {
    await supabaseDelete('reports', { id: ['eq', reportId] });
    return;
  }

  getDb().prepare('DELETE FROM reports WHERE id = ?').run(reportId);
}

export async function getLatestCompletedReportForCustomer(customerId, excludedSessionId = null) {
  if (isSupabaseConfigured()) {
    const filters = {
      customer_id: ['eq', customerId],
    };
    const rows = await supabaseSelect('reports', {
      filters,
      order: ['created_at.desc'],
      limit: 10,
    });
    const matched = rows
      .map(mapReportRow)
      .find((row) => (excludedSessionId ? row.sessionId !== excludedSessionId : true));
    return matched || null;
  }

  const db = getDb();
  const rows = db
    .prepare('SELECT * FROM reports WHERE customer_id = ? ORDER BY created_at DESC')
    .all(customerId)
    .map(mapReportRow);
  return rows.find((row) => (excludedSessionId ? row.sessionId !== excludedSessionId : true)) || null;
}

async function countCustomerSessions(customerId) {
  if (isSupabaseConfigured()) {
    const rows = await supabaseSelect('coach_sessions', {
      filters: { customer_id: ['eq', customerId] },
      select: 'id',
    });
    return rows.length;
  }

  const row = getDb().prepare('SELECT COUNT(*) AS count FROM coach_sessions WHERE customer_id = ?').get(customerId);
  return row?.count || 0;
}

async function uploadAudioToSupabase(objectPath, buffer, mimeType) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}/storage/v1/object/${config.audioBucket}/${objectPath}`, {
    method: 'POST',
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      apikey: config.secretKey,
      'Content-Type': mimeType,
      'x-upsert': 'true',
    },
    body: buffer,
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase storage upload failed: ${text}`);
  }

  return objectPath;
}

async function supabaseSelect(table, { filters = {}, order = [], limit, select = '*' } = {}) {
  const params = new URLSearchParams();
  params.set('select', select);
  for (const [field, [op, value]] of Object.entries(filters)) {
    params.set(field, `${op}.${encodeFilterValue(value)}`);
  }
  for (const item of order) {
    const [field, direction] = item.split('.');
    params.append('order', `${field}.${direction || 'asc'}`);
  }
  if (limit) params.set('limit', String(limit));

  return supabaseJson(`/rest/v1/${table}?${params.toString()}`);
}

async function supabaseInsert(table, body) {
  return supabaseJson(`/rest/v1/${table}`, {
    method: 'POST',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(body),
  });
}

async function supabaseUpdate(table, filters, body) {
  const params = new URLSearchParams();
  for (const [field, [op, value]] of Object.entries(filters)) {
    params.set(field, `${op}.${encodeFilterValue(value)}`);
  }

  return supabaseJson(`/rest/v1/${table}?${params.toString()}`, {
    method: 'PATCH',
    headers: { Prefer: 'return=representation' },
    body: JSON.stringify(Object.fromEntries(Object.entries(body).filter(([, value]) => value !== undefined))),
  });
}

async function supabaseDelete(table, filters) {
  const params = new URLSearchParams();
  for (const [field, [op, value]] of Object.entries(filters)) {
    params.set(field, `${op}.${encodeFilterValue(value)}`);
  }

  await supabaseJson(`/rest/v1/${table}?${params.toString()}`, {
    method: 'DELETE',
    headers: { Prefer: 'return=minimal' },
  });
}

async function supabaseJson(pathname, init = {}) {
  const config = getSupabaseConfig();
  const response = await fetch(`${config.url}${pathname}`, {
    ...init,
    headers: {
      Authorization: `Bearer ${config.secretKey}`,
      apikey: config.secretKey,
      'Content-Type': 'application/json',
      ...(init.headers || {}),
    },
  });

  if (!response.ok) {
    const text = await response.text();
    throw new Error(`Supabase request failed (${response.status}): ${text}`);
  }

  if (response.status === 204) return [];
  return response.json();
}

function encodeFilterValue(value) {
  if (value === null) return 'null';
  return String(value);
}

function mimeExtension(mimeType) {
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return '.mp3';
  if (mimeType.includes('wav')) return '.wav';
  return '.bin';
}
