import { getContentSeeds } from './contentSeeds.js';
import { ensureMongoReady, getAppCollectionNames } from './mongo.js';
import { isMongoConfigured } from './myCoachConfig.js';

const COLLECTIONS = getAppCollectionNames();
const CONTENT_DATA = getContentSeeds();
const FALLBACK_NOTICE = 'Using seeded content while MongoDB content sync is unavailable.';

const VEHICLE_ORDER = buildOrderMap(CONTENT_DATA.vehicles);
const BROCHURE_ORDER = buildOrderMap(CONTENT_DATA.brochures);
const ANNOUNCEMENT_ORDER = buildOrderMap(CONTENT_DATA.announcements);

export async function listVehicles(query = {}) {
  const result = await readCollectionItems(COLLECTIONS.vehicles, CONTENT_DATA.vehicles);
  return {
    items: result.items.filter(createVehicleFilter(query)).sort(createSeedOrderSorter(VEHICLE_ORDER)),
    source: result.source,
    notice: result.notice,
  };
}

export async function getVehicleById(vehicleId) {
  const normalizedId = normalizeToken(vehicleId);
  if (!normalizedId) {
    return { item: null, source: 'api', notice: null };
  }

  const result = await readCollectionItems(COLLECTIONS.vehicles, CONTENT_DATA.vehicles);
  return {
    item: result.items.find((vehicle) => normalizeToken(vehicle.id) === normalizedId) || null,
    source: result.source,
    notice: result.notice,
  };
}

export async function listBrochures(query = {}) {
  const result = await readCollectionItems(COLLECTIONS.brochures, CONTENT_DATA.brochures);
  return {
    items: result.items.filter(createBrochureFilter(query)).sort(createSeedOrderSorter(BROCHURE_ORDER)),
    source: result.source,
    notice: result.notice,
  };
}

export async function getBrochureById(brochureId) {
  const normalizedId = normalizeToken(brochureId);
  if (!normalizedId) {
    return { item: null, source: 'api', notice: null };
  }

  const result = await readCollectionItems(COLLECTIONS.brochures, CONTENT_DATA.brochures);
  return {
    item: result.items.find((brochure) => normalizeToken(brochure.id) === normalizedId) || null,
    source: result.source,
    notice: result.notice,
  };
}

export async function listAnnouncements(query = {}) {
  const result = await readCollectionItems(COLLECTIONS.announcements, CONTENT_DATA.announcements);
  return {
    items: result.items.filter(createAnnouncementFilter(query)).sort(createSeedOrderSorter(ANNOUNCEMENT_ORDER)),
    source: result.source,
    notice: result.notice,
  };
}

export async function getAnnouncementById(announcementId) {
  const normalizedId = normalizeToken(announcementId);
  if (!normalizedId) {
    return { item: null, source: 'api', notice: null };
  }

  const result = await readCollectionItems(COLLECTIONS.announcements, CONTENT_DATA.announcements);
  return {
    item: result.items.find((announcement) => normalizeToken(announcement.id) === normalizedId) || null,
    source: result.source,
    notice: result.notice,
  };
}

async function readCollectionItems(collectionName, fallbackItems) {
  if (!isMongoConfigured()) {
    return {
      items: fallbackItems.map(cloneRecord),
      source: 'fallback',
      notice: FALLBACK_NOTICE,
    };
  }

  try {
    const db = await ensureMongoReady();
    const items = await db.collection(collectionName).find({}, { projection: { _id: 0 } }).toArray();
    return {
      items: items.map(cloneRecord),
      source: 'api',
      notice: null,
    };
  } catch (error) {
    console.error(`[content] failed to read ${collectionName} from Mongo`, error);
    return {
      items: fallbackItems.map(cloneRecord),
      source: 'fallback',
      notice: FALLBACK_NOTICE,
    };
  }
}

function createVehicleFilter(query) {
  const network = normalizeToken(query.network);
  const bodyStyle = normalizeToken(query.bodyStyle);
  const inventoryStatus = normalizeToken(query.inventoryStatus);
  const search = normalizeSearch(query.search || query.q);

  return (vehicle) => {
    if (network && normalizeToken(vehicle.network) !== network) return false;
    if (bodyStyle && normalizeToken(vehicle.bodyStyle) !== bodyStyle) return false;
    if (inventoryStatus && normalizeToken(vehicle.inventoryStatus) !== inventoryStatus) return false;
    if (!search) return true;
    return matchesSearch(search, [
      vehicle.id,
      vehicle.modelName,
      vehicle.variantName,
      vehicle.priceLabel,
      vehicle.fuelLabel,
      vehicle.engineLabel,
      vehicle.transmissionLabel,
      vehicle.bodyStyle,
      vehicle.network,
      vehicle.editionLabel,
      vehicle.brochureTitle,
      vehicle.inventoryStatus,
      ...(Array.isArray(vehicle.tags) ? vehicle.tags : []),
    ]);
  };
}

function createBrochureFilter(query) {
  const theme = normalizeToken(query.theme);
  const vehicleId = normalizeToken(query.vehicleId);
  const search = normalizeSearch(query.search || query.q);

  return (brochure) => {
    if (theme && normalizeToken(brochure.theme) !== theme) return false;
    if (vehicleId && normalizeToken(brochure.vehicleId) !== vehicleId) return false;
    if (!search) return true;
    return matchesSearch(search, [
      brochure.id,
      brochure.vehicleId,
      brochure.name,
      brochure.type,
      brochure.format,
      brochure.freshness,
      brochure.action,
      brochure.audience,
      brochure.theme,
      brochure.modelName,
      brochure.variantName,
      brochure.brochureTitle,
    ]);
  };
}

function createAnnouncementFilter(query) {
  const segment = normalizeToken(query.segment);
  const search = normalizeSearch(query.search || query.q);

  return (announcement) => {
    const segments = Array.isArray(announcement.segments) ? announcement.segments : [];
    if (segment && !segments.some((value) => normalizeToken(value) === segment)) {
      return false;
    }
    if (!search) return true;
    return matchesSearch(search, [
      announcement.id,
      announcement.title,
      announcement.category,
      announcement.summary,
      announcement.audience,
      announcement.badgeLabel,
      ...segments,
      ...(Array.isArray(announcement.searchTerms) ? announcement.searchTerms : []),
    ]);
  };
}

function createSeedOrderSorter(orderMap) {
  return (left, right) => {
    const leftOrder = orderMap.get(String(left?.id || '')) ?? Number.MAX_SAFE_INTEGER;
    const rightOrder = orderMap.get(String(right?.id || '')) ?? Number.MAX_SAFE_INTEGER;
    if (leftOrder !== rightOrder) {
      return leftOrder - rightOrder;
    }
    return String(left?.id || '').localeCompare(String(right?.id || ''));
  };
}

function buildOrderMap(items) {
  return new Map(items.map((item, index) => [String(item.id || ''), index]));
}

function normalizeToken(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function normalizeSearch(value) {
  return String(value || '')
    .trim()
    .toLowerCase();
}

function matchesSearch(search, values) {
  return values.some((value) => String(value || '').toLowerCase().includes(search));
}

function cloneRecord(record) {
  return JSON.parse(JSON.stringify(record));
}
