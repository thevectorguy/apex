import { Screen } from '../types';

const brochures = [
  {
    name: 'Apex GT-Carbon',
    type: 'Performance',
    format: 'PDF + walkaround notes',
    freshness: 'Updated 2h ago',
    action: 'Track-day buyers',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDZ1s3plcYdQGJnNeQ1aPcdeSfdPe08bpcEvAjF_DUhMMi7mKxjcMatFH0MSkVV2shP9a4zXxjNkUD3fr4eEQSmQndDRPvSDYnKdYImSbkoU-bg4Fadej4b065x3gGjGGtkjzLdDOJPlFtePMWws2hcRZk_brwj_nWCFwnrWVTi_DwPTqBpHHc_RCUkQQqax3UDztPdHSkxLIBGjYOlmNnyTOtFV4L66BAZnRqoRg2K9mMniTB5EBOvXCumJbR2r7RiE1lB0vRsfxc',
  },
  {
    name: 'Honda Elevate EV SUV',
    type: 'EV SUV',
    format: 'PDF + charging FAQ',
    freshness: 'Updated this morning',
    action: 'Family EV shoppers',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuDhXIdhTuTs5bnCuHvnw0p3tJN0JqMUu2oGchCZJEQBKVKyRYaARHUn50iGNTKYanc-sf8dVJXz-3-eI7SBI-S-x2Tuj2ucWlA4BfPpEPUkJw6V5KSx8KEdIn_p_xAYL_f0Ba7x2QnsIThG_wcWYOEb8rhgBcSZe4apSnxgM7y4o8D7-rL_hvDuu_sMawFSyNxd5pDStq4GiJdqcU3CQmfcPge91c15Cb4LD3DbzfNmRdZsFvM-yertu2SzHFulXvlhCgqESKJCjfY',
  },
  {
    name: 'Vulcan Core',
    type: 'Launch deck',
    format: 'PDF + price matrix',
    freshness: 'Version 3.1',
    action: 'Reservation follow-ups',
    img: 'https://lh3.googleusercontent.com/aida-public/AB6AXuCMfKypZNoBEJ5ofBH6RuPdTRqXNlSq2bPwr_Dbw5YyFOPtaZ-rXaPsuDVgJ-gwJ56-h1ZhIsB8bs6sTo1al1JCr_Jq32rS63lzKd6BNgvZ9IxVnLDT5l479RhK8DESJOB7GTgpovGVKruWXmKOTLcTZ9Hi_BXdWBcu7KzkS-M6D50XfLDsHhoSaXF-jRHuslCaZOpnSgM3-X_iA-hc7SH65xQt23qI9ILZTHNwZrbSJBpAnoEF0mgjaZETfH-HtcAPBzCHSW4wkcU',
  },
];

