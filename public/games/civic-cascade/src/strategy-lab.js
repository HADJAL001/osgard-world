/** Pure helpers for the local, privacy-preserving strategy comparison lab. */
export const STRATEGY_HISTORY_LIMIT = 18;

const METRICS = Object.freeze([
  { key: 'score', label: 'Очки операции', format: value => Math.round(value).toLocaleString('ru-RU'), higherIsBetter: true },
  { key: 'rescuedPct', label: 'Эвакуация', format: value => `${Math.round(value)}%`, higherIsBetter: true },
  { key: 'water', label: 'Уровень воды', format: value => `${Math.round(value)}%`, higherIsBetter: false },
  { key: 'grid', label: 'Энергосеть', format: value => `${Math.round(value)}%`, higherIsBetter: true },
  { key: 'access', label: 'Доступ служб', format: value => `${Math.round(value)}%`, higherIsBetter: true },
  { key: 'congestion', label: 'Заторы', format: value => `${Math.round(value)}%`, higherIsBetter: false },
  { key: 'integrity', label: 'Целостность', format: value => `${Math.round(value)}%`, higherIsBetter: true },
  { key: 'failureCount', label: 'Активные отказы в финале', format: value => Math.round(value).toString(), higherIsBetter: false },
]);

function finite(value, fallback = 0) {
  return Number.isFinite(Number(value)) ? Number(value) : fallback;
}

export function summarizeStrategyRun(result, scenario, metadata = {}) {
  if (!result || !scenario || !Number.isFinite(Number(result.score))) return null;
  const cascade = result.cascade && typeof result.cascade === 'object' ? result.cascade : {};
  const failureKeys = ['substationFlooded', 'signalOutage', 'pumpPowerCut', 'roadWashout'];
  const activeFailures = failureKeys.filter(key => cascade[key] === true);
  const completedAt = typeof metadata.completedAt === 'string' ? metadata.completedAt : new Date().toISOString();
  const id = typeof metadata.id === 'string' && metadata.id.length ? metadata.id : `${scenario.id}-${Date.parse(completedAt) || Date.now()}-${Math.round(finite(result.score))}`;
  return {
    id,
    scenarioId: String(scenario.id || 'unknown'),
    scenarioCode: String(scenario.code || ''),
    district: String(scenario.district || scenario.id || 'Сценарий'),
    completedAt,
    score: finite(result.score),
    grade: String(result.grade || '—'),
    rescuedPct: finite(result.rescuedPct),
    rescued: finite(result.rescued),
    population: finite(result.population),
    water: finite(result.water),
    grid: finite(result.grid),
    access: finite(result.access),
    congestion: finite(result.congestion),
    integrity: finite(result.integrity),
    crisisStage: String(result.crisisStage || 'unknown'),
    failureCount: activeFailures.length,
    activeFailures,
    interventions: Array.isArray(result.interventions) ? result.interventions.slice(0, 3).map(item => ({
      tool: String(item.tool || ''), target: String(item.target || ''), at: String(item.at || ''),
    })) : [],
    repairs: Array.isArray(result.repairs) ? result.repairs.slice(0, 8).map(item => ({
      system: String(item.system || ''), target: String(item.target || ''), at: String(item.at || ''),
    })) : [],
    repairTeamsUsed: finite(result.repairTeamsUsed),
    repairTeamsRemaining: finite(result.repairTeamsRemaining),
  };
}

