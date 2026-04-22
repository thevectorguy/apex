import {
  getCollectionItems,
  getContentNotice,
  getContentSource,
  requestContentJson,
  type LoadedContent,
} from './contentApi';
import type { CatalogNetwork, CatalogVehicle } from './contentTypes';

type RawCatalogVehicle = Record<string, unknown> & {
  id?: string;
  modelName?: string;
  variantName?: string;
  priceLabel?: string;
  fuelLabel?: string;
  engineLabel?: string;
  transmissionLabel?: string;
  bodyStyle?: string;
  network?: string;
  editionLabel?: string;
  brochureTitle?: string;
  image?: string;
  inventoryStatus?: string;
  isAssigned?: boolean;
  isFeatured?: boolean;
  tags?: string[];
  name?: string;
  variant?: string;
  price?: string;
  fuelType?: string;
  engine?: string;
  transmission?: string;
  status?: string;
  assigned?: boolean;
  featured?: boolean;
};

const API_BASE = '/api/catalog';

export async function listCatalogVehicles(options?: { signal?: AbortSignal }): Promise<LoadedContent<CatalogVehicle>> {
  const payload = await requestContentJson<unknown>(`${API_BASE}/vehicles`, options?.signal);
  return {
    items: getCollectionItems<RawCatalogVehicle>(payload, ['vehicles', 'items', 'data']).map(normalizeCatalogVehicle),
    source: getContentSource(payload),
    notice: getContentNotice(payload),
  };
}

export function normalizeCatalogVehicle(vehicle: RawCatalogVehicle): CatalogVehicle {
  const modelName = readString(vehicle.modelName) || readString(vehicle.name) || 'Vehicle';
  const variantName = readString(vehicle.variantName) || readString(vehicle.variant);

  return {
    id: readString(vehicle.id) || slugify(`${modelName}-${variantName}`),
    modelName,
    variantName,
    priceLabel: readString(vehicle.priceLabel) || readString(vehicle.price) || 'Price on request',
    fuelLabel: readString(vehicle.fuelLabel) || readString(vehicle.fuelType) || 'Fuel details pending',
    engineLabel: readString(vehicle.engineLabel) || readString(vehicle.engine) || 'Engine details pending',
    transmissionLabel: readString(vehicle.transmissionLabel) || readString(vehicle.transmission) || 'Transmission pending',
    bodyStyle: readString(vehicle.bodyStyle) || 'Showroom lineup',
    network: normalizeNetwork(vehicle.network),
    editionLabel: readString(vehicle.editionLabel) || modelName,
    brochureTitle: readString(vehicle.brochureTitle) || `${modelName} ${variantName}`.trim(),
    image: readString(vehicle.image) || '/images/inventory/fronx.png',
    inventoryStatus: readString(vehicle.inventoryStatus) || readString(vehicle.status) || 'Available',
    isAssigned: Boolean(vehicle.isAssigned ?? vehicle.assigned),
    isFeatured: Boolean(vehicle.isFeatured ?? vehicle.featured),
    tags: ensureStringArray(vehicle.tags),
  };
}

function normalizeNetwork(value: unknown): CatalogNetwork {
  return readString(value).toUpperCase() === 'ARENA' ? 'Arena' : 'NEXA';
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}

function ensureStringArray(value: unknown) {
  return Array.isArray(value) ? value.map((item) => String(item)).filter(Boolean) : [];
}

function slugify(value: string) {
  return value
    .toLowerCase()
    .replace(/[^a-z0-9]+/g, '-')
    .replace(/^-+|-+$/g, '');
}
