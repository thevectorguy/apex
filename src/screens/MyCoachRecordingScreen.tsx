import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useMemo, useRef, useState } from 'react';
import {
  clearPendingLiveSessionSubmission,
  clearRememberedReportId,
  clearRememberedSessionId,
  getCustomerThread,
  readRememberedThreadId,
  rememberFlowOrigin,
  rememberSelectedThreadId,
  stagePendingLiveSessionSubmission,
  type AudioClipPayload,
  type CustomerThreadDetail,
} from '../lib/myCoachApi';
import { type Screen } from '../types';
import { SkeletonCircle, SkeletonLine } from '../components/Skeleton';

type LiveCaptureState = 'idle' | 'recording' | 'paused' | 'submitting';
type PreviewStatus = 'idle' | 'listening' | 'live' | 'unsupported' | 'blocked' | 'error';
type ActiveSheet = 'preview' | 'segments' | null;

type DraftRecordingSegment = AudioClipPayload & { id: string };
type PreviewTranscriptLine = { id: string; text: string };

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

const METER_BAR_COUNT = 24;
const EMPTY_METER_VALUES = Array.from({ length: METER_BAR_COUNT }, () => 0.12);
const PREVIEW_STACK_LIMIT = 8;
const RECOGNITION_SETTLE_IDLE_MS = 500;
const RECOGNITION_STOP_TIMEOUT_MS = 1200;

