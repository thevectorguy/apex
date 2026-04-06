import { readRouteQueryParam, writeRouteQueryParam } from './appRouter';

export type CustomerThreadSummary = {
  id: string;
  customerName: string;
  phone: string;
  customerContext: string;
  visitCount: number;
  hasSubmittedSession: boolean;
  latestSessionStatus: 'draft' | 'processing' | 'completed' | 'error' | null;
  latestSessionId: string | null;
  lastVisitLabel: string;
  unresolvedItems: string[];
  stage: string;
  updatedAt: string;
  badge: string;
};

export type TranscriptTurn = {
  id: string;
  speaker: 'salesperson' | 'customer' | 'coach' | 'unknown';
  text: string;
  timestamp: string;
  confidence?: number;
};

export type SpeedStageScore = {
  stage: string;
  score: number;
  note: string;
  evidence?: string[];
};

export type QuestionCoverageStatus = 'COVERED' | 'PARTIALLY' | 'MISSED';

export type QuestionCoverageItem = {
  id: string;
  question: string;
  status: QuestionCoverageStatus;
  evidence: string | null;
};

export type ObjectionHandledStatus = 'HANDLED' | 'PARTIALLY' | 'NOT_HANDLED';

export type ObjectionReviewItem = {
  label: string;
  category: 'price' | 'competitor' | 'features' | 'timing' | 'trust' | 'other';
  handled: ObjectionHandledStatus;
  how: string | null;
  advice: string | null;
  strategy: string | null;
  evidence: string[];
};

export type ProductFitReview = {
  verdict: 'CORRECT' | 'PARTIALLY_CORRECT' | 'INCORRECT' | 'NOT_MADE';
  pitchedModels: string[];
  salesmanPick: string | null;
  customerPreferred: string | null;
  idealMatch: string | null;
  avoidModels: ProductFitAvoidItem[];
  why: string;
  recommendedModel?: string | null;
  betterAlternative?: string | null;
};

export type ProductFitAvoidItem = {
  model: string;
  rationale: string;
  evidence: string[];
};

export type CoachAdviceItem = {
  title: string;
  detail: string;
  priority: 'high' | 'medium' | 'low';
};

export type CustomerSentiment = {
  start: string;
  end: string;
  shift: string;
};

export type TurningPoint = {
  title: string;
  detail: string;
  timestamp: string | null;
};

export type DrivingIndex = {
  primaryDriver: string;
  insight: string;
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
  questionCoverageItems: QuestionCoverageItem[];
  objectionReviews: string[];
  objections: ObjectionReviewItem[];
  productFitSummary: string;
  productFit: ProductFitReview;
  strengths: string[];
  improvements: string[];
  coachAdvice: CoachAdviceItem[];
  nextVisitOpener: string;
  nextVisitPrep: string[];
  researchTasks: string[];
  transcriptHighlights: TranscriptTurn[];
  customerSentiment: CustomerSentiment;
  turningPoints: TurningPoint[];
  followUpMessage: string;
  drivingIndex: DrivingIndex;
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
  customerContext: string;
  notes?: string;
  preferredLanguage?: string;
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
const PENDING_LIVE_SESSION_KEY = 'my-coach:pending-live-session';

export type PendingLiveSessionSubmission = {
  customerId: string;
  title: string;
  source: 'recorded' | 'uploaded' | 'mixed';
  clips: AudioClipPayload[];
};

export type MasterCopyInfo = {
  version: string;
  hash: string;
  source: string;
};

let pendingLiveSessionSubmission: PendingLiveSessionSubmission | null = null;
let activeMasterCopyInfo: MasterCopyInfo | null = null;
const TRANSCRIPT_UNAVAILABLE_MESSAGE =
  'Audio was captured, but My Coach could not build a reliable transcript for this session.';

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
  const preferredLanguage = input.preferredLanguage?.trim();
  const payload = await requestJson<{ customer: BackendCustomer }>('/customers', {
    method: 'POST',
    body: JSON.stringify({
      name: input.customerName,
      phone: input.phone,
      notes: input.notes ?? '',
      metadata: {
        customerContext: input.customerContext,
        vehicleIntent: input.customerContext,
        stage: 'New thread',
        badge: 'New',
        notes: input.notes ? [input.notes] : [],
        ...(preferredLanguage ? { preferredLanguage } : {}),
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
  transcriptText?: string;
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
      ...(params.transcriptText ? { transcriptText: params.transcriptText } : {}),
      ...(params.transcriptLines?.length ? { transcriptLines: params.transcriptLines } : {}),
      transcriptSource: params.transcriptText || params.transcriptLines?.length ? 'browser_stt' : 'backend_stt',
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
  writeRouteQueryParam('reportId', reportId);
}

export function readRememberedReportId() {
  const routeValue = readRouteQueryParam('reportId');
  if (routeValue) return routeValue;
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(REPORT_SELECTION_KEY);
}

export function clearRememberedReportId() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(REPORT_SELECTION_KEY);
  }
  writeRouteQueryParam('reportId', null);
}

export function rememberSelectedThreadId(threadId: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(THREAD_SELECTION_KEY, threadId);
  }
  writeRouteQueryParam('threadId', threadId);
}

export function readRememberedThreadId() {
  const routeValue = readRouteQueryParam('threadId');
  if (routeValue) return routeValue;
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(THREAD_SELECTION_KEY);
}

export function clearRememberedThreadId() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(THREAD_SELECTION_KEY);
  }
  writeRouteQueryParam('threadId', null);
}

