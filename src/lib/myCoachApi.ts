export type CustomerThreadSummary = {
  id: string;
  customerName: string;
  phone: string;
  vehicleIntent: string;
  visitCount: number;
  lastVisitLabel: string;
  unresolvedItems: string[];
  stage: string;
  updatedAt: string;
  badge: string;
};

export type TranscriptTurn = {
  id: string;
  speaker: 'salesperson' | 'customer' | 'coach';
  text: string;
  timestamp: string;
  confidence?: number;
};

export type SpeedStageScore = {
  stage: string;
  score: number;
  note: string;
};

export type CoachingReport = {
  id: string;
  sessionId: string;
  overallScore: number;
  grade: string;
  masterCopyVersion?: string | null;
  masterCopyHash?: string | null;
  headline: string;
  summary: string;
  sourceNote: string;
  speedStages: SpeedStageScore[];
  questionCoverage: string[];
  objectionReviews: string[];
  productFitSummary: string;
  strengths: string[];
  improvements: string[];
  nextVisitPrep: string[];
  researchTasks: string[];
  transcriptHighlights: TranscriptTurn[];
  comparisonToPrevious?: string | null;
  warnings?: string[];
  generatedAt: string;
};

export type CoachSessionSummary = {
  id: string;
  customerId: string;
  title: string;
  createdAt: string;
  status: 'draft' | 'processing' | 'completed' | 'error';
  clipCount: number;
  transcript: TranscriptTurn[];
  report?: CoachingReport;
  source: 'recorded' | 'uploaded' | 'mixed';
  errorMessage?: string | null;
};

export type CustomerThreadDetail = CustomerThreadSummary & {
  summary: string;
  notes: string[];
  sessions: CoachSessionSummary[];
};

export type CoachReportListItem = {
  id: string;
  sessionId: string;
  customerId: string;
  customerName: string;
  sessionTitle: string;
  generatedAt: string;
  overallScore: number;
  grade: string;
  summary: string;
  report: CoachingReport;
};

export type CreateCustomerInput = {
  customerName: string;
  phone: string;
  vehicleIntent: string;
  notes?: string;
};

export type AudioClipPayload = {
  fileName: string;
  mimeType: string;
  base64: string;
  source: 'recorded' | 'uploaded';
  durationMs?: number;
};

export type MyCoachStepFocus = 'capture' | 'history';
export type MyCoachFlowOrigin = 'live_session' | 'report_library' | 'tutorial';

const API_BASE = '/api/my-coach';
const REPORT_SELECTION_KEY = 'my-coach:selected-report-id';
const THREAD_SELECTION_KEY = 'my-coach:selected-thread-id';
const SESSION_SELECTION_KEY = 'my-coach:selected-session-id';
const DRAFT_SESSION_TITLE_KEY = 'my-coach:draft-session-title';
const STEPS_FOCUS_KEY = 'my-coach:steps-focus';
const FLOW_ORIGIN_KEY = 'my-coach:flow-origin';

export type PendingLiveSessionSubmission = {
  customerId: string;
  title: string;
  source: 'recorded' | 'uploaded' | 'mixed';
  clips: AudioClipPayload[];
  transcriptText: string;
  transcriptLines?: TranscriptTurn[];
};

export type MasterCopyInfo = {
  version: string;
  hash: string;
  source: string;
};

let pendingLiveSessionSubmission: PendingLiveSessionSubmission | null = null;
let activeMasterCopyInfo: MasterCopyInfo | null = null;
const TRANSCRIPT_UNAVAILABLE_MESSAGE =
  'Audio was captured, but My Coach could not build a reliable transcript for this session. This can happen when the conversation was in another language, too quiet, or mostly silence.';

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    let message = `Request failed with status ${response.status}`;
    const payloadText = await response.text();

    if (payloadText) {
      const contentType = response.headers.get('content-type') || '';
      if (contentType.includes('application/json')) {
        try {
          const payload = JSON.parse(payloadText) as { message?: string; error?: string; detail?: string };
          message = payload.message || payload.error || payload.detail || message;
        } catch {
          message = payloadText.trim() || message;
        }
      } else {
        message = payloadText.trim() || message;
      }
    }

    throw new Error(message);
  }

  return (await response.json()) as T;
}

