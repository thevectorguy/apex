import { listAnnouncements, listBrochures, listVehicles } from './contentService.js';
import { listLeads } from './leadsService.js';

export async function getDashboardHome() {
  const [vehiclesResult, brochuresResult, announcementsResult, leadsResult] = await Promise.all([
    listVehicles({}),
    listBrochures({}),
    listAnnouncements({}),
    listLeads({}),
  ]);
  const vehicles = vehiclesResult.items;
  const brochures = brochuresResult.items;
  const announcements = announcementsResult.items;

  const assignedVehicles = selectDashboardVehicles(vehicles);
  const latestAnnouncements = announcements.slice(0, 2);
  const priorityLeads = leadsResult.items.slice(0, 3);
  const hotLeadCount = leadsResult.items.filter((lead) => lead.priority === 'hot').length;
  const priorityAnnouncementsCount = announcements.filter((announcement) =>
    Array.isArray(announcement.segments) && announcement.segments.includes('priority'),
  ).length;
  const recentlyRefreshedBrochures = brochures.filter((brochure) =>
    /today|ago|morning|updated|synced/i.test(String(brochure.freshness || '')),
  ).length;

  const sources = {};
  if (vehiclesResult.source === 'fallback') {
    sources.vehicles = vehiclesResult.source;
  }
  if (brochuresResult.source === 'fallback') {
    sources.brochures = brochuresResult.source;
  }
  if (announcementsResult.source === 'fallback') {
    sources.announcements = announcementsResult.source;
  }
  if (leadsResult.source === 'fallback') {
    sources.leads = leadsResult.source;
  }

  const greeting = buildGreeting();
  const dateLabel = greeting.subtitle.split(' - ')[0] || 'OCTOBER 24';
  const shiftLabel = '08:30 - 17:00';
  const metrics = [
    {
      key: 'products',
      value: String(vehicles.length),
      unit: 'Models',
      detail: `${assignedVehicles.length} assigned today`,
    },
    {
      key: 'practice',
      value: '2',
      unit: 'Drills',
      detail: 'Mileage and finance rehearsal',
    },
    {
      key: 'brochures',
      value: String(brochures.length),
      unit: 'Decks',
      detail: `${recentlyRefreshedBrochures} refreshed recently`,
    },
    {
      key: 'communications',
      value: String(priorityAnnouncementsCount),
      unit: 'Updates',
      detail: 'Priority updates today',
    },
  ];

  return {
    greeting,
    greetingName: 'Arjun',
    dateLabel,
    shiftLabel,
    profile: {
      firstName: 'Arjun',
      fullName: 'Arjun Mehta',
      role: 'Relationship Manager',
      showroom: 'DILOS Showroom',
      shiftLabel: 'ACTIVE SHIFT: 08:30 - 17:00',
    },
    salesPerformance: {
      valueLabel: '3 Units',
      detail: '2 remaining for daily goal',
      progressPercent: 60,
    },
    metrics,
    quickMetrics: {
      products: {
        count: vehicles.length,
        assignedCount: assignedVehicles.length,
        label: 'Models',
        detail: `${assignedVehicles.length} assigned today`,
      },
      brochures: {
        count: brochures.length,
        refreshedCount: recentlyRefreshedBrochures,
        label: 'Decks',
        detail: `${recentlyRefreshedBrochures} refreshed recently`,
      },
      communications: {
        count: priorityAnnouncementsCount,
        label: 'Updates',
        detail: 'Priority updates today',
      },
      leads: {
        count: leadsResult.total,
        hotCount: hotLeadCount,
        label: 'Leads',
        detail: `${hotLeadCount} hot lead${hotLeadCount === 1 ? '' : 's'}`,
      },
    },
    latestAnnouncements,
    assignedVehicles,
    priorityLeads,
    counts: {
      vehicles: vehicles.length,
      brochures: brochures.length,
      announcements: announcements.length,
      leads: leadsResult.total,
    },
    source: Object.values(sources).includes('fallback') ? 'fallback' : null,
    sources,
  };
}

function buildGreeting() {
  const now = new Date();
  const hours = now.getHours();
  const period = hours < 12 ? 'morning' : hours < 17 ? 'afternoon' : 'evening';
  const dateLabel = now.toLocaleDateString('en-US', {
    month: 'long',
    day: 'numeric',
  });

  return {
    title: `Good ${period}, Arjun.`,
    subtitle: `${dateLabel.toUpperCase()} - ACTIVE SHIFT: 08:30 - 17:00`,
  };
}

function selectDashboardVehicles(vehicles) {
  const assignedVehicles = vehicles.filter((vehicle) => vehicle.isAssigned);
  if (assignedVehicles.length > 0) {
    return assignedVehicles.slice(0, 2);
  }

  const curatedIds = new Set(['brezza', 'fronx']);
  const curatedVehicles = vehicles.filter((vehicle) => curatedIds.has(vehicle.id));
  if (curatedVehicles.length > 0) {
    return curatedVehicles.slice(0, 2);
  }

  return vehicles.slice(0, 2);
}
