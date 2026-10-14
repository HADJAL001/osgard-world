import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const hypothesis = readFileSync(new URL('../public/games/cascade-lab/hypothesis-lab.js', import.meta.url), 'utf8');
const passport = readFileSync(new URL('../public/games/cascade-lab/case-passport.js', import.meta.url), 'utf8');
const productionRouteMatrix = readFileSync(new URL('./production-route-matrix.mjs', import.meta.url), 'utf8');

assert.match(html, /osgard-game-version" content="0\.23\.0-adaptive-missions"/, 'CASCADE LAB metadata must identify application release 0.23.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.23\.0<\/title>/, 'the browser title must identify application release 0.23.0');
assert.ok(html.includes('id="CASCADELAB017"') && html.includes('data-cascade-lab-delta="0.17.0"') && html.includes('src="./delta-lens.js"'), 'Delta Lens must load as the current experiment layer');
assert.match(html, /id="exportDossierButton"[^>]*>↓ JSON<\/button>/, 'JSON dossier control must be visible');
assert.match(html, /\$\('exportDossierButton'\)\.addEventListener\('click', downloadExperimentDossier\)/, 'JSON control must be wired');
assert.ok(html.includes("application: { name: 'CASCADE LAB', version: '0.23.0' }"), 'local growth report must carry the current 0.22.0 app version');

const functionMatch = html.match(/function downloadExperimentDossier\(\) \{([\s\S]*?)\n\}\n\nfunction draw\(/);
assert.ok(functionMatch, 'experiment dossier exporter must be defined before the renderer');
const exporter = functionMatch[1];
for (const field of [
  "osgard.cascade-lab-experiment-dossier/v1",
  "local-download-only",
  "uploaded: false",
  "shareCode: encodeShare()",
  "samples: sampleRows",
  "entries: eventRows",
  "retainedSampleLimit: 240",
  "retainedEventLimit: 64"
]) assert.ok(exporter.includes(field), `dossier must include ${field}`);
assert.match(exporter, /URL\.createObjectURL/, 'dossier must download a local JSON file');
assert.doesNotMatch(exporter, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'export must not send telemetry over the network');

assert.ok(html.includes('id="CASCADELAB018"') && html.includes('data-cascade-lab-experiment="0.18.0"') && html.includes('hypothesis-lab.js?v=0.18.0'), 'Hypothesis Lab must load as the current experiment layer');
assert.ok(html.includes('id="CASCADELAB020"') && html.includes('data-cascade-lab-studio="0.20.0"') && html.includes('experiment-studio.js?v=0.20.0'), 'Experiment Studio 0.20 must load after the 0.19 Engineering OS');
assert.ok(hypothesis.includes("const SCHEMA = 'osgard.cascade-lab.next-experiment.v1'") && hypothesis.includes('function proposalForPair(pair)') && hypothesis.includes('function reconcilePlan('), 'Hypothesis Lab must plan and observe controlled experiments');
assert.ok(!hypothesis.includes('fetch(') && !hypothesis.includes('XMLHttpRequest') && !hypothesis.includes('sendBeacon'), 'Hypothesis Lab must not upload local history');

assert.match(passport, /\bVERSION\s*=\s*['"]0\.21\.0['"]/, 'Case Passport VERSION marker should be checked independent of const grouping');
assert.match(passport, /\bSCHEMA\s*=\s*['"]osgard\.cascade-lab\.case-passport\.v1['"]/, 'Case Passport SCHEMA marker should be checked independent of const grouping');
assert.ok(passport.includes('function verifyPassport(') && !passport.includes('fetch(') && !passport.includes('sendBeacon('), 'Case Passport must remain a local verifier');
assert.ok(productionRouteMatrix.includes(String.raw`/\bSCHEMA\s*=\s*['"]osgard\.cascade-lab\.case-passport\.v1['"]/.test(content)`) && !productionRouteMatrix.includes("const SCHEMA='osgard.cascade-lab.case-passport.v1'"), 'Production route checking must accept grouped VERSION/SCHEMA constants without false negatives');
new Function(hypothesis);
console.log('CASCADE LAB dossier smoke: PASS — v0.23.0 metadata, local report and Hypothesis Lab wiring.');
