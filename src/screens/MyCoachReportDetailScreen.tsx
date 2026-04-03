import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { type Screen } from '../types';
import {
  clearFlowOrigin,
  listCoachReports,
  readFlowOrigin,
  readRememberedReportId,
  regenerateCoachReport,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  rememberFlowOrigin,
  type MyCoachFlowOrigin,
  type CoachReportListItem,
} from '../lib/myCoachApi';

const reportSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'next_visit', label: 'Next Visit' },
  { id: 'highlights', label: 'Highlights' },
] as const;

type ReportSectionId = (typeof reportSections)[number]['id'];

export function MyCoachReportDetailScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(readRememberedReportId());
  const [activeSection, setActiveSection] = useState<ReportSectionId>('overview');
  const [loading, setLoading] = useState(true);
  const [regeneratingSessionId, setRegeneratingSessionId] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [flowOrigin] = useState<MyCoachFlowOrigin | null>(() => readFlowOrigin());

  useEffect(() => {
    void loadReports();
  }, []);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );
  const isLiveEntry = flowOrigin === 'live_session';
  const backTarget: Screen = flowOrigin === 'report_library' ? 'my_coach_reports' : 'my_coach';
  const backLabel = flowOrigin === 'report_library' ? 'Back to Report Library' : 'Back to My Coach';

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const nextReports = await listCoachReports();
      setReports(nextReports);
      setSelectedReportId((current) => {
        const remembered = readRememberedReportId();
        return (
          (remembered && nextReports.find((report) => report.id === remembered)?.id) ||
          (current && nextReports.find((report) => report.id === current)?.id) ||
          nextReports[0]?.id ||
          null
        );
      });
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
      const nextReport = await regenerateCoachReport(report.sessionId);
      setSuccessMessage('A fresh report version has been generated.');
      rememberSelectedReportId(nextReport.id);
      setSelectedReportId(nextReport.id);
      await loadReports();
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not regenerate this report.');
    } finally {
      setRegeneratingSessionId(null);
    }
  }

  function openTranscript(report: CoachReportListItem) {
    rememberFlowOrigin(flowOrigin === 'report_library' ? 'report_library' : isLiveEntry ? 'live_session' : 'tutorial');
    rememberSelectedReportId(report.id);
    rememberSelectedThreadId(report.customerId);
    rememberSelectedSessionId(report.sessionId);
    onNavigate('my_coach_transcript');
  }

  function handleBack() {
    clearFlowOrigin();
    onNavigate(backTarget);
  }

  function getLiveEntryMotion(delay = 0) {
    return isLiveEntry
      ? {
          initial: { opacity: 0, y: 18 },
          animate: { opacity: 1, y: 0 },
          transition: { duration: 0.45, ease: 'circOut' as const, delay },
        }
      : {};
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          {backLabel}
        </button>

        {loading ? (
          <section className="rounded-[26pt] border border-dashed border-white/10 bg-surface-container-low/70 px-5 py-12 text-center text-sm text-white/48 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            Loading report...
          </section>
        ) : selectedReport ? (
          <>
            <motion.section
              {...getLiveEntryMotion()}
              className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between"
            >
              <div className="max-w-3xl">
                <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">Report</p>
                <h1 className="mt-2 font-headline text-4xl font-bold text-on-surface">{selectedReport.customerName}</h1>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-white/42">{selectedReport.sessionTitle}</p>
                {isLiveEntry ? (
                  <div className="mt-3 inline-flex rounded-full border border-primary/22 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-primary">
                    Freshly generated from live session
                  </div>
                ) : null}
              </div>

              <div className="flex flex-wrap items-center gap-3">
                <div className="rounded-full border border-secondary/24 bg-secondary/10 px-4 py-3 text-center">
                  <p className="font-headline text-2xl font-bold text-white">{selectedReport.overallScore}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-secondary">{selectedReport.grade}</p>
                </div>
                <button
                  type="button"
                  onClick={() => void handleRegenerate(selectedReport)}
                  disabled={regeneratingSessionId === selectedReport.sessionId}
                  className="rounded-full bg-secondary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-secondary-fixed disabled:opacity-55"
                  >
                  {regeneratingSessionId === selectedReport.sessionId ? 'Regenerating...' : 'Regenerate report'}
                </button>
              </div>
            </motion.section>

            <motion.section
              {...getLiveEntryMotion(0.08)}
              className="rounded-[24pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Summary</p>
              <p className="mt-3 font-headline text-2xl font-bold text-on-surface">{selectedReport.report.headline}</p>
              <p className="mt-3 text-sm leading-6 text-white/62">{selectedReport.report.summary}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip label={formatReportDate(selectedReport.generatedAt)} />
                <MetaChip label="Latest version" />
                {isLiveEntry ? <MetaChip label="Live session" /> : null}
              </div>
            </motion.section>

            <motion.section {...getLiveEntryMotion(0.14)} className="flex flex-wrap gap-2">
              {reportSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] ${
                    activeSection === section.id
                      ? 'border border-primary/24 bg-primary/12 text-primary'
                      : 'border border-white/10 bg-white/5 text-white/68'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </motion.section>

            <motion.section
              {...getLiveEntryMotion(0.2)}
              className="rounded-[26pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]"
            >
              {activeSection === 'overview' ? (
                <div className="space-y-4">
                  <PanelSection title="At a Glance">
                    <div className="grid gap-3 sm:grid-cols-3">
                      <MetricCard label="Score" value={`${selectedReport.overallScore}`} />
                      <MetricCard label="Grade" value={selectedReport.grade} />
                      <MetricCard label="Generated" value={formatReportDate(selectedReport.generatedAt)} />
                    </div>
                  </PanelSection>
                  <PanelSection title="Product Fit">
                    <InfoList items={[selectedReport.report.productFitSummary]} accent="primary" />
                  </PanelSection>
                  <PanelSection title="SPEED Scorecard">
                    <InfoList
                      items={selectedReport.report.speedStages.map((stage) => `${stage.stage}: ${stage.score} | ${stage.note}`)}
                    />
                  </PanelSection>
                </div>
              ) : activeSection === 'coaching' ? (
                <div className="space-y-4">
                  <PanelSection title="What Went Well">
                    <InfoList items={selectedReport.report.strengths} />
                  </PanelSection>
                  <PanelSection title="What to Improve">
                    <InfoList items={selectedReport.report.improvements} />
                  </PanelSection>
                  <PanelSection title="Question Coverage">
                    <InfoList items={selectedReport.report.questionCoverage} />
                  </PanelSection>
                  <PanelSection title="Objection Review">
                    <InfoList items={selectedReport.report.objectionReviews} accent="secondary" />
                  </PanelSection>
                </div>
              ) : activeSection === 'next_visit' ? (
                <div className="space-y-4">
                  <PanelSection title="Next Visit Prep">
                    <InfoList items={selectedReport.report.nextVisitPrep} accent="primary" />
                  </PanelSection>
                  <PanelSection title="Research Tasks">
                    <InfoList items={selectedReport.report.researchTasks} accent="secondary" />
                  </PanelSection>
                </div>
              ) : (
                <div className="space-y-4">
                  <div className="flex flex-col gap-3 sm:flex-row sm:items-center sm:justify-between">
                    <div>
                      <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Transcript Highlights</p>
                      <p className="mt-2 text-sm leading-6 text-white/54">
                        Keep only the most useful moments here, then open the transcript page for the full conversation.
                      </p>
                    </div>
                    <button
                      type="button"
                      onClick={() => openTranscript(selectedReport)}
                      className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/74"
                    >
                      Open Transcript
                    </button>
                  </div>

                  <div className="space-y-3">
                    {selectedReport.report.transcriptHighlights.length ? (
                      selectedReport.report.transcriptHighlights.map((turn) => (
                        <motion.div
                          key={turn.id}
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className={`max-w-[92%] rounded-[20pt] border px-4 py-3 ${
                            turn.speaker === 'salesperson'
                              ? 'ml-auto border-primary/16 bg-primary/10'
                              : turn.speaker === 'coach'
                                ? 'border-secondary/18 bg-secondary/10'
                                : 'border-white/8 bg-surface-container-high/60'
                          }`}
                        >
                          <div className="flex items-center gap-2">
                            <span className="text-[10px] uppercase tracking-[0.16em] text-white/42">{turn.speaker}</span>
                            <span className="text-[10px] uppercase tracking-[0.16em] text-white/34">{turn.timestamp}</span>
                          </div>
                          <p className="mt-2 text-sm leading-6 text-white/74">{turn.text}</p>
                        </motion.div>
                      ))
                    ) : (
                      <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/48">
                        Transcript highlights will appear here when this report includes them.
                      </div>
                    )}
                  </div>
                </div>
              )}
            </motion.section>
          </>
        ) : (
          <section className="rounded-[26pt] border border-dashed border-white/10 bg-surface-container-low/70 px-5 py-12 text-center text-sm leading-6 text-white/50 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            Open a report from the report library first.
          </section>
        )}

        {error ? (
          <Banner tone="error" text={error} />
        ) : successMessage ? (
          <Banner tone="success" text={successMessage} />
        ) : null}
      </div>
    </main>
  );
}

