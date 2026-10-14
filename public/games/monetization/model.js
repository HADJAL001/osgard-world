export const SCENARIOS = Object.freeze([
  { id: 'conservative', label: 'Осторожный', note: 'Меньше трафика и конверсии', traffic: 0.6, starts: 0.8, sessions: 0.75, fill: 0.75, ecpm: 0.7, paid: 0.55, subscription: 0.65, churn: 1.25, leads: 0.65, close: 0.7, costs: 1.1, share: 0.75, inviteConversion: 0.8, sponsors: 0.7 },
  { id: 'base', label: 'Базовый', note: 'Все допущения без изменений', traffic: 1, starts: 1, sessions: 1, fill: 1, ecpm: 1, paid: 1, subscription: 1, churn: 1, leads: 1, close: 1, costs: 1, share: 1, inviteConversion: 1, sponsors: 1 },
  { id: 'optimistic', label: 'Оптимистичный', note: 'Рост при подтверждённом спросе', traffic: 1.8, starts: 1.15, sessions: 1.3, fill: 1.15, ecpm: 1.3, paid: 1.4, subscription: 1.4, churn: 0.8, leads: 1.35, close: 1.25, costs: 1.2, share: 1.25, inviteConversion: 1.2, sponsors: 1.25 },
]);

export const DEFAULT_INPUTS = Object.freeze({
  monthlyVisitors: 10000,
  monthlyTrafficGrowthPct: 5,
  gameStartRate: 30,
  sessionsPerPlayer: 3,
  adSlotsPerSession: 2,
  adFillRate: 55,
  ecpmUsd: 1.25,
  paidConversionRate: 0.25,
  newVisitorSharePct: 50,
  paidPaymentUsd: 5.99,
  subscriptionConversionRatePct: 0.15,
  subscriptionMonthlyPriceUsd: 2.99,
  subscriptionMonthlyChurnPct: 8,
  leadRate: 0.15,
  leadCloseRate: 8,
  averageProjectValueUsd: 1200,
  maxLeadsPerMonth: 100,
  maxProjectsPerMonth: 4,
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
  monthlyTrafficGrowthPct: [-50, 100],
  gameStartRate: [0, 100],
  sessionsPerPlayer: [0, 100],
  adSlotsPerSession: [0, 100],
  adFillRate: [0, 100],
  ecpmUsd: [0, 1000],
  paidConversionRate: [0, 100],
  newVisitorSharePct: [0, 100],
  paidPaymentUsd: [0, 10000000],
  subscriptionConversionRatePct: [0, 100],
  subscriptionMonthlyPriceUsd: [0, 10000000],
  subscriptionMonthlyChurnPct: [0, 100],
  leadRate: [0, 100],
  leadCloseRate: [0, 100],
  averageProjectValueUsd: [0, 1000000000],
  maxLeadsPerMonth: [0, 1000000],
  maxProjectsPerMonth: [0, 100000],
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
  normalized.monthlyTrafficGrowthPct = Math.round(normalized.monthlyTrafficGrowthPct * 100) / 100;
  normalized.maxLeadsPerMonth = Math.round(normalized.maxLeadsPerMonth);
  normalized.maxProjectsPerMonth = Math.round(normalized.maxProjectsPerMonth);
  normalized.subscriptionConversionRatePct = Math.round(normalized.subscriptionConversionRatePct * 100) / 100;
  normalized.subscriptionMonthlyPriceUsd = Math.round(normalized.subscriptionMonthlyPriceUsd * 100) / 100;
  normalized.subscriptionMonthlyChurnPct = Math.round(normalized.subscriptionMonthlyChurnPct * 100) / 100;
  normalized.newVisitorSharePct = Math.round(normalized.newVisitorSharePct * 100) / 100;
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
  const newVisitors = visitors * values.newVisitorSharePct / 100;
  const paidConversionRate = Math.min(100, values.paidConversionRate * scenario.paid);
  const paidCustomers = newVisitors * paidConversionRate / 100;
  const paidRevenueUsd = paidCustomers * values.paidPaymentUsd;

  // Subscriptions are modeled as a separate choice: one-time buyers are excluded
  // from the subscription acquisition pool to avoid counting the same new visitor twice.
  const subscriptionConversionRatePct = Math.min(100, values.subscriptionConversionRatePct * scenario.subscription);
  const subscriptionMonthlyChurnPct = Math.min(100, values.subscriptionMonthlyChurnPct * scenario.churn);
  const subscriptionRetentionRate = 1 - subscriptionMonthlyChurnPct / 100;
  const subscriptionEligibleVisitors = newVisitors * Math.max(0, 1 - paidConversionRate / 100);
  const subscriptionNewCustomersPerMonth = subscriptionEligibleVisitors * subscriptionConversionRatePct / 100;
  let firstYearPaidSubscriberMonthsPerMonthlyCohort = 0;
  let month12RetainedSubscriberMultiplier = 0;
  for (let age = 0; age < 12; age += 1) {
    const retentionAtAge = subscriptionRetentionRate ** age;
    month12RetainedSubscriberMultiplier += retentionAtAge;
    firstYearPaidSubscriberMonthsPerMonthlyCohort += (12 - age) * retentionAtAge;
  }
  const subscriptionSubscribersMonth12 = subscriptionNewCustomersPerMonth * month12RetainedSubscriberMultiplier;
  const subscriptionMrrMonth12Usd = subscriptionSubscribersMonth12 * values.subscriptionMonthlyPriceUsd;
  const subscriptionAnnualRevenueUsd = subscriptionNewCustomersPerMonth *
    values.subscriptionMonthlyPriceUsd * firstYearPaidSubscriberMonthsPerMonthlyCohort;
  // Average monthly recurring revenue across the first 12 months; expose month-12
  // MRR separately so a mature run-rate is not confused with first-year receipts.
  const subscriptionRevenueUsd = subscriptionAnnualRevenueUsd / 12;
  const leads = visitors * values.leadRate * scenario.leads / 100;
  const processedLeads = Math.min(leads, values.maxLeadsPerMonth);
  const unprocessedLeads = Math.max(0, leads - processedLeads);
  const closeRate = Math.min(100, values.leadCloseRate * scenario.close);
  const potentialClosedProjects = processedLeads * closeRate / 100;
  const closedProjects = Math.min(values.maxProjectsPerMonth, potentialClosedProjects);
  const capacityUtilizationPct = values.maxProjectsPerMonth > 0
    ? closedProjects / values.maxProjectsPerMonth * 100
    : 0;
  const servicesRevenueUsd = closedProjects * values.averageProjectValueUsd;
  const paymentFeesUsd = (paidRevenueUsd + subscriptionRevenueUsd) * values.paymentFeeRate / 100;
  const sponsorDealsPerMonth = values.sponsorDealsPerMonth * scenario.sponsors;
  const sponsorRevenueUsd = sponsorDealsPerMonth * values.averageSponsorDealUsd;
  const operatingCostUsd = values.monthlyOperatingCostUsd * scenario.costs;
  const totalRevenueUsd = adRevenueUsd + paidRevenueUsd + subscriptionRevenueUsd + servicesRevenueUsd + sponsorRevenueUsd;
  const netOperatingUsd = totalRevenueUsd - paymentFeesUsd - operatingCostUsd;

  return {
    scenarioId: scenario.id,
    directVisitors,
    viralVisitors,
    visitors,
    newVisitors,
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
    subscriptionConversionRatePct,
    subscriptionMonthlyChurnPct,
    subscriptionNewCustomersPerMonth,
    subscriptionSubscribersMonth12,
    subscriptionMrrMonth12Usd,
    subscriptionAnnualRevenueUsd,
    subscriptionRevenueUsd,
    leads,
    processedLeads,
    unprocessedLeads,
    closeRate,
    potentialClosedProjects,
    closedProjects,
    maxLeadsPerMonth: values.maxLeadsPerMonth,
    maxProjectsPerMonth: values.maxProjectsPerMonth,
    capacityUtilizationPct,
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


const SENSITIVITY_DRIVERS = Object.freeze([
  { key: 'monthlyVisitors', label: 'Стартовый трафик', unit: 'visitors' },
  { key: 'gameStartRate', label: 'Запуск игры', unit: 'percent' },
  { key: 'ecpmUsd', label: 'Рекламный eCPM', unit: 'usd' },
  { key: 'paidConversionRate', label: 'Конверсия в первую покупку', unit: 'percent' },
  { key: 'subscriptionConversionRatePct', label: 'Конверсия в Premium', unit: 'percent' },
  { key: 'subscriptionMonthlyChurnPct', label: 'Отток Premium', unit: 'percent' },
  { key: 'leadCloseRate', label: 'Закрытие заявок', unit: 'percent' },
  { key: 'averageProjectValueUsd', label: 'Средний чек разработки', unit: 'usd' },
  { key: 'maxProjectsPerMonth', label: 'Мощность команды', unit: 'count' },
  { key: 'monthlyOperatingCostUsd', label: 'Операционные расходы', unit: 'usd' },
]);

function roundMoney(value) {
  return Math.round((Number.isFinite(value) ? value : 0) * 100) / 100;
}

/**
 * Returns a conservative, explicitly assumption-based monthly break-even threshold.
 * The search uses the selected model scenario and the full operating-cost calculation.
 * Returns null when non-negative operating results are unreachable within the traffic cap.
 */
export function calculateBreakEvenMonthlyVisitors(input = {}, scenarioId = 'base') {
  const values = normalizeInputs(input);
  const netAt = (monthlyVisitors) => calculateScenario({ ...values, monthlyVisitors }, scenarioId).netOperatingUsd;
  if (netAt(0) >= 0) return 0;
  const maxVisitors = 1000000000;
  let low = 0;
  let high = Math.max(1, Math.min(maxVisitors, values.monthlyVisitors || 1));
  while (high < maxVisitors && netAt(high) < 0) high = Math.min(maxVisitors, high * 2);
  if (netAt(high) < 0) return null;
  while (low + 1 < high) {
    const mid = low + Math.floor((high - low) / 2);
    if (netAt(mid) >= 0) high = mid;
    else low = mid;
  }
  return high;
}

/**
 * Produces a monthly ramp with explicit traffic growth and a real subscriber-cohort
 * schedule. It is a scenario model, not accounting data or a measured revenue forecast.
 */
export function calculateMonthlyProjection(input = {}, scenarioId = 'base', requestedMonths = 12) {
  const values = normalizeInputs(input);
  const months = Math.max(1, Math.min(36, Math.round(Number(requestedMonths) || 12)));
  const growth = values.monthlyTrafficGrowthPct / 100;
  const cohorts = [];
  const rows = [];
  let cumulativeRevenueUsd = 0;
  let cumulativeNetOperatingUsd = 0;
  let firstBreakEvenMonth = null;

  for (let index = 0; index < months; index += 1) {
    const monthlyVisitors = Math.min(1000000000, Math.round(values.monthlyVisitors * ((1 + growth) ** index)));
    const result = calculateScenario({ ...values, monthlyVisitors }, scenarioId);
    cohorts.push({
      acquired: result.subscriptionNewCustomersPerMonth,
      retention: Math.max(0, 1 - result.subscriptionMonthlyChurnPct / 100),
    });
    let activeSubscribers = 0;
    for (let cohortIndex = 0; cohortIndex < cohorts.length; cohortIndex += 1) {
      const cohort = cohorts[cohortIndex];
      const age = index - cohortIndex;
      activeSubscribers += cohort.acquired * (cohort.retention ** age);
    }
    const subscriptionRevenueUsd = activeSubscribers * values.subscriptionMonthlyPriceUsd;
    const totalRevenueUsd = Math.max(0, result.totalRevenueUsd - result.subscriptionRevenueUsd) + subscriptionRevenueUsd;
    const paymentFeesUsd = (result.paidRevenueUsd + subscriptionRevenueUsd) * values.paymentFeeRate / 100;
    const netOperatingUsd = totalRevenueUsd - paymentFeesUsd - result.operatingCostUsd;
    cumulativeRevenueUsd += totalRevenueUsd;
    cumulativeNetOperatingUsd += netOperatingUsd;
    if (firstBreakEvenMonth === null && netOperatingUsd >= 0) firstBreakEvenMonth = index + 1;
    rows.push({
      month: index + 1,
      startingVisitors: monthlyVisitors,
      visitorsIncludingInvites: result.visitors,
      sessions: result.sessions,
      newSubscribers: result.subscriptionNewCustomersPerMonth,
      activeSubscribers,
      adRevenueUsd: result.adRevenueUsd,
      paidRevenueUsd: result.paidRevenueUsd,
      subscriptionRevenueUsd,
      servicesRevenueUsd: result.servicesRevenueUsd,
      sponsorRevenueUsd: result.sponsorRevenueUsd,
      totalRevenueUsd,
      paymentFeesUsd,
      operatingCostUsd: result.operatingCostUsd,
      netOperatingUsd,
      cumulativeRevenueUsd,
      cumulativeNetOperatingUsd,
    });
  }
  return {
    scenarioId: SCENARIOS.some(item => item.id === scenarioId) ? scenarioId : 'base',
    months,
    monthlyTrafficGrowthPct: growth * 100,
    firstBreakEvenMonth,
    cumulativeRevenueUsd,
    cumulativeNetOperatingUsd,
    rows,
  };
}

/**
 * A one-at-a-time sensitivity sweep. Each assumption is moved by the requested
 * percentage around the current value; bounded normalization is reused so the
 * sweep never bypasses model input limits. These are deltas, not probabilities.
 */
export function calculateSensitivity(input = {}, scenarioId = 'base', requestedPct = 20) {
  const values = normalizeInputs(input);
  const pct = Math.max(1, Math.min(50, Number.isFinite(Number(requestedPct)) ? Number(requestedPct) : 20));
  const baseline = calculateScenario(values, scenarioId).netOperatingUsd;
  return SENSITIVITY_DRIVERS.map((driver) => {
    const current = values[driver.key];
    const lowInputs = normalizeInputs({ ...values, [driver.key]: current * (1 - pct / 100) });
    const highInputs = normalizeInputs({ ...values, [driver.key]: current * (1 + pct / 100) });
    const lowNet = calculateScenario(lowInputs, scenarioId).netOperatingUsd;
    const highNet = calculateScenario(highInputs, scenarioId).netOperatingUsd;
    return {
      ...driver,
      currentValue: current,
      lowNetOperatingUsd: lowNet,
      highNetOperatingUsd: highNet,
      lowDeltaUsd: roundMoney(lowNet - baseline),
      highDeltaUsd: roundMoney(highNet - baseline),
      impactRangeUsd: roundMoney(Math.abs(highNet - lowNet)),
      sensitivityPct: pct,
    };
  }).sort((a, b) => b.impactRangeUsd - a.impactRangeUsd);
}

export function calculateDecisionDashboard(input = {}, scenarioId = 'base') {
  const values = normalizeInputs(input);
  const baseline = calculateScenario(values, scenarioId);
  const breakEvenMonthlyVisitors = calculateBreakEvenMonthlyVisitors(values, scenarioId);
  const projection = calculateMonthlyProjection(values, scenarioId, 12);
  const sensitivity = calculateSensitivity(values, scenarioId, 20);
  return {
    scenarioId,
    baseline,
    breakEvenMonthlyVisitors,
    projection,
    sensitivity,
    grossMarginPct: baseline.totalRevenueUsd > 0
      ? (baseline.totalRevenueUsd - baseline.paymentFeesUsd - baseline.operatingCostUsd) / baseline.totalRevenueUsd * 100
      : null,
  };
}
