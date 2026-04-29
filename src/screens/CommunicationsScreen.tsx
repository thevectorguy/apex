import { useEffect, useState } from 'react';
import { Screen } from '../types';
import { isAbortError } from '../lib/contentApi';
import { listAnnouncements } from '../lib/communicationsApi';
import type { Announcement, AnnouncementSegment } from '../lib/contentTypes';

type AnnouncementFilter = 'all' | AnnouncementSegment;

const filterLabels: Record<AnnouncementFilter, string> = {
  all: 'All Updates',
  priority: 'Priority',
  training: 'Training',
  policy: 'Policy',
};

const aiSearches: Array<{
  id: string;
  label: string;
  filter: AnnouncementFilter;
  keywords: string[];
}> = [
  {
    id: 'urgent',
    label: 'Urgent Notices',
    filter: 'priority',
    keywords: ['urgent', 'priority', 'action', 'sign-off', 'availability'],
  },
  {
    id: 'training',
    label: 'Training Items',
    filter: 'training',
    keywords: ['training', 'module', 'coaching', 'practice', 'masterclass'],
  },
  {
    id: 'policy',
    label: 'Policy Changes',
    filter: 'policy',
    keywords: ['policy', 'compliance', 'consent', 'audit', 'disclosure'],
  },
  {
    id: 'pricing',
    label: 'Pricing Updates',
    filter: 'policy',
    keywords: ['pricing', 'finance', 'emi', 'rates', 'matrix'],
  },
];

function AISearchGlyph({ className = 'h-5 w-5' }: { className?: string }) {
  return (
    <svg viewBox="0 0 24 24" className={className} fill="currentColor" aria-hidden="true">
      <path d="M12 2C11.18 7.18 7.18 11.18 2 12c5.18.82 9.18 4.82 10 10 .82-5.18 4.82-9.18 10-10-5.18-.82-9.18-4.82-10-10Z" />
    </svg>
  );
}

