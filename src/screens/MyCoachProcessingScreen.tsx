import { AnimatePresence, motion } from 'motion/react';
import { type FormEvent, useEffect, useRef, useState } from 'react';
import {
  analyzeCoachSession,
  clearPendingLiveSessionSubmission,
  createCoachSessionDraft,
  getCoachSessionDetail,
  getCustomerThread,
  getTranscriptUnavailableMessage,
  hasUsableTranscript,
  readPendingLiveSessionSubmission,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  updateCustomerThread,
  uploadCoachAudioToSession,
  type CreateCustomerInput,
  type PendingLiveSessionSubmission,
} from '../lib/myCoachApi';
import { type Screen } from '../types';

const PROCESSING_PHRASES = ['Preparing session', 'Cooking insights', 'Scoring SPEED', 'Reviewing objections', 'Drafting next visit'];
const PROCESSING_TIPS = [
  'Next-visit prep gets sharper when you state the customer’s real objection clearly.',
  'A clean closing line in the conversation makes the final report more actionable.',
  'If the customer compares two models, mention both so the coach can anchor the recommendation correctly.',
];
const TRANSCRIPT_UNAVAILABLE_MESSAGE = getTranscriptUnavailableMessage();
const EMPTY_CONFIRM_FORM: CreateCustomerInput = {
  customerName: '',
  phone: '',
  customerContext: '',
  preferredLanguage: '',
  notes: '',
};

type ProcessingPhase = 'preparing' | 'confirm' | 'analyzing' | 'idle';

