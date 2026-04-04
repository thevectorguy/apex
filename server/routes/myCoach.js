import { buildPreviousVisitSummary } from '../lib/analysis.js';
import { generateCoachingReport } from '../lib/groq.js';
import {
  createAudioAssets,
  createCustomer,
  createReport,
  createSession,
  deleteCustomer,
  deleteReport,
  deleteSession,
  getCustomer,
  getLatestCompletedReportForCustomer,
  getReport,
  getSession,
  listCustomerAudioAssets,
  listCustomerReports,
  listCustomerSessions,
  listCustomers,
  listReports,
  listSessionAudioAssets,
  listSessions,
  getPersistenceStatus,
  updateCustomer,
  updateReport,
  updateSession,
} from '../lib/persistence.js';
import { MASTER_COPY_HASH, MASTER_COPY_VERSION, trainingMasterCopy } from '../lib/masterCopy.js';

export function registerMyCoachRoutes(app) {
  app.get('/api/my-coach/health', (_req, res) => {
    res.json({
      ok: true,
      service: 'my-coach',
      version: MASTER_COPY_VERSION,
      hash: MASTER_COPY_HASH,
      persistence: getPersistenceStatus(),
    });
  });

  app.get('/api/my-coach/master-copy', (_req, res) => {
    res.json({
      ok: true,
      masterCopy: {
        version: MASTER_COPY_VERSION,
        hash: MASTER_COPY_HASH,
        source: trainingMasterCopy.source,
      },
    });
  });

  app.get('/api/my-coach/customers', async (_req, res) => {
    res.json({ ok: true, customers: await listCustomers() });
  });

  app.post('/api/my-coach/customers', async (req, res) => {
    const payload = normalizeCustomerPayload(req.body || {});
    const customer = await createCustomer(payload);
    res.status(201).json({ ok: true, customer });
  });

  app.get('/api/my-coach/customers/:customerId', async (req, res) => {
    const customer = await getCustomer(req.params.customerId);
    if (!customer) return res.status(404).json({ ok: false, error: 'Customer not found' });

    const [sessions, audioAssets, reports] = await Promise.all([
      listCustomerSessions(req.params.customerId),
      listCustomerAudioAssets(req.params.customerId),
      listCustomerReports(req.params.customerId),
    ]);

    res.json({ ok: true, customer, sessions, audioAssets, reports });
  });

  app.patch('/api/my-coach/customers/:customerId', async (req, res) => {
    const existing = await getCustomer(req.params.customerId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Customer not found' });

    const payload = normalizeCustomerPayload({ ...existing, ...req.body });
    const customer = await updateCustomer(req.params.customerId, payload);
    res.json({ ok: true, customer });
  });

  app.delete('/api/my-coach/customers/:customerId', async (req, res) => {
    const existing = await getCustomer(req.params.customerId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Customer not found' });
    await deleteCustomer(req.params.customerId);
    res.json({ ok: true });
  });

  app.get('/api/my-coach/sessions', async (_req, res) => {
    res.json({ ok: true, sessions: await listSessions() });
  });

  app.post('/api/my-coach/sessions', async (req, res) => {
    const payload = normalizeSessionPayload(req.body || {});
    const customer = await getCustomer(payload.customerId);
    if (!customer) return res.status(400).json({ ok: false, error: 'Customer is required and must exist' });
    const session = await createSession(payload);
    res.status(201).json({ ok: true, session });
  });

  app.get('/api/my-coach/sessions/:sessionId', async (req, res) => {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

    const customer = await getCustomer(session.customerId);
    const audioAssets = await listSessionAudioAssets(session.id);
    const report = session.reportId ? await getReport(session.reportId) : null;

    res.json({ ok: true, customer, session, audioAssets, report });
  });

  app.patch('/api/my-coach/sessions/:sessionId', async (req, res) => {
    const existing = await getSession(req.params.sessionId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Session not found' });

    const payload = normalizeSessionPayload({ ...existing, ...req.body });
    const session = await updateSession(req.params.sessionId, payload);
    res.json({ ok: true, session });
  });

  app.delete('/api/my-coach/sessions/:sessionId', async (req, res) => {
    const existing = await getSession(req.params.sessionId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Session not found' });
    await deleteSession(req.params.sessionId);
    res.json({ ok: true });
  });

  app.post('/api/my-coach/sessions/:sessionId/audio', async (req, res) => {
    const session = await getSession(req.params.sessionId);
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

    const transcriptLines = Array.isArray(payload.transcriptLines)
      ? payload.transcriptLines.map((line, index) => ({
          id: String(line.id || `line_${index + 1}`),
          speaker: String(line.speaker || inferSpeaker(line.text || '', index)),
          text: String(line.text || '').trim(),
          start: Number.isFinite(Number(line.start)) ? Number(line.start) : null,
          end: Number.isFinite(Number(line.end)) ? Number(line.end) : null,
        }))
      : [];
    const transcriptText =
      String(payload.transcriptText || '').trim() || transcriptLines.map((line) => line.text).filter(Boolean).join(' ');

    const audioAssets = await createAudioAssets(session, validClips);
    await updateSession(session.id, {
      transcriptText: transcriptText || session.transcriptText || '',
      transcript: transcriptLines.length ? transcriptLines : buildTranscriptTurns(transcriptText, [], session.id),
      errorMessage: null,
    });

    res.status(201).json({ ok: true, audioAssets });
  });

  app.post('/api/my-coach/sessions/:sessionId/analyze', async (req, res) => {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

    const customer = await getCustomer(session.customerId);
    const audioAssets = await listSessionAudioAssets(session.id);
    if (!audioAssets.length) {
      return res.status(400).json({ ok: false, error: 'At least one audio asset is required before analysis' });
    }

    const transcriptText = String(session.transcriptText || '').trim();
    if (!transcriptText) {
      await updateSession(session.id, { status: 'error', errorMessage: 'Browser transcript is required before analysis.' });
      return res.status(400).json({ ok: false, error: 'Browser transcript is required before analysis.' });
    }

    await updateSession(session.id, {
      status: 'processing',
      processingStartedAt: new Date().toISOString(),
      processingCompletedAt: null,
      errorMessage: null,
    });

    try {
      const previousReport = await getLatestCompletedReportForCustomer(session.customerId, session.id);
      const previousVisitSummary = previousReport ? buildPreviousVisitSummary(previousReport.report) : null;
      const transcriptTurns = Array.isArray(session.transcript) && session.transcript.length
        ? session.transcript
        : buildTranscriptTurns(transcriptText, [], session.id);

      const report = await generateCoachingReport({
        transcriptText,
        transcriptTurns,
        customerName: customer?.name || '',
        visitNumber: session.visitNumber,
        sessionDate: session.createdAt,
        previousVisitSummary,
      });

      const hydratedReport = {
        ...report,
        id: report.id || `report_${session.id}`,
        customerContext: {
          sessionId: session.id,
          customerId: session.customerId,
        },
        transcriptTurns: report.transcriptTurns?.length ? report.transcriptTurns : transcriptTurns,
      };

      const createdReport = await createReport({
        sessionId: session.id,
        customerId: session.customerId,
        overallScore: hydratedReport.overallScore,
        grade: hydratedReport.grade,
        masterCopyVersion: hydratedReport.masterCopyVersion || MASTER_COPY_VERSION,
        masterCopyHash: hydratedReport.masterCopyHash || MASTER_COPY_HASH,
        report: hydratedReport,
      });

      const updatedSession = await updateSession(session.id, {
        status: 'completed',
        transcript: hydratedReport.transcriptTurns,
        analysis: hydratedReport,
        reportId: createdReport.id,
        processingCompletedAt: new Date().toISOString(),
        errorMessage: null,
      });

      res.json({
        ok: true,
        session: updatedSession,
        report: createdReport,
        reportData: hydratedReport,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSession(session.id, {
        status: 'error',
        errorMessage: message,
        processingCompletedAt: new Date().toISOString(),
      });
      res.status(500).json({ ok: false, status: 'error', error: message });
    }
  });

  app.get('/api/my-coach/reports', async (_req, res) => {
    res.json({ ok: true, reports: await listReports() });
  });

  app.get('/api/my-coach/reports/:reportId', async (req, res) => {
    const report = await getReport(req.params.reportId);
    if (!report) return res.status(404).json({ ok: false, error: 'Report not found' });

    const customer = await getCustomer(report.customerId);
    const session = await getSession(report.sessionId);

    res.json({
      ok: true,
      report: {
        ...report,
        sessionTitle: session?.title || '',
        sessionCreatedAt: session?.createdAt || null,
        customerName: customer?.name || '',
      },
    });
  });

  app.patch('/api/my-coach/reports/:reportId', async (req, res) => {
    const existing = await getReport(req.params.reportId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Report not found' });

    const report = { ...existing.report, ...(req.body?.report || {}) };
    const updated = await updateReport(req.params.reportId, {
      report,
      overallScore: Number(req.body?.overallScore ?? existing.overallScore),
      grade: String(req.body?.grade ?? existing.grade),
    });
    res.json({ ok: true, report: updated });
  });

  app.delete('/api/my-coach/reports/:reportId', async (req, res) => {
    const existing = await getReport(req.params.reportId);
    if (!existing) return res.status(404).json({ ok: false, error: 'Report not found' });
    await deleteReport(req.params.reportId);
    res.json({ ok: true });
  });
}

function normalizeCustomerPayload(body) {
  return {
    name: String(body.name || body.customerName || 'Untitled Customer').trim() || 'Untitled Customer',
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
    transcriptText: String(body.transcriptText || '').trim(),
    transcript: Array.isArray(body.transcript) ? body.transcript : undefined,
    analysis: body.analysis && typeof body.analysis === 'object' ? body.analysis : undefined,
    reportId: body.reportId ?? undefined,
    processingStartedAt: body.processingStartedAt ?? undefined,
    processingCompletedAt: body.processingCompletedAt ?? undefined,
    errorMessage: body.errorMessage ?? undefined,
  };
}

function buildTranscriptTurns(text, segments, sourceId) {
  if (!text && !segments.length) return [];
  if (segments.length) {
    return segments.map((segment, index) => ({
      id: `${sourceId}_${segment.id || index + 1}`,
      speaker: inferSpeaker(segment.text || '', index),
      text: segment.text || '',
      start: segment.start ?? null,
      end: segment.end ?? null,
    }));
  }

  return splitIntoTurns(text).map((part, index) => ({
    id: `${sourceId}_turn_${index + 1}`,
    speaker: inferSpeaker(part, index),
    text: part,
    start: null,
    end: null,
  }));
}

function splitIntoTurns(text) {
  return String(text || '')
    .split(/\n{2,}|(?:\.\s+)/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 80);
}

function inferSpeaker(text, index) {
  const lower = String(text || '').toLowerCase();
  if (/(?:i recommend|let me show|shall we|would you like|based on|i suggest|my suggestion)/.test(lower)) return 'salesperson';
  if (/(?:i am|we need|i need|i want|my family|budget|what about|how much|not sure|concerned)/.test(lower)) return 'customer';
  return index % 2 === 0 ? 'salesperson' : 'customer';
}
