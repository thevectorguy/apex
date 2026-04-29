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
    <main className="min-h-screen bg-[radial-gradient(circle_at_16%_0%,rgba(74,158,255,0.12),transparent_30%),radial-gradient(circle_at_92%_14%,rgba(200,169,110,0.16),transparent_28%),linear-gradient(180deg,#f8f9fc_0%,#eef2f7_58%,#f7f4ee_100%)] dark:bg-[radial-gradient(circle_at_top,#13253a_0%,#081018_34%,#04070c_68%,#020305_100%)] px-4 pb-10 pt-6 sm:px-6">
      <div className="mx-auto max-w-[880px] space-y-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 backdrop-blur hover:bg-black/10 dark:hover:bg-white/[0.1] transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          {backLabel}
        </button>

        {loading ? (
          <section className="rounded-[30px] border border-black/5 dark:border-white/10 bg-white/72 dark:bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-on-surface-variant/70 dark:text-white/48 shadow-apple-soft dark:shadow-none">
            Loading report...
          </section>
        ) : selectedReport ? (
          <>
            <section className={`overflow-hidden rounded-[30px] border shadow-[0_24px_60px_rgba(20,58,92,0.20)] dark:border-white/10 dark:bg-[linear-gradient(140deg,rgba(17,28,42,0.96)_0%,rgba(9,14,21,0.94)_48%,rgba(6,9,14,0.98)_100%)] dark:shadow-[0_28px_90px_rgba(0,0,0,0.35)] ${getReportHeroTone(selectedReport.grade)}`}>
              <div className="border-b border-white/14 dark:border-white/8 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-white/82 dark:text-[#8fb9ff]">My Coach Report</p>
                    <h1 className="mt-2 font-headline text-[30px] font-bold leading-none text-white sm:text-[38px]">
                      {selectedReport.customerName}
                    </h1>
                    <p className="mt-3 max-w-[36rem] text-sm leading-6 text-white/82 dark:text-white/68">{selectedReport.summary}</p>
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
                  <div className="rounded-[24px] border border-white/16 dark:border-white/8 bg-white/16 dark:bg-white/[0.03] p-4 shadow-[inset_0_1px_0_rgba(255,255,255,0.14)] dark:shadow-none">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/72 dark:text-white/42">Verdict</p>
                    <p className="mt-2 font-headline text-2xl font-bold text-white">{deriveVerdictLabel(selectedReport)}</p>
                    <p className="mt-2 text-sm leading-6 text-white/78 dark:text-white/62">{selectedReport.report.productFit.why}</p>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRegenerate(selectedReport)}
                    disabled={regeneratingSessionId === selectedReport.sessionId}
                    className="inline-flex w-full items-center justify-center rounded-full border border-white/35 dark:border-transparent bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-[#17202c] dark:text-black transition hover:bg-white/90 disabled:opacity-55 shadow-[0_12px_24px_rgba(0,0,0,0.14)] dark:shadow-none"
                  >
                    {regeneratingSessionId === selectedReport.sessionId ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>

                <div className="rounded-[28px] border border-white/16 dark:border-white/10 bg-black/10 dark:bg-white/[0.04] p-4 backdrop-blur">
                  <div className="flex items-center gap-4">
                    <ScoreBadge score={selectedReport.overallScore} grade={selectedReport.grade} />
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-white/70 dark:text-white/42">Snapshot</p>
                      <p className="mt-2 text-sm font-semibold text-white">{selectedReport.report.drivingIndex.primaryDriver || 'Customer intent'}</p>
                      <p className="mt-2 text-sm leading-6 text-white/74 dark:text-white/60">{selectedReport.report.drivingIndex.insight || 'Read the full sections below for coaching detail.'}</p>
                    </div>
                  </div>
                </div>
              </div>
            </section>

            <section className="space-y-4">
              <PreviewCard
                section="overview"
                title="Overview"
                preview={buildOverviewPreview(selectedReport)}
                cta="View full overview"
                grade={selectedReport.grade}
                onClick={() => openSection('overview')}
              />
              <PreviewCard
                section="coaching"
                title="Coaching"
                preview={buildCoachingPreview(selectedReport)}
                cta="View full coaching"
                grade={selectedReport.grade}
                onClick={() => openSection('coaching')}
              />
              <PreviewCard
                section="verdict"
                title="Verdict"
                preview={buildVerdictPreview(selectedReport)}
                cta="View verdict detail"
                grade={selectedReport.grade}
                onClick={() => openSection('verdict')}
              />
              <PreviewCard
                section="next_visit"
                title="Next Visit"
                preview={buildNextVisitPreview(selectedReport)}
                cta="View next visit plan"
                grade={selectedReport.grade}
                onClick={() => openSection('next_visit')}
              />
            </section>
          </>
        ) : (
          <section className="rounded-[30px] border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-on-surface-variant/60 dark:text-white/48">
            Open a report from the report library first.
          </section>
        )}

        {error ? <Banner tone="error" text={error} /> : successMessage ? <Banner tone="success" text={successMessage} /> : null}
      </div>
    </main>
  );
}

