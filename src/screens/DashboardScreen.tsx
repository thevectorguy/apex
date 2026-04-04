import { motion } from 'motion/react';
import { Screen } from '../types';
import { announcements } from '../data/announcements';
import { useEffect, useState } from 'react';
import { getMasterCopyInfo } from '../lib/myCoachApi';

const quickActions: Array<{
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
}> = [
  {
    eyebrow: 'Catalog',
    value: '24',
    unit: 'Models',
    detail: '8 ready today',
    hint: 'Browse live inventory',
    icon: 'directions_car',
    route: 'catalog',
    cardClass: 'from-[#1d1a15] via-[#302716] to-[#14141c]',
    iconClass: 'bg-[#c8a96e]/18 text-[#f4d59b] border-[#c8a96e]/30',
    pillClass: 'bg-[#c8a96e]/16 text-[#f4d59b]',
  },
  {
    eyebrow: 'Practice',
    value: '2',
    unit: 'Drills',
    detail: 'EV and close rehearsal',
    hint: 'Launch simulator',
    icon: 'exercise',
    route: 'pitch_practice',
    cardClass: 'from-[#101b2a] via-[#182c47] to-[#13151d]',
    iconClass: 'bg-[#4a9eff]/18 text-[#9bc8ff] border-[#4a9eff]/30',
    pillClass: 'bg-[#4a9eff]/16 text-[#9bc8ff]',
  },
  {
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
    eyebrow: 'Head Office',
    value: '4',
    unit: 'Updates',
    detail: 'Priority HQ notices',
    hint: 'Open announcements feed',
    icon: 'hub',
    route: 'communications',
    cardClass: 'from-[#14161b] via-[#232632] to-[#121319]',
    iconClass: 'bg-white/10 text-white/85 border-white/10',
    pillClass: 'bg-white/10 text-white/80',
  },
];

const spotlightAction = {
  eyebrow: 'My Coach',
  title: 'Coach every visit, not just the close.',
  detail: 'Record showroom conversations, stitch repeat visits together, and get a SPEED-based report with exact coaching points before the next callback.',
  meta: 'Training Master Copy v1',
  workspaceRoute: 'my_coach' as Screen,
  reportsRoute: 'my_coach_reports' as Screen,
};