export function CommunicationsScreen({ onNavigate: _onNavigate }: { onNavigate: (s: Screen) => void }) {
  const [announcements, setAnnouncements] = useState<Announcement[]>([]);
  const [isLoadingAnnouncements, setIsLoadingAnnouncements] = useState(true);
  const [contentNotice, setContentNotice] = useState<string | null>(null);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [activeFilter, setActiveFilter] = useState<AnnouncementFilter>('all');
  const [activeSearchId, setActiveSearchId] = useState<string | null>(null);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const controller = new AbortController();

    void listAnnouncements({ signal: controller.signal })
      .then((result) => {
        setAnnouncements(result.items);
        setContentNotice(result.notice || null);
        setLoadError(null);
      })
      .catch((error) => {
        if (isAbortError(error)) {
          return;
        }
        setLoadError(error instanceof Error ? error.message : 'Unable to load announcements right now.');
      })
      .finally(() => {
        setIsLoadingAnnouncements(false);
      });

    return () => {
      controller.abort();
    };
  }, []);

  const activeSearch = aiSearches.find((item) => item.id === activeSearchId) ?? null;
  const queryTerms = searchQuery
    .toLowerCase()
    .split(/[^a-z0-9]+/)
    .filter((term) => term.length > 1);

  const visibleAnnouncements = announcements.filter((announcement) => {
    const matchesFilter = activeFilter === 'all' || announcement.segments.includes(activeFilter);
    if (!matchesFilter) {
      return false;
    }

    const searchTerms = activeSearch ? activeSearch.keywords : [];
    const combinedTerms = [...queryTerms, ...searchTerms];

    if (combinedTerms.length === 0) {
      return true;
    }

    const haystack = [
      announcement.title,
      announcement.category,
      announcement.summary,
      announcement.audience,
      ...announcement.segments,
      ...announcement.searchTerms,
    ]
      .join(' ')
      .toLowerCase();

    return combinedTerms.some((term) => haystack.includes(term));
  });

  const featuredAnnouncement = visibleAnnouncements[0];
  const secondaryAnnouncements = visibleAnnouncements.slice(1);

  const counts = {
    all: announcements.length,
    priority: announcements.filter((announcement) => announcement.segments.includes('priority')).length,
    training: announcements.filter((announcement) => announcement.segments.includes('training')).length,
    policy: announcements.filter((announcement) => announcement.segments.includes('policy')).length,
  } satisfies Record<AnnouncementFilter, number>;

  const handleFilterChange = (filter: AnnouncementFilter) => {
    setActiveFilter(filter);
  };

  const handleSearchSuggestion = (id: string) => {
    const selectedSearch = aiSearches.find((item) => item.id === id);
    if (!selectedSearch) {
      return;
    }

    const isSameSearch = activeSearchId === id;

    setActiveSearchId(isSameSearch ? null : selectedSearch.id);
    setActiveFilter(isSameSearch ? 'all' : selectedSearch.filter);
    setSearchQuery(isSameSearch ? '' : selectedSearch.label);
  };

  const resultsHeading =
    queryTerms.length > 0 || activeSearch
      ? 'AI Search Results'
      : activeFilter === 'all'
        ? 'More Updates'
        : `${filterLabels[activeFilter]}`;

  return (
    <main className="pt-24 pb-32 px-6 max-w-5xl mx-auto space-y-8">
      <section className="space-y-5">
        <div>
          <span className="announcements-label text-secondary text-xs uppercase mb-1 block">Communications</span>
          <h1 className="announcements-headline text-5xl font-semibold tracking-tight text-on-surface">Announcements</h1>
        </div>

        <p className="announcements-copy text-on-surface-variant text-lg max-w-2xl">
          Latest announcements, updates, and notices from Communications.
        </p>

        {contentNotice && (
          <div className="rounded-2xl border border-white/10 bg-white/[0.04] px-4 py-3 text-sm text-on-surface-variant">
            {contentNotice}
          </div>
        )}

        {loadError && (
          <div className="rounded-2xl border border-rose-400/25 bg-rose-50/90 px-4 py-3 text-sm text-rose-700 dark:bg-rose-400/10 dark:text-rose-100">
            {loadError}
          </div>
        )}

        <div className="relative group">
          <span className="absolute left-4 top-1/2 -translate-y-1/2 text-outline">
            <AISearchGlyph className="h-5 w-5" />
          </span>
          <input
            type="text"
            value={searchQuery}
            onChange={(event) => {
              setSearchQuery(event.target.value);
              setActiveSearchId(null);
            }}
            placeholder="Search announcements with AI..."
            className="w-full bg-surface-container-low border-none border-b-2 border-transparent focus:border-primary focus:ring-0 rounded-xl py-4 pl-12 pr-4 announcements-copy text-on-surface placeholder:text-outline/50 transition-all"
          />
        </div>

        <nav className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {(Object.keys(filterLabels) as AnnouncementFilter[]).map((filter) => {
            const isActive = activeFilter === filter;

            return (
              <button
                key={filter}
                type="button"
                onClick={() => handleFilterChange(filter)}
                className={
                  isActive
                    ? 'px-6 py-2.5 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-fixed announcements-copy font-medium text-sm whitespace-nowrap shadow-[0_0_15px_rgba(227,194,133,0.3)]'
                    : 'px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface announcements-copy font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10'
                }
              >
                {filterLabels[filter]}
              </button>
            );
          })}
        </nav>

        <div className="flex gap-3 overflow-x-auto hide-scrollbar pb-2">
          {aiSearches.map((search) => {
            const isActive = activeSearchId === search.id;

            return (
              <button
                key={search.id}
                type="button"
                onClick={() => handleSearchSuggestion(search.id)}
                className={
                  isActive
                    ? 'inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-gradient-to-r from-secondary-container to-secondary text-on-secondary-fixed announcements-copy font-medium text-sm whitespace-nowrap shadow-[0_0_15px_rgba(227,194,133,0.3)]'
                    : 'inline-flex items-center gap-2 px-6 py-2.5 rounded-full bg-surface-container-high text-on-surface-variant hover:text-on-surface announcements-copy font-medium text-sm whitespace-nowrap transition-colors border border-outline-variant/10'
                }
              >
                <AISearchGlyph className="h-4 w-4" />
                <span>{search.label}</span>
              </button>
            );
          })}
        </div>
      </section>

      {featuredAnnouncement ? (
        <>
          <section className="relative overflow-hidden rounded-[24pt] border border-white/5 bg-surface-container shadow-[0_24px_48px_rgba(0,0,0,0.28)]">
            <div className="relative h-60">
              <img src={featuredAnnouncement.image} alt={featuredAnnouncement.title} className="absolute inset-0 h-full w-full object-cover" />
              <div className="absolute inset-0 bg-gradient-to-t from-surface via-black/10 to-transparent"></div>
              {featuredAnnouncement.badgeLabel && (
                <span className={`absolute top-5 left-5 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${featuredAnnouncement.badgeClassName}`}>
                  {featuredAnnouncement.badgeLabel}
                </span>
              )}
            </div>

            <div className="p-6 space-y-4">
              <div className="flex items-start justify-between gap-4">
                <div>
                  <p className="announcements-label text-[11px] uppercase text-secondary">{featuredAnnouncement.category}</p>
                  <h2 className="mt-2 announcements-headline text-3xl font-semibold tracking-tight text-on-surface">{featuredAnnouncement.title}</h2>
                </div>
                <span className="announcements-label text-[11px] uppercase text-on-surface-variant whitespace-nowrap">{featuredAnnouncement.publishedAt}</span>
              </div>

              <p className="announcements-copy text-on-surface-variant text-sm leading-6 max-w-3xl">{featuredAnnouncement.summary}</p>

              <div className="flex flex-wrap gap-2">
                <span className="rounded-full bg-primary/10 px-3 py-1 announcements-label text-[10px] font-bold uppercase text-primary">
                  {featuredAnnouncement.audience}
                </span>
                {(queryTerms.length > 0 || activeSearch) && (
                  <span className="rounded-full bg-surface-container-high px-3 py-1 announcements-label text-[10px] font-bold uppercase text-on-surface-variant">
                    AI Match
                  </span>
                )}
              </div>
            </div>
          </section>

          <section className="space-y-5">
            <div className="flex items-center justify-between">
              <h2 className="announcements-headline text-xl font-semibold tracking-tight text-on-surface">{resultsHeading}</h2>
              <span className="announcements-label text-[11px] uppercase text-on-surface-variant">{visibleAnnouncements.length} results</span>
            </div>

            <div className="grid grid-cols-1 gap-5">
              {secondaryAnnouncements.map((announcement) => (
                <article
                  key={announcement.id}
                  className="group overflow-hidden rounded-[22pt] border border-outline-variant/10 bg-surface-container shadow-[0_18px_36px_rgba(0,0,0,0.22)] transition-colors hover:bg-surface-container-high"
                >
                  <div className="relative h-44">
                    <img src={announcement.image} alt={announcement.title} className="absolute inset-0 h-full w-full object-cover transition-transform duration-500 group-hover:scale-105" />
                    <div className="absolute inset-0 bg-gradient-to-t from-surface via-black/10 to-transparent"></div>
                    {announcement.badgeLabel && (
                      <span className={`absolute top-4 left-4 rounded-full px-3 py-1 text-[10px] font-bold uppercase tracking-[0.18em] ${announcement.badgeClassName}`}>
                        {announcement.badgeLabel}
                      </span>
                    )}
                  </div>

                  <div className="p-5 space-y-4">
                    <div className="flex items-start justify-between gap-3">
                      <div>
                        <p className="announcements-label text-[11px] uppercase text-secondary">{announcement.category}</p>
                        <h3 className="mt-2 announcements-headline text-2xl font-semibold tracking-tight text-on-surface">{announcement.title}</h3>
                      </div>
                      <span className="announcements-label text-[11px] uppercase text-on-surface-variant whitespace-nowrap">{announcement.publishedAt}</span>
                    </div>

                    <p className="announcements-copy text-sm leading-6 text-on-surface-variant">{announcement.summary}</p>

                    <div className="flex items-center justify-between gap-3">
                      <span className="rounded-full bg-secondary/10 px-3 py-1 announcements-label text-[10px] font-bold uppercase text-secondary">
                        {announcement.audience}
                      </span>
                      <button className="inline-flex items-center gap-2 rounded-full bg-surface-container-highest px-4 py-2 announcements-label text-[10px] font-bold uppercase text-on-surface-variant transition-colors hover:text-on-surface">
                        Review
                        <span className="material-symbols-outlined text-[14px]">arrow_forward</span>
                      </button>
                    </div>
                  </div>
                </article>
              ))}
            </div>
          </section>
        </>
      ) : isLoadingAnnouncements ? (
        <section className="rounded-[24pt] border border-outline-variant/10 bg-surface-container px-6 py-10 text-center">
          <p className="announcements-headline text-2xl font-semibold text-on-surface">Loading announcements...</p>
        </section>
      ) : loadError ? (
        <section className="rounded-[24pt] border border-rose-400/20 bg-rose-400/10 px-6 py-10 text-center">
          <p className="announcements-headline text-2xl font-semibold text-rose-700 dark:text-rose-100">Announcements could not be loaded</p>
          <p className="mt-2 announcements-copy text-rose-700/80 dark:text-rose-100/80">Please try again in a moment.</p>
        </section>
      ) : (
        <section className="rounded-[24pt] border border-outline-variant/10 bg-surface-container px-6 py-10 text-center">
          <p className="announcements-headline text-2xl font-semibold text-on-surface">No announcements found</p>
          <p className="mt-2 announcements-copy text-on-surface-variant">Try another AI search or switch back to a broader update filter.</p>
        </section>
      )}
    </main>
  );
}
