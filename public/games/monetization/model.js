export const SCENARIOS = Object.freeze([
  { id: 'conservative', label: 'Осторожный', note: 'Меньше трафика и конверсии', traffic: 0.6, starts: 0.8, sessions: 0.75, fill: 0.75, ecpm: 0.7, paid: 0.55, leads: 0.65, close: 0.7, costs: 1.1, share: 0.75, inviteConversion: 0.8, sponsors: 0.7 },
  { id: 'base', label: 'Базовый', note: 'Все допущения без изменений', traffic: 1, starts: 1, sessions: 1, fill: 1, ecpm: 1, paid: 1, leads: 1, close: 1, costs: 1, share: 1, inviteConversion: 1, sponsors: 1 },
  { id: 'optimistic', label: 'Оптимистичный', note: 'Рост при подтверждённом спросе', traffic: 1.8, starts: 1.15, sessions: 1.3, fill: 1.15, ecpm: 1.3, paid: 1.4, leads: 1.35, close: 1.25, costs: 1.2, share: 1.25, inviteConversion: 1.2, sponsors: 1.25 },
]);

export const DEFAULT_INPUTS = Object.freeze({
  monthlyVisitors: 10000,
  gameStartRate: 30,
  sessionsPerPlayer: 3,
  adSlotsPerSession: 2,
  adFillRate: 55,
  ecpmUsd: 1.25,
  paidConversionRate: 0.25,
  paidPaymentUsd: 5.99,
  leadRate: 0.15,
  leadCloseRate: 8,
  averageProjectValueUsd: 1200,
  monthlyOperatingCostUsd: 400,
  paymentFeeRate: 3,
  annualRevenueTargetUsd: 1000000,
  shareRatePct: 5,
  invitesPerSharer: 3,
  inviteConversionPct: 10,
  sponsorDealsPerMonth: 0,
  averageSponsorDealUsd: 0,
});

const bounds = {
  monthlyVisitors: [0, 1000000000],
  gameStartRate: [0, 100],
  sessionsPerPlayer: [0, 100],
  adSlotsPerSession: [0, 100],
  adFillRate: [0, 100],
  ecpmUsd: [0, 1000],
  paidConversionRate: [0, 100],
  paidPaymentUsd: [0, 10000000],
  leadRate: [0, 100],
  leadCloseRate: [0, 100],
  averageProjectValueUsd: [0, 1000000000],
  monthlyOperatingCostUsd: [0, 1000000000],
  paymentFeeRate: [0, 100],
  annualRevenueTargetUsd: [0, 1000000000000],
  shareRatePct: [0, 100],
  invitesPerSharer: [0, 20],
  inviteConversionPct: [0, 100],
  sponsorDealsPerMonth: [0, 10000],
  averageSponsorDealUsd: [0, 100000000],
};

export function normalizeInputs(input = {}) {
  const normalized = {};
  for (const [key, [min, max]] of Object.entries(bounds)) {
    const raw = Number(input[key] ?? DEFAULT_INPUTS[key]);
    const value = Number.isFinite(raw) ? raw : DEFAULT_INPUTS[key];
    normalized[key] = Math.min(max, Math.max(min, value));
  }
  normalized.monthlyVisitors = Math.round(normalized.monthlyVisitors);
  normalized.sessionsPerPlayer = Math.round(normalized.sessionsPerPlayer * 100) / 100;
  normalized.adSlotsPerSession = Math.round(normalized.adSlotsPerSession * 100) / 100;
  normalized.shareRatePct = Math.round(normalized.shareRatePct * 100) / 100;
  normalized.invitesPerSharer = Math.round(normalized.invitesPerSharer * 100) / 100;
  normalized.inviteConversionPct = Math.round(normalized.inviteConversionPct * 100) / 100;
  normalized.annualRevenueTargetUsd = Math.round(normalized.annualRevenueTargetUsd * 100) / 100;
  normalized.sponsorDealsPerMonth = Math.round(normalized.sponsorDealsPerMonth * 100) / 100;
  return normalized;
}

