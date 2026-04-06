import { useEffect, useMemo, useState, type ReactNode } from 'react';
import { motion } from 'motion/react';
import { type Screen } from '../types';
import {
  getMasterCopyInfo,
  getTrainingMasterCopyLabel,
  listCoachReports,
  readRememberedReportId,
  readRememberedSessionId,
  readRememberedThreadId,
  rememberFlowOrigin,
  rememberSelectedReportId,
  rememberSelectedSessionId,
  rememberSelectedThreadId,
  type CoachReportListItem,
} from '../lib/myCoachApi';
import { personalizeCoachCopy } from '../lib/personalizeCoachCopy';
import { SkeletonCircle, SkeletonLine } from '../components/Skeleton';

type NuggetTone = 'positive' | 'warning' | 'neutral';

type Nugget = {
  eyebrow: string;
  title: string;
  detail: string;
  tone: NuggetTone;
};

type LearningVideo = {
  title: string;
  duration: string;
  directive: string;
  summary: string;
};

type VisitSignal = {
  title: string;
  summary: string;
  direction: string;
  tone: 'positive' | 'warning' | 'default';
};

const recommendationSections = [
  { id: 'overview', label: 'Overview' },
  { id: 'nuggets', label: 'Nuggets' },
  { id: 'coaching', label: 'Coaching' },
  { id: 'learning', label: 'Learning' },
] as const;

type RecommendationSectionId = (typeof recommendationSections)[number]['id'];

