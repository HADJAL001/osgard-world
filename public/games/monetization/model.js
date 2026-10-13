export const SCENARIOS = Object.freeze([
  { id: 'conservative', label: 'Осторожный', note: 'Меньше трафика и конверсии', traffic: 0.6, starts: 0.8, sessions: 0.75, fill: 0.75, ecpm: 0.7, paid: 0.55, sponsors: 0.5, leads: 0.65, close: 0.7, share: 0.7, inviteOpen: 0.75, costs: 1.1 },
  { id: 'base', label: 'Базовый', note: 'Все допущения без изменений', traffic: 1, starts: 1, sessions: 1, fill: 1, ecpm: 1, paid: 1, sponsors: 1, leads: 1, close: 1, share: 1, inviteOpen: 1, costs: 1 },
  { id: 'optimistic', label: 'Оптимистичный', note: 'Рост при подтверждённом спросе', traffic: 1.8, starts: 1.15, sessions: 1.3, fill: 1.15, ecpm: 1.3, paid: 1.4, sponsors: 1.5, leads: 1.35, close: 1.25, share: 1.25, inviteOpen: 1.15, costs: 1.2 },
]);

export const DEFAULT_INPUTS = Object.freeze({
  monthlyVisitors: 10000,
  inviteShareRate: 0,
  invitesPerSharer: 2,
  inviteOpenRate: 20,
  gameStartRate: 30,
  sessionsPerPlayer: 3,
  adSlotsPerSession: 2,
  adFillRate: 55,
  ecpmUsd: 1.25,
  paidConversionRate: 0.25,
  paidPaymentUsd: 5.99,
  sponsorCampaignsPerMonth: 0,
  averageSponsorPackageUsd: 2500,
  leadRate: 0.15,
  leadCloseRate: 8,
  averageProjectValueUsd: 1200,
  monthlyOperatingCostUsd: 400,
  paymentFeeRate: 3,
});

const bounds = {
  monthlyVisitors: [0, 1000000000],
  inviteShareRate: [0, 100],
  invitesPerSharer: [0, 10],
  inviteOpenRate: [0, 100],
  gameStartRate: [0, 100],
  sessionsPerPlayer: [0, 100],
  adSlotsPerSession: [0, 100],
  adFillRate: [0, 100],
  ecpmUsd: [0, 1000],
  paidConversionRate: [0, 100],
  paidPaymentUsd: [0, 10000000],
  sponsorCampaignsPerMonth: [0, 1000000],
  averageSponsorPackageUsd: [0, 10000000],
  leadRate: [0, 100],
  leadCloseRate: [0, 100],
  averageProjectValueUsd: [0, 1000000000],
  monthlyOperatingCostUsd: [0, 1000000000],
  paymentFeeRate: [0, 100],
};

export function normalizeInputs(input = {}) {
  const normalized = {};
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const raw = Number(input[key] ?? DEFAULT_INPUTS[key]);
    const value = Number.isFinite(raw) ? raw : DEFAULT_INPUTS[key];
    normalized[key] = Math.min(max, Math.max(min, value));
  }
  normalized.monthlyVisitors = Math.round(normalized.monthlyVisitors);
  normalized.invitesPerSharer = Math.round(normalized.invitesPerSharer * 100) / 100;
  normalized.sessionsPerPlayer = Math.round(normalized.sessionsPerPlayer * 100) / 100;
  normalized.adSlotsPerSession = Math.round(normalized.adSlotsPerSession * 100) / 100;
  normalized.sponsorCampaignsPerMonth = Math.round(normalized.sponsorCampaignsPerMonth * 100) / 100;
  return normalized;
}

export function calculateScenario(input = {}, scenarioId = 'base') {
  const values = normalizeInputs(input);
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[1];
  const sourceVisitors = Math.round(values.monthlyVisitors * scenario.traffic);
  const inviteShareRate = Math.min(100, values.inviteShareRate * scenario.share);
  const inviteOpenRate = Math.min(100, values.inviteOpenRate * scenario.inviteOpen);
  const viralCoefficient = inviteShareRate / 100 * values.invitesPerSharer * inviteOpenRate / 100;
  let generationVisitors = sourceVisitors;
  let referralVisitors = 0;
  // A bounded four-generation projection avoids an infinite viral multiplier.
  for (let generation = 0; generation < 4; generation += 1) {
    generationVisitors *= viralCoefficient;
    referralVisitors += generationVisitors;
  }
  referralVisitors = Math.round(referralVisitors);
  const visitors = sourceVisitors + referralVisitors;
  const inviteLinksCreated = Math.round(visitors * inviteShareRate / 100);
  const gameStartRate = Math.min(100, values.gameStartRate * scenario.starts);
  const gameStarts = visitors * gameStartRate / 100;
  const sessions = gameStarts * values.sessionsPerPlayer * scenario.sessions;
  const potentialAdImpressions = sessions * values.adSlotsPerSession;
  const fillRate = Math.min(100, values.adFillRate * scenario.fill);
  const filledAdImpressions = potentialAdImpressions * fillRate / 100;
  const ecpm = values.ecpmUsd * scenario.ecpm;
  const adRevenueUsd = filledAdImpressions / 1000 * ecpm;
  const paidConversionRate = Math.min(100, values.paidConversionRate * scenario.paid);
  const paidCustomers = visitors * paidConversionRate / 100;
  const paidRevenueUsd = paidCustomers * values.paidPaymentUsd;
  const sponsorCampaigns = values.sponsorCampaignsPerMonth * scenario.sponsors;
  const sponsorshipRevenueUsd = sponsorCampaigns * values.averageSponsorPackageUsd;
  const leads = visitors * values.leadRate * scenario.leads / 100;
  const closeRate = Math.min(100, values.leadCloseRate * scenario.close);
  const closedProjects = leads * closeRate / 100;
  const servicesRevenueUsd = closedProjects * values.averageProjectValueUsd;
  const paymentFeesUsd = paidRevenueUsd * values.paymentFeeRate / 100;
  const operatingCostUsd = values.monthlyOperatingCostUsd * scenario.costs;
  const totalRevenueUsd = adRevenueUsd + paidRevenueUsd + servicesRevenueUsd + sponsorshipRevenueUsd;
  const netOperatingUsd = totalRevenueUsd - paymentFeesUsd - operatingCostUsd;

  return {
    scenarioId: scenario.id,
    sourceVisitors,
    referralVisitors,
    visitors,
    inviteShareRate,
    invitesPerSharer: values.invitesPerSharer,
    inviteOpenRate,
    viralCoefficient,
    viralLiftPct: sourceVisitors > 0 ? referralVisitors / sourceVisitors * 100 : 0,
    inviteLinksCreated,
    gameStartRate,
    gameStarts,
    sessions,
    potentialAdImpressions,
    filledAdImpressions,
    fillRate,
    ecpm,
    adRevenueUsd,
    paidConversionRate,
    paidCustomers,
    paidRevenueUsd,
    sponsorCampaigns,
    averageSponsorPackageUsd: values.averageSponsorPackageUsd,
    sponsorshipRevenueUsd,
    leads,
    closeRate,
    closedProjects,
    servicesRevenueUsd,
    paymentFeesUsd,
    operatingCostUsd,
    totalRevenueUsd,
    netOperatingUsd,
  };
}