export function normalizeStrategyHistory(value, limit = STRATEGY_HISTORY_LIMIT) {
  if (!Array.isArray(value)) return [];
  const clean = [];
  const seen = new Set();
  for (const raw of value) {
    if (!raw || typeof raw !== 'object' || typeof raw.id !== 'string' || seen.has(raw.id)) continue;
    if (!Number.isFinite(Number(raw.score)) || typeof raw.scenarioId !== 'string') continue;
    seen.add(raw.id);
    clean.push({
      id: raw.id,
      scenarioId: raw.scenarioId,
      scenarioCode: String(raw.scenarioCode || ''),
      district: String(raw.district || raw.scenarioId),
      completedAt: typeof raw.completedAt === 'string' ? raw.completedAt : '',
      score: finite(raw.score), grade: String(raw.grade || '—'),
      rescuedPct: finite(raw.rescuedPct), rescued: finite(raw.rescued), population: finite(raw.population),
      water: finite(raw.water), grid: finite(raw.grid), access: finite(raw.access), congestion: finite(raw.congestion), integrity: finite(raw.integrity),
      crisisStage: String(raw.crisisStage || 'unknown'), failureCount: Math.max(0, finite(raw.failureCount)),
      activeFailures: Array.isArray(raw.activeFailures) ? raw.activeFailures.filter(item => typeof item === 'string').slice(0, 4) : [],
      interventions: Array.isArray(raw.interventions) ? raw.interventions.slice(0, 3).map(item => ({ tool: String(item?.tool || ''), target: String(item?.target || ''), at: String(item?.at || '') })) : [],
      repairs: Array.isArray(raw.repairs) ? raw.repairs.slice(0, 8).map(item => ({ system: String(item?.system || ''), target: String(item?.target || ''), at: String(item?.at || '') })) : [],
      repairTeamsUsed: Math.max(0, finite(raw.repairTeamsUsed)), repairTeamsRemaining: Math.max(0, finite(raw.repairTeamsRemaining)),
    });
  }
  return clean.sort((a, b) => Date.parse(b.completedAt || '') - Date.parse(a.completedAt || '')).slice(0, Math.max(1, limit));
}

export function appendStrategyRun(history, run, limit = STRATEGY_HISTORY_LIMIT) {
  if (!run || typeof run.id !== 'string') return normalizeStrategyHistory(history, limit);
  return normalizeStrategyHistory([run, ...(Array.isArray(history) ? history : []).filter(item => item?.id !== run.id)], limit);
}

export function compareStrategyRuns(current, baseline) {
  if (!current || !baseline || current.scenarioId !== baseline.scenarioId || current.id === baseline.id) return { ok: false, reason: 'Для сравнения нужны две разные попытки одного сценария.' };
  const metrics = METRICS.map(metric => {
    const currentValue = finite(current[metric.key]);
    const baselineValue = finite(baseline[metric.key]);
    const delta = Number((currentValue - baselineValue).toFixed(2));
    const tolerance = metric.key === 'score' ? 1 : 0.5;
    const rawBetter = metric.higherIsBetter ? delta > tolerance : delta < -tolerance;
    const rawWorse = metric.higherIsBetter ? delta < -tolerance : delta > tolerance;
    return { ...metric, currentValue, baselineValue, delta, outcome: rawBetter ? 'better' : rawWorse ? 'worse' : 'similar' };
  });
  const scoreDelta = current.score - baseline.score;
  const rescueDelta = current.rescuedPct - baseline.rescuedPct;
  const failureDelta = current.failureCount - baseline.failureCount;
  const insights = [];
  if (Math.abs(scoreDelta) >= 1) insights.push(scoreDelta > 0 ? `Итоговый результат вырос на ${Math.round(scoreDelta).toLocaleString('ru-RU')} очков.` : `Итоговый результат снизился на ${Math.abs(Math.round(scoreDelta)).toLocaleString('ru-RU')} очков.`);
  if (Math.abs(rescueDelta) >= 1) insights.push(rescueDelta > 0 ? `Эвакуация улучшилась на ${Math.round(rescueDelta)} процентных пунктов.` : `Доля эвакуации снизилась на ${Math.abs(Math.round(rescueDelta))} процентных пунктов.`);
  if (failureDelta !== 0) insights.push(failureDelta < 0 ? `К финалу осталось на ${Math.abs(failureDelta)} меньше активных отказов.` : `К финалу осталось на ${failureDelta} больше активных отказов.`);
  const changedInterventions = JSON.stringify(current.interventions) !== JSON.stringify(baseline.interventions);
  if (changedInterventions) insights.push('Набор или порядок вмешательств отличается — сравните время и цели в протоколах обеих попыток.');
  if (!insights.length) insights.push('Результаты близки по основным показателям. Попробуйте изменить момент или цель одного вмешательства.');
  return { ok: true, currentId: current.id, baselineId: baseline.id, scoreDelta: Number(scoreDelta.toFixed(2)), metrics, insights, changedInterventions };
}

export function formatStrategyDate(value) {
  const date = new Date(value);
  if (!Number.isFinite(date.getTime())) return 'дата неизвестна';
  return new Intl.DateTimeFormat('ru-RU', { day: '2-digit', month: '2-digit', hour: '2-digit', minute: '2-digit' }).format(date);
}