export function MyCoachRecommendationsScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const [reports, setReports] = useState<CoachReportListItem[]>([]);
  const [activeSection, setActiveSection] = useState<RecommendationSectionId>('overview');
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [masterCopyLabel, setMasterCopyLabel] = useState(getTrainingMasterCopyLabel());

  useEffect(() => {
    void loadReports();
    void getMasterCopyInfo()
      .then((info) => setMasterCopyLabel(info.version))
      .catch(() => {});
  }, []);

  async function loadReports() {
    setLoading(true);
    setError(null);
    try {
      setReports(await listCoachReports());
    } catch (issue) {
      setError(issue instanceof Error ? issue.message : 'Could not load recommendations.');
    } finally {
      setLoading(false);
    }
  }

  const selectedReport = useMemo(() => pickContextualReport(reports), [reports]);
  const directives = useMemo(() => (selectedReport ? buildDirectiveList(selectedReport.report) : []), [selectedReport]);
  const nuggets = useMemo(() => (selectedReport ? buildNuggets(selectedReport.report) : []), [selectedReport]);
  const videos = useMemo(() => (selectedReport ? buildLearningVideos(selectedReport.report) : []), [selectedReport]);
  const visitSignal = useMemo(() => (selectedReport ? deriveNextVisitSignal(selectedReport.report) : null), [selectedReport]);

  function openReportDetail() {
    if (!selectedReport) return;
    rememberFlowOrigin('tutorial');
    rememberSelectedReportId(selectedReport.id);
    rememberSelectedThreadId(selectedReport.customerId);
    rememberSelectedSessionId(selectedReport.sessionId);
    onNavigate('my_coach_report_detail');
  }

  return (
    <main className="pt-24 px-6 pb-32 max-w-6xl mx-auto space-y-6">
      <button
        type="button"
        onClick={() => onNavigate('dashboard')}
        className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/72"
      >
        <span className="material-symbols-outlined text-[16px]">arrow_back</span>
        Dashboard
      </button>

      {loading ? (
        <RecommendationsSkeleton />
      ) : selectedReport ? (
        <>
          <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
            <motion.section
              className="relative overflow-hidden rounded-[30px] border border-white/8 bg-[linear-gradient(135deg,#111a28_0%,#182131_42%,#1f2028_100%)] px-6 py-7 shadow-[0_24px_80px_rgba(0,0,0,0.38)]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, ease: 'easeOut' }}
            >
              <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.22),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.14),transparent_34%)]"></div>
              <div className="relative z-10">
                <div className="flex flex-wrap items-center gap-3">
                  <span className="text-[10px] uppercase tracking-[0.2em] text-primary/90">My Recommendations</span>
                  <span className="inline-flex items-center rounded-full border border-secondary/24 bg-secondary/12 px-3 py-1 text-[10px] font-bold uppercase tracking-[0.16em] text-secondary">
                    {masterCopyLabel}
                  </span>
                </div>

                <h1 className="mt-4 max-w-3xl font-headline text-4xl font-bold tracking-tight text-white md:text-5xl">
                  Directive next moves from the latest My Coach interaction.
                </h1>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/66 md:text-base">
                  A calm summary of what landed, what still needs work, and which learning directions should shape the next visit.
                </p>

                <div className="mt-5 flex flex-wrap gap-2">
                  <MetaChip label={selectedReport.customerName} />
                  <MetaChip label={selectedReport.sessionTitle} />
                  <MetaChip label={formatReportDate(selectedReport.generatedAt)} subtle />
                </div>

                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  <MiniStat label="Score" value={String(selectedReport.overallScore)} />
                  <MiniStat label="Grade" value={selectedReport.grade} />
                  <MiniStat label="Directives" value={String(directives.length)} />
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    type="button"
                    onClick={openReportDetail}
                    className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed shadow-[0_16px_32px_rgba(74,158,255,0.25)]"
                  >
                    View Full Report
                    <span className="material-symbols-outlined text-[16px]">description</span>
                  </button>
                </div>
              </div>
            </motion.section>

            <motion.section
              className="rounded-[30px] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_24px_60px_rgba(0,0,0,0.28)]"
              initial={{ opacity: 0, y: 18 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.36, delay: 0.06, ease: 'easeOut' }}
            >
              <p className="text-[10px] uppercase tracking-[0.16em] text-primary/90">Primary Directive</p>
              <h2 className="mt-3 font-headline text-2xl font-bold text-on-surface">
                {personalizeCoachCopy(directives[0] || 'Lead with one clear recommendation and one clear next step.')}
              </h2>
              <p className="mt-3 text-sm leading-6 text-white/62">{personalizeCoachCopy(selectedReport.report.summary)}</p>

              {visitSignal ? (
                <div className={`mt-5 rounded-[24px] border px-4 py-4 ${signalToneClass(visitSignal.tone)}`}>
                  <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Next Visit Signal</p>
                  <h3 className="mt-2 font-headline text-xl font-bold text-white">{visitSignal.title}</h3>
                  <p className="mt-2 text-sm leading-6 text-white/68">{personalizeCoachCopy(visitSignal.summary)}</p>
                  <p className="mt-3 text-sm leading-6 text-white/84">{personalizeCoachCopy(visitSignal.direction)}</p>
                </div>
              ) : null}
            </motion.section>
          </section>

          <motion.section
            className="overflow-x-auto hide-scrollbar pb-1"
            initial={{ opacity: 0, y: 12 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.3, ease: 'easeOut' }}
          >
            <div className="flex min-w-max gap-2">
              {recommendationSections.map((section) => (
                <button
                  key={section.id}
                  type="button"
                  onClick={() => setActiveSection(section.id)}
                  className={`rounded-full border px-4 py-2 text-[11px] font-bold uppercase tracking-[0.16em] transition ${
                    activeSection === section.id
                      ? 'border-white/18 bg-white text-black'
                      : 'border-white/10 bg-white/[0.05] text-white/68'
                  }`}
                >
                  {section.label}
                </button>
              ))}
            </div>
          </motion.section>

          <motion.section
            key={activeSection}
            initial={{ opacity: 0, y: 16 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.32, ease: 'easeOut' }}
          >
            {activeSection === 'overview' ? (
              <RecommendationsOverviewSection
                summary={selectedReport.report.summary}
                visitSignal={visitSignal}
                directives={directives}
              />
            ) : activeSection === 'nuggets' ? (
              <RecommendationsNuggetsSection nuggets={nuggets} />
            ) : activeSection === 'coaching' ? (
              <RecommendationsCoachingSection
                strengths={selectedReport.report.strengths}
                improvements={selectedReport.report.improvements}
                directives={directives}
              />
            ) : (
              <RecommendationsLearningSection videos={videos} onNavigate={onNavigate} />
            )}
          </motion.section>
        </>
      ) : (
        <Panel className="px-6 py-10 text-center">
          <h1 className="font-headline text-3xl font-bold text-white">Recommendations will appear after the first coached interaction.</h1>
          <p className="mt-3 text-sm leading-6 text-white/58">
            Run a My Coach session first, then this page will condense the report into directive next steps, strengths, weaknesses, and learning prompts.
          </p>
          <div className="mt-6 flex flex-wrap justify-center gap-3">
            <button
              type="button"
              onClick={() => onNavigate('my_coach')}
              className="rounded-full bg-primary px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed"
            >
              Open My Coach
            </button>
            <button
              type="button"
              onClick={() => onNavigate('my_coach_reports')}
              className="rounded-full border border-white/12 bg-white/8 px-5 py-3 text-xs font-bold uppercase tracking-[0.16em] text-white/82"
            >
              Report Library
            </button>
          </div>
        </Panel>
      )}

      {error ? (
        <div className="rounded-full border border-error/30 bg-error-container/95 px-5 py-3 text-sm text-on-error-container">
          {error}
        </div>
      ) : null}
    </main>
  );
}

