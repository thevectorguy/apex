import { useEffect, useMemo, useRef, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { type Screen } from '../types';
import {
  clearFlowOrigin,
  getTranscriptUnavailableMessage,
  hasUsableTranscript,
  listCoachReports,
  readFlowOrigin,
  readRememberedReportId,
  regenerateCoachReport,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  type CoachAdviceItem,
  type CoachReportListItem,
  type ProductFitReview,
  type SpeedStageScore,
  type TranscriptTurn,
  type TurningPoint,
} from '../lib/myCoachApi';
import { SkeletonCircle, SkeletonLine } from '../components/Skeleton';

const reportSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'verdict', label: 'Verdict' },
  { id: 'next_visit', label: 'Next Visit' },
  { id: 'highlights', label: 'Highlights' },
  { id: 'extras', label: 'Extras' },
] as const;

const verdictViews = [
  { id: 'product_fit', label: 'Product Fit' },
  { id: 'coaching_advice', label: 'Coaching Advice' },
] as const;

type ReportSectionId = (typeof reportSections)[number]['id'];
type VerdictViewId = (typeof verdictViews)[number]['id'];

type VerdictBadge = {
  label: string;
  textClass: string;
  surfaceClass: string;
  ringClass: string;
};

export function MyCoachReportDetailScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(readRememberedReportId());
  const [activeSection, setActiveSection] = useState<ReportSectionId>('overview');
  const [activeVerdictView, setActiveVerdictView] = useState<VerdictViewId>('product_fit');
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

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );

  const transcriptUnavailable = selectedReport ? !hasUsableTranscript(selectedReport.report.transcriptHighlights) : false;
  const isLiveEntry = flowOrigin === 'live_session';
  const backTarget: Screen = flowOrigin === 'report_library' ? 'my_coach_reports' : 'my_coach';
  const backLabel = flowOrigin === 'report_library' ? 'Back to Report Library' : 'Back to My Coach';
  const verdictBadge = useMemo(() => (selectedReport ? deriveVerdictBadge(selectedReport.report) : null), [selectedReport]);
  const talkRatio = useMemo(
    () => (selectedReport ? computeTalkRatio(selectedReport.report.transcriptHighlights) : null),
    [selectedReport],
  );

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
          transition: { duration: 0.42, ease: 'circOut' as const, delay },
        }
      : {};
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#13253a_0%,#081018_34%,#04070c_68%,#020305_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[980px] space-y-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74 backdrop-blur"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          {backLabel}
        </button>

        {loading ? (
          <ReportDetailSkeleton />
        ) : selectedReport ? (
          <>
            <motion.section
              {...getLiveEntryMotion()}
              className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(140deg,rgba(17,28,42,0.96)_0%,rgba(9,14,21,0.94)_48%,rgba(6,9,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.35)]"
            >
              <div className="border-b border-white/8 px-5 py-5 sm:px-6">
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">My Coach Report</p>
                    <h1 className="mt-2 font-headline text-[30px] font-bold leading-none text-white sm:text-[38px]">
                      {selectedReport.customerName}
                    </h1>
                    <p className="mt-3 max-w-[36rem] text-sm leading-6 text-white/62">{selectedReport.report.summary}</p>
                    <div className="mt-4 flex flex-wrap gap-2">
                      <MetaChip label={selectedReport.sessionTitle} />
                      <MetaChip label={formatReportDate(selectedReport.generatedAt)} />
                      <MetaChip label={selectedReport.report.sourceNote} subtle />
                      {isLiveEntry ? <MetaChip label="Live session" /> : null}
                    </div>
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRegenerate(selectedReport)}
                    disabled={regeneratingSessionId === selectedReport.sessionId}
                    className="hidden rounded-full bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition hover:bg-white/90 disabled:opacity-55 sm:inline-flex"
                  >
                    {regeneratingSessionId === selectedReport.sessionId ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </div>

              <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_290px]">
                <div className="space-y-5">
                  {transcriptUnavailable ? (
                    <SurfaceBlock eyebrow="Transcript unavailable" title="Coaching still loaded" muted>
                      <p>{getTranscriptUnavailableMessage()}</p>
                      <p className="mt-2 text-white/48">
                        The structured report is still available, but quoted highlights and transcript replay are limited for this session.
                      </p>
                    </SurfaceBlock>
                  ) : null}
                </div>

                <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
                  <div className="flex items-center gap-3">
                    <ScoreOrb score={selectedReport.overallScore} grade={selectedReport.grade} />
                    {verdictBadge ? <VerdictPill badge={verdictBadge} /> : null}
                  </div>

                  <div className="mt-4 grid grid-cols-2 gap-3">
                    <MiniMetric label="Questions" value={String(selectedReport.report.questionCoverageItems.length)} />
                    <MiniMetric label="Advice" value={String(selectedReport.report.coachAdvice.length)} />
                    <MiniMetric label="Objections" value={String(selectedReport.report.objections.length)} />
                    <MiniMetric label="Highlights" value={String(selectedReport.report.transcriptHighlights.length)} />
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleRegenerate(selectedReport)}
                    disabled={regeneratingSessionId === selectedReport.sessionId}
                    className="mt-4 inline-flex w-full items-center justify-center rounded-full bg-white px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-black transition hover:bg-white/90 disabled:opacity-55 sm:hidden"
                  >
                    {regeneratingSessionId === selectedReport.sessionId ? 'Regenerating...' : 'Regenerate'}
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.section {...getLiveEntryMotion(0.06)} className="overflow-x-auto hide-scrollbar pb-1">
              <div className="flex min-w-max gap-2">
                {reportSections.map((section) => (
                  <button
                    key={section.id}
                    type="button"
                    onClick={() => setActiveSection(section.id)}
                    className={`rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                      activeSection === section.id
                        ? 'border-white/18 bg-white text-black'
                        : 'border-white/10 bg-white/[0.05] text-white/68'
                    }`}
                  >
                    {section.label}
                  </button>
                ))}
              </div>
            </motion.section>

            <motion.section
              key={activeSection}
              {...getLiveEntryMotion(0.12)}
              className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-6"
            >
              {activeSection === 'overview' ? (
                <OverviewTab report={selectedReport.report} />
              ) : activeSection === 'coaching' ? (
                <CoachingTab report={selectedReport.report} />
              ) : activeSection === 'verdict' ? (
                <VerdictTab report={selectedReport.report} activeView={activeVerdictView} onChangeView={setActiveVerdictView} />
              ) : activeSection === 'next_visit' ? (
                <NextVisitTab report={selectedReport.report} />
              ) : activeSection === 'highlights' ? (
                <HighlightsTab
                  report={selectedReport.report}
                  transcriptUnavailable={transcriptUnavailable}
                  onOpenTranscript={() => openTranscript(selectedReport)}
                />
              ) : (
                <ExtrasTab report={selectedReport.report} talkRatio={talkRatio} />
              )}
            </motion.section>
          </>
        ) : (
          <EmptyState text="Open a report from the report library first." />
        )}

        {error ? <Banner tone="error" text={error} /> : successMessage ? <Banner tone="success" text={successMessage} /> : null}
      </div>
    </main>
  );
}

