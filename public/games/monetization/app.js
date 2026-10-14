import { DEFAULT_INPUTS, SCENARIOS, calculateScenario, calculateRequiredMonthlyVisitors, normalizeInputs } from './model.js';
import { buildFinancialCsv } from './export.mjs';
import { runUncertaintySimulation, calculateBreakEvenMonthlyVisitors, analyzeSensitivity, buildDecisionRecommendations } from './intelligence.mjs';

const form = document.getElementById('assumptions-form');
const resultsNode = document.getElementById('scenario-results');
const statusNode = document.getElementById('model-status');
const exportButton = document.getElementById('export-json');
const exportCsvButton = document.getElementById('export-csv');
const resetButton = document.getElementById('reset-model');
const usd = new Intl.NumberFormat('ru-RU', { style: 'currency', currency: 'USD', maximumFractionDigits: 0 });
const number = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 0 });
const decimal = new Intl.NumberFormat('ru-RU', { maximumFractionDigits: 1 });
const factor = new Intl.NumberFormat('ru-RU', { minimumFractionDigits: 3, maximumFractionDigits: 4 });
const SNAPSHOT_KEY = 'osgard.monetization.scenarios.v1';
const SNAPSHOT_LIMIT = 8;
const RISK_SEED = 20261015;
let latestIntelligence = null;

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
      '<div><span>Разовые покупки / первый платёж</span><b>' + money(result.paidRevenueUsd) + '</b></div>' +
      '<div><span>Premium подписка · средний месяц 1-го года</span><b>' + money(result.subscriptionRevenueUsd) + '</b></div>' +
      '<div><span>Premium активны к месяцу 12 / MRR</span><b>' + count(result.subscriptionSubscribersMonth12) + ' / ' + money(result.subscriptionMrrMonth12Usd) + '</b></div>'
      + '<div><span>Новые посетители (допущение)</span><b>' + count(result.newVisitors) + '</b></div>' +
      '<div><span>Оплаченные проекты</span><b>' + money(result.servicesRevenueUsd) + '</b></div>' +
      '<div><span>Спонсорские размещения (модель)</span><b>' + money(result.sponsorRevenueUsd) + '</b></div>' +
      '<div><span>Расходы и комиссии</span><b>' + money(result.operatingCostUsd + result.paymentFeesUsd) + '</b></div>' +
      '<div><span>Посещения всего</span><b>' + count(result.visitors) + '</b></div>' +
      '<div><span>В том числе приглашения</span><b>' + count(result.viralVisitors) + '</b></div>' +
      '<div><span>Effective active-player K</span><b>' + factor.format(result.activePlayerKFactor) + '</b></div>' +
      '<div><span>Игровые сессии</span><b>' + count(result.sessions) + '</b></div>' +
      '<div><span>Заполненные рекламные показы</span><b>' + count(result.filledAdImpressions) + '</b></div>' +
      '<div><span>Заявки / обработано / очередь</span><b>' + count(result.leads) + ' / ' + count(result.processedLeads) + ' / ' + count(result.unprocessedLeads) + '</b></div>' +
      '<div><span>Потенциал / закрыто / лимит проектов</span><b>' + decimal.format(result.potentialClosedProjects) + ' / ' + decimal.format(result.closedProjects) + ' / ' + count(result.maxProjectsPerMonth) + '</b></div>' +
      '<div><span>Загрузка мощности</span><b>' + percent(result.capacityUtilizationPct) + '</b></div>' +
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
  const targetScenario = requiredMonthlyVisitors === null
    ? null
    : calculateScenario({ ...inputs, monthlyVisitors: requiredMonthlyVisitors }, 'base');
  document.getElementById('base-viral-visitors').textContent = count(base.viralVisitors);
  document.getElementById('base-k-factor').textContent = factor.format(base.activePlayerKFactor);
  const activeKStatus = document.getElementById('active-k-factor-status');
  activeKStatus.textContent = base.activePlayerKFactor < 1
    ? 'K < 1: каждый следующий круг активных игроков затухает в этой модели. Для роста нужны внешний трафик или улучшение доли приглашений, открытия ссылок и запуска игры.'
    : 'K ≥ 1: модель допускает неубывающие приглашённые когорты, но устойчивый рост нужно подтвердить реальными когортными данными.';
  document.getElementById('base-annual-revenue').textContent = money(annualRevenue);
  document.getElementById('annual-target-heading').textContent = money(target);
  document.getElementById('monthly-target-value').textContent = money(target / 12);
  document.getElementById('million-gap').textContent = money(Math.max(0, target - annualRevenue));
  document.getElementById('required-base-visitors').textContent =
    requiredMonthlyVisitors === null ? '—' : count(requiredMonthlyVisitors);
  document.getElementById('target-mix-total').textContent = targetScenario ? money(targetScenario.totalRevenueUsd) : '—';
  document.getElementById('target-mix-ads').textContent = targetScenario ? money(targetScenario.adRevenueUsd) : '—';
  document.getElementById('target-mix-paid').textContent = targetScenario ? money(targetScenario.paidRevenueUsd) : '—';
  document.getElementById('target-mix-subscriptions').textContent = targetScenario ? money(targetScenario.subscriptionRevenueUsd) : '—';
  document.getElementById('target-mix-services').textContent = targetScenario ? money(targetScenario.servicesRevenueUsd) : '—';
  document.getElementById('target-mix-sponsors').textContent = targetScenario ? money(targetScenario.sponsorRevenueUsd) : '—';
  document.getElementById('target-mix-leads-contracts').textContent = targetScenario
    ? count(targetScenario.leads) + ' / ' + count(targetScenario.processedLeads) + ' / ' + decimal.format(targetScenario.closedProjects) + ' из ' + count(targetScenario.maxProjectsPerMonth)
    : '—';
  document.getElementById('target-mix-lead-overflow').textContent = targetScenario
    ? count(targetScenario.unprocessedLeads)
    : '—';
  document.getElementById('target-mix-capacity').textContent = targetScenario
    ? percent(targetScenario.capacityUtilizationPct)
    : '—';
  const targetStatus = document.getElementById('growth-target-status');
  targetStatus.textContent = requiredMonthlyVisitors === null
    ? 'При текущих коэффициентах цели не достичь даже в пределах 1 млрд стартовых посещений в месяц. Проверь долю новых посетителей, лимит обработки заявок, delivery capacity, eCPM, конверсию и спонсорские договоры.'
    : requiredMonthlyVisitors === 0
      ? 'Цель покрывается смоделированными договорами/поступлениями без дополнительного стартового трафика. Это допущение, не подтверждённая выручка.'
      : 'Ориентир: ' + count(requiredMonthlyVisitors) + ' стартовых посещений в месяц. Модель включает расчётные приглашения; фактический трафик и выручку нужно измерить.';
  latestIntelligence = renderIntelligence(inputs, base);
}