export function MyCoachRecordingScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [selectedThreadId, setSelectedThreadId] = useState<string | null>(readRememberedThreadId());
  const [detail, setDetail] = useState<CustomerThreadDetail | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [captureState, setCaptureState] = useState<LiveCaptureState>('idle');
  const [segments, setSegments] = useState<DraftRecordingSegment[]>([]);
  const [capturedMs, setCapturedMs] = useState(0);
  const [tick, setTick] = useState(Date.now());
  const [meterValues, setMeterValues] = useState<number[]>(EMPTY_METER_VALUES);
  const [previewLines, setPreviewLines] = useState<PreviewTranscriptLine[]>([]);
  const [finalTranscriptLines, setFinalTranscriptLines] = useState<PreviewTranscriptLine[]>([]);
  const [interimPreview, setInterimPreview] = useState('');
  const [previewStatus, setPreviewStatus] = useState<PreviewStatus>('idle');
  const [activeSheet, setActiveSheet] = useState<ActiveSheet>(null);

  const streamRef = useRef<MediaStream | null>(null);
  const recorderRef = useRef<MediaRecorder | null>(null);
  const recorderStopPromiseRef = useRef<Promise<DraftRecordingSegment | null> | null>(null);
  const segmentStartedAtRef = useRef<number | null>(null);
  const analyserRef = useRef<AnalyserNode | null>(null);
  const audioContextRef = useRef<AudioContext | null>(null);
  const animationFrameRef = useRef<number | null>(null);
  const recognitionRef = useRef<BrowserSpeechRecognition | null>(null);
  const shouldRestartRecognitionRef = useRef(false);
  const captureStateRef = useRef<LiveCaptureState>('idle');
  const segmentsRef = useRef<DraftRecordingSegment[]>([]);
  const finalTranscriptLinesRef = useRef<PreviewTranscriptLine[]>([]);
  const previewStatusRef = useRef<PreviewStatus>('idle');
  const shouldClearPendingOnUnmountRef = useRef(true);
  const activeSheetRef = useRef<ActiveSheet>(null);
  const previewScrollerRef = useRef<HTMLDivElement | null>(null);
  const lastRecognitionResultAtRef = useRef(0);
  const recognitionStopWaitersRef = useRef<Array<() => void>>([]);

  const previewSupported = useMemo(() => {
    if (typeof window === 'undefined') return false;
    const speechWindow = window as BrowserSpeechWindow;
    return Boolean(speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition);
  }, []);

  const elapsedMs =
    capturedMs + (captureState === 'recording' && segmentStartedAtRef.current ? tick - segmentStartedAtRef.current : 0);
  const statusPill = captureState === 'recording' ? 'Recording' : captureState === 'paused' ? 'Paused' : 'Ready';
  const primaryActionLabel =
    captureState === 'recording'
      ? 'Pause capture'
      : segments.length
        ? 'Resume capture'
        : 'Start capture';
  const reactiveLevel = Math.min(
    1,
    Math.max(0, meterValues.reduce((sum, value) => sum + value, 0) / Math.max(1, meterValues.length)),
  );

  useEffect(() => {
    captureStateRef.current = captureState;
  }, [captureState]);

  useEffect(() => {
    segmentsRef.current = segments;
  }, [segments]);

  useEffect(() => {
    previewStatusRef.current = previewStatus;
  }, [previewStatus]);

  useEffect(() => {
    activeSheetRef.current = activeSheet;

    // Keep the preview modal feeling fresh without touching the finalized
    // transcript that is needed later for upload.
    setPreviewLines([]);
    setInterimPreview('');

    if (activeSheet === 'preview') {
      if (
        captureStateRef.current === 'recording' &&
        previewStatusRef.current !== 'unsupported' &&
        previewStatusRef.current !== 'blocked' &&
        previewStatusRef.current !== 'error'
      ) {
        setPreviewStatus('listening');
      } else if (previewStatusRef.current === 'live' || previewStatusRef.current === 'listening') {
        setPreviewStatus('idle');
      }
    }
  }, [activeSheet]);

  useEffect(() => {
    finalTranscriptLinesRef.current = finalTranscriptLines;
  }, [finalTranscriptLines]);

  useEffect(() => {
    if (activeSheet !== 'preview') return;
    const scroller = previewScrollerRef.current;
    if (!scroller) return;
    scroller.scrollTo({ top: scroller.scrollHeight, behavior: 'smooth' });
  }, [activeSheet, interimPreview, previewLines]);

  useEffect(() => {
    clearPendingLiveSessionSubmission();
    shouldClearPendingOnUnmountRef.current = true;
    void loadDetail(selectedThreadId);

    return () => {
      void teardownLiveCapture();
      if (shouldClearPendingOnUnmountRef.current) {
        clearPendingLiveSessionSubmission();
      }
    };
  }, []);

  useEffect(() => {
    if (!selectedThreadId) return;
    rememberSelectedThreadId(selectedThreadId);
  }, [selectedThreadId]);

  useEffect(() => {
    if (captureState !== 'recording') return;
    const intervalId = window.setInterval(() => setTick(Date.now()), 200);
    return () => window.clearInterval(intervalId);
  }, [captureState]);

  async function loadDetail(threadId: string | null) {
    if (!threadId) {
      setLoading(false);
      setDetail(null);
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const nextDetail = await getCustomerThread(threadId);
      setDetail(nextDetail);
      setSelectedThreadId(nextDetail.id);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load the selected customer session.');
      setDetail(null);
    } finally {
      setLoading(false);
    }
  }

  async function ensureAudioPipeline() {
    if (streamRef.current) return streamRef.current;

    const stream = await navigator.mediaDevices.getUserMedia({ audio: true });
    const AudioContextCtor = window.AudioContext || (window as Window & { webkitAudioContext?: typeof AudioContext }).webkitAudioContext;
    if (AudioContextCtor) {
      const audioContext = new AudioContextCtor();
      const analyser = audioContext.createAnalyser();
      analyser.fftSize = 256;
      analyser.smoothingTimeConstant = 0.82;
      audioContext.createMediaStreamSource(stream).connect(analyser);
      audioContextRef.current = audioContext;
      analyserRef.current = analyser;
      startMeterLoop();
    }

    streamRef.current = stream;
    return stream;
  }

  function startMeterLoop() {
    if (animationFrameRef.current) window.cancelAnimationFrame(animationFrameRef.current);
    const data = new Uint8Array(analyserRef.current?.frequencyBinCount ?? 0);

    const step = () => {
      const analyser = analyserRef.current;
      if (!analyser) {
        setMeterValues(EMPTY_METER_VALUES);
        return;
      }

      analyser.getByteFrequencyData(data);
      const bucketSize = Math.max(1, Math.floor(data.length / METER_BAR_COUNT));
      const nextValues = Array.from({ length: METER_BAR_COUNT }, (_, index) => {
        const start = index * bucketSize;
        const slice = data.slice(start, start + bucketSize);
        const average = slice.length ? slice.reduce((sum, value) => sum + value, 0) / slice.length : 0;
        return Math.max(0.12, average / 255);
      });

      setMeterValues(nextValues);
      animationFrameRef.current = window.requestAnimationFrame(step);
    };

    animationFrameRef.current = window.requestAnimationFrame(step);
  }

  function createSpeechRecognition() {
    if (!previewSupported) {
      setPreviewStatus('unsupported');
      return null;
    }

    const speechWindow = window as BrowserSpeechWindow;
    const RecognitionCtor = speechWindow.SpeechRecognition || speechWindow.webkitSpeechRecognition;
    if (!RecognitionCtor) {
      setPreviewStatus('unsupported');
      return null;
    }

    const recognition = new RecognitionCtor();
    recognition.continuous = true;
    recognition.interimResults = true;
    recognition.lang = 'en-IN';
    recognition.onerror = (event) => {
      if (event.error === 'not-allowed' || event.error === 'service-not-allowed') {
        shouldRestartRecognitionRef.current = false;
        setPreviewStatus('blocked');
      } else {
        setPreviewStatus('error');
      }
      setInterimPreview('');
    };
    recognition.onresult = (event) => {
      lastRecognitionResultAtRef.current = Date.now();
      const finalized: string[] = [];
      let nextInterim = '';

      for (let index = event.resultIndex; index < event.results.length; index += 1) {
        const result = event.results[index];
        const text = result?.[0]?.transcript?.trim();
        if (!text) continue;
        if (result.isFinal) {
          console.log('[my-coach][stt:isFinal]', {
            at: new Date().toISOString(),
            resultIndex: event.resultIndex,
            slotIndex: index,
            text,
          });
          finalized.push(text);
        } else nextInterim = `${nextInterim} ${text}`.trim();
      }

      if (finalized.length) {
        const finalizedPreviewLines = finalized.map((text) => ({ id: makeId('preview'), text }));
        const finalizedTranscriptLines = finalized.map((text) => ({ id: makeId('transcript'), text }));

        if (activeSheetRef.current === 'preview') {
          setPreviewLines((current) => [...current, ...finalizedPreviewLines].slice(-PREVIEW_STACK_LIMIT));
        }
        setFinalTranscriptLines((current) => {
          const nextLines = [...current, ...finalizedTranscriptLines];
          finalTranscriptLinesRef.current = nextLines;
          console.log('[my-coach][stt:append-final-buffer]', {
            at: new Date().toISOString(),
            appended: finalized,
            bufferSize: nextLines.length,
            bufferText: nextLines.map((line) => line.text),
          });
          return nextLines;
        });
      }

      setInterimPreview(activeSheetRef.current === 'preview' ? nextInterim : '');
      setPreviewStatus(finalized.length || nextInterim ? 'live' : 'listening');
    };
    recognition.onend = () => {
      const waiters = recognitionStopWaitersRef.current.splice(0);
      waiters.forEach((resolve) => resolve());
      if (
        shouldRestartRecognitionRef.current &&
        captureStateRef.current === 'recording' &&
        previewStatusRef.current !== 'blocked'
      ) {
        try {
          recognition.start();
        } catch {
          setPreviewStatus('error');
        }
      }
    };

    return recognition;
  }

  function startSpeechRecognition() {
    const recognition = recognitionRef.current ?? createSpeechRecognition();
    if (!recognition) return;

    recognitionRef.current = recognition;
    shouldRestartRecognitionRef.current = true;
    setPreviewStatus('listening');
    try {
      recognition.start();
    } catch {
      setPreviewStatus((current) => (current === 'blocked' ? current : 'error'));
    }
  }

  function waitForSpeechRecognitionToSettle() {
    const idleForMs = Date.now() - lastRecognitionResultAtRef.current;
    const idleTimeoutMs = Math.min(
      RECOGNITION_STOP_TIMEOUT_MS,
      Math.max(150, RECOGNITION_SETTLE_IDLE_MS - idleForMs),
    );

    return new Promise<void>((resolve) => {
      let settled = false;
      let fallbackTimer = 0;
      let hardStopTimer = 0;

      const finish = () => {
        if (settled) return;
        settled = true;
        window.clearTimeout(fallbackTimer);
        window.clearTimeout(hardStopTimer);
        const remainingWaiters = recognitionStopWaitersRef.current.filter((waiter) => waiter !== finish);
        recognitionStopWaitersRef.current = remainingWaiters;
        resolve();
      };

      recognitionStopWaitersRef.current.push(finish);
      fallbackTimer = window.setTimeout(finish, idleTimeoutMs);
      hardStopTimer = window.setTimeout(finish, RECOGNITION_STOP_TIMEOUT_MS);
    });
  }

  async function stopSpeechRecognition() {
    shouldRestartRecognitionRef.current = false;
    setInterimPreview('');
    const recognition = recognitionRef.current;
    if (!recognition) return;
    const settlePromise = waitForSpeechRecognitionToSettle();
    try {
      recognition.stop();
    } catch {
      try {
        recognition.abort();
      } catch {}
    }
    await settlePromise;
  }

  async function startRecordingSegment() {
    if (!detail) {
      setError('Create or pick a customer thread before you start the session.');
      return;
    }

    setError(null);
    const stream = await ensureAudioPipeline();
    const recorder = new MediaRecorder(stream);
    const chunks: Blob[] = [];
    const segmentIndex = segmentsRef.current.length + 1;
    const startedAt = Date.now();

    recorder.ondataavailable = (event) => {
      if (event.data.size) chunks.push(event.data);
    };

    recorderStopPromiseRef.current = new Promise((resolve, reject) => {
      recorder.onerror = () => reject(new Error('The microphone stopped unexpectedly.'));
      recorder.onstop = async () => {
        if (!chunks.length) {
          resolve(null);
          return;
        }

        const blob = new Blob(chunks, { type: recorder.mimeType || 'audio/webm' });
        resolve({
          id: makeId('segment'),
          fileName: `${detail.customerName.toLowerCase().replace(/\s+/g, '-')}-segment-${segmentIndex}.webm`,
          mimeType: blob.type || 'audio/webm',
          file: blob,
          sizeBytes: blob.size,
          source: 'recorded',
          durationMs: Date.now() - startedAt,
        });
      };
    });

    recorderRef.current = recorder;
    recorder.start();
    segmentStartedAtRef.current = startedAt;
    setTick(Date.now());
    setCaptureState('recording');
    startSpeechRecognition();
  }

  async function finalizeActiveSegment() {
    const recorder = recorderRef.current;
    const stopPromise = recorderStopPromiseRef.current;
    if (!recorder || !stopPromise || recorder.state === 'inactive') return null;

    recorder.stop();
    recorderRef.current = null;
    recorderStopPromiseRef.current = null;
    segmentStartedAtRef.current = null;

    const segment = await stopPromise;
    if (!segment) return null;

    const nextSegments = [...segmentsRef.current, segment];
    segmentsRef.current = nextSegments;
    setSegments(nextSegments);
    setCapturedMs((current) => current + (segment.durationMs ?? 0));
    setTick(Date.now());
    return segment;
  }

  async function handleCaptureToggle() {
    if (captureState === 'submitting') return;

    try {
      if (captureState === 'recording') {
        await stopSpeechRecognition();
        await finalizeActiveSegment();
        setCaptureState('paused');
        return;
      }

      await startRecordingSegment();
    } catch (issue) {
      setCaptureState('paused');
      setError(issue instanceof Error ? issue.message : 'Could not access the microphone.');
    }
  }

  async function handleEndConversation() {
    if (!detail || captureState === 'submitting') return;

    setError(null);
    setCaptureState('submitting');

    try {
      if (captureState === 'recording') {
        await stopSpeechRecognition();
        await finalizeActiveSegment();
      }

      const nextSegments = segmentsRef.current;
      const transcriptText = finalTranscriptLinesRef.current.map((line) => line.text).join(' ').trim();
      console.log('[my-coach][stt:end-conversation-check]', {
        at: new Date().toISOString(),
        segmentCount: nextSegments.length,
        finalTranscriptLines: finalTranscriptLinesRef.current.map((line) => line.text),
        transcriptText,
      });
      if (!nextSegments.length) {
        setCaptureState('paused');
        setError('Record at least one segment before ending the conversation.');
        return;
      }

      stagePendingLiveSessionSubmission({
        customerId: detail.id,
        title: `${detail.customerName} live session`,
        source: 'recorded',
        clips: nextSegments.map(({ fileName, mimeType, file, sizeBytes, source, durationMs }) => ({
          fileName,
          mimeType,
          file,
          sizeBytes,
          source,
          durationMs,
        })),
        ...(transcriptText ? { transcriptText } : {}),
      });
      rememberSelectedThreadId(detail.id);
      rememberFlowOrigin('live_session');
      clearRememberedSessionId();
      clearRememberedReportId();
      await teardownLiveCapture();
      shouldClearPendingOnUnmountRef.current = false;
      onNavigate('my_coach_processing');
    } catch (issue) {
      clearPendingLiveSessionSubmission();
      setCaptureState('paused');
      setError(issue instanceof Error ? issue.message : 'Could not prepare the live session for processing.');
    }
  }

  async function handleBackToCoach() {
    await teardownLiveCapture();
    clearPendingLiveSessionSubmission();
    onNavigate('my_coach');
  }

  async function teardownLiveCapture() {
    await stopSpeechRecognition();
    if (animationFrameRef.current) {
      window.cancelAnimationFrame(animationFrameRef.current);
      animationFrameRef.current = null;
    }
    if (recorderRef.current && recorderRef.current.state !== 'inactive') {
      try {
        recorderRef.current.stop();
      } catch {}
    }

    recorderRef.current = null;
    recorderStopPromiseRef.current = null;
    segmentStartedAtRef.current = null;
    streamRef.current?.getTracks().forEach((track) => track.stop());
    streamRef.current = null;

    if (audioContextRef.current && audioContextRef.current.state !== 'closed') {
      await audioContextRef.current.close();
    }

    recognitionRef.current = null;
    audioContextRef.current = null;
    analyserRef.current = null;
    setMeterValues(EMPTY_METER_VALUES);
  }

  return (
    <main className="relative h-[100dvh] overflow-hidden bg-[#f0f4f8] dark:bg-[#080b11] text-on-surface dark:text-white">
      <div className="absolute inset-0">
        <motion.div
          animate={{ opacity: [0.3, 0.6, 0.3], scale: [1, 1.16, 1] }}
          transition={{ duration: 8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[-10%] top-[-16%] h-[42rem] w-[42rem] rounded-full bg-primary/30 dark:bg-primary/20 blur-[120px]"
        />
        <motion.div
          animate={{ opacity: [0.18, 0.34, 0.18], scale: [1, 1.12, 1] }}
          transition={{ duration: 6.4, repeat: Infinity, ease: 'easeInOut', delay: 0.6 }}
          className="absolute bottom-[-20%] right-[-8%] h-[32rem] w-[32rem] rounded-full bg-secondary/30 dark:bg-secondary/18 blur-[110px]"
        />
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.4),transparent_34%),linear-gradient(180deg,rgba(240,244,248,0.4),rgba(240,244,248,0.92))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.08),transparent_34%),linear-gradient(180deg,rgba(8,11,17,0.4),rgba(8,11,17,0.92))]" />
      </div>

      <div className="relative z-10 mx-auto flex h-full w-full max-w-[430px] flex-col px-4 pb-4 pt-5">
        <header className="flex shrink-0 items-start justify-between gap-3">
          <button
            type="button"
            onClick={() => void handleBackToCoach()}
            className="inline-flex items-center gap-2 rounded-full border border-black/10 dark:border-white/12 bg-black/5 dark:bg-white/6 px-4 py-2 text-[11px] font-bold uppercase tracking-[0.18em] text-on-surface-variant dark:text-white/76 backdrop-blur-xl"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            My Coach
          </button>

          <span className="rounded-full border border-primary/16 bg-primary/10 px-3 py-1 text-[10px] uppercase tracking-[0.18em] text-primary">
            Live Session
          </span>
        </header>

        {loading ? (
          <RecordingScreenSkeleton />
        ) : detail ? (
          <>
            <section className="relative mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] p-5 shadow-apple dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
              <div className="shrink-0">
                <h1 className="font-headline text-[2.1rem] font-bold tracking-tight text-on-surface dark:text-white">{detail.customerName}</h1>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant/80 dark:text-white/64">{detail.summary}</p>
                <div className="mt-4 flex flex-wrap gap-2">
                  <MetaPill label={statusPill} tone={captureState === 'recording' ? 'primary' : 'default'} />
                  <MetaPill label={`${segments.length} segments`} tone="default" />
                  <MetaPill label={formatDuration(elapsedMs)} tone="secondary" />
                </div>
                <div className="mt-3 flex flex-wrap gap-2">
                  <DetailPill label="Context" value={detail.customerContext} />
                  <DetailPill label="Phone" value={detail.phone} />
                </div>
              </div>

              <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-3">
                <motion.button
                  type="button"
                  onClick={() => void handleCaptureToggle()}
                  whileTap={{ scale: 0.96 }}
                  animate={{
                    scale:
                      captureState === 'recording'
                        ? 1.02 + reactiveLevel * 0.08
                        : captureState === 'paused'
                          ? 0.98
                          : 1,
                    boxShadow:
                      captureState === 'recording'
                        ? `0 30px 90px rgba(0,0,0,0.42), 0 0 ${28 + reactiveLevel * 34}px rgba(164,201,255,${0.18 + reactiveLevel * 0.18})`
                        : '0 24px 64px rgba(0,0,0,0.38)',
                  }}
                  transition={{ duration: 0.22, ease: 'easeOut' }}
                  className={`relative flex h-[11.5rem] w-[11.5rem] items-center justify-center rounded-full border border-black/10 dark:border-white/12 ${
                    captureState === 'recording'
                      ? 'bg-[radial-gradient(circle_at_top,rgba(0,122,255,0.15),rgba(255,255,255,0.92))] dark:bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.36),rgba(25,35,58,0.92))] shadow-apple-soft dark:shadow-none'
                      : 'bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.8),rgba(240,244,248,0.92))] dark:bg-[radial-gradient(circle_at_top,rgba(255,255,255,0.1),rgba(18,24,34,0.92))] shadow-apple dark:shadow-none'
                  }`}
                >
                  <motion.div
                    animate={{
                      scale: captureState === 'recording' ? 1.08 + reactiveLevel * 0.14 : 1,
                      opacity: captureState === 'recording' ? 0.24 + reactiveLevel * 0.18 : 0,
                    }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="absolute inset-[-10px] rounded-full border border-primary/24"
                  />
                  <motion.div
                    animate={{
                      scale: captureState === 'recording' ? 1.18 + reactiveLevel * 0.18 : 1,
                      opacity: captureState === 'recording' ? 0.12 + reactiveLevel * 0.12 : 0,
                    }}
                    transition={{ duration: 0.22, ease: 'easeOut' }}
                    className="absolute inset-[-24px] rounded-full border border-primary/14"
                  />
                  <motion.div
                    animate={{
                      scale: captureState === 'recording' ? 0.96 + reactiveLevel * 0.08 : 1,
                      opacity: captureState === 'recording' ? 0.88 + reactiveLevel * 0.12 : 0.82,
                    }}
                    transition={{ duration: 0.18, ease: 'easeOut' }}
                    className="absolute inset-3 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-black/24"
                  />
	                  <div className="relative z-10 text-center">
	                    <motion.span
	                      animate={{
	                        y: captureState === 'recording' ? -reactiveLevel * 2 : 0,
	                        scale: captureState === 'recording' ? 1 + reactiveLevel * 0.08 : 1,
                      }}
	                      transition={{ duration: 0.18, ease: 'easeOut' }}
	                      className="material-symbols-outlined text-[44px] text-on-surface dark:text-white"
	                    >
	                      {captureState === 'recording' ? 'pause' : 'mic'}
	                    </motion.span>
	                    <p className="mt-3 text-[11px] uppercase tracking-[0.18em] text-on-surface-variant/70 dark:text-white/58">{primaryActionLabel}</p>
	                  </div>
	                </motion.button>

                <div className="mt-5 flex w-full max-w-[220px] items-end justify-center gap-1">
                  {meterValues.map((value, index) => (
                    <motion.span
                      key={`meter-${index}`}
                      animate={{ height: `${Math.max(8, value * 28)}px`, opacity: captureState === 'recording' ? 0.78 : 0.4 }}
                      transition={{ duration: 0.18, ease: 'easeOut' }}
                      className={`block w-1 rounded-full ${index % 4 === 0 ? 'bg-secondary/70' : 'bg-primary/70'}`}
                    />
                  ))}
                </div>

                <p className="mt-4 max-w-[16rem] text-center text-[11px] leading-5 text-on-surface-variant/80 dark:text-white/56">
                  {captureState === 'recording'
                    ? 'Keep the phone steady and let the customer finish each thought before you pause.'
                    : segments.length
                      ? 'Resume when the conversation picks up again, then end the session once the visit is complete.'
                      : 'Tap once to begin. The live meter, timer, and transcript preview will confirm the mic is working.'}
                </p>
              </div>
            </section>

            <div className="mt-3 grid shrink-0 gap-2">
              <div className={`grid gap-2 ${segments.length ? 'grid-cols-2' : 'grid-cols-1'}`}>
                <button
                  type="button"
                  onClick={() => setActiveSheet('preview')}
                  className="rounded-[20px] border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/6 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 shadow-sm dark:shadow-none"
                >
                  Live Preview
                </button>
                {segments.length ? (
                  <button
                    type="button"
                    onClick={() => setActiveSheet('segments')}
                    className="rounded-[20px] border border-black/10 dark:border-white/10 bg-white/60 dark:bg-white/6 px-4 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 shadow-sm dark:shadow-none"
                  >
                    Captured So Far
                  </button>
                ) : null}
              </div>

              <button
                type="button"
                onClick={() => void handleEndConversation()}
                disabled={captureState === 'submitting'}
                className="rounded-[22px] bg-[#ffaa33] dark:bg-secondary px-5 py-3.5 text-xs font-bold uppercase tracking-[0.18em] text-black dark:text-on-secondary-fixed shadow-apple-soft dark:shadow-none transition disabled:opacity-50"
              >
                {captureState === 'submitting' ? 'Preparing session...' : 'End conversation'}
              </button>
            </div>
          </>
        ) : (
          <section className="flex min-h-0 flex-1 items-center justify-center">
            <div className="rounded-[28px] border border-black/5 dark:border-white/8 bg-white/70 dark:bg-white/4 px-6 py-10 text-center shadow-apple dark:shadow-[0_20px_60px_rgba(0,0,0,0.24)] backdrop-blur-xl">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#e08810] dark:text-secondary">My Coach Live Session</p>
              <h1 className="mt-3 font-headline text-3xl font-bold text-on-surface dark:text-white">{error ? 'Customer thread unavailable' : 'No customer selected'}</h1>
              <p className="mt-3 max-w-xl text-sm leading-6 text-on-surface-variant/80 dark:text-white/60">
                {error ?? 'Create or select a customer from My Coach before starting the immersive recording flow.'}
              </p>
              <button
                type="button"
                onClick={() => onNavigate('my_coach')}
                className="mt-5 rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-on-primary-fixed"
              >
                Back to My Coach
              </button>
            </div>
          </section>
        )}

        <AnimatePresence>
          {activeSheet ? (
            <motion.div
              initial={{ opacity: 0 }}
              animate={{ opacity: 1 }}
              exit={{ opacity: 0 }}
              className="absolute inset-0 z-40 flex items-end bg-black/20 dark:bg-black/58 px-3 pb-3 pt-16 backdrop-blur-sm"
            >
              <motion.div
                initial={{ opacity: 0, y: 28 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: 28 }}
                className="w-full rounded-[28px] border border-black/5 dark:border-white/10 bg-surface-bright dark:bg-[#12161f]/96 p-5 shadow-apple dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
              >
                <div className="flex items-start justify-between gap-4">
                  <div>
                    <p className="text-[10px] uppercase tracking-[0.18em] text-primary">{activeSheet === 'preview' ? 'Live Preview' : 'Captured So Far'}</p>
                    <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface dark:text-white">
                      {activeSheet === 'preview' ? 'Transcript preview' : 'Saved conversation segments'}
                    </h2>
                  </div>
                  <button
                    type="button"
                    onClick={() => setActiveSheet(null)}
                    className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/6 p-2 text-on-surface-variant dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 transition"
                    aria-label="Close modal"
                  >
                    <span className="material-symbols-outlined text-[18px]">close</span>
                  </button>
                </div>

                {activeSheet === 'preview' ? (
                  <>
                    <p className="mt-3 text-sm leading-6 text-on-surface-variant/80 dark:text-white/58">{renderPreviewSummary(previewStatus, captureState)}</p>
                    <div ref={previewScrollerRef} className="mt-4 max-h-[44dvh] space-y-3 overflow-y-auto pr-1 hide-scrollbar">
                      {previewLines.length ? (
                        previewLines.map((line) => (
                          <div key={line.id} className="rounded-[22px] border border-black/5 dark:border-white/8 bg-black/5 dark:bg-white/4 px-4 py-3 text-sm leading-6 text-on-surface-variant dark:text-white/74">
                            {line.text}
                          </div>
                        ))
                      ) : (
                        <div className="rounded-[22px] border border-dashed border-black/10 dark:border-white/10 px-4 py-8 text-sm leading-6 text-on-surface-variant/60 dark:text-white/48">
                          {previewStatus === 'unsupported'
                            ? 'Mic is recording, but live preview is not available on this device.'
                            : previewStatus === 'blocked'
                              ? 'Mic is recording, but browser speech preview is blocked. The live meter still confirms capture.'
                              : 'Preview lines will stack here while the conversation is in progress.'}
                        </div>
                      )}

                      {interimPreview ? (
                        <motion.div
                          initial={{ opacity: 0, y: 8 }}
                          animate={{ opacity: 1, y: 0 }}
                          className="rounded-[22px] border border-primary/20 dark:border-primary/14 bg-primary/10 px-4 py-3 text-sm leading-6 text-primary dark:text-white/88 font-medium"
                        >
                          {interimPreview}
                        </motion.div>
                      ) : null}
                    </div>
                  </>
                ) : (
                  <div className="mt-4 max-h-[44dvh] space-y-3 overflow-y-auto pr-1 hide-scrollbar">
                    {segments.map((segment, index) => (
                      <div key={segment.id} className="rounded-[22px] border border-black/5 dark:border-white/8 bg-black/5 dark:bg-white/4 px-4 py-3">
                        <div className="flex items-center justify-between gap-3">
                          <p className="font-headline text-sm font-bold text-on-surface dark:text-white">Segment {index + 1}</p>
                          <span className="rounded-full border border-[#ffaa33]/30 dark:border-secondary/18 bg-[#ffaa33]/20 dark:bg-secondary/10 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-[#b36b00] dark:text-secondary">
                            {formatDuration(segment.durationMs ?? 0)}
                          </span>
                        </div>
                        <p className="mt-2 text-xs uppercase tracking-[0.16em] text-on-surface-variant/60 dark:text-white/40">{segment.fileName}</p>
                      </div>
                    ))}
                  </div>
                )}
              </motion.div>
            </motion.div>
          ) : null}
        </AnimatePresence>

        {error && detail ? (
          <div className="pointer-events-none fixed bottom-4 left-1/2 z-[80] w-[min(92vw,420px)] -translate-x-1/2 rounded-full border border-error/28 bg-error-container/92 px-5 py-3 text-sm text-on-error-container shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
            {error}
          </div>
        ) : null}
      </div>
    </main>
  );
}

