import { type ChangeEvent, type FormEvent, useEffect, useRef, useState } from 'react';
import {
  clearDraftSessionTitle,
  clearRememberedStepsFocus,
  clearRememberedReportId,
  clearRememberedSessionId,
  clearRememberedThreadId,
  createCustomerThread,
  listCustomerThreads,
  rememberFlowOrigin,
  rememberDraftSessionTitle,
  rememberSelectedThreadId,
  rememberStepsFocus,
  readRememberedThreadId,
  stagePendingLiveSessionSubmission,
  type AudioClipPayload,
  type CustomerThreadSummary,
} from '../lib/myCoachApi';
import { type Screen } from '../types';

const emptyForm = { customerName: '', phone: '', customerContext: '', preferredLanguage: '', notes: '' };

export function MyCoachScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [threads, setThreads] = useState<CustomerThreadSummary[]>([]);
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(readRememberedThreadId());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [form, setForm] = useState(emptyForm);
  const [failedFields, setFailedFields] = useState<string[]>([]);
  const [animatingFields, setAnimatingFields] = useState<string[]>([]);
  const [uploadMenuOpen, setUploadMenuOpen] = useState(false);
  const [uploading, setUploading] = useState(false);
  const uploadMenuRef = useRef<HTMLDivElement | null>(null);
  const uploadInputRef = useRef<HTMLInputElement | null>(null);
  const activeThread = selectedThreadId ? threads.find((thread) => thread.id === selectedThreadId) ?? null : null;

  useEffect(() => {
    void loadThreads();
  }, []);

  useEffect(() => {
    if (selectedThreadId) {
      rememberSelectedThreadId(selectedThreadId);
    }
  }, [selectedThreadId]);

  useEffect(() => {
    if (!uploadMenuOpen) return;

    function handlePointerDown(event: MouseEvent) {
      if (!uploadMenuRef.current?.contains(event.target as Node)) {
        setUploadMenuOpen(false);
      }
    }

    function handleEscape(event: KeyboardEvent) {
      if (event.key === 'Escape') {
        setUploadMenuOpen(false);
      }
    }

    window.addEventListener('mousedown', handlePointerDown);
    window.addEventListener('keydown', handleEscape);
    return () => {
      window.removeEventListener('mousedown', handlePointerDown);
      window.removeEventListener('keydown', handleEscape);
    };
  }, [uploadMenuOpen]);

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
    
    const newFailedFields: string[] = [];
    if (!form.customerName.trim()) newFailedFields.push('customerName');
    if (!form.phone.trim()) newFailedFields.push('phone');
    if (!form.customerContext.trim()) newFailedFields.push('customerContext');

    if (newFailedFields.length > 0) {
      setFailedFields(newFailedFields);
      setAnimatingFields(newFailedFields);
      setTimeout(() => setAnimatingFields([]), 600);
      return;
    }
    setFailedFields([]);

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

  function buildDraftTitle() {
    if (!activeThread) return 'Customer conversation';
    return `${activeThread.customerName} ${activeThread.hasSubmittedSession ? 'follow-up visit' : 'first visit'}`;
  }

  function openUploadMenu() {
    if (!activeThread || uploading) return;
    setUploadMenuOpen((current) => !current);
  }

  function triggerUploadPicker() {
    if (!activeThread || uploading) return;
    setUploadMenuOpen(false);
    uploadInputRef.current?.click();
  }

  async function handleUploadFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    event.target.value = '';

    if (!activeThread?.id || !files.length) {
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

      rememberSelectedThreadId(activeThread.id);
      rememberDraftSessionTitle(buildDraftTitle());
      clearRememberedSessionId();
      clearRememberedReportId();
      clearRememberedStepsFocus();
      rememberFlowOrigin('live_session');
      stagePendingLiveSessionSubmission({
        customerId: activeThread.id,
        title: buildDraftTitle(),
        source: 'uploaded',
        clips,
      });
      onNavigate('my_coach_processing');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not prepare the selected audio files.');
    } finally {
      setUploading(false);
    }
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
              or upload an existing conversation when you want backend transcription to handle the session.
            </p>
            <div className="mt-5 space-y-4">
              <div className="grid gap-3 sm:max-w-[34rem] sm:grid-cols-2">
                <ActionButton
                  label="Start Session"
                  icon="mic"
                  onClick={startLiveSession}
                  disabled={!activeThread}
                  tone="primary"
                  className="w-full justify-between rounded-[22px] px-5 py-4"
                />
                <div ref={uploadMenuRef} className="relative">
                  <ActionButton
                    label={uploading ? 'Preparing Upload...' : 'Upload Session'}
                    icon="upload_file"
                    onClick={openUploadMenu}
                    disabled={!activeThread || uploading}
                    className="w-full justify-between rounded-[22px] px-5 py-4"
                  />
                  {uploadMenuOpen ? (
                    <div className="absolute bottom-[calc(100%+0.6rem)] left-0 z-20 min-w-[220px] rounded-[22px] border border-white/10 bg-[#141925]/95 p-2 shadow-[0_24px_60px_rgba(0,0,0,0.38)] backdrop-blur-xl">
                      <button
                        type="button"
                        onClick={triggerUploadPicker}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/6"
                      >
                        <span>Files</span>
                        <span className="material-symbols-outlined text-[18px] text-white/48">folder</span>
                      </button>
                      <button
                        type="button"
                        onClick={triggerUploadPicker}
                        className="flex w-full items-center justify-between rounded-2xl px-4 py-3 text-left text-sm text-white transition hover:bg-white/6"
                      >
                        <span>Drive / Cloud</span>
                        <span className="material-symbols-outlined text-[18px] text-white/48">cloud_upload</span>
                      </button>
                      <p className="px-4 pb-2 pt-1 text-[10px] uppercase tracking-[0.16em] text-white/36">
                        The system picker will show available providers.
                      </p>
                    </div>
                  ) : null}
                  <input
                    ref={uploadInputRef}
                    type="file"
                    multiple
                    accept="audio/*"
                    onChange={(event) => void handleUploadFiles(event)}
                    className="hidden"
                  />
                </div>
              </div>

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
                  {quickTools.map((tool) => (
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
              onChange={(event) => {
                setForm((current) => ({ ...current, customerName: event.target.value }));
                if (failedFields.includes('customerName')) setFailedFields((current) => current.filter((f) => f !== 'customerName'));
              }}
              placeholder="Customer name"
              className={`w-full rounded-2xl border bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none transition-colors ${
                failedFields.includes('customerName') ? 'border-error/80' : 'border-white/8'
              } ${animatingFields.includes('customerName') ? 'animate-shake' : ''}`}
            />
            <input
              value={form.phone}
              onChange={(event) => {
                setForm((current) => ({ ...current, phone: event.target.value }));
                if (failedFields.includes('phone')) setFailedFields((current) => current.filter((f) => f !== 'phone'));
              }}
              placeholder="Phone number"
              className={`w-full rounded-2xl border bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none transition-colors ${
                failedFields.includes('phone') ? 'border-error/80' : 'border-white/8'
              } ${animatingFields.includes('phone') ? 'animate-shake' : ''}`}
            />
            <input
              value={form.customerContext}
              onChange={(event) => {
                setForm((current) => ({ ...current, customerContext: event.target.value }));
                if (failedFields.includes('customerContext')) setFailedFields((current) => current.filter((f) => f !== 'customerContext'));
              }}
              placeholder="Need summary or customer context"
              className={`w-full rounded-2xl border bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none transition-colors ${
                failedFields.includes('customerContext') ? 'border-error/80' : 'border-white/8'
              } ${animatingFields.includes('customerContext') ? 'animate-shake' : ''}`}
            />
            <LanguagePickerSheet
              value={form.preferredLanguage}
              onChange={(val) => setForm((current) => ({ ...current, preferredLanguage: val }))}
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

function fileLikeToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result.split(',')[1] ?? '' : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}

function ActionButton({
  label,
  icon,
  onClick,
  disabled = false,
  tone = 'default',
  className = '',
}: {
  label: string;
  icon: string;
  onClick: () => void;
  disabled?: boolean;
  tone?: 'default' | 'primary';
  className?: string;
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
      className={`inline-flex items-center gap-2 rounded-full border px-4 py-2 text-xs font-bold uppercase tracking-[0.16em] transition disabled:cursor-not-allowed disabled:opacity-45 ${toneClasses} ${className}`}
    >
      {label}
      <span className="material-symbols-outlined text-[16px]">{icon}</span>
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

function LanguagePickerSheet({
  value,
  onChange,
}: {
  value: string;
  onChange: (val: string) => void;
}) {
  const [isOpen, setIsOpen] = useState(false);
  const [isClosing, setIsClosing] = useState(false);

  function handleClose() {
    setIsClosing(true);
    setTimeout(() => {
      setIsOpen(false);
      setIsClosing(false);
    }, 400);
  }

  const languages = [
    { label: 'English', value: 'English' },
    { label: 'Hindi', value: 'Hindi' },
    { label: 'Marathi', value: 'Marathi' },
    { label: 'Gujarati', value: 'Gujarati' },
    { label: 'Tamil', value: 'Tamil' },
    { label: 'Telugu', value: 'Telugu' },
    { label: 'Kannada', value: 'Kannada' },
    { label: 'Malayalam', value: 'Malayalam' },
    { label: 'Bengali', value: 'Bengali' },
    { label: 'Punjabi', value: 'Punjabi' },
    { label: 'Odia', value: 'Odia' },
  ];

  return (
    <div className="relative w-full">
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="flex w-full items-center justify-between rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm focus:border-primary/40 focus:outline-none"
      >
        <span className={`text-left truncate ${value ? 'text-on-surface' : 'text-white/32'}`}>
          {value || 'Language'}
        </span>
        <span className="material-symbols-outlined shrink-0 text-[18px] text-white/40">expand_more</span>
      </button>

      {(isOpen || isClosing) && (
        <div className="fixed inset-0 z-[100] flex flex-col justify-end">
          <button
            type="button"
            className={`absolute inset-0 w-full h-full cursor-default transition-opacity duration-[400ms] ease-out bg-black/40 backdrop-blur-[2px] ${
              isClosing ? 'opacity-0' : 'animate-fade-in-backdrop opacity-100'
            }`}
            onClick={handleClose}
            aria-label="Close"
          />
          <div className={`relative z-10 pb-6 md:pb-8 transition-transform duration-[400ms] ease-[cubic-bezier(0.2,0.8,0.4,1)] ${
            isClosing ? 'translate-y-full' : 'translate-y-0 animate-slide-up-bottom'
          }`}>
            <div className="mx-4 mb-3 overflow-hidden rounded-3xl border border-white/10 bg-[#1c1d25]/85 backdrop-blur-2xl shadow-[0_24px_80px_rgba(0,0,0,0.6)]">
              <div className="border-b border-white/10 px-5 py-4">
                <p className="text-center text-[13px] font-semibold uppercase tracking-[0.12em] text-white/50">
                  Select Language
                </p>
              </div>
              <div className="max-h-[45vh] overflow-y-auto overscroll-contain">
                <LanguageOption
                  label="Language (Any)"
                  isSelected={value === ''}
                  onClick={() => {
                    onChange('');
                    handleClose();
                  }}
                />
                {languages.map((lang) => (
                  <LanguageOption
                    key={lang.value}
                    label={lang.label}
                    isSelected={value === lang.value}
                    onClick={() => {
                      onChange(lang.value);
                      handleClose();
                    }}
                  />
                ))}
              </div>
            </div>

            <div className="mx-4 overflow-hidden rounded-[22px] border border-white/10 bg-[#1c1d25]/85 backdrop-blur-2xl shadow-2xl">
              <button
                type="button"
                onClick={handleClose}
                className="w-full px-6 py-4 text-center text-[17px] font-semibold text-primary transition-colors hover:bg-white/5 active:bg-white/10"
              >
                Cancel
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}

function LanguageOption({
  label,
  isSelected,
  onClick,
}: {
  label: string;
  isSelected: boolean;
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      onClick={onClick}
      className={`flex w-full items-center justify-between border-b border-white/5 px-6 py-4 text-left transition-colors last:border-0 hover:bg-white/5 active:bg-white/10 ${
        isSelected ? 'bg-primary/5 text-primary' : 'text-white/85'
      }`}
    >
      <span className="text-[17px] font-medium tracking-tight">{label}</span>
      {isSelected && (
        <span className="material-symbols-outlined text-[22px] text-primary">check</span>
      )}
    </button>
  );
}