function OverviewTab({ report }: { report: CoachReportListItem['report'] }) {
  const [speedBreakdownRef, shouldAnimateSpeedBreakdown] = useOneTimeInView<HTMLDivElement>();
  const customerPreferred = splitPipeValue(report.productFit.customerPreferred);

  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Overview" title="One clean read on the conversation">
      </SectionIntro>

      <div className="space-y-4">
        <SurfaceBlock eyebrow="Product Fit" title={report.productFitSummary}>
          <p className="text-sm leading-6 text-white/60">{report.productFit.why}</p>
          {report.productFit.customerPreferred ? (
            <InlineNote
              label="Customer preferred"
              value={customerPreferred.head}
              detail={customerPreferred.detail}
            />
          ) : null}
        </SurfaceBlock>

        <SurfaceBlock
          eyebrow="Driving Index"
          title={report.drivingIndex.primaryDriver}
        >
          <p className="text-sm leading-6 text-white/60">
            {report.drivingIndex.insight || 'Primary motivation from the latest conversation.'}
          </p>
        </SurfaceBlock>
      </div>

      <div ref={speedBreakdownRef} className="space-y-3">
        <SectionLabel>Speed Breakdown</SectionLabel>
        <div className="space-y-3">
          {report.speedStages.map((stage, index) => (
            <SpeedStageCard key={stage.stage} stage={stage} index={index} shouldAnimate={shouldAnimateSpeedBreakdown} />
          ))}
        </div>
      </div>
    </div>
  );
}

function CoachingTab({ report }: { report: CoachReportListItem['report'] }) {
  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Coaching" title="What landed and what still needs work">
        The coaching tab keeps the feedback practical: strengths, gaps, questions, and objections.
      </SectionIntro>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceBlock eyebrow="What Went Well" title={`${report.strengths.length} strengths`}>
          <div className="space-y-2">
            {report.strengths.length ? report.strengths.map((item) => <SimpleLine key={item} text={item} tone="positive" />) : <MutedFallback text="No strengths were returned for this report." />}
          </div>
        </SurfaceBlock>

        <SurfaceBlock eyebrow="What To Improve" title={`${report.improvements.length} focus areas`}>
          <div className="space-y-2">
            {report.improvements.length ? report.improvements.map((item) => <SimpleLine key={item} text={item} tone="warning" />) : <MutedFallback text="No improvement areas were returned for this report." />}
          </div>
        </SurfaceBlock>
      </div>

      <div className="space-y-3">
        <SectionLabel>Questions ({report.questionCoverageItems.length})</SectionLabel>
        {report.questionCoverageItems.length ? (
          <div className="space-y-3">
            {report.questionCoverageItems.map((item) => (
              <StatusCard
                key={`${item.id}-${item.question}`}
                tone={item.status === 'COVERED' ? 'green' : item.status === 'PARTIALLY' ? 'amber' : 'coral'}
                eyebrow={item.status.replace('_', ' ')}
                title={item.question}
                detail={item.evidence}
              />
            ))}
          </div>
        ) : (
          <MutedFallback text="Question coverage will appear here when the report includes relevant discovery prompts." />
        )}
      </div>

      <div className="space-y-3">
        <SectionLabel>Objections ({report.objections.length})</SectionLabel>
        {report.objections.length ? (
          <div className="space-y-3">
            {report.objections.map((item) => (
              <StatusCard
                key={`${item.label}-${item.handled}`}
                tone={item.handled === 'HANDLED' ? 'green' : item.handled === 'PARTIALLY' ? 'amber' : 'coral'}
                eyebrow={item.category}
                title={item.label}
                detail={item.how || item.strategy}
                aside={item.advice}
              />
            ))}
          </div>
        ) : (
          <MutedFallback text="No objection review was returned for this report." />
        )}
      </div>
    </div>
  );
}

