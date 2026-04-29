import { useEffect, useMemo, useState } from 'react';
import { type Screen } from '../types';
import { readSearchParam, writeSearchParam } from '../lib/appRouter';
import { getReportSectionTone } from '../lib/myCoachReportTones';
import {
  listCoachReports,
  readRememberedReportId,
  type CoachReportListItem,
} from '../lib/myCoachApi';

type ReportSectionId = 'overview' | 'coaching' | 'verdict' | 'next_visit';

const SECTION_META: Record<ReportSectionId, { eyebrow: string; title: string; detail: string }> = {
  overview: {
    eyebrow: 'Overview',
    title: 'One clean read on the conversation',
    detail: 'Start with the fit, the intent, and the speed signal you want to open next.',
  },
  coaching: {
    eyebrow: 'Coaching',
    title: 'What landed and what still needs work',
    detail: 'This page keeps the coaching practical so the report stays useful on the floor.',
  },
  verdict: {
    eyebrow: 'Verdict',
    title: 'Why this conversation moved or stalled',
    detail: 'Read the bottom-line call first, then the objections that shaped it.',
  },
  next_visit: {
    eyebrow: 'Next Visit',
    title: 'How to handle the customer when they come back',
    detail: 'Everything here is about the re-entry: opener, prep, and follow-up tasks.',
  },
};

