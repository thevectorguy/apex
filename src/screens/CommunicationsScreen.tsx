import { Screen } from '../types';

export function CommunicationsScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto">
      {/* Header */}
      <section className="mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="font-label text-secondary text-xs uppercase tracking-[0.2em] mb-1 block">Network</span>
            <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface">Comms</h1>
          </div>
          <button className="w-12 h-12 rounded-xl bg-primary text-on-primary-fixed flex items-center justify-center hover:shadow-[0_0_15px_rgba(164,201,255,0.3)] transition-all">
            <span className="material-symbols-outlined text-2xl">edit_square</span>
          </button>
        </div>
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-xl">search</span>
          <input 
            type="text" 
            placeholder="Search messages, teams, or leads..." 
            className="w-full bg-surface-container-low border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl py-4 pl-12 pr-4 font-body text-on-surface placeholder:text-outline/50 transition-all"
          />
        </div>
      </section>

      {/* Tabs */}
      <nav className="flex gap-6 border-b border-outline-variant/20 mb-6">
        <button className="pb-4 font-headline font-semibold text-primary border-b-2 border-primary">All Messages</button>
        <button className="pb-4 font-headline font-medium text-on-surface-variant hover:text-on-surface transition-colors">Unread (3)</button>
        <button className="pb-4 font-headline font-medium text-on-surface-variant hover:text-on-surface transition-colors">Teams</button>
      </nav>

      {/* Chat List */}
      <div className="space-y-2">
        {/* Chat 1 (Unread) */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/10 cursor-pointer hover:bg-surface-container-highest transition-colors">
          <div className="relative">
            <div className="w-14 h-14 rounded-full bg-gradient-to-br from-primary to-secondary flex items-center justify-center text-on-primary-fixed font-headline font-bold text-xl">
              ST
            </div>
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full border-2 border-surface-container-high"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-headline font-bold text-on-surface truncate text-lg">Sales Team Alpha</h3>
              <span className="text-xs font-label text-primary font-medium">10:42 AM</span>
            </div>
            <p className="font-body text-on-surface text-sm truncate">
              <span className="font-semibold">Sarah:</span> The new Elevate brochures just arrived at the front desk.
            </p>
          </div>
        </div>

        {/* Chat 2 (Unread) */}
        <div className="flex items-center gap-4 p-4 rounded-2xl bg-surface-container-high border border-outline-variant/10 cursor-pointer hover:bg-surface-container-highest transition-colors">
          <div className="relative">
            <img src="https://i.pravatar.cc/150?img=32" alt="Manager" className="w-14 h-14 rounded-full object-cover" />
            <div className="absolute -top-1 -right-1 w-4 h-4 bg-error rounded-full border-2 border-surface-container-high"></div>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-headline font-bold text-on-surface truncate text-lg">David Chen (Manager)</h3>
              <span className="text-xs font-label text-primary font-medium">09:15 AM</span>
            </div>
            <p className="font-body text-on-surface text-sm truncate">
              Great job on the Smith account yesterday. Let's review the numbers at 2 PM.
            </p>
          </div>
        </div>

        {/* Chat 3 (Read) */}
        <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent">
          <div className="w-14 h-14 rounded-full bg-surface-container-highest flex items-center justify-center text-on-surface-variant">
            <span className="material-symbols-outlined text-2xl" style={{ fontVariationSettings: "'FILL' 1" }}>bolt</span>
          </div>
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-headline font-semibold text-on-surface-variant truncate text-lg">Lead Updates (Automated)</h3>
              <span className="text-xs font-label text-on-surface-variant">Yesterday</span>
            </div>
            <p className="font-body text-on-surface-variant text-sm truncate">
              New lead assigned: Michael Johnson (Interested in Apex GT)
            </p>
          </div>
        </div>

        {/* Chat 4 (Read) */}
        <div className="flex items-center gap-4 p-4 rounded-2xl hover:bg-surface-container-low transition-colors cursor-pointer border border-transparent">
          <img src="https://i.pravatar.cc/150?img=44" alt="Client" className="w-14 h-14 rounded-full object-cover opacity-80" />
          <div className="flex-1 min-w-0">
            <div className="flex justify-between items-baseline mb-1">
              <h3 className="font-headline font-semibold text-on-surface-variant truncate text-lg">Emily Davis</h3>
              <span className="text-xs font-label text-on-surface-variant">Tuesday</span>
            </div>
            <p className="font-body text-on-surface-variant text-sm truncate">
              Thanks for the test drive! I'll discuss it with my husband and get back to you.
            </p>
          </div>
        </div>
      </div>
    </main>
  );
}