export function rememberSelectedSessionId(sessionId: string) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(SESSION_SELECTION_KEY, sessionId);
  }
  writeRouteQueryParam('sessionId', sessionId);
}

export function readRememberedSessionId() {
  const routeValue = readRouteQueryParam('sessionId');
  if (routeValue) return routeValue;
  if (typeof window === 'undefined') return null;
  return window.sessionStorage.getItem(SESSION_SELECTION_KEY);
}

export function clearRememberedSessionId() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(SESSION_SELECTION_KEY);
  }
  writeRouteQueryParam('sessionId', null);
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
  writeRouteQueryParam('flow', origin);
}

export function readFlowOrigin() {
  const remembered = readRouteQueryParam('flow') ?? (typeof window !== 'undefined' ? window.sessionStorage.getItem(FLOW_ORIGIN_KEY) : null);
  return remembered === 'live_session' || remembered === 'report_library' || remembered === 'tutorial'
    ? remembered
    : null;
}

export function clearFlowOrigin() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(FLOW_ORIGIN_KEY);
  }
  writeRouteQueryParam('flow', null);
}

export function rememberStepsFocus(step: MyCoachStepFocus) {
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(STEPS_FOCUS_KEY, step);
  }
  writeRouteQueryParam('stepFocus', step);
}

export function readRememberedStepsFocus() {
  const remembered =
    readRouteQueryParam('stepFocus') ?? (typeof window !== 'undefined' ? window.sessionStorage.getItem(STEPS_FOCUS_KEY) : null);
  return remembered === 'capture' || remembered === 'history' ? remembered : null;
}

export function clearRememberedStepsFocus() {
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(STEPS_FOCUS_KEY);
  }
  writeRouteQueryParam('stepFocus', null);
}

export function stagePendingLiveSessionSubmission(submission: PendingLiveSessionSubmission) {
  pendingLiveSessionSubmission = submission;
  if (typeof window !== 'undefined') {
    window.sessionStorage.setItem(PENDING_LIVE_SESSION_KEY, JSON.stringify(submission));
  }
}

export function readPendingLiveSessionSubmission() {
  if (pendingLiveSessionSubmission) return pendingLiveSessionSubmission;
  if (typeof window === 'undefined') return null;

  const stored = window.sessionStorage.getItem(PENDING_LIVE_SESSION_KEY);
  if (!stored) return null;

  try {
    pendingLiveSessionSubmission = JSON.parse(stored) as PendingLiveSessionSubmission;
    return pendingLiveSessionSubmission;
  } catch {
    window.sessionStorage.removeItem(PENDING_LIVE_SESSION_KEY);
    return null;
  }
}

