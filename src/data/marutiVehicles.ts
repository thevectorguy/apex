export type InventoryVehicleId = 'fronx' | 'baleno' | 'brezza' | 'dzire' | 'ertiga';

export type InventoryVehicle = {
  id: InventoryVehicleId;
  modelName: string;
  variantName: string;
  priceLabel: string;
  fuelLabel: string;
  engineLabel: string;
  transmissionLabel: string;
  bodyStyle: string;
  network: 'Arena' | 'NEXA';
  editionLabel: string;
  brochureTitle: string;
  image: string;
  inventoryStatus: 'In Stock' | 'Reserved';
};

export const marutiCatalogVehicles: InventoryVehicle[] = [
  {
    id: 'fronx',
    modelName: 'Fronx',
    variantName: 'Alpha Turbo 6AT',
    priceLabel: 'Rs 11.98 L',
    fuelLabel: 'Petrol',
    engineLabel: '1.0L Turbo Boosterjet',
    transmissionLabel: '6 AT',
    bodyStyle: 'Crossover',
    network: 'NEXA',
    editionLabel: 'Turbo Drive',
    brochureTitle: 'Fronx Alpha Turbo 6AT',
    image: '/images/inventory/fronx.png',
    inventoryStatus: 'Reserved',
  },
  {
    id: 'baleno',
    modelName: 'Baleno',
    variantName: 'Alpha AGS',
    priceLabel: 'Rs 9.10 L',
    fuelLabel: 'Petrol',
    engineLabel: '1.2L DualJet',
    transmissionLabel: 'AGS',
    bodyStyle: 'Premium Hatchback',
    network: 'NEXA',
    editionLabel: 'City Premium',
    brochureTitle: 'Baleno Alpha AGS',
    image: '/images/inventory/baleno.png',
    inventoryStatus: 'In Stock',
  },
  {
    id: 'brezza',
    modelName: 'Brezza',
    variantName: 'ZXi+ 6AT',
    priceLabel: 'Rs 12.86 L',
    fuelLabel: 'Petrol',
    engineLabel: '1.5L Smart Hybrid',
    transmissionLabel: '6 AT',
    bodyStyle: 'SUV',
    network: 'Arena',
    editionLabel: 'Showroom Favorite',
    brochureTitle: 'Brezza ZXi+ 6AT',
    image: '/images/inventory/brezza.jpg',
    inventoryStatus: 'In Stock',
  },
  {
    id: 'dzire',
    modelName: 'Dzire',
    variantName: 'ZXi+ AGS',
    priceLabel: 'Rs 10.14 L',
    fuelLabel: 'Petrol',
    engineLabel: '1.2L Z-Series',
    transmissionLabel: 'AGS',
    bodyStyle: 'Sedan',
    network: 'Arena',
    editionLabel: 'Business Class',
    brochureTitle: 'Dzire ZXi+ AGS',
    image: '/images/inventory/dzire.png',
    inventoryStatus: 'In Stock',
  },
  {
    id: 'ertiga',
    modelName: 'Ertiga',
    variantName: 'ZXi 6AT',
    priceLabel: 'Rs 12.27 L',
    fuelLabel: 'Petrol',
    engineLabel: '1.5L Smart Hybrid',
    transmissionLabel: '6 AT',
    bodyStyle: 'MPV',
    network: 'Arena',
    editionLabel: 'Family Ready',
    brochureTitle: 'Ertiga ZXi 6AT',
    image: '/images/inventory/ertiga.jpg',
    inventoryStatus: 'Reserved',
  },
];

export const assignedInventoryVehicles = marutiCatalogVehicles.filter((vehicle) =>
  ['brezza', 'fronx'].includes(vehicle.id),
);

export const pitchPracticeVehicles = marutiCatalogVehicles.filter((vehicle) =>
  ['brezza', 'fronx'].includes(vehicle.id),
);

export const inventoryVehicleById = Object.fromEntries(
  marutiCatalogVehicles.map((vehicle) => [vehicle.id, vehicle]),
) as Record<InventoryVehicleId, InventoryVehicle>;
