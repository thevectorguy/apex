import { useEffect, useMemo, useState } from 'react';
import { type Screen } from '../types';
import { writeSearchParam } from '../lib/appRouter';
import {
  clearFlowOrigin,
  listCoachReports,
  readFlowOrigin,
  readRememberedReportId,
  regenerateCoachReport,
  rememberSelectedReportId,
  type CoachReportListItem,
} from '../lib/myCoachApi';

type SectionId = 'overview' | 'coaching' | 'verdict' | 'next_visit';

export function MyCoachReportDetailScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(readRememberedReportId());
  const [loading, setLoading] = useState(true);
  const [regeneratingSessionId, setRegeneratingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [flowOrigin] = useState(() => readFlowOrigin());

  useEffect(() => {
    void loadReports();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );
  const backTarget: Screen = flowOrigin === 'report_library' ? 'my_coach_reports' : 'my_coach';
  const backLabel = flowOrigin === 'report_library' ? 'Back to Report Library' : 'Back to My Coach';

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const nextReports = await listCoachReports();
      setReports(nextReports);
      setSelectedReportId((current) => current && nextReports.some((report) => report.id === current) ? current : nextReports[0]?.id ?? null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load the selected report.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRegenerate(report: CoachReportListItem) {
    setRegeneratingSessionId(report.sessionId);
    setError(null);
    setSuccessMessage(null);
    try {
      const refreshed = await regenerateCoachReport(report.sessionId);
      rememberSelectedReportId(refreshed.id);
      setSelectedReportId(refreshed.id);
      await loadReports();
      setSuccessMessage('A fresh report version has been generated.');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not regenerate this report.');
    } finally {
      setRegeneratingSessionId(null);
    }
  }

  function handleBack() {
    clearFlowOrigin();
    writeSearchParam('reportSection', null);
    onNavigate(backTarget);
  }

  function openSection(section: SectionId) {
    writeSearchParam('reportSection', section);
    onNavigate('my_coach_report_section');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#13253a_0%,#081018_34%,#04070c_68%,#020305_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[880px] space-y-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74 backdrop-blur"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          {backLabel}
        </button>

        {loading ? (
          <section className="rounded-[30px] border border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-white/48">
            Loading report...
          </section>
        ) : selectedReport ? (
          <>
            <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(140deg,rgba(17,28,42,0.96)_0%,rgba(9,14,21,0.94)_48%,rgba(6,9,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
              <div className="border-b border-white/8 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">My Coach Report</p>
                    <h1 className="mt-2 font-headline text-[30px] font-bold leading-none text-white sm:text-[38px]">
                      {selectedReport.customerName}
                    </h1>
                    <p className="mt-3 max-w-[36rem] text-sm leading-6 text-white/68">{selectedReport.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetaChip label={selectedReport.sessionTitle} />
                      <MetaChip label={formatReportDate(selectedReport.generatedAt)} />
                      <MetaChip label={deriveVerdictLabel(selectedReport)} />
                    </div>
                  </div>
                </div>
              </div>

              <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_260px]">
                <div className="space-y-4">
                  <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Verdict</p>
                    <p className="mt-2 font-headline text-2xl font-bold text-white">{deriveVerdictLabel(selectedReport)}</p>
                    <p className="mt-2 text-sm leading-6 text-white/62">{selectedReport.report.productFit.why}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRegenerate(selectedReport)}
                    disabled={regeneratingSessionId === selectedReport.sessionId}
                    className="inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition hover:bg-white/90 disabled:opacity-55"
                  >
                    {regeneratingSessionId === selectedReport.sessionId ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="flex items-center gap-4">
                    <ScoreBadge score={selectedReport.overallScore} grade={selectedReport.grade} />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Snapshot</p>
                      <p className="mt-2 text-sm font-semibold text-white">{selectedReport.report.drivingIndex.primaryDriver || 'Customer intent'}</p>
                      <p className="mt-2 text-sm leading-6 text-white/60">{selectedReport.report.drivingIndex.insight || 'Read the full sections below for coaching detail.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <PreviewCard
                title="Overview"
                preview={buildOverviewPreview(selectedReport)}
                cta="View full overview"
                onClick={() => openSection('overview')}
              />
              <PreviewCard
                title="Coaching"
                preview={buildCoachingPreview(selectedReport)}
                cta="View full coaching"
                onClick={() => openSection('coaching')}
              />
              <PreviewCard
                title="Verdict"
                preview={buildVerdictPreview(selectedReport)}
                cta="View verdict detail"
                onClick={() => openSection('verdict')}
              />
              <PreviewCard
                title="Next Visit"
                preview={buildNextVisitPreview(selectedReport)}
                cta="View next visit plan"
                onClick={() => openSection('next_visit')}
              />
            </section>
          </>
        ) : (
          <section className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-white/48">
            Open a report from the report library first.
          </section>
        )}

        {error ? <Banner tone="error" text={error} /> : successMessage ? <Banner tone="success" text={successMessage} /> : null}
      </div>
    </main>
  );
}

function PreviewCard({
  title,
  preview,
  cta,
  onClick,
}: {
  title: string;
  preview: string;
  cta: string;
  onClick: () => void;
}) {
  return (
    <div className="rounded-[28px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">{title}</p>
      <p className="mt-3 text-sm leading-6 text-white/66">{preview}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/78"
      >
        {cta}
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </button>
    </div>
  );
}

function ScoreBadge({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="flex h-[92px] w-[92px] items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),rgba(255,255,255,0.02))] shadow-[0_0_24px_rgba(255,255,255,0.08)]">
      <div>
        <p className="font-headline text-[28px] font-bold leading-none text-white">{score}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/44">{grade}</p>
      </div>
    </div>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/62">
      {label}
    </span>
  );
}

function buildOverviewPreview(report: CoachReportListItem) {
  const speedLead = report.report.speedStages[0];
  return `${report.report.productFitSummary}. Driving index: ${report.report.drivingIndex.primaryDriver || 'not captured'}. ${speedLead ? `${speedLead.stage} is currently at ${speedLead.score}.` : 'Open the full overview for the speed breakdown.'}`;
}

function buildCoachingPreview(report: CoachReportListItem) {
  const strength = report.report.strengths[0] || 'The report has not identified a primary strength yet.';
  const improvement = report.report.improvements[0] || 'The report has not identified a primary gap yet.';
  return `What went well: ${strength} What still needs work: ${improvement}`;
}

function buildVerdictPreview(report: CoachReportListItem) {
  return `${deriveVerdictLabel(report)}. ${report.report.productFit.why}`;
}

function buildNextVisitPreview(report: CoachReportListItem) {
  return report.report.nextVisitOpener || report.report.nextVisitPrep[0] || 'Open the next visit plan to see the recommended follow-up action.';
}

function deriveVerdictLabel(report: CoachReportListItem) {
  if (report.grade === 'A') return 'Strong conversation';
  if (report.grade === 'B') return 'Progressed well';
  if (report.grade === 'C') return 'Needs coaching follow-through';
  return 'Went cold';
}

function formatReportDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function Banner({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  const toneClasses = tone === 'error' ? 'border-[#FF6B6B]/30 bg-[#3b1618]/95 text-[#ffd5d5]' : 'border-[#39FF14]/20 bg-[#102110]/92 text-[#d7ffd0]';

  return (
    <div className={`fixed bottom-6 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-full px-5 py-3 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${toneClasses}`}>
      {text}
    </div>
  );
}