export function clearPendingLiveSessionSubmission() {
  pendingLiveSessionSubmission = null;
  if (typeof window !== 'undefined') {
    window.sessionStorage.removeItem(PENDING_LIVE_SESSION_KEY);
  }
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
    customerContext: thread.customerContext,
    visitCount: thread.visitCount,
    hasSubmittedSession: thread.hasSubmittedSession,
    latestSessionStatus: thread.latestSessionStatus,
    latestSessionId: thread.latestSessionId,
    lastVisitLabel: thread.lastVisitLabel,
    unresolvedItems: thread.unresolvedItems,
    stage: thread.stage,
    updatedAt: thread.updatedAt,
    badge: thread.badge,
  };
}

function mapCustomerSummary(customer: BackendCustomer): CustomerThreadSummary {
  const unresolvedItems = ensureStringArray(customer.metadata.unresolvedItems ?? customer.metadata.notes).slice(0, 3);
  const visitCount = Number(customer.metadata.visitCount ?? 0) || 0;
  const latestSessionAt =
    typeof customer.metadata.lastSessionAt === 'string' && customer.metadata.lastSessionAt
      ? customer.metadata.lastSessionAt
      : null;

  return {
    id: customer.id,
    customerName: customer.name,
    phone: customer.phone || 'Not captured',
    customerContext:
      customer.metadata.customerContext ||
      customer.metadata.vehicleIntent ||
      customer.notes ||
      'Need summary not captured yet',
    visitCount,
    hasSubmittedSession: Boolean(customer.metadata.hasSubmittedSession ?? visitCount > 0),
    latestSessionStatus: normalizeSummaryStatus(customer.metadata.latestSessionStatus),
    latestSessionId: typeof customer.metadata.latestSessionId === 'string' ? customer.metadata.latestSessionId : null,
    lastVisitLabel: latestSessionAt ? relativeLabel(latestSessionAt) : 'No visits yet',
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
    transcript: transcriptTurns,
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
    evidence: Array.isArray(stage.evidence) ? ensureStringArray(stage.evidence) : [],
  }));
  const questionCoverageItems = (report.questionCoverage || []).map(mapQuestionCoverageItem);
  const objections = (report.objections || []).map(mapObjectionItem);
  const productFit = mapProductFit(report.productFit);
  const coachAdvice = (report.coachAdvice || []).map(mapCoachAdviceItem);
  const transcriptHighlights = (report.transcriptTurns || []).map(mapTranscriptTurn);
  const nextVisitOpener = ensureString(report.nextVisitOpener);
  const drivingIndex = mapDrivingIndex(report.drivingIndex);
  const preferredModelLabel = extractProductFitLabel(
    productFit.idealMatch || productFit.recommendedModel || productFit.salesmanPick || productFit.customerPreferred,
  );
  const fallbackFitLabel = productFit.verdict === 'NOT_MADE' ? 'Not Made' : '';
  const productFitSummary =
    preferredModelLabel ||
    fallbackFitLabel ||
    productFit.why ||
    'Product fit was evaluated against the current training master copy.';

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
    questionCoverage: questionCoverageItems
      .slice(0, 8)
      .map((item) => `${item.status} | ${item.question}${item.evidence ? ` | ${item.evidence}` : ''}`),
    questionCoverageItems,
    objectionReviews: objections.map(
      (item) => `${item.label}: ${item.handled} | ${item.how || item.advice || item.strategy || item.category}`,
    ),
    objections,
    productFitSummary,
    productFit,
    strengths: report.strengths || [],
    improvements: report.improvements || [],
    coachAdvice,
    nextVisitOpener,
    nextVisitPrep: report.nextVisitPreparation || [],
    researchTasks: report.researchTasks || [],
    transcriptHighlights,
    customerSentiment: mapCustomerSentiment(report.customerSentiment),
    turningPoints: (report.turningPoints || []).map(mapTurningPoint),
    followUpMessage: ensureString(report.followUpMessage),
    drivingIndex,
    comparisonToPrevious: report.comparisonToPrevious || null,
    warnings: report.warnings || [],
    generatedAt: report.generatedAt,
  };
}

