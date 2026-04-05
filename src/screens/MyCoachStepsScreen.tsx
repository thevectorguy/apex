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
        const base64 = await fileLikeToBase64(blob);
        setClips((current) => [
          ...current,
          {
            fileName: `coach-clip-${current.length + 1}.webm`,
            mimeType: blob.type || 'audio/webm',
            base64,
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
    // TODO: Re-enable uploaded audio once backend STT is added for Vercel-safe transcript generation.
    setError('Uploaded audio is temporarily disabled until backend STT is wired.');
    const files = Array.from(event.target.files ?? []);
    if (!files.length) return;

    const nextClips = await Promise.all(
      files.map(async (file) => ({
        fileName: file.name,
        mimeType: file.type || 'audio/webm',
        base64: await fileLikeToBase64(file),
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
    const transcriptText = transcriptLines.join(' ').trim();
    if (!transcriptText) {
      setError('Record a clip with browser transcript capture before running analysis.');
      return;
    }

    setSaving(true);
    setError(null);
    setSuccessMessage(null);

    try {
      const result = await submitCoachAudio({
        customerId: detail.id,
        title: sessionTitle.trim() || 'Customer conversation',
        source: deriveSource(clips),
        clips,
        transcriptText,
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
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to My Coach
        </button>

        {detail ? (
          <>
            <section className="flex items-center justify-between gap-4">
              <div>
                <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Flow</p>
                <h1 className="mt-2 font-headline text-3xl font-bold text-on-surface">Steps</h1>
              </div>

              <div className="flex items-center gap-2">
                <StepNavButton
                  direction="previous"
                  disabled={activeStep === 'capture'}
                  onClick={() => setActiveStep('capture')}
                />
                <div className="rounded-full border border-white/10 bg-white/5 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70">
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
              <section className="rounded-[26pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <div className="max-w-2xl">
                  <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">Step 1: Session Capture</p>
                  <h2 className="mt-2 font-headline text-3xl font-bold text-on-surface">{detail.customerName}</h2>
                  <p className="mt-3 text-sm leading-6 text-white/62">
                    Record or upload one or more clips for the currently selected customer, then run the analysis to
                    generate the coaching report.
                  </p>
                </div>

                <div className="mt-6 space-y-4 rounded-[24pt] border border-white/8 bg-black/14 p-4">
                  <div className="grid gap-3 lg:grid-cols-[minmax(0,1fr)_auto] lg:items-center">
                    <input
                      value={sessionTitle}
                      onChange={(event) => setSessionTitle(event.target.value)}
                      placeholder="Session title"
                      disabled={!detail}
                      className="w-full rounded-2xl border border-white/8 bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-white/32 focus:border-primary/40 focus:outline-none disabled:opacity-50"
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
                        disabled
                        className="rounded-full border border-white/10 bg-white/5 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface opacity-50"
                        title="TODO: Enable once backend STT is added."
                      >
                        Upload audio soon
                      </button>
                      <input
                        ref={fileInputRef}
                        type="file"
                        multiple
                        accept="audio/*"
                        disabled
                        onChange={(event) => void handleFiles(event)}
                        className="hidden"
                      />
                    </div>
                  </div>

                  <div className="rounded-[22pt] border border-white/8 bg-black/12 p-4">
                    <p className="font-headline text-sm font-bold text-on-surface">Browser transcript</p>
                    <p className="mt-1 text-sm leading-6 text-white/52">
                      V1 uses browser STT as the transcript source. Uploaded audio stays disabled until backend STT is
                      added.
                    </p>
                    <p className="mt-3 text-sm leading-6 text-white/72">
                      {transcriptLines.length
                        ? transcriptLines.slice(-4).join(' ')
                        : recording
                          ? interimTranscript || 'Listening for transcript...'
                          : 'No transcript captured yet.'}
                    </p>
                  </div>

                  <div className="space-y-2 rounded-[22pt] border border-white/8 bg-black/12 p-4">
                    <div className="flex items-center justify-between gap-3">
                      <div>
                        <p className="font-headline text-lg font-bold text-on-surface">Draft queue</p>
                        <p className="mt-1 text-sm leading-6 text-white/52">
                          Recorded clips are analyzed together. Uploads stay disabled in v1 until backend STT is added.
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
                        className="rounded-full border border-white/10 bg-black/12 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70 disabled:opacity-40"
                      >
                        Clear
                      </button>
                    </div>

                    {clips.length ? (
                      clips.map((clip, index) => (
                        <div
                          key={`${clip.fileName}-${index}`}
                          className="flex items-center justify-between gap-3 rounded-[18pt] border border-white/8 bg-surface-container-high/50 px-4 py-3"
                        >
                          <div>
                            <p className="font-headline text-sm font-bold text-on-surface">{clip.fileName}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/44">
                              {clip.source}
                              {clip.durationMs ? ` | ${(clip.durationMs / 1000).toFixed(1)}s` : ''}
                            </p>
                          </div>
                          <button
                            type="button"
                            onClick={() =>
                              setClips((current) => current.filter((_, currentIndex) => currentIndex !== index))
                            }
                            className="rounded-full border border-white/10 bg-black/16 p-2 text-white/70"
                          >
                            <span className="material-symbols-outlined text-[16px]">close</span>
                          </button>
                        </div>
                      ))
                    ) : (
                      <p className="text-sm leading-6 text-white/48">
                        No clips attached yet. Record from the floor to build the report.
                      </p>
                    )}
                  </div>

                  <button
                    type="button"
                    onClick={() => void handleAnalyze()}
                    disabled={saving || !clips.length || !detail || !transcriptLines.length}
                    className="w-full rounded-full bg-secondary px-4 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-on-secondary-fixed disabled:opacity-55"
                  >
                    {saving ? 'Analyzing conversation...' : 'Run My Coach analysis'}
                  </button>
                </div>
              </section>
            ) : (
              <section className="rounded-[26pt] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)]">
                <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Step 2: Visit History</p>
                <p className="mt-2 text-sm leading-6 text-white/54">
                  Keep the timeline simple here. Use the transcript and reports pages when you need the full detail.
                </p>

                <div className="mt-4 space-y-3">
                  {loading ? (
                    <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/48">
                      Loading customer history...
                    </div>
                  ) : recentSessions.length ? (
                    recentSessions.map((session) => (
                      <div
                        key={session.id}
                        className={`rounded-[20pt] border px-4 py-4 ${
                          activeSession?.id === session.id
                            ? 'border-secondary/24 bg-secondary/10'
                            : 'border-white/8 bg-surface-container-high/45'
                        }`}
                      >
                        <div className="flex items-start justify-between gap-3">
                          <button type="button" onClick={() => setSelectedSessionId(session.id)} className="text-left">
                            <p className="font-headline text-base font-bold text-on-surface">{session.title}</p>
                            <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/44">
                              {session.status} | {session.clipCount} clip{session.clipCount === 1 ? '' : 's'}
                            </p>
                          </button>
                          {session.report ? (
                            <span className="font-headline text-xl font-bold text-white">{session.report.overallScore}</span>
                          ) : null}
                        </div>

                        <div className="mt-4 flex flex-wrap gap-2">
                          <button
                            type="button"
                            onClick={() => openTranscriptView(session)}
                            className="rounded-full border border-white/10 bg-white/5 px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/70"
                          >
                            Show transcript
                          </button>
                          {session.report ? (
                            <button
                              type="button"
                              onClick={() => openReport(session)}
                              className="rounded-full bg-secondary px-3 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-secondary-fixed"
                            >
                              Open report
                            </button>
                          ) : null}
                        </div>
                      </div>
                    ))
                  ) : (
                    <div className="rounded-[22pt] border border-dashed border-white/10 px-4 py-10 text-center text-sm text-white/48">
                      No completed visits yet. The first analysis will become the anchor report for this customer.
                    </div>
                  )}
                </div>
              </section>
            )}
          </>
        ) : (
          <section className="rounded-[26pt] border border-dashed border-white/10 bg-surface-container-low/70 px-5 py-10 shadow-[0_20px_60px_rgba(0,0,0,0.2)]">
            <p className="text-[10px] uppercase tracking-[0.16em] text-secondary">My Coach Steps</p>
            <p className="mt-3 font-headline text-2xl font-bold text-on-surface">
              {loading ? 'Loading workflow...' : 'No customer selected'}
            </p>
            <p className="mt-3 max-w-2xl text-sm leading-6 text-white/56">
              {loading
                ? 'Getting the current customer so this page can stay focused on the two workflow steps.'
                : 'Select or create a customer on the My Coach screen first, then open Show Steps when you are ready to walk through the flow.'}
            </p>
          </section>
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
      className="rounded-full border border-white/10 bg-white/5 p-3 text-white/74 disabled:opacity-35"
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

function fileLikeToBase64(file: Blob): Promise<string> {
  return new Promise((resolve, reject) => {
    const reader = new FileReader();
    reader.onload = () => resolve(typeof reader.result === 'string' ? reader.result.split(',')[1] ?? '' : '');
    reader.onerror = () => reject(reader.error);
    reader.readAsDataURL(file);
  });
}