export async function listCustomerThreads() {
  const payload = await requestJson<{ customers: BackendCustomer[] }>('/customers');
  return payload.customers.map((customer) => mapCustomerSummary(customer));
}

export async function getCustomerThread(customerId: string) {
  const payload = await requestJson<{
    customer: BackendCustomer;
    sessions: BackendSession[];
    reports: BackendReportEnvelope[];
    audioAssets: BackendAudioAsset[];
  }>(`/customers/${customerId}`);

  const reportsById = new Map(payload.reports.map((row) => [row.id, mapReportEnvelope(row)]));
  const clipCountBySession = payload.audioAssets.reduce<Record<string, number>>((acc, asset) => {
    acc[asset.sessionId] = (acc[asset.sessionId] || 0) + 1;
    return acc;
  }, {});

  const sessions = payload.sessions.map((session) =>
    mapSession(session, {
      clipCount: clipCountBySession[session.id] || 0,
      report: session.reportId ? reportsById.get(session.reportId)?.report : undefined,
    }),
  );

  const summary = mapCustomerSummary(payload.customer);
  return {
    ...summary,
    summary: payload.customer.notes || 'Customer thread is ready for a coaching session.',
    notes: ensureStringArray(payload.customer.metadata.notes),
    sessions,
  } satisfies CustomerThreadDetail;
}

export async function createCustomerThread(input: CreateCustomerInput) {
  const payload = await requestJson<{ customer: BackendCustomer }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.customerName,
      phone: input.phone,
      notes: input.notes ?? '',
      metadata: {
        vehicleIntent: input.vehicleIntent,
        stage: 'New thread',
        badge: 'New',
        notes: input.notes ? [input.notes] : [],
      },
    }),
  });

  return mapCustomerSummary(payload.customer);
}

export async function submitCoachAudio(params: {
  customerId: string;
  title?: string;
  source: 'recorded' | 'uploaded' | 'mixed';
  clips: AudioClipPayload[];
  transcriptText: string;
  transcriptLines?: TranscriptTurn[];
}) {
  const sessionPayload = await requestJson<{ session: BackendSession }>('/sessions', {
    method: 'POST',
    body: JSON.stringify({
      customerId: params.customerId,
      title: params.title,
      mode: 'analysis',
      status: 'draft',
    }),
  });

  await requestJson(`/sessions/${sessionPayload.session.id}/audio`, {
    method: 'POST',
    body: JSON.stringify({
      clips: params.clips,
      transcriptText: params.transcriptText,
      transcriptLines: params.transcriptLines,
      transcriptSource: 'browser_stt',
    }),
  });

  const analysis = await requestJson<{
    session: BackendSession;
    report: BackendReportEnvelope;
    reportData: BackendReport;
  }>(`/sessions/${sessionPayload.session.id}/analyze`, {
    method: 'POST',
  });

  return {
    session: mapSession(analysis.session, {
      clipCount: params.clips.length,
      report: mapReport(analysis.reportData),
    }),
    report: mapReport(analysis.reportData),
  };
}

export async function listCoachReports() {
  const payload = await requestJson<{ reports: BackendReportEnvelope[] }>('/reports');
  return payload.reports.map(mapReportEnvelope);
}

export async function regenerateCoachReport(sessionId: string) {
  const analysis = await requestJson<{
    session: BackendSession;
    report: BackendReportEnvelope;
    reportData: BackendReport;
  }>(`/sessions/${sessionId}/analyze`, {
    method: 'POST',
  });

  const refreshed = await listCoachReports();
  return refreshed.find((item) => item.id === analysis.report.id) ?? mapReportEnvelope(analysis.report);
}

