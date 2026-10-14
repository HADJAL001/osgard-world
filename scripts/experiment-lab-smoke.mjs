import assert from "node:assert/strict";
import { readFileSync } from "node:fs";
import { analyzeExperiment, calculateSampleSize, normalizeImport, wilsonInterval } from "../public/games/experiments/model.js";

const page = readFileSync("public/games/experiments/index.html", "utf8");
const runtime = readFileSync("public/games/experiments/experiment-runtime.js", "utf8");
const config = JSON.parse(readFileSync("public/games/experiments/active.json", "utf8"));

assert.ok(page.includes('id="experiment-form"'), "Experiment input form must exist");
assert.ok(page.includes('id="sample-form"'), "Sample-size planner must exist");
assert.ok(page.includes('id="live-form"'), "Protected live aggregate connection must exist");
assert.ok(page.includes("prefers-reduced-motion:reduce"), "Reduced motion preference must be honoured");
assert.ok(page.includes("64 КБ"), "Import size cap must be documented");
assert.ok(runtime.includes("osgard.games.analytics-consent.v1"), "Runtime must use the shared consent key");
assert.ok(runtime.includes("window.OSGARD_CONSENTED_ANALYTICS"), "Runtime must deliver through the existing consented queue");
assert.equal(config.enabled, false, "Production experiment must remain disabled until deliberately activated");
assert.equal(config.experimentId, "catalog-cta-v1", "The configured ID must match the runtime allow-list");

const baseline = analyzeExperiment({
  experimentId: "sample-test",
  guardrailTolerancePct: 1.5,
  variantA: { exposures: 20, conversions: 3, guardrailFailures: 0 },
  variantB: { exposures: 20, conversions: 4, guardrailFailures: 0 },
});
assert.equal(baseline.recommendation, "inconclusive", "Small samples cannot declare winners");
assert.equal(baseline.metrics.enoughObservations, false);

const highSignal = analyzeExperiment({
  experimentId: "catalog-cta-v1",
  guardrailTolerancePct: 1.5,
  variantA: { exposures: 1000, conversions: 100, guardrailFailures: 2 },
  variantB: { exposures: 1000, conversions: 160, guardrailFailures: 3 },
});
assert.equal(highSignal.recommendation, "b-leading", "B may lead only with sufficient sample, CI and p-value signal");
assert.ok(highSignal.metrics.pValue < 0.05);
assert.ok(highSignal.metrics.differenceInterval.low > 0);

const stop = analyzeExperiment({
  experimentId: "safety-test",
  guardrailTolerancePct: 1.5,
  variantA: { exposures: 200, conversions: 30, guardrailFailures: 1 },
  variantB: { exposures: 200, conversions: 50, guardrailFailures: 14 },
});
assert.equal(stop.recommendation, "stop-b", "A protective guardrail must stop B regardless of conversion");

assert.deepEqual(wilsonInterval(0, 0), { low: null, high: null });
assert.ok(wilsonInterval(50, 100).low < 0.5 && wilsonInterval(50, 100).high > 0.5);
const planning = calculateSampleSize({ baselineRatePct: 10, mdePct: 2, alpha: 0.05, power: 0.8 });
assert.ok(planning.observationsPerArm > 100);
assert.equal(planning.totalObservations, planning.observationsPerArm * 2);
assert.throws(() => calculateSampleSize({ baselineRatePct: 0, mdePct: 2, alpha: 0.05, power: 0.8 }), /конверсия/i);
assert.throws(() => analyzeExperiment({ experimentId: "bad key!", guardrailTolerancePct: 1, variantA: { exposures: 2, conversions: 3, guardrailFailures: 0 }, variantB: { exposures: 1, conversions: 0, guardrailFailures: 0 } }), /ключ эксперимента/i);
assert.throws(() => normalizeImport({ experimentId: "safe", variantA: { exposures: 1, conversions: 2, guardrailFailures: 0 }, variantB: { exposures: 1, conversions: 0, guardrailFailures: 0 } }), /не могут превышать/i);
assert.throws(() => analyzeExperiment({ experimentId: "safe", guardrailTolerancePct: 1, variantA: { exposures: 5, conversions: 0, guardrailFailures: 6 }, variantB: { exposures: 5, conversions: 0, guardrailFailures: 0 } }), /число сбоев/i);

console.log("Experiment Intelligence smoke: 16 assertions passed.");