function el(tag, className, text) {
  const item = document.createElement(tag);
  if (className) item.className = className;
  if (text !== undefined) item.textContent = String(text);
  return item;
}
function makeRiskRow(label, values) {
  const row = el('div', 'risk-row');
  row.append(el('div', 'risk-row-head', ''));
  row.firstChild.append(el('strong', '', label));
  const stats = el('div', 'risk-values');
  stats.append(el('span', '', 'P10 ' + money(values.p10)), el('span', '', 'P50 ' + money(values.p50)), el('span', '', 'P90 ' + money(values.p90)));
  row.append(stats);
  const track = el('div', 'risk-track');
  track.setAttribute('role', 'img');
  track.setAttribute('aria-label', label + ': P10 ' + money(values.p10) + ', P50 ' + money(values.p50) + ', P90 ' + money(values.p90));
  const min = values.p10;
  const max = values.p90;
  const position = (value) => max > min ? Math.max(0, Math.min(100, (value - min) / (max - min) * 100)) : 50;
  for (const [key, value] of [['p10', values.p10], ['p50', values.p50], ['p90', values.p90]]) {
    const marker = el('span', 'risk-marker ' + key);
    marker.style.left = position(value).toFixed(2) + '%';
    marker.setAttribute('aria-hidden', 'true');
    track.append(marker);
  }
  row.append(track);
  return row;
}
function renderIntelligence(inputs, baseResult) {
  const iterations = Number(document.getElementById('risk-iterations').value) || 1500;
  const simulation = runUncertaintySimulation(inputs, { iterations, seed: RISK_SEED });
  const breakEvenVisitors = calculateBreakEvenMonthlyVisitors(inputs);
  const sensitivity = analyzeSensitivity(inputs, 'base', 20);
  const recommendations = buildDecisionRecommendations(inputs, baseResult, sensitivity);
  document.getElementById('risk-p10').textContent = money(simulation.netOperatingUsd.p10);
  document.getElementById('risk-p50').textContent = money(simulation.netOperatingUsd.p50);
  document.getElementById('risk-p90').textContent = money(simulation.netOperatingUsd.p90);
  document.getElementById('risk-breakeven-visitors').textContent = breakEvenVisitors === null ? 'Не достигается' : count(breakEvenVisitors);
  document.getElementById('risk-break-even-probability').textContent = percent(simulation.probabilityBreakEvenPct);
  document.getElementById('risk-target-probability').textContent = percent(simulation.probabilityAnnualTargetPct);

  const distribution = document.getElementById('risk-distribution');
  distribution.replaceChildren(
    makeRiskRow('Операционный результат / месяц', simulation.netOperatingUsd),
    makeRiskRow('Валовая выручка / месяц', simulation.grossMonthlyRevenueUsd),
    makeRiskRow('Валовая выручка / год', simulation.annualGrossRevenueUsd),
  );

  const sensitivityNode = document.getElementById('sensitivity-list');
  sensitivityNode.replaceChildren();
  const maxImpact = Math.max(1, ...sensitivity.slice(0, 6).map((item) => item.impactUsd));
  for (const item of sensitivity.slice(0, 6)) {
    const row = el('div', 'lever-row');
    const head = el('div', 'lever-head');
    head.append(el('span', '', item.label), el('b', '', money(item.impactUsd)));
    const track = el('div', 'lever-track');
    const fill = el('div', 'lever-fill');
    fill.style.width = Math.max(0, Math.min(100, item.impactUsd / maxImpact * 100)).toFixed(2) + '%';
    track.append(fill);
    const direction = item.favorableDirection === 'increase' ? 'Направление эксперимента: повысить допущение' : 'Направление эксперимента: снизить допущение';
    row.append(head, track, el('p', 'lever-direction', direction));
    sensitivityNode.append(row);
  }

  const recommendationList = document.getElementById('decision-recommendations');
  recommendationList.replaceChildren();
  if (!recommendations.length) {
    recommendationList.append(el('li', 'recommendation', 'Текущая модель не показывает явного перегруза. Следующий шаг — заменить ключевые допущения фактическими когортными данными.'));
  } else {
    for (const item of recommendations) {
      const li = el('li', 'recommendation');
      li.append(el('span', 'priority ' + item.priority, item.priority === 'high' ? 'Высокий приоритет' : 'Проверить'));
      li.append(el('strong', '', item.title), el('p', '', item.detail));
      recommendationList.append(li);
    }
  }
  return {
    schema: 'osgard.decision-intelligence.v1',
    generatedAt: new Date().toISOString(),
    simulation,
    breakEvenMonthlyVisitors: breakEvenVisitors,
    sensitivity,
    recommendations,
  };
}
function readSnapshots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) =>
      item && typeof item.id === 'string' && /^[a-zA-Z0-9_-]{1,80}$/.test(item.id) &&
      typeof item.name === 'string' && item.name.trim().length > 0 &&
      item.inputs && typeof item.inputs === 'object' && !Array.isArray(item.inputs) &&
      typeof item.createdAt === 'string' && Number.isFinite(Date.parse(item.createdAt)))
      .map((item) => ({
        id: item.id,
        name: item.name.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 60) || 'Без названия',
        createdAt: item.createdAt,
        inputs: normalizeInputs(item.inputs),
      }))
      .sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt))
      .slice(0, SNAPSHOT_LIMIT);
  } catch {
    return [];
  }
}
function writeSnapshots(items) {
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(items.slice(0, SNAPSHOT_LIMIT)));
    return true;
  } catch {
    return false;
  }
}
function selectedSnapshot() {
  const id = document.getElementById('saved-snapshots').value;
  return readSnapshots().find((item) => item.id === id) || null;
}
function renderSavedSnapshots() {
  const select = document.getElementById('saved-snapshots');
  const previous = select.value;
  const snapshots = readSnapshots();
  select.replaceChildren(el('option', '', snapshots.length ? 'Выбери версию' : 'Нет сохранённых сценариев'));
  select.firstChild.value = '';
  for (const snapshot of snapshots) {
    const option = el('option', '', snapshot.name + ' · ' + new Date(snapshot.createdAt).toLocaleDateString('ru-RU'));
    option.value = snapshot.id;
    select.append(option);
  }
  if (snapshots.some((item) => item.id === previous)) select.value = previous;
  for (const id of ['load-snapshot', 'compare-snapshot', 'delete-snapshot']) {
    document.getElementById(id).disabled = snapshots.length === 0;
  }
}
function createComparisonItem(label, value, detail) {
  const card = el('div', 'comparison-item');
  card.append(el('span', '', label), el('b', '', value), el('span', '', detail));
  return card;
}
function setSnapshotStatus(message) {
  document.getElementById('snapshot-status').textContent = message;
}
document.getElementById('save-snapshot').addEventListener('click', () => {
  const inputName = document.getElementById('snapshot-name');
  const name = inputName.value.replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, 60) || ('Сценарий ' + (readSnapshots().length + 1));
  const newItem = {
    id: (globalThis.crypto && typeof globalThis.crypto.randomUUID === 'function')
      ? globalThis.crypto.randomUUID().replace(/[^a-zA-Z0-9_-]/g, '')
      : ('snap_' + Date.now().toString(36) + Math.random().toString(36).slice(2, 12)),
    name,
    createdAt: new Date().toISOString(),
    inputs: readInputs(),
  };
  const snapshots = [newItem, ...readSnapshots()].slice(0, SNAPSHOT_LIMIT);
  if (!writeSnapshots(snapshots)) {
    setSnapshotStatus('Браузер не разрешил сохранить сценарий. Проверь доступность localStorage.');
    return;
  }
  inputName.value = '';
  renderSavedSnapshots();
  document.getElementById('saved-snapshots').value = newItem.id;
  setSnapshotStatus('Сценарий сохранён локально. На сервер данные не отправлялись.');
});
document.getElementById('load-snapshot').addEventListener('click', () => {
  const snapshot = selectedSnapshot();
  if (!snapshot) { setSnapshotStatus('Сначала выбери сохранённую версию.'); return; }
  for (const [key, value] of Object.entries(snapshot.inputs)) {
    const field = form.elements.namedItem(key);
    if (field) field.value = String(value);
  }
  render();
  setSnapshotStatus('Загружена версия «' + snapshot.name + '». Все значения остаются локальными.');
});
document.getElementById('compare-snapshot').addEventListener('click', () => {
  const snapshot = selectedSnapshot();
  if (!snapshot) { setSnapshotStatus('Сначала выбери сохранённую версию.'); return; }
  const current = readInputs();
  const savedBase = calculateScenario(snapshot.inputs, 'base');
  const currentBase = calculateScenario(current, 'base');
  const savedRisk = runUncertaintySimulation(snapshot.inputs, { iterations: 500, seed: RISK_SEED });
  const currentRisk = runUncertaintySimulation(current, { iterations: 500, seed: RISK_SEED });
  const container = document.getElementById('snapshot-comparison');
  container.replaceChildren();
  const grid = el('div', 'comparison-grid');
  grid.append(
    createComparisonItem('Δ месячного NET (текущий − сохранённый)', money(currentBase.netOperatingUsd - savedBase.netOperatingUsd), 'Базовый сценарий'),
    createComparisonItem('Δ downside P10', money(currentRisk.netOperatingUsd.p10 - savedRisk.netOperatingUsd.p10), '500 парных прогонов, одинаковый seed'),
    createComparisonItem('Δ годовой валовой выручки', money(currentBase.totalRevenueUsd * 12 - savedBase.totalRevenueUsd * 12), 'Расчётные значения, не фактические продажи'),
  );
  container.append(grid);
  setSnapshotStatus('Сравнение «' + snapshot.name + '» с текущими допущениями рассчитано локально.');
});
document.getElementById('delete-snapshot').addEventListener('click', () => {
  const snapshot = selectedSnapshot();
  if (!snapshot) { setSnapshotStatus('Сначала выбери сохранённую версию.'); return; }
  if (!window.confirm('Удалить локальный сценарий «' + snapshot.name + '»?')) return;
  const kept = readSnapshots().filter((item) => item.id !== snapshot.id);
  if (!writeSnapshots(kept)) { setSnapshotStatus('Не удалось обновить локальное хранилище.'); return; }
  document.getElementById('snapshot-comparison').replaceChildren();
  renderSavedSnapshots();
  setSnapshotStatus('Сценарий удалён из этого браузера.');
});
document.getElementById('risk-iterations').addEventListener('change', render);
document.getElementById('risk-recompute').addEventListener('click', render);
renderSavedSnapshots();

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
    modelVersion: 7,
    note: 'Illustrative scenario only. Decision intelligence contains a seeded triangular-multiplier uncertainty analysis, a break-even traffic calculation and one-at-a-time sensitivity; the ranges are assumptions, not learned probabilities. Subscriptions are calculated as first-year monthly cohorts with churn, separate from one-time purchases; month-12 MRR is shown separately. Checkout, Premium sales and ads are not activated by this model.',
    currency: 'USD',
    generatedAt: new Date().toISOString(),
    inputs,
    growthTarget: { annualRevenueTargetUsd: inputs.annualRevenueTargetUsd, requiredMonthlyStartingVisitors: calculateRequiredMonthlyVisitors(inputs, inputs.annualRevenueTargetUsd) },
    scenarios: SCENARIOS.map((scenario) => ({ label: scenario.label, assumptions: scenario, results: calculateScenario(inputs, scenario.id) })),
    decisionIntelligence: latestIntelligence || renderIntelligence(inputs, calculateScenario(inputs, 'base')),
    savedScenarioCount: readSnapshots().length,
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

exportCsvButton.addEventListener('click', () => {
  const inputs = readInputs();
  const generatedAt = new Date().toISOString();
  const requiredMonthlyStartingVisitors = calculateRequiredMonthlyVisitors(inputs, inputs.annualRevenueTargetUsd);
  const scenarios = SCENARIOS.map((scenario) => ({
    label: scenario.label,
    assumptions: scenario,
    results: calculateScenario(inputs, scenario.id),
  }));
  const csv = buildFinancialCsv({ inputs, scenarios, generatedAt, requiredMonthlyStartingVisitors });
  const blob = new Blob([csv], { type: 'text/csv;charset=utf-8;' });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = 'osgard-games-model.csv';
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
  statusNode.textContent = 'CSV сохранён локально. Это модельные оценки, не фактическая выручка; данные не отправляются на сервер.';
});
render();
