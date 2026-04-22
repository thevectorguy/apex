import {
  getCollectionItems,
  getContentNotice,
  getContentSource,
  requestContentJson,
  type LoadedContent,
} from './contentApi';
import type { Announcement, AnnouncementSegment } from './contentTypes';

type RawAnnouncement = Record<string, unknown> & {
  id?: string;
  title?: string;
  category?: string;
  summary?: string;
  image?: string;
  publishedAt?: string;
  audience?: string;
  segments?: string[] | string;
  searchTerms?: string[] | string;
  badgeLabel?: string;
  badgeClassName?: string;
};

const API_BASE = '/api/communications';

export async function listAnnouncements(options?: { signal?: AbortSignal }): Promise<LoadedContent<Announcement>> {
  const payload = await requestContentJson<unknown>(`${API_BASE}/announcements`, options?.signal);
  return {
    items: getCollectionItems<RawAnnouncement>(payload, ['announcements', 'items', 'data']).map(normalizeAnnouncement),
    source: getContentSource(payload),
    notice: getContentNotice(payload),
  };
}

export function normalizeAnnouncement(announcement: RawAnnouncement): Announcement {
  const title = readString(announcement.title) || 'Announcement';

  return {
    id: readString(announcement.id) || slugify(title),
    title,
    category: readString(announcement.category) || 'Communications',
    summary: readString(announcement.summary) || 'Latest showroom update.',
    image: readString(announcement.image) || '/images/inventory/fronx.png',
    publishedAt: readString(announcement.publishedAt) || 'Recently',
    audience: readString(announcement.audience) || 'All showrooms',
    segments: ensureSegments(announcement.segments),
    searchTerms: ensureStringArray(announcement.searchTerms),
    badgeLabel: readOptionalString(announcement.badgeLabel),
    badgeClassName: readOptionalString(announcement.badgeClassName),
  };
}

function ensureSegments(value: unknown): AnnouncementSegment[] {
  const values = ensureStringArray(value);
  return values.filter(isAnnouncementSegment);
}

function isAnnouncementSegment(value: string): value is AnnouncementSegment {
  return value === 'priority' || value === 'training' || value === 'policy';
}

function ensureStringArray(value: unknown) {
  if (Array.isArray(value)) {
    return value.map((item) => String(item).trim()).filter(Boolean);
  }

  if (typeof value === 'string' && value.trim()) {
    return value
      .split(',')
      .map((item) => item.trim())
      .filter(Boolean);
  }

  return [];
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readOptionalString(value: unknown) {
  const normalized = readString(value);
  return normalized || undefined;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
