function buildLeadSeeds() {
  const baseTime = new Date('2026-04-20T08:30:00.000Z');
  const rows = [
    {
      id: 'lead-sarah-mitchell',
      name: 'Sarah Mitchell',
      email: 'sarah.mitchell@example.com',
      phone: '+91 9876543210',
      note: 'Requested a premium SUV walkaround with accessory options.',
      status: 'contacted',
      priority: 'hot',
      stage: 'walkaround',
      vehicleId: 'brezza',
      vehicleLabel: 'Brezza ZXi+ walkaround',
      brochureId: 'brezza',
      brochureName: 'Brezza ZXi+ 6AT',
      assignedTo: 'Arjun',
      lastActivityLabel: 'Walkaround scheduled',
      brochureShares: [],
      metadata: {},
    },
    {
      id: 'lead-david-lee',
      name: 'David Lee',
      email: 'david.lee@example.com',
      phone: '+91 9123456789',
      note: 'Exchange case comparing turbo variants.',
      status: 'new',
      priority: 'new',
      stage: 'follow-up',
      vehicleId: 'fronx',
      vehicleLabel: 'Fronx Alpha exchange case',
      brochureId: 'fronx',
      brochureName: 'Fronx Alpha Turbo 6AT',
      assignedTo: 'Arjun',
      lastActivityLabel: 'Brochure requested',
      brochureShares: [],
      metadata: {},
    },
    {
      id: 'lead-kiran-baxi',
      name: 'Kiran Baxi',
      email: 'kiran.baxi@example.com',
      phone: '+91 9988776655',
      note: 'Finance approval pending for family vehicle booking.',
      status: 'open',
      priority: 'follow-up',
      stage: 'finance',
      vehicleId: 'ertiga',
      vehicleLabel: 'Ertiga family finance approval',
      brochureId: 'ertiga',
      brochureName: 'Ertiga ZXi 6AT',
      assignedTo: 'Arjun',
      lastActivityLabel: 'Finance callback due',
      brochureShares: [],
      metadata: {},
    },
  ];

  return rows.map((row, index) => ({
    ...row,
    lastActivityAt: new Date(baseTime.getTime() - index * 45 * 60 * 1000).toISOString(),
    createdAt: new Date(baseTime.getTime() - (index + 2) * 90 * 60 * 1000).toISOString(),
    updatedAt: new Date(baseTime.getTime() - index * 45 * 60 * 1000).toISOString(),
  }));
}

export function getLeadSeeds() {
  return buildLeadSeeds().map((row) => JSON.parse(JSON.stringify(row)));
}
