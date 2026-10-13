import { DEFAULT_INPUTS, SCENARIOS, calculateScenario, calculateRequiredMonthlyVisitors, normalizeInputs } from './model.js';

const form = document.getElementById('assumptions-form');
const resultsNode = document.getElementById('scenario-results');
const statusNode = document.getElementById('model-status');
const exportButton = document.getElementById('export-json');
const resetButton = document.getElementById('reset-model');
const usd = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const factor = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 3 });

function readInputs() {
  const data = new FormData(form);
  const input = {};
  for (const [key, value] of data.entries()) input[key] = value;
  return normalizeInputs(input);
}
function money(value) { return usd.format(Number.isFinite(value) ? value : 0); }
function count(value) { return number.format(Number.isFinite(value) ? value : 0); }
function percent(value) { return decimal.format(Number.isFinite(value) ? value : 0) + '%'; }
function render() {
  const inputs = readInputs();
  const results = SCENARIOS.map((scenario) => ({ scenario, result: calculateScenario(inputs, scenario.id) }));
  resultsNode.innerHTML = results.map(({ scenario, result }) => {
    const netClass = result.netOperatingUsd < 0 ? 'loss' : 'profit';
    return '<article class="scenario-card scenario-' + scenario.id + '">' +
      '<div class="scenario-head"><div><p class="eyebrow">' + scenario.id.toUpperCase() + ' / MODEL</p><h3>' + scenario.label + '</h3><p>' + scenario.note + '</p></div>' +
      '<span class="scenario-mark" aria-hidden="true">' + (scenario.id === 'base' ? 'B' : scenario.id === 'conservative' ? 'C' : 'O') + '</span></div>' +
      '<div class="net-label">Операционный результат / месяц</div><strong class="net ' + netClass + '">' + money(result.netOperatingUsd) + '</strong>' +
      '<div class="scenario-breakdown">' +
      '<div><span>Расчётная выручка</span><b>' + money(result.totalRevenueUsd) + '</b></div>' +
      '<div><span>Реклама · условно</span><b>' + money(result.adRevenueUsd) + '</b></div>' +
      '<div><span>Покупки / первый платёж</span><b>' + money(result.paidRevenueUsd) + '</b></div>' +
      '<div><span>Оплаченные проекты</span><b>' + money(result.servicesRevenueUsd) + '</b></div>' +
      '<div><span>Спонсорские размещения (модель)</span><b>' + money(result.sponsorRevenueUsd) + '</b></div>' +
      '<div><span>Расходы и комиссии</span><b>' + money(result.operatingCostUsd + result.paymentFeesUsd) + '</b></div>' +
      '<div><span>Посещения всего</span><b>' + count(result.visitors) + '</b></div>' +
      '<div><span>В том числе приглашения</span><b>' + count(result.viralVisitors) + '</b></div>' +
      '<div><span>K-factor</span><b>' + factor.format(result.kFactor) + '</b></div>' +
      '<div><span>Игровые сессии</span><b>' + count(result.sessions) + '</b></div>' +
      '<div><span>Заполненные рекламные показы</span><b>' + count(result.filledAdImpressions) + '</b></div>' +
      '<div><span>Заявки / оплаченные проекты</span><b>' + count(result.leads) + ' / ' + decimal.format(result.closedProjects) + '</b></div>' +
      '</div></article>';
  }).join('');
  statusNode.textContent = 'Пересчёт выполнен локально. Никакие введённые значения не отправляются на сервер.';
  const netValues = results.map((item) => item.result.netOperatingUsd);
  const base = results[1].result;
  document.getElementById('base-net').textContent = money(netValues[1]);
  document.getElementById('base-visitors').textContent = count(base.visitors);
  document.getElementById('base-sessions').textContent = count(base.sessions);
  document.getElementById('base-ad-impressions').textContent = count(base.filledAdImpressions);
  const annualRevenue = base.totalRevenueUsd * 12;
  const target = inputs.annualRevenueTargetUsd;
  const requiredMonthlyVisitors = calculateRequiredMonthlyVisitors(inputs, target);
  document.getElementById('base-viral-visitors').textContent = count(base.viralVisitors);
  document.getElementById('base-k-factor').textContent = factor.format(base.kFactor);
  document.getElementById('base-annual-revenue').textContent = money(annualRevenue);
  document.getElementById('annual-target-heading').textContent = money(target);
  document.getElementById('monthly-target-value').textContent = money(target / 12);
  document.getElementById('million-gap').textContent = money(Math.max(0, target - annualRevenue));
  document.getElementById('required-base-visitors').textContent =
    requiredMonthlyVisitors === null ? '—' : count(requiredMonthlyVisitors);
  const targetStatus = document.getElementById('growth-target-status');
  targetStatus.textContent = requiredMonthlyVisitors === null
    ? 'При текущих коэффициентах цели не достичь даже в пределах 1 млрд стартовых посещений в месяц. Проверь доли запуска, eCPM, конверсию покупок, заказы и спонсорские договоры.'
    : requiredMonthlyVisitors === 0
      ? 'Цель покрывается смоделированными договорами/поступлениями без дополнительного стартового трафика. Это допущение, не подтверждённая выручка.'
      : 'Ориентир: ' + count(requiredMonthlyVisitors) + ' стартовых посещений в месяц. Модель включает расчётные приглашения; фактический трафик и выручку нужно измерить.';
}

form.addEventListener('input', render);
resetButton.addEventListener('click', () => {
  for (const [key, value] of Object.entries(DEFAULT_INPUTS)) {
    const input = form.elements.namedItem(key);
    if (input) input.value = String(value);
  }
  render();
});
exportButton.addEventListener('click', () => {
  const inputs = readInputs();
  const payload = {
    kind: 'osgard-games-business-model',
    modelVersion: 3,
    note: 'Illustrative scenario estimate only; referral loop is capped at five generations; required visitors are a bounded reverse calculation; not live analytics or guaranteed revenue.',
    currency: 'USD',
    generatedAt: new Date().toISOString(),
    inputs,
    growthTarget: { annualRevenueTargetUsd: inputs.annualRevenueTargetUsd, requiredMonthlyStartingVisitors: calculateRequiredMonthlyVisitors(inputs, inputs.annualRevenueTargetUsd) },
    scenarios: SCENARIOS.map((scenario) => ({ label: scenario.label, assumptions: scenario, results: calculateScenario(inputs, scenario.id) })),
  };
  const blob = new Blob([JSON.stringify(payload, null, 2)], { type: 'application/json' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = 'osgard-games-model.json';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  statusNode.textContent = 'JSON расчёта создан и сохранён на устройстве.';
});
render();