function mapQuestionCoverageItem(item: BackendQuestionCoverageItem): QuestionCoverageItem {
  return {
    id: item.id || '',
    question: item.question || 'Relevant question',
    status: normalizeQuestionCoverageStatus(item.status),
    evidence: typeof item.evidence === 'string' && item.evidence.trim() ? item.evidence.trim() : null,
  };
}

function mapObjectionItem(item: BackendObjectionItem): ObjectionReviewItem {
  return {
    label: item.label || 'Unspecified objection',
    category: normalizeObjectionCategory(item.category),
    handled: normalizeObjectionHandledStatus(item.handled),
    how: ensureNullableString(item.how),
    advice: ensureNullableString(item.advice),
    strategy: ensureNullableString(item.strategy),
    evidence: ensureStringArray(item.evidence),
  };
}

function mapProductFit(productFit?: BackendProductFit): ProductFitReview {
  return {
    verdict: normalizeProductFitVerdict(productFit?.verdict),
    pitchedModels: ensureStringArray(productFit?.pitchedModels),
    salesmanPick: ensureNullableString(productFit?.salesmanPick),
    customerPreferred: ensureNullableString(productFit?.customerPreferred),
    idealMatch: ensureNullableString(productFit?.idealMatch ?? productFit?.betterAlternative),
    avoidModels: (productFit?.avoidModels || []).map(mapProductFitAvoidItem).slice(0, 2),
    why:
      ensureString(productFit?.why) || 'Product fit was evaluated against the current training master copy.',
    recommendedModel: ensureNullableString(productFit?.recommendedModel),
    betterAlternative: ensureNullableString(productFit?.betterAlternative),
  };
}

function mapProductFitAvoidItem(item: BackendProductFitAvoidItem): ProductFitAvoidItem {
  return {
    model: formatModelLabel(ensureString(item.model) || 'Avoided Fit'),
    rationale: ensureString(item.rationale) || 'This pitch did not align well with the customer signals in the conversation.',
    evidence: ensureStringArray(item.evidence),
  };
}

function mapCoachAdviceItem(item: BackendCoachAdviceItem): CoachAdviceItem {
  return {
    title: ensureString(item.title) || 'Coach Tip',
    detail: ensureString(item.detail) || ensureString(item.title) || 'Advice generated from the latest report.',
    priority: normalizeCoachAdvicePriority(item.priority),
  };
}

function mapCustomerSentiment(sentiment?: BackendCustomerSentiment): CustomerSentiment {
  return {
    start: ensureString(sentiment?.start) || 'Neutral',
    end: ensureString(sentiment?.end) || 'Neutral',
    shift: ensureString(sentiment?.shift) || 'Steady',
  };
}

function mapTurningPoint(item: BackendTurningPoint): TurningPoint {
  return {
    title: ensureString(item.title) || 'Turning Point',
    detail: ensureString(item.detail) || ensureString(item.title) || 'Key moment from the conversation.',
    timestamp: ensureNullableString(item.timestamp),
  };
}

function mapDrivingIndex(index?: BackendDrivingIndex): DrivingIndex {
  return {
    primaryDriver: ensureString(index?.primaryDriver) || 'Unclear',
    insight: ensureString(index?.insight),
  };
}

function extractProductFitLabel(value?: string | null) {
  const normalized = ensureString(value);
  if (!normalized) return '';
  return formatModelLabel(normalized.split('|')[0]?.trim() || normalized);
}