export async function getMasterCopyInfo() {
  const payload = await requestJson<{ masterCopy: MasterCopyInfo }>('/master-copy');
  activeMasterCopyInfo = payload.masterCopy;
  return payload.masterCopy;
}

export function getTrainingMasterCopyLabel() {
  return activeMasterCopyInfo?.version || 'Training Master Copy';
}

export function getQuestionBankPreview() {
  return [
    { id: 'Q1', question: 'Is this a first visit, return visit, or referral?' },
    { id: 'Q18', question: 'What is the budget range?' },
    { id: 'Q27', question: 'What features matter most to the customer?' },
  ];
}

export function getSpeedFrameworkPreview() {
  return [
    {
      id: 'start-right',
      label: 'Start Right',
      detail: 'Build trust fast, confirm visit context, and make the customer feel understood from the first minute.',
    },
    {
      id: 'plan-to-probe',
      label: 'Plan to Probe',
      detail: 'Ask the discovery questions that uncover budget, family needs, usage, timing, and buying conditions.',
    },
    {
      id: 'explain-value',
      label: 'Explain Value Proposition',
      detail: 'Translate specs into value by tying the right model to the customer profile and usage pattern.',
    },
    {
      id: 'eliminate-objection',
      label: 'Eliminate Objection',
      detail: 'Use acknowledge, clarify, and evidence so objections are resolved instead of just parked for later.',
    },
    {
      id: 'drive-closure',
      label: 'Drive Closure',
      detail: 'End with a concrete next action such as a callback slot, showroom revisit, quotation, or test drive.',
    },
  ];
}

export function rememberSelectedReportId(reportId: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(REPORT_SELECTION_KEY, reportId);
  }
}

export function readRememberedReportId() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(REPORT_SELECTION_KEY);
}

export function clearRememberedReportId() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(REPORT_SELECTION_KEY);
  }
}

export function rememberSelectedThreadId(threadId: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(THREAD_SELECTION_KEY, threadId);
  }
}

export function readRememberedThreadId() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(THREAD_SELECTION_KEY);
}

export function clearRememberedThreadId() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(THREAD_SELECTION_KEY);
  }
}

export function rememberSelectedSessionId(sessionId: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SESSION_SELECTION_KEY, sessionId);
  }
}

export function readRememberedSessionId() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_SELECTION_KEY);
}

export function clearRememberedSessionId() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(SESSION_SELECTION_KEY);
  }
}

export function rememberDraftSessionTitle(title: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(DRAFT_SESSION_TITLE_KEY, title);
  }
}

export function readDraftSessionTitle() {
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(DRAFT_SESSION_TITLE_KEY);
}

export function clearDraftSessionTitle() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(DRAFT_SESSION_TITLE_KEY);
  }
}

export function rememberFlowOrigin(origin: MyCoachFlowOrigin) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(FLOW_ORIGIN_KEY, origin);
  }
}

export function readFlowOrigin() {
  if (typeof window === 'undefined') return null;
  const remembered = window.sessionStorage.getItem(FLOW_ORIGIN_KEY);
  return remembered === 'live_session' || remembered === 'report_library' || remembered === 'tutorial'
    ? remembered
    : null;
}

export function clearFlowOrigin() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(FLOW_ORIGIN_KEY);
  }
}

export function rememberStepsFocus(step: MyCoachStepFocus) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(STEPS_FOCUS_KEY, step);
  }
}

export function readRememberedStepsFocus() {
  if (typeof window === 'undefined') return null;
  const remembered = window.sessionStorage.getItem(STEPS_FOCUS_KEY);
  return remembered === 'capture' || remembered === 'history' ? remembered : null;
}

export function clearRememberedStepsFocus() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(STEPS_FOCUS_KEY);
  }
}

