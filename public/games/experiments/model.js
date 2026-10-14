const SLUG_PATTERN = /^[a-z0-9-]{1,40}$/;

function validInteger(value, label) {
  const number = Number(value);
  if (!Number.isSafeInteger(number) || number < 0 || number > 1000000000) {
    throw new Error(label + " должно быть целым числом от 0 до 1 000 000 000.");
  }
  return number;
}

function validateArm(raw, label) {
  const exposures = validInteger(raw && raw.exposures, label + ": показы");
  const conversions = validInteger(raw && raw.conversions, label + ": целевые действия");
  const guardrailFailures = validInteger(raw && raw.guardrailFailures, label + ": сбои");
  if (conversions > exposures) throw new Error(label + ": целевые действия не могут превышать число показов.");
  if (guardrailFailures > exposures) throw new Error(label + ": число сбоев не может превышать число показов.");
  return { exposures, conversions, guardrailFailures };
}

export function wilsonInterval(successes, total, z = 1.959963984540054) {
  if (!Number.isFinite(successes) || !Number.isFinite(total) || total <= 0 || successes < 0 || successes > total) {
    return { low: null, high: null };
  }
  const p = successes / total;
  const z2 = z * z;
  const denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const radius = z * Math.sqrt((p * (1 - p) / total) + (z2 / (4 * total * total))) / denominator;
  return { low: Math.max(0, center - radius), high: Math.min(1, center + radius) };
}

function normalCdf(value) {
  const x = Math.abs(value) / Math.sqrt(2);
  const t = 1 / (1 + 0.3275911 * x);
  const a1 = 0.254829592;
  const a2 = -0.284496736;
  const a3 = 1.421413741;
  const a4 = -1.453152027;
  const a5 = 1.061405429;
  const erf = 1 - (((((a5 * t + a4) * t) + a3) * t + a2) * t + a1) * t * Math.exp(-x * x);
  return 0.5 * (1 + (value < 0 ? -erf : erf));
}

export function analyzeExperiment(input) {
  const experimentId = String(input && input.experimentId || "untitled").trim();
  if (!SLUG_PATTERN.test(experimentId)) throw new Error("Ключ эксперимента должен соответствовать a-z, 0-9 и дефису (до 40 символов).");
  const variantA = validateArm(input && input.variantA, "Вариант A");
  const variantB = validateArm(input && input.variantB, "Вариант B");
  const tolerance = Number(input && input.guardrailTolerancePct);
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 50) throw new Error("Граница ухудшения сбоев должна быть от 0 до 50 процентных пунктов.");

  const rateA = variantA.exposures ? variantA.conversions / variantA.exposures : null;
  const rateB = variantB.exposures ? variantB.conversions / variantB.exposures : null;
  const intervalA = rateA === null ? { low: null, high: null } : wilsonInterval(variantA.conversions, variantA.exposures);
  const intervalB = rateB === null ? { low: null, high: null } : wilsonInterval(variantB.conversions, variantB.exposures);
  const enoughObservations = variantA.exposures >= 100 && variantB.exposures >= 100;
  const enoughConversions = variantA.conversions >= 10 && variantB.conversions >= 10;
  let difference = null;
  let differenceInterval = { low: null, high: null };
  let pValue = null;
  let relativeUplift = null;

  if (rateA !== null && rateB !== null) {
    difference = rateB - rateA;
    relativeUplift = rateA > 0 ? difference / rateA : null;
    differenceInterval = {
      low: difference - Math.sqrt(Math.pow(rateB - intervalB.low, 2) + Math.pow(intervalA.high - rateA, 2)),
      high: difference + Math.sqrt(Math.pow(intervalB.high - rateB, 2) + Math.pow(rateA - intervalA.low, 2)),
    };
    const total = variantA.exposures + variantB.exposures;
    const pooled = total ? (variantA.conversions + variantB.conversions) / total : 0;
    const standardError = Math.sqrt(pooled * (1 - pooled) * (
      (variantA.exposures ? 1 / variantA.exposures : 0) +
      (variantB.exposures ? 1 / variantB.exposures : 0)
    ));
    if (standardError > 0 && Number.isFinite(standardError)) {
      const zScore = difference / standardError;
      pValue = Math.max(0, Math.min(1, 2 * (1 - normalCdf(Math.abs(zScore)))));
    } else if (difference === 0) {
      pValue = 1;
    } else {
      pValue = 0;
    }
  }

  const guardrailRateA = variantA.exposures ? variantA.guardrailFailures / variantA.exposures : null;
  const guardrailRateB = variantB.exposures ? variantB.guardrailFailures / variantB.exposures : null;
  const guardrailBreach = guardrailRateA !== null && guardrailRateB !== null &&
    guardrailRateB > guardrailRateA + tolerance / 100;
  let recommendation = "inconclusive";
  let explanation = "Недостаточно оснований для выбора. Проверь качество экспозиции, завершённость события и заранее заданный план анализа.";
  if (guardrailBreach) {
    recommendation = "stop-b";
    explanation = "Вариант B превысил допустимое ухудшение защитной метрики. Приостанови его и разберись с причиной независимо от конверсии.";
  } else if (!enoughObservations || !enoughConversions) {
    explanation = "Выборка ещё мала: для предварительного решения требуется не менее 100 показов и 10 целевых действий на каждый вариант.";
  } else if (pValue !== null && pValue < 0.05 && differenceInterval.low > 0) {
    recommendation = "b-leading";
    explanation = "B показывает статистический сигнал роста при выполненных минимальных порогах и без обнаруженного нарушения защитной метрики. Это предварительный сигнал, не гарантия причинности.";
  } else if (pValue !== null && pValue < 0.05 && differenceInterval.high < 0) {
    recommendation = "a-leading";
    explanation = "Контроль A показывает более высокую конверсию по текущей выборке. Не переключай трафик автоматически: проверь сегменты, реализацию и корректность измерений.";
  } else {
    explanation = "Разница пока неубедительна: интервал пересекает ноль либо p-value не ниже 0,05. Не выбирай победителя по одному только проценту конверсии.";
  }

  return {
    schema: "osgard.experiment-analysis.v1",
    experimentId,
    variantA,
    variantB,
    metrics: {
      rateA, rateB, intervalA, intervalB, difference, differenceInterval,
      relativeUplift, pValue, guardrailRateA, guardrailRateB,
      enoughObservations, enoughConversions, guardrailBreach,
    },
    recommendation,
    explanation,
    thresholds: { minExposuresPerArm: 100, minConversionsPerArm: 10, alpha: 0.05, guardrailTolerancePct: tolerance },
    method: "Wilson 95% intervals for each rate; Newcombe-style interval for difference; approximate two-sided pooled two-proportion z-test. Use as decision support, not a guarantee of causality.",
  };
}

