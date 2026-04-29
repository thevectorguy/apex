import crypto from 'node:crypto';
import { buildPreviousVisitSummary } from '../lib/analysis.js';
import { generateCoachingReport, transcribeAudioFile, transcribeAudioUrl } from '../lib/groq.js';
import {
  createAudioAssets,
  createAudioAssetsFromUploads,
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
import { completeDirectAudioUpload, createDirectAudioUploadTarget, createPresignedReadUrl } from '../lib/s3.js';
import { MASTER_COPY_HASH, MASTER_COPY_VERSION, trainingMasterCopy } from '../lib/masterCopy.js';

const TRANSCRIPT_UNAVAILABLE_ERROR =
  'Audio was captured, but My Coach could not build a reliable transcript for this session.';
const MIN_TRANSCRIPT_WORDS = 20;
const MIN_WORDS_PER_SECOND = 0.4;

export function registerMyCoachRoutes(app) {
  app.get('/api/my-coach/health', async (_req, res) => {
    res.json({
      ok: true,
      service: 'my-coach',
      version: MASTER_COPY_VERSION,
      hash: MASTER_COPY_HASH,
      persistence: await getPersistenceStatus(),
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
    const [customers, sessions] = await Promise.all([listCustomers(), listSessions()]);
    const sessionsByCustomerId = new Map();

    for (const session of sessions) {
      const customerSessions = sessionsByCustomerId.get(session.customerId) || [];
      customerSessions.push(session);
      sessionsByCustomerId.set(session.customerId, customerSessions);
    }

    res.json({
      ok: true,
      customers: customers.map((customer) => {
        const customerSessions = sessionsByCustomerId.get(customer.id) || [];
        const latestSession = customerSessions[0] || null;

        return {
          ...customer,
          metadata: {
            ...customer.metadata,
            visitCount: customerSessions.length,
            hasSubmittedSession: customerSessions.length > 0,
            latestSessionId: latestSession?.id || null,
            latestSessionStatus: latestSession?.status || null,
            lastSessionAt: latestSession?.createdAt || null,
          },
        };
      }),
    });
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

    const payload = normalizeCustomerPayload({
      ...existing,
      ...req.body,
      metadata: {
        ...(existing.metadata && typeof existing.metadata === 'object' ? existing.metadata : {}),
        ...(req.body?.metadata && typeof req.body.metadata === 'object' ? req.body.metadata : {}),
      },
    });
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

  app.post('/api/my-coach/sessions/:sessionId/audio/uploads/init', async (req, res) => {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });

    const payload = req.body || {};
    const clipPayloads = Array.isArray(payload.clips) ? payload.clips : [];
    const validClips = clipPayloads
      .map((clip) => ({
        fileName: String(clip.fileName || clip.filename || '').trim(),
        mimeType: String(clip.mimeType || 'audio/webm').trim() || 'audio/webm',
        source: String(clip.source || 'upload').trim() || 'upload',
        durationMs: clip.durationMs,
        sizeBytes: Number(clip.sizeBytes),
      }))
      .filter((clip) => clip.fileName && Number.isFinite(clip.sizeBytes) && clip.sizeBytes > 0);

    if (!validClips.length) {
      return res.status(400).json({ ok: false, error: 'At least one clip with file metadata is required' });
    }

    console.log('[my-coach][audio-upload] init request received', {
      sessionId: session.id,
      customerId: session.customerId,
      clipCount: validClips.length,
      clipSizes: validClips.map((clip) => clip.sizeBytes),
    });

    const uploads = await Promise.all(
      validClips.map(async (clip) => {
        const target = await createDirectAudioUploadTarget({
          audioId: crypto.randomUUID(),
          customerId: session.customerId,
          sessionId: session.id,
          filename: clip.fileName,
          mimeType: clip.mimeType,
          sizeBytes: clip.sizeBytes,
        });

        return {
          ...target,
          source: clip.source,
          durationMs: Number.isFinite(Number(clip.durationMs)) ? Number(clip.durationMs) : null,
        };
      }),
    );

    res.status(201).json({ ok: true, uploads });
  });

  app.post('/api/my-coach/sessions/:sessionId/audio/uploads/complete', async (req, res) => {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    const customer = await getCustomer(session.customerId);
    const startedAt = Date.now();

    const payload = req.body || {};
    const clipPayloads = Array.isArray(payload.clips) ? payload.clips : [];
    const validClips = clipPayloads
      .map((clip) => ({
        audioId: String(clip.audioId || '').trim(),
        fileName: String(clip.fileName || clip.filename || '').trim(),
        mimeType: String(clip.mimeType || 'audio/webm').trim() || 'audio/webm',
        source: String(clip.source || 'upload').trim() || 'upload',
        durationMs: clip.durationMs,
        sizeBytes: Number(clip.sizeBytes),
        bucket: String(clip.bucket || '').trim(),
        storageKey: String(clip.storageKey || '').trim(),
        filePath: String(clip.filePath || '').trim(),
        upload: clip.upload && typeof clip.upload === 'object' ? clip.upload : { mode: 'single' },
      }))
      .filter((clip) => clip.audioId && clip.fileName && clip.storageKey && clip.filePath);

    if (!validClips.length) {
      return res.status(400).json({ ok: false, error: 'At least one uploaded clip is required' });
    }

    console.log('[my-coach][audio-upload] complete request received', {
      sessionId: session.id,
      customerId: session.customerId,
      clipCount: validClips.length,
      clipSizes: validClips.map((clip) => clip.sizeBytes),
    });

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

    await Promise.all(validClips.map((clip) => completeDirectAudioUpload({ storageKey: clip.storageKey, upload: clip.upload })));

    let audioAssets = [];
    let transcription = null;

    try {
      [audioAssets, transcription] = await Promise.all([
        createAudioAssetsFromUploads(session, validClips),
        transcribeStoredSessionClips({
          clips: validClips,
          sessionId: session.id,
          language: resolvePreferredTranscriptionLanguage(customer),
        }).catch((err) => {
          console.error('[my-coach][audio-upload] transcription failed', {
            sessionId: session.id,
            message: err instanceof Error ? err.message : String(err),
          });
          return null;
        }),
      ]);
    } catch (error) {
      console.error('[my-coach][audio-upload] finalization failed', {
        sessionId: session.id,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const sessionPatch = { errorMessage: null };
    if (transcription && transcription.text) {
      sessionPatch.transcriptText = transcription.text;
      sessionPatch.transcript = transcription.turns;
    } else if (transcriptText || transcriptLines.length) {
      sessionPatch.transcriptText = transcriptText || session.transcriptText || '';
      sessionPatch.transcript = transcriptLines.length ? transcriptLines : buildTranscriptTurns(transcriptText, [], session.id);
    }

    await updateSession(session.id, sessionPatch);

    console.log('[my-coach][audio-upload] request completed', {
      sessionId: session.id,
      durationMs: Date.now() - startedAt,
      storedAudioAssets: audioAssets.length,
      transcriptTurnCount: Array.isArray(sessionPatch.transcript) ? sessionPatch.transcript.length : 0,
      transcriptTextLength: String(sessionPatch.transcriptText || '').length,
      transcriptReady: Boolean(sessionPatch.transcriptText && sessionPatch.transcript?.length),
    });

    res.status(201).json({ ok: true, audioAssets });
  });

  app.post('/api/my-coach/sessions/:sessionId/audio', async (req, res) => {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    const customer = await getCustomer(session.customerId);
    const startedAt = Date.now();

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

    console.log('[my-coach][audio] request received', {
      sessionId: session.id,
      customerId: session.customerId,
      clipCount: validClips.length,
      transcriptSource: payload.transcriptSource || 'unknown',
      transcriptTextLength: String(payload.transcriptText || '').trim().length,
      transcriptLineCount: Array.isArray(payload.transcriptLines) ? payload.transcriptLines.length : 0,
      clipSizes: validClips.map((clip) => Buffer.byteLength(clip.audioBase64 || '', 'base64')),
    });

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

    let audioAssets = [];
    let transcription = null;

    try {
      [audioAssets, transcription] = await Promise.all([
        createAudioAssets(session, validClips),
        transcribeSessionClips({
          clips: validClips,
          sessionId: session.id,
          language: resolvePreferredTranscriptionLanguage(customer),
        }).catch((err) => {
          console.error('[my-coach][audio] transcription failed', {
            sessionId: session.id,
            message: err instanceof Error ? err.message : String(err),
          });
          return null;
        }),
      ]);
    } catch (error) {
      console.error('[my-coach][audio] asset preparation failed', {
        sessionId: session.id,
        durationMs: Date.now() - startedAt,
        message: error instanceof Error ? error.message : String(error),
      });
      throw error;
    }

    const sessionPatch = { errorMessage: null };
    if (transcription && transcription.text) {
      sessionPatch.transcriptText = transcription.text;
      sessionPatch.transcript = transcription.turns;
    } else if (transcriptText || transcriptLines.length) {
      sessionPatch.transcriptText = transcriptText || session.transcriptText || '';
      sessionPatch.transcript = transcriptLines.length ? transcriptLines : buildTranscriptTurns(transcriptText, [], session.id);
    }
    
    await updateSession(session.id, sessionPatch);

    console.log('[my-coach][audio] request completed', {
      sessionId: session.id,
      durationMs: Date.now() - startedAt,
      storedAudioAssets: audioAssets.length,
      transcriptTurnCount: Array.isArray(sessionPatch.transcript) ? sessionPatch.transcript.length : 0,
      transcriptTextLength: String(sessionPatch.transcriptText || '').length,
      transcriptReady: Boolean(sessionPatch.transcriptText && sessionPatch.transcript?.length),
    });

    res.status(201).json({ ok: true, audioAssets });
  });

  app.post('/api/my-coach/sessions/:sessionId/analyze', async (req, res) => {
    const session = await getSession(req.params.sessionId);
    if (!session) return res.status(404).json({ ok: false, error: 'Session not found' });
    const startedAt = Date.now();

    const customer = await getCustomer(session.customerId);
    const audioAssets = await listSessionAudioAssets(session.id);
    const hasManualTranscript = Boolean(String(session.transcriptText || '').trim()) && Array.isArray(session.transcript) && session.transcript.length > 0;

    console.log('[my-coach][analyze] request received', {
      sessionId: session.id,
      customerId: session.customerId,
      audioAssetCount: audioAssets.length,
      transcriptTurnCount: Array.isArray(session.transcript) ? session.transcript.length : 0,
      transcriptTextLength: String(session.transcriptText || '').trim().length,
      hasManualTranscript,
    });

    if (!audioAssets.length && !hasManualTranscript) {
      return res.status(400).json({ ok: false, error: 'At least one audio asset is required before analysis' });
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
      
      const transcriptText = session.transcriptText;
      const transcriptTurns = session.transcript || [];

      if (!transcriptText || !transcriptTurns.length) {
        throw new Error(TRANSCRIPT_UNAVAILABLE_ERROR);
      }

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
        transcriptText,
        transcript: transcriptTurns,
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
      console.log('[my-coach][analyze] request completed', {
        sessionId: session.id,
        reportId: createdReport.id,
        durationMs: Date.now() - startedAt,
      });
    } catch (error) {
      const message = error instanceof Error ? error.message : String(error);
      await updateSession(session.id, {
        status: 'error',
        errorMessage: message,
        processingCompletedAt: new Date().toISOString(),
      });
      console.error('[my-coach][analyze] request failed', {
        sessionId: session.id,
        durationMs: Date.now() - startedAt,
        message,
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

async function transcribeSessionClips({ clips, sessionId, language }) {
  const clipResults = await Promise.all(
    clips.map(async (clip, index) => {
      const startedAt = Date.now();
      const fileBuffer = Buffer.from(clip.audioBase64, 'base64');
      console.log('[my-coach][transcription] clip start', {
        sessionId,
        clipIndex: index + 1,
        fileName: clip.filename || `audioclip-${index}.webm`,
        mimeType: clip.mimeType,
        sizeBytes: fileBuffer.length,
        language: language || 'auto',
      });
      const result = await transcribeAudioFile({
        fileBuffer,
        fileName: clip.filename || `audioclip-${index}.webm`,
        mimeType: clip.mimeType,
        language,
      });
      console.log('[my-coach][transcription] clip complete', {
        sessionId,
        clipIndex: index + 1,
        durationMs: Date.now() - startedAt,
        transcriptTextLength: String(result.text || '').trim().length,
        segmentCount: Array.isArray(result.segments) ? result.segments.length : 0,
        provider: result.provider,
        model: result.model,
      });
      return { clip, index, result };
    }),
  );

  return mergeTranscriptionResults({ clipResults, sessionId });
}

async function transcribeStoredSessionClips({ clips, sessionId, language }) {
  const clipResults = await Promise.all(
    clips.map(async (clip, index) => {
      const startedAt = Date.now();
      const fileUrl = await createPresignedReadUrl(clip.storageKey);
      console.log('[my-coach][transcription:url] clip start', {
        sessionId,
        clipIndex: index + 1,
        fileName: clip.fileName || `audioclip-${index}.webm`,
        mimeType: clip.mimeType,
        sizeBytes: clip.sizeBytes,
        language: language || 'auto',
      });
      const result = await transcribeAudioUrl({
        fileUrl,
        fileName: clip.fileName || `audioclip-${index}.webm`,
        language,
      });
      console.log('[my-coach][transcription:url] clip complete', {
        sessionId,
        clipIndex: index + 1,
        durationMs: Date.now() - startedAt,
        transcriptTextLength: String(result.text || '').trim().length,
        segmentCount: Array.isArray(result.segments) ? result.segments.length : 0,
        provider: result.provider,
        model: result.model,
      });
      return {
        clip: {
          ...clip,
          filename: clip.fileName || clip.filename,
        },
        index,
        result,
      };
    }),
  );

  return mergeTranscriptionResults({ clipResults, sessionId });
}

function mergeTranscriptionResults({ clipResults, sessionId }) {
  const transcriptParts = [];
  const transcriptTurns = [];
  let offsetSeconds = 0;

  for (const { clip, index, result } of clipResults.sort((left, right) => left.index - right.index)) {
    const clipText = String(result.text || '').trim();
    if (clipText) {
      transcriptParts.push(clipText);
    }

    const clipTurns = Array.isArray(result.segments) && result.segments.length
      ? result.segments
          .filter((segment) => String(segment.text || '').trim())
          .map((segment, segIndex) => ({
            id: `${sessionId}_clip_${index + 1}_${segment.id || segIndex + 1}`,
            speaker: 'unknown',
            text: String(segment.text || '').trim(),
            start: Number.isFinite(Number(segment.start)) ? Number(segment.start) + offsetSeconds : null,
            end: Number.isFinite(Number(segment.end)) ? Number(segment.end) + offsetSeconds : null,
            confidence: Number.isFinite(Number(segment.confidence)) ? Number(segment.confidence) : null,
          }))
      : buildRawTranscriptTurns(clipText, `${sessionId}_clip_${index + 1}`);

    transcriptTurns.push(...clipTurns);
    offsetSeconds += resolveClipDurationSeconds(clip, result.segments);
  }

  return {
    text: transcriptParts.join(' ').trim() || transcriptTurns.map((turn) => turn.text).join(' ').trim(),
    turns: transcriptTurns,
    totalDurationSeconds: offsetSeconds,
  };
}

function buildRawTranscriptTurns(text, sourceId) {
  return splitIntoTurns(text).map((part, index) => ({
    id: `${sourceId}_turn_${index + 1}`,
    speaker: 'unknown',
    text: part,
    start: null,
    end: null,
    confidence: null,
  }));
}

function resolveClipDurationSeconds(clip, segments) {
  const durationMs = Number(clip.durationMs);
  if (Number.isFinite(durationMs) && durationMs > 0) {
    return durationMs / 1000;
  }

  const maxSegmentEnd = Array.isArray(segments)
    ? Math.max(
        0,
        ...segments.map((segment) => {
          const end = Number(segment?.end);
          return Number.isFinite(end) ? end : 0;
        }),
      )
    : 0;
  return maxSegmentEnd;
}

function resolvePreferredTranscriptionLanguage(customer) {
  const metadata = customer?.metadata && typeof customer.metadata === 'object' ? customer.metadata : {};
  const preferredLanguage = String(metadata.preferredLanguage || metadata.speechLanguageHint || '').trim();
  return preferredLanguage || null;
}

function isTranscriptUsableForAnalysis({ transcriptText, totalDurationSeconds }) {
  const wordCount = countWords(transcriptText);
  if (wordCount < MIN_TRANSCRIPT_WORDS) {
    return false;
  }

  const durationSeconds = Number(totalDurationSeconds);
  if (!Number.isFinite(durationSeconds) || durationSeconds <= 0) {
    return true;
  }

  return wordCount / durationSeconds >= MIN_WORDS_PER_SECOND;
}

function countWords(text) {
  return String(text || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

function inferSpeaker(text, index) {
  const lower = String(text || '').toLowerCase();
  if (/(?:i recommend|let me show|shall we|would you like|based on|i suggest|my suggestion)/.test(lower)) return 'salesperson';
  if (/(?:i am|we need|i need|i want|my family|budget|what about|how much|not sure|concerned)/.test(lower)) return 'customer';
  return index % 2 === 0 ? 'salesperson' : 'customer';
}
