import { useEffect, useMemo, useState } from 'react';
import { type Screen } from '../types';
import { readSearchParam, writeSearchParam } from '../lib/appRouter';
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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#13253a_0%,#081018_34%,#04070c_68%,#020305_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[880px] space-y-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74 backdrop-blur"
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
            <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(140deg,rgba(17,28,42,0.96)_0%,rgba(9,14,21,0.94)_48%,rgba(6,9,14,0.98)_100%)] px-5 py-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:px-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">{meta.eyebrow}</p>
              <h1 className="mt-2 font-headline text-[30px] font-bold leading-tight text-white sm:text-[38px]">{meta.title}</h1>
              <p className="mt-3 max-w-[42rem] text-sm leading-6 text-white/62">{meta.detail}</p>
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip label={selectedReport.customerName} />
                <MetaChip label={selectedReport.sessionTitle} />
                <MetaChip label={formatReportDate(selectedReport.generatedAt)} subtle />
              </div>
            </section>

            <section className="space-y-4">
              {section === 'overview' ? (
                <OverviewSection report={selectedReport} onOpenSpeedBreakdown={openSpeedBreakdown} />
              ) : null}
              {section === 'coaching' ? <CoachingSection report={selectedReport} /> : null}
              {section === 'verdict' ? <VerdictSection report={selectedReport} /> : null}
              {section === 'next_visit' ? <NextVisitSection report={selectedReport} /> : null}
            </section>
          </>
        ) : (
          <section className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-white/48">
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
}: {
  report: CoachReportListItem;
  onOpenSpeedBreakdown: () => void;
}) {
  const topSpeedStage = report.report.speedStages[0];

  return (
    <>
      <DetailBlock label="Product Fit" title={report.report.productFitSummary} detail={report.report.productFit.why} />
      <DetailBlock
        label="Driving Index"
        title={report.report.drivingIndex.primaryDriver || 'Not captured'}
        detail={report.report.drivingIndex.insight || 'Driving motivation is not clear yet.'}
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
      />
    </>
  );
}

function CoachingSection({ report }: { report: CoachReportListItem }) {
  return (
    <>
      <ListBlock label="What went well" items={report.report.strengths} emptyText="No strengths were returned for this report." />
      <ListBlock label="What did not work" items={report.report.improvements} emptyText="No improvement areas were returned for this report." />
      <ListBlock
        label="Coach advice"
        items={report.report.coachAdvice.map((item) => [item.title, item.detail].filter(Boolean).join(' - '))}
        emptyText="No coach advice yet."
      />
    </>
  );
}

function VerdictSection({ report }: { report: CoachReportListItem }) {
  return (
    <>
      <DetailBlock label="Verdict" title={deriveVerdictLabel(report)} detail={report.report.productFit.why} />
      <ListBlock
        label="Observed objections"
        items={report.report.objections.map((item) => `${item.label} - ${item.advice || item.how || item.strategy || item.handled}`)}
        emptyText="No objection review was returned."
      />
    </>
  );
}

function NextVisitSection({ report }: { report: CoachReportListItem }) {
  return (
    <>
      <ListBlock label="Next visit opener" items={[report.report.nextVisitOpener].filter(Boolean)} emptyText="No next visit opener was suggested." />
      <ListBlock label="Preparation" items={report.report.nextVisitPrep} emptyText="No next-visit preparation items were returned." />
      <ListBlock label="Research tasks" items={report.report.researchTasks} emptyText="No research tasks were returned." />
    </>
  );
}

function JumpCard({
  label,
  title,
  detail,
  actionLabel,
  onClick,
}: {
  label: string;
  title: string;
  detail: string;
  actionLabel: string;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className="w-full rounded-[24px] border border-white/8 bg-[linear-gradient(180deg,rgba(20,26,38,0.95)_0%,rgba(9,13,19,0.98)_100%)] p-5 text-left shadow-[0_24px_70px_rgba(0,0,0,0.32)] transition hover:border-white/14 hover:bg-white/[0.05]"
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">{label}</p>
          <p className="mt-3 font-headline text-2xl font-bold text-white">{title}</p>
          <p className="mt-3 text-sm leading-6 text-white/66">{detail}</p>
        </div>
        <span className="material-symbols-outlined text-[22px] text-white/64">arrow_forward</span>
      </div>
      <div className="mt-5 inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/78">
        {actionLabel}
      </div>
    </button>
  );
}

function DetailBlock({ label, title, detail }: { label: string; title: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-2 font-headline text-2xl font-bold text-white">{title}</p>
      <p className="mt-3 text-sm leading-6 text-white/62">{detail}</p>
    </div>
  );
}

function ListBlock({ label, items, emptyText }: { label: string; items: string[]; emptyText: string }) {
  const cleanItems = items.map((item) => item.trim()).filter(Boolean);

  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-5">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <div className="mt-4 space-y-3">
        {cleanItems.length ? (
          cleanItems.map((item) => (
            <div key={item} className="rounded-[18px] border border-white/8 bg-black/14 px-4 py-3 text-sm leading-6 text-white/72">
              {item}
            </div>
          ))
        ) : (
          <p className="text-sm leading-6 text-white/48">{emptyText}</p>
        )}
      </div>
    </div>
  );
}

function MetaChip({ label, subtle = false }: { label: string; subtle?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${subtle ? 'border-white/8 bg-white/[0.04] text-white/50' : 'border-white/10 bg-white/[0.06] text-white/62'}`}>
      {label}
    </span>
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

function formatReportDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-full border border-[#FF6B6B]/30 bg-[#3b1618]/95 px-5 py-3 text-sm text-[#ffd5d5] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {text}
    </div>
  );
}