export function DashboardScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [masterCopyLabel, setMasterCopyLabel] = useState(spotlightAction.meta);

  useEffect(() => {
    void getMasterCopyInfo()
      .then((info) => setMasterCopyLabel(info.version))
      .catch(() => {});
  }, []);

  return (
    <main className="pt-24 px-6 pb-32 space-y-6 max-w-5xl mx-auto">
      {/* Hero Greeting */}
      <section>
        <h1 className="font-headline text-4xl font-bold tracking-tight text-on-surface">Good morning, Arjun.</h1>
        <p className="font-label text-secondary text-sm tracking-widest uppercase mt-1">OCTOBER 24 - ACTIVE SHIFT: 08:30 - 17:00</p>
      </section>

      {/* Today's Target Card */}
      <section className="relative overflow-hidden rounded-[20pt] bg-gradient-to-br from-secondary via-secondary-container to-surface-container shadow-2xl p-6 flex items-center justify-between border border-white/5">
        <div className="absolute inset-0 carbon-texture opacity-10"></div>
        <div className="relative z-10">
          <span className="font-label text-xs font-bold uppercase tracking-[0.2em] text-on-secondary-fixed">Sales Performance</span>
          <div className="mt-2">
            <span className="font-headline text-5xl font-extrabold text-on-secondary-fixed">3 Units</span>
            <p className="text-on-secondary-fixed/70 text-sm font-medium mt-1">2 remaining for daily goal</p>
          </div>
        </div>
        <div className="relative z-10 flex items-center justify-center">
          <svg className="w-24 h-24 transform -rotate-90">
            <circle className="text-on-secondary-fixed/10" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeWidth="8"></circle>
            <circle className="text-on-secondary-fixed" cx="48" cy="48" fill="transparent" r="40" stroke="currentColor" strokeDasharray="251.2" strokeDashoffset="100.48" strokeWidth="8"></circle>
          </svg>
          <span className="absolute font-headline font-bold text-on-secondary-fixed">60%</span>
        </div>
      </section>

      <section>
        <motion.section
          className="group relative w-full overflow-hidden rounded-[28pt] border border-white/8 bg-[linear-gradient(135deg,#0f1522_0%,#19263a_40%,#1c2230_100%)] px-6 py-7 text-left shadow-[0_24px_70px_rgba(0,0,0,0.42)]"
          whileHover={{ y: -3, scale: 1.005 }}
          transition={{ type: 'spring', stiffness: 320, damping: 26 }}
        >
          <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.28),transparent_28%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.18),transparent_34%)]"></div>
          <div className="absolute -right-8 top-6 h-32 w-32 rounded-full border border-white/10 bg-white/4 blur-2xl"></div>
          <div className="absolute inset-x-0 top-0 h-px bg-gradient-to-r from-transparent via-white/30 to-transparent"></div>

          <div className="relative z-10 grid gap-6 lg:grid-cols-[1.35fr_0.65fr] lg:items-end">
            <div className="space-y-4">
              <div className="flex flex-wrap items-center gap-3">
                <span className="font-label text-[10px] font-bold uppercase tracking-[0.26em] text-primary/90">
                  {spotlightAction.eyebrow}
                </span>
                <span className="inline-flex items-center rounded-full border border-secondary/25 bg-secondary/12 px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                  {masterCopyLabel}
                </span>
              </div>

              <div className="max-w-3xl">
                <h2 className="font-headline text-3xl font-bold tracking-tight text-white sm:text-4xl">
                  {spotlightAction.title}
                </h2>
                <p className="mt-3 max-w-2xl text-sm leading-6 text-white/72 sm:text-base">
                  {spotlightAction.detail}
                </p>
              </div>
            </div>

	            <div className="flex flex-col items-start gap-4 lg:items-end">
	              <div className="flex flex-wrap gap-3 lg:justify-end">
	                <button
	                  type="button"
                  onClick={() => onNavigate(spotlightAction.workspaceRoute)}
                  className="inline-flex items-center gap-2 rounded-full bg-primary px-4 py-2.5 font-label text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed shadow-[0_16px_32px_rgba(74,158,255,0.25)]"
                >
                  Open Workspace
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </button>
                <button
                  type="button"
                  onClick={() => onNavigate(spotlightAction.reportsRoute)}
                  className="inline-flex items-center gap-2 rounded-full border border-white/12 bg-white/8 px-4 py-2.5 font-label text-xs font-bold uppercase tracking-[0.16em] text-white/84 transition hover:bg-white/12"
                >
                  View Reports
                  <span className="material-symbols-outlined text-[16px]">description</span>
                </button>
              </div>
              <p className="text-[11px] uppercase tracking-[0.16em] text-white/46 lg:text-right">
                Reports let you reopen old sessions and regenerate a summary if one comes out wrong.
              </p>
            </div>
          </div>
        </motion.section>
      </section>

      {/* Quick Actions Grid */}
      <section className="grid grid-cols-2 gap-3 sm:gap-4">
        {quickActions.map((action, index) => (
          <motion.button
            key={action.eyebrow}
            type="button"
            onClick={() => onNavigate(action.route)}
            className={`group relative min-h-[10.5rem] overflow-hidden rounded-[22pt] border border-white/6 bg-gradient-to-br ${action.cardClass} p-4 sm:min-h-[12rem] sm:p-5 text-left shadow-[0_20px_40px_rgba(0,0,0,0.35)]`}
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
              <div className="flex items-start justify-between gap-3">
                <div>
                  <span className="font-label text-[10px] font-bold uppercase tracking-[0.24em] text-white/60">
                    {action.eyebrow}
                  </span>
                  <div className="mt-3 flex items-end gap-2">
                    <h3 className="font-headline text-[2.2rem] font-extrabold leading-none tracking-tight text-white sm:text-[2.45rem]">
                      {action.value}
                    </h3>
                    <p className="pb-0.5 font-headline text-lg font-semibold tracking-tight text-white/92 sm:text-xl">
                      {action.unit}
                    </p>
                  </div>
                  <p className="mt-1.5 max-w-[9rem] font-label text-[11px] uppercase tracking-[0.14em] text-white/55 sm:max-w-none">
                    {action.detail}
                  </p>
                </div>

                <div
                  className={`flex h-10 w-10 shrink-0 items-center justify-center rounded-full border backdrop-blur-md sm:h-12 sm:w-12 ${action.iconClass}`}
                >
                  <span className="material-symbols-outlined text-[20px] sm:text-[22px]">{action.icon}</span>
                </div>
              </div>

              <div className="flex items-end justify-between gap-3 pt-3">
                <div>
                  <p className="max-w-[7rem] font-headline text-[13px] font-semibold leading-4 text-white/92 sm:max-w-[8.5rem] sm:text-[15px]">
                    {action.hint}
                  </p>
                </div>

                <span
                  className={`inline-flex h-9 w-9 items-center justify-center rounded-full ${action.pillClass}`}
                >
                  <span className="material-symbols-outlined text-[16px]">arrow_forward</span>
                </span>
              </div>
            </div>
          </motion.button>
        ))}
      </section>

      {/* Live Announcements */}
      <section className="space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Announcements</h2>
          <button type="button" onClick={() => onNavigate('communications')} className="text-primary text-xs font-bold uppercase tracking-wider cursor-pointer">
            View All
          </button>
        </div>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6">
          {announcements.slice(0, 2).map((announcement) => (
            <button
              key={announcement.id}
              type="button"
              onClick={() => onNavigate('communications')}
              className="flex-none w-72 h-44 relative rounded-[20pt] overflow-hidden text-left"
            >
              <img
                src={announcement.image}
                alt={announcement.title}
                className="absolute inset-0 w-full h-full object-cover"
              />
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
          ))}
        </div>
      </section>

      {/* Assigned Inventory */}
      <section className="space-y-4">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Assigned Inventory</h2>
        <div className="flex overflow-x-auto hide-scrollbar gap-4 -mx-6 px-6">
          <div className="flex-none w-64 bg-surface-container rounded-[20pt] p-4 space-y-3 cursor-pointer hover:bg-surface-container-high transition-colors" onClick={() => onNavigate('catalog')}>
            <div className="h-32 rounded-xl overflow-hidden">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuAQuubsx10_Tc8Dsha7IAyxkOLkan5kCzi8lOroMtoKW5xYfo_r4AuNlrK6zB_BdNRxVwki8wr1Zk7-_tDY5A_CkXzWtNSml-C8Td_rZlVZ7iojCIE5YmaC90ZQuHhF78nhUiQNZAZpXUB7CK1pcXaudx32lpQWD-faqMQlTGDHVKUE7KD66jGNnx3AUuHj3CyGQS1CTt-4oV-1p6rAdCfGpTVu2qZMpNNBHArcv2xeKIYHJExDfHKUzWAXsNqHylVWBAfM_TqDcS0"
                alt="Car"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-headline font-bold text-on-surface">GT Speedster X</h4>
              <div className="flex gap-2 mt-1">
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">V12 Hybrid</span>
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">In Stock</span>
              </div>
            </div>
          </div>
          <div className="flex-none w-64 bg-surface-container rounded-[20pt] p-4 space-y-3 cursor-pointer hover:bg-surface-container-high transition-colors" onClick={() => onNavigate('catalog')}>
            <div className="h-32 rounded-xl overflow-hidden">
              <img
                src="https://lh3.googleusercontent.com/aida-public/AB6AXuCMfKypZNoBEJ5ofBH6RuPdTRqXNlSq2bPwr_Dbw5YyFOPtaZ-rXaPsuDVgJ-gwJ56-h1ZhIsB8bs6sTo1al1JCr_Jq32rS63lzKd6BNgvZ9IxVnLDT5l479RhK8DESJOB7GTgpovGVKruWXmKOTLcTZ9Hi_BXdWBcu7KzkS-M6D50XfLDsHhoSaXF-jRHuslCaZOpnSgM3-X_iA-hc7SH65xQt23qI9ILZTHNwZrbSJBpAnoEF0mgjaZETfH-HtcAPBzCHSW4wkcU"
                alt="Car"
                className="w-full h-full object-cover"
              />
            </div>
            <div>
              <h4 className="font-headline font-bold text-on-surface">Vulcan Core</h4>
              <div className="flex gap-2 mt-1">
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">All-Electric</span>
                <span className="font-label text-[10px] bg-surface-container-highest px-2 py-0.5 rounded text-primary uppercase">Reserved</span>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* Priority Leads */}
      <section className="space-y-4">
        <h2 className="font-headline text-lg font-bold tracking-tight text-on-surface">Priority Leads</h2>
        <div className="space-y-3">
          <div className="bg-surface-container-low rounded-[20pt] p-4 flex items-center justify-between border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-primary/20 flex items-center justify-center text-primary font-bold">SM</div>
              <div>
                <p className="font-bold text-on-surface">Sarah Mitchell</p>
                <p className="text-xs text-on-surface-variant">Vulcan Core Inquiry</p>
              </div>
            </div>
            <span className="bg-error-container text-on-error-container px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter">Hot</span>
          </div>
          <div className="bg-surface-container-low rounded-[20pt] p-4 flex items-center justify-between border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-secondary/20 flex items-center justify-center text-secondary font-bold">DL</div>
              <div>
                <p className="font-bold text-on-surface">David Lee</p>
                <p className="text-xs text-on-surface-variant">Scheduled Walkaround</p>
              </div>
            </div>
            <span className="bg-secondary-container text-on-secondary-container px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter">New</span>
          </div>
          <div className="bg-surface-container-low rounded-[20pt] p-4 flex items-center justify-between border border-outline-variant/5">
            <div className="flex items-center gap-3">
              <div className="w-10 h-10 rounded-full bg-tertiary-container/20 flex items-center justify-center text-tertiary font-bold">KB</div>
              <div>
                <p className="font-bold text-on-surface">Kiran Baxi</p>
                <p className="text-xs text-on-surface-variant">Finance Approval Pending</p>
              </div>
            </div>
            <span className="bg-surface-container-highest text-on-surface-variant px-3 py-1 rounded-full text-[10px] font-extrabold uppercase tracking-tighter">Follow-up</span>
          </div>
        </div>
      </section>
    </main>
  );
}
