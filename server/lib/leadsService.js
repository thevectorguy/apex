import crypto from 'node:crypto';
import { z } from 'zod';
import { getBrochureById, getVehicleById } from './contentService.js';
import { getLeadSeeds } from './leadSeeds.js';
import { ensureMongoReady, getAppCollectionNames } from './mongo.js';
import { isMongoConfigured } from './myCoachConfig.js';

const COLLECTIONS = getAppCollectionNames();
const FALLBACK_SOURCE = 'fallback';
const LEAD_PRIORITIES = ['hot', 'new', 'follow-up', 'warm', 'open'];
const LEAD_STATUSES = ['new', 'open', 'contacted', 'qualified', 'won', 'lost'];
const LEAD_STAGES = ['brochure-share', 'walkaround', 'follow-up', 'finance', 'delivery'];

const nullableEmailSchema = z.union([z.string().trim().email().max(160), z.literal(''), z.undefined()]).transform(normalizeNullableString);
const nullablePhoneSchema = z.union([z.string().trim().max(40), z.literal(''), z.undefined()]).transform(normalizeNullableString);
const nullableTextSchema = (maxLength) =>
  z.union([z.string().trim().max(maxLength), z.literal(''), z.undefined()]).transform(normalizeNullableString);

const leadWriteSchema = z.object({
  name: z.string().trim().min(1).max(120),
  email: nullableEmailSchema,
  phone: nullablePhoneSchema,
  note: nullableTextSchema(2000),
  status: z.enum(LEAD_STATUSES).optional(),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  stage: z.enum(LEAD_STAGES).optional(),
  vehicleId: nullableTextSchema(80),
  vehicleLabel: nullableTextSchema(200),
  brochureId: nullableTextSchema(80),
  brochureName: nullableTextSchema(200),
  assignedTo: nullableTextSchema(120),
  metadata: z.record(z.any()).optional(),
});

const leadPatchSchema = leadWriteSchema.partial().refine((value) => Object.keys(value).length > 0, {
  message: 'At least one field must be provided.',
});

const brochureShareSchema = z.object({
  brochureId: z.string().trim().min(1).max(80),
  name: z.string().trim().min(1).max(120),
  email: nullableEmailSchema,
  phone: nullablePhoneSchema,
  note: nullableTextSchema(2000),
  priority: z.enum(LEAD_PRIORITIES).optional(),
  assignedTo: nullableTextSchema(120),
  metadata: z.record(z.any()).optional(),
});

const fallbackLeadStore = new Map(createFallbackLeads().map((lead) => [lead.id, lead]));

export function parseLeadCreatePayload(payload) {
  return leadWriteSchema.parse(payload);
}

export function parseLeadPatchPayload(payload) {
  return leadPatchSchema.parse(payload);
}

export function parseBrochureSharePayload(payload) {
  return brochureShareSchema.parse(payload);
}

export async function listLeads(query = {}) {
  const filters = normalizeLeadFilters(query);
  const result = await readLeads(filters);
  const items = result.items.map((lead) => mapLeadRecord(lead, isFallbackLeadRecord(lead)));
  return {
    items,
    total: result.total,
    filters,
    source: items.some((lead) => lead.source === FALLBACK_SOURCE) ? FALLBACK_SOURCE : null,
  };
}

export async function getLeadById(leadId) {
  if (isMongoConfigured()) {
    const collection = await getLeadsCollection();
    const row = await collection.findOne({ id: String(leadId || '').trim() }, { projection: { _id: 0 } });
    return mapLeadRecord(row, false);
  }

  return mapLeadRecord(fallbackLeadStore.get(String(leadId || '').trim()) || null, true);
}

export async function createLead(payload) {
  const normalized = await buildLeadDraft(payload);

  if (isMongoConfigured()) {
    const collection = await getLeadsCollection();
    await collection.insertOne(normalized);
    return mapLeadRecord(normalized, false);
  }

  const fallbackLead = withFallbackMarker(normalized);
  fallbackLeadStore.set(fallbackLead.id, fallbackLead);
  return mapLeadRecord(fallbackLead, true);
}

export async function updateLead(leadId, patch) {
  const normalizedLeadId = String(leadId || '').trim();

  if (isMongoConfigured()) {
    const collection = await getLeadsCollection();
    const current = await collection.findOne({ id: normalizedLeadId }, { projection: { _id: 0 } });
    if (!current) return null;

    const next = {
      ...current,
      ...sanitizeLeadPatch(patch),
      updatedAt: nowIso(),
    };
    await collection.updateOne({ id: normalizedLeadId }, { $set: next });
    return mapLeadRecord(next, false);
  }

  const current = fallbackLeadStore.get(normalizedLeadId);
  if (!current) return null;

  const next = withFallbackMarker({
    ...current,
    ...sanitizeLeadPatch(patch),
    updatedAt: nowIso(),
  });
  fallbackLeadStore.set(normalizedLeadId, next);
  return mapLeadRecord(next, true);
}

