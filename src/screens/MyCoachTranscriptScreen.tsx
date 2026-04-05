import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import {
  getTranscriptUnavailableMessage,
  getCustomerThread,
  hasUsableTranscript,
  listCustomerThreads,
  readFlowOrigin,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  readRememberedSessionId,
  readRememberedThreadId,
  type CoachSessionSummary,
  type CustomerThreadDetail,
  type CustomerThreadSummary,
} from '../lib/myCoachApi';
import { type Screen } from '../types';

export function MyCoachTranscriptScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [threads, setThreads] = useState<CustomerThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(readRememberedThreadId());
  const [detail, setDetail] = useState<CustomerThreadDetail | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(readRememberedSessionId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (!selectedThreadId) return;
    void loadDetail(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    if (selectedThreadId) {
      rememberSelectedThreadId(selectedThreadId);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (selectedSessionId) {
      rememberSelectedSessionId(selectedSessionId);
    }
  }, [selectedSessionId]);

  const activeSession =
    detail?.sessions.find((session) => session.id === selectedSessionId) ?? detail?.sessions[0] ?? null;
  const transcriptUnavailable = Boolean(activeSession?.report) && !hasUsableTranscript(activeSession?.transcript);

  async function loadThreads() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomerThreads();
      setThreads(data);
      setSelectedThreadId((current) => current ?? data[0]?.id ?? null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load customer threads.');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(threadId: string) {
    try {
      const nextDetail = await getCustomerThread(threadId);
      setDetail(nextDetail);
      const rememberedSessionId = readRememberedSessionId();
      setSelectedSessionId((current) =>
        (current && nextDetail.sessions.some((session) => session.id === current) && current) ||
        (rememberedSessionId && nextDetail.sessions.some((session) => session.id === rememberedSessionId)
          ? rememberedSessionId
          : null) ||
        (nextDetail.sessions[0]?.id ?? null),
      );
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load transcript history.');
    }
  }

  function openReport(session: CoachSessionSummary) {
    if (!session.report?.id) return;
    const nextFlowOrigin = readFlowOrigin();
    rememberFlowOrigin(
      nextFlowOrigin === 'report_library' || nextFlowOrigin === 'live_session' ? nextFlowOrigin : 'tutorial',
    );
    rememberSelectedThreadId(session.customerId);
    rememberSelectedSessionId(session.id);
    rememberSelectedReportId(session.report.id);
    onNavigate('my_coach_report_detail');
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-6xl space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('my_coach')}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to My Coach
        </button>

        <section className="rounded-[30pt] border border-white/8 bg-[linear-gradient(135deg,#0f1522_0%,#182132_48%,#1a1d28_100%)] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-primary/90">Show Transcript</p>
          <h1 className="mt-3 font-headline text-4xl font-bold tracking-tight text-white">Conversation Transcript</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66">
            This page keeps only the customer, visit selector, and transcript so the salesperson can focus on what was
            actually said without scrolling through the full dashboard.
          </p>
        </section>

        <section className="rounded-[28pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
          <div className="flex flex-col gap-4 lg:flex-row lg:items-start lg:justify-between">
            <div className="max-w-2xl">
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Customer</p>
              <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface">
                {detail?.customerName ?? 'Select a customer thread'}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/58">
                {detail?.summary ?? 'Pick the customer thread you want to inspect. The most recent session opens first.'}
              </p>
            </div>
            {activeSession?.report ? (
              <button
                type="button"
                onClick={() => openReport(activeSession)}
                className="inline-flex items-center gap-2 self-start rounded-full bg-secondary px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-secondary-fixed"
              >
                Open report
                <span className="material-symbols-outlined text-[16px]">description</span>
              </button>
            ) : null}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {threads.map((thread) => (
              <button
                key={thread.id}
                type="button"
                onClick={() => setSelectedThreadId(thread.id)}
                className={`rounded-full px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] ${
                  selectedThreadId === thread.id
                    ? 'border border-primary/24 bg-primary/12 text-primary'
                    : 'border border-white/10 bg-white/5 text-white/68'
                }`}
              >
                {thread.customerName}
              </button>
            ))}
          </div>

          <div className="mt-5 flex flex-wrap gap-2">
            {detail?.sessions.length ? (
              detail.sessions.map((session) => (
                <button
                  key={session.id}
                  type="button"
                  onClick={() => setSelectedSessionId(session.id)}
                  className={`rounded-[18pt] px-4 py-3 text-left ${
                    activeSession?.id === session.id
                      ? 'border border-secondary/24 bg-secondary/12 text-on-surface'
                      : 'border border-white/8 bg-black/12 text-white/72'
                  }`}
                >
                  <p className="font-headline text-sm font-bold">{session.title}</p>
                  <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/46">
                    {session.status} | {session.clipCount} clip{session.clipCount === 1 ? '' : 's'}
                  </p>
                </button>
              ))
            ) : (
              <div className="rounded-[20pt] border border-dashed border-white/10 px-4 py-8 text-sm text-white/48">
                No sessions yet for this customer.
              </div>
            )}
          </div>
        </section>

        <section className="rounded-[28pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
          <div className="flex items-center justify-between gap-3">
            <div>
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Transcript Timeline</p>
              <p className="mt-2 text-sm leading-6 text-white/58">
                {activeSession
                  ? `Showing ${activeSession.title}.`
                  : 'Choose a session to review the transcript line by line.'}
              </p>
            </div>
            {activeSession?.report ? (
              <div className="rounded-full border border-secondary/24 bg-secondary/10 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-secondary">
                Score {activeSession.report.overallScore}
              </div>
            ) : null}
          </div>

          {transcriptUnavailable ? (
            <div className="mt-5 rounded-[22pt] border border-secondary/20 bg-secondary/10 px-4 py-4 text-sm leading-6 text-white/74">
              <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">Transcript unavailable</p>
              <p className="mt-2">{getTranscriptUnavailableMessage()}</p>
              <p className="mt-2 text-white/54">
                Try recording closer to the speaker, reducing background noise, or uploading a clearer clip next time.
              </p>
            </div>
          ) : null}

          <div className="mt-5 space-y-3 max-h-[60vh] overflow-y-auto pr-1 hide-scrollbar">
            {loading ? (
              <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/48">
                Loading transcript...
              </div>
            ) : activeSession?.transcript.length ? (
              activeSession.transcript.map((turn) => (
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
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/42">
                      {turn.speaker === 'unknown' ? 'speaker' : turn.speaker}
                    </span>
                    <span className="text-[10px] uppercase tracking-[0.16em] text-white/34">{turn.timestamp}</span>
                  </div>
                  <p className="mt-2 text-sm leading-6 text-white/74">{turn.text}</p>
                </motion.div>
              ))
            ) : transcriptUnavailable ? (
              <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/48">
                No transcript turns were returned for this completed session.
              </div>
            ) : (
              <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/48">
                Transcript turns will appear here after analysis.
              </div>
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