function VerdictTab({
  report,
  activeView,
  onChangeView,
}: {
  report: CoachReportListItem['report'];
  activeView: VerdictViewId;
  onChangeView: (view: VerdictViewId) => void;
}) {
  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Verdict" title="Outcome clarity, then coaching depth">
        This tab separates product-fit judgment from the mentor-style advice that should shape the next attempt.
      </SectionIntro>

      <div className="flex flex-wrap gap-2">
        {verdictViews.map((view) => (
          <button
            key={view.id}
            type="button"
            onClick={() => onChangeView(view.id)}
            className={`rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
              activeView === view.id ? 'border-white/18 bg-white text-black' : 'border-white/10 bg-white/[0.05] text-white/68'
            }`}
          >
            {view.label}
            {view.id === 'coaching_advice' ? ` (${report.coachAdvice.length})` : ''}
          </button>
        ))}
      </div>

      {activeView === 'product_fit' ? <ProductFitView report={report} /> : <CoachAdviceView coachAdvice={report.coachAdvice} />}
    </div>
  );
}

function ProductFitView({ report }: { report: CoachReportListItem['report'] }) {
  const productFit = report.productFit;
  const closureOutcome = deriveVerdictBadge(report);
  const primaryFitValue =
    productFit.idealMatch ||
    productFit.recommendedModel ||
    productFit.salesmanPick ||
    productFit.customerPreferred;
  const primaryModel = splitPipeValue(primaryFitValue);
  const preferred = splitPipeValue(productFit.customerPreferred);
  const salesmanPick = splitPipeValue(productFit.salesmanPick);
  const idealMatch = splitPipeValue(productFit.idealMatch);
  const pitchMismatch = Boolean(
    productFit.salesmanPick && productFit.idealMatch && normalizeKey(salesmanPick.head) !== normalizeKey(idealMatch.head),
  );
  const showCustomerPreferred = Boolean(
    productFit.customerPreferred &&
      (closureOutcome.label !== 'Sale Closed' || normalizeKey(preferred.head) !== normalizeKey(primaryModel.head)),
  );
  const showSalesmanPick = Boolean(
    productFit.salesmanPick && normalizeKey(salesmanPick.head) !== normalizeKey(primaryModel.head),
  );
  const showIdealMatch = Boolean(
    productFit.idealMatch && normalizeKey(idealMatch.head) !== normalizeKey(primaryModel.head),
  );
  const avoidModels = productFit.avoidModels.slice(0, 2);
  const fitNarrative = deriveProductFitNarrative(report, closureOutcome.label);

  return (
    <div className="space-y-5">
      <SurfaceBlock eyebrow="Product Fit" title={primaryModel.head}>
        <p className="text-sm leading-6 text-white/60">{fitNarrative}</p>
      </SurfaceBlock>

      <div className="space-y-3">
        <SectionLabel>Pitched Models</SectionLabel>
        <div className="flex flex-wrap gap-2">
          {productFit.pitchedModels.length ? productFit.pitchedModels.map((model) => <MetaChip key={model} label={model} />) : <MutedFallback text="No pitched models were captured." />}
        </div>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        {showSalesmanPick ? (
          <SurfaceBlock eyebrow={pitchMismatch ? 'Salesman pick - mismatch' : 'Salesman pick'} title={salesmanPick.head} tone={pitchMismatch ? 'warning' : 'default'}>
            <p className="text-sm leading-6 text-white/60">{salesmanPick.detail || 'This is the model that received most of the sales energy.'}</p>
          </SurfaceBlock>
        ) : null}

        {showCustomerPreferred ? (
          <SurfaceBlock eyebrow="Customer choice" title={preferred.head}>
            <p className="text-sm leading-6 text-white/60">{preferred.detail || 'This is the option the customer gravitated toward during the conversation.'}</p>
          </SurfaceBlock>
        ) : null}

        {showIdealMatch ? (
          <SurfaceBlock eyebrow="Ideal match" title={idealMatch.head} tone={pitchMismatch ? 'warning' : 'default'}>
            <p className="text-sm leading-6 text-white/60">{idealMatch.detail || 'This is the coach-selected best-fit model.'}</p>
          </SurfaceBlock>
        ) : null}
      </div>

      {avoidModels.length ? (
        <div className="space-y-3">
          <SectionLabel>Avoid</SectionLabel>
          <div className="grid gap-4 lg:grid-cols-2">
            {avoidModels.map((item, index) => (
              <SurfaceBlock key={`${item.model}-${index}`} eyebrow="Poor fit to avoid" title={item.model} tone="warning">
                <p className="text-sm leading-6 text-white/60">{item.rationale}</p>
                {item.evidence.length ? (
                  <div className="mt-4 space-y-2">
                    <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Evidence</p>
                    {item.evidence.map((point) => (
                      <SimpleLine key={point} text={point} tone="neutral" />
                    ))}
                  </div>
                ) : null}
              </SurfaceBlock>
            ))}
          </div>
        </div>
      ) : null}
    </div>
  );
}

function CoachAdviceView({ coachAdvice }: { coachAdvice: CoachAdviceItem[] }) {
  if (!coachAdvice.length) {
    return <MutedFallback text="Coaching advice will appear here when the report returns mentor-style feedback." />;
  }

  return (
    <div className="space-y-3">
      {coachAdvice.map((item, index) => (
        <motion.div key={`${item.title}-${index}`} initial={{ opacity: 0, y: 10 }} animate={{ opacity: 1, y: 0 }} transition={{ delay: index * 0.04, duration: 0.26 }}>
          <StatusCard
            tone={item.priority === 'high' ? 'coral' : item.priority === 'medium' ? 'amber' : 'green'}
            eyebrow={item.priority}
            title={item.title}
            detail={item.detail}
          />
        </motion.div>
      ))}
    </div>
  );
}

