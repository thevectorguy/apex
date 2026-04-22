import { useEffect, useState } from 'react';
import { motion } from 'motion/react';
import { Screen } from '../types';
import { getDashboardHome } from '../lib/dashboardApi';
import type { DashboardHome, DashboardMetric, LeadSummary } from '../lib/contentTypes';
import { getMasterCopyInfo } from '../lib/myCoachApi';

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
    hint: 'Browse Maruti lineup',
    icon: 'directions_car',
    route: 'catalog',
    cardClass: 'from-[#1d1a15] via-[#302716] to-[#14141c]',
    iconClass: 'bg-[#c8a96e]/18 text-[#f4d59b] border-[#c8a96e]/30',
    pillClass: 'bg-[#c8a96e]/16 text-[#f4d59b]',
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
    cardClass: 'from-[#101b2a] via-[#182c47] to-[#13151d]',
    iconClass: 'bg-[#4a9eff]/18 text-[#9bc8ff] border-[#4a9eff]/30',
    pillClass: 'bg-[#4a9eff]/16 text-[#9bc8ff]',
  },
  {
    key: 'brochures',
    eyebrow: 'Brochures',
    value: '12',
    unit: 'Decks',
    detail: '4 refreshed this week',
    hint: 'Open literature library',
    icon: 'folder_special',
    route: 'brochures',
    cardClass: 'from-[#221815] via-[#3a2417] to-[#15141b]',
    iconClass: 'bg-[#d28b63]/18 text-[#ffc09d] border-[#d28b63]/30',
    pillClass: 'bg-[#d28b63]/16 text-[#ffc09d]',
  },
  {
    key: 'communications',
    eyebrow: 'Communications',
    shortEyebrow: 'Comms',
    value: '4',
    unit: 'Updates',
    detail: 'Priority updates today',
    hint: 'Open announcements feed',
    icon: 'hub',
    route: 'communications',
    cardClass: 'from-[#14161b] via-[#232632] to-[#121319]',
    iconClass: 'bg-white/10 text-white/85 border-white/10',
    pillClass: 'bg-white/10 text-white/80',
  },
];

const coachCards: Array<{
  label: string;
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
    label: 'Coach',
    title: 'My Coach',
    detail: 'Workspace, reports, and live session flow.',
    meta: 'Training Master Copy',
    route: 'my_coach',
    icon: 'support_agent',
    cardClass: 'from-[#0f1522] via-[#19263a] to-[#1c2230]',
    iconClass: 'bg-[#4a9eff]/18 text-[#9bc8ff] border-[#4a9eff]/30',
    pillClass: 'bg-[#4a9eff]/16 text-[#9bc8ff]',
  },
  {
    label: 'Coach',
    title: 'My Recommendations',
    detail: 'Actionable next steps from recent coaching.',
    meta: 'Actionable Review',
    route: 'my_coach_recommendations',
    icon: 'lightbulb',
    cardClass: 'from-[#17151f] via-[#272132] to-[#1a1c27]',
    iconClass: 'bg-white/10 text-white/85 border-white/10',
    pillClass: 'bg-white/10 text-white/80',
    compactTitle: true,
  },
];

const defaultDashboardHome: DashboardHome = {
  greetingName: 'Arjun',
  dateLabel: 'OCTOBER 24',
  shiftLabel: '08:30 - 17:00',
  salesPerformance: {
    valueLabel: '3 Units',
    detail: '2 remaining for daily goal',
    progressPercent: 60,
  },
  metrics: [],
  announcements: [],
  assignedVehicles: [],
  priorityLeads: [],
};

