import {
  getCollectionItems,
  getContentNotice,
  getContentSource,
  getRecord,
  requestContentJsonWithInit,
  type LoadedContent,
  type LoadedContentItem,
} from './contentApi';
import type { LeadPriorityTone, LeadSummary } from './contentTypes';

type RawLead = Record<string, unknown> & {
  id?: string;
  leadId?: string;
  customerName?: string;
  name?: string;
  email?: string;
  phone?: string;
  brochureId?: string;
  brochureName?: string;
  vehicleId?: string;
  vehicleLabel?: string;
  note?: string;
  notes?: string;
  status?: string;
  priority?: string;
  priorityLabel?: string;
  createdAt?: string;
  updatedAt?: string;
};

type BrochureShareInput = {
  brochureId: string;
  brochureName: string;
  vehicleId?: string | null;
  vehicleLabel?: string | null;
  customerName: string;
  email: string;
  phone?: string;
  note?: string;
};

export type BrochureShareReceipt = {
  lead: LeadSummary;
  statusLabel: string;
};

export type LoadedLeads = LoadedContent<LeadSummary> & {
  notice?: string | null;
};

export type BrochureShareResult = LoadedContentItem<BrochureShareReceipt>;

const LEADS_API_BASE = '/api/leads';
const BROCHURE_SHARE_API = '/api/brochures/share';

export async function listLeads(options?: { signal?: AbortSignal }): Promise<LoadedLeads> {
  const payload = await requestContentJsonWithInit<unknown>(LEADS_API_BASE, {
    signal: options?.signal,
  });

  return {
    items: getCollectionItems<RawLead>(payload, ['leads', 'items', 'data']).map(normalizeLead),
    source: getContentSource(payload),
    notice: getContentNotice(payload),
  };
}

export async function shareBrochure(input: BrochureShareInput, signal?: AbortSignal): Promise<BrochureShareResult> {
  const payload = await requestContentJsonWithInit<unknown>(BROCHURE_SHARE_API, {
    method: 'POST',
    body: JSON.stringify({
      brochureId: input.brochureId,
      brochureName: input.brochureName,
      vehicleId: input.vehicleId ?? null,
      vehicleLabel: input.vehicleLabel ?? null,
      name: input.customerName,
      email: input.email,
      phone: input.phone?.trim() || '',
      note: input.note?.trim() || '',
    }),
    signal,
  });

  const leadRecord =
    getRecord(payload, ['lead', 'item', 'data']) ??
    getRecord(getRecord(payload, ['result', 'payload']), ['lead', 'item', 'data']) ??
    null;

  const lead = normalizeLead({
    ...leadRecord,
    customerName: readString(leadRecord?.customerName) || input.customerName,
    email: readString(leadRecord?.email) || input.email,
    phone: readString(leadRecord?.phone) || input.phone,
    brochureId: readString(leadRecord?.brochureId) || input.brochureId,
    brochureName: readString(leadRecord?.brochureName) || input.brochureName,
    vehicleId: readString(leadRecord?.vehicleId) || input.vehicleId,
    vehicleLabel: readString(leadRecord?.vehicleLabel) || input.vehicleLabel,
    note: readString(leadRecord?.note) || input.note,
  });

  return {
    item: {
      lead,
      statusLabel: readString(getRecord(payload, ['result', 'meta'])?.statusLabel) || readString((payload as Record<string, unknown>)?.statusLabel) || 'Brochure queued',
    },
    source: getContentSource(payload),
    notice: getContentNotice(payload),
  };
}

export function normalizeLead(lead: RawLead): LeadSummary {
  const customerName = readString(lead.customerName) || readString(lead.name) || 'Showroom lead';
  const priorityLabel = normalizePriorityLabel(readString(lead.priorityLabel) || readString(lead.priority));

  return {
    id: readString(lead.id) || readString(lead.leadId) || slugify(customerName),
    customerName,
    email: readNullableString(lead.email),
    phone: readNullableString(lead.phone),
    brochureId: readNullableString(lead.brochureId),
    brochureName: readNullableString(lead.brochureName),
    vehicleId: readNullableString(lead.vehicleId),
    vehicleLabel: readNullableString(lead.vehicleLabel),
    note: readNullableString(lead.note) || readNullableString(lead.notes),
    status: readString(lead.status) || 'open',
    priorityLabel,
    priorityTone: normalizePriorityTone(priorityLabel),
    initials: getInitials(customerName),
    createdAt: readNullableString(lead.createdAt),
    updatedAt: readNullableString(lead.updatedAt),
  };
}

function normalizePriorityLabel(value: string) {
  if (!value) return 'Active';

  const normalized = value.trim().toLowerCase();
  if (normalized === 'hot') return 'Hot';
  if (normalized === 'new') return 'New';
  if (normalized === 'follow-up' || normalized === 'follow up') return 'Follow-up';
  if (normalized === 'warm') return 'Warm';
  return value.trim();
}

function normalizePriorityTone(value: string): LeadPriorityTone {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'hot') return 'hot';
  if (normalized === 'new') return 'new';
  if (normalized === 'follow-up' || normalized === 'follow up') return 'follow-up';
  return 'default';
}

function getInitials(name: string) {
  const parts = name
    .split(/\s+/)
    .map((part) => part.trim())
    .filter(Boolean)
    .slice(0, 2);

  return parts.map((part) => part.charAt(0).toUpperCase()).join('') || 'LD';
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
