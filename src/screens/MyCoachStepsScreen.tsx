import { type ChangeEvent, useEffect, useRef, useState } from 'react';
import {
  clearDraftSessionTitle,
  rememberFlowOrigin,
  clearRememberedStepsFocus,
  getCustomerThread,
  listCustomerThreads,
  readDraftSessionTitle,
  readRememberedSessionId,
  readRememberedStepsFocus,
  readRememberedThreadId,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  submitCoachAudio,
  type AudioClipPayload,
  type CoachSessionSummary,
  type CustomerThreadDetail,
  type MyCoachStepFocus,
} from '../lib/myCoachApi';
import { type Screen } from '../types';
import { SkeletonLine } from '../components/Skeleton';

type BrowserSpeechRecognition = {
  continuous: boolean;
  interimResults: boolean;
  lang: string;
  onend: null | (() => void);
  onerror: null | ((event: { error?: string }) => void);
  onresult: null | ((event: any) => void);
  start: () => void;
  stop: () => void;
  abort: () => void;
};

type BrowserSpeechWindow = Window & {
  SpeechRecognition?: new () => BrowserSpeechRecognition;
  webkitSpeechRecognition?: new () => BrowserSpeechRecognition;
};

export function MyCoachStepsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(readRememberedThreadId());
  const [detail, setDetail] = useState<CustomerThreadDetail | null>(null);
  const [selectedSessionId, setSelectedSessionId] = useState<string | null>(readRememberedSessionId());
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [successMessage, setSuccessMessage] = useState<string | null>(null);
  const [sessionTitle, setSessionTitle] = useState('Showroom coaching review');
  const [clips, setClips] = useState<AudioClipPayload[]>([]);
  const [recording, setRecording] = useState(false);
  const [activeStep, setActiveStep] = useState<MyCoachStepFocus>(() => readRememberedStepsFocus() ?? 'capture');
  const recorderRef = useRef<MediaRecorder | null>(null);
  const streamRef = useRef<MediaStream | null>(null);
  const startRef = useRef<number>(0);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldRestartRecognitionRef = useRef(false);
  const fileInputRef = useRef<HTMLInputElement | null>(null);
  const [transcriptLines, setTranscriptLines] = useState<string[]>([]);
  const [interimTranscript, setInterimTranscript] = useState('');

  useEffect(() => {
    void loadThreads();
    return () => stopRecordingTracks();
  }, []);

  useEffect(() => {
    clearRememberedStepsFocus();
  }, []);

  useEffect(() => {
    if (!selectedThreadId) {
      setDetail(null);
      return;
    }
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

  useEffect(() => {
    if (!successMessage) return;

    const timeoutId = window.setTimeout(() => {
      setSuccessMessage(null);
    }, 3600);

    return () => window.clearTimeout(timeoutId);
  }, [successMessage]);

  useEffect(() => {
    if (!detail?.id) return;
    const draftTitle = readDraftSessionTitle();
    if (!draftTitle) return;
    setSessionTitle(draftTitle);
    setClips([]);
    setTranscriptLines([]);
    setInterimTranscript('');
    clearDraftSessionTitle();
    setSuccessMessage(`New visit ready for ${detail.customerName}. Add clips and run analysis when you are ready.`);
  }, [detail?.id, detail?.customerName]);

  const activeSession =
    detail?.sessions.find((session) => session.id === selectedSessionId) ?? detail?.sessions[0] ?? null;
  const recentSessions = detail?.sessions ?? [];
  const detailLoading = loading || (!error && Boolean(selectedThreadId) && !detail);

  async function loadThreads() {
    setLoading(true);
    setError(null);
    try {
      const data = await listCustomerThreads();
      setSelectedThreadId((current) => current ?? readRememberedThreadId() ?? data[0]?.id ?? null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load the My Coach workflow.');
    } finally {
      setLoading(false);
    }
  }

  async function loadDetail(threadId: string) {
    setLoading(true);
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
      setError(issue instanceof Error ? issue.message : 'Could not load the selected customer workflow.');
    } finally {
      setLoading(false);
    }
  }

  async function handleRecordToggle() {
    if (recording) {
      stopSpeechRecognition();
      recorderRef.current?.stop();
      setRecording(false);
      return;
    }

    try {
      const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
      const recorder = new MediaRecorder(stream);
      const chunks: Blob[] = [];
      recorderRef.current = recorder;
      streamRef.current = stream;
      startRef.current = Date.now();

      recorder.ondataavailable = (event) => {
        if (event.data.size) chunks.push(event.data);
      };

      recorder.onstop = async () => {
        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        setClips((current) => [
          ...current,
          {
            fileName: `coach-clip-${current.length + 1}.webm`,
            mimeType: blob.type || 'audio/webm',
            file: blob,
            sizeBytes: blob.size,
            source: 'recorded',
            durationMs: Date.now() - startRef.current,
          },
        ]);
        setSuccessMessage('Recording saved to the draft queue.');
        stopRecordingTracks();
      };

      recorder.start();
      startSpeechRecognition();
      setRecording(true);
      setSuccessMessage(null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not access the microphone.');
      stopRecordingTracks();
    }
  }

  async function handleFiles(event: ChangeEvent<HTMLInputElement>) {
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    setError(null);

    const nextClips = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        mimeType: file.type || 'audio/webm',
        file,
        sizeBytes: file.size,
        source: 'uploaded' as const,
      })),
    );

    setClips((current) => [...current, ...nextClips]);
    setSuccessMessage(`${nextClips.length} audio clip${nextClips.length === 1 ? '' : 's'} added to the draft queue.`);
    event.target.value = '';
  }

  async function handleAnalyze() {
    if (!detail) {
      setError('Choose a customer from My Coach first.');
      return;
    }

    if (!clips.length) {
      setError('Attach at least one audio clip before analysis.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const transcriptText = transcriptLines.join(' ').trim();
      const result = await submitCoachAudio({
        customerId: detail.id,
        title: sessionTitle.trim() || 'Customer conversation',
        source: deriveSource(clips),
        clips,
        transcriptText: transcriptText || undefined,
      });
      setClips([]);
      setTranscriptLines([]);
      setInterimTranscript('');
      await loadDetail(detail.id);
      if (result.report?.id) {
        rememberSelectedReportId(result.report.id);
      }
      setSuccessMessage('Analysis completed. Open the report from visit history whenever you are ready.');
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not analyze this session.');
    } finally {
      setSaving(false);
    }
  }

  function stopRecordingTracks() {
    stopSpeechRecognition();
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;
    recorderRef.current = null;
    recognitionRef.current = null;
  }

  function createSpeechRecognition() {
    if (typeof window === 'undefined') return null;
    const speechWindow = window as BrowserSpeechWindow;
    const RecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!RecognitionCtor) return null;

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldRestartRecognitionRef.current = false;
        setError('Browser speech recognition is blocked on this device.');
      }
      setInterimTranscript('');
    };
    recognition.onresult = (event) => {
      const finalized: string[] = [];
      let nextInterim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) finalized.push(text);
        else nextInterim = `${nextInterim} ${text}`.trim();
      }

      if (finalized.length) {
        setTranscriptLines((current) => [...current, ...finalized]);
      }

      setInterimTranscript(nextInterim);
    };
    recognition.onend = () => {
      if (shouldRestartRecognitionRef.current && recorderRef.current?.state === 'recording') {
        try {
          recognition.start();
        } catch {
          setError('Browser speech recognition stopped unexpectedly.');
        }
      }
    };

    return recognition;
  }

  function startSpeechRecognition() {
    const recognition = recognitionRef.current ?? createSpeechRecognition();
    if (!recognition) {
      setError('Browser speech recognition is not available in this browser.');
      return;
    }

    recognitionRef.current = recognition;
    shouldRestartRecognitionRef.current = true;
    try {
      recognition.start();
    } catch {
      setError('Could not start browser speech recognition.');
    }
  }

  function stopSpeechRecognition() {
    shouldRestartRecognitionRef.current = false;
    setInterimTranscript('');
    try {
      recognitionRef.current?.stop();
    } catch {
      recognitionRef.current?.abort();
    }
  }

  function openTranscriptView(session?: CoachSessionSummary | null) {
    if (detail?.id) {
      rememberSelectedThreadId(detail.id);
    }
    rememberFlowOrigin('tutorial');
    const nextSessionId = session?.id ?? activeSession?.id;
    if (nextSessionId) {
      rememberSelectedSessionId(nextSessionId);
    }
    onNavigate('my_coach_transcript');
  }

  function openReport(session: CoachSessionSummary) {
    if (!session.report?.id) return;
    rememberFlowOrigin('tutorial');
    rememberSelectedThreadId(session.customerId);
    rememberSelectedSessionId(session.id);
    rememberSelectedReportId(session.report.id);
    onNavigate('my_coach_report_detail');
  }

  return (
    <main className="min-h-screen px-6 py-8">
      <div className="mx-auto max-w-[1240px] space-y-6">
        <button
          type="button"
          onClick={() => onNavigate('my_coach')}
          className="inline-flex items-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 hover:bg-black/10 dark:hover:bg-white/10 transition-colors"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to My Coach
        </button>

        {detail ? (
          <>
            <section className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-primary">Flow</p>
                <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface dark:text-white">Steps</h1>
              </div>

              <div className="flex items-center gap-2">
                <StepNavButton
                  direction="previous"
                  disabled={activeStep === 'capture'}
                  onClick={() => setActiveStep('capture')}
                />
                <div className="rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/70">
                  {activeStep === 'capture' ? '1 / 2' : '2 / 2'}
                </div>
                <StepNavButton
                  direction="next"
                  disabled={activeStep === 'history'}
                  onClick={() => setActiveStep('history')}
                />
              </div>
            </section>

            {activeStep === 'capture' ? (
              <section className="rounded-[26pt] border border-black/5 dark:border-white/8 bg-surface-bright dark:bg-surface-container-low/92 p-5 shadow-apple dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <div className="max-w-2xl">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-[#e08810] dark:text-secondary">Step 1: Session Capture</p>
                  <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface dark:text-white">{detail.customerName}</h2>
                  <p className="mt-3 text-sm leading-6 text-on-surface-variant dark:text-white/62">
                    Record or upload one or more clips for the currently selected customer, then run the analysis to
                    generate the coaching report.
                  </p>
                </div>

                <div className="mt-6 space-y-4 rounded-[24pt] border border-black/5 dark:border-white/8 bg-black/5 dark:bg-black/14 p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <input
                      value={sessionTitle}
                      onChange={(event) => setSessionTitle(event.target.value)}
                      placeholder="Session title"
                      disabled={!detail}
                      className="w-full rounded-2xl border border-black/10 dark:border-white/8 bg-white dark:bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 dark:placeholder:text-white/32 focus:border-primary/60 dark:focus:border-primary/40 focus:outline-none disabled:opacity-50"
                    />
                    <div className="flex flex-wrap gap-3">
                      <button
                        type="button"
                        onClick={() => void handleRecordToggle()}
                        disabled={!detail}
                        className={`rounded-full px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] disabled:opacity-50 ${
                          recording ? 'bg-error text-on-primary-fixed' : 'bg-primary text-on-primary-fixed'
                        }`}
                      >
                        {recording ? 'Stop recording' : 'Record clip'}
                      </button>
                      <button
                        type="button"
                        onClick={() => fileInputRef.current?.click()}
                        disabled={!detail || saving}
                        className="rounded-full border border-black/10 dark:border-white/10 bg-white dark:bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface dark:text-white disabled:opacity-50 shadow-sm dark:shadow-none hover:bg-black/5 dark:hover:bg-white/10 transition"
                      >
                        Upload audio
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="audio/*"
                        disabled={!detail || saving}
                        onChange={(event) => void handleFiles(event)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="rounded-[22pt] border border-black/5 dark:border-white/8 bg-white dark:bg-black/12 p-4 shadow-sm dark:shadow-none">
                    <p className="font-headline text-sm font-bold text-on-surface dark:text-white">Live transcript preview</p>
                    <p className="mt-1 text-sm leading-6 text-on-surface-variant/70 dark:text-white/52">
                      Browser speech preview is optional while recording. My Coach now uses backend STT from the saved
                      audio when you run analysis.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-on-surface dark:text-white/72">
                      {transcriptLines.length
                        ? transcriptLines.slice(-4).join(' ')
                        : recording
                          ? interimTranscript || 'Listening for transcript...'
                          : 'No live preview yet. Backend STT will generate the final transcript during analysis.'}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-[22pt] border border-black/5 dark:border-white/8 bg-white dark:bg-black/12 p-4 shadow-sm dark:shadow-none">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-headline text-lg font-bold text-on-surface dark:text-white">Draft queue</p>
                        <p className="mt-1 text-sm leading-6 text-on-surface-variant/70 dark:text-white/52">
                          Recorded and uploaded clips are analyzed together, and backend STT builds the session
                          transcript from the final audio set.
                        </p>
                      </div>
                      <button
                        type="button"
                        onClick={() => {
                          setClips([]);
                          setTranscriptLines([]);
                          setInterimTranscript('');
                        }}
                        disabled={!clips.length}
                        className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/12 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/70 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>

                    {clips.length ? (
                      clips.map((clip, index) => (
                        <div
                          key={`${clip.fileName}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-[18pt] border border-black/5 dark:border-white/8 bg-surface-bright dark:bg-surface-container-high/50 px-4 py-3 shadow-apple-soft dark:shadow-none"
                        >
                          <div>
                            <p className="font-headline text-sm font-bold text-on-surface dark:text-white">{clip.fileName}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/70 dark:text-white/44">
                              {clip.source}
                              {clip.durationMs ? ` | ${(clip.durationMs / 1000).toFixed(1)}s` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setClips((current) => current.filter((_, currentIndex) => currentIndex !== index))
                            }
                            className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-black/16 p-2 text-on-surface-variant dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 transition"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-on-surface-variant/60 dark:text-white/48">
                        No clips attached yet. Record from the floor to build the report.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleAnalyze()}
                    disabled={saving || !clips.length || !detail}
                    className="w-full rounded-full bg-[#ffaa33] dark:bg-secondary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-black dark:text-on-secondary-fixed disabled:opacity-55 shadow-sm dark:shadow-none transition hover:opacity-90"
                  >
                    {saving ? 'Analyzing conversation...' : 'Run My Coach analysis'}
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-[26pt] border border-black/5 dark:border-white/8 bg-surface-bright dark:bg-surface-container-low/92 p-5 shadow-apple dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-primary">Step 2: Visit History</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant dark:text-white/54">
                  Keep the timeline simple here. Use the transcript and reports pages when you need the full detail.
                </p>

                <div className="mt-4 space-y-3">
                  {detailLoading ? (
                    Array.from({ length: 3 }, (_, index) => <WorkflowHistorySkeleton key={`workflow-history-${index}`} />)
                  ) : recentSessions.length ? (
                    recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`rounded-[20pt] border px-4 py-4 transition ${
                          activeSession?.id === session.id
                            ? 'border-secondary/30 bg-[#ffaa33]/10 dark:border-secondary/24 dark:bg-secondary/10 shadow-sm dark:shadow-none'
                            : 'border-black/5 bg-white dark:border-white/8 dark:bg-surface-container-high/45 shadow-apple-soft dark:shadow-none'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button type="button" onClick={() => setSelectedSessionId(session.id)} className="text-left">
                            <p className="font-headline text-base font-bold text-on-surface dark:text-white">{session.title}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/70 dark:text-white/44">
                              {session.status} | {session.clipCount} clip{session.clipCount === 1 ? '' : 's'}
                            </p>
                          </button>
                          {session.report ? (
                            <span className="font-headline text-xl font-bold text-on-surface dark:text-white">{session.report.overallScore}</span>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openTranscriptView(session)}
                            className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 transition"
                          >
                            Show transcript
                          </button>
                          {session.report ? (
                            <button
                              type="button"
                              onClick={() => openReport(session)}
                              className="rounded-full bg-[#ffaa33] dark:bg-secondary px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-black dark:text-on-secondary-fixed shadow-sm dark:shadow-none transition hover:opacity-90"
                            >
                              Open report
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22pt] border border-dashed border-black/10 dark:border-white/10 px-4 py-10 text-center text-sm text-on-surface-variant/60 dark:text-white/48">
                      No completed visits yet. The first analysis will become the anchor report for this customer.
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        ) : (
          detailLoading ? (
            <WorkflowScreenSkeleton />
          ) : (
            <section className="rounded-[26pt] border border-dashed border-black/10 dark:border-white/10 bg-surface-bright dark:bg-surface-container-low/70 px-5 py-10 shadow-apple-soft dark:shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
              <p className="text-[10px] uppercase tracking-[0.16em] text-[#e08810] dark:text-secondary">My Coach Steps</p>
              <p className="mt-3 font-headline text-2xl font-bold text-on-surface dark:text-white">No customer selected</p>
              <p className="mt-3 max-w-2xl text-sm leading-6 text-on-surface-variant dark:text-white/56">
                Select or create a customer on the My Coach screen first, then open Show Steps when you are ready to walk through the flow.
              </p>
            </section>
          )
        )}

        {error ? (
          <Banner tone="error" text={error} />
        ) : successMessage ? (
          <Banner tone="success" text={successMessage} />
        ) : null}
      </div>
    </main>
  );
}

function StepNavButton({
  direction,
  disabled,
  onClick,
}: {
  direction: 'previous' | 'next';
  disabled: boolean;
  onClick: () => void;
}) {
  const icon = direction === 'previous' ? 'arrow_back' : 'arrow_forward';

  return (
    <button
      type="button"
      onClick={onClick}
      disabled={disabled}
      className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/5 p-3 text-on-surface-variant dark:text-white/74 hover:bg-black/10 dark:hover:bg-white/10 transition disabled:opacity-35"
      aria-label={direction === 'previous' ? 'Previous step' : 'Next step'}
    >
      <span className="material-symbols-outlined text-[18px]">{icon}</span>
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

function deriveSource(clips: AudioClipPayload[]): 'recorded' | 'uploaded' | 'mixed' {
  const hasRecorded = clips.some((clip) => clip.source === 'recorded');
  const hasUploaded = clips.some((clip) => clip.source === 'uploaded');
  if (hasRecorded && hasUploaded) return 'mixed';
  return hasRecorded ? 'recorded' : 'uploaded';
}

function WorkflowScreenSkeleton() {
  return (
    <div className="space-y-6">
      <section className="flex items-center justify-between gap-4">
        <div>
          <SkeletonLine className="h-3 w-16 bg-black/10 dark:bg-white/[0.06]" />
          <SkeletonLine className="mt-3 h-9 w-32 bg-black/10 dark:bg-white/[0.08]" />
        </div>
        <div className="flex items-center gap-2">
          <SkeletonLine className="h-11 w-11 rounded-full bg-black/5 dark:bg-white/[0.05]" />
          <SkeletonLine className="h-9 w-16 rounded-full bg-black/5 dark:bg-white/[0.05]" />
          <SkeletonLine className="h-11 w-11 rounded-full bg-black/5 dark:bg-white/[0.05]" />
        </div>
      </section>

      <section className="rounded-[26pt] border border-black/5 dark:border-white/8 bg-surface-bright dark:bg-surface-container-low/92 p-5 shadow-apple dark:shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
        <SkeletonLine className="h-3 w-32 bg-black/10 dark:bg-white/[0.06]" />
        <SkeletonLine className="mt-3 h-9 w-40 bg-black/10 dark:bg-white/[0.08]" />
        <SkeletonLine className="mt-4 h-4 w-full bg-black/5 dark:bg-white/[0.05]" />
        <SkeletonLine className="mt-2 h-4 w-4/5 bg-black/5 dark:bg-white/[0.04]" />
        <div className="mt-6 space-y-4 rounded-[24pt] border border-black/5 dark:border-white/8 bg-black/5 dark:bg-black/14 p-4">
          <SkeletonLine className="h-12 w-full rounded-2xl bg-black/10 dark:bg-white/[0.05]" />
          <div className="grid gap-3 lg:grid-cols-2">
            <SkeletonLine className="h-11 w-full rounded-full bg-black/10 dark:bg-white/[0.06]" />
            <SkeletonLine className="h-11 w-full rounded-full bg-black/5 dark:bg-white/[0.05]" />
          </div>
          <div className="rounded-[22pt] border border-black/5 dark:border-white/8 bg-white dark:bg-black/12 p-4">
            <SkeletonLine className="h-4 w-40 bg-black/10 dark:bg-white/[0.06]" />
            <SkeletonLine className="mt-3 h-4 w-full bg-black/5 dark:bg-white/[0.05]" />
            <SkeletonLine className="mt-2 h-4 w-5/6 bg-black/5 dark:bg-white/[0.04]" />
          </div>
        </div>
      </section>
    </div>
  );
}

function WorkflowHistorySkeleton() {
  return (
    <div className="rounded-[20pt] border border-black/5 dark:border-white/8 bg-white dark:bg-surface-container-high/45 px-4 py-4 shadow-apple-soft dark:shadow-none">
      <SkeletonLine className="h-4 w-40 bg-black/10 dark:bg-white/[0.06]" />
      <SkeletonLine className="mt-2 h-3 w-28 bg-black/5 dark:bg-white/[0.05]" />
      <div className="mt-4 flex flex-wrap gap-2">
        <SkeletonLine className="h-9 w-28 rounded-full bg-black/5 dark:bg-white/[0.05]" />
        <SkeletonLine className="h-9 w-28 rounded-full bg-black/5 dark:bg-white/[0.05]" />
      </div>
    </div>
  );
}