export function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [masterCopyLabel, setMasterCopyLabel] = useState(coachCards[0].meta);
  const [dashboardHome, setDashboardHome] = useState<DashboardHome>(defaultDashboardHome);
  const [isLoadingDashboard, setIsLoadingDashboard] = useState(true);
  const [contentNotice, setContentNotice] = useState<string | null>(null);
  const [dashboardError, setDashboardError] = useState<string | null>(null);

  useEffect(() => {
    void getMasterCopyInfo()
      .then((info) => setMasterCopyLabel(info.version))
      .catch(() => {});
  }, []);

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
        if (error instanceof DOMException && error.name === 'AbortError') {
          return;
        }

        setDashboardError(error instanceof Error ? error.message : 'Dashboard data is unavailable right now.');
      })
      .finally(() => {
        setIsLoadingDashboard(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const quickActions = mergeQuickActions(baseQuickActions, dashboardHome.metrics);
  const salesStrokeOffset = 251.2 - (251.2 * dashboardHome.salesPerformance.progressPercent) / 100;

  return (
    <main className="pt-24 px-6 pb-32 space-y-6 max-w-5xl mx-auto">
      <section>
        <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">Good morning, {dashboardHome.greetingName}.</h1>
        <p className="font-label text-secondary text-sm tracking-widest uppercase mt-1">
          {dashboardHome.dateLabel} - ACTIVE SHIFT: {dashboardHome.shiftLabel}
        </p>
      </section>

      <section className="relative overflow-hidden rounded-[20pt] bg-gradient-to-br from-secondary via-secondary-container to-surface-container shadow-2xl p-6 flex items-center justify-between border border-white/5">
        <div className="absolute inset-0 carbon-texture opacity-10"></div>
        <div className="relative z-10">
          <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-on-secondary-fixed">Sales Performance</span>
          <div className="mt-2">
            <span className="font-headline text-5xl font-extrabold text-on-secondary-fixed">{dashboardHome.salesPerformance.valueLabel}</span>
            <p className="text-on-secondary-fixed/70 text-sm font-medium mt-1">{dashboardHome.salesPerformance.detail}</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle className="text-on-secondary-fixed/10" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
            <circle
              className="text-on-secondary-fixed"
              cx="48"
              cy="48"
              fill="transparent"
              r="40"
              stroke="currentColor"
              strokeDasharray="251.2"
              strokeDashoffset={salesStrokeOffset}
              strokeWidth="8"
            ></circle>
          </svg>
          <span className="absolute font-headline font-bold text-on-secondary-fixed">{dashboardHome.salesPerformance.progressPercent}%</span>
        </div>
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {coachCards.map((card) => (
          <motion.button
            key={card.title}
            type="button"
            onClick={() => onNavigate(card.route)}
            className={`group relative min-h-[11.25rem] overflow-hidden rounded-[22pt] border border-white/6 bg-gradient-to-br ${card.cardClass} p-3.5 sm:min-h-[12rem] sm:p-5 text-left shadow-[0_20px_40px_rgba(0,0,0,0.35)]`}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 320, damping: 26 }}
          >
            <div className="absolute inset-0 carbon-texture opacity-[0.07]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_36%)] opacity-80"></div>
            <div className="absolute -right-10 top-5 h-24 w-24 rounded-full bg-[rgba(164,201,255,0.18)] blur-3xl"></div>

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <div className="min-w-0 flex-1">
                    <p className="font-label text-[10px] font-bold uppercase tracking-[0.22em] text-white/54">{card.label}</p>
                    <h3
                      className={`mt-2 font-headline font-bold leading-[1.05] tracking-tight text-white text-balance ${
                        card.compactTitle ? 'text-[1.08rem] sm:text-[1.4rem]' : 'text-[1.18rem] sm:text-[1.55rem]'
                      }`}
                    >
                      {card.title}
                    </h3>
                  </div>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border backdrop-blur-md sm:h-12 sm:w-12 ${card.iconClass}`}
                  >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{card.icon}</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <p className="font-label text-[10px] uppercase tracking-[0.14em] text-white/46">
                    {card.title === 'My Coach' ? masterCopyLabel : card.meta}
                  </p>
                  <p className="mt-2 text-[12px] leading-5 text-white/70 sm:text-sm sm:leading-6">{card.detail}</p>
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 pt-3">
                <p className="font-label text-[10px] font-semibold uppercase tracking-[0.14em] leading-4 text-white/82 sm:text-[12px]">
                  Open section
                </p>
                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9 ${card.pillClass}`}>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      <section className="grid grid-cols-2 gap-2.5 sm:gap-4">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.eyebrow}
            type="button"
            onClick={() => onNavigate(action.route)}
            className={`group relative min-h-[11rem] overflow-hidden rounded-[22pt] border border-white/6 bg-gradient-to-br ${action.cardClass} p-3.5 sm:min-h-[12rem] sm:p-5 text-left shadow-[0_20px_40px_rgba(0,0,0,0.35)]`}
            whileHover={{ y: -4, scale: 1.01 }}
            whileTap={{ scale: 0.98 }}
            transition={{ type: 'spring', stiffness: 360, damping: 26 }}
          >
            <div className="absolute inset-0 carbon-texture opacity-[0.07]"></div>
            <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.16),transparent_36%)] opacity-80"></div>
            <div
              className="absolute -right-10 top-5 h-24 w-24 rounded-full blur-3xl"
              style={{ backgroundColor: index === 1 ? 'rgba(74, 158, 255, 0.2)' : 'rgba(200, 169, 110, 0.2)' }}
            ></div>

            <div className="relative z-10 flex h-full flex-col justify-between">
              <div className="space-y-3">
                <div className="flex items-start justify-between gap-3">
                  <h3
                    className={`min-w-0 flex-1 font-headline font-bold leading-[1.05] tracking-tight text-white text-balance ${
                      action.eyebrow.length > 10 ? 'text-[1.1rem] sm:text-[1.45rem]' : 'text-[1.24rem] sm:text-[1.6rem]'
                    }`}
                  >
                    {action.shortEyebrow ? (
                      <>
                        <span className="max-[480px]:hidden">{action.eyebrow}</span>
                        <span className="hidden max-[480px]:inline">{action.shortEyebrow}</span>
                      </>
                    ) : (
                      action.eyebrow
                    )}
                  </h3>

                  <div
                    className={`flex h-9 w-9 shrink-0 items-center justify-center rounded-full border backdrop-blur-md sm:h-12 sm:w-12 ${action.iconClass}`}
                  >
                    <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{action.icon}</span>
                  </div>
                </div>

                <div className="min-w-0">
                  <div className="flex items-end gap-2">
                    <p className="font-headline text-[1.35rem] font-semibold leading-none tracking-tight text-white sm:text-[1.55rem]">
                      {action.value}
                    </p>
                    <p className="pb-0.5 font-label text-[11px] font-bold uppercase tracking-[0.16em] text-white/72 sm:text-xs">
                      {action.unit}
                    </p>
                  </div>
                  <p className="mt-2 font-label text-[10px] uppercase tracking-[0.14em] leading-4 text-white/52 sm:text-[11px]">
                    {action.detail}
                  </p>
                </div>
              </div>

              <div className="flex items-end justify-between gap-2 pt-3">
                <div>
                  <p className="font-label text-[10px] font-semibold uppercase tracking-[0.14em] leading-4 text-white/82 sm:text-[12px]">
                    {action.hint}
                  </p>
                </div>

                <span className={`inline-flex h-8 w-8 items-center justify-center rounded-full sm:h-9 sm:w-9 ${action.pillClass}`}>
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      {contentNotice && (
        <section className="rounded-[18pt] border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-on-surface-variant">
          {contentNotice}
        </section>
      )}

      {dashboardError && (
        <section className="rounded-[18pt] border border-error/18 bg-error-container/85 px-4 py-3 text-sm text-on-error-container">
          {dashboardError}
        </section>
      )}

      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Announcements</h2>
          <button type="button" onClick={() => onNavigate('communications')} className="text-primary text-xs font-bold uppercase tracking-wider cursor-pointer">
            View All
          </button>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6">
          {dashboardHome.announcements.length > 0 ? (
            dashboardHome.announcements.map((announcement) => (
              <button
                key={announcement.id}
                type="button"
                onClick={() => onNavigate('communications')}
                className="flex-none w-72 h-44 relative rounded-[20pt] overflow-hidden text-left"
              >
                <img src={announcement.image} alt={announcement.title} className="absolute inset-0 w-full h-full object-cover" />
                <div className="absolute inset-0 bg-gradient-to-t from-surface-container-lowest via-transparent to-transparent"></div>
                {announcement.badgeLabel && announcement.badgeClassName && (
                  <span className={`absolute top-4 left-4 rounded px-2 py-1 text-[10px] font-bold uppercase tracking-[0.16em] ${announcement.badgeClassName}`}>
                    {announcement.badgeLabel}
                  </span>
                )}
                <div className="absolute bottom-4 left-4 right-4">
                  <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/65">{announcement.category}</p>
                  <h3 className="mt-2 font-headline font-bold text-white leading-tight">{announcement.title}</h3>
                </div>
              </button>
            ))
          ) : (
            <div className="flex-none w-72 rounded-[20pt] border border-white/8 bg-surface-container p-5 text-sm text-on-surface-variant">
              {isLoadingDashboard ? 'Loading announcements...' : 'No announcements available yet.'}
            </div>
          )}
        </div>
      </section>

      <section className="space-y-4">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Assigned Models</h2>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6">
          {dashboardHome.assignedVehicles.length > 0 ? (
            dashboardHome.assignedVehicles.map((vehicle) => (
              <div
                key={vehicle.id}
                className="flex-none w-64 bg-surface-container rounded-[20pt] p-4 space-y-3 cursor-pointer hover:bg-surface-container-high transition-colors"
                onClick={() => onNavigate('catalog')}
              >
                <div className="h-32 rounded-xl overflow-hidden">
                  <img src={vehicle.image} alt={vehicle.modelName} className="w-full h-full object-cover" />
                </div>
                <div>
                  <h4 className="font-headline font-bold text-on-surface">{vehicle.modelName}</h4>
                  <p className="mt-1 text-xs text-on-surface-variant">{vehicle.variantName}</p>
                  <div className="flex gap-2 mt-2">
                    <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">
                      {vehicle.network}
                    </span>
                    <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">
                      {vehicle.inventoryStatus}
                    </span>
                  </div>
                </div>
              </div>
            ))
          ) : (
            <div className="flex-none w-64 rounded-[20pt] border border-white/8 bg-surface-container p-5 text-sm text-on-surface-variant">
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
                className="bg-surface-container-low rounded-[20pt] p-4 flex items-center justify-between border border-outline-variant/5"
              >
                <div className="flex items-center gap-3">
                  <div className={`w-10 h-10 rounded-full flex items-center justify-center font-bold ${getLeadAvatarClassName(lead)}`}>
                    {lead.initials}
                  </div>
                  <div>
                    <p className="font-bold text-on-surface">{lead.customerName}</p>
                    <p className="text-xs text-on-surface-variant">{buildLeadSubtitle(lead)}</p>
                  </div>
                </div>
                <span className={`px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter ${getLeadBadgeClassName(lead)}`}>
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
    if (!metric) {
      return action;
    }

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
