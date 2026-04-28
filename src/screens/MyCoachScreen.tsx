import { type ChangeEvent, type FormEvent, useEffect, useMemo, useRef, useState } from 'react';
import {
  clearDraftSessionTitle,
  clearRememberedReportId,
  clearRememberedSessionId,
  clearRememberedStepsFocus,
  createCustomerThread,
  listCustomerThreads,
  rememberDraftSessionTitle,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  rememberStepsFocus,
  stagePendingLiveSessionSubmission,
  submitManualConversation,
  type AudioClipPayload,
  type CustomerThreadSummary,
  type ManualConversationInput,
} from '../lib/myCoachApi';
import { type Screen } from '../types';
import { useApp } from '../contexts/AppContext';

const emptyThreadForm = { customerName: '', phone: '', customerContext: '', preferredLanguage: '', notes: '' };
const emptyManualForm: ManualConversationInput = {
  customerName: '',
  carDiscussed: '',
  whatWentWell: '',
  objectionsRaised: '',
  outcome: 'Follow-up',
  notes: '',
};

type LocalFilePickerHandle = {
  getFile: () => Promise<File>;
};

type UploadWindow = Window & {
  showOpenFilePicker?: (options?: {
    multiple?: boolean;
    excludeAcceptAllOption?: boolean;
    types?: Array<{
      description?: string;
      accept: Record<string, string[]>;
    }>;
  }) => Promise<LocalFilePickerHandle[]>;
};
type SessionLaunchMode = 'recorded' | 'uploaded';