export function calculateSampleSize(options = {}) {
  const baselinePct = Number(options.baselineRatePct);
  const mdePct = Number(options.mdePct);
  const alpha = Number(options.alpha);
  const power = Number(options.power);
  if (!Number.isFinite(baselinePct) || baselinePct <= 0 || baselinePct >= 100) {
    throw new Error("Базовая конверсия должна быть больше 0% и меньше 100%.");
  }
  if (!Number.isFinite(mdePct) || mdePct <= 0 || baselinePct + mdePct >= 100) {
    throw new Error("Эффект должен быть положительным, а базовая конверсия плюс эффект — меньше 100%.");
  }
  const alphaZ = alpha === 0.05 ? 1.959963984540054 : alpha === 0.1 ? 1.6448536269514722 : NaN;
  const powerZ = power === 0.8 ? 0.8416212335729143 : power === 0.9 ? 1.2815515655446004 : NaN;
  if (!Number.isFinite(alphaZ) || !Number.isFinite(powerZ)) throw new Error("Выбери поддерживаемые значения alpha и мощности.");
  const p1 = baselinePct / 100;
  const p2 = (baselinePct + mdePct) / 100;
  const pBar = (p1 + p2) / 2;
  const numerator = alphaZ * Math.sqrt(2 * pBar * (1 - pBar)) +
    powerZ * Math.sqrt(p1 * (1 - p1) + p2 * (1 - p2));
  const perArm = Math.ceil((numerator * numerator) / Math.pow(p2 - p1, 2));
  return {
    schema: "osgard.experiment-sample-size.v1",
    inputs: { baselineRatePct: baselinePct, mdePct, alpha, power },
    observationsPerArm: perArm,
    totalObservations: perArm * 2,
    note: "Approximate normal-theory planning estimate. Does not account for repeated looks, clustering, multiple tests, seasonality or non-compliance.",
  };
}

export function normalizeImport(payload) {
  if (!payload || typeof payload !== "object" || Array.isArray(payload)) throw new Error("Экспорт должен быть объектом JSON.");
  const source = payload.input && typeof payload.input === "object" ? payload.input : payload;
  const experimentId = String(source.experimentId || "").trim();
  if (!SLUG_PATTERN.test(experimentId)) throw new Error("В файле отсутствует корректный ключ эксперимента.");
  const a = validateArm(source.variantA, "Вариант A");
  const b = validateArm(source.variantB, "Вариант B");
  const tolerance = Number(source.guardrailTolerancePct ?? 1.5);
  if (!Number.isFinite(tolerance) || tolerance < 0 || tolerance > 50) throw new Error("В файле недопустимая граница защитной метрики.");
  return { experimentId, variantA: a, variantB: b, guardrailTolerancePct: tolerance };
}