function PreviewCard({
  section,
  title,
  preview,
  cta,
  grade,
  onClick,
}: {
  section: SectionId;
  title: string;
  preview: string;
  cta: string;
  grade: string;
  onClick: () => void;
}) {
  const toneClasses = getPreviewCardTone(section, grade);

  return (
    <div className={`rounded-[28px] border p-5 shadow-[0_18px_42px_rgba(31,41,55,0.16),inset_0_1px_0_rgba(255,255,255,0.22)] ${toneClasses}`}>
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/88 dark:text-[#8fb9ff]">{title}</p>
      <p className="mt-3 text-sm font-medium leading-6 text-white/88 dark:text-white/66">{preview}</p>
      <button
        type="button"
        onClick={onClick}
        className="mt-4 inline-flex items-center gap-2 rounded-full border border-white/20 bg-white/18 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white hover:bg-white/24 transition-colors"
      >
        {cta}
        <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
      </button>
    </div>
  );
}

function getReportHeroTone(grade: string) {
  if (grade === 'A') {
    return 'border-[#28a94f]/45 bg-[linear-gradient(135deg,#0b7a3f_0%,#34c759_62%,#179a70_100%)]';
  }
  if (grade === 'B') {
    return 'border-[#4a9eff]/42 bg-[linear-gradient(135deg,#174a88_0%,#2e7fce_54%,#20a6c8_100%)]';
  }
  if (grade === 'C') {
    return 'border-[#ff9f0a]/45 bg-[linear-gradient(135deg,#9f4e05_0%,#ff9f0a_60%,#c8a96e_100%)]';
  }
  return 'border-[#ff453a]/45 bg-[linear-gradient(135deg,#8e1f1a_0%,#ff453a_62%,#c13a2f_100%)]';
}

function getPreviewCardTone(section: SectionId, grade: string) {
  if (section === 'overview') {
    return 'border-[#5c8fce]/55 bg-[linear-gradient(135deg,#355f99_0%,#547eb7_58%,#6d9fcb_100%)]';
  }
  if (section === 'coaching') {
    return 'border-[#c79c51]/58 bg-[linear-gradient(135deg,#7b5c24_0%,#aa8340_58%,#d1ad70_100%)]';
  }
  if (section === 'next_visit') {
    return 'border-[#4eafaa]/56 bg-[linear-gradient(135deg,#2e716f_0%,#43928f_54%,#6bbab4_100%)]';
  }
  return getVerdictCardTone(grade);
}

function getVerdictCardTone(grade: string) {
  if (grade === 'A') {
    return 'border-[#39a85c]/58 bg-[linear-gradient(135deg,#246f3e_0%,#2f8a4c_58%,#58b976_100%)]';
  }
  if (grade === 'B') {
    return 'border-[#5f8fc8]/56 bg-[linear-gradient(135deg,#466a98_0%,#5b82af_58%,#7ea6c9_100%)]';
  }
  if (grade === 'C') {
    return 'border-[#cf9850]/58 bg-[linear-gradient(135deg,#7e5723_0%,#a97938_58%,#d6aa69_100%)]';
  }
  return 'border-[#c96961]/56 bg-[linear-gradient(135deg,#7e302b_0%,#a6463f_58%,#cf7269_100%)]';
}

function ScoreBadge({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="flex h-20 min-w-14 flex-none items-center justify-center rounded-full border border-white/10 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.14),rgba(255,255,255,0.02))] px-2 shadow-[0_0_24px_rgba(255,255,255,0.08)] sm:min-w-16">
      <div className="flex flex-col items-center text-center">
        <p className="font-headline text-[28px] font-bold leading-none text-white tabular-nums">{score}</p>
        <p className="mt-1 text-xs font-bold uppercase leading-none tracking-normal text-white/50">{grade}</p>
      </div>
    </div>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/16 dark:border-white/10 bg-white/14 dark:bg-white/[0.06] px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/78 dark:text-white/62">
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