export function MyCoachProcessingScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [phraseIndex, setPhraseIndex] = useState(0);
  const [tipIndex, setTipIndex] = useState(0);
  const [phase, setPhase] = useState<ProcessingPhase>('preparing');
  const [error, setError] = useState<string | null>(null);
  const [confirmForm, setConfirmForm] = useState<CreateCustomerInput>(EMPTY_CONFIRM_FORM);
  const [preparedSessionId, setPreparedSessionId] = useState<string | null>(null);
  const [pendingSubmission] = useState<PendingLiveSessionSubmission | null>(() => readPendingLiveSessionSubmission());
  const cancelledRef = useRef(false);
  const cancelTimerRef = useRef<number | null>(null);
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
    const scheduleCancel = () => {
      cancelTimerRef.current = window.setTimeout(() => {
        cancelledRef.current = true;
        cancelTimerRef.current = null;
      }, 0);
    };

    if (cancelTimerRef.current !== null) {
      window.clearTimeout(cancelTimerRef.current);
      cancelTimerRef.current = null;
      cancelledRef.current = false;
    }

    if (!processingStartedRef.current) {
      processingStartedRef.current = true;
      void runPreparation();
    }

    return scheduleCancel;
  }, []);

  async function runPreparation() {
    if (!pendingSubmission) {
      setPhase('idle');
      setError('No live session is ready to process. Start a new session from My Coach first.');
      return;
    }

    setPhase('preparing');
    setError(null);
    cancelledRef.current = false;

    try {
      const detailPromise = getCustomerThread(pendingSubmission.customerId).catch(() => null);
      const session = await createCoachSessionDraft({
        customerId: pendingSubmission.customerId,
        title: pendingSubmission.title,
      });

      if (cancelledRef.current) return;

      const delay = new Promise((resolve) => window.setTimeout(resolve, 1800));
      await Promise.all([
        uploadCoachAudioToSession(session.id, {
          clips: pendingSubmission.clips,
          transcriptText: pendingSubmission.transcriptText,
          transcriptLines: pendingSubmission.transcriptLines,
        }),
        delay,
      ]);

      if (cancelledRef.current) return;

      const [detail, sessionDetail] = await Promise.all([detailPromise, getCoachSessionDetail(session.id)]);
      if (cancelledRef.current) return;

      setPreparedSessionId(session.id);

      if (!hasUsableTranscript(sessionDetail.session.transcript)) {
        setPhase('idle');
        setError(TRANSCRIPT_UNAVAILABLE_MESSAGE);
        return;
      }

      setConfirmForm({
        customerName: detail?.customerName || sessionDetail.customer?.customerName || 'Walk-in Customer',
        phone: normalizeEditableValue(detail?.phone || sessionDetail.customer?.phone || ''),
        customerContext: detail?.customerContext || sessionDetail.customer?.customerContext || '',
        preferredLanguage: detail?.preferredLanguage || '',
        notes: detail?.threadNotes || '',
      });
      setPhase('confirm');
    } catch (issue) {
      if (cancelledRef.current) return;
      setPhase('idle');
      setError(issue instanceof Error ? issue.message : 'Could not process this live session.');
    }
  }

  async function handleConfirmSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    if (!pendingSubmission || !preparedSessionId) {
      setPhase('idle');
      setError('The prepared session is missing. Start again from My Coach.');
      return;
    }
    if (!confirmForm.customerName.trim() || !confirmForm.customerContext.trim()) {
      setError('Customer name and need summary are required before analysis.');
      return;
    }

    setPhase('analyzing');
    setError(null);
    cancelledRef.current = false;

    try {
      await updateCustomerThread(pendingSubmission.customerId, confirmForm);
      const delay = new Promise((resolve) => window.setTimeout(resolve, 1400));
      const [result] = await Promise.all([analyzeCoachSession(preparedSessionId), delay]);
      if (cancelledRef.current) return;
      if (!result.report?.id) {
        throw new Error('The session finished without a report.');
      }

      rememberSelectedThreadId(pendingSubmission.customerId);
      rememberSelectedSessionId(result.session.id);
      rememberSelectedReportId(result.report.id);
      rememberFlowOrigin('live_session');
      clearPendingLiveSessionSubmission();
      onNavigate('my_coach_report_detail');
    } catch (issue) {
      if (cancelledRef.current) return;
      setPhase('confirm');
      setError(issue instanceof Error ? issue.message : 'Could not run the final My Coach analysis.');
    }
  }

  function handleRetryCapture() {
    cancelledRef.current = true;
    if (pendingSubmission) {
      rememberSelectedThreadId(pendingSubmission.customerId);
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

  const isBusy = phase === 'preparing' || phase === 'analyzing';
  const transcriptNeedsRecapture = error === TRANSCRIPT_UNAVAILABLE_MESSAGE;
  const uploadNeedsReplacement = transcriptNeedsRecapture && pendingSubmission?.source === 'uploaded';
  const heading =
    phase === 'confirm'
      ? 'Confirm customer details'
      : phase === 'analyzing'
        ? 'Running final analysis'
        : PROCESSING_PHRASES[phraseIndex];
  const description =
    phase === 'confirm'
      ? 'The audio is uploaded and the transcript is ready. Confirm the customer thread before My Coach sends this session to the LLM.'
      : phase === 'analyzing'
        ? 'The transcript and customer context are locked in now. Stay here for a moment while the final report is generated.'
        : 'The live session is being stitched into one coaching view now. Stay here for a moment while the report gets ready.';

  return (
    <main className="relative min-h-screen overflow-hidden bg-[radial-gradient(circle_at_15%_0%,rgba(0,122,255,0.18),transparent_34%),radial-gradient(circle_at_88%_16%,rgba(255,149,0,0.14),transparent_28%),linear-gradient(180deg,#f8fbff_0%,#eef4fa_56%,#f6f7f9_100%)] dark:bg-[#080b11] text-on-surface dark:text-white">
      <div className="absolute inset-0">
        <motion.div
          animate={{ opacity: [0.18, 0.4, 0.18], x: [0, 28, 0], y: [0, -20, 0] }}
          transition={{ duration: 9, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute left-[-8%] top-[-14%] h-[36rem] w-[36rem] rounded-full bg-primary/25 dark:bg-primary/18 blur-[130px]"
        />
        <motion.div
          animate={{ opacity: [0.14, 0.32, 0.14], x: [0, -22, 0], y: [0, 22, 0] }}
          transition={{ duration: 7.8, repeat: Infinity, ease: 'easeInOut' }}
          className="absolute bottom-[-16%] right-[-8%] h-[30rem] w-[30rem] rounded-full bg-secondary/25 dark:bg-secondary/18 blur-[120px]"
        />
        <div className="absolute inset-0 bg-gradient-to-b from-white/18 to-white/55 dark:from-[#080b11]/30 dark:to-[#080b11]/94" />
      </div>

      <div className="relative z-10 flex min-h-screen flex-col items-center justify-center px-6 py-8 text-center">
        <div className="w-full max-w-3xl rounded-[36px] border border-white/80 dark:border-white/10 bg-white/78 dark:bg-white/[0.04] px-6 py-8 shadow-[0_28px_80px_rgba(15,23,42,0.14)] dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)] backdrop-blur-xl ring-1 ring-slate-900/5 dark:ring-0 sm:px-10 sm:py-10">
          <span className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/6 px-4 py-1 text-[10px] uppercase tracking-[0.2em] text-on-surface-variant dark:text-white/58">
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
              key={heading}
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -18 }}
              className="mt-8 font-headline text-4xl font-bold tracking-tight text-on-surface dark:text-white sm:text-5xl"
            >
              {heading}
            </motion.h1>
          </AnimatePresence>

          <p className="mt-4 text-sm leading-7 text-on-surface-variant/80 dark:text-white/62">{description}</p>

          <div className="mt-8 rounded-[28px] border border-black/5 dark:border-white/10 bg-white/60 dark:bg-black/18 px-5 py-5 text-left shadow-sm dark:shadow-none">
            <p className="text-[10px] uppercase tracking-[0.18em] text-[#e08810] dark:text-secondary">
              {phase === 'confirm' ? 'Before the LLM call' : 'While you wait'}
            </p>
            <AnimatePresence mode="wait">
              <motion.p
                key={phase === 'confirm' ? 'confirm-tip' : tipIndex}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                className="mt-3 text-sm leading-7 text-on-surface-variant dark:text-white/68"
              >
                {phase === 'confirm'
                  ? 'This checkpoint happens before the LLM analysis so corrected name, context, language, and notes feed into the final coaching report.'
                  : PROCESSING_TIPS[tipIndex]}
              </motion.p>
            </AnimatePresence>
          </div>

          {error && phase !== 'confirm' ? (
            <div className="mt-8 rounded-[28px] border border-error/26 bg-error-container/92 px-5 py-4 text-left text-sm leading-6 text-on-error-container">
              {error}
            </div>
          ) : null}

          <div className="mt-8 flex flex-col gap-3 sm:flex-row sm:justify-center">
            {phase === 'idle' && error ? (
              <button
                type="button"
                onClick={
                  transcriptNeedsRecapture
                    ? uploadNeedsReplacement
                      ? handleBack
                      : handleRetryCapture
                    : () => void runPreparation()
                }
                className="rounded-full bg-[#ffaa33] dark:bg-secondary px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-black dark:text-on-secondary-fixed shadow-sm dark:shadow-none transition hover:opacity-90"
              >
                {uploadNeedsReplacement
                  ? 'Try another upload'
                  : transcriptNeedsRecapture
                    ? 'Retry capture'
                    : 'Retry processing'}
              </button>
            ) : null}
            <button
              type="button"
              onClick={handleBack}
              className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/6 px-5 py-3 text-xs font-bold uppercase tracking-[0.18em] text-on-surface-variant dark:text-white/72 hover:bg-black/10 dark:hover:bg-white/10 transition"
            >
              {isBusy ? 'Back to My Coach' : 'Return to My Coach'}
            </button>
          </div>
        </div>
      </div>

      <AnimatePresence>
        {phase === 'confirm' ? (
          <motion.div
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            className="fixed inset-0 z-[90] flex items-end bg-black/20 dark:bg-black/58 px-3 pb-3 pt-16 backdrop-blur-sm"
          >
            <motion.div
              initial={{ opacity: 0, y: 28 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: 28 }}
              className="mx-auto w-full max-w-2xl rounded-[28px] border border-black/5 dark:border-white/10 bg-surface-bright dark:bg-[#12161f]/96 p-5 shadow-apple dark:shadow-[0_24px_80px_rgba(0,0,0,0.42)]"
            >
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="text-[10px] uppercase tracking-[0.18em] text-primary">Confirm Before Analysis</p>
                  <h2 className="mt-2 font-headline text-2xl font-bold text-on-surface dark:text-white">Review the customer thread</h2>
                </div>
                <button
                  type="button"
                  onClick={handleBack}
                  className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/6 p-2 text-on-surface-variant dark:text-white/70 hover:bg-black/10 dark:hover:bg-white/10 transition"
                  aria-label="Close modal"
                >
                  <span className="material-symbols-outlined text-[18px]">close</span>
                </button>
              </div>

              <p className="mt-3 text-sm leading-6 text-on-surface-variant/80 dark:text-white/58">
                If the customer’s name was not spoken clearly, or the transcript missed it, fix the thread here before My Coach generates the final report.
              </p>

              {error ? (
                <div className="mt-4 rounded-[22px] border border-error/26 bg-error-container/92 px-4 py-3 text-sm leading-6 text-on-error-container">
                  {error}
                </div>
              ) : null}

              <form onSubmit={(event) => void handleConfirmSubmit(event)} className="mt-5 space-y-3">
                <div className="grid gap-3 lg:grid-cols-2">
                  <input
                    value={confirmForm.customerName}
                    onChange={(event) => setConfirmForm((current) => ({ ...current, customerName: event.target.value }))}
                    placeholder="Customer name"
                    className="w-full rounded-2xl border border-black/10 dark:border-white/8 bg-white dark:bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 dark:placeholder:text-white/32 focus:border-primary/60 dark:focus:border-primary/40 focus:outline-none"
                  />
                  <input
                    value={confirmForm.phone}
                    onChange={(event) => setConfirmForm((current) => ({ ...current, phone: event.target.value }))}
                    placeholder="Phone number (optional)"
                    className="w-full rounded-2xl border border-black/10 dark:border-white/8 bg-white dark:bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 dark:placeholder:text-white/32 focus:border-primary/60 dark:focus:border-primary/40 focus:outline-none"
                  />
                  <input
                    value={confirmForm.customerContext}
                    onChange={(event) => setConfirmForm((current) => ({ ...current, customerContext: event.target.value }))}
                    placeholder="Need summary or customer context"
                    className="w-full rounded-2xl border border-black/10 dark:border-white/8 bg-white dark:bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 dark:placeholder:text-white/32 focus:border-primary/60 dark:focus:border-primary/40 focus:outline-none"
                  />
                  <input
                    value={confirmForm.preferredLanguage}
                    onChange={(event) => setConfirmForm((current) => ({ ...current, preferredLanguage: event.target.value }))}
                    placeholder="Language (optional)"
                    className="w-full rounded-2xl border border-black/10 dark:border-white/8 bg-white dark:bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 dark:placeholder:text-white/32 focus:border-primary/60 dark:focus:border-primary/40 focus:outline-none"
                  />
                  <textarea
                    value={confirmForm.notes}
                    onChange={(event) => setConfirmForm((current) => ({ ...current, notes: event.target.value }))}
                    placeholder="Optional visit notes"
                    rows={3}
                    className="w-full rounded-[22px] border border-black/10 dark:border-white/8 bg-white dark:bg-surface-container-high/65 px-4 py-3 text-sm text-on-surface placeholder:text-on-surface-variant/40 dark:placeholder:text-white/32 focus:border-primary/60 dark:focus:border-primary/40 focus:outline-none lg:col-span-2"
                  />
                </div>

                <div className="flex flex-col gap-3 sm:flex-row sm:justify-end">
                  <button
                    type="button"
                    onClick={handleBack}
                    className="rounded-full border border-black/10 dark:border-white/10 bg-black/5 dark:bg-white/6 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 hover:bg-black/10 dark:hover:bg-white/10 transition"
                  >
                    Back to My Coach
                  </button>
                  <button
                    type="submit"
                    className="rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed"
                  >
                    Run My Coach analysis
                  </button>
                </div>
              </form>
            </motion.div>
          </motion.div>
        ) : null}
      </AnimatePresence>
    </main>
  );
}

function normalizeEditableValue(value: string) {
  const normalized = String(value || '').trim();
  return normalized === 'Not captured' ? '' : normalized;
}
