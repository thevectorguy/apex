import { Screen } from '../types';

export function CatalogScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  return (
    <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto">
      {/* Search and Header */}
      <section className="mb-8">
        <div className="flex justify-between items-end mb-6">
          <div>
            <span className="font-label text-secondary text-xs uppercase tracking-[0.2em] mb-1 block">Inventory</span>
            <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface">Catalog</h1>
          </div>
          <button className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center text-primary border border-outline-variant/10 hover:border-primary/30 transition-all">
            <span className="material-symbols-outlined text-2xl">tune</span>
          </button>
        </div>
        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-xl">search</span>
          <input
            type="text"
            placeholder="Search high-performance vehicles..."
            className="w-full bg-surface-container-low border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl py-4 pl-12 pr-4 font-body text-on-surface placeholder:text-outline/50 transition-all"
          />
        </div>
      </section>

      {/* Filter Chips */}
      <nav className="flex gap-3 overflow-x-auto hide-scrollbar mb-10 pb-2">
        <button className="px-6 py-2.5 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-fixed font-medium text-sm whitespace-nowrap shadow-[0_0_15px_rgba(227,194,133,0.3)]">All Models</button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">Sedans</button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">SUVs</button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">Electric</button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">Performance</button>
      </nav>

      {/* Product Grid */}
      <div className="grid grid-cols-1 gap-8">
        {/* Honda Elevate Card */}
        <article className="relative group overflow-hidden rounded-[20pt] bg-surface-container h-[28rem] border border-outline-variant/5 shadow-2xl">
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDhXIdhTuTs5bnCuHvnw0p3tJN0JqMUu2oGchCZJEQBKVKyRYaARHUn50iGNTKYanc-sf8dVJXz-3-eI7SBI-S-x2Tuj2ucWlA4BfPpEPUkJw6V5KSx8KEdIn_p_xAYL_f0Ba7x2QnsIThG_wcWYOEb8rhgBcSZe4apSnxgM7y4o8D7-rL_hvDuu_sMawFSyNxd5pDStq4GiJdqcU3CQmfcPge91c15Cb4LD3DbzfNmRdZsFvM-yertu2SzHFulXvlhCgqESKJCjfY"
              alt="Honda Elevate"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/20"></div>
          </div>

          <div className="absolute top-6 left-6 flex gap-2 z-10">
            <span className="px-3 py-1 rounded-full bg-primary/20 backdrop-blur-md text-primary font-headline text-[10px] font-bold tracking-widest uppercase border border-primary/30">NEW</span>
            <span className="px-3 py-1 rounded-full bg-secondary/20 backdrop-blur-md text-secondary font-headline text-[10px] font-bold tracking-widest uppercase border border-secondary/30">EV-HYBRID</span>
          </div>

          <button className="absolute top-6 right-6 z-10 w-10 h-10 rounded-full glass-panel flex items-center justify-center text-on-surface hover:text-error transition-colors">
            <span className="material-symbols-outlined text-xl">favorite</span>
          </button>

          <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h2 className="font-headline text-4xl font-bold tracking-tight text-white">Honda Elevate</h2>
                <div className="flex items-center gap-3">
                  <span className="font-headline text-2xl text-secondary font-medium">₹12.5 - 16.8 L</span>
                  <span className="flex items-center gap-1 text-on-surface-variant text-sm bg-surface-container-highest/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.8
                  </span>
                </div>
              </div>
              <button onClick={() => onNavigate('studio_config')} className="bg-primary text-on-primary-fixed px-8 py-4 rounded-xl font-headline font-bold tracking-wide hover:shadow-[0_0_20px_rgba(164,201,255,0.4)] transition-all transform active:scale-95">
                VIEW DETAILS
              </button>
            </div>

            <div className="mt-6 flex gap-6 border-t border-white/10 pt-6">
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Range</span>
                <span className="font-headline font-semibold text-white">450 KM</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Power</span>
                <span className="font-headline font-semibold text-white">142 BHP</span>
              </div>
              <div className="flex flex-col">
                <span className="font-label text-[10px] uppercase tracking-widest text-on-surface-variant">Transmission</span>
                <span className="font-headline font-semibold text-white">CVT/MT</span>
              </div>
            </div>
          </div>
        </article>

        {/* DILOS GT-Carbon Card */}
        <article className="relative group overflow-hidden rounded-[20pt] bg-surface-container h-[28rem] border border-outline-variant/5 shadow-2xl">
          <div className="absolute inset-0 z-0">
            <img
              src="https://lh3.googleusercontent.com/aida-public/AB6AXuDZ1s3plcYdQGJnNeQ1aPcdeSfdPe08bpcEvAjF_DUhMMi7mKxjcMatFH0MSkVV2shP9a4zXxjNkUD3fr4eEQSmQndDRPvSDYnKdYImSbkoU-bg4Fadej4b065x3gGjGGtkjzLdDOJPlFtePMWws2hcRZk_brwj_nWCFwnrWVTi_DwPTqBpHHc_RCUkQQqax3UDztPdHSkxLIBGjYOlmNnyTOtFV4L66BAZnRqoRg2K9mMniTB5EBOvXCumJbR2r7RiE1lB0vRsfxc"
              alt="DILOS GT"
              className="w-full h-full object-cover transition-transform duration-700 group-hover:scale-105"
            />
            <div className="absolute inset-0 bg-gradient-to-t from-surface via-transparent to-black/20"></div>
          </div>

          <div className="absolute top-6 left-6 z-10">
            <span className="px-3 py-1 rounded-full bg-surface-variant/40 backdrop-blur-md text-on-surface font-headline text-[10px] font-bold tracking-widest uppercase border border-outline-variant/30">LIMITED</span>
          </div>

          <div className="absolute bottom-0 left-0 right-0 p-8 z-10">
            <div className="flex justify-between items-end">
              <div className="space-y-1">
                <h2 className="font-headline text-4xl font-bold tracking-tight text-white">DILOS GT-Carbon</h2>
                <div className="flex items-center gap-3">
                  <span className="font-headline text-2xl text-secondary font-medium">₹24.8 - 28.5 L</span>
                  <span className="flex items-center gap-1 text-on-surface-variant text-sm bg-surface-container-highest/50 px-2 py-0.5 rounded-md backdrop-blur-sm">
                    <span className="material-symbols-outlined text-[14px] text-secondary" style={{ fontVariationSettings: "'FILL' 1" }}>star</span> 4.9
                  </span>
                </div>
              </div>
              <button onClick={() => onNavigate('studio_config')} className="bg-surface-bright/20 backdrop-blur-xl text-secondary border border-secondary/20 px-8 py-4 rounded-xl font-headline font-bold tracking-wide hover:bg-secondary/10 transition-all">
                VIEW DETAILS
              </button>
            </div>
          </div>
        </article>
      </div>
    </main>
  );
}