function formatModelLabel(value: string) {
  const normalized = ensureString(value);
  if (!normalized) return '';
  return normalized
    .split(/\s+/)
    .map((part) => {
      if (!part) return part;
      if (/[A-Z0-9]{2,}/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
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
    confidence: typeof turn.confidence === 'number' ? turn.confidence : undefined,
  };
}

function normalizeSpeaker(speaker: string) {
  if (speaker === 'system') return 'coach';
  if (speaker === 'salesperson' || speaker === 'customer') return speaker;
  if (speaker === 'unknown') return 'unknown';
  return 'coach';
}

function normalizeQuestionCoverageStatus(status: string): QuestionCoverageStatus {
  if (status === 'COVERED' || status === 'PARTIALLY' || status === 'MISSED') return status;
  return 'MISSED';
}

function normalizeObjectionHandledStatus(status: string): ObjectionHandledStatus {
  if (status === 'HANDLED' || status === 'PARTIALLY' || status === 'NOT_HANDLED') return status;
  return 'NOT_HANDLED';
}

function normalizeObjectionCategory(category?: string): ObjectionReviewItem['category'] {
  if (
    category === 'price' ||
    category === 'competitor' ||
    category === 'features' ||
    category === 'timing' ||
    category === 'trust' ||
    category === 'other'
  ) {
    return category;
  }
  return 'other';
}

function normalizeProductFitVerdict(verdict?: string): ProductFitReview['verdict'] {
  if (
    verdict === 'CORRECT' ||
    verdict === 'PARTIALLY_CORRECT' ||
    verdict === 'INCORRECT' ||
    verdict === 'NOT_MADE'
  ) {
    return verdict;
  }
  return 'NOT_MADE';
}

function normalizeCoachAdvicePriority(priority?: string): CoachAdviceItem['priority'] {
  if (priority === 'high' || priority === 'medium' || priority === 'low') return priority;
  return 'medium';
}

function normalizeStatus(status: string) {
  if (status === 'failed') return 'error';
  if (status === 'completed' || status === 'processing' || status === 'draft') return status;
  return 'draft';
}

function normalizeSummaryStatus(status: unknown) {
  if (status === 'draft' || status === 'processing' || status === 'completed' || status === 'error') {
    return status;
  }
  if (status === 'failed') return 'error';
  return null;
}

function ensureStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function ensureString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureNullableString(value: unknown) {
  const normalized = ensureString(value);
  return normalized || null;
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
  confidence?: number | null;
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
  coachAdvice?: BackendCoachAdviceItem[];
  nextVisitOpener?: string;
  nextVisitPreparation?: string[];
  researchTasks?: string[];
  transcriptTurns?: BackendTurn[];
  questionCoverage?: BackendQuestionCoverageItem[];
  objections?: BackendObjectionItem[];
  productFit?: BackendProductFit;
  customerProfile?: { label?: string };
  customerContext?: { sessionId?: string };
  speed?: Record<string, { label: string; score: number; rationale: string; evidence?: string[] }>;
  customerSentiment?: BackendCustomerSentiment;
  turningPoints?: BackendTurningPoint[];
  followUpMessage?: string;
  drivingIndex?: BackendDrivingIndex;
  comparisonToPrevious?: string | null;
  warnings?: string[];
};

type BackendQuestionCoverageItem = {
  id: string;
  status: string;
  question: string;
  evidence?: string | null;
};

type BackendObjectionItem = {
  label: string;
  category?: string;
  handled: string;
  how?: string | null;
  advice?: string | null;
  strategy?: string | null;
  evidence?: string[];
};

type BackendProductFit = {
  verdict?: string;
  pitchedModels?: string[];
  salesmanPick?: string | null;
  customerPreferred?: string | null;
  idealMatch?: string | null;
  avoidModels?: BackendProductFitAvoidItem[];
  why?: string;
  recommendedModel?: string | null;
  betterAlternative?: string | null;
};

type BackendProductFitAvoidItem = {
  model?: string;
  rationale?: string;
  evidence?: string[];
};

type BackendCoachAdviceItem = {
  title?: string;
  detail?: string;
  priority?: string;
};

type BackendCustomerSentiment = {
  start?: string;
  end?: string;
  shift?: string;
};

type BackendTurningPoint = {
  title?: string;
  detail?: string;
  timestamp?: string | null;
};

type BackendDrivingIndex = {
  primaryDriver?: string;
  insight?: string;
};
