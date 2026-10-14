import { calculateScenario, normalizeInputs } from './model.js';

const DEFAULT_SEED = 20261015;
const MAX_ITERATIONS = 5000;
const MAX_VISITORS = 1_000_000_000;

function makeRng(seed) {
  let state = (Number.isFinite(Number(seed)) ? Math.trunc(Number(seed)) : DEFAULT_SEED) >>> 0;
  if (state === 0) state = 0x6d2b79f5;
  return function next() {
    state = (state + 0x6d2b79f5) >>> 0;
    let t = state;
    t = Math.imul(t ^ (t >>> 15), t | 1);
    t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

function triangular(rng, min, max, mode) {
  if (min === max) return min;
  const u = rng();
  const split = (mode - min) / (max - min);
  if (u < split) return min + Math.sqrt(u * (max - min) * (mode - min));
  return max - Math.sqrt((1 - u) * (max - min) * (max - mode));
}

function percentile(sorted, fraction) {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction;
  const left = Math.floor(position);
  const right = Math.ceil(position);
  if (left === right) return sorted[left];
  const weight = position - left;
  return sorted[left] + (sorted[right] - sorted[left]) * weight;
}

function summarize(values) {
  const sorted = values.slice().sort((a, b) => a - b);
  const mean = values.reduce((sum, value) => sum + value, 0) / Math.max(1, values.length);
  return {
    p10: percentile(sorted, 0.10),
    p50: percentile(sorted, 0.50),
    p90: percentile(sorted, 0.90),
    mean,
    min: sorted[0] ?? 0,
    max: sorted.at(-1) ?? 0,
  };
}

function boundedIterations(value) {
  const parsed = Number(value);
  return Number.isFinite(parsed) ? Math.max(100, Math.min(MAX_ITERATIONS, Math.round(parsed))) : 1500;
}

/**
 * Deterministic, offline uncertainty analysis of the BASE scenario.
 *
 * This is a decision-support sensitivity model, NOT a calibrated probability forecast.
 * Multipliers are illustrative and deliberately documented in the result. Signed sponsor
 * contracts are held fixed; traffic/conversion/cost assumptions are varied locally.
 */
export function runUncertaintySimulation(input = {}, options = {}) {
  const values = normalizeInputs(input);
  const iterations = boundedIterations(options.iterations ?? 1500);
  const seedNumber = Number(options.seed ?? DEFAULT_SEED);
  const seed = Number.isFinite(seedNumber) ? (Math.trunc(seedNumber) >>> 0) || DEFAULT_SEED : DEFAULT_SEED;
  const rng = makeRng(seed);
  const net = [];
  const gross = [];
  const annualGross = [];
  let breakEvenCount = 0;
  let annualTargetCount = 0;

  for (let index = 0; index < iterations; index += 1) {
    // Shared demand pulse introduces a modest positive correlation between traffic and game starts.
    const demandPulse = triangular(rng, 0.82, 1.18, 1);
    const sample = {
      ...values,
      monthlyVisitors: Math.round(values.monthlyVisitors * demandPulse * triangular(rng, 0.70, 1.35, 1)),
      gameStartRate: values.gameStartRate * demandPulse * triangular(rng, 0.82, 1.18, 1),
      sessionsPerPlayer: values.sessionsPerPlayer * triangular(rng, 0.78, 1.25, 1),
      adSlotsPerSession: values.adSlotsPerSession * triangular(rng, 0.90, 1.10, 1),
      adFillRate: values.adFillRate * triangular(rng, 0.70, 1.25, 1),
      ecpmUsd: values.ecpmUsd * triangular(rng, 0.55, 1.55, 1),
      paidConversionRate: values.paidConversionRate * triangular(rng, 0.55, 1.50, 1),
      subscriptionConversionRatePct: values.subscriptionConversionRatePct * triangular(rng, 0.55, 1.50, 1),
      subscriptionMonthlyChurnPct: values.subscriptionMonthlyChurnPct * triangular(rng, 0.70, 1.35, 1),
      leadRate: values.leadRate * triangular(rng, 0.65, 1.40, 1),
      leadCloseRate: values.leadCloseRate * triangular(rng, 0.60, 1.40, 1),
      averageProjectValueUsd: values.averageProjectValueUsd * triangular(rng, 0.80, 1.20, 1),
      inviteConversionPct: values.inviteConversionPct * triangular(rng, 0.65, 1.40, 1),
      shareRatePct: values.shareRatePct * triangular(rng, 0.65, 1.40, 1),
      monthlyOperatingCostUsd: values.monthlyOperatingCostUsd * triangular(rng, 0.85, 1.30, 1),
    };
    const result = calculateScenario(sample, 'base');
    net.push(result.netOperatingUsd);
    gross.push(result.totalRevenueUsd);
    annualGross.push(result.totalRevenueUsd * 12);
    if (result.netOperatingUsd >= 0) breakEvenCount += 1;
    if (result.totalRevenueUsd * 12 >= values.annualRevenueTargetUsd) annualTargetCount += 1;
  }

  return {
    schema: 'osgard.revenue-uncertainty.v1',
    seed,
    iterations,
    basis: 'illustrative triangular multipliers + correlated demand pulse',
    note: 'Не прогноз и не вероятность из фактических данных. Диапазоны — редактируемые инженерные допущения; фиксированные спонсорские договоры не рандомизируются.',
    netOperatingUsd: summarize(net),
    grossMonthlyRevenueUsd: summarize(gross),
    annualGrossRevenueUsd: summarize(annualGross),
    probabilityBreakEvenPct: breakEvenCount / iterations * 100,
    probabilityAnnualTargetPct: annualTargetCount / iterations * 100,
    annualTargetUsd: values.annualRevenueTargetUsd,
  };
}

/**
 * Smallest integer starting monthly visitor count whose BASE scenario is non-negative.
 * Returns null when the model cannot break even even at the documented search ceiling.
 */
export function calculateBreakEvenMonthlyVisitors(input = {}, maxVisitors = MAX_VISITORS) {
  const values = normalizeInputs(input);
  const ceilingValue = Number(maxVisitors);
  const ceiling = Number.isFinite(ceilingValue)
    ? Math.max(0, Math.min(MAX_VISITORS, Math.floor(ceilingValue)))
    : MAX_VISITORS;
  const netAt = (visitors) => calculateScenario({ ...values, monthlyVisitors: visitors }, 'base').netOperatingUsd;
  if (netAt(0) >= 0) return 0;
  if (ceiling === 0 || netAt(ceiling) < 0) return null;
  let low = 0;
  let high = ceiling;
  while (low + 1 < high) {
    const middle = Math.floor((low + high) / 2);
    if (netAt(middle) >= 0) high = middle;
    else low = middle;
  }
  return high;
}

const SENSITIVITY_DRIVERS = Object.freeze([
  { key: 'monthlyVisitors', label: 'Стартовый трафик', kind: 'traffic' },
  { key: 'gameStartRate', label: 'Конверсия в запуск игры', kind: 'conversion' },
  { key: 'sessionsPerPlayer', label: 'Сессии на игрока', kind: 'retention' },
  { key: 'ecpmUsd', label: 'Рекламный eCPM', kind: 'monetization' },
  { key: 'adFillRate', label: 'Заполнение рекламы', kind: 'monetization' },
  { key: 'paidConversionRate', label: 'Конверсия в разовую покупку', kind: 'conversion' },
  { key: 'subscriptionConversionRatePct', label: 'Конверсия в Premium', kind: 'conversion' },
  { key: 'subscriptionMonthlyChurnPct', label: 'Месячный отток Premium', kind: 'retention', inverse: true },
  { key: 'leadRate', label: 'Конверсия в заявку', kind: 'services' },
  { key: 'leadCloseRate', label: 'Закрытие заявок в проекты', kind: 'services' },
  { key: 'maxProjectsPerMonth', label: 'Мощность команды', kind: 'capacity' },
  { key: 'averageProjectValueUsd', label: 'Средний чек проекта', kind: 'services' },
  { key: 'monthlyOperatingCostUsd', label: 'Операционные расходы', kind: 'costs', inverse: true },
]);

export function analyzeSensitivity(input = {}, scenarioId = 'base', shockPct = 20) {
  const values = normalizeInputs(input);
  const shock = Number.isFinite(Number(shockPct)) ? Math.max(5, Math.min(40, Number(shockPct))) / 100 : 0.20;
  const baseline = calculateScenario(values, scenarioId).netOperatingUsd;
  return SENSITIVITY_DRIVERS.map((driver) => {
    const original = values[driver.key];
    const lowRaw = original * (1 - shock);
    const highRaw = original * (1 + shock);
    const lowInputs = { ...values, [driver.key]: lowRaw };
    const highInputs = { ...values, [driver.key]: highRaw };
    // If a lever is exactly zero, only test a small, explicit seed change for its upper bound.
    if (original === 0) {
      const seedChange = driver.key === 'monthlyVisitors' ? 100
        : driver.key === 'maxProjectsPerMonth' ? 1
          : driver.key === 'monthlyOperatingCostUsd' ? 100
            : driver.key === 'averageProjectValueUsd' ? 100
              : 1;
      highInputs[driver.key] = seedChange;
    }
    const lowNet = calculateScenario(lowInputs, scenarioId).netOperatingUsd;
    const highNet = calculateScenario(highInputs, scenarioId).netOperatingUsd;
    const improvement = highNet >= lowNet ? 'increase' : 'decrease';
    return {
      ...driver,
      baselineValue: original,
      lowNetOperatingUsd: lowNet,
      highNetOperatingUsd: highNet,
      deltaAtLowUsd: lowNet - baseline,
      deltaAtHighUsd: highNet - baseline,
      impactUsd: Math.abs(highNet - lowNet),
      favorableDirection: driver.inverse ? (improvement === 'increase' ? 'decrease' : 'increase') : improvement,
      shockPct: shock * 100,
    };
  }).sort((a, b) => b.impactUsd - a.impactUsd);
}

export function buildDecisionRecommendations(input = {}, baseResult = calculateScenario(input, 'base'), sensitivity = analyzeSensitivity(input)) {
  const values = normalizeInputs(input);
  const items = [];
  if (baseResult.unprocessedLeads > 0) {
    items.push({
      priority: 'high',
      title: 'Сначала разгрузи очередь заявок',
      detail: 'Модель показывает ' + Math.round(baseResult.unprocessedLeads).toLocaleString('ru-RU') + ' необработанных заявок за месяц. Дополнительный трафик может увеличить очередь, а не прибыль.',
    });
  }
  if (values.maxProjectsPerMonth > 0 && baseResult.capacityUtilizationPct >= 90) {
    items.push({
      priority: 'high',
      title: 'Проверь пропускную способность команды',
      detail: 'Загрузка проектной мощности ' + Math.round(baseResult.capacityUtilizationPct) + '%. Увеличивать поток заявок стоит только после проверки сроков выполнения и качества.',
    });
  }
  if (baseResult.activePlayerKFactor < 1 && values.shareRatePct > 0) {
    items.push({
      priority: 'medium',
      title: 'Проверь цикл приглашений экспериментом',
      detail: 'Модельный active-player K ниже 1. Измерь долю игроков, которые делятся, открытие приглашения и запуск игры по когортам; не считай расчётный K фактическим.',
    });
  }
  const top = sensitivity[0];
  if (top && items.length < 3) {
    const direction = top.favorableDirection === 'increase' ? 'увеличить' : 'снизить';
    items.push({
      priority: 'medium',
      title: 'Самый чувствительный рычаг: ' + top.label,
      detail: 'Изменение этого допущения на ±' + Math.round(top.shockPct) + '% даёт разницу около ' + Math.round(top.impactUsd).toLocaleString('ru-RU') + ' USD в месячном операционном результате. Следующий тест: ' + direction + ' показатель и проверить результат на реальных данных.',
    });
  }
  if (baseResult.netOperatingUsd < 0 && items.length < 3) {
    items.push({
      priority: 'high',
      title: 'Сначала добейся безубыточности',
      detail: 'Базовый сценарий отрицателен. Не трактуй оптимистичный сценарий как план до подтверждения конверсий, стоимости привлечения и переменных расходов.',
    });
  }
  return items.slice(0, 3);
}
