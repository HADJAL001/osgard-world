export const SCENARIOS = Object.freeze([
  { id: 'conservative', label: 'Осторожный', note: 'Меньше трафика и конверсии', traffic: 0.6, starts: 0.8, sessions: 0.75, fill: 0.75, ecpm: 0.7, paid: 0.55, subscription: 0.65, churn: 1.25, leads: 0.65, close: 0.7, costs: 1.1, share: 0.75, inviteConversion: 0.8, sponsors: 0.7 },
  { id: 'base', label: 'Базовый', note: 'Все допущения без изменений', traffic: 1, starts: 1, sessions: 1, fill: 1, ecpm: 1, paid: 1, subscription: 1, churn: 1, leads: 1, close: 1, costs: 1, share: 1, inviteConversion: 1, sponsors: 1 },
  { id: 'optimistic', label: 'Оптимистичный', note: 'Рост при подтверждённом спросе', traffic: 1.8, starts: 1.15, sessions: 1.3, fill: 1.15, ecpm: 1.3, paid: 1.4, subscription: 1.4, churn: 0.8, leads: 1.35, close: 1.25, costs: 1.2, share: 1.25, inviteConversion: 1.2, sponsors: 1.25 },
]);

export const SENSITIVITY_LEVERS = Object.freeze([
  { key: 'monthlyVisitors', label: 'Стартовый трафик', format: 'count' },
  { key: 'gameStartRate', label: 'Доля посетителей, запускающих игру', format: 'percent' },
  { key: 'sessionsPerPlayer', label: 'Сессий на игрока', format: 'decimal' },
  { key: 'adFillRate', label: 'Заполнение рекламы', format: 'percent' },
  { key: 'ecpmUsd', label: 'eCPM рекламы', format: 'usd' },
  { key: 'paidConversionRate', label: 'Конверсия в разовую покупку', format: 'percent' },
  { key: 'subscriptionConversionRatePct', label: 'Конверсия в Premium', format: 'percent' },
  { key: 'subscriptionMonthlyChurnPct', label: 'Месячный отток Premium', format: 'percent' },
  { key: 'leadRate', label: 'Конверсия в заявку на разработку', format: 'percent' },
  { key: 'leadCloseRate', label: 'Закрытие заявки в заказ', format: 'percent' },
  { key: 'averageProjectValueUsd', label: 'Средний чек разработки', format: 'usd' },
  { key: 'maxProjectsPerMonth', label: 'Лимит проектов в месяц', format: 'count' },
  { key: 'sponsorDealsPerMonth', label: 'Оплаченные спонсорские договоры в месяц', format: 'decimal' },
  { key: 'averageSponsorDealUsd', label: 'Средний спонсорский договор', format: 'usd' },
  { key: 'monthlyOperatingCostUsd', label: 'Операционные расходы в месяц', format: 'usd' },
  { key: 'paymentFeeRate', label: 'Комиссия платежей', format: 'percent' },
]);

export const DEFAULT_INPUTS = Object.freeze({
  monthlyVisitors: 10000,
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

/**
 * One-variable-at-a-time sensitivity model for the BASE scenario.
 * Every row changes exactly one user-entered assumption by ±variationPct,
 * while all other assumptions and scenario multipliers remain fixed.
 * Values are illustrative; the model does not read or claim real analytics.
 */
export function calculateSensitivity(input = {}, variationPct = 20) {
  const values = normalizeInputs(input);
  const requestedVariation = Number(variationPct);
  const variation = Number.isFinite(requestedVariation)
    ? Math.min(50, Math.max(5, requestedVariation))
    : 20;
  const baseline = calculateScenario(values, 'base');
  const baselineAnnualGrossUsd = baseline.totalRevenueUsd * 12;
  const baselineAnnualNetOperatingUsd = baseline.netOperatingUsd * 12;

  const rows = SENSITIVITY_LEVERS.map((lever) => {
    const baseValue = values[lever.key];
    const downInputs = normalizeInputs({
      ...values,
      [lever.key]: baseValue * (1 - variation / 100),
    });
    const upInputs = normalizeInputs({
      ...values,
      [lever.key]: baseValue * (1 + variation / 100),
    });
    const downResult = calculateScenario(downInputs, 'base');
    const upResult = calculateScenario(upInputs, 'base');
    const downAnnualGrossDeltaUsd = downResult.totalRevenueUsd * 12 - baselineAnnualGrossUsd;
    const upAnnualGrossDeltaUsd = upResult.totalRevenueUsd * 12 - baselineAnnualGrossUsd;
    const downAnnualNetOperatingDeltaUsd = downResult.netOperatingUsd * 12 - baselineAnnualNetOperatingUsd;
    const upAnnualNetOperatingDeltaUsd = upResult.netOperatingUsd * 12 - baselineAnnualNetOperatingUsd;

    return {
      key: lever.key,
      label: lever.label,
      format: lever.format,
      baselineInput: baseValue,
      downInput: downInputs[lever.key],
      upInput: upInputs[lever.key],
      zeroBaseline: baseValue === 0,
      downAnnualGrossDeltaUsd,
      upAnnualGrossDeltaUsd,
      downAnnualNetOperatingDeltaUsd,
      upAnnualNetOperatingDeltaUsd,
      maxAbsAnnualNetImpactUsd: Math.max(
        Math.abs(downAnnualNetOperatingDeltaUsd),
        Math.abs(upAnnualNetOperatingDeltaUsd),
      ),
    };
  }).sort((a, b) => b.maxAbsAnnualNetImpactUsd - a.maxAbsAnnualNetImpactUsd);

  return {
    kind: 'osgard-games-sensitivity',
    variationPct: variation,
    scenarioId: 'base',
    baselineAnnualGrossUsd,
    baselineAnnualNetOperatingUsd,
    rows,
    method: 'one-variable-at-a-time',
    note: 'Each lever changes independently. This is a sensitivity analysis of assumptions, not real observed results, a causal experiment, or a forecast.',
  };
}