function MetaPill({ label, tone }: { label: string; tone: 'default' | 'primary' | 'secondary' }) {
  const toneClasses =
    tone === 'primary'
      ? 'border-primary/20 bg-primary/10 text-primary dark:bg-primary/12'
      : tone === 'secondary'
        ? 'border-[#ffaa33]/30 bg-[#ffaa33]/20 text-[#b36b00] dark:border-secondary/20 dark:bg-secondary/10 dark:text-secondary'
        : 'border-black/10 bg-black/5 text-on-surface-variant dark:border-white/10 dark:bg-white/6 dark:text-white/70';

  return <span className={`rounded-full px-3 py-1 text-[10px] uppercase tracking-[0.18em] ${toneClasses}`}>{label}</span>;
}

function DetailPill({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-full border border-black/5 dark:border-white/8 bg-black/5 dark:bg-black/18 px-3 py-2.5">
      <p className="text-[9px] uppercase tracking-[0.16em] text-on-surface-variant/80 dark:text-white/38">{label}</p>
      <p className="mt-1 max-w-[11rem] truncate text-sm text-on-surface dark:text-white/74">{value}</p>
    </div>
  );
}

function renderPreviewSummary(previewStatus: PreviewStatus, captureState: LiveCaptureState) {
  if (previewStatus === 'unsupported') return 'Mic is recording. Live preview is not available on this device.';
  if (previewStatus === 'blocked') return 'Mic is recording. Browser speech preview is blocked, so rely on the live meter and timer instead.';
  if (previewStatus === 'error') return 'Live preview hit a browser issue, but the session is still being captured for the final transcript.';
  if (captureState === 'recording' && (previewStatus === 'listening' || previewStatus === 'idle')) {
    return 'The browser is listening for keywords now. Spoken phrases should appear here in a moment.';
  }
  if (previewStatus === 'live') return 'This preview is only a confidence aid. The full transcript is still generated after processing.';
  return 'Use the live preview to confirm the microphone is catching the conversation while you record.';
}