export function MyCoachReportSectionScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(readRememberedReportId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadReports();
  }, []);

  const section = getReportSectionFromRoute();
  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );
  const meta = SECTION_META[section];
  const tone = getReportSectionTone(section, selectedReport?.grade ?? 'B');

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const nextReports = await listCoachReports();
      setReports(nextReports);
      setSelectedReportId((current) => current && nextReports.some((report) => report.id === current) ? current : nextReports[0]?.id ?? null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load the selected report section.');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    writeSearchParam('reportSection', null);
    onNavigate('my_coach_report_detail');
  }

  function openSpeedBreakdown() {
    writeSearchParam('reportSection', 'overview');
    onNavigate('my_coach_report_speed');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_16%_0%,rgba(0,122,255,0.16),transparent_32%),radial-gradient(circle_at_92%_16%,rgba(255,149,0,0.12),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4fa_58%,#f6f7f9_100%)] dark:bg-[radial-gradient(circle_at_top,#13253a_0%,#081018_34%,#04070c_68%,#020305_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[880px] space-y-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 backdrop-blur transition hover:bg-black/10 dark:hover:bg-white/[0.1]"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Report
        </button>

        {loading ? (
          <section className="rounded-[30px] border border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-white/48">
            Loading section...
          </section>
        ) : selectedReport ? (
          <>
            <section className={`rounded-[30px] border px-5 py-6 sm:px-6 ${tone.heroClass}`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/80 dark:text-[#8fb9ff]">{meta.eyebrow}</p>
              <h1 className="mt-2 font-headline text-[30px] font-bold leading-tight text-white sm:text-[38px]">{meta.title}</h1>
              <p className="mt-3 max-w-[42rem] text-sm leading-6 text-white/62">{meta.detail}</p>
            </section>

            <section className="space-y-4">
              {section === 'overview' ? (
                <OverviewSection report={selectedReport} onOpenSpeedBreakdown={openSpeedBreakdown} tone={tone} />
              ) : null}
              {section === 'coaching' ? <CoachingSection report={selectedReport} tone={tone} /> : null}
              {section === 'verdict' ? <VerdictSection report={selectedReport} tone={tone} /> : null}
              {section === 'next_visit' ? <NextVisitSection report={selectedReport} tone={tone} /> : null}
            </section>
          </>
        ) : (
          <section className="rounded-[30px] border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-on-surface-variant/60 dark:text-white/48">
            Open a report from the report library first.
          </section>
        )}

        {error ? <ErrorBanner text={error} /> : null}
      </div>
    </main>
  );
}

function OverviewSection({
  report,
  onOpenSpeedBreakdown,
  tone,
}: {
  report: CoachReportListItem;
  onOpenSpeedBreakdown: () => void;
  tone: ReturnType<typeof getReportSectionTone>;
}) {
  const topSpeedStage = report.report.speedStages[0];

  return (
    <>
      <DetailBlock label="Product Fit" title={report.report.productFitSummary} detail={report.report.productFit.why} tone={tone} />
      <DetailBlock
        label="Driving Index"
        title={report.report.drivingIndex.primaryDriver || 'Not captured'}
        detail={report.report.drivingIndex.insight || 'Driving motivation is not clear yet.'}
        tone={tone}
      />
      <JumpCard
        label="Speed Breakdown"
        title={topSpeedStage ? `${topSpeedStage.stage} is leading right now` : 'Open the speed breakdown'}
        detail={
          topSpeedStage
            ? `${topSpeedStage.note} Tap in to see the full stage-by-stage breakdown with the animated bars.`
            : 'Open the full speed breakdown to review how every stage scored.'
        }
        actionLabel="Open speed breakdown"
        onClick={onOpenSpeedBreakdown}
        tone={tone}
      />
    </>
  );
}

function CoachingSection({ report, tone }: { report: CoachReportListItem; tone: ReturnType<typeof getReportSectionTone> }) {
  return (
    <>
      <ListBlock label="What went well" items={report.report.strengths} emptyText="No strengths were returned for this report." tone={tone} />
      <ListBlock label="What did not work" items={report.report.improvements} emptyText="No improvement areas were returned for this report." tone={tone} />
      <ListBlock
        label="Coach advice"
        items={report.report.coachAdvice.map((item) => [item.title, item.detail].filter(Boolean).join(' - '))}
        emptyText="No coach advice yet."
        tone={tone}
      />
    </>
  );
}

function VerdictSection({ report, tone }: { report: CoachReportListItem; tone: ReturnType<typeof getReportSectionTone> }) {
  return (
    <>
      <DetailBlock label="Verdict" title={deriveVerdictLabel(report)} detail={report.report.productFit.why} tone={tone} />
      <ListBlock
        label="Observed objections"
        items={report.report.objections.map((item) => `${item.label} - ${item.advice || item.how || item.strategy || item.handled}`)}
        emptyText="No objection review was returned."
        tone={tone}
      />
    </>
  );
}

function NextVisitSection({ report, tone }: { report: CoachReportListItem; tone: ReturnType<typeof getReportSectionTone> }) {
  return (
    <>
      <ListBlock label="Next visit opener" items={[report.report.nextVisitOpener].filter(Boolean)} emptyText="No next visit opener was suggested." tone={tone} />
      <ListBlock label="Preparation" items={report.report.nextVisitPrep} emptyText="No next-visit preparation items were returned." tone={tone} />
      <ListBlock label="Research tasks" items={report.report.researchTasks} emptyText="No research tasks were returned." tone={tone} />
    </>
  );
}

function JumpCard({
  label,
  title,
  detail,
  actionLabel,
  onClick,
  tone,
}: {
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  onClick: () => void;
  tone: ReturnType<typeof getReportSectionTone>;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border border-black/5 dark:border-white/8 bg-white dark:bg-[linear-gradient(180deg,rgba(20,26,38,0.95)_0%,rgba(9,13,19,0.98)_100%)] p-5 text-left shadow-apple-soft dark:shadow-[0_24px_70px_rgba(0,0,0,0.32)] transition hover:shadow-apple dark:hover:border-white/14 dark:hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className={`text-[10px] uppercase tracking-[0.18em] ${tone.accentTextClass}`}>{label}</p>
          <p className="mt-3 font-headline text-2xl font-bold text-on-surface dark:text-white">{title}</p>
          <p className="mt-3 text-sm leading-6 text-on-surface-variant dark:text-white/66">{detail}</p>
        </div>
        <span className="material-symbols-outlined text-[22px] text-on-surface-variant/70 dark:text-white/64">arrow_forward</span>
      </div>
      <div className={`mt-5 inline-flex items-center gap-2 rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition-colors ${tone.actionPillClass}`}>
        {actionLabel}
      </div>
    </button>
  );
}

function DetailBlock({
  label,
  title,
  detail,
  tone,
}: {
  label: string;
  title: string;
  detail: string;
  tone: ReturnType<typeof getReportSectionTone>;
}) {
  return (
    <div className="rounded-[24px] border border-black/5 dark:border-white/8 bg-white dark:bg-white/[0.03] p-5 shadow-sm dark:shadow-none">
      <p className={`text-[10px] uppercase tracking-[0.18em] ${tone.accentTextMutedClass}`}>{label}</p>
      <p className="mt-2 font-headline text-2xl font-bold text-on-surface dark:text-white">{title}</p>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant dark:text-white/62">{detail}</p>
    </div>
  );
}

function ListBlock({
  label,
  items,
  emptyText,
  tone,
}: {
  label: string;
  items: string[];
  emptyText: string;
  tone: ReturnType<typeof getReportSectionTone>;
}) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);

  return (
    <div className="rounded-[24px] border border-black/5 dark:border-white/8 bg-white dark:bg-white/[0.03] p-5 shadow-sm dark:shadow-none">
      <p className={`text-[10px] uppercase tracking-[0.18em] ${tone.accentTextMutedClass}`}>{label}</p>
      <div className="mt-4 space-y-3">
        {cleanItems.length ? (
          cleanItems.map((item) => (
            <div key={item} className={`rounded-[18px] border px-4 py-3 text-sm leading-6 text-on-surface dark:text-white/72 ${tone.accentBorderClass} ${tone.accentSurfaceClass}`}>
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-on-surface-variant/70 dark:text-white/48">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function getReportSectionFromRoute(): ReportSectionId {
  const value = readSearchParam('reportSection');
  if (value === 'coaching' || value === 'verdict' || value === 'next_visit') return value;
  return 'overview';
}

function deriveVerdictLabel(report: CoachReportListItem) {
  if (report.grade === 'A') return 'Strong conversation';
  if (report.grade === 'B') return 'Progressed well';
  if (report.grade === 'C') return 'Needs coaching follow-through';
  return 'Went cold';
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-full border border-[#FF6B6B]/30 bg-[#3b1618]/95 px-5 py-3 text-sm text-[#ffd5d5] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {text}
    </div>
  );
}
