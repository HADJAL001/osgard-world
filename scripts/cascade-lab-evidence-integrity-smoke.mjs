import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/evidence-integrity.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/evidence-integrity.js', import.meta.url));
const api = globalThis.__CASCADELAB025_TEST__;

assert.ok(api && api.version === '0.25.0', 'Evidence Integrity pure API must be available');
assert.equal(api.schema, 'osgard.cascade-lab.evidence-integrity.v1');
assert.equal(api.archiveSchema, 'osgard.cascade-lab.evidence-integrity-archive.v1');
assert.equal(api.maxAudits, 80);
assert.equal(api.maxImportBytes, 200 * 1024);
assert.match(html, /osgard-game-version" content="0\.25\.0-evidence-integrity"/, 'game metadata must identify 0.25.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.26\.0<\/title>/, 'browser title must identify 0.25.0');
assert.ok(html.includes('id="CASCADELAB024"') && html.includes('mission-director.js?v=0.24.0'), 'Mission Director 0.24 must remain integrated');
assert.ok(html.includes('id="CASCADELAB025"') && html.includes('evidence-integrity.js?v=0.25.0') && html.includes('data-cascade-lab-evidence="0.25.0"'), 'Evidence Integrity must be versioned and cache-busted');
assert.ok(html.includes('new CustomEvent(\'cascade-lab:run-finished\''), 'completed simulations must continue to emit a local run summary');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'the new lab must not send run data over the network');
assert.ok(!source.includes('.innerHTML'), 'the new lab must use text-safe DOM APIs');
for (const marker of [
  'function normalizeRun(', 'function compareBlueprints(', 'function analyzeContrast(',
  'function trajectoryDeviation(', 'function groupSummary(', 'function createReport(',
  'function validateArchive(', 'same-setup-control', 'confounded',
  'single-variable-contrast', 'repeated-single-variable-pattern',
  'Данные описывают наблюдаемую связь', 'MAX_AUDITS = 80', 'MAX_IMPORT_BYTES = 200 * 1024'
]) assert.ok(source.includes(marker), 'Evidence Integrity feature missing: ' + marker);

const trace = (offset = 0) => [
  { t:0, x:100+offset, y:100, vx:10, vy:0, gateOpen:false, checkpoints:[] },
  { t:1, x:150+offset, y:130, vx:5, vy:2, gateOpen:false, checkpoints:[] },
  { t:2, x:205+offset, y:180, vx:0, vy:0, gateOpen:true, checkpoints:['cp1'] }
];
function makeRun(id, overrides = {}) {
  return {
    id, at:'2026-10-14T08:00:00.000Z', status:'won', levelId:1, levelTitle:'Первый каскад',
    mode:'campaign', dailyDate:null, timeSeconds:4, deviceCount:1, grade:'A', par:2, parTime:5,
    devices:[{type:'spring',x:100,y:100,angle:0}],
    trajectory:trace(), telemetry:{peakSpeed:10,lastImpactSpeed:4,distance:140,activations:1,contacts:1},
    ...overrides
  };
}
const base = makeRun('base');
const base2 = makeRun('base-repeat', { at:'2026-10-14T08:01:00.000Z', timeSeconds:4.1 });
const changed = makeRun('changed', {
  at:'2026-10-14T08:02:00.000Z', timeSeconds:3.5,
  devices:[{type:'spring',x:120,y:100,angle:0}], trajectory:trace(20),
  telemetry:{peakSpeed:11,lastImpactSpeed:3,distance:155,activations:1,contacts:1}
});
const changed2 = makeRun('changed-repeat', {
  at:'2026-10-14T08:03:00.000Z', timeSeconds:3.4,
  devices:[{type:'spring',x:120,y:100,angle:0}], trajectory:trace(20),
  telemetry:{peakSpeed:11,lastImpactSpeed:3,distance:155,activations:1,contacts:1}
});
assert.ok(api.normalizeRun(base), 'valid X-Ray run should normalize');
assert.equal(api.normalizeRun({...base,trajectory:[{t:0,x:1,y:2}]}), null, 'a trace needs at least two frames');
assert.equal(api.normalizeRun({...base,levelId:99}), null, 'unknown protocol IDs must be rejected');