function makeId(prefix: string) {
  if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
    return `${prefix}-${crypto.randomUUID()}`;
  }
  return `${prefix}-${Math.random().toString(36).slice(2, 10)}`;
}

function formatDuration(milliseconds: number) {
  const totalSeconds = Math.max(0, Math.floor(milliseconds / 1000));
  const minutes = Math.floor(totalSeconds / 60);
  const seconds = totalSeconds % 60;
  return `${String(minutes).padStart(2, '0')}:${String(seconds).padStart(2, '0')}`;
}

function RecordingScreenSkeleton() {
  return (
    <section className="mt-4 flex min-h-0 flex-1 flex-col overflow-hidden rounded-[32px] border border-black/5 dark:border-white/10 bg-white/70 dark:bg-white/[0.04] p-5 shadow-apple dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl">
      <div className="shrink-0">
        <SkeletonLine className="h-10 w-44 bg-black/10 dark:bg-white/[0.08]" />
        <SkeletonLine className="mt-3 h-4 w-full bg-black/5 dark:bg-white/[0.05]" />
        <SkeletonLine className="mt-2 h-4 w-4/5 bg-black/5 dark:bg-white/[0.04]" />
        <div className="mt-4 flex flex-wrap gap-2">
          <SkeletonLine className="h-7 w-24 rounded-full bg-black/5 dark:bg-white/[0.05]" />
          <SkeletonLine className="h-7 w-28 rounded-full bg-black/5 dark:bg-white/[0.05]" />
          <SkeletonLine className="h-7 w-20 rounded-full bg-black/5 dark:bg-white/[0.05]" />
        </div>
      </div>

      <div className="flex min-h-0 flex-1 flex-col items-center justify-center px-2 py-3">
        <SkeletonCircle className="h-[11.5rem] w-[11.5rem] border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/[0.05]" />
        <div className="mt-5 flex w-full max-w-[220px] items-end justify-center gap-1">
          {Array.from({ length: 18 }, (_, index) => (
            <SkeletonLine
              key={`recording-meter-${index}`}
              className={`w-1 rounded-full bg-black/10 dark:bg-white/[0.05] ${index % 3 === 0 ? 'h-8' : index % 2 === 0 ? 'h-5' : 'h-10'}`}
            />
          ))}
        </div>
        <SkeletonLine className="mt-5 h-4 w-56 bg-black/5 dark:bg-white/[0.05]" />
        <SkeletonLine className="mt-2 h-4 w-52 bg-black/5 dark:bg-white/[0.04]" />
      </div>
    </section>
  );
}
