import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const xraySource = readFileSync(new URL('../public/games/cascade-lab/trajectory-xray.js', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/differential-lab.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/trajectory-xray.js', import.meta.url));
await import(new URL('../public/games/cascade-lab/differential-lab.js', import.meta.url));
const api = globalThis.__CASCADELAB023_TEST__;
const xray = globalThis.__CASCADELAB022_TEST__;

assert.ok(api && api.version === '0.23.0', 'Differential Lab pure API must be available');
assert.equal(api.schema, 'osgard.cascade-lab.differential-lab.v1');
assert.ok(xray && xray.version === '0.22.0', 'Trajectory X-Ray must remain an integrated data source');
assert.match(html, /osgard-game-version" content="0\.23\.0-differential-lab"/, 'game metadata must identify v0.23.0');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\.23\.0<\/title>/, 'document title must identify v0.23.0');
assert.ok(html.includes('id="CASCADELAB022"') && html.includes('trajectory-xray.js?v=0.22.0'), 'Trajectory X-Ray must remain integrated');
assert.ok(html.includes('id="CASCADELAB023"') && html.includes('differential-lab.js?v=0.23.0') && html.includes('data-cascade-lab-differential="0.23.0"'), 'Differential Lab must load with a cache-busted URL');
assert.ok(html.includes("new CustomEvent('cascade-lab:run-finished'"), 'real game runs must continue to publish replay summaries');
assert.doesNotMatch(source, /\b(?:fetch|XMLHttpRequest|sendBeacon)\s*\(/, 'Differential Lab must never upload history');
assert.ok(!source.includes('.innerHTML'), 'untrusted run values must be rendered with text-safe DOM APIs');
assert.ok(source.includes('window.CASCADELAB022.getRuns()') && source.includes("document.querySelector('.cl-xray')"), 'Differential Lab must consume and follow the local X-Ray archive');
assert.ok(source.includes('NO NETWORK UPLOAD') && source.includes('causalClaim:false'), 'the privacy and no-causality contract must be explicit');
assert.ok(source.includes('if(typeof ctx.roundRect===\'function\')'), 'the blueprint canvas must support browsers without Canvas roundRect');

const trace = [
  {t:0,x:10,y:20,vx:10,vy:0,gateOpen:false,checkpoints:[]},
  {t:1,x:20,y:20,vx:10,vy:0,gateOpen:false,checkpoints:[]},
  {t:2,x:30,y:20,vx:0,vy:0,gateOpen:true,checkpoints:['cp1']}
];
function run(id, overrides={}) {
  return {
    id, at:'2026-10-14T01:00:00.000Z', status:'lost', levelId:2, levelTitle:'Шлюз',
    mode:'campaign', dailyDate:null, reason:'Шлюз не открылся', grade:'—', timeSeconds:2,
    par:3, parTime:4, deviceCount:2, gateCount:1, gateOpen:false,
    position:{x:30,y:20}, velocity:{x:0,y:0},
    devices:[{type:'spring',x:100,y:150,angle:0},{type:'switch',x:300,y:400,angle:0}],
    checkpoints:[{id:'cp1',label:'Сканер',x:30,y:20}], checkpointsReached:[],
    telemetry:{distance:20,peakSpeed:10,lastImpactSpeed:3,impacts:1,contacts:1,activations:1,events:[{type:'switch',label:'Контакт не сработал',t:1.4,x:300,y:400,speed:10}]},
    trajectory:trace.map(p=>({...p})),
    ...overrides
  };
}
const base=run('base');
const moved=run('moved',{status:'won',timeSeconds:1.6,devices:[{type:'spring',x:130,y:150,angle:0},{type:'switch',x:300,y:400,angle:0}],telemetry:{...base.telemetry,peakSpeed:12}});
const moveDiff=api.compareDesign(base,moved);
assert.equal(moveDiff.ok,true);
assert.equal(moveDiff.singleEdit,true,'one device position change should be isolated');
assert.equal(moveDiff.operationCount,1);
assert.deepEqual(moveDiff.factorKeys,['position']);
assert.equal(moveDiff.operations[0].kind,'changed');
assert.equal(moveDiff.operations[0].distance,30);

const rotated=run('rotated',{devices:[{type:'spring',x:100,y:150,angle:0.5},{type:'switch',x:300,y:400,angle:0}]});
const rotateDiff=api.compareDesign(base,rotated);
assert.equal(rotateDiff.singleEdit,true);
assert.deepEqual(rotateDiff.factorKeys,['angle']);
assert.equal(rotateDiff.operations[0].rotated,true);

const added=run('added',{devices:[...base.devices,{type:'fan',x:400,y:300,angle:0}],deviceCount:3});
const addDiff=api.compareDesign(base,added);
assert.equal(addDiff.added,1,'an unmatched variant device must count as added, not removed');
assert.equal(addDiff.removed,0);
assert.equal(addDiff.singleEdit,true);
assert.equal(addDiff.operations[0].kind,'added');

const removed=run('removed',{devices:[base.devices[0]],deviceCount:1});
const removeDiff=api.compareDesign(base,removed);
assert.equal(removeDiff.removed,1,'an unmatched baseline device must count as removed');
assert.equal(removeDiff.added,0);
assert.equal(removeDiff.operations[0].kind,'removed');

const multiple=run('multiple',{devices:[{type:'spring',x:130,y:150,angle:0.4},{type:'switch',x:300,y:400,angle:0.8}]});
const multiDiff=api.compareDesign(base,multiple);
assert.equal(multiDiff.singleEdit,false);
assert.equal(multiDiff.operationCount,2);
assert.ok(multiDiff.factorKeys.includes('position') && multiDiff.factorKeys.includes('angle'));

assert.equal(api.compareDesign(base,run('other-mode',{mode:'daily'})).ok,false,'cross-mode comparisons must be rejected');
assert.equal(api.compareDesign(base,run('other-level',{levelId:4})).ok,false,'cross-level comparisons must be rejected');
assert.equal(api.compareDesign(base,run('same-design',{devices:base.devices.map(d=>({...d}))})).sameDesign,true);
assert.equal(api.compareDesign(base,base).ok,false,'a run must not be compared to itself');
assert.equal(api.observedDelta(base,base).comparable,false,'self-comparisons are not valid observations');
assert.equal(api.fingerprintDesign(base),api.fingerprintDesign(run('clone',{devices:base.devices.map(d=>({...d}))})),'identical layouts must have the same design fingerprint');

const observed=api.observedDelta(base,moved);
assert.equal(observed.comparable,true);
assert.equal(observed.outcome,'recovered');
assert.equal(observed.timeDelta,-0.4);
assert.equal(observed.meanTrajectoryDeviation,0,'the same trace must have zero mean deviation');

const variantSame=run('repeat-1',{at:'2026-10-14T01:00:00.000Z',status:'won',timeSeconds:2});
const variantSame2=run('repeat-2',{at:'2026-10-14T01:01:00.000Z',status:'won',timeSeconds:2.1});
const variantSame3=run('repeat-3',{at:'2026-10-14T01:02:00.000Z',status:'lost',timeSeconds:2.3});
const atlas=api.summarizeRepeatability([variantSame,variantSame2,variantSame3,moved]);
const sameLayout=atlas.find(group=>group.fingerprint===api.fingerprintDesign(variantSame));
assert.equal(sameLayout.runCount,3);
assert.equal(sameLayout.successes,2);
assert.equal(sameLayout.successRate,66.7);
assert.equal(sameLayout.stability,'Исходы различались');

const report=api.buildReport(base,moved,[base,moved,variantSame,variantSame2,variantSame3]);
assert.equal(report.ok,true);
assert.equal(report.study.baselineId,'base');
assert.equal(report.study.variantId,'moved');
assert.equal(report.construction.singleEdit,true);
assert.equal(report.interpretation.causalClaim,false);
assert.ok(report.interpretation.limitations.length>=4);
assert.equal(api.buildReport(base,run('different',{mode:'daily'}),[]).ok,false);

assert.equal(api.csvCell('=1+1'),'"\'=1+1"','CSV export must guard spreadsheet formula injection');
assert.equal(api.csvCell('a,"b"'),'"a,""b"""');

const canonical=api.canonicalDesign(base);
assert.ok(canonical.includes('spring')&&canonical.includes('switch'),'design canonical form must include typed devices');
console.log('CASCADE LAB Differential Lab smoke: PASS — design fingerprints, minimum-cost device matching, add/remove/move/rotate diffs, single-edit eligibility, scenario boundaries, run deltas, repeatability atlas, safe exports and no-network guard.');
