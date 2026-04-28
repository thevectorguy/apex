export type AppMe = {
  id: string;
  firstName: string;
  fullName: string;
  role: string;
  showroom: string;
  shiftLabel: string;
  dateLabel: string;
  avatarUrl: string;
};

export type ReadinessModel = {
  id: string;
  modelName: string;
  score: number;
  status: string;
  strongestDimension: string;
  weakestDimension: string;
  nextAction: string;
  confidence: string;
};

export type AppReadiness = {
  score: number;
  affirmation: string;
  tierLevel: number;
  tierName: string;
  tierColor: string;
  nextTierName: string;
  pointsToNext: number;
  blocker: string;
  strongestMetric: {
    label: string;
    percentile: number;
  };
  coachingFocus: {
    label: string;
    percentile: number;
  };
  models: ReadinessModel[];
};

export type AppBootstrap = {
  me: AppMe;
  readiness: AppReadiness;
  coach: {
    recentCustomerName: string;
    savedCustomers: number;
    reportsCount: number;
    needsReviewCount: number;
    motivation: string;
  };
  reports: {
    totalReports: number;
    customerCount: number;
    sessionsCount: number;
    needsReviewCount: number;
  };
  assistant: {
    currentFocus: string;
    welcomePrompts: string[];
  };
};
