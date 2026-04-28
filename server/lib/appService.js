import { listReports, listCustomers } from './persistence.js';

const PROFILE_AVATAR_URL =
  'https://lh3.googleusercontent.com/aida-public/AB6AXuAPQTULceKr6j45xJCD4GWbBSq6jE0-mkdsKq3N4HqppI0uBMrLl1eK9ki6aNStOEbdrhGsdp5GwybQPHrj-LkM1-GoNYuqKDrNsyugsSmSNv1VTNCYlHPczEVB7T4WueeIUdbS-PLYNYqQv-qnWZL9sthU8iVlrBdqek3OU_dRGDxl0AuCqIseFjIVzmthxH3zWZaJIcgjec3uh1x36IqHDN6H8G9i6sJckCJpmx1MuYuPeabGW_vRchqBRO_QwqRRTLEt_FxQok4';

const TIER_COLORS = {
  1: '#B87333',
  2: '#A8A9AD',
  3: '#1B7A7A',
  4: '#C9933A',
  5: '#8A7FB5',
};

const READINESS_MODELS = [
  {
    id: 'fronx',
    modelName: 'Fronx',
    score: 88,
    status: 'Strong',
    strongestDimension: 'Comparison strength',
    weakestDimension: 'Next-step control',
    nextAction: 'Use one direct test-drive close in the next Fronx walk-in.',
    confidence: 'High',
  },
  {
    id: 'baleno',
    modelName: 'Baleno',
    score: 81,
    status: 'Solid',
    strongestDimension: 'Product clarity',
    weakestDimension: 'Cross-model positioning',
    nextAction: 'Anchor Baleno against two clear city-driving use cases.',
    confidence: 'High',
  },
  {
    id: 'brezza',
    modelName: 'Brezza',
    score: 64,
    status: 'Emerging',
    strongestDimension: 'Use-case fit',
    weakestDimension: 'Objection recovery',
    nextAction: 'Log 2 stronger Brezza conversations with pricing objections this week.',
    confidence: 'Medium',
  },
];

export async function getAppMe() {
  return buildProfile();
}

export async function getAppBootstrap() {
  const [customers, reports] = await Promise.all([listCustomers(), listReports()]);
  const profile = buildProfile();
  const readiness = buildReadiness();
  const needsReviewCount = reports.filter((report) => ['C', 'D'].includes(report.grade)).length;
  const customerCount = new Set(reports.map((report) => report.customerId).filter(Boolean)).size;
  const latestCustomer = customers[0] || null;

  return {
    me: profile,
    readiness,
    coach: {
      recentCustomerName: latestCustomer?.name || 'Shweta Jain',
      savedCustomers: customers.length,
      reportsCount: reports.length,
      needsReviewCount,
      motivation:
        'Brezza needs 2 more strong conversations to improve score. Upload or log a Brezza session to level up.',
    },
    reports: {
      totalReports: reports.length,
      customerCount,
      sessionsCount: new Set(reports.map((report) => report.sessionId).filter(Boolean)).size,
      needsReviewCount,
    },
    assistant: {
      currentFocus: readiness.blocker,
      welcomePrompts: [
        'What should I ask next?',
        'How do I handle a price objection here?',
        'What moves my readiness fastest today?',
      ],
    },
  };
}

function buildProfile() {
  return {
    id: 'arjun-mehta',
    firstName: 'Arjun',
    fullName: 'Arjun Mehta',
    role: 'Relationship Manager',
    showroom: 'DILOS Showroom',
    shiftLabel: '08:30 - 17:00',
    dateLabel: formatDateLabel(new Date()),
    avatarUrl: PROFILE_AVATAR_URL,
  };
}

function buildReadiness() {
  const tierLevel = 3;
  return {
    score: 82,
    affirmation: "You're ahead of 78% of peers in Sales Readiness",
    tierLevel,
    tierName: 'Proficient',
    tierColor: TIER_COLORS[tierLevel],
    nextTierName: 'Advanced',
    pointsToNext: 8,
    blocker: 'Objection recovery on Brezza',
    strongestMetric: {
      label: 'Inventory Mastery',
      percentile: 84,
    },
    coachingFocus: {
      label: 'Objection Handling',
      percentile: 68,
    },
    models: READINESS_MODELS,
  };
}

function formatDateLabel(date) {
  return new Intl.DateTimeFormat('en-US', {
    month: 'long',
    day: 'numeric',
  })
    .format(date)
    .toUpperCase();
}