export function BrochuresScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-8">
      <section className="space-y-4">
        <div className="flex items-end justify-between gap-4">
          <div>
            <span className="font-label text-secondary text-xs uppercase tracking-[0.2em] mb-1 block">Library</span>
            <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface">Brochures</h1>
          </div>
          <button
            type="button"
            onClick={() => onNavigate('catalog')}
            className="h-12 rounded-xl px-4 glass-panel border border-outline-variant/10 text-primary font-headline font-semibold hover:border-primary/30 transition-all"
          >
            Open Catalog
          </button>
        </div>

        <p className="font-body text-on-surface-variant text-lg max-w-2xl">
          Ready-to-share literature for every live floor conversation, with the newest pricing and feature highlights surfaced first.
        </p>
      </section>

      <section className="relative overflow-hidden rounded-[24pt] border border-white/5 bg-gradient-to-br from-[#20180f] via-[#3a2815] to-[#14141b] p-6 shadow-[0_24px_50px_rgba(0,0,0,0.35)]">
        <div className="absolute inset-0 carbon-texture opacity-10"></div>
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(255,255,255,0.18),transparent_34%)]"></div>

        <div className="relative z-10 flex items-start justify-between gap-4">
          <div>
            <span className="font-label text-xs font-bold uppercase tracking-[0.24em] text-[#f3d7a2]">Ready To Share</span>
            <div className="mt-3 flex flex-wrap items-end gap-x-4 gap-y-2">
              <h2 className="font-headline text-5xl font-extrabold tracking-tight text-white">12 Files</h2>
              <p className="font-body text-sm text-white/70 max-w-xs">4 refreshed this week, 3 already synced for premium EV consultations.</p>
            </div>
          </div>

          <div className="flex h-16 w-16 items-center justify-center rounded-full border border-[#c8a96e]/25 bg-[#c8a96e]/10 text-[#f3d7a2]">
            <span className="material-symbols-outlined text-[28px]">description</span>
          </div>
        </div>

        <div className="relative z-10 mt-6 grid grid-cols-3 gap-3">
          <div className="rounded-2xl bg-black/20 px-4 py-3 backdrop-blur-md border border-white/5">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/45">Most Shared</p>
            <p className="mt-2 font-headline text-lg font-semibold text-white">Elevate EV</p>
          </div>
          <div className="rounded-2xl bg-black/20 px-4 py-3 backdrop-blur-md border border-white/5">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/45">Fastest Access</p>
            <p className="mt-2 font-headline text-lg font-semibold text-white">2 taps</p>
          </div>
          <div className="rounded-2xl bg-black/20 px-4 py-3 backdrop-blur-md border border-white/5">
            <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/45">Email Ready</p>
            <p className="mt-2 font-headline text-lg font-semibold text-white">All synced</p>
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          <button className="px-5 py-2.5 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-fixed font-medium text-sm whitespace-nowrap shadow-[0_0_15px_rgba(227,194,133,0.2)]">
            All Files
          </button>
          <button className="px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/10 font-medium text-sm whitespace-nowrap">
            EV
          </button>
          <button className="px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/10 font-medium text-sm whitespace-nowrap">
            Performance
          </button>
          <button className="px-5 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant border border-outline-variant/10 font-medium text-sm whitespace-nowrap">
            Launch Packs
          </button>
        </div>

        <div className="space-y-4">
          {brochures.map((brochure) => (
            <article
              key={brochure.name}
              className="group flex gap-4 rounded-[22pt] border border-outline-variant/10 bg-surface-container p-4 shadow-[0_18px_36px_rgba(0,0,0,0.24)] transition-colors hover:bg-surface-container-high"
            >
              <div className="h-28 w-36 shrink-0 overflow-hidden rounded-[18pt] bg-surface-container-highest">
                <img
                  src={brochure.img}
                  alt={brochure.name}
                  className="h-full w-full object-cover transition-transform duration-500 group-hover:scale-105"
                />
              </div>

              <div className="flex flex-1 flex-col justify-between gap-4 min-w-0">
                <div className="space-y-2">
                  <div className="flex items-center gap-2">
                    <span className="rounded-full bg-secondary/10 px-3 py-1 font-label text-[10px] font-bold uppercase tracking-[0.18em] text-secondary">
                      {brochure.type}
                    </span>
                    <span className="font-label text-[11px] uppercase tracking-[0.16em] text-on-surface-variant">
                      {brochure.freshness}
                    </span>
                  </div>
                  <div>
                    <h3 className="font-headline text-2xl font-bold tracking-tight text-on-surface">{brochure.name}</h3>
                    <p className="mt-1 font-body text-sm text-on-surface-variant">{brochure.format}</p>
                    <p className="mt-2 font-label text-[11px] uppercase tracking-[0.16em] text-white/45">{brochure.action}</p>
                  </div>
                </div>

                <div className="flex flex-wrap gap-2">
                  <button className="rounded-xl bg-primary/12 px-4 py-2 font-headline text-xs font-bold uppercase tracking-[0.14em] text-primary hover:bg-primary/20 transition-colors">
                    View
                  </button>
                  <button className="rounded-xl bg-secondary/12 px-4 py-2 font-headline text-xs font-bold uppercase tracking-[0.14em] text-secondary hover:bg-secondary/20 transition-colors">
                    Share
                  </button>
                </div>
              </div>
            </article>
          ))}
        </div>
      </section>
    </main>
  );
}
