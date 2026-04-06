import { useEffect, useState } from 'react';
import { type Screen } from '../types';
import {
  getMasterCopyInfo,
  getTrainingMasterCopyLabel,
  listCoachReports,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  type CoachReportListItem,
} from '../lib/myCoachApi';
import { SkeletonLine, SkeletonCircle } from '../components/Skeleton';

export function MyCoachReportsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [masterCopyLabel, setMasterCopyLabel] = useState(getTrainingMasterCopyLabel());

  useEffect(() => {
    void loadReports();
    void getMasterCopyInfo()
      .then((info) => setMasterCopyLabel(info.version))
      .catch(() => {});
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const nextReports = await listCoachReports();
      setReports(nextReports);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load the reports page.');
    } finally {
      setLoading(false);
    }
  }

  const totalReports = reports.length;
  const sessionsCovered = new Set(reports.map((report) => report.sessionId)).size;
  const needsAttention = reports.filter((report) => ['C', 'D'].includes(report.grade)).length;

  function openReport(report: CoachReportListItem) {
    rememberFlowOrigin('report_library');
    rememberSelectedReportId(report.id);
    rememberSelectedThreadId(report.customerId);
    rememberSelectedSessionId(report.sessionId);
    onNavigate('my_coach_report_detail');
  }

  return (
    <main className="pt-24 px-6 pb-32 max-w-6xl mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-[28pt] border border-white/8 bg-[linear-gradient(135deg,#131823_0%,#182131_44%,#1f2028_100%)] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.16),transparent_34%)]"></div>
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <button
              type="button"
              onClick={() => onNavigate('my_coach')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/72"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              My Coach workspace
            </button>
            <h1 className="mt-4 font-headline text-4xl font-bold tracking-tight text-white md:text-5xl">Report Library</h1>
            <p className="mt-3 text-sm leading-6 text-white/66 md:text-base">
              Keep this page focused on the library only. Pick any saved report here, then open it on its own page for
              the full review.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <button
                type="button"
                onClick={() => onNavigate('my_coach')}
                className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-white/74 transition hover:bg-white/8"
              >
                Back to My Coach
              </button>
              <span className="inline-flex items-center rounded-full border border-secondary/24 bg-secondary/12 px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] text-secondary">
                {masterCopyLabel}
              </span>
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {loading
              ? Array.from({ length: 3 }, (_, index) => <LibraryMetricSkeleton key={`report-metric-${index}`} />)
              : [
                  { label: 'Reports', value: String(totalReports) },
                  { label: 'Sessions', value: String(sessionsCovered) },
                  { label: 'Needs review', value: String(needsAttention) },
                ].map((item) => (
                  <div key={item.label} className="rounded-[18pt] border border-white/8 bg-black/18 px-4 py-4">
                    <p className="font-headline text-2xl font-bold text-white">{item.value}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/42">{item.label}</p>
                  </div>
                ))}
          </div>
        </div>
      </section>

      <section className="rounded-[26pt] border border-white/8 bg-surface-container-low/92 p-4 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex items-start justify-between gap-3">
          <div>
            <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Reports</p>
            <p className="mt-2 text-sm leading-6 text-white/54">
              Newest versions stay on top. Open one report at a time so the detail view can stay clean.
            </p>
          </div>
          <button
            type="button"
            onClick={() => void loadReports()}
            className="rounded-full border border-white/10 bg-white/5 p-3 text-white/74"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            Array.from({ length: 4 }, (_, index) => <ReportRowSkeleton key={`report-row-${index}`} />)
          ) : !reports.length ? (
            <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm leading-6 text-white/48">
              No reports yet. Generate the first one from the My Coach workflow.
            </div>
          ) : (
            reports.map((report) => (
              <button
                key={report.id}
                type="button"
                onClick={() => openReport(report)}
                className="w-full rounded-[22pt] border border-white/8 bg-white/4 px-4 py-4 text-left transition hover:bg-white/7"
              >
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-headline text-lg font-bold text-on-surface">{report.customerName}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/44">{report.sessionTitle}</p>
                  </div>
                  <div className="rounded-[16pt] border border-secondary/24 bg-secondary/10 px-3 py-2 text-center">
                    <p className="font-headline text-xl font-bold text-white">{report.overallScore}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-secondary">{report.grade}</p>
                  </div>
                </div>
                <p className="mt-3 text-sm leading-6 text-white/62">{report.summary}</p>
                <div className="mt-4 flex flex-wrap items-center justify-between gap-2 text-[10px] uppercase tracking-[0.16em] text-white/42">
                  <span>{formatReportDate(report.generatedAt)}</span>
                  <span>Open report</span>
                </div>
              </button>
            ))
          )}
        </div>
      </section>

      {error ? (
        <div className="rounded-full border border-error/30 bg-error-container/95 px-5 py-3 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}
    </main>
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

function LibraryMetricSkeleton() {
  return (
    <div className="rounded-[18pt] border border-white/8 bg-black/18 px-4 py-4">
      <SkeletonLine className="h-7 w-16 bg-white/[0.08]" />
      <SkeletonLine className="mt-3 h-3 w-20 bg-white/[0.05]" />
    </div>
  );
}

function ReportRowSkeleton() {
  return (
    <div className="w-full rounded-[22pt] border border-white/8 bg-white/4 px-4 py-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <SkeletonLine className="h-5 w-36 bg-white/[0.08]" />
          <SkeletonLine className="mt-2 h-3 w-28 bg-white/[0.05]" />
        </div>
        <div className="rounded-[16pt] border border-secondary/10 bg-secondary/5 px-3 py-2">
          <SkeletonLine className="h-5 w-10 bg-white/[0.08]" />
          <SkeletonLine className="mt-2 h-3 w-8 bg-white/[0.05]" />
        </div>
      </div>
      <SkeletonLine className="mt-4 h-3 w-full bg-white/[0.05]" />
      <SkeletonLine className="mt-2 h-3 w-4/5 bg-white/[0.04]" />
      <div className="mt-4 flex items-center justify-between gap-2">
        <SkeletonLine className="h-3 w-20 bg-white/[0.04]" />
        <SkeletonCircle className="h-6 w-6 border-white/8 bg-white/[0.04]" />
      </div>
    </div>
  );
}
