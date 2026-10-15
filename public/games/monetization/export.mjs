const NOTE = 'Illustrative scenario only. This file contains calculated assumptions, not measured revenue. Advertising and OSGARD PREMIUM sales are not active unless separately configured and approved.';

const FIELDS = [
  ['scenario_id', entry => entry.scenarioId ?? entry.id ?? entry.assumptions?.id ?? entry.results?.scenarioId ?? ''],
  ['scenario_label', entry => entry.label ?? ''],
  ['generated_at_utc', (_, context) => context.generatedAt ?? ''],
  ['monthly_starting_visitors', (_, context) => context.inputs.monthlyVisitors],
  ['monthly_total_visitors_estimate', entry => entry.results.visitors],
  ['new_visitors_estimate', entry => entry.results.newVisitors],
  ['game_start_rate_pct_input', (_, context) => context.inputs.gameStartRate],
  ['game_starts_estimate', entry => entry.results.gameStarts],
  ['sessions_per_player_input', (_, context) => context.inputs.sessionsPerPlayer],
  ['game_sessions_estimate', entry => entry.results.sessions],
  ['ad_slots_per_session_input', (_, context) => context.inputs.adSlotsPerSession],
  ['ad_fill_rate_pct_input', (_, context) => context.inputs.adFillRate],
  ['filled_ad_impressions_estimate', entry => entry.results.filledAdImpressions],
  ['ecpm_usd_input', (_, context) => context.inputs.ecpmUsd],
  ['ad_revenue_usd_estimate', entry => entry.results.adRevenueUsd],
  ['one_time_purchase_conversion_pct_input', (_, context) => context.inputs.paidConversionRate],
  ['one_time_purchase_usd_input', (_, context) => context.inputs.paidPaymentUsd],
  ['paid_customers_estimate', entry => entry.results.paidCustomers],
  ['one_time_revenue_usd_estimate', entry => entry.results.paidRevenueUsd],
  ['subscription_conversion_pct_input', (_, context) => context.inputs.subscriptionConversionRatePct],
  ['subscription_monthly_price_usd_input', (_, context) => context.inputs.subscriptionMonthlyPriceUsd],
  ['subscription_monthly_churn_pct_input', (_, context) => context.inputs.subscriptionMonthlyChurnPct],
  ['subscription_new_customers_per_month_estimate', entry => entry.results.subscriptionNewCustomersPerMonth],
  ['subscription_active_month_12_estimate', entry => entry.results.subscriptionSubscribersMonth12],
  ['subscription_mrr_month_12_usd_estimate', entry => entry.results.subscriptionMrrMonth12Usd],
  ['subscription_first_year_avg_monthly_usd_estimate', entry => entry.results.subscriptionRevenueUsd],
  ['lead_rate_pct_input', (_, context) => context.inputs.leadRate],
  ['leads_estimate', entry => entry.results.leads],
  ['processed_leads_estimate', entry => entry.results.processedLeads],
  ['unprocessed_leads_estimate', entry => entry.results.unprocessedLeads],
  ['lead_close_rate_pct_input', (_, context) => context.inputs.leadCloseRate],
  ['average_project_value_usd_input', (_, context) => context.inputs.averageProjectValueUsd],
  ['max_projects_per_month_input', (_, context) => context.inputs.maxProjectsPerMonth],
  ['closed_projects_estimate', entry => entry.results.closedProjects],
  ['capacity_utilization_pct_estimate', entry => entry.results.capacityUtilizationPct],
  ['sponsor_deals_per_month_input', (_, context) => context.inputs.sponsorDealsPerMonth],
  ['average_sponsor_deal_usd_input', (_, context) => context.inputs.averageSponsorDealUsd],
  ['sponsor_revenue_usd_estimate', entry => entry.results.sponsorRevenueUsd],
  ['monthly_operating_cost_usd_input', (_, context) => context.inputs.monthlyOperatingCostUsd],
  ['payment_fees_usd_estimate', entry => entry.results.paymentFeesUsd],
  ['gross_monthly_revenue_usd_estimate', entry => entry.results.totalRevenueUsd],
  ['net_operating_usd_estimate', entry => entry.results.netOperatingUsd],
  ['annualized_gross_revenue_usd_estimate', entry => entry.results.totalRevenueUsd * 12],
  ['annual_gross_revenue_target_usd_input', (_, context) => context.inputs.annualRevenueTargetUsd],
  ['required_monthly_starting_visitors_estimate', (_, context) => context.requiredMonthlyStartingVisitors ?? ''],
  ['share_rate_pct_input', (_, context) => context.inputs.shareRatePct],
  ['invites_per_sharer_input', (_, context) => context.inputs.invitesPerSharer],
  ['invite_conversion_pct_input', (_, context) => context.inputs.inviteConversionPct],
  ['active_player_k_factor_estimate', entry => entry.results.activePlayerKFactor],
  ['model_note', () => NOTE],
];

