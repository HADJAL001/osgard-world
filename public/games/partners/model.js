export const SCENARIO_PRESETS = {
  conservative: {
    label: "Осторожный",
    visits: 1000,
    startRatePct: 10,
    sessionsPerPlayer: 1.4,
    adSlotsPerSession: 1,
    fillRatePct: 20,
    netEcpm: 0.5,
    purchaseRatePct: 0.05,
    averagePurchase: 4,
    paymentFeePct: 3,
    confirmedSponsorRevenue: 0,
    fixedCosts: 50,
    acquisitionCosts: 0,
    projectLeadRatePct: 0.1,
    projectCloseRatePct: 2,
    contributionPerProject: 0
  },
  base: {
    label: "Базовый",
    visits: 10000,
    startRatePct: 18,
    sessionsPerPlayer: 1.8,
    adSlotsPerSession: 2,
    fillRatePct: 40,
    netEcpm: 1,
    purchaseRatePct: 0.15,
    averagePurchase: 4.5,
    paymentFeePct: 3,
    confirmedSponsorRevenue: 0,
    fixedCosts: 200,
    acquisitionCosts: 0,
    projectLeadRatePct: 0.25,
    projectCloseRatePct: 4,
    contributionPerProject: 0
  },
  optimistic: {
    label: "Оптимистичный",
    visits: 50000,
    startRatePct: 25,
    sessionsPerPlayer: 2.2,
    adSlotsPerSession: 3,
    fillRatePct: 60,
    netEcpm: 2,
    purchaseRatePct: 0.35,
    averagePurchase: 5,
    paymentFeePct: 3,
    confirmedSponsorRevenue: 0,
    fixedCosts: 800,
    acquisitionCosts: 250,
    projectLeadRatePct: 0.5,
    projectCloseRatePct: 6,
    contributionPerProject: 0
  }
};

export const INPUT_DEFAULTS = SCENARIO_PRESETS.base;

const finite = value => Number.isFinite(Number(value)) ? Number(value) : 0;
const nonNegative = value => Math.max(0, finite(value));
const pct = value => Math.min(100, Math.max(0, finite(value))) / 100;

export function calculateModel(input = {}) {
  const v = { ...INPUT_DEFAULTS, ...input };
  const visits = Math.floor(nonNegative(v.visits));
  const starts = visits * pct(v.startRatePct);
  const sessions = starts * nonNegative(v.sessionsPerPlayer);
  const adRequests = sessions * nonNegative(v.adSlotsPerSession);
  const paidImpressions = adRequests * pct(v.fillRatePct);
  const adRevenue = paidImpressions / 1000 * nonNegative(v.netEcpm);
  const purchasers = starts * pct(v.purchaseRatePct);
  const purchaseGross = purchasers * nonNegative(v.averagePurchase);
  const paymentFees = purchaseGross * pct(v.paymentFeePct);
  const purchaseRevenue = purchaseGross - paymentFees;
  const sponsorRevenue = nonNegative(v.confirmedSponsorRevenue);
  const gameRevenue = adRevenue + purchaseRevenue + sponsorRevenue;
  const operatingCosts = nonNegative(v.fixedCosts) + nonNegative(v.acquisitionCosts);
  const gameOperatingResult = gameRevenue - operatingCosts;
  const qualifiedLeads = visits * pct(v.projectLeadRatePct);
  const expectedProjectSales = qualifiedLeads * pct(v.projectCloseRatePct);
  const ecosystemContribution = expectedProjectSales * nonNegative(v.contributionPerProject);

  return {
    visits, starts, sessions, adRequests, paidImpressions, adRevenue,
    purchasers, purchaseGross, paymentFees, purchaseRevenue, sponsorRevenue,
    gameRevenue, operatingCosts, gameOperatingResult, qualifiedLeads,
    expectedProjectSales, ecosystemContribution,
    ecosystemPotentialResult: gameOperatingResult + ecosystemContribution
  };
}

export function calculateAllScenarios(overrides = {}) {
  return Object.entries(SCENARIO_PRESETS).map(([key, preset]) => ({
    key,
    label: preset.label,
    input: { ...preset, ...overrides },
    result: calculateModel({ ...preset, ...overrides })
  }));
}

export function trackedUrl(rawUrl, campaignContent) {
  const url = new URL(rawUrl);
  url.searchParams.set("utm_source", "osgard_games");
  url.searchParams.set("utm_medium", "ecosystem");
  url.searchParams.set("utm_campaign", "partner_studio");
  url.searchParams.set("utm_content", String(campaignContent || "project").slice(0, 80));
  url.searchParams.set("osgard_ref", "games-partners");
  return url.toString();
}
