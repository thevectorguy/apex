import { AnimatePresence, motion } from 'motion/react';
import { useEffect, useRef, useState } from 'react';
import {
  clearPendingLiveSessionSubmission,
  getTranscriptUnavailableMessage,
  readPendingLiveSessionSubmission,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  submitCoachAudio,
} from '../lib/myCoachApi';
import { type Screen } from '../types';

const PROCESSING_PHRASES = ['Preparing session', 'Cooking insights', 'Scoring SPEED', 'Reviewing objections', 'Drafting next visit'];
const PROCESSING_TIPS = [
  'Next-visit prep gets sharper when the salesperson states the customer’s real objection clearly.',
  'A clean closing line in the conversation makes the final report more actionable.',
  'If the customer compares two models, mention both so the coach can anchor the recommendation correctly.',
];

const TRANSCRIPT_UNAVAILABLE_MESSAGE = getTranscriptUnavailableMessage();

export function MyCoachProcessingScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [running, setRunning] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const cancelledRef = useRef(false);
  const processingStartedRef = useRef(false);

  useEffect(() => {
    const phraseTimer = window.setInterval(() => {
      setPhraseIndex((current) => (current + 1) % PROCESSING_PHRASES.length);
    }, 1800);
    const tipTimer = window.setInterval(() => {
      setTipIndex((current) => (current + 1) % PROCESSING_TIPS.length);
    }, 3600);

    return () => {
      window.clearInterval(phraseTimer);
      window.clearInterval(tipTimer);
    };
  }, []);

  useEffect(() => {
    if (processingStartedRef.current) return;
    processingStartedRef.current = true;
    void runProcessing();
    return () => {
      cancelledRef.current = true;
    };
  }, []);

  async function runProcessing() {
    const pending = readPendingLiveSessionSubmission();
    if (!pending) {
      setRunning(false);
      setError('No live session is ready to process. Start a new session from My Coach first.');
      return;
    }

    setRunning(true);
    setError(null);
    cancelledRef.current = false;

    try {
      const delay = new Promise((resolve) => window.setTimeout(resolve, 2600));
      const [result] = await Promise.all([submitCoachAudio(pending), delay]);
      if (cancelledRef.current) return;
      if (!result.report?.id) {
        throw new Error('The session finished without a report.');
      }

      rememberSelectedThreadId(pending.customerId);
      rememberSelectedSessionId(result.session.id);
      rememberSelectedReportId(result.report.id);
      rememberFlowOrigin('live_session');
      clearPendingLiveSessionSubmission();
      onNavigate('my_coach_report_detail');
    } catch (issue) {
      if (cancelledRef.current) return;
      setRunning(false);
      setError(issue instanceof Error ? issue.message : 'Could not process this live session.');
    }
  }

  function handleRetryCapture() {
    const pending = readPendingLiveSessionSubmission();
    cancelledRef.current = true;
    if (pending) {
      rememberSelectedThreadId(pending.customerId);
      rememberFlowOrigin('live_session');
    }
    clearPendingLiveSessionSubmission();
    onNavigate('my_coach_recording');
  }

  function handleBack() {
    cancelledRef.current = true;
    clearPendingLiveSessionSubmission();
    onNavigate('my_coach');
  }

  const transcriptNeedsRecapture = error === TRANSCRIPT_UNAVAILABLE_MESSAGE;

  return (
    <main className="relative min-h-screen overflow-hidden bg-[#080b11] text-white">
      <div className="absolute inset-0">
        <motion.div
          animate={{ opacity: [0.18, 0.4, 0.18], x: [0, 28, 0], y: [0, -20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[-8%] top-[-14%] h-[36rem] w-[36rem] rounded-full bg-primary/18 blur-[130px]"
        />
        <motion.div
          animate={{ opacity: [0.14, 0.32, 0.14], x: [0, -22, 0], y: [0, 22, 0] }}
          transition={{ duration: 7.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-16%] right-[-8%] h-[30rem] w-[30rem] rounded-full bg-secondary/18 blur-[120px]"
        />
        <div className="absolute inset-0 bg-[linear-gradient(180deg,rgba(8,11,17,0.32),rgba(8,11,17,0.94))]" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-8 text-center">
        <div className="w-full max-w-3xl rounded-[36px] border border-white/10 bg-white/[0.04] px-6 py-8 shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl sm:px-10 sm:py-10">
          <span className="rounded-full border border-white/10 bg-white/6 px-4 py-1 text-[10px] uppercase tracking-[0.2em] text-white/58">
            My Coach is working
          </span>

          <div className="mt-8 flex items-center justify-center gap-3">
            {[0, 1, 2].map((dot) => (
              <motion.span
                key={dot}
                animate={{ opacity: [0.24, 1, 0.24], y: [0, -8, 0] }}
                transition={{ duration: 1.2, repeat: Infinity, delay: dot * 0.18 }}
                className="h-2.5 w-2.5 rounded-full bg-primary"
              />
            ))}
          </div>

          <AnimatePresence mode="wait">
            <motion.h1
              key={phraseIndex}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="mt-8 font-headline text-4xl font-bold tracking-tight text-white sm:text-5xl"
            >
              {PROCESSING_PHRASES[phraseIndex]}
            </motion.h1>
          </AnimatePresence>

          <p className="mt-4 text-sm leading-7 text-white/62">
            The live session is being stitched into one coaching view now. Stay here for a moment while the report gets ready.
          </p>

          <div className="mt-8 rounded-[28px] border border-white/10 bg-black/18 px-5 py-5 text-left">
            <p className="text-[10px] uppercase tracking-[0.18em] text-secondary">While you wait</p>
            <AnimatePresence mode="wait">
              <motion.p
                key={tipIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mt-3 text-sm leading-7 text-white/68"
              >
                {PROCESSING_TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {error ? (
            <div className="mt-8 rounded-[28px] border border-error/26 bg-error-container/92 px-5 py-4 text-left text-sm leading-6 text-on-error-container">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {error ? (
              <button
                type="button"
                onClick={transcriptNeedsRecapture ? handleRetryCapture : () => void runProcessing()}
                className="rounded-full bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-on-secondary-fixed"
              >
                {transcriptNeedsRecapture ? 'Retry capture' : 'Retry processing'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border border-white/10 bg-white/6 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-white/72"
            >
              {running ? 'Back to My Coach' : 'Return to My Coach'}
            </button>
          </div>
        </div>
      </div>
    </main>
  );
}
