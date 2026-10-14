import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');

assert.match(html, /osgard-game-version" content="0\.16\.0-experiment-dossier"/, 'release metadata must identify 0.16.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.16\.0<\/title>/, 'browser title must match release');
assert.match(html, /id="exportDossierButton"[^>]*>↓ JSON<\/button>/, 'JSON dossier control must be visible');
assert.match(html, /\$\('exportDossierButton'\)\.addEventListener\('click', downloadExperimentDossier\)/, 'JSON control must be wired');
assert.match(html, /application: \{ name: 'CASCADE LAB', version: '0\.16\.0' \}/, 'local growth report must carry the current app version');

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

console.log('CASCADE LAB experiment dossier smoke: PASS — v0.16.0 metadata, UI wiring, measurements, event ledger and local-only export.');