function PanelSection({ title, children }: { title: string; children: ReactNode }) {
  return (
    <section className="space-y-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">{title}</p>
      {children}
    </section>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18pt] border border-white/8 bg-black/14 px-4 py-4">
      <p className="font-headline text-xl font-bold text-on-surface">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/44">{label}</p>
    </div>
  );
}

function InfoList({
  items,
  accent = 'default',
}: {
  items: string[];
  accent?: 'default' | 'primary' | 'secondary';
}) {
  const accentClass =
    accent === 'primary'
      ? 'bg-primary/10 border-primary/20 text-primary'
      : accent === 'secondary'
        ? 'bg-secondary/10 border-secondary/20 text-secondary'
        : 'bg-surface-container-high/42 border-white/8 text-on-surface';

  return (
    <div className="space-y-2">
      {items.length ? (
        items.map((item) => (
          <div key={item} className={`rounded-[18pt] border px-4 py-3 text-sm leading-6 ${accentClass}`}>
            {item}
          </div>
        ))
      ) : (
        <div className="rounded-[18pt] border border-dashed border-white/10 px-4 py-6 text-sm text-white/48">No details yet.</div>
      )}
    </div>
  );
}

function MetaChip({ label }: { label: string }) {
  return (
    <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/58">
      {label}
    </span>
  );
}

function Banner({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  const toneClasses =
    tone === 'error'
      ? 'border-error/30 bg-error-container/95 text-on-error-container'
      : 'border-primary/20 bg-primary-container/90 text-on-primary-fixed';

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-full px-5 py-3 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${toneClasses}`}
    >
      {text}
    </div>
  );
}

function formatReportDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}