export async function shareBrochure(payload) {
  const brochureResult = await getBrochureById(payload.brochureId);
  const brochure = brochureResult.item;
  if (!brochure) {
    const error = new Error('Brochure not found');
    error.statusCode = 404;
    throw error;
  }

  const shareAt = nowIso();
  const shareEvent = {
    id: crypto.randomUUID(),
    brochureId: brochure.id,
    brochureName: brochure.name,
    vehicleId: brochure.vehicleId || null,
    vehicleLabel: brochure.brochureTitle || brochure.name,
    note: payload.note || null,
    sharedAt: shareAt,
  };

  if (isMongoConfigured()) {
    const collection = await getLeadsCollection();
    const existing = await findLeadByIdentity(collection, payload.email, payload.phone);
    if (existing) {
      const next = {
        ...existing,
        name: payload.name,
        email: payload.email || existing.email || null,
        phone: payload.phone || existing.phone || null,
        note: payload.note || existing.note || null,
        status: existing.status || 'contacted',
        priority: payload.priority || existing.priority || 'new',
        stage: 'brochure-share',
        brochureId: brochure.id,
        brochureName: brochure.name,
        vehicleId: brochure.vehicleId || existing.vehicleId || null,
        vehicleLabel: brochure.brochureTitle || brochure.name,
        assignedTo: payload.assignedTo || existing.assignedTo || null,
        lastActivityAt: shareAt,
        lastActivityLabel: `Brochure shared: ${brochure.modelName}`,
        brochureShares: [...sanitizeArray(existing.brochureShares), shareEvent],
        metadata: sanitizeObject({ ...sanitizeObject(existing.metadata), ...sanitizeObject(payload.metadata) }),
        updatedAt: shareAt,
      };
      await collection.updateOne({ id: existing.id }, { $set: next });
      return {
        lead: mapLeadRecord(next, false),
        handoff: mapHandoffRecord(shareEvent),
        source: null,
      };
    }

    const created = {
      ...(await buildLeadDraft({
        name: payload.name,
        email: payload.email,
        phone: payload.phone,
        note: payload.note,
        status: 'new',
        priority: payload.priority || 'new',
        stage: 'brochure-share',
        vehicleId: brochure.vehicleId,
        vehicleLabel: brochure.brochureTitle || brochure.name,
        brochureId: brochure.id,
        brochureName: brochure.name,
        assignedTo: payload.assignedTo,
        metadata: payload.metadata,
      })),
      lastActivityAt: shareAt,
      lastActivityLabel: `Brochure shared: ${brochure.modelName}`,
      brochureShares: [shareEvent],
    };
    await collection.insertOne(created);

    return {
      lead: mapLeadRecord(created, false),
      handoff: mapHandoffRecord(shareEvent),
      source: null,
    };
  }

  const existingFallback = findFallbackLeadByIdentity(payload.email, payload.phone);
  if (existingFallback) {
    const next = withFallbackMarker({
      ...existingFallback,
      name: payload.name,
      email: payload.email || existingFallback.email || null,
      phone: payload.phone || existingFallback.phone || null,
      note: payload.note || existingFallback.note || null,
      status: existingFallback.status || 'contacted',
      priority: payload.priority || existingFallback.priority || 'new',
      stage: 'brochure-share',
      brochureId: brochure.id,
      brochureName: brochure.name,
      vehicleId: brochure.vehicleId || existingFallback.vehicleId || null,
      vehicleLabel: brochure.brochureTitle || brochure.name,
      assignedTo: payload.assignedTo || existingFallback.assignedTo || null,
      lastActivityAt: shareAt,
      lastActivityLabel: `Brochure shared: ${brochure.modelName}`,
      brochureShares: [...sanitizeArray(existingFallback.brochureShares), shareEvent],
      metadata: sanitizeObject({ ...sanitizeObject(existingFallback.metadata), ...sanitizeObject(payload.metadata) }),
      updatedAt: shareAt,
    });
    fallbackLeadStore.set(next.id, next);
    return {
      lead: mapLeadRecord(next, true),
      handoff: mapHandoffRecord(shareEvent),
      source: FALLBACK_SOURCE,
    };
  }

  const createdFallback = withFallbackMarker({
    ...(await buildLeadDraft({
      name: payload.name,
      email: payload.email,
      phone: payload.phone,
      note: payload.note,
      status: 'new',
      priority: payload.priority || 'new',
      stage: 'brochure-share',
      vehicleId: brochure.vehicleId,
      vehicleLabel: brochure.brochureTitle || brochure.name,
      brochureId: brochure.id,
      brochureName: brochure.name,
      assignedTo: payload.assignedTo,
      metadata: payload.metadata,
    })),
    lastActivityAt: shareAt,
    lastActivityLabel: `Brochure shared: ${brochure.modelName}`,
    brochureShares: [shareEvent],
  });
  fallbackLeadStore.set(createdFallback.id, createdFallback);

  return {
    lead: mapLeadRecord(createdFallback, true),
    handoff: mapHandoffRecord(shareEvent),
    source: FALLBACK_SOURCE,
  };
}

