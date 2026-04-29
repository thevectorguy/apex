import { useEffect, useMemo, useState } from 'react';
import { type Screen } from '../types';
import {
  listCoachReports,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  type CoachReportListItem,
} from '../lib/myCoachApi';
import { useApp } from '../contexts/AppContext';

type CustomerReportGroup = {
  customerId: string;
  customerName: string;
  latestReport: CoachReportListItem;
  sessions: CoachReportListItem[];
};

const PAGE_SIZE = 10;

export function MyCoachReportsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { bootstrap } = useApp();
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [search, setSearch] = useState('');
  const [page, setPage] = useState(1);
  const [selectedGroup, setSelectedGroup] = useState<CustomerReportGroup | null>(null);

  useEffect(() => {
    void loadReports();
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      setReports(await listCoachReports());
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load the reports page.');
    } finally {
      setLoading(false);
    }
  }

  const customerGroups = useMemo(() => {
    const grouped = new Map<string, CustomerReportGroup>();

    for (const report of reports) {
      const existing = grouped.get(report.customerId);
      if (existing) {
        existing.sessions.push(report);
      } else {
        grouped.set(report.customerId, {
          customerId: report.customerId,
          customerName: report.customerName,
          latestReport: report,
          sessions: [report],
        });
      }
    }

    return Array.from(grouped.values())
      .map((group) => ({
        ...group,
        sessions: group.sessions.sort((a, b) => new Date(b.generatedAt).getTime() - new Date(a.generatedAt).getTime()),
      }))
      .sort((a, b) => new Date(b.latestReport.generatedAt).getTime() - new Date(a.latestReport.generatedAt).getTime());
  }, [reports]);

  const filteredGroups = customerGroups.filter((group) => group.customerName.toLowerCase().includes(search.trim().toLowerCase()));
  const visibleGroups = filteredGroups.slice(0, page * PAGE_SIZE);

  function openReport(report: CoachReportListItem) {
    rememberFlowOrigin('report_library');
    rememberSelectedReportId(report.id);
    rememberSelectedThreadId(report.customerId);
    rememberSelectedSessionId(report.sessionId);
    setSelectedGroup(null);
    onNavigate('my_coach_report_detail');
  }

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 pb-32 pt-24">
      <section className="relative overflow-hidden rounded-[28pt] border border-white/35 dark:border-white/8 bg-[linear-gradient(135deg,#e83e64_0%,#e65349_48%,#dc8625_100%)] dark:bg-[linear-gradient(135deg,#131823_0%,#182131_44%,#1f2028_100%)] px-6 py-7 shadow-[0_18px_48px_rgba(119,57,46,0.18),0_3px_12px_rgba(31,41,55,0.08)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.24),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(255,255,255,0.16),transparent_36%),linear-gradient(180deg,rgba(255,255,255,0.08),rgba(45,18,14,0.12))] dark:bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.16),transparent_34%)]"></div>
        <div className="relative z-10">
          <button
            type="button"
            onClick={() => onNavigate('my_coach')}
            className="inline-flex items-center gap-2 rounded-full border border-white/20 dark:border-white/10 bg-white/10 dark:bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/90 dark:text-white/72 transition hover:bg-white/20 dark:hover:bg-white/8"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            My Coach workspace
          </button>

          <h1 className="mt-4 font-headline text-4xl font-bold tracking-tight text-white md:text-5xl">Reports</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/90 dark:text-white/66 md:text-base">
            Start with the customer, then pick the session you want to review. This keeps the library easier to scan on mobile and much cleaner once reports pile up.
          </p>

          <div className="mt-5 grid gap-3 sm:grid-cols-3">
            <MetricCard label="Customers" value={String(bootstrap?.reports.customerCount ?? customerGroups.length)} />
            <MetricCard label="Sessions" value={String(bootstrap?.reports.sessionsCount ?? reports.length)} />
            <MetricCard label="Needs review" value={String(bootstrap?.reports.needsReviewCount ?? reports.filter((report) => ['C', 'D'].includes(report.grade)).length)} />
          </div>
        </div>
      </section>

      <section className="rounded-[26pt] border border-white/70 dark:border-white/8 bg-[linear-gradient(180deg,rgba(246,248,252,0.96),rgba(237,242,248,0.92))] dark:bg-[linear-gradient(180deg,rgba(27,27,32,0.94),rgba(17,19,25,0.96))] p-4 shadow-[0_18px_54px_rgba(31,41,55,0.12),inset_0_1px_0_rgba(255,255,255,0.9)] dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex items-center gap-3">
          <input
            value={search}
            onChange={(event) => {
              setSearch(event.target.value);
              setPage(1);
            }}
            placeholder="Search customer by name"
            className="w-full rounded-full border border-black/5 dark:border-white/10 bg-white/[0.82] dark:bg-white/5 px-4 py-3 text-sm text-on-surface dark:text-white shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] placeholder:text-on-surface-variant/50 dark:placeholder:text-white/36 focus:border-primary/40 focus:bg-white dark:focus:bg-surface-container-high focus:outline-none transition-colors"
          />
          <button
            type="button"
            onClick={() => void loadReports()}
            className="rounded-full border border-black/5 dark:border-white/10 bg-white/[0.82] dark:bg-white/5 p-3 text-on-surface-variant dark:text-white/74 shadow-[inset_0_1px_0_rgba(255,255,255,0.9)] hover:bg-white dark:hover:bg-white/8 transition-colors"
            aria-label="Refresh reports"
          >
            <span className="material-symbols-outlined text-[18px]">refresh</span>
          </button>
        </div>

        <div className="mt-4 space-y-3">
          {loading ? (
            Array.from({ length: 4 }, (_, index) => <LibraryRowSkeleton key={`report-row-${index}`} />)
          ) : !visibleGroups.length ? (
            <div className="rounded-[22pt] border border-dashed border-black/10 dark:border-white/10 px-4 py-10 text-center text-sm leading-6 text-on-surface-variant/70 dark:text-white/48">
              No report matches that search yet.
            </div>
          ) : (
            visibleGroups.map((group) => (
              <button
                key={group.customerId}
                type="button"
                onClick={() => setSelectedGroup(group)}
                className="w-full rounded-[22pt] border border-white/80 dark:border-white/8 bg-white/[0.94] dark:bg-white/4 px-4 py-4 text-left shadow-[0_10px_26px_rgba(31,41,55,0.07),0_1px_0_rgba(255,255,255,0.95)_inset] transition hover:-translate-y-0.5 hover:border-white hover:shadow-[0_14px_34px_rgba(31,41,55,0.11),0_1px_0_rgba(255,255,255,0.95)_inset] dark:shadow-none dark:hover:translate-y-0 dark:hover:border-white/8 dark:hover:bg-white/7 dark:hover:shadow-none"
              >
                <div className="flex items-start justify-between gap-4">
                  <div className="min-w-0">
                    <p className="font-headline text-xl font-bold text-on-surface dark:text-white">{group.customerName}</p>
                    <p className="mt-2 text-sm leading-6 text-on-surface-variant dark:text-white/64">{buildLibraryInsight(group.latestReport)}</p>
                  </div>
                  <div className="rounded-[18px] border border-black/5 dark:border-secondary/24 bg-[#f1f3f6] dark:bg-secondary/10 px-3 py-2 text-right shadow-[inset_0_1px_0_rgba(255,255,255,0.85)] dark:shadow-none">
                    <p className="font-headline text-2xl font-bold text-on-surface dark:text-white">{group.latestReport.grade}</p>
                    <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/70 dark:text-secondary">{formatReportDate(group.latestReport.generatedAt)}</p>
                  </div>
                </div>
              </button>
            ))
          )}
        </div>

        {!loading && visibleGroups.length < filteredGroups.length ? (
          <button
            type="button"
            onClick={() => setPage((current) => current + 1)}
            className="mt-4 w-full rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 hover:bg-black/10 dark:hover:bg-white/8 transition-colors"
          >
            Load more customers
          </button>
        ) : null}
      </section>

      {selectedGroup ? (
        <SessionSheet
          group={selectedGroup}
          onClose={() => setSelectedGroup(null)}
          onOpenReport={openReport}
        />
      ) : null}

      {error ? (
        <div className="rounded-full border border-error/30 bg-error-container/95 px-5 py-3 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}
    </main>
  );
}

