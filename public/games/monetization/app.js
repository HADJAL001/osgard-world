import { DEFAULT_INPUTS, SCENARIOS, calculateScenario, calculateRequiredMonthlyVisitors, calculateBreakEvenMonthlyVisitors, calculateMonthlyProjection, calculateSensitivity, normalizeInputs } from './model.js';
import { buildFinancialCsv } from './export.mjs';

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

function readInputs() {
  const data = new FormData(form);
  const input = {};
  for (const [key, value] of data.entries()) input[key] = value;
  return normalizeInputs(input);
}
function money(value) { return usd.format(Number.isFinite(value) ? value : 0); }
function count(value) { return number.format(Number.isFinite(value) ? value : 0); }
function percent(value) { return decimal.format(Number.isFinite(value) ? value : 0) + '%'; }
function safeSnapshotName(value) {
  return String(value || '').replace(/[\u0000-\u001f\u007f]/g, '').replace(/\s+/g, ' ').trim().slice(0, 40);
}
function readSnapshots() {
  try {
    const parsed = JSON.parse(localStorage.getItem(SNAPSHOT_KEY) || '[]');
    if (!Array.isArray(parsed)) return [];
    return parsed.filter((item) => item && typeof item.id === 'string' && typeof item.name === 'string' &&
      Number.isFinite(Date.parse(item.savedAt)) && item.inputs && typeof item.inputs === 'object' && !Array.isArray(item.inputs))
      .slice(0, MAX_SNAPSHOTS)
      .map((item) => ({ id: item.id.slice(0, 80), name: safeSnapshotName(item.name), savedAt: item.savedAt, inputs: normalizeInputs(item.inputs) }))
      .filter((item) => item.name.length > 0);
  } catch { return []; }
}
function renderSnapshots() {
  if (!snapshotSelect) return;
  const snapshots = readSnapshots();
  snapshotSelect.replaceChildren();
  const placeholder = node('option', '', snapshots.length ? 'Выбери сохранённую модель…' : 'Сохранённых моделей пока нет');
  placeholder.value = '';
  snapshotSelect.append(placeholder);
  for (const snapshot of snapshots) {
    const option = node('option', '', snapshot.name + ' · ' + new Date(snapshot.savedAt).toLocaleDateString('ru-RU'));
    option.value = snapshot.id;
    snapshotSelect.append(option);
  }
  snapshotLoad.disabled = snapshots.length === 0;
  snapshotDelete.disabled = snapshots.length === 0;
}
function updateFormValues(values) {
  for (const [key, value] of Object.entries(normalizeInputs(values))) {
    const input = form.elements.namedItem(key);
    if (input && 'value' in input) input.value = String(value);
  }
}
function saveSnapshot() {
  const name = safeSnapshotName(snapshotName?.value);
  if (!name) {
    snapshotStatus.textContent = 'Введи название модели (до 40 символов).';
    snapshotName?.focus();
    return;
  }
  try {
    const snapshots = readSnapshots();
    if (snapshots.length >= MAX_SNAPSHOTS) {
      snapshotStatus.textContent = 'Лимит в 8 моделей достигнут. Удали старую перед сохранением.';
      return;
    }
    if (snapshots.some((item) => item.name.toLocaleLowerCase('ru-RU') === name.toLocaleLowerCase('ru-RU'))) {
      snapshotStatus.textContent = 'Модель с таким названием уже существует. Выбери другое название.';
      return;
    }
    const snapshot = {
      id: (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 10))).slice(0, 80),
      name,
      savedAt: new Date().toISOString(),
      inputs: readInputs(),
    };
    snapshots.unshift(snapshot);
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(snapshots));
    if (snapshotName) snapshotName.value = '';
    renderSnapshots();
    snapshotSelect.value = snapshot.id;
    snapshotStatus.textContent = 'Модель «' + name + '» сохранена только в этом браузере.';
  } catch {
    snapshotStatus.textContent = 'Браузер не разрешил локальное хранение. Экспортируй модель в JSON.';
  }
}
function loadSnapshot() {
  const snapshot = readSnapshots().find((item) => item.id === snapshotSelect.value);
  if (!snapshot) {
    snapshotStatus.textContent = 'Выбери сохранённую модель.';
    return;
  }
  updateFormValues(snapshot.inputs);
  render();
  snapshotStatus.textContent = 'Загружена модель «' + snapshot.name + '». Пересчёт выполнен локально.';
}
function deleteSnapshot() {
  const snapshot = readSnapshots().find((item) => item.id === snapshotSelect.value);
  if (!snapshot) {
    snapshotStatus.textContent = 'Выбери модель, которую нужно удалить.';
    return;
  }
  try {
    localStorage.setItem(SNAPSHOT_KEY, JSON.stringify(readSnapshots().filter((item) => item.id !== snapshot.id)));
    renderSnapshots();
    snapshotStatus.textContent = 'Модель «' + snapshot.name + '» удалена из локального хранилища.';
  } catch {
    snapshotStatus.textContent = 'Не удалось изменить локальное хранилище браузера.';
  }
}
function renderProjectionChart(rows) {
  const chart = document.getElementById('projection-chart');
  const tableBody = document.getElementById('projection-rows');
  chart.replaceChildren();
  tableBody.replaceChildren();
  const maxRevenue = Math.max(1, ...rows.map((row) => row.totalRevenueUsd));
  const minNet = Math.min(0, ...rows.map((row) => row.netOperatingUsd));
  const maxNet = Math.max(1, ...rows.map((row) => row.netOperatingUsd));
  for (const row of rows) {
    const column = node('div', 'projection-column');
    column.title = 'Месяц ' + row.month + ': модельная выручка ' + money(row.totalRevenueUsd);
    const revenue = node('div', 'projection-revenue');
    revenue.style.height = Math.max(3, (row.totalRevenueUsd / maxRevenue) * 100) + '%';
    revenue.setAttribute('aria-hidden', 'true');
    const net = node('div', 'projection-net');
    const netRange = Math.max(1, maxNet - minNet);
    net.style.bottom = ((0 - minNet) / netRange) * 100 + '%';
    net.style.height = Math.max(2, (Math.abs(row.netOperatingUsd) / Math.max(Math.abs(minNet), Math.abs(maxNet))) * 24) + '%';
    net.classList.toggle('negative', row.netOperatingUsd < 0);
    const label = node('span', 'projection-month', 'М' + row.month);
    column.append(revenue, net, label);
    chart.append(column);

    const tr = document.createElement('tr');
    const values = [
      'Месяц ' + row.month, count(row.startingVisitors), count(row.visitorsIncludingInvites),
      count(row.activeSubscribers), money(row.totalRevenueUsd), money(row.paymentFeesUsd),
      money(row.operatingCostUsd), money(row.netOperatingUsd), money(row.cumulativeNetOperatingUsd),
    ];
    for (const value of values) {
      const td = document.createElement('td');
      td.textContent = value;
      tr.append(td);
    }
    tableBody.append(tr);
  }
}
function renderSensitivity(rows, baseline) {
  const target = document.getElementById('sensitivity-results');
  target.replaceChildren();
  const maxImpact = Math.max(1, ...rows.map((row) => row.impactRangeUsd));
  for (const item of rows.slice(0, 8)) {
    const row = node('article', 'sensitivity-row');
    const head = node('div', 'sensitivity-row-head');
    head.append(node('strong', '', item.label), node('span', '', '±' + percent(item.sensitivityPct)));
    const values = node('div', 'sensitivity-deltas');
    const low = node('span', item.lowDeltaUsd < 0 ? 'negative' : 'positive',
      '− input: ' + (item.lowDeltaUsd >= 0 ? '+' : '') + money(item.lowDeltaUsd));
    const high = node('span', item.highDeltaUsd < 0 ? 'negative' : 'positive',
      '+ input: ' + (item.highDeltaUsd >= 0 ? '+' : '') + money(item.highDeltaUsd));
    const track = node('div', 'sensitivity-track');
    const bar = node('span', 'sensitivity-bar');
    bar.style.width = Math.max(1, item.impactRangeUsd / maxImpact * 100) + '%';
    bar.setAttribute('aria-hidden', 'true');
    track.append(bar);
    values.append(low, high);
    row.append(head, values, track);
    target.append(row);
  }
  const status = document.getElementById('sensitivity-status');
  status.textContent = 'Базовый операционный результат: ' + money(baseline) + '. Каждая переменная меняется отдельно на ±20%; это диапазон чувствительности, не вероятность и не прогноз.';
}
function renderDecisionDashboard(inputs, base) {
  const breakEven = calculateBreakEvenMonthlyVisitors(inputs, 'base');
  const projection = calculateMonthlyProjection(inputs, 'base', 12);
  const sensitivity = calculateSensitivity(inputs, 'base', 20);
  document.getElementById('break-even-visitors').textContent = breakEven === null ? 'Недостижимо' : count(breakEven);
  document.getElementById('break-even-status').textContent = breakEven === null
    ? 'При текущих ограничениях результат остаётся отрицательным даже при 1 млрд стартовых посещений в месяц.'
    : breakEven === 0
      ? 'Модель не требует стартового трафика для безубыточности из-за заданных договорных/прочих доходов. Проверь допущения.'
      : 'Минимум стартовых посещений в месяц, при котором расчётный операционный результат ≥ 0.';
  document.getElementById('projection-cumulative-net').textContent = money(projection.cumulativeNetOperatingUsd);
  document.getElementById('projection-month12-net').textContent = money(projection.rows[11].netOperatingUsd);
  document.getElementById('projection-month12-visitors').textContent = count(projection.rows[11].startingVisitors);
  document.getElementById('projection-break-even-month').textContent = projection.firstBreakEvenMonth === null
    ? 'Не достигнута' : 'М' + projection.firstBreakEvenMonth;
  document.getElementById('projection-status').textContent = 'Трафик растёт на ' + percent(inputs.monthlyTrafficGrowthPct) +
    ' в месяц. Прогноз подписчиков рассчитывается по месячным когортам. Все цифры — сценарная модель, а не live KPI.';
  renderProjectionChart(projection.rows);
  renderSensitivity(sensitivity, base.netOperatingUsd);
}
function downloadBlob(filename, content, type) {
  const blob = new Blob([content], { type });
  const href = URL.createObjectURL(blob);
  const link = document.createElement('a');
  link.href = href;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
  window.setTimeout(() => URL.revokeObjectURL(href), 1000);
}
function csvField(value) { return '"' + String(value ?? '').replace(/"/g, '""') + '"'; }

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
  renderDecisionDashboard(inputs, base);
}

form.addEventListener('input', render);
snapshotSave.addEventListener('click', saveSnapshot);
snapshotLoad.addEventListener('click', loadSnapshot);
snapshotDelete.addEventListener('click', deleteSnapshot);
resetButton.addEventListener('click', () => {
  for (const [key, value] of Object.entries(DEFAULT_INPUTS)) {
    const input = form.elements.namedItem(key);
    if (input) input.value = String(value);
  }
  render();
  statusNode.textContent = 'Допущения сброшены к исходным демонстрационным значениям.';
});
exportButton.addEventListener('click', () => {
  const inputs = readInputs();
  const payload = {
    kind: 'osgard-games-business-model',
    modelVersion: 7,
    note: 'Illustrative scenario only. Subscriptions are calculated as first-year monthly cohorts with churn, separate from one-time purchases; month-12 MRR is shown separately. Checkout, Premium sales and ads are not activated by this model.',
    currency: 'USD',
    generatedAt: new Date().toISOString(),
    inputs,
    growthTarget: { annualRevenueTargetUsd: inputs.annualRevenueTargetUsd, requiredMonthlyStartingVisitors: calculateRequiredMonthlyVisitors(inputs, inputs.annualRevenueTargetUsd) },
    breakEven: { baseMonthlyStartingVisitors: calculateBreakEvenMonthlyVisitors(inputs, 'base') },
    monthlyProjection: calculateMonthlyProjection(inputs, 'base', 12),
    sensitivity: calculateSensitivity(inputs, 'base', 20),
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

projectionExportButton.addEventListener('click', () => {
  const inputs = readInputs();
  const projection = calculateMonthlyProjection(inputs, 'base', 12);
  const lines = [
    ['Месяц','Стартовые посещения','Посещения с приглашениями','Активные подписчики (модель)','Валовая выручка USD','Комиссии USD','Операционные расходы USD','Операционный результат USD','Накопленный результат USD'],
    ...projection.rows.map((row) => [row.month,row.startingVisitors,row.visitorsIncludingInvites,row.activeSubscribers.toFixed(2),row.totalRevenueUsd.toFixed(2),row.paymentFeesUsd.toFixed(2),row.operatingCostUsd.toFixed(2),row.netOperatingUsd.toFixed(2),row.cumulativeNetOperatingUsd.toFixed(2)]),
  ];
  downloadBlob('osgard-12-month-projection.csv', '\uFEFF' + lines.map((line) => line.map(csvField).join(',')).join('\r\n'), 'text/csv;charset=utf-8;');
  statusNode.textContent = '12-месячная модель сохранена локально; это расчётные значения, не фактическая выручка.';
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