assert.equal(api.blueprintSignature(base), api.blueprintSignature(makeRun('reordered',{devices:[{type:'spring',x:100,y:100,angle:Math.PI*2}]})), 'equivalent angle wraps should have a stable setup fingerprint');
const oneChange = api.compareBlueprints(api.normalizeRun(base), api.normalizeRun(changed));
assert.equal(oneChange.changedVariables, 1);
assert.equal(oneChange.changes[0].kind,'position');
assert.equal(oneChange.sameBlueprint,false);

const angled = makeRun('angled', {devices:[{type:'spring',x:120,y:100,angle:0.5}]});
const confounded = api.compareBlueprints(api.normalizeRun(base),api.normalizeRun(angled));
assert.equal(confounded.changedVariables,2,'position and angle changes must be counted separately');

const repeated = api.analyzeContrast(base,changed,[base,base2,changed,changed2]);
assert.equal(repeated.ok,true);
assert.equal(repeated.tier,'repeated-single-variable-pattern');
assert.equal(repeated.baselineGroup.count,2);
assert.equal(repeated.candidateGroup.count,2);
assert.equal(repeated.changedVariables,1);
assert.equal(repeated.comparison.meanTrajectoryDeviation,20);

const control = api.analyzeContrast(base,base2,[base,base2]);
assert.equal(control.tier,'same-setup-control');
assert.equal(control.sameBlueprint,true);

const mixedMode = api.analyzeContrast(base,makeRun('daily',{mode:'daily',dailyDate:'2026-10-14'}),[base]);
assert.equal(mixedMode.tier,'not-comparable','campaign and daily runs must not be compared as the same scenario');
const mixedDate = api.analyzeContrast(makeRun('day1',{mode:'daily',dailyDate:'2026-10-13'}),makeRun('day2',{mode:'daily',dailyDate:'2026-10-14'}),[]);
assert.equal(mixedDate.tier,'not-comparable','daily challenges on different dates must not be compared');

const report = api.createReport(base,changed,[base,base2,changed,changed2],{now:'2026-10-14T08:04:00.000Z'});
assert.ok(report.ok && /^eia_[a-f0-9]{20}$/.test(report.report.id));
assert.equal(report.report.analysis.tier,'repeated-single-variable-pattern');
const archive = api.validateArchive({schema:api.archiveSchema,schemaVersion:1,audits:[report.report]});
assert.equal(archive.ok,true);
assert.equal(archive.archive.audits[0].analysis.tier,'repeated-single-variable-pattern','JSON archive roundtrip must retain the analysis nesting');

assert.equal(api.validateArchive({schema:'wrong',schemaVersion:1,audits:[]}).ok,false);
assert.equal(api.validateArchive({schema:api.archiveSchema,schemaVersion:1,audits:[report.report,report.report]}).ok,false,'duplicate report IDs must be rejected');
const tooMany = Array.from({length:81},(_,i)=>({...report.report,id:'eia_'+String(i).padStart(20,'0')}));
assert.equal(api.validateArchive({schema:api.archiveSchema,schemaVersion:1,audits:tooMany}).ok,false,'the archive must be capped at 80 reports');
const tooLarge = {...report.report,analysis:{...report.report.analysis,interpretation:{...report.report.analysis.interpretation,guidance:'x'.repeat(205000)}}};
assert.equal(api.validateArchive({schema:api.archiveSchema,schemaVersion:1,audits:[tooLarge]}).ok,false,'archives above 200 KiB must be rejected');

assert.equal(api.csvCell('=1+1'), "\"'=1+1\"", 'CSV export must protect against spreadsheet formula injection');
assert.equal(api.csvCell('a,"b"'), '"a,""b"""');
console.log('CASCADE LAB Evidence Integrity smoke: PASS — same-scenario guards, blueprint diffs, repeated contrast, control runs, bounded archives and local-only privacy.');
