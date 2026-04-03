import crypto from 'node:crypto';
import fs from 'node:fs';
import path from 'node:path';
import { getDb, mapAudioRow, mapCustomerRow, mapReportRow, mapSessionRow, nowIso } from '../lib/db.js';
import { audioRoot, reportRoot } from '../lib/paths.js';
import { safeFileName, writeBufferFile, writeJsonFile } from '../lib/storage.js';
import { buildReport } from '../lib/analysis.js';
import { trainingMasterCopy } from '../lib/masterCopy.js';
import { transcribeAudioFile } from '../lib/groq.js';

export function registerMyCoachRoutes(app) {
  app.get('/api/my-coach/health', (_req, res) => {
    res.json({ ok: true, service: 'my-coach', version: trainingMasterCopy.version });
  });

  app.get('/api/my-coach/master-copy', (_req, res) => {
    res.json({ ok: true, masterCopy: trainingMasterCopy });
  });

  app.get('/api/my-coach/customers', (_req, res) => {
    const db = getDb();
    const customers = db.prepare('SELECT * FROM customers ORDER BY updated_at DESC').all().map(mapCustomerRow);
    res.json({ ok: true, customers });
  });

  app.post('/api/my-coach/customers', (req, res) => {
    const db = getDb();
    const payload = normalizeCustomerPayload(req.body || {});
    const now = nowIso();
    const id = crypto.randomUUID();

    db.prepare(`
      INSERT INTO customers (id, name, phone, email, notes, status, metadata_json, created_at, updated_at)
      VALUES (@id, @name, @phone, @email, @notes, @status, @metadataJson, @createdAt, @updatedAt)
    `).run({
      id,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      notes: payload.notes,
      status: payload.status,
      metadataJson: JSON.stringify(payload.metadata),
      createdAt: now,
      updatedAt: now,
    });

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(id);
    res.status(201).json({ ok: true, customer: mapCustomerRow(customer) });
  });

  app.get('/api/my-coach/customers/:customerId', (req, res) => {
    const db = getDb();
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.customerId);
    if (!customer) return res.status(404).json({ ok: false, error: 'Customer not found' });

    const sessions = db.prepare('SELECT * FROM coach_sessions WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId).map(mapSessionRow);
    const audioAssets = db.prepare('SELECT * FROM audio_assets WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId).map(mapAudioRow);
    const reports = db.prepare('SELECT * FROM reports WHERE customer_id = ? ORDER BY created_at DESC').all(req.params.customerId).map(mapReportRow);

    res.json({
      ok: true,
      customer: mapCustomerRow(customer),
      sessions,
      audioAssets,
      reports,
    });
  });

  app.patch('/api/my-coach/customers/:customerId', (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.customerId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Customer not found' });

    const current = mapCustomerRow(existing);
    const payload = normalizeCustomerPayload({ ...current, ...req.body });
    const now = nowIso();

    db.prepare(`
      UPDATE customers
      SET name = @name, phone = @phone, email = @email, notes = @notes, status = @status, metadata_json = @metadataJson, updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: existing.id,
      name: payload.name,
      phone: payload.phone,
      email: payload.email,
      notes: payload.notes,
      status: payload.status,
      metadataJson: JSON.stringify(payload.metadata),
      updatedAt: now,
    });

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(existing.id);
    res.json({ ok: true, customer: mapCustomerRow(customer) });
  });

  app.delete('/api/my-coach/customers/:customerId', (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM customers WHERE id = ?').get(req.params.customerId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Customer not found' });
    db.prepare('DELETE FROM customers WHERE id = ?').run(existing.id);
    res.json({ ok: true });
  });

  app.get('/api/my-coach/sessions', (_req, res) => {
    const db = getDb();
    const sessions = db.prepare('SELECT * FROM coach_sessions ORDER BY created_at DESC').all().map(mapSessionRow);
    res.json({ ok: true, sessions });
  });

  app.post('/api/my-coach/sessions', (req, res) => {
    const db = getDb();
    const payload = normalizeSessionPayload(req.body || {});
    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(payload.customerId);
    if (!customer) return res.status(400).json({ ok: false, error: 'Customer is required and must exist' });

    const now = nowIso();
    const id = crypto.randomUUID();
    const visitNumberRow = db.prepare('SELECT COUNT(*) AS count FROM coach_sessions WHERE customer_id = ?').get(payload.customerId);
    const visitNumber = (visitNumberRow?.count || 0) + 1;

    db.prepare(`
      INSERT INTO coach_sessions (id, customer_id, title, mode, status, visit_number, transcript_json, analysis_json, report_id, created_at, updated_at)
      VALUES (@id, @customerId, @title, @mode, @status, @visitNumber, '[]', '{}', NULL, @createdAt, @updatedAt)
    `).run({
      id,
      customerId: payload.customerId,
      title: payload.title,
      mode: payload.mode,
      status: payload.status,
      visitNumber,
      createdAt: now,
      updatedAt: now,
    });

    const session = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(id);
    res.status(201).json({ ok: true, session: mapSessionRow(session) });
  });

  app.get('/api/my-coach/sessions/:sessionId', (req, res) => {
    const db = getDb();
    const session = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(session.customer_id);
    const audioAssets = db.prepare('SELECT * FROM audio_assets WHERE session_id = ? ORDER BY created_at ASC').all(session.id).map(mapAudioRow);
    const report = session.report_id ? db.prepare('SELECT * FROM reports WHERE id = ?').get(session.report_id) : null;

    res.json({
      ok: true,
      customer: mapCustomerRow(customer),
      session: mapSessionRow(session),
      audioAssets,
      report: mapReportRow(report),
    });
  });

  app.patch('/api/my-coach/sessions/:sessionId', (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(req.params.sessionId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Session not found' });

    const current = mapSessionRow(existing);
    const payload = normalizeSessionPayload({ ...current, ...req.body });
    const now = nowIso();

    db.prepare(`
      UPDATE coach_sessions
      SET title = @title, mode = @mode, status = @status, updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: existing.id,
      title: payload.title,
      mode: payload.mode,
      status: payload.status,
      updatedAt: now,
    });

    const session = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(existing.id);
    res.json({ ok: true, session: mapSessionRow(session) });
  });

  app.delete('/api/my-coach/sessions/:sessionId', (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(req.params.sessionId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Session not found' });

    const audioAssets = db.prepare('SELECT * FROM audio_assets WHERE session_id = ?').all(existing.id).map(mapAudioRow);
    const report = existing.report_id ? db.prepare('SELECT * FROM reports WHERE id = ?').get(existing.report_id) : null;

    db.prepare('DELETE FROM coach_sessions WHERE id = ?').run(existing.id);
    for (const asset of audioAssets) {
      safeUnlink(asset.filePath);
    }
    if (report) {
      safeUnlink(report.report_path);
    }

    res.json({ ok: true });
  });

  app.post('/api/my-coach/sessions/:sessionId/audio', async (req, res) => {
    const db = getDb();
    const session = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

    const payload = req.body || {};
    const clipPayloads = Array.isArray(payload.clips) ? payload.clips : [payload];
    const validClips = clipPayloads
      .map((clip) => ({
        audioBase64: String(clip.audioBase64 || clip.base64 || '').replace(/^data:.*;base64,/, ''),
        mimeType: String(clip.mimeType || 'audio/webm'),
        filename: clip.filename || clip.fileName,
        source: clip.source || 'upload',
        transcriptText: clip.transcriptText || '',
        durationMs: clip.durationMs,
      }))
      .filter((clip) => clip.audioBase64);

    if (!validClips.length) {
      return res.status(400).json({ ok: false, error: 'At least one clip with base64 audio is required' });
    }

    const storedAssets = validClips.map((clip, index) => {
      const buffer = Buffer.from(clip.audioBase64, 'base64');
      const filename = `${safeFileName(clip.filename || `session-${session.id}-${Date.now()}-${index + 1}`, 'audio')}${mimeExtension(clip.mimeType)}`;
      const audioId = crypto.randomUUID();
      const filePath = writeBufferFile(path.join(audioRoot, session.id), filename, buffer);
      const now = nowIso();

      db.prepare(`
        INSERT INTO audio_assets (id, session_id, customer_id, filename, mime_type, file_path, source, transcript_text, duration_ms, created_at)
        VALUES (@id, @sessionId, @customerId, @filename, @mimeType, @filePath, @source, @transcriptText, @durationMs, @createdAt)
      `).run({
        id: audioId,
        sessionId: session.id,
        customerId: session.customer_id,
        filename,
        mimeType: clip.mimeType,
        filePath,
        source: clip.source,
        transcriptText: String(clip.transcriptText || ''),
        durationMs: Number.isFinite(Number(clip.durationMs)) ? Number(clip.durationMs) : null,
        createdAt: now,
      });

      return mapAudioRow(db.prepare('SELECT * FROM audio_assets WHERE id = ?').get(audioId));
    });

    res.status(201).json({ ok: true, audioAssets: storedAssets });
  });

  app.post('/api/my-coach/sessions/:sessionId/analyze', async (req, res) => {
    const db = getDb();
    const session = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

    const customer = db.prepare('SELECT * FROM customers WHERE id = ?').get(session.customer_id);
    const audioAssets = db.prepare('SELECT * FROM audio_assets WHERE session_id = ? ORDER BY created_at ASC').all(session.id).map(mapAudioRow);
    if (!audioAssets.length) {
      return res.status(400).json({ ok: false, error: 'At least one audio asset is required before analysis' });
    }

    const transcriptTurns = [];
    for (const asset of audioAssets) {
      let transcript = asset.transcriptText || '';
      let segments = [];
      if (!transcript.trim()) {
        const result = await transcribeAudioFile({ filePath: asset.filePath, mimeType: asset.mimeType });
        transcript = result.text;
        segments = result.segments || [];
        db.prepare('UPDATE audio_assets SET transcript_text = ? WHERE id = ?').run(transcript, asset.id);
      }
      transcriptTurns.push(...buildTranscriptTurns(transcript, segments, asset.id));
    }

    const report = await buildReport({
      customer: mapCustomerRow(customer),
      session: mapSessionRow(session),
      transcriptTurns,
      audioAssets,
    });

    const reportId = crypto.randomUUID();
    const reportPath = writeJsonFile(reportRoot, `${session.id}-${reportId}.json`, report);
    const now = nowIso();

    db.prepare(`
      INSERT INTO reports (id, session_id, customer_id, overall_score, grade, report_json, report_path, created_at, updated_at)
      VALUES (@id, @sessionId, @customerId, @overallScore, @grade, @reportJson, @reportPath, @createdAt, @updatedAt)
    `).run({
      id: reportId,
      sessionId: session.id,
      customerId: session.customer_id,
      overallScore: report.overallScore,
      grade: report.grade,
      reportJson: JSON.stringify(report),
      reportPath,
      createdAt: now,
      updatedAt: now,
    });

    db.prepare(`
      UPDATE coach_sessions
      SET status = 'completed', transcript_json = @transcriptJson, analysis_json = @analysisJson, report_id = @reportId, updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: session.id,
      transcriptJson: JSON.stringify(transcriptTurns),
      analysisJson: JSON.stringify(report),
      reportId,
      updatedAt: now,
    });

    const updatedSession = db.prepare('SELECT * FROM coach_sessions WHERE id = ?').get(session.id);
    const updatedReport = db.prepare('SELECT * FROM reports WHERE id = ?').get(reportId);
    res.json({
      ok: true,
      session: mapSessionRow(updatedSession),
      report: mapReportRow(updatedReport),
      reportData: report,
    });
  });

  app.get('/api/my-coach/reports', (_req, res) => {
    const db = getDb();
    const reports = db.prepare(`
      SELECT
        r.*,
        s.title AS session_title,
        s.created_at AS session_created_at,
        c.name AS customer_name
      FROM reports r
      LEFT JOIN coach_sessions s ON s.id = r.session_id
      LEFT JOIN customers c ON c.id = r.customer_id
      ORDER BY r.created_at DESC
    `).all().map((row) => ({
      ...mapReportRow(row),
      sessionTitle: row.session_title || '',
      sessionCreatedAt: row.session_created_at || null,
      customerName: row.customer_name || '',
    }));
    res.json({ ok: true, reports });
  });

  app.get('/api/my-coach/reports/:reportId', (req, res) => {
    const db = getDb();
    const report = db.prepare(`
      SELECT
        r.*,
        s.title AS session_title,
        s.created_at AS session_created_at,
        c.name AS customer_name
      FROM reports r
      LEFT JOIN coach_sessions s ON s.id = r.session_id
      LEFT JOIN customers c ON c.id = r.customer_id
      WHERE r.id = ?
    `).get(req.params.reportId);
    if (!report) return res.status(404).json({ ok: false, error: 'Report not found' });
    res.json({
      ok: true,
      report: {
        ...mapReportRow(report),
        sessionTitle: report.session_title || '',
        sessionCreatedAt: report.session_created_at || null,
        customerName: report.customer_name || '',
      },
    });
  });

  app.patch('/api/my-coach/reports/:reportId', (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.reportId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Report not found' });

    const existingReport = mapReportRow(existing).report;
    const report = { ...existingReport, ...(req.body?.report || {}) };
    const now = nowIso();

    db.prepare(`
      UPDATE reports
      SET report_json = @reportJson, overall_score = @overallScore, grade = @grade, updated_at = @updatedAt
      WHERE id = @id
    `).run({
      id: existing.id,
      reportJson: JSON.stringify(report),
      overallScore: Number(req.body?.overallScore ?? existing.overall_score),
      grade: String(req.body?.grade ?? existing.grade),
      updatedAt: now,
    });

    const updated = db.prepare('SELECT * FROM reports WHERE id = ?').get(existing.id);
    res.json({ ok: true, report: mapReportRow(updated) });
  });

  app.delete('/api/my-coach/reports/:reportId', (req, res) => {
    const db = getDb();
    const existing = db.prepare('SELECT * FROM reports WHERE id = ?').get(req.params.reportId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Report not found' });
    safeUnlink(existing.report_path);
    db.prepare('DELETE FROM reports WHERE id = ?').run(existing.id);
    res.json({ ok: true });
  });
}

function normalizeCustomerPayload(body) {
  return {
    name: String(body.name || 'Untitled Customer').trim() || 'Untitled Customer',
    phone: String(body.phone || '').trim(),
    email: String(body.email || '').trim(),
    notes: String(body.notes || '').trim(),
    status: String(body.status || 'active').trim() || 'active',
    metadata: body.metadata && typeof body.metadata === 'object' ? body.metadata : {},
  };
}

function normalizeSessionPayload(body) {
  return {
    customerId: String(body.customerId || '').trim(),
    title: String(body.title || '').trim(),
    mode: String(body.mode || 'analysis').trim() || 'analysis',
    status: String(body.status || 'draft').trim() || 'draft',
  };
}

function buildTranscriptTurns(text, segments, audioAssetId) {
  if (!text && !segments.length) return [];
  if (segments.length) {
    return segments.map((segment, index) => ({
      id: `${audioAssetId}_${segment.id || index + 1}`,
      speaker: index % 2 === 0 ? 'salesperson' : 'customer',
      text: segment.text || '',
      start: segment.start ?? null,
      end: segment.end ?? null,
      sourceAudioAssetId: audioAssetId,
    }));
  }

  return splitIntoTurns(text).map((part, index) => ({
    id: `${audioAssetId}_turn_${index + 1}`,
    speaker: inferSpeaker(part, index),
    text: part,
    start: null,
    end: null,
    sourceAudioAssetId: audioAssetId,
  }));
}

function splitIntoTurns(text) {
  return String(text || '')
    .split(/\n{2,}|(?:\.\s+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 50);
}

function inferSpeaker(text, index) {
  const lower = text.toLowerCase();
  if (/(?:i recommend|let me show|shall we|would you like|based on|i suggest|my suggestion)/.test(lower)) return 'salesperson';
  if (/(?:i am|we need|i need|i want|my family|budget|what about|how much|not sure|concerned)/.test(lower)) return 'customer';
  return index % 2 === 0 ? 'salesperson' : 'customer';
}

function mimeExtension(mimeType) {
  if (mimeType.includes('webm')) return '.webm';
  if (mimeType.includes('mp4')) return '.mp4';
  if (mimeType.includes('mpeg') || mimeType.includes('mp3')) return '.mp3';
  if (mimeType.includes('wav')) return '.wav';
  return '.bin';
}

function safeUnlink(filePath) {
  if (!filePath) return;
  try {
    if (fs.existsSync(filePath)) {
      fs.unlinkSync(filePath);
    }
  } catch {
    // Best-effort cleanup for local storage.
  }
}
