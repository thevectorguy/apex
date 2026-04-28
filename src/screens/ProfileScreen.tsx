import { type Screen } from '../types';
import { useApp } from '../contexts/AppContext';
import { useAuth } from '../contexts/AuthContext';

export function ProfileScreen({ onNavigate }: { onNavigate: (screen: Screen) => void }) {
  const { bootstrap, isLoading, error } = useApp();
  const { signOut, user } = useAuth();
  const me = bootstrap?.me;
  const readiness = bootstrap?.readiness;
  const coach = bootstrap?.coach;

  return (
    <main className="px-6 pb-32 pt-24">
      <section className="mx-auto max-w-[32rem] space-y-5">
        <div className="rounded-[30px] border border-white/8 bg-[linear-gradient(145deg,#101825_0%,#162339_45%,#1a1d28_100%)] p-6 shadow-[0_24px_80px_rgba(0,0,0,0.34)]">
          <button
            type="button"
            onClick={() => onNavigate('dashboard')}
            className="inline-flex items-center gap-2 rounded-full border border-white/10 bg-white/5 px-3 py-1.5 text-[11px] uppercase tracking-[0.16em] text-white/72"
          >
            <span className="material-symbols-outlined text-[16px]">arrow_back</span>
            Dashboard
          </button>

          <div className="mt-5 flex items-center gap-4">
            <div className="h-18 w-18 overflow-hidden rounded-full border border-[#8fb9ff]/30 bg-surface-container-high">
              {me?.avatarUrl ? <img src={me.avatarUrl} alt={me.fullName} className="h-full w-full object-cover" /> : null}
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">Profile</p>
              <h1 className="mt-2 font-headline text-4xl font-bold tracking-tight text-white">{me?.fullName || 'Loading...'}</h1>
              <p className="mt-2 text-sm text-white/66">{me?.role || 'Relationship Manager'} · {me?.showroom || 'DILOS Showroom'}</p>
              {user?.email ? <p className="mt-2 text-xs uppercase tracking-[0.16em] text-white/42">{user.email}</p> : null}
            </div>
          </div>

          <div className="mt-5 flex flex-wrap gap-3">
            <button
              type="button"
              onClick={signOut}
              className="rounded-full border border-[#a4c9ff]/28 bg-[#a4c9ff]/12 px-4 py-2 font-label text-[11px] font-semibold uppercase tracking-[0.18em] text-[#d4e3ff] transition-colors hover:bg-[#a4c9ff]/18"
            >
              Sign out
            </button>
          </div>

          {readiness ? (
            <div className="mt-6 rounded-[24px] border border-white/8 bg-black/16 p-5">
              <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">Current readiness</p>
              <div className="mt-3 flex items-end justify-between gap-4">
                <div>
                  <p className="font-headline text-5xl font-bold text-white">{readiness.score}</p>
                  <p className="mt-1 text-sm text-white/60">Sales Readiness · {readiness.tierName}</p>
                </div>
                <div
                  className="rounded-full border px-3 py-2 text-xs font-bold uppercase tracking-[0.16em]"
                  style={{
                    borderColor: `${readiness.tierColor}55`,
                    backgroundColor: `${readiness.tierColor}22`,
                    color: readiness.tierColor,
                  }}
                >
                  Tier {readiness.tierLevel}
                </div>
              </div>
              <p className="mt-4 text-sm leading-6 text-white/70">{readiness.affirmation}</p>
            </div>
          ) : null}
        </div>

        <div className="grid gap-4 sm:grid-cols-2">
          <MetricCard label="Next tier" value={readiness ? `${readiness.nextTierName}` : '--'} detail={readiness ? `Need +${readiness.pointsToNext} points` : 'Loading'} />
          <MetricCard label="Focus today" value={readiness?.coachingFocus.label || '--'} detail={readiness ? `${readiness.coachingFocus.percentile}th percentile` : 'Loading'} />
          <MetricCard label="Saved customers" value={coach ? String(coach.savedCustomers) : '--'} detail="My Coach workspace" />
          <MetricCard label="Reports" value={coach ? String(coach.reportsCount) : '--'} detail={coach ? `${coach.needsReviewCount} need review` : 'Loading'} />
        </div>

        <div className="rounded-[28px] border border-white/8 bg-surface-container-low/90 p-5 shadow-[0_20px_60px_rgba(0,0,0,0.24)]">
          <p className="text-[10px] uppercase tracking-[0.18em] text-[#8fb9ff]">Today</p>
          <h2 className="mt-2 font-headline text-2xl font-bold text-white">What moves your score next</h2>
          <p className="mt-3 text-sm leading-6 text-white/66">
            {coach?.motivation || 'Keep logging stronger conversations to improve readiness across assigned inventory.'}
          </p>
          {readiness ? (
            <div className="mt-4 rounded-[20px] border border-white/8 bg-black/14 p-4">
              <p className="text-[10px] uppercase tracking-[0.16em] text-white/42">Blocker</p>
              <p className="mt-2 font-semibold text-white">{readiness.blocker}</p>
            </div>
          ) : null}
          {error ? <p className="mt-4 text-sm text-[#ffb4ab]">{error}</p> : null}
          {isLoading ? <p className="mt-4 text-sm text-white/48">Refreshing profile context…</p> : null}
        </div>
      </section>
    </main>
  );
}

function MetricCard({ label, value, detail }: { label: string; value: string; detail: string }) {
  return (
    <div className="rounded-[24px] border border-white/8 bg-white/[0.03] p-4 shadow-[0_16px_40px_rgba(0,0,0,0.16)]">
      <p className="text-[10px] uppercase tracking-[0.18em] text-white/42">{label}</p>
      <p className="mt-3 font-headline text-[1.8rem] font-bold leading-none text-white">{value}</p>
      <p className="mt-2 text-sm leading-6 text-white/60">{detail}</p>
    </div>
  );
}
