import { useEffect, useMemo, useRef, useState } from 'react';
import { motion } from 'motion/react';
import { type Screen } from '../types';
import { writeSearchParam } from '../lib/appRouter';
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
  const [speedBreakdownRef, shouldAnimateSpeedBreakdown] = useOneTimeInView<HTMLDivElement>();

  useEffect(() => {
    void loadReports();
  }, []);

  const selectedReport = useMemo(
    () => reports.find((report) => report.id === selectedReportId) ?? reports[0] ?? null,
    [reports, selectedReportId],
  );

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
    <main className="min-h-screen bg-[radial-gradient(circle_at_top,#13253a_0%,#081018_34%,#04070c_68%,#020305_100%)] px-4 py-6 sm:px-6">
      <div className="mx-auto max-w-[880px] space-y-5">
        <button
          type="button"
          onClick={handleBack}
          className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/[0.06] px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] text-white/74 backdrop-blur"
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
            <section className="rounded-[30px] border border-white/10 bg-[linear-gradient(140deg,rgba(17,28,42,0.96)_0%,rgba(9,14,21,0.94)_48%,rgba(6,9,14,0.98)_100%)] px-5 py-6 shadow-[0_28px_90px_rgba(0,0,0,0.35)] sm:px-6">
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">Speed Breakdown</p>
              <h1 className="mt-2 font-headline text-[30px] font-bold leading-tight text-white sm:text-[38px]">How the conversation moved stage by stage</h1>
              <p className="mt-3 max-w-[42rem] text-sm leading-6 text-white/62">
                The earlier animated fill is back here, so each bar grows in when this page comes into view.
              </p>
              <div className="mt-4 flex flex-wrap gap-2">
                <MetaChip label={selectedReport.customerName} />
                <MetaChip label={selectedReport.sessionTitle} />
                <MetaChip label={`Score ${selectedReport.overallScore}`} subtle />
              </div>
            </section>

            <section ref={speedBreakdownRef} className="space-y-3">
              {selectedReport.report.speedStages.map((stage, index) => (
                <SpeedStageCard key={stage.stage} stage={stage} index={index} shouldAnimate={shouldAnimateSpeedBreakdown} />
              ))}
            </section>
          </>
        ) : (
          <section className="rounded-[30px] border border-dashed border-white/10 bg-white/[0.03] px-5 py-12 text-center text-sm leading-6 text-white/48">
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
}: {
  stage: SpeedStage;
  index: number;
  shouldAnimate: boolean;
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <div className="flex items-center justify-between gap-3">
        <div>
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Stage</p>
          <p className="mt-1 font-headline text-lg text-white">{stage.stage}</p>
        </div>
        <div className="text-right">
          <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Score</p>
          <AnimatedNumber
            value={stage.score}
            className="mt-1 block font-headline text-2xl text-white"
            delay={0.1 + index * 0.05}
            animate={shouldAnimate}
          />
        </div>
      </div>
      <div className="mt-3 h-2 overflow-hidden rounded-full bg-white/[0.05] shadow-[inset_0_1px_2px_rgba(255,255,255,0.05)]">
        <motion.div
          className="h-full rounded-full bg-[linear-gradient(90deg,rgba(214,224,237,0.92)_0%,rgba(167,184,207,0.92)_48%,rgba(112,131,158,0.88)_100%)] shadow-[0_0_18px_rgba(164,182,204,0.22)]"
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
      <p className="mt-3 text-sm leading-6 text-white/58">{stage.note}</p>
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

function useOneTimeInView<T extends HTMLElement>() {
  const ref = useRef<T | null>(null);
  const [hasEnteredView, setHasEnteredView] = useState(false);

  useEffect(() => {
    const node = ref.current;
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
  }, [hasEnteredView]);

  return [ref, hasEnteredView] as const;
}

function MetaChip({ label, subtle = false }: { label: string; subtle?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${subtle ? 'border-white/8 bg-white/[0.04] text-white/50' : 'border-white/10 bg-white/[0.06] text-white/62'}`}>
      {label}
    </span>
  );
}

function ErrorBanner({ text }: { text: string }) {
  return (
    <div className="fixed bottom-6 left-1/2 z-[80] w-[min(92vw,760px)] -translate-x-1/2 rounded-full border border-[#FF6B6B]/30 bg-[#3b1618]/95 px-5 py-3 text-sm text-[#ffd5d5] shadow-[0_20px_60px_rgba(0,0,0,0.35)]">
      {text}
    </div>
  );
}
