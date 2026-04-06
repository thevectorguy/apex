import { marutiCatalogVehicles } from './marutiVehicles';

export type BrochureAsset = {
  id: string;
  name: string;
  type: string;
  format: string;
  freshness: string;
  action: string;
  audience: string;
  image: string;
  theme: 'Arena' | 'NEXA';
};

const brochureMeta = {
  fronx: {
    type: 'Turbo Crossover',
    format: 'PDF + exchange pitch notes',
    freshness: 'Updated 35m ago',
    action: 'Upgrade shoppers',
    audience: 'Urban buyers moving up from hatchbacks',
  },
  baleno: {
    type: 'Premium Hatchback',
    format: 'PDF + feature walkaround sheet',
    freshness: 'Updated this morning',
    action: 'City premium buyers',
    audience: 'Daily commute and comfort-first customers',
  },
  brezza: {
    type: 'SUV Bestseller',
    format: 'PDF + accessories one-pager',
    freshness: 'Updated 2h ago',
    action: 'Family SUV conversations',
    audience: 'High-intent walk-ins comparing compact SUVs',
  },
  dzire: {
    type: 'Sedan Value Pack',
    format: 'PDF + finance talking points',
    freshness: 'Price sheet synced today',
    action: 'Corporate and family leads',
    audience: 'Mileage-led buyers asking for smart EMIs',
  },
  ertiga: {
    type: 'Family MPV',
    format: 'PDF + seating and boot guide',
    freshness: 'Version 4.2',
    action: 'Large-family follow-ups',
    audience: 'Seven-seat shoppers and chauffeur-driven families',
  },
  invicto: {
    type: 'Strong Hybrid Flagship',
    format: 'PDF + premium hybrid walkthrough',
    freshness: 'Updated from NEXA lineup',
    action: 'Luxury family buyers',
    audience: 'Three-row premium shoppers comparing hybrids',
  },
} as const;

export const marutiBrochures: BrochureAsset[] = marutiCatalogVehicles.map((vehicle) => ({
  id: vehicle.id,
  name: `${vehicle.modelName} ${vehicle.variantName}`,
  type: brochureMeta[vehicle.id].type,
  format: brochureMeta[vehicle.id].format,
  freshness: brochureMeta[vehicle.id].freshness,
  action: brochureMeta[vehicle.id].action,
  audience: brochureMeta[vehicle.id].audience,
  image: vehicle.image,
  theme: vehicle.network,
}));
