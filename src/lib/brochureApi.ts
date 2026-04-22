import {
  getCollectionItems,
  getContentNotice,
  getContentSource,
  requestContentJson,
  type LoadedContent,
} from './contentApi';
import type { BrochureAsset, CatalogNetwork } from './contentTypes';

type RawBrochure = Record<string, unknown> & {
  id?: string;
  vehicleId?: string;
  name?: string;
  type?: string;
  format?: string;
  freshness?: string;
  action?: string;
  audience?: string;
  image?: string;
  theme?: string;
  fileUrl?: string | null;
  network?: string;
};

const API_BASE = '/api/brochures';

export async function listBrochures(options?: { signal?: AbortSignal }): Promise<LoadedContent<BrochureAsset>> {
  const payload = await requestContentJson<unknown>(API_BASE, options?.signal);
  return {
    items: getCollectionItems<RawBrochure>(payload, ['brochures', 'items', 'data']).map(normalizeBrochure),
    source: getContentSource(payload),
    notice: getContentNotice(payload),
  };
}

function normalizeBrochure(brochure: RawBrochure): BrochureAsset {
  const name = readString(brochure.name) || 'Showroom brochure';
  const id = readString(brochure.id) || slugify(name);

  return {
    id,
    vehicleId: readString(brochure.vehicleId) || id,
    name,
    type: readString(brochure.type) || 'Product brochure',
    format: readString(brochure.format) || 'PDF',
    freshness: readString(brochure.freshness) || 'Latest version',
    action: readString(brochure.action) || 'Showroom follow-up',
    audience: readString(brochure.audience) || 'Interested shoppers',
    image: readString(brochure.image) || '/images/inventory/fronx.png',
    theme: normalizeTheme(brochure.theme ?? brochure.network),
    fileUrl: readNullableString(brochure.fileUrl),
  };
}

function normalizeTheme(value: unknown): CatalogNetwork {
  return readString(value).toUpperCase() === 'ARENA' ? 'Arena' : 'NEXA';
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function readNullableString(value: unknown) {
  const normalized = readString(value);
  return normalized || null;
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
