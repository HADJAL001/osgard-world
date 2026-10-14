export const EXPERIMENT_ID = 'catalog-hero-cta-v1';
const Z_95 = 1.959963984540054;
const Z_POWER_80 = 0.8416212335729143;
const MAX_COUNT = 1000000000;
const SOURCE_PATTERN = /^osgard-experiment:catalog-hero-cta-v1:([ab]):(exposed|converted)$/;

function finiteCount(value, label) {
  const n = Number(value);
  if (!Number.isSafeInteger(n) || n < 0 || n > MAX_COUNT) throw new Error(label + ' должно быть целым числом от 0 до 1 000 000 000.');
  return n;
}
function normalizeVariant(value) {
  const v = String(value ?? '').trim().toLowerCase();
  if (['a', 'variant_a', 'control', 'контроль', 'контрольная'].includes(v)) return 'a';
  if (['b', 'variant_b', 'treatment', 'тест', 'вариант_b'].includes(v)) return 'b';
  return null;
}
function normalizeAggregates(rows, experimentId = EXPERIMENT_ID, warnings = [], sourceFormat = 'aggregate') {
  if (!Array.isArray(rows)) throw new Error('Ожидается таблица вариантов A/B.');
  const variants = { a: { exposures: 0, conversions: 0 }, b: { exposures: 0, conversions: 0 } };
  const seen = new Set();
  for (const row of rows) {
    if (!row || typeof row !== 'object' || Array.isArray(row)) throw new Error('Строка агрегатов имеет неверный формат.');
    const variant = normalizeVariant(row.variant ?? row.arm ?? row.group);
    if (!variant) throw new Error('В колонке variant допустимы только A и B.');
    if (seen.has(variant)) throw new Error('Для каждого варианта должна быть одна итоговая строка.');
    seen.add(variant);
    const exposures = finiteCount(row.exposures ?? row.exposed ?? row.impressions, 'Показы варианта ' + variant.toUpperCase());
    const conversions = finiteCount(row.conversions ?? row.converted ?? row.goals, 'Конверсии варианта ' + variant.toUpperCase());
    if (conversions > exposures) throw new Error('Конверсии не могут превышать показы: вариант ' + variant.toUpperCase() + '.');
    variants[variant] = { exposures, conversions };
  }
  if (!seen.has('a') || !seen.has('b')) throw new Error('Нужны обе строки: A и B, даже если в одной из них пока нули.');
  const id = String(experimentId || EXPERIMENT_ID).trim();
  if (id !== EXPERIMENT_ID) throw new Error('Этот инструмент сейчас анализирует только ' + EXPERIMENT_ID + '.');
  return { experimentId: id, variants, warnings: [...warnings], sourceFormat };
}
function aggregateEventRows(events) {
  if (!Array.isArray(events) || events.length === 0) throw new Error('Не найден массив событий.');
  const exposed = { a: new Set(), b: new Set() };
  const converted = { a: new Set(), b: new Set() };
  const assignment = new Map();
  const ambiguous = new Set();
  const warnings = [];
  let matched = 0;
  let invalidSessionEvents = 0;
  for (const event of events) {
    if (!event || typeof event !== 'object' || Array.isArray(event)) continue;
    const source = String(event.source ?? '');
    const match = SOURCE_PATTERN.exec(source);
    if (!match) continue;
    const variant = match[1];
    const phase = match[2];
    const name = String(event.name ?? event.event_name ?? event.eventName ?? '');
    const isExposure = name === 'product_experiment_exposed' && phase === 'exposed';
    const isConversion = name === 'product_experiment_converted' && phase === 'converted';
    if (!isExposure && !isConversion) continue;
    matched += 1;
    const session = String(event.sessionId ?? event.session_id ?? '').trim();
    if (!/^[a-zA-Z0-9_-]{12,96}$/.test(session)) {
      invalidSessionEvents += 1;
      continue;
    }
    if (isExposure) {
      const previous = assignment.get(session);
      if (previous && previous !== variant) {
        ambiguous.add(session);
        continue;
      }
      assignment.set(session, variant);
      exposed[variant].add(session);
    } else {
      converted[variant].add(session);
    }
  }
  if (!matched) throw new Error('В импортированном файле не найдены события catalog-hero-cta-v1.');
  if (invalidSessionEvents) warnings.push(invalidSessionEvents + ' событий без допустимого session ID пропущены.');
  if (ambiguous.size) warnings.push(ambiguous.size + ' сессий с показами сразу вариантов A и B исключены из обоих вариантов.');
  let orphanConversions = 0;
  const rows = ['a', 'b'].map(variant => {
    let conversions = 0;
    for (const session of converted[variant]) {
      if (ambiguous.has(session)) continue;
      if (assignment.get(session) !== variant || !exposed[variant].has(session)) {
        orphanConversions += 1;
        continue;
      }
      conversions += 1;
    }
    for (const session of ambiguous) exposed[variant].delete(session);
    return { variant, exposures: exposed[variant].size, conversions };
  });
  if (orphanConversions) warnings.push(orphanConversions + ' конверсий без подтверждённого показа соответствующему варианту исключены.');
  warnings.push('Для событийных данных сессия считается единицей наблюдения; повторные события одной сессии не увеличивают размер выборки.');
  return normalizeAggregates(rows, EXPERIMENT_ID, warnings, 'event-rows');
}
function parseCsvRows(text) {
  const input = String(text || '').replace(/^\uFEFF/, '');
  const rows = [];
  let row = [];
  let field = '';
  let quoted = false;
  for (let i = 0; i < input.length; i += 1) {
    const ch = input[i];
    if (quoted) {
      if (ch === '"' && input[i + 1] === '"') { field += '"'; i += 1; }
      else if (ch === '"') quoted = false;
      else field += ch;
      continue;
    }
    if (ch === '"' && field.length === 0) quoted = true;
    else if (ch === ',') { row.push(field.trim()); field = ''; }
    else if (ch === '\n' || ch === '\r') {
      if (ch === '\r' && input[i + 1] === '\n') i += 1;
      row.push(field.trim());
      if (row.some(cell => cell.length)) rows.push(row);
      row = [];
      field = '';
    } else field += ch;
  }
  if (quoted) throw new Error('CSV содержит незакрытую кавычку.');
  row.push(field.trim());
  if (row.some(cell => cell.length)) rows.push(row);
  if (rows.length < 2) throw new Error('CSV должен содержать строку заголовков и данные.');
  const headers = rows.shift().map(h => h.toLowerCase().replace(/[\s-]+/g, '_'));
  return rows.map(values => Object.fromEntries(headers.map((header, index) => [header, values[index] ?? ''])));
}
function looksLikeAggregateRow(row) {
  return row && typeof row === 'object' &&
    (row.variant !== undefined || row.arm !== undefined || row.group !== undefined) &&
    (row.exposures !== undefined || row.exposed !== undefined || row.impressions !== undefined) &&
    (row.conversions !== undefined || row.converted !== undefined || row.goals !== undefined);
}
export function parseExperimentImport(text, fileName = '') {
  const raw = String(text ?? '').trim();
  if (!raw) throw new Error('Файл или текст импорта пуст.');
  const name = String(fileName || '').toLowerCase();
  let parsed;
  if (name.endsWith('.jsonl') || name.endsWith('.ndjson')) {
    parsed = raw.split(/\r?\n/).filter(Boolean).map((line, index) => {
      try { return JSON.parse(line); } catch { throw new Error('Ошибка JSONL в строке ' + (index + 1) + '.'); }
    });
  } else {
    try { parsed = JSON.parse(raw); }
    catch {
      try { parsed = raw.split(/\r?\n/).filter(line => line.trim().startsWith('{')).map((line, index) => {
        try { return JSON.parse(line); } catch { throw new Error('Ошибка JSONL в строке ' + (index + 1) + '.'); }
      }); }
      catch (error) { if (/Ошибка JSONL/.test(error.message)) throw error; }
      if (!Array.isArray(parsed) || parsed.length === 0) {
        const rows = parseCsvRows(raw);
        const hasAggregateHeaders = ['variant', 'exposures', 'conversions'].every(key => Object.hasOwn(rows[0] || {}, key));
        if (hasAggregateHeaders) return normalizeAggregates(rows, EXPERIMENT_ID, [], 'aggregate-csv');
        if (rows.some(row => SOURCE_PATTERN.test(String(row.source || '')))) return aggregateEventRows(rows.map(row => ({
          ...row,
          name: row.name || row.event_name || row.eventname,
          session_id: row.session_id || row.sessionid || row.session,
        })));
        throw new Error('CSV не распознан. Нужны колонки variant,exposures,conversions или экспорт событий с source и session_id.');
      }
    }
  }
  if (Array.isArray(parsed)) {
    if (parsed.length && parsed.every(looksLikeAggregateRow)) return normalizeAggregates(parsed, EXPERIMENT_ID, [], 'aggregate-json');
    return aggregateEventRows(parsed);
  }
  if (!parsed || typeof parsed !== 'object') throw new Error('JSON должен быть объектом или массивом.');
  const experimentId = parsed.experimentId ?? parsed.experiment_id ?? parsed.experiment ?? EXPERIMENT_ID;
  if (parsed.variants && !Array.isArray(parsed.variants) && typeof parsed.variants === 'object') {
    return normalizeAggregates([
      { variant: 'a', ...parsed.variants.a },
      { variant: 'b', ...parsed.variants.b },
    ], experimentId, [], 'aggregate-json');
  }
  for (const key of ['variants', 'rows', 'results', 'counts']) {
    if (Array.isArray(parsed[key]) && parsed[key].length) {
      if (parsed[key].every(looksLikeAggregateRow)) return normalizeAggregates(parsed[key], experimentId, [], 'aggregate-json');
      if (key === 'rows' || key === 'events') return aggregateEventRows(parsed[key]);
    }
  }
  if (Array.isArray(parsed.events)) return aggregateEventRows(parsed.events);
  throw new Error('JSON не содержит поддерживаемых агрегатов variants или массива events.');
}
export function wilsonInterval(conversions, exposures, z = Z_95) {
  const n = finiteCount(exposures, 'Показы');
  const x = finiteCount(conversions, 'Конверсии');
  if (x > n) throw new Error('Конверсии не могут превышать показы.');
  if (n === 0) return null;
  const p = x / n;
  const z2 = z * z;
  const denominator = 1 + z2 / n;
  const center = (p + z2 / (2 * n)) / denominator;
  const half = z * Math.sqrt((p * (1 - p) / n) + (z2 / (4 * n * n))) / denominator;
  return { lower: Math.max(0, center - half), upper: Math.min(1, center + half) };
}
export function newcombeDifferenceInterval(aConversions, aExposures, bConversions, bExposures) {
  const a = wilsonInterval(aConversions, aExposures);
  const b = wilsonInterval(bConversions, bExposures);
  if (!a || !b) return null;
  const pA = aConversions / aExposures;
  const pB = bConversions / bExposures;
  const difference = pB - pA;
  const lowerMargin = Math.sqrt(((pB - b.lower) ** 2) + ((a.upper - pA) ** 2));
  const upperMargin = Math.sqrt(((b.upper - pB) ** 2) + ((pA - a.lower) ** 2));
  return { lower: Math.max(-1, difference - lowerMargin), upper: Math.min(1, difference + upperMargin) };
}
export function estimateSampleSizePerVariant(baselineRatePercent, minimumDetectableEffectPp) {
  const baseline = Number(baselineRatePercent) / 100;
  const effect = Number(minimumDetectableEffectPp) / 100;
  if (!Number.isFinite(baseline) || !Number.isFinite(effect) || baseline <= 0 || baseline >= 1 || effect <= 0 || baseline + effect >= 1) return null;
  const target = baseline + effect;
  const mean = (baseline + target) / 2;
  const numerator = Z_95 * Math.sqrt(2 * mean * (1 - mean)) +
    Z_POWER_80 * Math.sqrt(baseline * (1 - baseline) + target * (1 - target));
  const n = Math.ceil((numerator * numerator) / (effect * effect));
  return Number.isSafeInteger(n) && n <= MAX_COUNT ? n : null;
}
export function analyzeExperiment(input, plan = {}) {
  const normalized = input && input.variants && input.variants.a && input.variants.b
    ? normalizeAggregates([
      { variant: 'a', ...input.variants.a },
      { variant: 'b', ...input.variants.b },
    ], input.experimentId || EXPERIMENT_ID, input.warnings || [], input.sourceFormat || 'aggregate')
    : normalizeAggregates(input, EXPERIMENT_ID);
  const a = normalized.variants.a;
  const b = normalized.variants.b;
  const rateA = a.exposures ? a.conversions / a.exposures : null;
  const rateB = b.exposures ? b.conversions / b.exposures : null;
  const intervalA = wilsonInterval(a.conversions, a.exposures);
  const intervalB = wilsonInterval(b.conversions, b.exposures);
  const differenceInterval = newcombeDifferenceInterval(a.conversions, a.exposures, b.conversions, b.exposures);
  const difference = rateA === null || rateB === null ? null : rateB - rateA;
  const relativeLift = rateA > 0 && rateB !== null ? (rateB / rateA) - 1 : null;
  const baseline = Number(plan.baselineRatePercent ?? 5);
  const mde = Number(plan.minimumDetectableEffectPp ?? 2);
  const requiredSamplePerVariant = estimateSampleSizePerVariant(baseline, mde);
  const achievedMinimum = Math.min(a.exposures, b.exposures);
  let statusCode = 'no-data';
  let statusLabel = 'Пока нет наблюдений';
  let guidance = 'Введи числа из реального эксперимента или импортируй экспорт. Нули по умолчанию не являются статистикой.';
  if (rateA !== null && rateB !== null && differenceInterval) {
    const excludesZero = differenceInterval.lower > 0 || differenceInterval.upper < 0;
    const reachesPlan = requiredSamplePerVariant !== null && achievedMinimum >= requiredSamplePerVariant;
    if (!excludesZero) {
      statusCode = 'inconclusive';
      statusLabel = 'Данных пока недостаточно для различия';
      guidance = '95% интервал разницы пересекает ноль. Не объявляй победителя: продолжи сбор данных или пересмотри размер эффекта, который имеет деловой смысл.';
    } else if (!reachesPlan) {
      statusCode = 'directional';
      statusLabel = 'Предварительный сигнал — выборка ниже плановой';
      guidance = 'Интервал не пересекает ноль в текущем наборе, но плановая выборка ещё не достигнута. Проверь заранее заданный срок теста, качество рандомизации и защитные метрики; не останавливайся только из-за удачного промежуточного результата.';
    } else if (difference > 0) {
      statusCode = 'b-supported';
      statusLabel = 'Наблюдаемые данные поддерживают вариант B';
      guidance = 'Разница и 95% интервал поддерживают B в этом наборе при выполнении предпосылок теста. Перед раскаткой проверь guardrails, сегменты и корректность назначения вариантов.';
    } else {
      statusCode = 'a-supported';
      statusLabel = 'Наблюдаемые данные поддерживают вариант A';
      guidance = 'Разница и 95% интервал поддерживают A в этом наборе при выполнении предпосылок теста. Перед решением проверь guardrails, сегменты и корректность назначения вариантов.';
    }
  }
  return {
    schema: 'osgard.growth-experiment-evidence.v1',
    experimentId: normalized.experimentId,
    sourceFormat: normalized.sourceFormat,
    counts: { a: { ...a }, b: { ...b } },
    rates: { a: rateA, b: rateB },
    rateIntervals95: { a: intervalA, b: intervalB },
    absoluteLift: difference,
    relativeLift,
    absoluteLiftInterval95: differenceInterval,
    planning: { baselineRatePercent: Number.isFinite(baseline) ? baseline : 5, minimumDetectableEffectPp: Number.isFinite(mde) ? mde : 2, targetSamplePerVariant: requiredSamplePerVariant, achievedMinimumPerVariant: achievedMinimum },
    statusCode,
    statusLabel,
    guidance,
    warnings: [...(normalized.warnings || []), 'Наблюдательная оценка на агрегированных данных не доказывает причинность. Интервал предполагает корректное назначение вариантов и единицу наблюдения без независимых повторов.', 'Избегай многократного просмотра и остановки сразу после желаемого результата; заранее зафиксируй основную метрику, срок и защитные метрики.'],
  };
}
