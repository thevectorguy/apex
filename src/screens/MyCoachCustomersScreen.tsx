import { useEffect, useState } from 'react';
import {
  clearDraftSessionTitle,
  clearRememberedReportId,
  clearRememberedSessionId,
  listCustomerThreads,
  rememberFlowOrigin,
  rememberDraftSessionTitle,
  rememberStepsFocus,
  rememberSelectedThreadId,
  type CustomerThreadSummary,
} from '../lib/myCoachApi';
import { type Screen } from '../types';

export function MyCoachCustomersScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [threads, setThreads] = useState<CustomerThreadSummary[]>([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadThreads();
  }, []);

  async function loadThreads() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomerThreads();
      setThreads(data);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load customer threads.');
    } finally {
      setLoading(false);
    }
  }

  function openThread(thread: CustomerThreadSummary) {
    clearRememberedSessionId();
    rememberSelectedThreadId(thread.id);
    onNavigate('my_coach');
  }

  function startNewVisit(thread: CustomerThreadSummary) {
    clearRememberedSessionId();
    clearRememberedReportId();
    rememberSelectedThreadId(thread.id);
    clearDraftSessionTitle();
    rememberDraftSessionTitle(`${thread.customerName} follow-up visit`);
    rememberFlowOrigin('live_session');
    rememberStepsFocus('capture');
    onNavigate('my_coach_recording');
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-5xl space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('my_coach')}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to My Coach
        </button>

        <section className="rounded-[30pt] border border-white/8 bg-[linear-gradient(135deg,#0f1522_0%,#182132_48%,#1a1d28_100%)] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary/90">Customer List</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-white">Customer Threads</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66">
            Keep the saved customers on their own page so the main My Coach workspace stays short. Open any thread to
            continue, or start a fresh visit when the customer comes back.
          </p>
        </section>

        <section className="rounded-[28pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Saved Customers</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                Resume the current thread or start a new visit draft for returning customers.
              </p>
            </div>
            <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/68">
              {threads.length} saved
            </div>
          </div>

          <div className="mt-5 space-y-3">
            {!loading && !threads.length ? (
              <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/48">
                No customer threads yet.
              </div>
            ) : (
              threads.map((thread) => (
                <article
                  key={thread.id}
                  className="rounded-[24pt] border border-white/8 bg-black/12 px-4 py-4 shadow-[0_12px_32px_rgba(0,0,0,0.16)]"
                >
                  <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
                    <div className="max-w-2xl">
                      <div className="flex flex-wrap items-center gap-3">
                        <h2 className="font-headline text-xl font-bold text-on-surface">{thread.customerName}</h2>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/54">
                          {thread.badge}
                        </span>
                        <span className="rounded-full border border-white/10 bg-white/5 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/54">
                          {thread.lastVisitLabel}
                        </span>
                      </div>
                      <p className="mt-3 text-sm leading-6 text-white/62">{thread.vehicleIntent}</p>
                      <div className="mt-3 flex flex-wrap gap-2">
                        {thread.unresolvedItems.slice(0, 2).map((item) => (
                          <span
                            key={`${thread.id}-${item}`}
                            className="rounded-full border border-secondary/18 bg-secondary/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-secondary"
                          >
                            {item}
                          </span>
                        ))}
                      </div>
                    </div>

                    <div className="flex flex-wrap gap-2 lg:justify-end">
                      <button
                        type="button"
                        onClick={() => openThread(thread)}
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74"
                      >
                        Resume
                      </button>
                      <button
                        type="button"
                        onClick={() => startNewVisit(thread)}
                        className="rounded-full bg-primary px-4 py-3 text-[11px] font-bold uppercase tracking-[0.16em] text-on-primary-fixed"
                      >
                        New Visit
                      </button>
                    </div>
                  </div>
                </article>
              ))
            )}
          </div>
        </section>

        {error ? (
          <div className="rounded-full border border-error/30 bg-error-container/95 px-5 py-3 text-sm text-on-error-container">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}
