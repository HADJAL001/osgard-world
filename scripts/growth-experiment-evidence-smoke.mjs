import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { spawnSync } from 'node:child_process';
import { fileURLToPath } from 'node:url';
import {
  EXPERIMENT_ID, analyzeExperiment, estimateSampleSizePerVariant, newcombeDifferenceInterval,
  parseExperimentImport, wilsonInterval,
} from '../public/games/experiments/evidence-engine.js';

const html = readFileSync(new URL('../public/games/experiments/index.html', import.meta.url), 'utf8');
const appPath = fileURLToPath(new URL('../public/games/experiments/app.js', import.meta.url));
const app = readFileSync(appPath, 'utf8');
assert.equal(EXPERIMENT_ID, 'catalog-hero-cta-v1');
assert.match(html, /<title>OSGARD PLAY — Лаборатория доказательств роста<\/title>/);
assert.match(html, /id="import-text"/);
assert.match(html, /id="a-exposures"/);
assert.match(html, /id="b-conversions"/);
assert.match(html, /id="export-report"/);
assert.match(html, /LOCAL ONLY · NO UPLOAD/);
assert.match(html, /prefers-reduced-motion:reduce/);
assert.match(html, /\/games\/experiments\/app\.js/);
assert.doesNotMatch(html, /<script[^>]+src="https?:\/\//i, 'Evidence Lab must not load external scripts');
assert.doesNotMatch(app.replace(/\/\/.*$/gm, ''), /localStorage|sessionStorage|fetch\(/, 'Raw source imports stay in memory and never auto-send');
const syntax = spawnSync(process.execPath, ['--check', appPath], { encoding: 'utf8' });
assert.equal(syntax.status, 0, 'App module syntax must parse: ' + syntax.stderr);

const interval = wilsonInterval(60, 1200);
assert.ok(interval && interval.lower < 0.05 && interval.upper > 0.05);
assert.equal(wilsonInterval(0, 0), null);
assert.throws(() => wilsonInterval(11, 10), /не могут превышать/);
const diff = newcombeDifferenceInterval(60, 1200, 73, 1210);
assert.ok(diff && diff.lower < diff.upper);
const plannedSmallEffect = estimateSampleSizePerVariant(5, 2);
const plannedSmallerEffect = estimateSampleSizePerVariant(5, 1);
assert.ok(Number.isInteger(plannedSmallEffect) && plannedSmallEffect > 0);
assert.ok(plannedSmallerEffect > plannedSmallEffect, 'A smaller MDE requires a larger sample');
assert.equal(estimateSampleSizePerVariant(99, 2), null);

const aggregates = parseExperimentImport('variant,exposures,conversions\na,1200,60\nb,1210,73', 'source.csv');
assert.equal(aggregates.variants.a.conversions, 60);
assert.equal(aggregates.variants.b.exposures, 1210);
assert.throws(() => parseExperimentImport('variant,exposures,conversions\na,4,5\nb,4,1', 'bad.csv'), /не могут превышать/);
assert.throws(() => parseExperimentImport('variant,exposures,conversions\na,4,1', 'partial.csv'), /обе строки/);

const jsonAggregate = parseExperimentImport(JSON.stringify({
  experimentId: EXPERIMENT_ID,
  variants: { a: { exposures: 1000, conversions: 50 }, b: { exposures: 1000, conversions: 65 } },
}));
assert.equal(jsonAggregate.variants.b.conversions, 65);

const rawEvents = [
  { event_name: 'product_experiment_exposed', session_id: 'session_aaaaaaaa', source: 'osgard-experiment:catalog-hero-cta-v1:a:exposed' },
  { event_name: 'product_experiment_exposed', session_id: 'session_aaaaaaaa', source: 'osgard-experiment:catalog-hero-cta-v1:a:exposed' },
  { event_name: 'product_experiment_converted', session_id: 'session_aaaaaaaa', source: 'osgard-experiment:catalog-hero-cta-v1:a:converted' },
  { event_name: 'product_experiment_exposed', session_id: 'session_bbbbbbbb', source: 'osgard-experiment:catalog-hero-cta-v1:b:exposed' },
  { event_name: 'product_experiment_converted', session_id: 'session_bbbbbbbb', source: 'osgard-experiment:catalog-hero-cta-v1:b:converted' },
  { event_name: 'product_experiment_converted', session_id: 'session_cccccccc', source: 'osgard-experiment:catalog-hero-cta-v1:b:converted' },
];
const eventAggregate = parseExperimentImport(JSON.stringify({ events: rawEvents }));
assert.deepEqual(eventAggregate.variants, {
  a: { exposures: 1, conversions: 1 },
  b: { exposures: 1, conversions: 1 },
});
assert.ok(eventAggregate.warnings.some(item => /без подтверждённого показа/.test(item)));
const jsonl = rawEvents.map(item => JSON.stringify(item)).join('\n');
assert.equal(parseExperimentImport(jsonl, 'events.jsonl').variants.a.exposures, 1);

const summary = analyzeExperiment(aggregates, { baselineRatePercent: 5, minimumDetectableEffectPp: 2 });
assert.equal(summary.schema, 'osgard.growth-experiment-evidence.v1');
assert.equal(summary.counts.a.exposures, 1200);
assert.equal(summary.planning.baselineRatePercent, 5);
assert.ok(summary.absoluteLift !== null && summary.absoluteLiftInterval95);
assert.ok(summary.warnings.some(item => /не доказывает причинность/.test(item)));
assert.equal(analyzeExperiment([{variant:'a',exposures:0,conversions:0},{variant:'b',exposures:0,conversions:0}]).statusCode, 'no-data');
const guide = readFileSync(new URL('../docs/11_OSGARD_GROWTH_EVIDENCE_LAB.md', import.meta.url), 'utf8');
assert.match(guide, /95%/);
console.log(JSON.stringify({ status: 'PASS', checks: 29, importFormats: ['aggregate-csv', 'aggregate-json', 'event-json', 'event-jsonl', 'event-csv'], stats: ['Wilson 95%', 'Newcombe difference 95%', 'two-proportion sample size'], privacy: 'local-only', sample: plannedSmallEffect }, null, 2));