function NextVisitTab({ report }: { report: CoachReportListItem['report'] }) {
  const nextVisitSignal = deriveNextVisitSignal(report);

  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Next Visit" title="Prepare the re-entry before the customer returns">
        This tab should answer two things clearly: how likely the customer is to return and how you should handle that return when it happens.
      </SectionIntro>

      <SurfaceBlock eyebrow="Next Visit Signal" title={nextVisitSignal.title} tone={nextVisitSignal.tone}>
        <p className="text-sm leading-7 text-white/72">{nextVisitSignal.summary}</p>
        <div className="mt-4 rounded-[18px] border border-white/8 bg-black/18 px-4 py-4">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Approach If They Return</p>
          <p className="mt-2 text-sm leading-7 text-white/72">{nextVisitSignal.approach}</p>
        </div>
      </SurfaceBlock>

      <SurfaceBlock eyebrow="Opening Script" title={report.nextVisitOpener ? 'Ready to use' : 'Need more context'}>
        <p className="text-sm leading-7 text-white/72">{report.nextVisitOpener || 'No personalized opener was returned for this session yet.'}</p>
      </SurfaceBlock>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceBlock eyebrow="Prep Checklist" title={`${report.nextVisitPrep.length} items`}>
          <div className="space-y-2">
            {report.nextVisitPrep.length ? report.nextVisitPrep.map((item) => <ChecklistLine key={item} text={item} />) : <MutedFallback text="No prep checklist was returned for this report." />}
          </div>
        </SurfaceBlock>

        <SurfaceBlock eyebrow="Research Tasks" title={`${report.researchTasks.length} tasks`}>
          <div className="space-y-2">
            {report.researchTasks.length ? report.researchTasks.map((item) => <SimpleLine key={item} text={item} tone="neutral" />) : <MutedFallback text="No research tasks were returned for this report." />}
          </div>
        </SurfaceBlock>
      </div>
    </div>
  );
}

function HighlightsTab({
  report,
  transcriptUnavailable,
  onOpenTranscript,
}: {
  report: CoachReportListItem['report'];
  transcriptUnavailable: boolean;
  onOpenTranscript: () => void;
}) {
  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Highlights" title="Replay the moments that shaped the visit">
        This is the conversation layer: fast transcript scanning here, full replay in the transcript screen.
      </SectionIntro>

      <div className="flex flex-col gap-3 rounded-[26px] border border-white/10 bg-white/[0.03] px-4 py-4 sm:flex-row sm:items-center sm:justify-between">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Transcript View</p>
          <p className="mt-2 text-sm leading-6 text-white/60">
            Keep this screen focused on the most useful moments, then jump to the full transcript when you need context.
          </p>
        </div>
        <button
          type="button"
          onClick={onOpenTranscript}
          className="inline-flex items-center justify-center rounded-full border border-white/10 bg-white/[0.06] px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/78"
        >
          Open Transcript
        </button>
      </div>

      <div className="space-y-3">
        {report.transcriptHighlights.length ? (
          report.transcriptHighlights.map((turn, index) => (
            <motion.div
              key={turn.id}
              initial={{ opacity: 0, y: 8 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ delay: index * 0.02, duration: 0.24 }}
              className={`rounded-[24px] border px-4 py-4 ${
                turn.speaker === 'salesperson'
                  ? 'border-[#8fb9ff]/18 bg-[#8fb9ff]/8'
                  : turn.speaker === 'coach'
                    ? 'border-[#FFB800]/20 bg-[#FFB800]/10'
                    : 'border-white/8 bg-white/[0.03]'
              }`}
            >
              <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42">
                <span>{turn.speaker}</span>
                <span>{turn.timestamp}</span>
              </div>
              <p className="mt-3 text-sm leading-6 text-white/74">{turn.text}</p>
            </motion.div>
          ))
        ) : (
          <MutedFallback text={transcriptUnavailable ? 'No transcript highlights were returned for this session.' : 'Transcript highlights will appear here when the report includes them.'} />
        )}
      </div>
    </div>
  );
}

function ExtrasTab({
  report,
  talkRatio,
}: {
  report: CoachReportListItem['report'];
  talkRatio: ReturnType<typeof computeTalkRatio> | null;
}) {
  return (
    <div className="space-y-6">
      <SectionIntro eyebrow="Extras" title="Signals, experiments, and pitchable ideas">
        This tab mixes live report signals with concept cards that help pitch the next version of the product.
      </SectionIntro>

      <div className="grid gap-4 lg:grid-cols-2">
        <SurfaceBlock eyebrow="Talk-to-Listen Ratio" title={talkRatio ? `${talkRatio.salesShare}% / ${talkRatio.customerShare}%` : 'Awaiting transcript'}>
          <div className="mt-1 h-3 overflow-hidden rounded-full bg-white/[0.06]">
            <div className="h-full rounded-full bg-[linear-gradient(90deg,#8fb9ff_0%,#39FF14_100%)]" style={{ width: `${talkRatio?.salesShare || 0}%` }} />
          </div>
          <p className="mt-3 text-sm leading-6 text-white/60">{talkRatio ? `${talkRatio.summary}.` : 'A fuller transcript is needed to compute the share of talk time.'}</p>
        </SurfaceBlock>

        <SurfaceBlock eyebrow="Customer Sentiment" title={`${report.customerSentiment.start} -> ${report.customerSentiment.end}`}>
          <p className="text-sm leading-6 text-white/60">{report.customerSentiment.shift}</p>
        </SurfaceBlock>
      </div>

      <div className="grid gap-4 lg:grid-cols-[1.1fr_0.9fr]">
        <SurfaceBlock eyebrow="Turning Points" title={`${report.turningPoints.length} moments`}>
          <div className="space-y-3">
            {report.turningPoints.length ? report.turningPoints.map((point, index) => <TurningPointLine key={`${point.title}-${index}`} point={point} />) : <MutedFallback text="Turning points will appear here when the report identifies them." />}
          </div>
        </SurfaceBlock>

        <SurfaceBlock eyebrow="Follow-up Message" title={report.followUpMessage ? 'Ready to send' : 'No message yet'}>
          <p className="text-sm leading-7 text-white/72">
            {report.followUpMessage || 'A ready-to-send WhatsApp or SMS follow-up will appear here when the report includes it.'}
          </p>
        </SurfaceBlock>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <ConceptCard title="Win Probability" value="Concept" detail="A likely-to-return score can sit here once conversion feedback loops are wired in." />
        <ConceptCard title="Competitor Intel" value="Concept" detail="Use this space for side-by-side competitor context whenever rival brands come up in the showroom." />
        <ConceptCard title="Session Replay" value="Concept" detail="Timestamped replay markers can turn the transcript into a guided coaching review." />
      </div>
    </div>
  );
}

