import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Screen } from '../types';
import { getDashboardHome } from '../lib/dashboardApi';
import type { DashboardMetric, DashboardHome, LeadSummary } from '../lib/contentTypes';
import { useApp } from '../contexts/AppContext';

const baseQuickActions: Array<{
  key: 'products' | 'practice' | 'brochures' | 'communications';
  eyebrow: string;
  value: string;
  unit: string;
  detail: string;
  hint: string;
  icon: string;
  route: Screen;
  cardClass: string;
  iconClass: string;
  pillClass: string;
  shortEyebrow?: string;
}> = [
  {
    key: 'products',
    eyebrow: 'Products',
    value: '5',
    unit: 'Models',
    detail: '2 assigned today',
    hint: 'Browse lineup',
    icon: 'directions_car',
    route: 'catalog',
    cardClass: 'from-orange-100 via-amber-50 to-white dark:from-[#1d1a15] dark:via-[#302716] dark:to-[#14141c]',
    iconClass: 'bg-orange-500/10 text-orange-600 border-orange-500/20 dark:bg-[#c8a96e]/18 dark:text-[#f4d59b] dark:border-[#c8a96e]/30',
    pillClass: 'bg-orange-500/10 text-orange-600 dark:bg-[#c8a96e]/16 dark:text-[#f4d59b]',
  },
  {
    key: 'practice',
    eyebrow: 'Practice',
    value: '2',
    unit: 'Drills',
    detail: 'Mileage and finance rehearsal',
    hint: 'Launch simulator',
    icon: 'exercise',
    route: 'pitch_practice',
    cardClass: 'from-blue-100 via-sky-50 to-white dark:from-[#101b2a] dark:via-[#182c47] dark:to-[#13151d]',
    iconClass: 'bg-blue-500/10 text-blue-600 border-blue-500/20 dark:bg-[#4a9eff]/18 dark:text-[#9bc8ff] dark:border-[#4a9eff]/30',
    pillClass: 'bg-blue-500/10 text-blue-600 dark:bg-[#4a9eff]/16 dark:text-[#9bc8ff]',
  },
  {
    key: 'brochures',
    eyebrow: 'Brochures',
    value: '12',
    unit: 'Decks',
    detail: '4 refreshed this week',
    hint: 'Open library',
    icon: 'folder_special',
    route: 'brochures',
    cardClass: 'from-pink-100 via-rose-50 to-white dark:from-[#221815] dark:via-[#3a2417] dark:to-[#15141b]',
    iconClass: 'bg-pink-500/10 text-pink-600 border-pink-500/20 dark:bg-[#d28b63]/18 dark:text-[#ffc09d] dark:border-[#d28b63]/30',
    pillClass: 'bg-pink-500/10 text-pink-600 dark:bg-[#d28b63]/16 dark:text-[#ffc09d]',
  },
  {
    key: 'communications',
    eyebrow: 'Communications',
    shortEyebrow: 'Comms',
    value: '4',
    unit: 'Updates',
    detail: 'Priority updates today',
    hint: 'Open feed',
    icon: 'hub',
    route: 'communications',
    cardClass: 'from-purple-100 via-fuchsia-50 to-white dark:from-[#14161b] dark:via-[#232632] dark:to-[#121319]',
    iconClass: 'bg-purple-500/10 text-purple-600 border-purple-500/20 dark:bg-white/10 dark:text-white/85 dark:border-white/10',
    pillClass: 'bg-purple-500/10 text-purple-600 dark:bg-white/10 dark:text-white/80',
  },
];

const workspaceCards: Array<{
  title: string;
  detail: string;
  meta: string;
  route: Screen;
  icon: string;
  cardClass: string;
  iconClass: string;
  pillClass: string;
  compactTitle?: boolean;
}> = [
  {
    title: 'My Coach',
    detail: 'Workspace, reports, and live session flow.',
    meta: 'Training master copy',
    route: 'my_coach',
    icon: 'support_agent',
    cardClass: 'from-indigo-100 via-violet-50 to-white dark:from-[#0f1522] dark:via-[#19263a] dark:to-[#1c2230]',
    iconClass: 'bg-indigo-500/10 text-indigo-600 border-indigo-500/20 dark:bg-[#4a9eff]/18 dark:text-[#9bc8ff] dark:border-[#4a9eff]/30',
    pillClass: 'bg-indigo-500/10 text-indigo-600 dark:bg-[#4a9eff]/16 dark:text-[#9bc8ff]',
  },
  {
    title: 'My Tips',
    detail: 'Actionable next steps from recent coaching.',
    meta: 'Actionable Review',
    route: 'my_coach_recommendations',
    icon: 'lightbulb',
    cardClass: 'from-teal-100 via-emerald-50 to-white dark:from-[#17151f] dark:via-[#272132] dark:to-[#1a1c27]',
    iconClass: 'bg-teal-500/10 text-teal-600 border-teal-500/20 dark:bg-white/10 dark:text-white/85 dark:border-white/10',
    pillClass: 'bg-teal-500/10 text-teal-600 dark:bg-white/10 dark:text-white/80',
    compactTitle: true,
  },
];