export function MyCoachScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { bootstrap } = useApp();
  const [threads, setThreads] = useState<CustomerThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(null);
  const [loading, setLoading] = useState(true);
  const [savingThread, setSavingThread] = useState(false);
  const [uploading, setUploading] = useState(false);
  const [submittingManual, setSubmittingManual] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [threadForm, setThreadForm] = useState(emptyThreadForm);
  const [manualForm, setManualForm] = useState(emptyManualForm);
  const [sessionSheetMode, setSessionSheetMode] = useState<SessionLaunchMode | null>(null);
  const [manualSheetOpen, setManualSheetOpen] = useState(false);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const pendingUploadThreadRef = useRef<CustomerThreadSummary | null>(null);

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (!successMessage) return;
    const timeoutId = window.setTimeout(() => setSuccessMessage(null), 3200);
    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  const activeThread = useMemo(
    () => threads.find((thread) => thread.id === selectedThreadId) ?? threads[0] ?? null,
    [selectedThreadId, threads],
  );
  const readiness = bootstrap?.readiness;
  const readinessCars = readiness?.models ?? [];

  useEffect(() => {
    if (!manualForm.carDiscussed && readinessCars[0]?.modelName) {
      setManualForm((current) => ({ ...current, carDiscussed: readinessCars[0]?.modelName || '' }));
    }
  }, [manualForm.carDiscussed, readinessCars]);

  async function loadThreads() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomerThreads();
      setThreads(data);
      setSelectedThreadId((current) => current && data.some((thread) => thread.id === current) ? current : data[0]?.id ?? null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load My Coach.');
    } finally {
      setLoading(false);
    }
  }

  async function handleCreateThread(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!threadForm.customerName.trim() || !threadForm.customerContext.trim()) {
      setError('Customer name and need summary are required.');
      return;
    }

    setSavingThread(true);
    setError(null);

    try {
      const created = await createCustomerThread(threadForm);
      setThreads((current) => [created, ...current.filter((thread) => thread.id !== created.id)]);
      setSelectedThreadId(created.id);
      setThreadForm(emptyThreadForm);
      setSuccessMessage('Customer thread created.');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not create the customer thread.');
    } finally {
      setSavingThread(false);
    }
  }

  async function handleStartNewCustomer() {
    setError(null);
    try {
      const created = await createCustomerThread({
        customerName: 'Walk-in Customer',
        phone: '',
        customerContext: 'New showroom walk-in conversation',
        notes: 'Created from Start Session quick action.',
      });

      setThreads((current) => [created, ...current.filter((thread) => thread.id !== created.id)]);
      setSelectedThreadId(created.id);
      rememberSelectedThreadId(created.id);
      rememberDraftSessionTitle('Walk-in customer first visit');
      clearRememberedSessionId();
      clearRememberedReportId();
      rememberFlowOrigin('live_session');
      setSessionSheetMode(null);
      onNavigate('my_coach_recording');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not start a new customer session.');
    }
  }

  function handleContinueSession() {
    if (!activeThread) {
      setError('Choose a customer or start a new one first.');
      return;
    }

    rememberSelectedThreadId(activeThread.id);
    rememberDraftSessionTitle(
      `${activeThread.customerName} ${activeThread.hasSubmittedSession ? 'follow-up visit' : 'first visit'}`,
    );
    clearRememberedSessionId();
    clearRememberedReportId();
    rememberFlowOrigin('live_session');
    setSessionSheetMode(null);
    onNavigate('my_coach_recording');
  }

  async function handleUploadNewCustomer() {
    setError(null);
    try {
      const created = await createCustomerThread({
        customerName: 'Walk-in Customer',
        phone: '',
        customerContext: 'Uploaded showroom conversation',
        notes: 'Created from Upload Session.',
      });

      setThreads((current) => [created, ...current.filter((thread) => thread.id !== created.id)]);
      setSelectedThreadId(created.id);
      setSessionSheetMode(null);
      await triggerLocalFilePicker(created);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not start a new uploaded customer session.');
    }
  }

  async function handleUploadExistingCustomer() {
    if (!activeThread) {
      setError('Choose a customer or start a new one first.');
      return;
    }

    setSessionSheetMode(null);
    await triggerLocalFilePicker(activeThread);
  }

  async function handleManualSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!manualForm.customerName.trim() || !manualForm.carDiscussed.trim() || !manualForm.whatWentWell.trim()) {
      setError('Customer name, car discussed, and key moments are required.');
      return;
    }

    setSubmittingManual(true);
    setError(null);

    try {
      const result = await submitManualConversation(manualForm);
      rememberFlowOrigin('report_library');
      rememberSelectedThreadId(result.thread.id);
      rememberSelectedSessionId(result.session.id);
      rememberSelectedReportId(result.report.id);
      setThreads((current) => [result.thread, ...current.filter((thread) => thread.id !== result.thread.id)]);
      setSelectedThreadId(result.thread.id);
      setManualSheetOpen(false);
      setManualForm(emptyManualForm);
      setSuccessMessage('Manual conversation logged.');
      onNavigate('my_coach_report_detail');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not create the manual conversation report.');
    } finally {
      setSubmittingManual(false);
    }
  }

  async function stageUploadedFiles(files: File[], threadOverride?: CustomerThreadSummary | null) {
    if (!files.length) {
      pendingUploadThreadRef.current = null;
      return;
    }
    const targetThread = threadOverride ?? pendingUploadThreadRef.current ?? activeThread;
    if (!targetThread) {
      setError('Choose a customer before uploading audio.');
      return;
    }

    setUploading(true);
    setError(null);

    try {
      const clips: AudioClipPayload[] = await Promise.all(
        files.map(async (file) => ({
          fileName: file.name,
          mimeType: file.type || 'audio/webm',
          base64: await fileLikeToBase64(file),
          source: 'uploaded',
        })),
      );

      setSelectedThreadId(targetThread.id);
      rememberSelectedThreadId(targetThread.id);
      rememberDraftSessionTitle(`${targetThread.customerName} uploaded session`);
      clearRememberedSessionId();
      clearRememberedReportId();
      rememberFlowOrigin('live_session');
      stagePendingLiveSessionSubmission({
        customerId: targetThread.id,
        title: `${targetThread.customerName} uploaded session`,
        source: 'uploaded',
        clips,
      });
      pendingUploadThreadRef.current = null;
      onNavigate('my_coach_processing');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not prepare the selected audio files.');
    } finally {
      setUploading(false);
    }
  }

  async function triggerLocalFilePicker(targetThread: CustomerThreadSummary) {
    if (uploading) return;
    const uploadWindow = window as UploadWindow;
    pendingUploadThreadRef.current = targetThread;
    setSelectedThreadId(targetThread.id);
    rememberSelectedThreadId(targetThread.id);

    if (uploadWindow.showOpenFilePicker) {
      try {
        const handles = await uploadWindow.showOpenFilePicker({
          multiple: true,
          types: [{ description: 'Audio files', accept: { 'audio/*': ['.mp3', '.wav', '.m4a', '.aac', '.ogg', '.webm', '.mp4'] } }],
        });
        const files = await Promise.all(handles.map((handle) => handle.getFile()));
        await stageUploadedFiles(files, targetThread);
      } catch (issue) {
        pendingUploadThreadRef.current = null;
        if (issue instanceof DOMException && issue.name === 'AbortError') return;
        setError(issue instanceof Error ? issue.message : 'Could not open the local file picker.');
      }
      return;
    }

    uploadInputRef.current?.click();
  }

  async function handleUploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';
    await stageUploadedFiles(files);
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

  function openRecommendations() {
    if (activeThread?.id) {
      rememberSelectedThreadId(activeThread.id);
    }
    onNavigate('my_coach_recommendations');
  }

  const quickTools = [
    {
      label: 'Customers',
      detail: `${threads.length || 0} saved`,
      icon: 'groups',
      onClick: () => onNavigate('my_coach_customers'),
      disabled: false,
    },
    {
      label: 'Reports',
      detail: 'Coaching summaries',
      icon: 'description',
      onClick: openReports,
      disabled: false,
    },
    {
      label: 'Recommendations',
      detail: 'Next best moves',
      icon: 'lightbulb',
      onClick: openRecommendations,
      disabled: false,
    },
    {
      label: 'Transcript',
      detail: activeThread?.hasSubmittedSession ? 'Latest session' : 'Available after a session',
      icon: 'notes',
      onClick: openTranscript,
      disabled: !activeThread?.hasSubmittedSession,
    },
    {
      label: 'Steps',
      detail: activeThread ? 'Tutorial flow' : 'Pick a customer first',
      icon: 'list_alt',
      onClick: openStepsGuide,
      disabled: !activeThread,
    },
  ];

  return (
    <main className="mx-auto max-w-[1240px] space-y-6 px-6 pb-32 pt-24">
      <section className="relative overflow-hidden rounded-[28pt] border border-white/8 bg-[linear-gradient(135deg,#0f1522_0%,#162031_44%,#1c1d25_100%)] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.24),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.14),transparent_35%)]"></div>
        <div className="relative z-10">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/72"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </button>

          <h1 className="mt-4 font-headline text-4xl font-bold tracking-tight text-white md:text-5xl">My Coach</h1>
          <p className="mt-3 max-w-3xl text-sm leading-6 text-white/66 md:text-base">
            Capture stronger showroom conversations, turn them into usable coaching, and keep your readiness moving with the right evidence.
          </p>

          <div className="mt-5 grid gap-3">
            <ActionButton label="Start Session" icon="mic" onClick={() => setSessionSheetMode('recorded')} tone="primary" />
            <ActionButton
              label={uploading ? 'Preparing Upload…' : 'Upload Session'}
              icon="upload_file"
              onClick={() => setSessionSheetMode('uploaded')}
            />
            <ActionButton label="Add Conversation Points" icon="edit_square" onClick={() => setManualSheetOpen(true)} />
            <input ref={uploadInputRef} type="file" multiple accept="audio/*" onChange={(event) => void handleUploadFiles(event)} className="hidden" />
          </div>

          <div className="mt-5 space-y-4">
            <div className="rounded-[24px] border border-white/8 bg-black/12 p-3">
              <div className="mb-3 flex items-center justify-between gap-3 px-1">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">Workspace Tools</p>
                </div>
                <span className="rounded-full border border-white/10 bg-white/[0.04] px-2.5 py-1 text-[10px] uppercase tracking-[0.16em] text-white/42 sm:hidden">
                  Swipe
                </span>
              </div>
              <div className="-mx-1 flex gap-3 overflow-x-auto px-1 pb-1 [scrollbar-width:none] [&::-webkit-scrollbar]:hidden">
                {loading
                  ? Array.from({ length: quickTools.length }, (_, index) => <QuickToolCardSkeleton key={`quick-tool-skeleton-${index}`} />)
                  : quickTools.map((tool) => (
                      <QuickToolCard
                        key={tool.label}
                        label={tool.label}
                        detail={tool.detail}
                        icon={tool.icon}
                        onClick={tool.onClick}
                        disabled={tool.disabled}
                      />
                    ))}
              </div>
            </div>

            <div className="grid gap-3 sm:grid-cols-3">
              {loading
                ? Array.from({ length: 2 }, (_, index) => <HeroMetricSkeleton key={`hero-metric-skeleton-${index}`} />)
                : [
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
        </div>
      </section>

      <section className="rounded-[26pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <div className="max-w-2xl">
          <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Create Customer Thread</p>
          <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface">Create, then drop straight into the visit</h2>
          <p className="mt-3 text-sm leading-6 text-white/62">
            Keep intake lean. Create a thread when you already know the customer, or use Start Session when you need to capture a fresh walk-in first.
          </p>
        </div>

        <form onSubmit={handleCreateThread} className="mt-5 space-y-3">
          <div className="grid gap-3 lg:grid-cols-2">
            <input
              value={threadForm.customerName}
              onChange={(event) => setThreadForm((current) => ({ ...current, customerName: event.target.value }))}
              placeholder="Customer name"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <input
              value={threadForm.phone}
              onChange={(event) => setThreadForm((current) => ({ ...current, phone: event.target.value }))}
              placeholder="Phone number (optional)"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <input
              value={threadForm.customerContext}
              onChange={(event) => setThreadForm((current) => ({ ...current, customerContext: event.target.value }))}
              placeholder="Need summary or customer context"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <input
              value={threadForm.preferredLanguage}
              onChange={(event) => setThreadForm((current) => ({ ...current, preferredLanguage: event.target.value }))}
              placeholder="Language (optional)"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <textarea
              value={threadForm.notes}
              onChange={(event) => setThreadForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Optional visit notes"
              rows={3}
              className="w-full rounded-[22px] border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none lg:col-span-2"
            />
          </div>

          <div className="flex justify-end">
            <button
              type="submit"
              disabled={savingThread}
              className="rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed disabled:opacity-60"
            >
              {savingThread ? 'Creating thread…' : 'Create thread'}
            </button>
          </div>
        </form>
      </section>

      {sessionSheetMode ? (
        <Sheet title="Who is this session for?" onClose={() => setSessionSheetMode(null)}>
          <div className="space-y-3">
            <button
              type="button"
              onClick={() => void (sessionSheetMode === 'uploaded' ? handleUploadNewCustomer() : handleStartNewCustomer())}
              className="w-full rounded-[22px] border border-white/10 bg-white/[0.05] p-4 text-left"
            >
              <p className="font-headline text-xl font-bold text-white">New Customer</p>
              <p className="mt-2 text-sm leading-6 text-white/62">
                {sessionSheetMode === 'uploaded'
                  ? 'Create a fresh thread, then attach the saved audio files for that visit.'
                  : 'Start a fresh showroom conversation and capture the customer context from the visit.'}
              </p>
            </button>
            {activeThread ? (
              <button
                type="button"
                onClick={() => void (sessionSheetMode === 'uploaded' ? handleUploadExistingCustomer() : handleContinueSession())}
                className="w-full rounded-[22px] border border-[#8fb9ff]/24 bg-[#8fb9ff]/10 p-4 text-left"
              >
                <p className="font-headline text-xl font-bold text-white">Continue with {activeThread.customerName}</p>
                <p className="mt-2 text-sm leading-6 text-white/62">
                  {sessionSheetMode === 'uploaded'
                    ? 'Attach the saved audio to the current customer thread so the upload stays linked to their history.'
                    : 'Resume in the context of the latest customer thread and keep the session linked to their history.'}
                </p>
              </button>
            ) : null}
          </div>
        </Sheet>
      ) : null}

      {manualSheetOpen ? (
        <Sheet title="Add Conversation Points" onClose={() => setManualSheetOpen(false)}>
          <form onSubmit={handleManualSubmit} className="space-y-3">
            <input
              value={manualForm.customerName}
              onChange={(event) => setManualForm((current) => ({ ...current, customerName: event.target.value }))}
              placeholder="Customer name"
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <select
              value={manualForm.carDiscussed}
              onChange={(event) => setManualForm((current) => ({ ...current, carDiscussed: event.target.value }))}
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface focus:border-primary/40 focus:outline-none"
            >
              {readinessCars.map((car) => (
                <option key={car.id} value={car.modelName}>{car.modelName}</option>
              ))}
            </select>
            <textarea
              value={manualForm.whatWentWell}
              onChange={(event) => setManualForm((current) => ({ ...current, whatWentWell: event.target.value }))}
              placeholder="What went well"
              rows={3}
              className="w-full rounded-[22px] border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <textarea
              value={manualForm.objectionsRaised}
              onChange={(event) => setManualForm((current) => ({ ...current, objectionsRaised: event.target.value }))}
              placeholder="Objections raised"
              rows={3}
              className="w-full rounded-[22px] border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <select
              value={manualForm.outcome}
              onChange={(event) => setManualForm((current) => ({ ...current, outcome: event.target.value as ManualConversationInput['outcome'] }))}
              className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface focus:border-primary/40 focus:outline-none"
            >
              {['Test drive', 'Quote given', 'Follow-up', 'Walked away', 'Undecided'].map((option) => (
                <option key={option} value={option}>{option}</option>
              ))}
            </select>
            <textarea
              value={manualForm.notes}
              onChange={(event) => setManualForm((current) => ({ ...current, notes: event.target.value }))}
              placeholder="Any other notes"
              rows={3}
              className="w-full rounded-[22px] border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none"
            />
            <button
              type="submit"
              disabled={submittingManual}
              className="w-full rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed disabled:opacity-60"
            >
              {submittingManual ? 'Generating report…' : 'Create manual report'}
            </button>
          </form>
        </Sheet>
      ) : null}

      {error ? <Banner tone="error" text={error} /> : successMessage ? <Banner tone="success" text={successMessage} /> : null}
    </main>
  );
}

function ActionButton({
  label,
  icon,
  onClick,
  tone = 'default',
}: {
  label: string;
  icon: string;
  onClick: () => void;
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
      className={`inline-flex items-center justify-between gap-2 rounded-[22px] border px-5 py-4 text-xs font-bold uppercase tracking-[0.16em] transition ${toneClasses}`}
    >
      {label}
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
    </button>
  );
}

function QuickToolCard({
  label,
  detail,
  icon,
  onClick,
  disabled = false,
}: {
  label: string;
  detail: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="group min-w-[148px] shrink-0 rounded-[20px] border border-white/10 bg-white/[0.04] p-4 text-left transition hover:bg-white/[0.07] disabled:cursor-not-allowed disabled:opacity-45"
    >
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-[0.16em] text-white/88">{label}</p>
          <p className="mt-2 text-xs leading-5 text-white/46">{detail}</p>
        </div>
        <span className="material-symbols-outlined text-[18px] text-white/42 transition group-hover:text-white/72">{icon}</span>
      </div>
    </button>
  );
}

function HeroMetricSkeleton() {
  return (
    <div className="rounded-[18pt] border border-white/8 bg-black/18 px-4 py-4">
      <div className="h-5 w-28 rounded bg-white/[0.08]"></div>
      <div className="mt-3 h-3 w-20 rounded bg-white/[0.05]"></div>
    </div>
  );
}

function QuickToolCardSkeleton() {
  return (
    <div className="min-w-[148px] shrink-0 rounded-[20px] border border-white/10 bg-white/[0.04] p-4">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <div className="h-3 w-16 rounded bg-white/[0.1]"></div>
          <div className="mt-3 h-3 w-24 rounded bg-white/[0.06]"></div>
          <div className="mt-2 h-3 w-20 rounded bg-white/[0.05]"></div>
        </div>
        <div className="h-[18px] w-[18px] rounded-full border border-white/8 bg-white/[0.05]"></div>
      </div>
    </div>
  );
}

function Sheet({ title, children, onClose }: { title: string; children: React.ReactNode; onClose: () => void }) {
  return (
    <div className="fixed inset-0 z-[80] flex flex-col justify-end">
      <button type="button" onClick={onClose} className="absolute inset-0 bg-black/60 backdrop-blur-[2px]" aria-label="Close sheet" />
      <div className="relative z-10 rounded-t-[30px] border border-white/10 bg-[#171b24] p-5 shadow-[0_-24px_80px_rgba(0,0,0,0.48)]">
        <div className="mx-auto mb-4 h-1.5 w-12 rounded-full bg-white/14"></div>
        <div className="mb-4 flex items-center justify-between gap-4">
          <h2 className="font-headline text-2xl font-bold text-white">{title}</h2>
          <button type="button" onClick={onClose} className="rounded-full border border-white/10 bg-white/5 p-2 text-white/74">
            <span className="material-symbols-outlined text-[18px]">close</span>
          </button>
        </div>
        {children}
      </div>
    </div>
  );
}

function fileLikeToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result.split(',')[1] ?? '' : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function Banner({ text, tone }: { text: string; tone: 'error' | 'success' }) {
  const toneClasses =
    tone === 'error'
      ? 'border-error/30 bg-error-container/95 text-on-error-container'
      : 'border-primary/20 bg-primary-container/90 text-on-primary-fixed';

  return (
    <div
      className={`fixed bottom-6 left-1/2 z-[90] w-[min(92vw,720px)] -translate-x-1/2 rounded-full px-5 py-3 text-sm shadow-[0_20px_60px_rgba(0,0,0,0.35)] ${toneClasses}`}
    >
      {text}
    </div>
  );
}
