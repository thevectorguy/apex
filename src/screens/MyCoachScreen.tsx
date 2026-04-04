import { type FormEvent, useEffect, useState } from 'react';
import {
  clearDraftSessionTitle,
  clearRememberedReportId,
  clearRememberedSessionId,
  clearRememberedStepsFocus,
  clearRememberedThreadId,
  createCustomerThread,
  listCustomerThreads,
  rememberFlowOrigin,
  rememberDraftSessionTitle,
  rememberSelectedThreadId,
  rememberStepsFocus,
  readRememberedThreadId,
  type CustomerThreadSummary,
} from '../lib/myCoachApi';
import { type Screen } from '../types';

const emptyForm = { customerName: '', phone: '', customerContext: '', notes: '' };

export function MyCoachScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [threads, setThreads] = useState<CustomerThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(readRememberedThreadId());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const activeThread = selectedThreadId ? threads.find((thread) => thread.id === selectedThreadId) ?? null : null;

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      rememberSelectedThreadId(selectedThreadId);
    }
  }, [selectedThreadId]);

  async function loadThreads() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomerThreads();
      setThreads(data);
      const rememberedThreadId = readRememberedThreadId();
      const resolvedThreadId =
        [selectedThreadId, rememberedThreadId].find((candidate) => candidate && data.some((thread) => thread.id === candidate)) ??
        data[0]?.id ??
        null;

      if (!resolvedThreadId) {
        clearRememberedThreadId();
      }

      setSelectedThreadId(resolvedThreadId);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load My Coach.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setSaving(true);
    setError(null);

    try {
      const created = await createCustomerThread(form);
      setThreads((current) => [created, ...current.filter((thread) => thread.id !== created.id)]);
      setForm(emptyForm);
      setSelectedThreadId(created.id);
      rememberSelectedThreadId(created.id);
      clearRememberedSessionId();
      clearRememberedReportId();
      clearDraftSessionTitle();
      rememberFlowOrigin('live_session');
      onNavigate('my_coach_recording');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not create the customer thread.');
    } finally {
      setSaving(false);
    }
  }

  function startLiveSession() {
    // TODO: Detect unfinished local capture state and offer "Resume draft session"
    // before starting a fresh visit for the remembered customer thread.
    if (activeThread?.id) {
      rememberSelectedThreadId(activeThread.id);
      rememberDraftSessionTitle(
        `${activeThread.customerName} ${activeThread.hasSubmittedSession ? 'follow-up visit' : 'first visit'}`,
      );
    }
    clearRememberedSessionId();
    clearRememberedReportId();
    rememberFlowOrigin('live_session');
    onNavigate('my_coach_recording');
  }

  function openStepsGuide() {
    if (activeThread?.id) {
      rememberSelectedThreadId(activeThread.id);
    }
    clearRememberedStepsFocus();
    rememberStepsFocus('capture');
    rememberFlowOrigin('tutorial');
    onNavigate('my_coach_steps');
  }

  function openTranscript() {
    if (activeThread?.id) {
      rememberSelectedThreadId(activeThread.id);
    }
    rememberFlowOrigin('tutorial');
    onNavigate('my_coach_transcript');
  }

  function openReports() {
    if (activeThread?.id) {
      rememberSelectedThreadId(activeThread.id);
    }
    onNavigate('my_coach_reports');
  }

  return (
    <main className="pt-24 px-6 pb-32 max-w-[1240px] mx-auto space-y-6">
      <section className="relative overflow-hidden rounded-[28pt] border border-white/8 bg-[linear-gradient(135deg,#0f1522_0%,#162031_44%,#1c1d25_100%)] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.14),transparent_35%)]"></div>
        <div className="relative z-10 flex flex-col gap-6 xl:flex-row xl:items-end xl:justify-between">
          <div className="max-w-3xl">
            <button
              type="button"
              onClick={() => onNavigate('dashboard')}
              className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/72"
            >
              <span className="material-symbols-outlined text-[16px]">arrow_back</span>
              Dashboard
            </button>
            <h1 className="mt-4 font-headline text-4xl font-bold tracking-tight text-white md:text-5xl">My Coach</h1>
            <p className="mt-3 text-sm leading-6 text-white/66 md:text-base">
              Keep this workspace focused on quick setup. Start a live session the moment a customer thread is ready,
              and keep Show Steps only as a tutorial for onboarding or demos.
            </p>
            <div className="mt-5 flex flex-wrap gap-3">
              <ActionButton label="Start Session" icon="mic" onClick={startLiveSession} disabled={!activeThread} tone="primary" />
              <ActionButton label="Customer List" icon="groups" onClick={() => onNavigate('my_coach_customers')} />
              <ActionButton label="Show Steps Tutorial" icon="list_alt" onClick={openStepsGuide} disabled={!activeThread} />
              <ActionButton
                label="Show Transcript"
                icon="notes"
                onClick={openTranscript}
                disabled={!activeThread?.hasSubmittedSession}
              />
              <ActionButton label="Reports" icon="description" onClick={openReports} />
            </div>
          </div>

          <div className="grid gap-3 sm:grid-cols-3">
            {[
              { label: 'Active customer', value: activeThread?.customerName ?? 'None' },
              { label: 'Saved customers', value: String(threads.length) },
            ].map((item) => (
              <div key={item.label} className="rounded-[18pt] border border-white/8 bg-black/18 px-4 py-4">
                <p className="font-headline text-sm font-bold text-white">{item.value}</p>
                <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/42">{item.label}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      <section className="rounded-[26pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="flex flex-col gap-5 lg:flex-row lg:items-start lg:justify-between">
          <div className="max-w-2xl">
            <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Create Customer Thread</p>
            <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface">Create, then drop straight into the visit</h2>
            <p className="mt-3 text-sm leading-6 text-white/62">
              Keep the intake lean here. As soon as the thread is created, the flow moves to the new immersive
              recording screen.
            </p>
          </div>
        </div>

        <form onSubmit={handleCreateThread} className="mt-5 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <input
              value={form.customerName}
              onChange={(event) => setForm((current) => ({ ...current, customerName: event.target.value }))}
              placeholder="Customer name"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <input
              value={form.phone}
              onChange={(event) => setForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Phone number"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <input
              value={form.customerContext}
              onChange={(event) => setForm((current) => ({ ...current, customerContext: event.target.value }))}
              placeholder="Customer context"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none lg:col-span-2"
            />
            <textarea
              value={form.notes}
              onChange={(event) => setForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional visit notes"
              rows={3}
              className="w-full rounded-[22px] border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none lg:col-span-2"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={saving}
              className="rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed disabled:opacity-60"
            >
              {saving ? 'Creating thread...' : 'Create thread and start session'}
            </button>
          </div>
        </form>
      </section>

      {error ? <Banner tone="error" text={error} /> : null}
    </main>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'default',
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary';
}) {
  const toneClasses =
    tone === 'primary'
      ? 'border-primary/24 bg-primary text-on-primary-fixed hover:bg-primary/90'
      : 'border-white/10 bg-white/5 text-white/74 hover:bg-white/8';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClasses}`}
    >
      {label}
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
    </button>
  );
}

function Banner({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  const toneClasses =
    tone === 'error'
      ? 'border-error/30 bg-error-container/95 text-on-error-container'
      : 'border-primary/20 bg-primary-container/90 text-on-primary-fixed';

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[80] w-[min(92vw,720px)] -translate-x-1/2 rounded-full px-5 py-3 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${toneClasses}`}
    >
      {text}
    </div>
  );
}