function pickContextualReport(reports: CoachReportListItem[]) {
  if (!reports.length) return null;
  const sortedReports = [...reports].sort(
    (left, right) => new Date(right.generatedAt).getTime() - new Date(left.generatedAt).getTime(),
  );
  const rememberedReportId = readRememberedReportId();
  const rememberedSessionId = readRememberedSessionId();
  const rememberedThreadId = readRememberedThreadId();

  return (
    sortedReports.find((report) => report.id === rememberedReportId) ||
    sortedReports.find((report) => report.sessionId === rememberedSessionId) ||
    sortedReports.find((report) => report.customerId === rememberedThreadId) ||
    sortedReports[0]
  );
}

function buildNuggets(report: CoachReportListItem['report']): Nugget[] {
  const missedQuestion = report.questionCoverageItems.find((item) => item.status !== 'COVERED');
  const topAdvice = report.coachAdvice[0]?.detail;

  return [
    {
      eyebrow: 'What Is Done Well',
      title: 'Keep this behaviour live',
      detail: report.strengths[0] || 'The conversation had at least one useful coaching win worth repeating.',
      tone: 'positive',
    },
    {
      eyebrow: 'Strength To Scale',
      title: 'Use it in every visit',
      detail: report.strengths[1] || report.summary,
      tone: 'positive',
    },
    {
      eyebrow: 'Weakness To Fix',
      title: 'Tighten this first',
      detail: report.improvements[0] || topAdvice || 'Sharpen the recommendation flow before the next customer revisit.',
      tone: 'warning',
    },
    {
      eyebrow: 'Discovery Cue',
      title: 'Bring this in earlier',
      detail: missedQuestion
        ? `${missedQuestion.question}${missedQuestion.evidence ? ` ${missedQuestion.evidence}` : ''}`
        : report.nextVisitPrep[0] || 'Lead with one sharp question that reopens the customer’s real need.',
      tone: 'neutral',
    },
  ];
}

function buildDirectiveList(report: CoachReportListItem['report']) {
  const missedQuestion = report.questionCoverageItems.find((item) => item.status !== 'COVERED');
  const directives = [
    report.coachAdvice[0]?.detail,
    report.improvements[0],
    report.nextVisitPrep[0],
    report.nextVisitPrep[1],
    missedQuestion ? `Ask this sooner: ${missedQuestion.question}` : null,
    report.productFit.why && !/not clearly stated|not enough information/i.test(report.productFit.why)
      ? `Anchor the recommendation to this customer logic: ${report.productFit.why}`
      : null,
  ]
    .map(normalizeLine)
    .filter(Boolean) as string[];

  const uniqueDirectives = Array.from(new Set(directives)).slice(0, 5);
  return uniqueDirectives.length
    ? uniqueDirectives
    : [
        'Re-open the conversation with one sharp discovery question before recommending a model.',
        'Narrow the pitch to one best-fit option and one clear next step.',
      ];
}

function buildLearningVideos(report: CoachReportListItem['report']): LearningVideo[] {
  const missedQuestion = report.questionCoverageItems.find((item) => item.status !== 'COVERED');
  const productDirection = splitPrimaryText(
    report.productFit.idealMatch || report.productFit.recommendedModel || report.productFit.salesmanPick || report.productFit.customerPreferred,
  );

  return [
    {
      title: 'Discovery Question Flow',
      duration: '04 min',
      directive: missedQuestion
        ? `Rehearse how to ask: ${missedQuestion.question}`
        : 'Reinforce early probing before presenting a model.',
      summary:
        missedQuestion?.evidence ||
        'A short learning clip on extracting budget, use case, and family cues before moving into the pitch.',
    },
    {
      title: 'Recommendation Framing',
      duration: '06 min',
      directive: productDirection
        ? `Practice linking the recommendation back to ${productDirection}.`
        : 'Practice turning features into a best-fit recommendation.',
      summary:
        report.productFit.why && !/not clearly stated|not enough information/i.test(report.productFit.why)
          ? report.productFit.why
          : 'Train on narrowing the pitch to one strong recommendation supported by customer context.',
    },
    {
      title: 'Closing The Next Step',
      duration: '05 min',
      directive: report.nextVisitPrep[0] || report.nextVisitOpener || 'End with one explicit next move the customer can say yes to.',
      summary:
        report.nextVisitPrep[1] ||
        'A quick coaching video on converting good conversation energy into a scheduled revisit, quote review, or test-drive commitment.',
    },
  ];
}

