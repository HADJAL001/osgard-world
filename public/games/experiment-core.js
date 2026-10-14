(() => {
'use strict';
const MIN_SESSIONS_PER_VARIANT = 200;
const EXPERIMENTS = Object.freeze({
  'catalog-hero-cta-v1': Object.freeze({
    id: 'catalog-hero-cta-v1',
    version: 1,
    selector: '#catalog-hero-cta',
    weightB: 0.5,
    variants: Object.freeze({
      a: 'Исследовать игры ↘',
      b: 'Найти свой игровой мир ↘'
    })
  })
});
function pickVariant(roll, weightB = 0.5) {
  const value = Number.isFinite(roll) ? Math.min(1, Math.max(0, roll)) : 0.5;
  const weight = Number.isFinite(weightB) ? Math.min(1, Math.max(0, weightB)) : 0.5;
  return value < weight ? 'b' : 'a';
}
function normalizeAssignment(raw, id) {
  if (!raw || typeof raw !== 'object' || Array.isArray(raw)) return null;
  const experiment = EXPERIMENTS[id];
  if (!experiment || raw.schemaVersion !== 1 || raw.experimentId !== experiment.id ||
      raw.version !== experiment.version || !Object.hasOwn(experiment.variants, raw.variant)) return null;
  return { schemaVersion: 1, experimentId: experiment.id, version: experiment.version, variant: raw.variant };
}
function eventSource(id, variant, phase) {
  if (!EXPERIMENTS[id] || !['a', 'b'].includes(variant) || !['exposed', 'converted'].includes(phase)) return '';
  return 'osgard-experiment:' + id + ':' + variant + ':' + phase;
}
function wilson(successes, total, z = 1.96) {
  if (!Number.isFinite(total) || total <= 0) return null;
  const p = Math.min(1, Math.max(0, successes / total));
  const z2 = z * z, denominator = 1 + z2 / total;
  const center = (p + z2 / (2 * total)) / denominator;
  const margin = z * Math.sqrt(p * (1 - p) / total + z2 / (4 * total * total)) / denominator;
  return { low: Math.max(0, center - margin), high: Math.min(1, center + margin) };
}
function summarizeRows(rows, minimumSessions = MIN_SESSIONS_PER_VARIANT) {
  const groups = new Map();
  for (const row of Array.isArray(rows) ? rows : []) {
    const id = typeof row?.experimentId === 'string' ? row.experimentId : '';
    const variant = row?.variant;
    if (!EXPERIMENTS[id] || !['a', 'b'].includes(variant)) continue;
    const exposures = Number(row.exposures), conversions = Number(row.conversions);
    if (!Number.isSafeInteger(exposures) || exposures < 0 ||
        !Number.isSafeInteger(conversions) || conversions < 0) continue;
    if (!groups.has(id)) groups.set(id, {
      experimentId: id,
      a: { exposures: 0, conversions: 0 },
      b: { exposures: 0, conversions: 0 }
    });
    const target = groups.get(id)[variant];
    target.exposures += exposures;
    target.conversions += Math.min(exposures, conversions);
  }
  return [...groups.values()].map(item => {
    const a = item.a, b = item.b;
    const rateA = a.exposures ? a.conversions / a.exposures : 0;
    const rateB = b.exposures ? b.conversions / b.exposures : 0;
    const intervalA = wilson(a.conversions, a.exposures);
    const intervalB = wilson(b.conversions, b.exposures);
    const low = intervalA && intervalB ? (intervalB.low - intervalA.high) * 100 : null;
    const high = intervalA && intervalB ? (intervalB.high - intervalA.low) * 100 : null;
    let status = 'insufficient_sample';
    if (a.exposures >= minimumSessions && b.exposures >= minimumSessions && low !== null) {
      status = low > 0 ? 'signal_b' : high < 0 ? 'signal_a' : 'inconclusive';
    }
    return {
      experimentId: item.experimentId,
      a: { ...a, rate: rateA * 100 },
      b: { ...b, rate: rateB * 100 },
      liftPp: (rateB - rateA) * 100,
      ciLowPp: low,
      ciHighPp: high,
      minimumSessions,
      status
    };
  }).sort((a, b) => a.experimentId.localeCompare(b.experimentId));
}
window.OSGARDExperimentCore = Object.freeze({
  MIN_SESSIONS_PER_VARIANT, EXPERIMENTS, pickVariant, normalizeAssignment, eventSource, summarizeRows
});
})();