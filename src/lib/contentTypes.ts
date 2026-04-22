export type CatalogNetwork = 'Arena' | 'NEXA';

export type CatalogVehicle = {
  id: string;
  modelName: string;
  variantName: string;
  priceLabel: string;
  fuelLabel: string;
  engineLabel: string;
  transmissionLabel: string;
  bodyStyle: string;
  network: CatalogNetwork;
  editionLabel: string;
  brochureTitle: string;
  image: string;
  inventoryStatus: string;
  isAssigned?: boolean;
  isFeatured?: boolean;
  tags?: string[];
};

export type BrochureAsset = {
  id: string;
  vehicleId?: string;
  name: string;
  type: string;
  format: string;
  freshness: string;
  action: string;
  audience: string;
  image: string;
  theme: CatalogNetwork;
  fileUrl?: string | null;
};

export type AnnouncementSegment = 'priority' | 'training' | 'policy';

export type Announcement = {
  id: string;
  title: string;
  category: string;
  summary: string;
  image: string;
  publishedAt: string;
  audience: string;
  segments: AnnouncementSegment[];
  searchTerms: string[];
  badgeLabel?: string;
  badgeClassName?: string;
};

export type LeadPriorityTone = 'hot' | 'new' | 'follow-up' | 'default';

export type LeadSummary = {
  id: string;
  customerName: string;
  email: string | null;
  phone: string | null;
  brochureId: string | null;
  brochureName: string | null;
  vehicleId: string | null;
  vehicleLabel: string | null;
  note: string | null;
  status: string;
  priorityLabel: string;
  priorityTone: LeadPriorityTone;
  initials: string;
  createdAt: string | null;
  updatedAt: string | null;
};

export type DashboardMetricKey = 'products' | 'practice' | 'brochures' | 'communications';

export type DashboardMetric = {
  key: DashboardMetricKey;
  value: string;
  unit: string;
  detail: string;
};

export type DashboardSalesPerformance = {
  valueLabel: string;
  detail: string;
  progressPercent: number;
};

export type DashboardHome = {
  greetingName: string;
  dateLabel: string;
  shiftLabel: string;
  salesPerformance: DashboardSalesPerformance;
  metrics: DashboardMetric[];
  announcements: Announcement[];
  assignedVehicles: CatalogVehicle[];
  priorityLeads: LeadSummary[];
};