function deriveNextVisitSignal(report: CoachReportListItem['report']): VisitSignal {
  const closureStage = report.speedStages.find((stage) => normalizeKey(stage.stage) === 'drive_closure');
  const closureScore = closureStage?.score ?? 0;
  const unresolvedObjections = report.objections.filter((item) => item.handled !== 'HANDLED').length;
  const finalSentiment = normalizeKey(report.customerSentiment.end);
  const warmEnd = ['positive', 'warm', 'excited', 'interested'].includes(finalSentiment);

  if (closureScore >= 75 && warmEnd) {
    return {
      title: 'Momentum is still alive',
      summary: 'The conversation ended with enough warmth that a return visit or serious follow-up is realistic.',
      direction:
        'Re-enter with memory, not repetition. Reference what they liked, keep the pitch narrow, and move quickly to one concrete next step.',
      tone: 'positive',
    };
  }

  if (closureScore >= 55 || unresolvedObjections < report.objections.length) {
    return {
      title: 'Intent is present but fragile',
      summary: 'The customer may still return, but the re-entry needs structure and clarity from the first minute.',
      direction:
        'Lead with the concern that slowed the conversation, then reconfirm budget, use case, and the one best-fit recommendation.',
      tone: 'warning',
    };
  }

  return {
    title: 'The next visit needs a stronger reset',
    summary: 'A follow-up is still possible, but it will require better probing and a cleaner recommendation logic than last time.',
    direction:
      'Avoid jumping into features. Rebuild trust with one sharp question, then anchor the pitch to the customer’s actual need before asking for a next step.',
    tone: 'default',
  };
}

function normalizeLine(value?: string | null) {
  return String(value || '').replace(/\s+/g, ' ').trim();
}

function splitPrimaryText(value?: string | null) {
  return String(value || '')
    .split('|')
    .map((part) => part.trim())
    .filter(Boolean)[0];
}

function normalizeKey(value: string) {
  return value.trim().toLowerCase().replace(/[^a-z0-9]+/g, '_').replace(/^_+|_+$/g, '');
}

function formatReportDate(dateString: string) {
  return new Intl.DateTimeFormat('en-IN', {
    day: 'numeric',
    month: 'short',
    hour: 'numeric',
    minute: '2-digit',
  }).format(new Date(dateString));
}

function signalToneClass(tone: VisitSignal['tone']) {
  if (tone === 'positive') return 'border-[#39FF14]/18 bg-[#39FF14]/7';
  if (tone === 'warning') return 'border-[#FFB800]/18 bg-[#FFB800]/8';
  return 'border-white/10 bg-white/[0.04]';
}

function Panel({ children, className = '' }: { children: ReactNode; className?: string }) {
  return (
    <section className={`rounded-[30px] border border-white/8 bg-surface-container-low/92 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.28)] ${className}`}>
      {children}
    </section>
  );
}

function SectionHeader({
  eyebrow,
  title,
  detail,
}: {
  eyebrow: string;
  title: string;
  detail?: string;
}) {
  return (
    <div>
      <p className="text-[10px] uppercase tracking-[0.18em] text-primary/90">{eyebrow}</p>
      <h2 className="mt-2 font-headline text-3xl font-bold tracking-tight text-white">{title}</h2>
      {detail ? <p className="mt-3 max-w-3xl text-sm leading-6 text-white/58">{detail}</p> : null}
    </div>
  );
}