function safeTextCell(value) {
  const text = String(value ?? '');
  // Spreadsheet apps may execute text cells beginning with formula markers.
  // Numeric values are converted separately and remain numeric, including negative net results.
  const firstMeaningful = text.trimStart().charAt(0);
  return ['=', '+', '-', '@'].includes(firstMeaningful) ? "'" + text : text;
}

function csvCell(value) {
  const scalar = typeof value === 'number'
    ? (Number.isFinite(value) ? String(value) : '')
    : typeof value === 'boolean'
      ? String(value)
      : safeTextCell(value);
  return '"' + scalar.replace(/"/g, '""') + '"';
}

export function serializeCsv(rows, { bom = true } = {}) {
  if (!Array.isArray(rows) || rows.length === 0) return bom ? '\uFEFF' : '';
  const width = Math.max(...rows.map(row => Array.isArray(row) ? row.length : 0));
  const content = rows.map(row => Array.from({ length: width }, (_, index) => csvCell(Array.isArray(row) ? row[index] : '')).join(';')).join('\r\n') + '\r\n';
  return (bom ? '\uFEFF' : '') + content;
}

export function buildFinancialCsv({ inputs, scenarios, generatedAt, requiredMonthlyStartingVisitors, decisionIntelligence } = {}) {
  if (!inputs || typeof inputs !== 'object') throw new TypeError('Financial CSV requires normalized input assumptions.');
  if (!Array.isArray(scenarios) || scenarios.length !== 3) throw new TypeError('Financial CSV requires the three defined financial scenarios.');
  for (const entry of scenarios) {
    if (!entry?.results || !entry?.assumptions) throw new TypeError('Each scenario must include assumptions and calculated results.');
  }
  const context = { inputs, generatedAt: generatedAt ?? '', requiredMonthlyStartingVisitors };
  const headers = FIELDS.map(([key]) => key);
  const rows = scenarios.map(entry => FIELDS.map(([, pick]) => pick(entry, context)));
  if (decisionIntelligence?.schema === 'osgard.decision-intelligence.v1' && decisionIntelligence.simulation) {
    const simulation = decisionIntelligence.simulation;
    const metricRows = [
      ['decision_intelligence_metric', 'value', 'model_note'],
      ['simulation_iterations', simulation.iterations, simulation.basis || ''],
      ['simulation_seed', simulation.seed, 'Deterministic seed for reproducibility.'],
      ['monthly_net_operating_p10_usd', simulation.netOperatingUsd?.p10, 'Illustrative downside percentile, not a forecast.'],
      ['monthly_net_operating_p50_usd', simulation.netOperatingUsd?.p50, 'Illustrative median percentile, not a forecast.'],
      ['monthly_net_operating_p90_usd', simulation.netOperatingUsd?.p90, 'Illustrative upside percentile, not a forecast.'],
      ['annual_gross_revenue_p10_usd', simulation.annualGrossRevenueUsd?.p10, 'Illustrative annualized range.'],
      ['annual_gross_revenue_p50_usd', simulation.annualGrossRevenueUsd?.p50, 'Illustrative annualized range.'],
      ['annual_gross_revenue_p90_usd', simulation.annualGrossRevenueUsd?.p90, 'Illustrative annualized range.'],
      ['simulated_break_even_rate_pct', simulation.probabilityBreakEvenPct, 'Share of simulated runs with monthly net >= 0. Not a market probability.'],
      ['simulated_annual_target_rate_pct', simulation.probabilityAnnualTargetPct, 'Share of simulated runs reaching the entered annual gross target.'],
      ['break_even_monthly_start_visitors', decisionIntelligence.breakEvenMonthlyVisitors ?? '', 'Null/blank means no break-even within the documented ceiling.'],
      ['top_sensitivity_lever', decisionIntelligence.sensitivity?.[0]?.label || '', 'Largest one-at-a-time model sensitivity.'],
      ['top_sensitivity_impact_monthly_usd', decisionIntelligence.sensitivity?.[0]?.impactUsd ?? '', 'Difference across the configured sensitivity shock.'],
      ['decision_intelligence_note', simulation.note || NOTE, 'Illustrative assumptions only; do not read as live performance.'],
    ];
    rows.push([], ...metricRows);
  }
  return serializeCsv([headers, ...rows]);
}

export const FINANCIAL_CSV_NOTE = NOTE;
