export type Screen =
  | 'dashboard'
  | 'my_coach'
  | 'my_coach_recommendations'
  | 'my_coach_recording'
  | 'my_coach_processing'
  | 'my_coach_reports'
  | 'my_coach_report_detail'
  | 'my_coach_customers'
  | 'my_coach_steps'
  | 'my_coach_transcript'
  | 'catalog'
  | 'brochures'
  | 'communications'
  | 'pitch_practice'
  | 'live_scenario'
  | 'studio_config';

export type TranscriptSpeaker = 'salesperson' | 'customer' | 'system' | 'unknown';

export type CoachingGrade = 'A+' | 'A' | 'B' | 'C' | 'D';

export type SessionStatus = 'draft' | 'ready' | 'processing' | 'completed' | 'failed';

export type ProductFitVerdict = 'pass' | 'needs_review' | 'fail';

export interface CustomerThreadSummary {
  id: string;
  customerName: string;
  phone?: string | null;
  notes?: string | null;
  createdAt: string;
  updatedAt: string;
  visitCount: number;
  latestSessionTitle?: string | null;
  latestSessionAt?: string | null;
  latestGrade?: CoachingGrade | null;
  priorityLabel?: string | null;
  openLoops: string[];
}

export interface CustomerThreadDetail extends CustomerThreadSummary {
  sessions: CoachSessionSummary[];
}

export interface CoachSessionSummary {
  id: string;
  customerThreadId: string;
  title: string;
  createdAt: string;
  updatedAt: string;
  clipCount: number;
  status: SessionStatus;
  overallScore?: number | null;
  grade?: CoachingGrade | null;
  datasetLabel: string;
  reportId?: string | null;
}

export interface SessionAsset {
  id: string;
  sessionId: string;
  filename: string;
  mimeType: string;
  sizeBytes: number;
  durationSeconds?: number | null;
  source: 'recording' | 'upload';
  createdAt: string;
  audioUrl?: string | null;
}

export interface TranscriptTurn {
  id: string;
  speaker: TranscriptSpeaker;
  text: string;
  startMs: number;
  endMs: number;
  timestampLabel: string;
  confidence?: number | null;
}

export interface SpeedStageScore {
  id: string;
  label: string;
  score: number;
  weight: number;
  commentary: string;
  coveredSignals: number;
  targetSignals: number;
}

export interface QuestionCoverageItem {
  id: string;
  label: string;
  category: string;
  whyItMatters: string;
  covered: boolean;
  evidence: string;
  prompt: string;
}

export interface ObjectionReview {
  id: string;
  label: string;
  category: string;
  quote: string;
  strategyTag: string;
  coaching: string;
  resolved: boolean;
  aceApplied: {
    acknowledge: boolean;
    clarify: boolean;
    evidence: boolean;
  };
}

export interface ProductFitAssessment {
  verdict: ProductFitVerdict;
  profileLabel: string;
  recommendedModels: string[];
  mentionedModels: string[];
  reasoning: string;
  basedOn: string;
}

export interface CoachingHighlight {
  id: string;
  title: string;
  detail: string;
  timestampLabel: string;
  quote: string;
}

export interface CoachingReport {
  id: string;
  sessionId: string;
  datasetLabel: string;
  generatedAt: string;
  overallScore: number;
  grade: CoachingGrade;
  executiveSummary: string;
  speedScores: SpeedStageScore[];
  questionCoverage: QuestionCoverageItem[];
  productFit: ProductFitAssessment;
  objectionReviews: ObjectionReview[];
  strengths: CoachingHighlight[];
  improvements: CoachingHighlight[];
  nextVisitPreparation: string[];
  researchTasks: string[];
  customerProfileSummary: string;
}

export interface CoachSessionDetail extends CoachSessionSummary {
  assets: SessionAsset[];
  transcript: TranscriptTurn[];
  report?: CoachingReport | null;
}