function RecommendationsOverviewSection({
  summary,
  visitSignal,
  directives,
}: {
  summary: string;
  visitSignal: VisitSignal | null;
  directives: string[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel>
        <SectionHeader
          eyebrow="Overview"
          title="The main recommendation in one place"
          detail="This section keeps the page short by pulling the summary, next-visit signal, and priority actions into one focused read."
        />
        <div className="mt-5 space-y-4">
          <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">Report Summary</p>
            <p className="mt-3 text-sm leading-6 text-white/68">{personalizeCoachCopy(summary)}</p>
          </div>

          {visitSignal ? (
            <div className={`rounded-[24px] border px-4 py-4 ${signalToneClass(visitSignal.tone)}`}>
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Next Visit Signal</p>
              <h3 className="mt-2 font-headline text-xl font-bold text-white">{visitSignal.title}</h3>
              <p className="mt-2 text-sm leading-6 text-white/68">{personalizeCoachCopy(visitSignal.summary)}</p>
              <p className="mt-3 text-sm leading-6 text-white/84">{personalizeCoachCopy(visitSignal.direction)}</p>
            </div>
          ) : null}
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Priority Actions"
          title="What to do on the next interaction"
          detail="Use these as the first coaching points instead of revisiting the full report."
        />
        <div className="mt-5 space-y-3">
          {directives.map((directive, index) => (
            <DirectiveRow key={`${directive}-${index}`} index={index + 1} text={directive} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecommendationsNuggetsSection({ nuggets }: { nuggets: Nugget[] }) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Educative Nuggets"
        title="Small, useful reads instead of a wall of feedback"
        detail="These pull the strongest teaching moments out of the report so the page stays actionable at a glance."
      />
      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        {nuggets.map((nugget, index) => (
          <motion.div
            key={`${nugget.eyebrow}-${index}`}
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.04 * index, ease: 'easeOut' }}
          >
            <NuggetCard nugget={nugget} />
          </motion.div>
        ))}
      </div>
    </div>
  );
}

function RecommendationsCoachingSection({
  strengths,
  improvements,
  directives,
}: {
  strengths: string[];
  improvements: string[];
  directives: string[];
}) {
  return (
    <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
      <Panel>
        <SectionHeader
          eyebrow="Strengths And Weaknesses"
          title="What is done well, and what needs tightening"
          detail="Keep the good patterns, then close the specific gaps that block a stronger recommendation."
        />
        <div className="mt-5 grid gap-4 lg:grid-cols-2">
          <ListBlock
            eyebrow="Done Well"
            title={`${strengths.length} strengths`}
            items={strengths}
            emptyText="No strengths were returned for this report."
            tone="positive"
          />
          <ListBlock
            eyebrow="Weaknesses"
            title={`${improvements.length} focus areas`}
            items={improvements}
            emptyText="No weaknesses were returned for this report."
            tone="warning"
          />
        </div>
      </Panel>

      <Panel>
        <SectionHeader
          eyebrow="Actionable Directions"
          title="Move the conversation forward with direct coaching"
          detail="These are the clearest actions to carry into the next callback, revisit, or fresh showroom walk-in."
        />
        <div className="mt-5 space-y-3">
          {directives.map((directive, index) => (
            <DirectiveRow key={`${directive}-${index}`} index={index + 1} text={directive} />
          ))}
        </div>
      </Panel>
    </div>
  );
}

function RecommendationsLearningSection({
  videos,
  onNavigate,
}: {
  videos: LearningVideo[];
  onNavigate: (screen: Screen) => void;
}) {
  return (
    <div className="space-y-4">
      <SectionHeader
        eyebrow="Video Based Learning Directives"
        title="Suggested learning videos for the next coaching loop"
        detail="These cards map the report to bite-sized training themes so the follow-up learning stays focused."
      />
      <div className="grid gap-4 lg:grid-cols-3">
        {videos.map((video, index) => (
          <motion.button
            key={`${video.title}-${index}`}
            type="button"
            onClick={() => onNavigate('communications')}
            className="group overflow-hidden rounded-[26px] border border-white/8 bg-[linear-gradient(160deg,rgba(21,25,35,0.98)_0%,rgba(12,15,21,0.96)_100%)] text-left shadow-[0_20px_50px_rgba(0,0,0,0.28)] transition hover:border-white/12"
            initial={{ opacity: 0, y: 14 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.28, delay: 0.06 * index, ease: 'easeOut' }}
          >
            <div className="relative overflow-hidden px-5 py-5">
              <div className="absolute inset-x-0 top-0 h-24 bg-[radial-gradient(circle_at_top,rgba(164,201,255,0.18),transparent_62%)]"></div>
              <div className="relative z-10 flex items-start justify-between gap-3">
                <div className="inline-flex h-12 w-12 items-center justify-center rounded-2xl border border-white/10 bg-white/6 text-white/78">
                  <span className="material-symbols-outlined text-[22px]">play_circle</span>
                </div>
                <span className="rounded-full border border-white/10 bg-white/6 px-3 py-1 text-[10px] uppercase tracking-[0.16em] text-white/56">
                  {video.duration}
                </span>
              </div>
              <p className="mt-5 text-[10px] uppercase tracking-[0.16em] text-primary/90">Learning Directive</p>
              <h3 className="mt-2 font-headline text-2xl font-bold tracking-tight text-white">{video.title}</h3>
              <p className="mt-3 text-sm leading-6 text-white/60">{personalizeCoachCopy(video.summary)}</p>
              <div className="mt-4 rounded-[20px] border border-white/8 bg-black/18 px-3 py-3 text-sm leading-6 text-white/74">
                {personalizeCoachCopy(video.directive)}
              </div>
              <div className="mt-4 flex items-center justify-between text-[10px] uppercase tracking-[0.16em] text-white/44">
                <span>Open training feed</span>
                <span className="material-symbols-outlined text-[16px]">north_east</span>
              </div>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function NuggetCard({ nugget }: { nugget: Nugget }) {
  const toneClass =
    nugget.tone === 'positive'
      ? 'border-[#39FF14]/16 bg-[#39FF14]/7'
      : nugget.tone === 'warning'
        ? 'border-[#FFB800]/16 bg-[#FFB800]/8'
        : 'border-white/8 bg-white/[0.04]';

  return (
    <div className={`h-full rounded-[24px] border px-4 py-4 shadow-[0_18px_40px_rgba(0,0,0,0.22)] ${toneClass}`}>
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{nugget.eyebrow}</p>
      <h3 className="mt-3 font-headline text-xl font-bold text-white">{nugget.title}</h3>
      <p className="mt-3 text-sm leading-6 text-white/68">{personalizeCoachCopy(nugget.detail)}</p>
    </div>
  );
}

function ListBlock({
  eyebrow,
  title,
  items,
  emptyText,
  tone,
}: {
  eyebrow: string;
  title: string;
  items: string[];
  emptyText: string;
  tone: 'positive' | 'warning';
}) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <p className="text-[10px] uppercase tracking-[0.16em] text-white/40">{eyebrow}</p>
      <h3 className="mt-2 font-headline text-xl font-bold text-white">{title}</h3>
      <div className="mt-4 space-y-3">
        {items.length ? items.map((item, index) => <LineItem key={`${item}-${index}`} text={item} tone={tone} />) : <MutedText text={emptyText} />}
      </div>
    </div>
  );
}

function LineItem({ text, tone }: { text: string; tone: 'positive' | 'warning' }) {
  return (
    <div className="flex items-start gap-3 rounded-[20px] border border-white/8 bg-black/14 px-3 py-3">
      <span className={`mt-2 h-2.5 w-2.5 rounded-full ${tone === 'positive' ? 'bg-[#39FF14]' : 'bg-[#FFB800]'}`} />
      <p className="text-sm leading-6 text-white/72">{personalizeCoachCopy(text)}</p>
    </div>
  );
}

function DirectiveRow({ index, text }: { index: number; text: string }) {
  return (
    <div className="flex items-start gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
      <span className="inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-secondary/24 bg-secondary/12 font-headline text-sm font-bold text-secondary">
        {index}
      </span>
      <p className="pt-0.5 text-sm leading-6 text-white/74">{personalizeCoachCopy(text)}</p>
    </div>
  );
}

function MiniStat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-[20px] border border-white/8 bg-black/18 px-4 py-3">
      <p className="font-headline text-2xl font-bold text-white">{value}</p>
      <p className="mt-1 text-[10px] uppercase tracking-[0.16em] text-white/42">{label}</p>
    </div>
  );
}

function MetaChip({ label, subtle = false }: { label: string; subtle?: boolean }) {
  return (
    <span className={`rounded-full border px-3 py-1 text-[10px] uppercase tracking-[0.16em] ${subtle ? 'border-white/8 bg-white/[0.04] text-white/50' : 'border-white/10 bg-white/[0.06] text-white/62'}`}>
      {label}
    </span>
  );
}

function MutedText({ text }: { text: string }) {
  return <div className="rounded-[20px] border border-dashed border-white/10 px-4 py-5 text-sm leading-6 text-white/48">{text}</div>;
}

function RecommendationsSkeleton() {
  return (
    <div className="space-y-4">
      <section className="grid gap-4 xl:grid-cols-[1.2fr_0.8fr]">
        <Panel className="px-6 py-7">
          <SkeletonLine className="h-3 w-32 bg-white/[0.08]" />
          <SkeletonLine className="mt-5 h-10 w-4/5 bg-white/[0.08]" />
          <SkeletonLine className="mt-3 h-4 w-full bg-white/[0.05]" />
          <SkeletonLine className="mt-2 h-4 w-3/4 bg-white/[0.04]" />
          <div className="mt-5 flex flex-wrap gap-2">
            <SkeletonLine className="h-7 w-24 rounded-full bg-white/[0.05]" />
            <SkeletonLine className="h-7 w-28 rounded-full bg-white/[0.05]" />
            <SkeletonLine className="h-7 w-20 rounded-full bg-white/[0.05]" />
          </div>
          <div className="mt-6 grid gap-3 sm:grid-cols-3">
            {Array.from({ length: 3 }, (_, index) => (
              <div key={`recommendations-stat-${index}`} className="rounded-[20px] border border-white/8 bg-black/18 px-4 py-3">
                <SkeletonLine className="h-7 w-14 bg-white/[0.08]" />
                <SkeletonLine className="mt-3 h-3 w-16 bg-white/[0.05]" />
              </div>
            ))}
          </div>
          <SkeletonLine className="mt-6 h-11 w-40 rounded-full bg-white/[0.07]" />
        </Panel>

        <Panel className="p-5">
          <SkeletonLine className="h-3 w-28 bg-white/[0.08]" />
          <SkeletonLine className="mt-5 h-8 w-5/6 bg-white/[0.08]" />
          <SkeletonLine className="mt-3 h-4 w-full bg-white/[0.05]" />
          <SkeletonLine className="mt-2 h-4 w-3/4 bg-white/[0.04]" />
          <div className="mt-5 rounded-[24px] border border-white/8 bg-white/[0.03] px-4 py-4">
            <SkeletonLine className="h-3 w-24 bg-white/[0.06]" />
            <SkeletonLine className="mt-3 h-6 w-2/3 bg-white/[0.08]" />
            <SkeletonLine className="mt-3 h-4 w-full bg-white/[0.05]" />
            <SkeletonLine className="mt-2 h-4 w-4/5 bg-white/[0.04]" />
          </div>
        </Panel>
      </section>

      <section className="overflow-x-auto hide-scrollbar pb-1">
        <div className="flex min-w-max gap-2">
          {Array.from({ length: 4 }, (_, index) => (
            <SkeletonLine key={`recommendation-pill-${index}`} className="h-10 w-28 rounded-full bg-white/[0.05]" />
          ))}
        </div>
      </section>

      <Panel>
        <div className="grid gap-4 xl:grid-cols-[0.95fr_1.05fr]">
          {Array.from({ length: 2 }, (_, panelIndex) => (
            <div key={`recommendation-panel-${panelIndex}`} className="space-y-4">
              <SkeletonLine className="h-3 w-24 bg-white/[0.08]" />
              <SkeletonLine className="h-8 w-3/4 bg-white/[0.08]" />
              <SkeletonLine className="h-4 w-full bg-white/[0.05]" />
              <SkeletonLine className="h-4 w-4/5 bg-white/[0.04]" />
              <div className="space-y-3">
                {Array.from({ length: 3 }, (_, rowIndex) => (
                  <div key={`recommendation-row-${panelIndex}-${rowIndex}`} className="flex items-start gap-4 rounded-[22px] border border-white/8 bg-white/[0.03] px-4 py-4">
                    <SkeletonCircle className="h-8 w-8 border-white/8 bg-white/[0.05]" />
                    <div className="min-w-0 flex-1 space-y-2">
                      <SkeletonLine className="h-4 w-full bg-white/[0.05]" />
                      <SkeletonLine className="h-4 w-3/4 bg-white/[0.04]" />
                    </div>
                  </div>
                ))}
              </div>
            </div>
          ))}
        </div>
      </Panel>
    </div>
  );
}