const defaultDashboardHome: DashboardHome = {
  dateLabel: '',
  shiftLabel: '',
  metrics: [],
  announcements: [],
  assignedVehicles: [],
  priorityLeads: [],
};

export function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const { bootstrap } = useApp();
  const [dashboardHome, setDashboardHome] = useState<DashboardHome>(defaultDashboardHome);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [contentNotice, setContentNotice] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    const controller = new AbortController();

    void getDashboardHome({ signal: controller.signal })
      .then((result) => {
        setDashboardHome({
          ...defaultDashboardHome,
          ...result.item,
        });
        setContentNotice(result.source === 'fallback' ? result.notice || 'Showing fallback dashboard data while live sync completes.' : result.notice || null);
        setDashboardError(null);
      })
      .catch((error) => {
        if (error instanceof DOMException && error.name === 'AbortError') return;
        setDashboardError(error instanceof Error ? error.message : 'Dashboard data is unavailable right now.');
      })
      .finally(() => {
        setIsLoadingDashboard(false);
      });

    return () => controller.abort();
  }, []);

  const quickActions = mergeQuickActions(baseQuickActions, dashboardHome.metrics);
  const me = bootstrap?.me;
  const readiness = bootstrap?.readiness;

  return (
    <main className="mx-auto max-w-5xl space-y-6 px-6 pb-32 pt-24">
      <section>
        <div className="flex items-end justify-between gap-4">
          <div>
            <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">Good morning, {me?.firstName || 'there'}.</h1>
            <p className="mt-2 text-base leading-6 text-on-surface-variant dark:text-[#f1e4c8]">{readiness?.affirmation || 'Loading readiness context...'}</p>
          </div>
        </div>
      </section>

      <section
        className="relative flex items-center justify-between gap-4 overflow-hidden rounded-[20pt] border border-black/5 dark:border-white/5 bg-gradient-to-br from-[#FFF8E7] via-[#FFF3D6] to-[#FFEAB3] dark:from-secondary dark:via-secondary-container dark:to-surface-container p-5 shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-2xl max-[380px]:flex-col max-[380px]:items-start"
      >
        <div className="absolute inset-0 carbon-texture opacity-[0.03] dark:opacity-10"></div>
        <div className="relative z-10 min-w-0 flex-1 pr-2">
          <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-on-secondary-fixed">Sales Performance</span>
          <div className="mt-3">
            <div>
              <p className="font-headline text-[2.8rem] font-black leading-none tracking-tight text-on-secondary-fixed">
                {readiness?.tierName || 'Loading'}
              </p>
            </div>
            <div>
              <p className="mt-2 text-sm leading-5 text-[#8C6D23] dark:text-on-secondary-fixed/78">
                Reach <span className="font-semibold text-[#5C4614] dark:text-on-secondary-fixed">{readiness?.nextTierName || '—'}</span> by gaining{' '}
                <span className="font-semibold text-[#5C4614] dark:text-on-secondary-fixed">+{readiness?.pointsToNext ?? '--'} points</span>.
              </p>
            </div>
          </div>
        </div>
        <div className="relative z-10 flex shrink-0 self-center items-center justify-center max-[380px]:self-end">
          <svg className="h-24 w-24 -rotate-90 transform">
            <circle className="text-on-secondary-fixed/10" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
            <circle
              className="text-on-secondary-fixed"
              cx="48"
              cy="48"
              fill="transparent"
              r="40"
              stroke="currentColor"
              strokeDasharray="251.2"
              strokeDashoffset={251.2 - (251.2 * (readiness?.score ?? 0)) / 100}
              strokeWidth="8"
            ></circle>
          </svg>
          <div className="absolute text-center">
            <p className="font-headline text-[1.55rem] font-bold leading-none text-on-secondary-fixed">{readiness?.score ?? '--'}%</p>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-3">
        {workspaceCards.map((card) => (
          <motion.button
            key={card.title}
            type="button"
            onClick={() => onNavigate(card.route)}
            className={`group relative min-h-[10.25rem] overflow-hidden rounded-[22pt] border border-black/5 dark:border-white/6 bg-gradient-to-br ${card.cardClass} p-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]`}
            whileTap={{ scale: 0.985 }}
          >
            <div className="absolute inset-0 carbon-texture opacity-[0.03] dark:opacity-[0.07]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_38%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.14),transparent_38%)] opacity-80"></div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1 pt-2">
                    <h3
                      className={`font-headline font-bold tracking-tight text-on-surface dark:text-white ${
                        card.compactTitle
                          ? 'max-w-[8ch] text-[1.2rem] leading-[1.02] text-balance'
                          : 'text-[1.2rem] leading-[1.08]'
                      }`}
                    >
                      {card.title}
                    </h3>
                  </div>
                  <span className={`flex h-10 w-10 items-center justify-center rounded-full border backdrop-blur-md ${card.iconClass}`}>
                    <span className="material-symbols-outlined text-[20px]">{card.icon}</span>
                  </span>
                </div>
                <p className="mt-3 font-label text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/80 dark:text-white/46">{card.meta}</p>
                <p className="mt-2 text-sm leading-6 text-on-surface-variant dark:text-white/70">{card.detail}</p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-3">
                <p className="font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant dark:text-white/82">Open section</p>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${card.pillClass}`}>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-3">
        {quickActions.map((action) => (
          <motion.button
            key={action.eyebrow}
            type="button"
            onClick={() => onNavigate(action.route)}
            className={`group relative min-h-[10rem] overflow-hidden rounded-[22pt] border border-black/5 dark:border-white/6 bg-gradient-to-br ${action.cardClass} p-4 text-left shadow-[0_8px_30px_rgba(0,0,0,0.04)] dark:shadow-[0_18px_40px_rgba(0,0,0,0.28)]`}
            whileTap={{ scale: 0.985 }}
          >
            <div className="absolute inset-0 carbon-texture opacity-[0.03] dark:opacity-[0.07]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.4),transparent_36%)] dark:bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.12),transparent_36%)] opacity-80"></div>
            <div className="relative z-10 flex h-full flex-col justify-between">
              <div>
                <div className="flex items-start justify-between gap-3">
                  <h3 className="pt-2 font-headline text-[1.2rem] font-bold leading-[1.08] tracking-tight text-on-surface dark:text-white">
                    {action.shortEyebrow ? (
                      <>
                        <span className="max-[375px]:hidden">{action.eyebrow}</span>
                        <span className="hidden max-[375px]:inline">{action.shortEyebrow}</span>
                      </>
                    ) : (
                      action.eyebrow
                    )}
                  </h3>
                  <span className={`flex h-9 w-9 items-center justify-center rounded-full border backdrop-blur-md ${action.iconClass}`}>
                    <span className="material-symbols-outlined text-[18px]">{action.icon}</span>
                  </span>
                </div>
                <div className="mt-4 flex items-end gap-2">
                  <p className="font-headline text-[1.7rem] font-semibold leading-none tracking-tight text-on-surface dark:text-white">{action.value}</p>
                  <p className="pb-1 font-label text-[10px] uppercase tracking-[0.16em] text-on-surface-variant/90 dark:text-white/68">{action.unit}</p>
                </div>
                <p className="mt-2 font-label text-[10px] uppercase tracking-[0.14em] text-on-surface-variant/80 dark:text-white/48">{action.detail}</p>
              </div>
              <div className="mt-4 flex items-end justify-between gap-2">
                <p className="font-label text-[10px] font-semibold uppercase tracking-[0.14em] text-on-surface-variant dark:text-white/82">{action.hint}</p>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full ${action.pillClass}`}>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      {contentNotice ? (
        <section className="rounded-[18pt] border border-black/5 dark:border-white/10 bg-black/[0.02] dark:bg-white/[0.04] px-4 py-3 text-sm text-on-surface-variant">
          {contentNotice}
        </section>
      ) : null}

      {dashboardError ? (
        <section className="rounded-[18pt] border border-error/18 bg-error-container/85 px-4 py-3 text-sm text-on-error-container">
          {dashboardError}
        </section>
      ) : null}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Announcements</h2>
          <button type="button" onClick={() => onNavigate('communications')} className="text-primary text-xs font-bold uppercase tracking-wider cursor-pointer">
            View all
          </button>
        </div>
        <div className="hide-scrollbar -mx-6 flex gap-4 overflow-x-auto px-6">
          {dashboardHome.announcements.length > 0 ? (
            dashboardHome.announcements.map((announcement) => (
              <button
                key={announcement.id}
                type="button"
                onClick={() => onNavigate('communications')}
                className="relative h-44 w-72 flex-none overflow-hidden rounded-[20pt] text-left"
              >
                <img src={announcement.image} alt={announcement.title} className="absolute inset-0 h-full w-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-black/90 via-black/30 to-transparent"></div>
                {announcement.badgeLabel && announcement.badgeClassName ? (
                  <span className={`absolute left-4 top-4 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${announcement.badgeClassName}`}>
                    {announcement.badgeLabel}
                  </span>
                ) : null}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/65">{announcement.category}</p>
                  <h3 className="mt-2 font-headline font-bold leading-tight text-white">{announcement.title}</h3>
                </div>
              </button>
            ))
          ) : (
            <div className="w-72 flex-none rounded-[20pt] border border-white/8 bg-surface-container p-5 text-sm text-on-surface-variant">
              {isLoadingDashboard ? 'Loading announcements...' : 'No announcements available yet.'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Assigned Models</h2>
        <div className="hide-scrollbar -mx-6 flex gap-4 overflow-x-auto px-6">
          {dashboardHome.assignedVehicles.length > 0 ? (
            dashboardHome.assignedVehicles.map((vehicle) => (
              <button
                key={vehicle.id}
                type="button"
                className="w-64 flex-none space-y-3 rounded-[20pt] border border-black/5 dark:border-white/5 bg-gradient-to-br from-indigo-50/60 to-blue-50/40 dark:from-surface-container dark:to-surface-container p-4 text-left transition-colors shadow-sm dark:hover:bg-surface-container-high"
                onClick={() => onNavigate('catalog')}
              >
                <div className="h-32 overflow-hidden rounded-xl">
                  <img src={vehicle.image} alt={vehicle.modelName} className="h-full w-full object-cover" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-on-surface">{vehicle.modelName}</h4>
                  <p className="mt-1 text-xs text-on-surface-variant">{vehicle.variantName}</p>
                  <div className="mt-2 flex gap-2">
                    <span className="font-label rounded bg-surface-container-highest px-2 py-0.5 text-[10px] uppercase text-primary">{vehicle.network}</span>
                    <span className="font-label rounded bg-surface-container-highest px-2 py-0.5 text-[10px] uppercase text-primary">{vehicle.inventoryStatus}</span>
                  </div>
                </div>
              </button>
            ))
          ) : (
            <div className="w-64 flex-none rounded-[20pt] border border-white/8 bg-surface-container p-5 text-sm text-on-surface-variant">
              {isLoadingDashboard ? 'Loading assigned models...' : 'No assigned models available yet.'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Priority Leads</h2>
        <div className="space-y-3">
          {dashboardHome.priorityLeads.length > 0 ? (
            dashboardHome.priorityLeads.map((lead) => (
              <div
                key={lead.id}
                className="flex items-center justify-between rounded-[20pt] border border-black/5 dark:border-outline-variant/5 bg-gradient-to-br from-amber-50/50 to-orange-50/30 dark:from-surface-container-low dark:to-surface-container-low p-4 shadow-sm"
              >
                <div className="flex items-center gap-3">
                  <div className={`flex h-10 w-10 items-center justify-center rounded-full font-bold ${getLeadAvatarClassName(lead)}`}>
                    {lead.initials}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{lead.customerName}</p>
                    <p className="text-xs text-on-surface-variant">{buildLeadSubtitle(lead)}</p>
                  </div>
                </div>
                <span className={`rounded-full px-3 py-1 text-[10px] font-extrabold uppercase tracking-tighter ${getLeadBadgeClassName(lead)}`}>
                  {lead.priorityLabel}
                </span>
              </div>
            ))
          ) : (
            <div className="rounded-[20pt] border border-white/8 bg-surface-container p-5 text-sm text-on-surface-variant">
              {isLoadingDashboard ? 'Loading priority leads...' : 'No priority leads available yet.'}
            </div>
          )}
        </div>
      </section>
    </main>
  );
}

function mergeQuickActions(actions: typeof baseQuickActions, metrics: DashboardMetric[]) {
  const metricMap = new Map(metrics.map((metric) => [metric.key, metric]));

  return actions.map((action) => {
    const metric = metricMap.get(action.key);
    if (!metric) return action;

    return {
      ...action,
      value: metric.value || action.value,
      unit: metric.unit || action.unit,
      detail: metric.detail || action.detail,
    };
  });
}

function buildLeadSubtitle(lead: LeadSummary) {
  return lead.vehicleLabel || lead.brochureName || lead.note || lead.status;
}

function getLeadBadgeClassName(lead: LeadSummary) {
  switch (lead.priorityTone) {
    case 'hot':
      return 'bg-error-container text-on-error-container';
    case 'new':
      return 'bg-secondary-container text-on-secondary-container';
    case 'follow-up':
      return 'bg-surface-container-highest text-on-surface-variant';
    default:
      return 'bg-primary/15 text-primary';
  }
}

function getLeadAvatarClassName(lead: LeadSummary) {
  switch (lead.priorityTone) {
    case 'hot':
      return 'bg-primary/20 text-primary';
    case 'new':
      return 'bg-secondary/20 text-secondary';
    case 'follow-up':
      return 'bg-tertiary-container/20 text-tertiary';
    default:
      return 'bg-white/10 text-white';
  }
}
