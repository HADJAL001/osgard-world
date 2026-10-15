import { calculateScenario, normalizeInputs } from './model.js';

const MAX_MONTHS = 36;
const MAX_STARTING_CASH_USD = 1_000_000_000_000;

function boundedNumber(value, fallback, min, max) {
  const numeric = Number(value);
  return Number.isFinite(numeric) ? Math.max(min, Math.min(max, numeric)) : fallback;
}

/**
 * Projects a monthly cash-flow path with explicit subscription cohorts.
 * Non-subscription income stays at the current BASE monthly level; new subscription
 * cohorts are acquired each month and retained with the modeled monthly churn.
 * This is a scenario projection, not an accounting ledger or a measured forecast.
 */
export function projectCohortCashFlow(input = {}, options = {}) {
  const values = normalizeInputs(input);
  const monthsRaw = Number(options.months ?? 12);
  const months = Number.isFinite(monthsRaw)
    ? Math.max(1, Math.min(MAX_MONTHS, Math.floor(monthsRaw)))
    : 12;
  const startingCashUsd = boundedNumber(options.startingCashUsd, 0, 0, MAX_STARTING_CASH_USD);
  const base = calculateScenario(values, 'base');

  const monthlyNewSubscribers = Math.max(0, base.subscriptionNewCustomersPerMonth);
  const monthlyChurnRate = Math.max(0, Math.min(100, base.subscriptionMonthlyChurnPct)) / 100;
  const monthlySubscriptionPrice = Math.max(0, values.subscriptionMonthlyPriceUsd);
  const monthlyFeeRate = Math.max(0, Math.min(100, values.paymentFeeRate)) / 100;

  const nonSubscriptionGrossUsd = Math.max(0, base.totalRevenueUsd - base.subscriptionRevenueUsd);
  const nonSubscriptionFeesUsd = Math.max(0,
    base.paymentFeesUsd - (base.subscriptionRevenueUsd * monthlyFeeRate));
  let subscribers = 0;
  let cumulativeCashUsd = startingCashUsd;
  let operatingBreakEvenMonth = null;
  let cashDepletionMonth = null;

  const series = [];
  for (let month = 1; month <= months; month += 1) {
    subscribers = subscribers * (1 - monthlyChurnRate) + monthlyNewSubscribers;
    const mrrUsd = subscribers * monthlySubscriptionPrice;
    const subscriptionFeesUsd = mrrUsd * monthlyFeeRate;
    const grossRevenueUsd = nonSubscriptionGrossUsd + mrrUsd;
    const paymentFeesUsd = nonSubscriptionFeesUsd + subscriptionFeesUsd;
    const operatingCostUsd = base.operatingCostUsd;
    const netCashFlowUsd = grossRevenueUsd - paymentFeesUsd - operatingCostUsd;
    cumulativeCashUsd += netCashFlowUsd;

    if (operatingBreakEvenMonth === null && netCashFlowUsd >= 0) operatingBreakEvenMonth = month;
    if (cashDepletionMonth === null && cumulativeCashUsd < 0) cashDepletionMonth = month;

    series.push({
      month,
      subscribers,
      newSubscribers: monthlyNewSubscribers,
      mrrUsd,
      nonSubscriptionGrossUsd,
      grossRevenueUsd,
      paymentFeesUsd,
      operatingCostUsd,
      netCashFlowUsd,
      cumulativeCashUsd,
    });
  }

  return {
    schema: 'osgard.cohort-cashflow.v1',
    months,
    startingCashUsd,
    monthlyChurnPct: monthlyChurnRate * 100,
    monthlyNewSubscribers,
    operatingBreakEvenMonth,
    cashDepletionMonth,
    endingCashUsd: cumulativeCashUsd,
    endingMrrUsd: series.at(-1)?.mrrUsd ?? 0,
    endingSubscribers: series.at(-1)?.subscribers ?? 0,
    series,
    assumptions: {
      nonSubscriptionIncome: 'Held flat at the current BASE scenario.',
      subscriptions: 'Monthly new cohorts are held flat; each cohort retains at the modeled monthly churn rate.',
      costs: 'Operating costs and payment-fee rate are held flat.',
      startingCash: 'User-entered model input; not read from bank/accounting systems.',
    },
    note: 'Illustrative planning model. Not live revenue, cash balance, accounting advice, or a forecast calibrated to measured OSGARD cohorts.',
  };
}