function SessionSheet({
  group,
  onClose,
  onOpenReport,
}: {
  group: CustomerReportGroup;
  onClose: () => void;
  onOpenReport: (report: CoachReportListItem) => void;
}) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Close sessions" />
      <div className="relative z-10 flex max-h-[82dvh] flex-col overflow-hidden rounded-t-[30px] border border-black/5 dark:border-white/10 bg-surface-bright dark:bg-[#171b24] p-5 shadow-[0_-24px_80px_rgba(0,0,0,0.1)] dark:shadow-[0_-24px_80px_rgba(0,0,0,0.48)]">
        <div className="mx-auto mb-4 h-1.5 w-12 shrink-0 rounded-full bg-black/10 dark:bg-white/14"></div>
        <div className="mb-4 flex shrink-0 items-center justify-between gap-4">
          <div>
            <p className="text-[10px] uppercase tracking-[0.18em] text-primary dark:text-[#8fb9ff]">Customer sessions</p>
            <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface dark:text-white">{group.customerName}</h2>
          </div>
          <button type="button" onClick={onClose} className="rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 p-2 text-on-surface-variant dark:text-white/74 hover:bg-black/10 dark:hover:bg-white/8 transition-colors">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        <div className="min-h-0 flex-1 space-y-3 overflow-y-auto overscroll-contain pr-1 pb-2">
          {group.sessions.map((report) => (
            <button
              key={report.id}
              type="button"
              onClick={() => onOpenReport(report)}
              className="w-full rounded-[22px] border border-black/5 dark:border-white/8 bg-black/[0.03] dark:bg-white/4 p-4 text-left transition hover:bg-black/5 dark:hover:bg-white/7"
            >
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0">
                  <p className="font-headline text-lg font-bold text-on-surface dark:text-white">{report.sessionTitle}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/70 dark:text-white/42">{formatReportDate(report.generatedAt)}</p>
                </div>
                <div className="rounded-[16px] border border-secondary/20 bg-secondary/10 px-3 py-2 text-center">
                  <p className="font-headline text-xl font-bold text-on-surface dark:text-white">{report.grade}</p>
                </div>
              </div>
              <p className="mt-3 text-sm leading-6 text-on-surface-variant dark:text-white/64">{report.summary}</p>
            </button>
          ))}
        </div>
      </div>
    </div>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[18pt] border border-white/20 dark:border-white/8 bg-white/10 dark:bg-black/18 px-4 py-4 backdrop-blur-md">
      <p className="font-headline text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/76 dark:text-white/42">{label}</p>
    </div>
  );
}

function LibraryRowSkeleton() {
  return (
    <div className="w-full rounded-[22pt] border border-white/80 dark:border-white/8 bg-white/[0.76] dark:bg-white/4 px-4 py-4 shadow-sm dark:shadow-none">
      <div className="h-5 w-36 rounded bg-black/10 dark:bg-white/[0.08]"></div>
      <div className="mt-4 h-3 w-full rounded bg-black/5 dark:bg-white/[0.05]"></div>
      <div className="mt-2 h-3 w-4/5 rounded bg-black/5 dark:bg-white/[0.04]"></div>
    </div>
  );
}

function buildLibraryInsight(report: CoachReportListItem) {
  const verdict = deriveVerdictLabel(report);
  return `${verdict} · ${report.summary}`;
}

function deriveVerdictLabel(report: CoachReportListItem) {
  if (report.grade === 'A' || report.grade === 'B') {
    return 'Strong conversation';
  }
  if (report.grade === 'C') {
    return 'Needs coaching follow-through';
  }
  return 'Needs urgent review';
}

function formatReportDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}