export function stagePendingLiveSessionSubmission(submission: PendingLiveSessionSubmission) {
  pendingLiveSessionSubmission = submission;
}

export function readPendingLiveSessionSubmission() {
  return pendingLiveSessionSubmission;
}

export function clearPendingLiveSessionSubmission() {
  pendingLiveSessionSubmission = null;
}

export function hasUsableTranscript(turns: TranscriptTurn[] | null | undefined) {
  return (turns || []).some((turn) => turn.text.trim().length >= 8);
}

export function getTranscriptUnavailableMessage() {
  return TRANSCRIPT_UNAVAILABLE_MESSAGE;
}

function mapThreadToSummary(thread: CustomerThreadDetail): CustomerThreadSummary {
  return {
    id: thread.id,
    customerName: thread.customerName,
    phone: thread.phone,
    vehicleIntent: thread.vehicleIntent,
    visitCount: thread.visitCount,
    lastVisitLabel: thread.lastVisitLabel,
    unresolvedItems: thread.unresolvedItems,
    stage: thread.stage,
    updatedAt: thread.updatedAt,
    badge: thread.badge,
  };
}

function mapCustomerSummary(customer: BackendCustomer): CustomerThreadSummary {
  const unresolvedItems = ensureStringArray(customer.metadata.unresolvedItems ?? customer.metadata.notes).slice(0, 3);
  return {
    id: customer.id,
    customerName: customer.name,
    phone: customer.phone || 'Not captured',
    vehicleIntent: customer.metadata.vehicleIntent || customer.notes || 'Need summary not captured yet',
    visitCount: Number(customer.metadata.visitCount ?? 0) || 1,
    lastVisitLabel: relativeLabel(customer.updatedAt),
    unresolvedItems,
    stage: customer.metadata.stage || 'Discovery',
    updatedAt: customer.updatedAt,
    badge: customer.metadata.badge || 'Active',
  };
}

function mapSession(session: BackendSession, extras: { clipCount: number; report?: CoachingReport }): CoachSessionSummary {
  const transcriptTurns = (session.transcript || []).map(mapTranscriptTurn);

  return {
    id: session.id,
    customerId: session.customerId,
    title: session.title || 'Customer conversation',
    createdAt: session.createdAt,
    status: normalizeStatus(session.status),
    clipCount: extras.clipCount,
    transcript: transcriptTurns.length ? transcriptTurns : extras.report?.transcriptHighlights || [],
    report: extras.report,
    source: 'mixed',
    errorMessage: session.errorMessage || null,
  };
}

function mapReportEnvelope(row: BackendReportEnvelope): CoachReportListItem {
  const mappedReport = mapReport(row.report);
  return {
    id: row.id,
    sessionId: row.sessionId,
    customerId: row.customerId,
    customerName: row.customerName || 'Customer',
    sessionTitle: row.sessionTitle || 'Customer conversation',
    generatedAt: row.createdAt,
    overallScore: row.overallScore,
    grade: row.grade,
    summary: mappedReport.summary,
    report: mappedReport,
  };
}

