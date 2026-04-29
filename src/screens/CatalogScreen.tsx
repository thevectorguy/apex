import { useEffect, useState } from 'react';
import { Screen } from '../types';
import { listCatalogVehicles } from '../lib/catalogApi';
import { isAbortError } from '../lib/contentApi';
import type { CatalogVehicle } from '../lib/contentTypes';
import { buildProductAuthorityHomeUrl } from '../lib/runtimeConfig';

const featuredVehicleImage = '/images/inventory/fronx-cutout.png';
const cutoutVehicleIds = new Set(['fronx', 'invicto']);
const catalogFilters = ['all', 'NEXA', 'Arena', 'automatic', 'family'] as const;

type CatalogFilter = (typeof catalogFilters)[number];

export function CatalogScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [isStartingPractice, setIsStartingPractice] = useState(false);
  const [practiceError, setPracticeError] = useState<string | null>(null);
  const [vehicles, setVehicles] = useState<CatalogVehicle[]>([]);
  const [isLoadingVehicles, setIsLoadingVehicles] = useState(true);
  const [contentNotice, setContentNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');
  const [activeFilter, setActiveFilter] = useState<CatalogFilter>('all');

  useEffect(() => {
    const controller = new AbortController();

    void listCatalogVehicles({ signal: controller.signal })
      .then((result) => {
        setVehicles(result.items);
        setContentNotice(result.notice || null);
        setLoadError(null);
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Unable to load the product lineup right now.');
      })
      .finally(() => {
        setIsLoadingVehicles(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  function startProductAuthorityPractice() {
    if (isStartingPractice) return;

    setIsStartingPractice(true);
    setPracticeError(null);

    try {
      window.location.assign(buildProductAuthorityHomeUrl());
    } catch (error) {
      console.error('Failed to open Product Authority', error);
      setPracticeError('Product Authority is not configured right now. Please try again in a moment.');
      setIsStartingPractice(false);
    }
  }

  function getVehicleImage(vehicle: CatalogVehicle) {
    return vehicle.id === 'fronx' ? featuredVehicleImage : vehicle.image;
  }

  function getVehicleImageClasses(vehicle: CatalogVehicle, isFeatured: boolean) {
    if (vehicle.id === 'fronx' && isFeatured) {
      return 'absolute inset-x-0 bottom-0 mx-auto h-[88%] w-auto max-w-none -translate-x-7 object-contain object-bottom transition-transform duration-700 group-hover:scale-105 md:-translate-x-10';
    }

    return cutoutVehicleIds.has(vehicle.id) ? 'object-contain object-center px-4 py-4' : 'object-cover';
  }

  function renderVehicleCard(vehicle: CatalogVehicle, options?: { featured?: boolean; className?: string }) {
    const isCutoutVehicle = cutoutVehicleIds.has(vehicle.id);
    const isFeatured = options?.featured ?? false;

    return (
      <article
        key={vehicle.id}
        className={[
          'group overflow-hidden rounded-[26pt] border border-black/5 dark:border-outline-variant/10 bg-white dark:bg-[linear-gradient(145deg,rgba(31,31,37,0.96),rgba(22,22,28,0.96))] shadow-apple-soft dark:shadow-[0_22px_44px_rgba(0,0,0,0.24)] transition-all hover:shadow-apple',
          isFeatured ? 'border-primary/20 dark:border-white/12 shadow-[0_20px_50px_rgba(0,122,255,0.15)] dark:shadow-[0_30px_70px_rgba(0,0,0,0.32)] ring-1 ring-primary/10' : '',
          options?.className ?? '',
        ].join(' ')}
      >
        <div
          className={[
            'relative overflow-hidden',
            isFeatured ? 'h-56 md:h-64' : 'h-56',
            isCutoutVehicle
              ? vehicle.id === 'fronx' && isFeatured
                ? 'bg-black'
                : 'bg-[radial-gradient(circle_at_78%_24%,rgba(0,122,255,0.15),transparent_22%),linear-gradient(145deg,#e5f0ff_0%,#f5f8ff_55%,#ffffff_100%)] dark:bg-[radial-gradient(circle_at_78%_24%,rgba(156,194,255,0.26),transparent_22%),linear-gradient(145deg,#101722_0%,#0c1118_55%,#11151d_100%)]'
              : '',
          ].join(' ')}
        >
          <img
            src={getVehicleImage(vehicle)}
            alt={vehicle.modelName}
            className={[
              vehicle.id === 'fronx' && isFeatured
                ? ''
                : 'h-full w-full transition-transform duration-700 group-hover:scale-105',
              getVehicleImageClasses(vehicle, isFeatured),
            ].join(' ')}
          />
          <div className="absolute inset-0 bg-gradient-to-t from-black/20 via-black/0 to-transparent dark:from-black/78 dark:via-black/8 dark:to-transparent" />
          <div className="absolute left-4 top-4 flex flex-wrap gap-2">
            {isFeatured && (
              <span className="rounded-full border border-primary/20 dark:border-primary/25 bg-white/90 dark:bg-primary/12 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-primary shadow-sm">
                Featured
              </span>
            )}
            <span className="rounded-full border border-primary/20 dark:border-primary/25 bg-white/90 dark:bg-primary/12 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-primary shadow-sm">
              {vehicle.network}
            </span>
            <span className="rounded-full border border-black/10 dark:border-white/12 bg-white/90 dark:bg-black/22 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-on-surface dark:text-white/80 shadow-sm">
              {vehicle.bodyStyle}
            </span>
          </div>
        </div>

        <div className="space-y-5 p-5">
          <div className="flex items-start justify-between gap-4">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.2em] text-on-surface-variant/70 dark:text-white/42">{vehicle.editionLabel}</p>
              <h3 className="mt-2 font-headline text-3xl font-bold tracking-tight text-on-surface dark:text-white">{vehicle.modelName}</h3>
              <p className="mt-1 text-sm uppercase tracking-[0.15em] text-on-surface-variant dark:text-white/60">{vehicle.variantName}</p>
            </div>
            <span className="rounded-full bg-secondary/10 dark:bg-secondary/12 px-3 py-1 font-label text-[10px] uppercase tracking-[0.18em] text-secondary-container-on dark:text-secondary">
              {vehicle.inventoryStatus}
            </span>
          </div>

          <div className="flex items-center gap-3">
            <span className="font-headline text-2xl text-secondary-container-on dark:text-secondary font-medium">{vehicle.priceLabel}</span>
            <span className="text-sm text-on-surface-variant/70 dark:text-white/42">Ex-showroom</span>
          </div>

          <div className="grid grid-cols-3 gap-3 rounded-[18pt] border border-primary/10 dark:border-white/8 bg-primary/5 dark:bg-black/12 p-4">
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.16em] text-primary/70 dark:text-white/40">Fuel</p>
              <p className="mt-1 font-headline text-sm font-semibold text-primary-on-container dark:text-white">{vehicle.fuelLabel}</p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.16em] text-primary/70 dark:text-white/40">Engine</p>
              <p className="mt-1 font-headline text-sm font-semibold text-primary-on-container dark:text-white">{vehicle.engineLabel}</p>
            </div>
            <div>
              <p className="font-label text-[10px] uppercase tracking-[0.16em] text-primary/70 dark:text-white/40">Gearbox</p>
              <p className="mt-1 font-headline text-sm font-semibold text-primary-on-container dark:text-white">{vehicle.transmissionLabel}</p>
            </div>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              onClick={startProductAuthorityPractice}
              disabled={isStartingPractice}
              className="rounded-full bg-primary px-4 py-2.5 font-headline text-xs font-bold uppercase tracking-[0.14em] text-on-primary-fixed shadow-[0_18px_36px_rgba(74,158,255,0.22)] transition-all hover:bg-primary/90 disabled:cursor-wait disabled:opacity-70"
            >
              {isStartingPractice ? 'Starting...' : 'Start Practice'}
            </button>
          </div>
        </div>
      </article>
    );
  }

  const queryTerms = searchQuery
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1);

  const visibleVehicles = vehicles.filter((vehicle) => {
    const matchesFilter =
      activeFilter === 'all' ||
      (activeFilter === 'NEXA' && vehicle.network === 'NEXA') ||
      (activeFilter === 'Arena' && vehicle.network === 'Arena') ||
      (activeFilter === 'automatic' && isAutomaticVehicle(vehicle)) ||
      (activeFilter === 'family' && isFamilyReadyVehicle(vehicle));

    if (!matchesFilter) {
      return false;
    }

    if (queryTerms.length === 0) {
      return true;
    }

    const haystack = [
      vehicle.modelName,
      vehicle.variantName,
      vehicle.network,
      vehicle.bodyStyle,
      vehicle.editionLabel,
      vehicle.brochureTitle,
      ...(vehicle.tags || []),
    ]
      .join(' ')
      .toLowerCase();

    return queryTerms.some((term) => haystack.includes(term));
  });

  const featuredVehicle =
    visibleVehicles.find((vehicle) => vehicle.isFeatured) ||
    visibleVehicles.find((vehicle) => vehicle.id === 'fronx') ||
    visibleVehicles[0] ||
    null;
  const secondaryVehicles = visibleVehicles.filter((vehicle) => vehicle.id !== featuredVehicle?.id);

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

        {practiceError && (
          <p className="rounded-2xl border border-rose-400/25 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-100">
            {practiceError}
          </p>
        )}

        {contentNotice && (
          <p className="rounded-2xl border border-black/5 dark:border-white/10 bg-black/5 dark:bg-white/[0.04] px-4 py-3 text-sm text-on-surface-variant">
            {contentNotice}
          </p>
        )}

        {loadError && (
          <p className="rounded-2xl border border-rose-400/25 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-100">
            {loadError}
          </p>
        )}

        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline material-symbols-outlined text-xl">search</span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => setSearchQuery(event.target.value)}
            placeholder="Search Maruti variants, networks, and body styles..."
            className="w-full bg-surface-container-low border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-2xl py-4 pl-12 pr-4 font-body text-on-surface placeholder:text-outline/50 transition-all"
          />
        </div>
      </section>

      <nav className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
        {catalogFilters.map((filter) => {
          const isActive = activeFilter === filter;
          const label =
            filter === 'all'
              ? 'All Models'
              : filter === 'automatic'
                ? 'Automatic'
                : filter === 'family'
                  ? 'Family Ready'
                  : filter;

          return (
            <button
              key={filter}
              type="button"
              onClick={() => setActiveFilter(filter)}
              className={
                isActive
                  ? 'px-6 py-2.5 rounded-full bg-gradient-to-r from-[#007aff] to-[#00aaff] text-white font-medium text-sm whitespace-nowrap shadow-[0_8px_16px_rgba(0,122,255,0.25)] dark:from-secondary-container dark:to-secondary dark:text-on-secondary-fixed dark:shadow-[0_0_15px_rgba(227,194,133,0.3)]'
                  : 'px-6 py-2.5 rounded-full bg-white dark:bg-surface-container-high text-on-surface-variant hover:text-on-surface font-medium text-sm whitespace-nowrap transition-colors border border-black/5 dark:border-outline-variant/10 shadow-sm'
              }
            >
              {label}
            </button>
          );
        })}
      </nav>

      {isLoadingVehicles ? (
        <section className="rounded-[26pt] border border-black/5 dark:border-white/10 bg-surface-container p-6 text-sm text-on-surface-variant">
          Loading product lineup...
        </section>
      ) : featuredVehicle ? (
        <>
          <section>{renderVehicleCard(featuredVehicle, { featured: true })}</section>

          {secondaryVehicles.length > 0 && (
            <section className="grid grid-cols-1 gap-4 md:grid-cols-2">
              {secondaryVehicles.map((vehicle) => renderVehicleCard(vehicle))}
            </section>
          )}
        </>
      ) : loadError ? (
        <section className="rounded-[26pt] border border-rose-400/25 bg-rose-50/90 p-6 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-100">
          Catalog data could not be loaded. Please try again in a moment.
        </section>
      ) : (
        <section className="rounded-[26pt] border border-black/5 dark:border-white/10 bg-surface-container p-6 text-sm text-on-surface-variant">
          No vehicles match this search yet.
        </section>
      )}
    </main>
  );
}

function isAutomaticVehicle(vehicle: CatalogVehicle) {
  return /(at|ags|amt|cvt)/i.test(vehicle.transmissionLabel);
}

function isFamilyReadyVehicle(vehicle: CatalogVehicle) {
  const familyBodyStyles = new Set(['suv', 'mpv', '3-row uv']);
  if (familyBodyStyles.has(vehicle.bodyStyle.toLowerCase())) {
    return true;
  }

  if (vehicle.editionLabel.toLowerCase().includes('family')) {
    return true;
  }

  return (vehicle.tags || []).some((tag) => tag.toLowerCase().includes('family'));
}
