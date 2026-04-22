import {
  getCollectionItems,
  getContentNotice,
  getContentSource,
  getRecord,
  requestContentJsonWithInit,
  type LoadedContentItem,
} from './contentApi';
import type {
  Announcement,
  DashboardHome,
  DashboardMetric,
  DashboardMetricKey,
  DashboardSalesPerformance,
  CatalogVehicle,
} from './contentTypes';
import { normalizeAnnouncement } from './communicationsApi';
import { normalizeCatalogVehicle } from './catalogApi';
import { normalizeLead } from './leadsApi';

type RawDashboardMetric = Record<string, unknown> & {
  key?: string;
  id?: string;
  value?: string | number;
  unit?: string;
  detail?: string;
};

type RawSalesPerformance = Record<string, unknown> & {
  valueLabel?: string;
  completedUnits?: string | number;
  remainingUnits?: string | number;
  detail?: string;
  progressPercent?: string | number;
  completionPercent?: string | number;
};

type RawDashboardHome = Record<string, unknown> & {
  greetingName?: string;
  dateLabel?: string;
  shiftLabel?: string;
  announcements?: unknown[];
  assignedVehicles?: unknown[];
  priorityLeads?: unknown[];
  metrics?: unknown[];
  salesPerformance?: RawSalesPerformance;
};

export type DashboardHomeResult = LoadedContentItem<DashboardHome>;

const DASHBOARD_HOME_API = '/api/dashboard/home';

export async function getDashboardHome(options?: { signal?: AbortSignal }): Promise<DashboardHomeResult> {
  const payload = await requestContentJsonWithInit<unknown>(DASHBOARD_HOME_API, {
    signal: options?.signal,
  });
  const root = (getRecord(payload, ['dashboard', 'home', 'data']) ?? payload ?? {}) as RawDashboardHome;

  return {
    item: {
      greetingName: readGreetingName(root),
      dateLabel: readString(root.dateLabel) || 'OCTOBER 24',
      shiftLabel: readString(root.shiftLabel) || '08:30 - 17:00',
      salesPerformance: normalizeSalesPerformance(root.salesPerformance),
      metrics: normalizeMetrics(getCollectionItems<RawDashboardMetric>(root, ['metrics', 'quickActions', 'cards'])),
      announcements: getCollectionItems<Record<string, unknown>>(root, ['announcements', 'latestAnnouncements', 'updates']).map(normalizeAnnouncement),
      assignedVehicles: getCollectionItems<Record<string, unknown>>(root, ['assignedVehicles', 'vehicles']).map(normalizeCatalogVehicle),
      priorityLeads: getCollectionItems<Record<string, unknown>>(root, ['priorityLeads', 'leads']).map(normalizeLead),
    },
    source: getContentSource(payload),
    notice: getContentNotice(payload),
  };
}

function readGreetingName(payload: RawDashboardHome) {
  const direct = readString(payload.greetingName);
  if (direct) return direct;

  const user = getRecord(payload, ['user', 'profile', 'me']);
  return readString(user?.firstName) || readString(user?.name) || 'Arjun';
}

function normalizeSalesPerformance(value: RawSalesPerformance | undefined): DashboardSalesPerformance {
  const progressPercent = clampPercentage(readNumber(value?.progressPercent) ?? readNumber(value?.completionPercent) ?? 60);
  const completedUnits = readNumber(value?.completedUnits) ?? 3;
  const remainingUnits = readNumber(value?.remainingUnits) ?? 2;

  return {
    valueLabel: readString(value?.valueLabel) || `${completedUnits} Units`,
    detail: readString(value?.detail) || `${remainingUnits} remaining for daily goal`,
    progressPercent,
  };
}

function readRecord(value: unknown) {
  return value && typeof value === 'object' && !Array.isArray(value) ? (value as RawSalesPerformance) : undefined;
}

function normalizeMetrics(metrics: RawDashboardMetric[]): DashboardMetric[] {
  if (metrics.length === 0) {
    return [];
  }

  return metrics
    .map((metric) => {
      const key = normalizeMetricKey(readString(metric.key) || readString(metric.id));
      if (!key) return null;

      return {
        key,
        value: String(metric.value ?? '').trim() || '0',
        unit: readString(metric.unit),
        detail: readString(metric.detail),
      } satisfies DashboardMetric;
    })
    .filter((metric): metric is DashboardMetric => Boolean(metric));
}

function normalizeMetricKey(value: string): DashboardMetricKey | null {
  const normalized = value.trim().toLowerCase();
  if (normalized === 'products' || normalized === 'catalog') return 'products';
  if (normalized === 'practice' || normalized === 'drills') return 'practice';
  if (normalized === 'brochures' || normalized === 'brochure') return 'brochures';
  if (normalized === 'communications' || normalized === 'comms' || normalized === 'announcements') return 'communications';
  return null;
}

function readNumber(value: unknown) {
  if (typeof value === 'number' && Number.isFinite(value)) {
    return value;
  }

  if (typeof value === 'string') {
    const numeric = Number.parseFloat(value);
    return Number.isFinite(numeric) ? numeric : null;
  }

  return null;
}

function clampPercentage(value: number) {
  return Math.max(0, Math.min(100, Math.round(value)));
}

function readString(value: unknown) {
  return typeof value === 'string' ? value.trim() : '';
}