function mapReport(report: BackendReport): CoachingReport {
  const speedStages = Object.values(report.speed || {}).map((stage) => ({
    stage: stage.label,
    score: stage.score,
    note: stage.rationale || 'Stage review generated from the training master copy.',
  }));

  return {
    id: report.id || `report-${Math.random().toString(36).slice(2, 9)}`,
    sessionId: report.customerContext?.sessionId || '',
    overallScore: report.overallScore,
    grade: report.grade,
    masterCopyVersion: report.masterCopyVersion || null,
    masterCopyHash: report.masterCopyHash || null,
    headline: `${report.customerProfile?.label || 'Customer'} coaching review`,
    summary:
      report.summary ||
      report.reportHighlights?.join(' ') ||
      'My Coach generated a report using the current training master copy.',
    sourceNote: `Analysis is based on ${report.masterCopyVersion || getTrainingMasterCopyLabel()}.`,
    speedStages,
    questionCoverage: (report.questionCoverage || [])
      .slice(0, 8)
      .map((item) => `${item.id}: ${item.status} | ${item.question}`),
    objectionReviews: (report.objections || []).map(
      (item) => `${item.label}: ${item.handled} | ${item.strategy}`,
    ),
    productFitSummary:
      report.productFit?.why || 'Product fit was evaluated against the current training master copy.',
    strengths: report.strengths || [],
    improvements: report.improvements || [],
    nextVisitPrep: report.nextVisitPreparation || [],
    researchTasks: report.researchTasks || [],
    transcriptHighlights: (report.transcriptTurns || []).map(mapTranscriptTurn),
    comparisonToPrevious: report.comparisonToPrevious || null,
    warnings: report.warnings || [],
    generatedAt: report.generatedAt,
  };
}

function mapTranscriptTurn(turn: BackendTurn): TranscriptTurn {
  const seconds = Number(turn.start ?? 0);
  const minutesLabel = `${String(Math.floor(seconds / 60)).padStart(2, '0')}:${String(
    Math.floor(seconds % 60),
  ).padStart(2, '0')}`;
  return {
    id: turn.id,
    speaker: normalizeSpeaker(turn.speaker),
    text: turn.text,
    timestamp: minutesLabel,
  };
}

function normalizeSpeaker(speaker: string) {
  if (speaker === 'system') return 'coach';
  if (speaker === 'salesperson' || speaker === 'customer') return speaker;
  return 'coach';
}

function normalizeStatus(status: string) {
  if (status === 'failed') return 'error';
  if (status === 'completed' || status === 'processing' || status === 'draft') return status;
  return 'draft';
}

function ensureStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function relativeLabel(dateString: string) {
  const delta = Date.now() - new Date(dateString).getTime();
  const minutes = Math.round(delta / 60000);
  if (minutes < 1) return 'Just now';
  if (minutes < 60) return `${minutes} min ago`;
  if (minutes < 1440) return `${Math.round(minutes / 60)} hr ago`;
  return `${Math.round(minutes / 1440)} day ago`;
}

type BackendCustomer = {
  id: string;
  name: string;
  phone?: string;
  notes?: string;
  createdAt: string;
  updatedAt: string;
  metadata: Record<string, any>;
};

type BackendSession = {
  id: string;
  customerId: string;
  title?: string;
  status: string;
  transcriptText?: string;
  transcript?: BackendTurn[];
  reportId?: string | null;
  errorMessage?: string | null;
  processingStartedAt?: string | null;
  processingCompletedAt?: string | null;
  createdAt: string;
};

type BackendTurn = {
  id: string;
  speaker: string;
  text: string;
  start?: number | null;
};

type BackendAudioAsset = {
  sessionId: string;
};

type BackendReportEnvelope = {
  id: string;
  sessionId: string;
  customerId: string;
  overallScore: number;
  grade: string;
  createdAt: string;
  customerName?: string;
  sessionTitle?: string;
  report: BackendReport;
};

type BackendReport = {
  id?: string;
  overallScore: number;
  grade: string;
  generatedAt: string;
  masterCopyVersion?: string | null;
  masterCopyHash?: string | null;
  summary?: string;
  reportHighlights?: string[];
  strengths?: string[];
  improvements?: string[];
  nextVisitPreparation?: string[];
  researchTasks?: string[];
  transcriptTurns?: BackendTurn[];
  questionCoverage?: Array<{ id: string; status: string; question: string }>;
  objections?: Array<{ label: string; handled: string; strategy: string }>;
  productFit?: { why?: string };
  customerProfile?: { label?: string };
  customerContext?: { sessionId?: string };
  speed?: Record<string, { label: string; score: number; rationale: string }>;
  comparisonToPrevious?: string | null;
  warnings?: string[];
};