async function readLeads(filters) {
  if (isMongoConfigured()) {
    const collection = await getLeadsCollection();
    const mongoFilters = {};
    if (filters.status) mongoFilters.status = filters.status;
    if (filters.priority) mongoFilters.priority = filters.priority;
    if (filters.vehicleId) mongoFilters.vehicleId = filters.vehicleId;

    const rows = await collection.find(mongoFilters, { projection: { _id: 0 } }).sort({ updatedAt: -1 }).toArray();
    return applySearchAndLimit(rows, filters);
  }

  const rows = [...fallbackLeadStore.values()].filter((lead) => {
    if (filters.status && lead.status !== filters.status) return false;
    if (filters.priority && lead.priority !== filters.priority) return false;
    if (filters.vehicleId && lead.vehicleId !== filters.vehicleId) return false;
    return true;
  });
  return applySearchAndLimit(rows, filters);
}

async function getLeadsCollection() {
  const db = await ensureMongoReady();
  return db.collection(COLLECTIONS.leads);
}

async function findLeadByIdentity(collection, email, phone) {
  const lookup = [];
  if (email) lookup.push({ email });
  if (phone) lookup.push({ phone });
  if (!lookup.length) return null;
  return collection.findOne({ $or: lookup }, { projection: { _id: 0 } });
}

function findFallbackLeadByIdentity(email, phone) {
  for (const lead of fallbackLeadStore.values()) {
    if (email && lead.email === email) return lead;
    if (phone && lead.phone === phone) return lead;
  }
  return null;
}

async function buildLeadDraft(payload) {
  const now = nowIso();
  const vehicleResult = payload.vehicleId ? await getVehicleById(payload.vehicleId) : { item: null };
  const vehicle = vehicleResult.item;
  return {
    id: crypto.randomUUID(),
    name: payload.name,
    email: payload.email || null,
    phone: payload.phone || null,
    note: payload.note || null,
    status: payload.status || 'open',
    priority: payload.priority || 'new',
    stage: payload.stage || 'follow-up',
    vehicleId: payload.vehicleId || vehicle?.id || null,
    vehicleLabel: payload.vehicleLabel || vehicle?.brochureTitle || vehicle?.modelName || null,
    brochureId: payload.brochureId || null,
    brochureName: payload.brochureName || null,
    assignedTo: payload.assignedTo || null,
    lastActivityAt: now,
    lastActivityLabel: payload.note ? 'Lead note captured' : 'Lead created',
    brochureShares: [],
    metadata: sanitizeObject(payload.metadata),
    createdAt: now,
    updatedAt: now,
  };
}

function sanitizeLeadPatch(patch) {
  const next = {};
  if (patch.name !== undefined) next.name = patch.name;
  if (patch.email !== undefined) next.email = patch.email || null;
  if (patch.phone !== undefined) next.phone = patch.phone || null;
  if (patch.note !== undefined) next.note = patch.note || null;
  if (patch.status !== undefined) next.status = patch.status;
  if (patch.priority !== undefined) next.priority = patch.priority;
  if (patch.stage !== undefined) next.stage = patch.stage;
  if (patch.vehicleId !== undefined) next.vehicleId = patch.vehicleId || null;
  if (patch.vehicleLabel !== undefined) next.vehicleLabel = patch.vehicleLabel || null;
  if (patch.brochureId !== undefined) next.brochureId = patch.brochureId || null;
  if (patch.brochureName !== undefined) next.brochureName = patch.brochureName || null;
  if (patch.assignedTo !== undefined) next.assignedTo = patch.assignedTo || null;
  if (patch.metadata !== undefined) next.metadata = sanitizeObject(patch.metadata);
  if (patch.note !== undefined) {
    next.lastActivityAt = nowIso();
    next.lastActivityLabel = patch.note ? 'Lead updated' : 'Lead cleared';
  }
  return next;
}

