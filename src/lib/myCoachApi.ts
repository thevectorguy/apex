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
};

let pendingLiveSessionSubmission: PendingLiveSessionSubmission | null = null;

const demoThreads: CustomerThreadDetail[] = [
  {
    id: 'thread-kiran',
    customerName: 'Kiran Baxi',
    phone: '+91 98xx xx 5012',
    vehicleIntent: 'Premium family SUV with better mileage and a calm cabin for return visits',
    visitCount: 2,
    lastVisitLabel: 'Yesterday',
    unresolvedItems: ['EMI comfort band', 'Third-row trade-off'],
    stage: 'Follow-up close',
    updatedAt: new Date(Date.now() - 1000 * 60 * 70).toISOString(),
    badge: 'Hot lead',
    summary: 'A repeat visitor comparing premium SUV options. The next visit should resolve EMI comfort and seating priorities.',
    notes: ['Bring the hybrid calculator', 'Confirm whether the spouse will join the next visit'],
    sessions: [],
  },
];

async function requestJson<T>(path: string, init?: RequestInit): Promise<T> {
  const response = await fetch(`${API_BASE}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(init?.headers ?? {}),
    },
    ...init,
  });

  if (!response.ok) {
    throw new Error(`Request failed with status ${response.status}`);
  }

  return (await response.json()) as T;
}

async function withFallback<T>(runner: () => Promise<T>, fallback: () => T | Promise<T>): Promise<T> {
  try {
    return await runner();
  } catch {
    return fallback();
  }
}

export async function listCustomerThreads() {
  return withFallback(
    async () => {
      const payload = await requestJson<{ customers: BackendCustomer[] }>('/customers');
      return payload.customers.map((customer) => mapCustomerSummary(customer));
    },
    () => demoThreads.map((thread) => mapThreadToSummary(thread)),
  );
}

export async function getCustomerThread(customerId: string) {
  return withFallback(
    async () => {
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
    },
    () => {
      const thread = demoThreads.find((item) => item.id === customerId) ?? demoThreads[0];
      if (!thread) throw new Error('Customer not found');
      return thread;
    },
  );
}

export async function createCustomerThread(input: CreateCustomerInput) {
  return withFallback(
    async () => {
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
    },
    () => {
      const created: CustomerThreadDetail = {
        id: `thread-${Math.random().toString(36).slice(2, 9)}`,
        customerName: input.customerName || 'New Customer',
        phone: input.phone || '+91 98xx xx xxxx',
        vehicleIntent: input.vehicleIntent || 'Needs a tailored recommendation',
        visitCount: 1,
        lastVisitLabel: 'Just now',
        unresolvedItems: ['Discovery still in progress'],
        stage: 'New thread',
        updatedAt: new Date().toISOString(),
        badge: 'New',
        summary: input.notes || 'Fresh customer thread created in My Coach.',
        notes: input.notes ? [input.notes] : [],
        sessions: [],
      };
      demoThreads.unshift(created);
      return mapThreadToSummary(created);
    },
  );
}

export async function submitCoachAudio(params: {
  customerId: string;
  title?: string;
  source: 'recorded' | 'uploaded' | 'mixed';
  clips: AudioClipPayload[];
}) {
  return withFallback(
    async () => {
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
        body: JSON.stringify({ clips: params.clips }),
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
    },
    async () => {
      const detail = demoThreads.find((thread) => thread.id === params.customerId);
      if (!detail) throw new Error('Customer not found');
      const report = buildDemoReport(detail);
      const session: CoachSessionSummary = {
        id: report.sessionId,
        customerId: detail.id,
        title: params.title || 'Customer conversation',
        createdAt: new Date().toISOString(),
        status: 'completed',
        clipCount: params.clips.length,
        transcript: report.transcriptHighlights,
        report,
        source: params.source,
      };
      detail.sessions.unshift(session);
      detail.visitCount = Math.max(detail.visitCount, detail.sessions.length);
      detail.updatedAt = new Date().toISOString();
      detail.lastVisitLabel = 'Just now';
      detail.unresolvedItems = report.nextVisitPrep.slice(0, 2);
      return { session, report };
    },
  );
}

export async function listCoachReports() {
  return withFallback(
    async () => {
      const payload = await requestJson<{ reports: BackendReportEnvelope[] }>('/reports');
      return payload.reports.map(mapReportEnvelope);
    },
    () =>
      demoThreads
        .flatMap((thread) =>
          thread.sessions
            .filter((session) => session.report)
            .map((session) => ({
              id: session.report!.id,
              sessionId: session.id,
              customerId: thread.id,
              customerName: thread.customerName,
              sessionTitle: session.title,
              generatedAt: session.report!.generatedAt,
              overallScore: session.report!.overallScore,
              grade: session.report!.grade,
              summary: session.report!.summary,
              report: session.report!,
            })),
        )
        .sort((left, right) => right.generatedAt.localeCompare(left.generatedAt)),
  );
}

export async function regenerateCoachReport(sessionId: string) {
  return withFallback(
    async () => {
      const analysis = await requestJson<{
        session: BackendSession;
        report: BackendReportEnvelope;
        reportData: BackendReport;
      }>(`/sessions/${sessionId}/analyze`, {
        method: 'POST',
      });

      const refreshed = await listCoachReports();
      return refreshed.find((item) => item.id === analysis.report.id) ?? mapReportEnvelope(analysis.report);
    },
    async () => {
      for (const thread of demoThreads) {
        const session = thread.sessions.find((item) => item.id === sessionId);
        if (!session) continue;

        const nextReport = buildDemoReport(thread);
        session.report = nextReport;
        session.transcript = nextReport.transcriptHighlights;
        return {
          id: nextReport.id,
          sessionId: session.id,
          customerId: thread.id,
          customerName: thread.customerName,
          sessionTitle: session.title,
          generatedAt: nextReport.generatedAt,
          overallScore: nextReport.overallScore,
          grade: nextReport.grade,
          summary: nextReport.summary,
          report: nextReport,
        } satisfies CoachReportListItem;
      }

      throw new Error('Session not found');
    },
  );
}

export function getTrainingMasterCopyLabel() {
  return 'Training Master Copy v1';
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
  return {
    id: session.id,
    customerId: session.customerId,
    title: session.title || 'Customer conversation',
    createdAt: session.createdAt,
    status: normalizeStatus(session.status),
    clipCount: extras.clipCount,
    transcript: (session.transcript || []).map(mapTranscriptTurn),
    report: extras.report,
    source: 'mixed',
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
    headline: `${report.customerProfile?.label || 'Customer'} coaching review`,
    summary:
      report.summary ||
      report.reportHighlights?.join(' ') ||
      'My Coach generated a report using the current training master copy.',
    sourceNote: `Analysis is based on ${getTrainingMasterCopyLabel()}.`,
    speedStages,
    questionCoverage: (report.questionCoverage || [])
      .slice(0, 6)
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

function buildDemoReport(thread: CustomerThreadDetail): CoachingReport {
  const reportId = `report-${Math.random().toString(36).slice(2, 9)}`;
  return {
    id: reportId,
    sessionId: `session-${Math.random().toString(36).slice(2, 9)}`,
    overallScore: 82,
    grade: 'A',
    headline: `${thread.customerName} has a strong foundation with a few open loops to close.`,
    summary:
      'The recommendation direction is good, but the next visit should sharpen family, finance, and closure questions.',
    sourceNote: `Analysis is based on ${getTrainingMasterCopyLabel()}.`,
    speedStages: [
      { stage: 'Start Right', score: 14, note: 'Warm opening and good intent-setting.' },
      {
        stage: 'Plan to Probe',
        score: 19,
        note: 'Discovery covered the basics, but a few deeper questions are still missing.',
      },
      {
        stage: 'Explain Value Proposition',
        score: 21,
        note: 'The value story stayed tied to the customer need instead of reading specs.',
      },
      {
        stage: 'Eliminate Objection',
        score: 16,
        note: 'Objection handling needs more evidence and a firmer confirm-close loop.',
      },
      {
        stage: 'Drive Closure',
        score: 12,
        note: 'A next step was implied, but it should become calendar-specific.',
      },
    ],
    questionCoverage: [
      'Q1: covered | visit context established',
      'Q18: partial | budget touched but not narrowed',
      'Q27: missing | feature priorities not fully uncovered',
    ],
    objectionReviews: ['Let me think about it: partial | next step should be calendar-specific'],
    productFitSummary:
      'The recommendation direction fits the profile, but the next visit should prove the model against budget and family-use specifics.',
    strengths: [
      'Warm recall and strong rapport.',
      'Good feature-to-benefit framing.',
      'The conversation stayed relevant to the buyer context.',
    ],
    improvements: [
      'Ask one deeper family-use question.',
      'Quantify EMI comfort earlier.',
      'End with a committed next step instead of a soft follow-up.',
    ],
    nextVisitPrep: [
      'Lead with the unresolved question from the last visit.',
      'Bring the model comparison that fits the family profile.',
      'Prepare the EMI and ownership-cost breakdown.',
    ],
    researchTasks: [
      'Rehearse ACE objection handling.',
      'Review the product matching decision tree.',
      'Study the model differentiators tied to this buyer profile.',
    ],
    transcriptHighlights: [
      {
        id: 'turn-1',
        speaker: 'salesperson',
        text: `Welcome back, ${thread.customerName}. Let us pick up from your last visit and focus on what matters most.`,
        timestamp: '00:00',
      },
      {
        id: 'turn-2',
        speaker: 'customer',
        text: 'I want something family-friendly, but I still need to be careful on running cost.',
        timestamp: '00:18',
      },
      {
        id: 'turn-3',
        speaker: 'coach',
        text: 'Reconnect the recommendation to family seating, mileage, and a specific next step.',
        timestamp: '01:20',
      },
    ],
    generatedAt: new Date().toISOString(),
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
  transcript?: BackendTurn[];
  reportId?: string | null;
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
};