function SectionIntro({ eyebrow, title, children }: { eyebrow: string; title: string; children?: ReactNode }) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">{eyebrow}</p>
      <h2 className="mt-2 font-headline text-[28px] font-bold leading-tight text-white">{title}</h2>
      {children ? <p className="mt-3 max-w-[42rem] text-sm leading-6 text-white/58">{children}</p> : null}
    </div>
  );
}

function SurfaceBlock({
  eyebrow,
  title,
  children,
  tone = 'default',
  muted = false,
}: {
  eyebrow: string;
  title: string;
  children: ReactNode;
  tone?: 'default' | 'positive' | 'warning';
  muted?: boolean;
}) {
  const toneClass =
    tone === 'positive'
      ? 'border-[#39FF14]/18 bg-[#39FF14]/7'
      : tone === 'warning'
        ? 'border-[#FFB800]/18 bg-[#FFB800]/8'
        : muted
          ? 'border-white/10 bg-white/[0.04]'
          : 'border-white/8 bg-white/[0.03]';

  return (
    <section className={`rounded-[26px] border px-4 py-4 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{eyebrow}</p>
      <h3 className="mt-2 font-headline text-xl font-bold text-white">{title}</h3>
      <div className="mt-3 text-sm leading-6 text-white/68">{children}</div>
    </section>
  );
}

function SpeedStageCard({
  stage,
  index,
  shouldAnimate,
}: {
  stage: SpeedStageScore;
  index: number;
  shouldAnimate: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Stage</p>
          <p className="mt-1 font-headline text-lg text-white">{stage.stage}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Score</p>
          <AnimatedNumber
            value={stage.score}
            className="mt-1 block font-headline text-2xl text-white"
            delay={0.1 + index * 0.05}
            animate={shouldAnimate}
          />
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] shadow-[0_0_18px_rgba(164,182,204,0.22)]"
          initial={{ width: 0, x: '-6%' }}
          animate={shouldAnimate ? { width: `${stage.score}%`, x: 0 } : { width: 0, x: '-6%' }}
          transition={
            shouldAnimate
              ? {
                  delay: 0.14 + index * 0.05,
                  duration: 0.85,
                  ease: [0.22, 1, 0.36, 1],
                }
              : { duration: 0 }
          }
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-white/58">{stage.note}</p>
    </div>
  );
}

function AnimatedNumber({
  value,
  className,
  delay = 0,
  animate = true,
}: {
  value: number;
  className?: string;
  delay?: number;
  animate?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(0);
      return;
    }

    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const duration = 850;
    const startValue = 0;

    const tick = (startTime: number) => {
      const step = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(startValue + (value - startValue) * eased));
        if (progress < 1) frameId = window.requestAnimationFrame(step);
      };

      frameId = window.requestAnimationFrame(step);
    };

    timeoutId = setTimeout(() => tick(performance.now()), delay * 1000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [animate, delay, value]);

  return <span className={className}>{displayValue}</span>;
}

function useOneTimeInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);

  useEffect(() => {
    const node = ref.current;
    if (!node || hasEnteredView) return;

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setHasEnteredView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting || entry.intersectionRatio > 0.16) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      { threshold: [0.16], rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [hasEnteredView]);

  return [ref, hasEnteredView] as const;
}

function PosterMetric({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[26px] border border-white/10 bg-white/[0.04] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-3 font-headline text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/58">{detail}</p>
    </div>
  );
}

function ScoreOrb({ score, grade }: { score: number; grade: string }) {
  return (
    <div className="grid h-[92px] w-[92px] place-items-center rounded-full border border-white/14 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.18)_0%,rgba(255,255,255,0.06)_28%,rgba(255,255,255,0.02)_100%)] text-center shadow-[inset_0_1px_18px_rgba(255,255,255,0.08)]">
      <div>
        <p className="font-headline text-[28px] font-bold leading-none text-white">{score}</p>
        <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/44">{grade}</p>
      </div>
    </div>
  );
}

function VerdictPill({ badge }: { badge: VerdictBadge }) {
  return (
    <div className={`rounded-full border px-4 py-3 shadow-[0_0_24px_rgba(255,255,255,0.08)] ${badge.surfaceClass} ${badge.ringClass}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Verdict</p>
      <p className={`mt-1 font-headline text-lg font-bold ${badge.textClass}`}>{badge.label}</p>
    </div>
  );
}

function MiniMetric({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-black/18 px-3 py-3">
      <p className="font-headline text-xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
    </div>
  );
}

function StatusCard({
  tone,
  eyebrow,
  title,
  detail,
  aside,
}: {
  tone: 'green' | 'amber' | 'coral';
  eyebrow: string;
  title: string;
  detail?: string | null;
  aside?: string | null;
}) {
  const toneClass = tone === 'green' ? 'border-l-[#39FF14]' : tone === 'amber' ? 'border-l-[#FFB800]' : 'border-l-[#FF6B6B]';

  return (
    <div className={`rounded-[24px] border border-white/8 border-l-4 bg-white/[0.03] px-4 py-4 ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{eyebrow}</p>
      <p className="mt-2 font-headline text-lg font-bold text-white">{title}</p>
      {detail ? <p className="mt-2 text-sm leading-6 text-white/60">{detail}</p> : null}
      {aside ? <div className="mt-3 rounded-[18px] border border-white/8 bg-black/16 px-3 py-3 text-sm leading-6 text-white/72">{aside}</div> : null}
    </div>
  );
}

function ChecklistLine({ text }: { text: string }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-white/8 bg-black/14 px-3 py-3">
      <span className="mt-1 inline-flex h-5 w-5 items-center justify-center rounded-full border border-[#39FF14]/30 text-[11px] text-[#39FF14]">+</span>
      <p className="text-sm leading-6 text-white/72">{text}</p>
    </div>
  );
}

function SimpleLine({ text, tone }: { text: string; tone: 'positive' | 'warning' | 'neutral' }) {
  const bulletTone = tone === 'positive' ? 'bg-[#39FF14]' : tone === 'warning' ? 'bg-[#FFB800]' : 'bg-white/36';

  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-white/8 bg-black/14 px-3 py-3">
      <span className={`mt-2 h-2.5 w-2.5 rounded-full ${bulletTone}`} />
      <p className="text-sm leading-6 text-white/72">{text}</p>
    </div>
  );
}

function TurningPointLine({ point }: { point: TurningPoint }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-black/14 px-3 py-3">
      <div className="flex items-center gap-2 text-[10px] uppercase tracking-[0.16em] text-white/40">
        <span>{point.title}</span>
        {point.timestamp ? <span>{point.timestamp}</span> : null}
      </div>
      <p className="mt-2 text-sm leading-6 text-white/72">{point.detail}</p>
    </div>
  );
}

function ConceptCard({ title, value, detail }: { title: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-dashed border-white/12 bg-white/[0.02] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{title}</p>
      <p className="mt-3 font-headline text-2xl font-bold text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/54">{detail}</p>
    </div>
  );
}

function InlineNote({ label, value, detail }: { label: string; value: string; detail?: string }) {
  return (
    <div className="mt-4 rounded-[18px] border border-white/8 bg-black/16 px-3 py-3">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{label}</p>
      <p className="mt-2 text-sm leading-6 text-white/72">{value}</p>
      {detail ? <p className="mt-1 text-sm leading-6 text-white/54">{detail}</p> : null}
    </div>
  );
}

function SectionLabel({ children }: { children: ReactNode }) {
  return <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">{children}</p>;
}

function MutedFallback({ text }: { text: string }) {
  return <div className="rounded-[22px] border border-dashed border-white/10 px-4 py-6 text-sm leading-6 text-white/48">{text}</div>;
}

function MetaChip({ label, subtle = false }: { label: string; subtle?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${subtle ? 'border-white/8 bg-white/[0.04] text-white/50' : 'border-white/10 bg-white/[0.06] text-white/62'}`}>
      {label}
    </span>
  );
}

function EmptyState({ text }: { text: string }) {
  return <section className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-white/48">{text}</section>;
}

function Banner({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  const toneClasses = tone === 'error' ? 'border-[#FF6B6B]/30 bg-[#3b1618]/95 text-[#ffd5d5]' : 'border-[#39FF14]/20 bg-[#102110]/92 text-[#d7ffd0]';

  return (
    <div className={`fixed bottom-6 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-full px-5 py-3 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${toneClasses}`}>
      {text}
    </div>
  );
}

function ReportDetailSkeleton() {
  return (
    <div className="space-y-5">
      <section className="overflow-hidden rounded-[30px] border border-white/10 bg-[linear-gradient(140deg,rgba(17,28,42,0.96)_0%,rgba(9,14,21,0.94)_48%,rgba(6,9,14,0.98)_100%)] shadow-[0_28px_90px_rgba(0,0,0,0.35)]">
        <div className="border-b border-white/8 px-5 py-5 sm:px-6">
          <div className="flex items-start justify-between gap-4">
            <div className="min-w-0 flex-1">
              <SkeletonLine className="h-3 w-28 bg-white/[0.08]" />
              <SkeletonLine className="mt-4 h-10 w-52 bg-white/[0.08]" />
              <SkeletonLine className="mt-4 h-4 w-full bg-white/[0.05]" />
              <SkeletonLine className="mt-2 h-4 w-4/5 bg-white/[0.04]" />
              <div className="mt-4 flex flex-wrap gap-2">
                <SkeletonLine className="h-7 w-28 rounded-full bg-white/[0.05]" />
                <SkeletonLine className="h-7 w-24 rounded-full bg-white/[0.05]" />
                <SkeletonLine className="h-7 w-28 rounded-full bg-white/[0.05]" />
              </div>
            </div>
            <SkeletonLine className="hidden h-11 w-32 rounded-full bg-white/[0.07] sm:block" />
          </div>
        </div>

        <div className="grid gap-5 px-5 py-5 sm:px-6 lg:grid-cols-[minmax(0,1fr)_290px]">
          <div className="space-y-4">
            <div className="rounded-[26px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <SkeletonLine className="h-3 w-24 bg-white/[0.06]" />
              <SkeletonLine className="mt-3 h-7 w-44 bg-white/[0.08]" />
              <SkeletonLine className="mt-3 h-4 w-full bg-white/[0.05]" />
              <SkeletonLine className="mt-2 h-4 w-5/6 bg-white/[0.04]" />
            </div>
          </div>

          <div className="rounded-[28px] border border-white/10 bg-white/[0.04] p-4 backdrop-blur">
            <div className="flex items-center gap-3">
              <SkeletonCircle className="h-[92px] w-[92px] border-white/8 bg-white/[0.06]" />
              <div className="space-y-2">
                <SkeletonLine className="h-3 w-20 bg-white/[0.05]" />
                <SkeletonLine className="h-6 w-24 bg-white/[0.08]" />
              </div>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-3">
              {Array.from({ length: 4 }, (_, index) => (
                <div key={`detail-metric-${index}`} className="rounded-[20px] border border-white/8 bg-black/18 px-3 py-3">
                  <SkeletonLine className="h-6 w-10 bg-white/[0.08]" />
                  <SkeletonLine className="mt-2 h-3 w-16 bg-white/[0.05]" />
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="overflow-x-auto hide-scrollbar pb-1">
        <div className="flex min-w-max gap-2">
          {Array.from({ length: 6 }, (_, index) => (
            <SkeletonLine key={`detail-pill-${index}`} className="h-10 w-24 rounded-full bg-white/[0.05]" />
          ))}
        </div>
      </section>

      <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(180deg,rgba(14,18,26,0.96)_0%,rgba(7,10,14,0.96)_100%)] p-5 shadow-[0_24px_70px_rgba(0,0,0,0.32)] sm:p-6">
        <SkeletonLine className="h-3 w-24 bg-white/[0.08]" />
        <SkeletonLine className="mt-4 h-8 w-72 bg-white/[0.08]" />
        <SkeletonLine className="mt-3 h-4 w-full bg-white/[0.05]" />
        <SkeletonLine className="mt-2 h-4 w-4/5 bg-white/[0.04]" />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          {Array.from({ length: 2 }, (_, index) => (
            <div key={`detail-block-${index}`} className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
              <SkeletonLine className="h-3 w-24 bg-white/[0.06]" />
              <SkeletonLine className="mt-3 h-6 w-32 bg-white/[0.08]" />
              <SkeletonLine className="mt-4 h-4 w-full bg-white/[0.05]" />
              <SkeletonLine className="mt-2 h-4 w-5/6 bg-white/[0.04]" />
              <SkeletonLine className="mt-2 h-4 w-2/3 bg-white/[0.04]" />
            </div>
          ))}
        </div>
      </section>
    </div>
  );
}

function deriveVerdictBadge(report: CoachReportListItem['report']): VerdictBadge {
  const productFit = report.productFit;
  const speedStages = report.speedStages;
  const closureStage = speedStages.find((stage) => normalizeKey(stage.stage) === 'drive_closure');
  const closureScore = closureStage?.score ?? 0;
  const closureText = [
    ...report.transcriptHighlights.map((turn) => turn.text),
    closureStage?.note || '',
    ...(closureStage?.evidence || []),
  ]
    .join(' ')
    .toLowerCase();
  const soldPattern =
    /\b(i(?:'| wi)ll take it|i(?:'| wi)ll buy|buy the car|book the car|book this car|go ahead with (?:the )?(?:car|booking|purchase)|confirm(?: the)? booking|booking amount|token amount|finali[sz]e(?: the)? (?:car|deal|booking)|proceed with (?:the )?(?:booking|purchase)|deal done|purchase confirmed)\b/;
  const hotLeadPattern =
    /\b(test drive|follow up|call you|come back|return visit|next visit|revisit|finance quote|send quote|send details|check availability|hold the car|block the car)\b/;
  const coldPattern =
    /\b(walk(?:ed)? away|left|leave|leaving|walked off|not interested|lost interest|went to another showroom|another showroom|other showroom|competitor showroom|buy from elsewhere|buy elsewhere|check elsewhere|prefer(?:red|s)? (?:the )?(?:other|competitor)|chose(?: the)? competitor|wanted a brezza from another showroom|won't proceed|would not proceed|no next step|not coming back)\b/;
  const hasSoldSignal = soldPattern.test(closureText);
  const hasHotLeadSignal = hotLeadPattern.test(closureText);
  const hasColdSignal = coldPattern.test(closureText);
  const explainValueStage = speedStages.find((stage) => normalizeKey(stage.stage) === 'explain_value_proposition');
  const hasPitchSignal =
    productFit.pitchedModels.length > 0 ||
    Boolean(productFit.salesmanPick || productFit.recommendedModel || productFit.customerPreferred) ||
    (explainValueStage?.score ?? 0) >= 35;

  if (!hasPitchSignal) {
    return { label: 'No Pitch', textClass: 'text-[#FF3B30]', surfaceClass: 'bg-[#FF3B30]/12', ringClass: 'border-[#FF3B30]/30' };
  }
  if (hasSoldSignal && closureScore >= 70) {
    return { label: 'Sale Closed', textClass: 'text-[#39FF14]', surfaceClass: 'bg-[#39FF14]/12', ringClass: 'border-[#39FF14]/28' };
  }
  if (!hasColdSignal && (hasHotLeadSignal || closureScore >= 60)) {
    return { label: 'Hot Lead', textClass: 'text-[#FFB800]', surfaceClass: 'bg-[#FFB800]/12', ringClass: 'border-[#FFB800]/28' };
  }
  return { label: 'Went Cold', textClass: 'text-[#8FB9FF]', surfaceClass: 'bg-[#8FB9FF]/12', ringClass: 'border-[#8FB9FF]/28' };
}

function deriveProductFitNarrative(report: CoachReportListItem['report'], closureLabel: string) {
  const productFit = report.productFit;
  const primaryModel =
    splitPipeValue(productFit.idealMatch || productFit.recommendedModel || productFit.salesmanPick || productFit.customerPreferred).head;
  const originalWhy = productFit.why?.trim() || '';
  const vagueReason =
    !originalWhy ||
    /does not provide enough information|not clearly stated|product fit was evaluated|not_made/i.test(originalWhy);
  const keyObjection = report.objections.find((item) => item.handled === 'HANDLED')?.label;
  const driver = report.drivingIndex.primaryDriver;

  if (closureLabel === 'Sale Closed' && vagueReason) {
    return `${primaryModel} checked enough boxes to get the customer over the line. The conversation landed on ${driver ? driver.toLowerCase() : 'the customer’s core need'}, and ${keyObjection ? `once the ${keyObjection.toLowerCase()} concern was handled, ` : ''}the customer committed instead of drifting away.`;
  }

  if (originalWhy) return originalWhy;

  return `${primaryModel} appears to be the strongest fit surfaced in this conversation.`;
}

function deriveNextVisitSignal(report: CoachReportListItem['report']) {
  const closureStage = report.speedStages.find((stage) => normalizeKey(stage.stage) === 'drive_closure');
  const closureScore = closureStage?.score ?? 0;
  const objectionCount = report.objections.length;
  const unresolvedObjections = report.objections.filter((item) => item.handled !== 'HANDLED').length;
  const sentiment = normalizeKey(report.customerSentiment.end);
  const hasPositiveSentiment = ['positive', 'warm', 'excited', 'interested'].includes(sentiment);

  if (closureScore >= 80 && hasPositiveSentiment) {
    return {
      title: 'High chance they engage again',
      summary:
        'Momentum stayed alive in this conversation. The customer ended warmer than they started, so a return visit or a continued follow-up is very realistic if you keep continuity.',
      approach:
        'Do not restart from zero. Re-enter with memory: mention what they liked, confirm the last agreed step, and move them quickly toward one concrete action such as paperwork, accessories, finance clarity, or delivery confidence.',
      tone: 'positive' as const,
    };
  }

  if (closureScore >= 55 || (objectionCount > 0 && unresolvedObjections < objectionCount)) {
    return {
      title: 'Medium chance they return',
      summary:
        'There is still live buying intent here, but it needs structure. The customer may come back if you follow up with clarity and remove the remaining uncertainty fast.',
      approach:
        'If they revisit, lead with the exact concern that slowed the conversation last time. Reconfirm budget, model interest, and decision blockers in the first minute, then narrow the pitch to one best-fit recommendation and one next step.',
      tone: 'warning' as const,
    };
  }

  return {
    title: 'Low chance unless the re-entry improves',
    summary:
      'The relationship does not look fully lost, but the next visit will only happen if you create a stronger reason for the customer to return than they had the first time.',
    approach:
      'If they do come back, avoid jumping straight into features. Start by acknowledging what felt incomplete before, ask one sharp probing question to reopen the customer’s real need, and rebuild trust before moving toward a product pitch.',
    tone: 'default' as const,
  };
}

function computeTalkRatio(turns: TranscriptTurn[]) {
  if (!turns.length) return null;
  const totals = turns.reduce(
    (acc, turn) => {
      const count = countWords(turn.text);
      if (turn.speaker === 'salesperson') acc.sales += count;
      if (turn.speaker === 'customer') acc.customer += count;
      return acc;
    },
    { sales: 0, customer: 0 },
  );
  const totalWords = totals.sales + totals.customer;
  if (!totalWords) return null;

  const salesShare = Math.round((totals.sales / totalWords) * 100);
  const customerShare = Math.max(0, 100 - salesShare);
  const summary = salesShare > 65 ? 'You dominated the airtime' : salesShare < 45 ? 'The customer did most of the talking' : 'The conversation stayed fairly balanced';
  return { salesShare, customerShare, summary };
}

function countWords(text: string) {
  return String(text || '').trim().split(/\s+/).filter(Boolean).length;
}

function splitPipeValue(value?: string | null) {
  const [head, ...rest] = String(value || '').split('|').map((part) => part.trim()).filter(Boolean);
  return { head: formatDisplayLabel(head || 'Not specified'), detail: rest.join(' | ') };
}

function formatVerdictLabel(verdict: ProductFitReview['verdict']) {
  if (verdict === 'PARTIALLY_CORRECT') return 'Partially Correct';
  if (verdict === 'NOT_MADE') return 'Not Made';
  return verdict.charAt(0) + verdict.slice(1).toLowerCase();
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function formatDisplayLabel(value: string) {
  return String(value || '')
    .split(/\s+/)
    .map((part) => {
      if (!part) return part;
      if (/^[A-Z0-9+-]{2,}$/.test(part)) return part;
      return part.charAt(0).toUpperCase() + part.slice(1);
    })
    .join(' ');
}

function formatReportDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}