function mapLeadRecord(row, includeFallbackSource) {
  if (!row) return null;

  const priority = normalizePriority(row.priority);
  const badge = mapPriorityBadge(priority);
  const lead = {
    id: row.id,
    name: row.name || '',
    email: row.email || null,
    phone: row.phone || null,
    note: row.note || null,
    status: row.status || 'open',
    priority,
    stage: row.stage || 'follow-up',
    vehicleId: row.vehicleId || null,
    vehicleLabel: row.vehicleLabel || null,
    brochureId: row.brochureId || null,
    brochureName: row.brochureName || null,
    assignedTo: row.assignedTo || null,
    lastActivityAt: row.lastActivityAt || row.updatedAt || row.createdAt || null,
    lastActivityLabel: row.lastActivityLabel || null,
    badgeLabel: badge.label,
    badgeTone: badge.tone,
    avatarInitials: deriveInitials(row.name),
    brochureShares: sanitizeArray(row.brochureShares).map(mapHandoffRecord),
    metadata: sanitizeObject(row.metadata),
    createdAt: row.createdAt || null,
    updatedAt: row.updatedAt || null,
  };

  if (includeFallbackSource || isFallbackLeadRecord(row)) {
    lead.source = FALLBACK_SOURCE;
  }

  return lead;
}

function mapHandoffRecord(row) {
  if (!row) return null;
  return {
    id: row.id,
    brochureId: row.brochureId || null,
    brochureName: row.brochureName || null,
    vehicleId: row.vehicleId || null,
    vehicleLabel: row.vehicleLabel || null,
    note: row.note || null,
    sharedAt: row.sharedAt || null,
  };
}

function normalizeLeadFilters(query) {
  const limitValue = Number(query.limit);
  return {
    status: normalizeNullableString(query.status),
    priority: normalizeNullableString(query.priority),
    vehicleId: normalizeNullableString(query.vehicleId),
    search: normalizeNullableString(query.search || query.q),
    limit: Number.isFinite(limitValue) && limitValue > 0 ? Math.min(limitValue, 50) : null,
  };
}

function applySearchAndLimit(rows, filters) {
  const search = String(filters.search || '').toLowerCase();
  const sorted = [...rows].sort(compareLeads);
  const filtered = !search
    ? sorted
    : sorted.filter((lead) =>
        [lead.name, lead.email, lead.phone, lead.vehicleLabel, lead.brochureName, lead.note, lead.lastActivityLabel]
          .filter(Boolean)
          .some((value) => String(value).toLowerCase().includes(search)),
      );

  return {
    items: filters.limit ? filtered.slice(0, filters.limit) : filtered,
    total: filtered.length,
  };
}

function compareLeads(left, right) {
  const priorityDelta = priorityRank(left.priority) - priorityRank(right.priority);
  if (priorityDelta !== 0) return priorityDelta;
  return String(right.updatedAt || '').localeCompare(String(left.updatedAt || ''));
}

function priorityRank(priority) {
  const index = LEAD_PRIORITIES.indexOf(normalizePriority(priority));
  return index === -1 ? LEAD_PRIORITIES.length : index;
}

function normalizePriority(priority) {
  const normalized = String(priority || '').trim().toLowerCase();
  return LEAD_PRIORITIES.includes(normalized) ? normalized : 'open';
}

function mapPriorityBadge(priority) {
  switch (priority) {
    case 'hot':
      return { label: 'Hot', tone: 'hot' };
    case 'new':
      return { label: 'New', tone: 'new' };
    case 'follow-up':
      return { label: 'Follow-up', tone: 'follow-up' };
    default:
      return { label: 'Open', tone: 'open' };
  }
}

function deriveInitials(name) {
  return String(name || '')
    .trim()
    .split(/\s+/)
    .filter(Boolean)
    .slice(0, 2)
    .map((part) => part[0]?.toUpperCase() || '')
    .join('');
}

function createFallbackLeads() {
  return getLeadSeeds().map((row) => withFallbackMarker(row));
}

function withFallbackMarker(row) {
  return {
    ...row,
    __fallback: true,
  };
}

function isFallbackLeadRecord(row) {
  return Boolean(row && row.__fallback);
}

function sanitizeObject(value) {
  return value && typeof value === 'object' && !Array.isArray(value) ? value : {};
}

function sanitizeArray(value) {
  return Array.isArray(value) ? value : [];
}

function normalizeNullableString(value) {
  const normalized = String(value || '').trim();
  return normalized || null;
}

function nowIso() {
  return new Date().toISOString();
}
