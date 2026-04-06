import { Screen } from '../types';
import { writeSearchParam } from '../lib/appRouter';
import { marutiCatalogVehicles, type InventoryVehicleId } from '../data/marutiVehicles';

const featuredVehicle = marutiCatalogVehicles[0];
const secondaryVehicles = marutiCatalogVehicles.slice(1);

export function CatalogScreen({ onNavigate }: { onNavigate: (s: Screen) => void }) {
  function openVehicleStudio(vehicle: InventoryVehicleId) {
    onNavigate('studio_config');
    writeSearchParam('vehicle', vehicle);
  }

  return (
    <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-8">
      <section className="space-y-4">
        <div className="flex justify-between items-end gap-4">
          <div>
            <span className="font-label text-secondary text-xs uppercase tracking-[0.2em] mb-1 block">Showroom Lineup</span>
            <h1 className="font-headline text-5xl font-bold tracking-tight text-on-surface">Products</h1>
          </div>
          <button className="w-12 h-12 rounded-xl glass-panel flex items-center justify-center text-primary border border-outline-variant/10 hover:border-primary/30 transition-all">
            <span className="material-symbols-outlined text-2xl">tune</span>
          </button>
        </div>

        <p className="max-w-2xl text-sm leading-6 text-on-surface-variant">
          Curated Maruti products for live showroom selling, blending NEXA premium walkarounds with Arena volume movers in one clean view.
        </p>

        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-xl">search</span>
          <input
            type="text"
            placeholder="Search Maruti variants, networks, and body styles..."
            className="w-full bg-surface-container-low border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl py-4 pl-12 pr-4 font-body text-on-surface placeholder:text-outline/50 transition-all"
          />
        </div>
      </section>

      <nav className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        <button className="px-6 py-2.5 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-fixed font-medium text-sm whitespace-nowrap shadow-[0_0_15px_rgba(227,194,133,0.3)]">
          All Models
        </button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">
          NEXA
        </button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">
          Arena
        </button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">
          Automatic
        </button>
        <button className="px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10">
          Family Ready
        </button>
      </nav>

      <section className="relative overflow-hidden rounded-[30pt] border border-white/6 bg-[linear-gradient(135deg,#14181f_0%,#1a2432_42%,#16161b_100%)] shadow-[0_30px_80px_rgba(0,0,0,0.42)]">
        <div className="absolute inset-0 bg-[radial-gradient(circle_at_top_right,rgba(164,201,255,0.18),transparent_30%),radial-gradient(circle_at_bottom_left,rgba(227,194,133,0.12),transparent_34%)]" />
        <div className="absolute inset-0 carbon-texture opacity-[0.05]" />

        <div className="relative z-10 grid gap-6 p-4 md:grid-cols-[1.15fr_0.85fr] md:p-5">
          <div className="relative min-h-[30rem] overflow-hidden rounded-[26pt]">
            <img
              src={featuredVehicle.image}
              alt={featuredVehicle.modelName}
              className="absolute inset-0 h-full w-full object-cover"
            />
            <div className="absolute inset-0 bg-gradient-to-r from-black/82 via-black/38 to-transparent" />
            <div className="absolute inset-0 flex flex-col justify-between p-6">
              <div className="flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/25 bg-primary/12 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-primary">
                  Featured
                </span>
                <span className="rounded-full border border-secondary/25 bg-secondary/12 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-secondary">
                  {featuredVehicle.network}
                </span>
                <span className="rounded-full border border-white/12 bg-white/8 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-white/80">
                  {featuredVehicle.bodyStyle}
                </span>
              </div>

              <div className="max-w-md">
                <p className="font-label text-[10px] uppercase tracking-[0.24em] text-white/56">{featuredVehicle.editionLabel}</p>
                <h2 className="mt-3 font-headline text-4xl font-extrabold tracking-tight text-white">{featuredVehicle.modelName}</h2>
                <p className="mt-2 text-sm uppercase tracking-[0.16em] text-white/72">{featuredVehicle.variantName}</p>
                <div className="mt-4 flex items-center gap-3">
                  <span className="font-headline text-2xl text-secondary font-medium">{featuredVehicle.priceLabel}</span>
                  <span className="rounded-full bg-surface-container-highest/50 px-3 py-1 text-[11px] font-label uppercase tracking-[0.14em] text-white/74">
                    Ex-showroom
                  </span>
                </div>

                <div className="mt-6 grid grid-cols-3 gap-3">
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Fuel</p>
                    <p className="mt-1 font-headline text-sm font-semibold text-white">{featuredVehicle.fuelLabel}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Engine</p>
                    <p className="mt-1 font-headline text-sm font-semibold text-white">{featuredVehicle.engineLabel}</p>
                  </div>
                  <div>
                    <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Gearbox</p>
                    <p className="mt-1 font-headline text-sm font-semibold text-white">{featuredVehicle.transmissionLabel}</p>
                  </div>
                </div>

                <div className="mt-6 flex flex-wrap gap-3">
                  <button
                    onClick={() => openVehicleStudio(featuredVehicle.id)}
                    className="rounded-full bg-primary px-5 py-3 font-headline text-xs font-bold uppercase tracking-[0.16em] text-on-primary-fixed shadow-[0_18px_36px_rgba(74,158,255,0.22)]"
                  >
                    View Details
                  </button>
                  <button className="rounded-full border border-white/12 bg-white/8 px-5 py-3 font-headline text-xs font-bold uppercase tracking-[0.16em] text-white/84">
                    Compare Trim
                  </button>
                </div>
              </div>
            </div>
          </div>

          <div className="flex flex-col gap-3 rounded-[26pt] border border-white/8 bg-white/[0.04] p-5 backdrop-blur-xl">
            <div className="flex items-start justify-between gap-3">
              <div>
                <p className="font-label text-[10px] uppercase tracking-[0.22em] text-white/40">Floor Snapshot</p>
                <h3 className="mt-2 font-headline text-2xl font-semibold text-white">Maruti mix, tuned for live selling.</h3>
              </div>
              <div className="flex h-12 w-12 items-center justify-center rounded-full border border-secondary/20 bg-secondary/10 text-secondary">
                <span className="material-symbols-outlined text-[22px]">garage</span>
              </div>
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div className="rounded-[18pt] border border-white/8 bg-black/16 p-4">
                <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/40">Total models</p>
                <p className="mt-2 font-headline text-3xl font-bold text-white">{marutiCatalogVehicles.length}</p>
              </div>
              <div className="rounded-[18pt] border border-white/8 bg-black/16 p-4">
                <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/40">Ready now</p>
                <p className="mt-2 font-headline text-3xl font-bold text-white">3</p>
              </div>
              <div className="rounded-[18pt] border border-white/8 bg-black/16 p-4">
                <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/40">NEXA</p>
                <p className="mt-2 font-headline text-3xl font-bold text-white">2</p>
              </div>
              <div className="rounded-[18pt] border border-white/8 bg-black/16 p-4">
                <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/40">Arena</p>
                <p className="mt-2 font-headline text-3xl font-bold text-white">3</p>
              </div>
            </div>

            <div className="rounded-[20pt] border border-white/8 bg-black/14 p-4">
              <p className="font-label text-[10px] uppercase tracking-[0.18em] text-white/42">Suggested talk track</p>
              <p className="mt-2 text-sm leading-6 text-white/64">
                Lead with Brezza and Fronx for showroom pull, then use Dzire or Ertiga when budget, mileage, or family practicality becomes the deciding factor.
              </p>
            </div>
          </div>
        </div>
      </section>

      <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
        {secondaryVehicles.map((vehicle) => (
          <article
            key={vehicle.id}
            className="group overflow-hidden rounded-[26pt] border border-outline-variant/10 bg-[linear-gradient(145deg,rgba(31,31,37,0.96),rgba(22,22,28,0.96))] shadow-[0_22px_44px_rgba(0,0,0,0.24)]"
          >
            <div className="relative h-56 overflow-hidden">
              <img
                src={vehicle.image}
                alt={vehicle.modelName}
                className="h-full w-full object-cover transition-transform duration-700 group-hover:scale-105"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-black/78 via-black/8 to-transparent" />
              <div className="absolute left-4 top-4 flex flex-wrap gap-2">
                <span className="rounded-full border border-primary/25 bg-primary/12 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-primary">
                  {vehicle.network}
                </span>
                <span className="rounded-full border border-white/12 bg-black/22 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-white/80">
                  {vehicle.bodyStyle}
                </span>
              </div>
            </div>

            <div className="space-y-5 p-5">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.2em] text-white/42">{vehicle.editionLabel}</p>
                  <h3 className="mt-2 font-headline text-3xl font-bold tracking-tight text-white">{vehicle.modelName}</h3>
                  <p className="mt-1 text-sm uppercase tracking-[0.15em] text-white/60">{vehicle.variantName}</p>
                </div>
                <span className="rounded-full bg-secondary/12 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-secondary">
                  {vehicle.inventoryStatus}
                </span>
              </div>

              <div className="flex items-center gap-3">
                <span className="font-headline text-2xl text-secondary font-medium">{vehicle.priceLabel}</span>
                <span className="text-sm text-white/42">Ex-showroom</span>
              </div>

              <div className="grid grid-cols-3 gap-3 rounded-[18pt] border border-white/8 bg-black/12 p-4">
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.16em] text-white/40">Fuel</p>
                  <p className="mt-1 font-headline text-sm font-semibold text-white">{vehicle.fuelLabel}</p>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.16em] text-white/40">Engine</p>
                  <p className="mt-1 font-headline text-sm font-semibold text-white">{vehicle.engineLabel}</p>
                </div>
                <div>
                  <p className="font-label text-[10px] uppercase tracking-[0.16em] text-white/40">Gearbox</p>
                  <p className="mt-1 font-headline text-sm font-semibold text-white">{vehicle.transmissionLabel}</p>
                </div>
              </div>

              <div className="flex flex-wrap gap-2">
                <button
                  onClick={() => openVehicleStudio(vehicle.id)}
                  className="rounded-full bg-primary/12 px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-[0.14em] text-primary hover:bg-primary/18 transition-colors"
                >
                  View Details
                </button>
                <button className="rounded-full bg-secondary/12 px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-[0.14em] text-secondary hover:bg-secondary/18 transition-colors">
                  Share Brochure
                </button>
              </div>
            </div>
          </article>
        ))}
      </section>
    </main>
  );
}