export function calculateScenario(input = {}, scenarioId = 'base') {
  const values = normalizeInputs(input);
  const scenario = SCENARIOS.find((item) => item.id === scenarioId) ?? SCENARIOS[1];
  const directVisitors = Math.round(values.monthlyVisitors * scenario.traffic);
  const gameStartRate = Math.min(100, values.gameStartRate * scenario.starts);
  const effectiveShareRatePct = Math.min(100, values.shareRatePct * scenario.share);
  const effectiveInviteConversionPct = Math.min(100, values.inviteConversionPct * scenario.inviteConversion);
  const kFactor = effectiveShareRatePct / 100 * values.invitesPerSharer * effectiveInviteConversionPct / 100;
  // The active-player reproduction factor also accounts for invited visitors who actually start a game.
  const activePlayerKFactor = gameStartRate / 100 * kFactor;

  // Five explicit generations keep the illustrative model finite even when K-factor >= 1.
  // The model is a sensitivity tool, not a measured viral coefficient or a traffic forecast.
  const directGameStarts = directVisitors * gameStartRate / 100;
  let generationVisitors = directGameStarts * kFactor;
  let expectedViralVisitors = 0;
  for (let generation = 0; generation < 5; generation += 1) {
    expectedViralVisitors += generationVisitors;
    generationVisitors *= gameStartRate / 100 * kFactor;
  }
  const viralVisitors = Math.round(expectedViralVisitors);
  const visitors = directVisitors + viralVisitors;
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
  const leads = visitors * values.leadRate * scenario.leads / 100;
  const closeRate = Math.min(100, values.leadCloseRate * scenario.close);
  const closedProjects = leads * closeRate / 100;
  const servicesRevenueUsd = closedProjects * values.averageProjectValueUsd;
  const paymentFeesUsd = paidRevenueUsd * values.paymentFeeRate / 100;
  const sponsorDealsPerMonth = values.sponsorDealsPerMonth * scenario.sponsors;
  const sponsorRevenueUsd = sponsorDealsPerMonth * values.averageSponsorDealUsd;
  const operatingCostUsd = values.monthlyOperatingCostUsd * scenario.costs;
  const totalRevenueUsd = adRevenueUsd + paidRevenueUsd + servicesRevenueUsd + sponsorRevenueUsd;
  const netOperatingUsd = totalRevenueUsd - paymentFeesUsd - operatingCostUsd;

  return {
    scenarioId: scenario.id,
    directVisitors,
    viralVisitors,
    visitors,
    gameStartRate,
    gameStarts,
    kFactor,
    activePlayerKFactor,
    effectiveShareRatePct,
    effectiveInviteConversionPct,
    sessions,
    potentialAdImpressions,
    filledAdImpressions,
    fillRate,
    ecpm,
    adRevenueUsd,
    paidConversionRate,
    paidCustomers,
    paidRevenueUsd,
    leads,
    closeRate,
    closedProjects,
    servicesRevenueUsd,
    sponsorDealsPerMonth,
    sponsorRevenueUsd,
    paymentFeesUsd,
    operatingCostUsd,
    totalRevenueUsd,
    netOperatingUsd,
  };
}

/**
 * Finds the smallest starting (non-referral) monthly traffic estimate whose
 * BASE scenario reaches the requested annual gross revenue. This is a bounded
 * reverse calculation over assumptions, not a forecast or measured KPI.
 * Returns null when the target cannot be reached within the visitor cap.
 */
export function calculateRequiredMonthlyVisitors(input = {}, annualTargetUsd) {
  const values = normalizeInputs(input);
  const rawTarget = annualTargetUsd ?? values.annualRevenueTargetUsd;
  const parsedTarget = Number(rawTarget);
  const target = Number.isFinite(parsedTarget)
    ? Math.min(1000000000000, Math.max(0, parsedTarget))
    : values.annualRevenueTargetUsd;
  if (target <= 0) return 0;

  const maxVisitors = 1000000000;
  const annualGrossAt = (monthlyVisitors) =>
    calculateScenario({ ...values, monthlyVisitors }, 'base').totalRevenueUsd * 12;

  if (annualGrossAt(0) >= target) return 0;
  let low = 0;
  let high = Math.max(1, Math.min(maxVisitors, values.monthlyVisitors || 1));

  while (high < maxVisitors && annualGrossAt(high) < target) {
    high = Math.min(maxVisitors, high * 2);
  }
  if (annualGrossAt(high) < target) return null;

  // Integer binary search keeps the displayed requirement reproducible.
  while (low + 1 < high) {
    const mid = Math.floor((low + high) / 2);
    if (annualGrossAt(mid) >= target) high = mid;
    else low = mid;
  }
  return high;
}
