import { useCallback, useEffect, useMemo, useState } from 'react';
import { motion } from 'motion/react';
import { type Screen } from '../types';
import { writeSearchParam } from '../lib/appRouter';
import { getReportSectionTone } from '../lib/myCoachReportTones';
import {
  listCoachReports,
  readRememberedReportId,
  type CoachReportListItem,
} from '../lib/myCoachApi';

type SpeedStage = CoachReportListItem['report']['speedStages'][number];

export function MyCoachReportSpeedScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [selectedReportId, setSelectedReportId] = useState<string | null>(readRememberedReportId());
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    void loadReports();
  }, []);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );
  const speedAnimationKey = selectedReport
    ? `${selectedReport.id}:${selectedReport.report.speedStages.map((stage) => `${stage.stage}:${stage.score}`).join('|')}`
    : 'none';
  const [speedBreakdownRef, shouldAnimateSpeedBreakdown] = useOneTimeInView<HTMLDivElement>(speedAnimationKey);
  const tone = getReportSectionTone('overview', selectedReport?.grade ?? 'B');

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      const nextReports = await listCoachReports();
      setReports(nextReports);
      setSelectedReportId((current) => current && nextReports.some((report) => report.id === current) ? current : nextReports[0]?.id ?? null);
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load the speed breakdown.');
    } finally {
      setLoading(false);
    }
  }

  function handleBack() {
    writeSearchParam('reportSection', 'overview');
    onNavigate('my_coach_report_section');
  }

  return (
    <main className="min-h-screen bg-[radial-gradient(circle_at_16%_0%,rgba(0,122,255,0.16),transparent_32%),radial-gradient(circle_at_92%_16%,rgba(255,149,0,0.12),transparent_26%),linear-gradient(180deg,#f8fbff_0%,#eef4fa_58%,#f6f7f9_100%)] dark:bg-[radial-gradient(circle_at_top,#13253a_0%,#081018_34%,#04070c_68%,#020305_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[880px] space-y-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-on-surface-variant dark:text-white/74 backdrop-blur transition hover:bg-black/10 dark:hover:bg-white/[0.1]"
        >
          <span className="material-symbols-outlined text-[16px]">arrow_back</span>
          Back to Overview
        </button>

        {loading ? (
          <section className="rounded-[30px] border border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-white/48">
            Loading speed breakdown...
          </section>
        ) : selectedReport ? (
          <>
            <section className={`rounded-[30px] border px-5 py-6 sm:px-6 ${tone.heroClass}`}>
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/80 dark:text-[#8fb9ff]">Speed Breakdown</p>
              <h1 className="mt-2 font-headline text-[30px] font-bold leading-tight text-white sm:text-[38px]">How the conversation moved stage by stage</h1>
              <p className="mt-3 max-w-[42rem] text-sm leading-6 text-white/62">
                The earlier animated fill is back here, so each bar grows in when this page comes into view.
              </p>
            </section>

            <section ref={speedBreakdownRef} className="space-y-3">
              {selectedReport.report.speedStages.map((stage, index) => (
                <SpeedStageCard key={stage.stage} stage={stage} index={index} shouldAnimate={shouldAnimateSpeedBreakdown} tone={tone} />
              ))}
            </section>
          </>
        ) : (
          <section className="rounded-[30px] border border-dashed border-black/10 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-on-surface-variant/60 dark:text-white/48">
            Open a report from the report library first.
          </section>
        )}

        {error ? <ErrorBanner text={error} /> : null}
      </div>
    </main>
  );
}

function SpeedStageCard({
  stage,
  index,
  shouldAnimate,
  tone,
}: {
  stage: SpeedStage;
  index: number;
  shouldAnimate: boolean;
  tone: ReturnType<typeof getReportSectionTone>;
}) {
  return (
    <div className="rounded-[24px] border border-black/5 dark:border-white/8 bg-white dark:bg-white/[0.03] px-4 py-4 shadow-sm dark:shadow-none">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className={`text-[10px] uppercase tracking-[0.16em] ${tone.accentTextMutedClass}`}>Stage</p>
          <p className="mt-1 font-headline text-lg text-on-surface dark:text-white">{stage.stage}</p>
        </div>
        <div className="text-right">
          <p className={`text-[10px] uppercase tracking-[0.16em] ${tone.accentTextMutedClass}`}>Score</p>
          <AnimatedNumber
            value={stage.score}
            className="mt-1 block font-headline text-2xl text-on-surface dark:text-white"
            delay={0.1 + index * 0.05}
            animate={shouldAnimate}
          />
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-black/5 dark:bg-white/[0.05] shadow-[inset_0_1px_2px_rgba(0,0,0,0.05)] dark:shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
        <motion.div
          className={`h-full rounded-full ${tone.progressBarClass}`}
          initial={{ width: 0, x: '-6%' }}
          animate={shouldAnimate ? { width: `${stage.score}%`, x: 0 } : { width: 0, x: '-6%' }}
          transition={
            shouldAnimate
              ? {
                  delay: 0.14 + index * 0.05,
                  duration: 0.85,
                  ease: [0.22, 1, 0.36, 1],
                }
              : { duration: 0 }
          }
        />
      </div>
      <p className="mt-3 text-sm leading-6 text-on-surface-variant dark:text-white/58">{stage.note}</p>
    </div>
  );
}

function AnimatedNumber({
  value,
  className,
  delay = 0,
  animate = true,
}: {
  value: number;
  className?: string;
  delay?: number;
  animate?: boolean;
}) {
  const [displayValue, setDisplayValue] = useState(0);

  useEffect(() => {
    if (!animate) {
      setDisplayValue(0);
      return;
    }

    let frameId = 0;
    let timeoutId: ReturnType<typeof setTimeout> | null = null;
    const duration = 850;

    const tick = (startTime: number) => {
      const step = (timestamp: number) => {
        const elapsed = timestamp - startTime;
        const progress = Math.min(elapsed / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        setDisplayValue(Math.round(value * eased));
        if (progress < 1) frameId = window.requestAnimationFrame(step);
      };

      frameId = window.requestAnimationFrame(step);
    };

    timeoutId = setTimeout(() => tick(performance.now()), delay * 1000);

    return () => {
      if (timeoutId) clearTimeout(timeoutId);
      if (frameId) window.cancelAnimationFrame(frameId);
    };
  }, [animate, delay, value]);

  return <span className={className}>{displayValue}</span>;
}

function useOneTimeInView<T extends HTMLElement>(resetKey: string) {
  const [node, setNode] = useState<T | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);
  const ref = useCallback((nextNode: T | null) => {
    setNode(nextNode);
  }, []);

  useEffect(() => {
    setHasEnteredView(false);
  }, [resetKey]);

  useEffect(() => {
    if (!node || hasEnteredView) return;

    if (typeof window === 'undefined' || typeof IntersectionObserver === 'undefined') {
      setHasEnteredView(true);
      return;
    }

    const observer = new IntersectionObserver(
      (entries) => {
        const entry = entries[0];
        if (!entry) return;
        if (entry.isIntersecting || entry.intersectionRatio > 0.16) {
          setHasEnteredView(true);
          observer.disconnect();
        }
      },
      { threshold: [0.16], rootMargin: '0px 0px -8% 0px' },
    );

    observer.observe(node);
    return () => observer.disconnect();
  }, [node, hasEnteredView]);

  return [ref, hasEnteredView] as const;
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-full border border-[#FF6B6B]/30 bg-[#3b1618]/95 px-5 py-3 text-sm text-[#ffd5d5] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {text}
    </div>
  );
}
