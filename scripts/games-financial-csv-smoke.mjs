import assert from 'node:assert/strict';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { buildFinancialCsv, serializeCsv, FINANCIAL_CSV_NOTE } from '../public/games/monetization/export.mjs';
import { DEFAULT_INPUTS, SCENARIOS, calculateScenario, calculateRequiredMonthlyVisitors } from '../public/games/monetization/model.js';

const root = process.cwd();
const pagePath = resolve(root, 'public/games/monetization/index.html');
const appPath = resolve(root, 'public/games/monetization/app.js');
const helperPath = resolve(root, 'public/games/monetization/export.mjs');
for (const path of [pagePath, appPath, helperPath]) assert.ok(existsSync(path), 'Expected financial CSV artifact missing: ' + path);

const page = readFileSync(pagePath, 'utf8');
const app = readFileSync(appPath, 'utf8');
assert.ok(page.includes('id="export-csv"'), 'CSV export button missing');
assert.ok(/Скачать CSV/.test(page), 'CSV export button needs a clear Russian label');
assert.ok(app.includes("import { buildFinancialCsv } from './export.mjs'"), 'CSV helper must be imported as a local module');
assert.ok(app.includes('osgard-games-model.csv'), 'CSV download filename missing');
assert.ok(app.includes('не отправляются на сервер'), 'CSV export must preserve local-only data handling');

const inputs = { ...DEFAULT_INPUTS };
const generatedAt = '2026-10-14T12:00:00.000Z';
const scenarios = SCENARIOS.map(assumptions => ({
  label: assumptions.label,
  assumptions,
  results: calculateScenario(inputs, assumptions.id),
}));
const csv = buildFinancialCsv({
  inputs,
  scenarios,
  generatedAt,
  requiredMonthlyStartingVisitors: calculateRequiredMonthlyVisitors(inputs),
});
assert.ok(csv.startsWith('\uFEFF'), 'CSV must include UTF-8 BOM for spreadsheet compatibility');
assert.ok(csv.includes('\r\n'), 'CSV must use CRLF row endings');
assert.ok(csv.includes('"scenario_id";'), 'CSV must use semicolon-separated spreadsheet fields');
assert.equal((csv.match(/\r\n/g) || []).length, 4, 'CSV should contain a header and exactly three scenario rows');
assert.ok(csv.includes('"conservative"') && csv.includes('"base"') && csv.includes('"optimistic"'), 'CSV must contain all three scenario variants');
assert.ok(csv.includes('"annual_gross_revenue_target_usd_input"'), 'CSV must include the annual financial target');
assert.ok(csv.includes('"net_operating_usd_estimate"'), 'CSV must include modeled net operating result');
assert.ok(csv.includes('"required_monthly_starting_visitors_estimate"'), 'CSV must include calculated starting-traffic requirement');
assert.ok(csv.includes('"Illustrative scenario only.'), 'CSV must disclose that values are scenario estimates');
const riskCsv = buildFinancialCsv({
  inputs,
  scenarios,
  generatedAt,
  requiredMonthlyStartingVisitors: calculateRequiredMonthlyVisitors(inputs),
  decisionIntelligence: {
    schema: 'osgard.decision-intelligence.v1',
    breakEvenMonthlyVisitors: 12345,
    sensitivity: [{ label: 'Traffic', impactUsd: 456 }],
    simulation: {
      iterations: 500, seed: 20261015, basis: 'test-only triangular multipliers',
      netOperatingUsd: { p10: -10, p50: 50, p90: 150 },
      annualGrossRevenueUsd: { p10: 100, p50: 600, p90: 1200 },
      probabilityBreakEvenPct: 67.5, probabilityAnnualTargetPct: 12.5,
      note: 'Illustrative uncertainty, not a forecast.',
    },
  },
});
assert.ok(riskCsv.includes('"monthly_net_operating_p10_usd"'), 'Risk-aware CSV must export the downside percentile');
assert.ok(riskCsv.includes('"simulated_break_even_rate_pct"'), 'Risk-aware CSV must export simulated break-even rate');
assert.ok(riskCsv.includes('"break_even_monthly_start_visitors"'), 'Risk-aware CSV must export required break-even traffic');
assert.ok(riskCsv.includes('"top_sensitivity_lever"'), 'Risk-aware CSV must export the strongest sensitivity driver');
const negative = serializeCsv([['value', 'note'], [-25, '=WEBSERVICE("https://invalid.example")']], { bom: false });
assert.ok(negative.startsWith('"value";"note"\r\n'), 'CSV header and row separator should be quoted/CRLF');
assert.ok(negative.includes('"-25"'), 'Negative numeric values should remain numeric-formatted values');
assert.ok(negative.includes("’=WEBSERVICE") || negative.includes("'=WEBSERVICE"), 'Formula-like text cells must be neutralized');
assert.throws(() => buildFinancialCsv({ inputs, scenarios: [] }), /three defined financial scenarios/, 'Incomplete scenario data must fail closed');
assert.ok(!/fetch\s*\(|XMLHttpRequest|navigator\.sendBeacon/.test(app), 'Export UI must not add a network path');

console.log('PASS OSGARD financial CSV export: three scenarios, UTF-8 BOM/CRLF, local-only calculations, targets, formula-injection handling and numeric fidelity.');
