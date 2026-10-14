import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/trajectory-xray.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/trajectory-xray.js', import.meta.url));
const api = globalThis.__CASCADELAB022_TEST__;

assert.ok(api && api.version === '0.22.0', 'Trajectory X-Ray pure API must be available');
assert.equal(api.schema, 'osgard.cascade-lab.trajectory-xray.v1');
assert.equal(api.maxRuns, 18);
assert.equal(api.maxFrames, 420);
assert.equal(api.maxImportBytes, 600 * 1024);
assert.ok(html.includes('name="osgard-game-version" content="0.26.0-counterfactual-foundry"'), 'game metadata must identify the v0.25 application shell');
assert.ok(html.includes('<title>CASCADE LAB — Premium Physics Lab 0.26.0</title>'), 'document title must identify the v0.25 application shell');
assert.ok(html.includes('id="CASCADELAB021"') && html.includes('case-passport.js?v=0.21.0'), 'Case Passport 0.21 must remain integrated');
assert.ok(html.includes('id="CASCADELAB022"') && html.includes('trajectory-xray.js?v=0.22.0') && html.includes('data-cascade-lab-xray="0.22.0"'), 'X-Ray loader must be versioned and cache-busted');
assert.ok(html.includes('id="CASCADELAB024"') && html.includes('mission-director.js?v=0.24.0'), 'Adaptive Mission Director must load after Trajectory X-Ray');
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('counterfactual-foundry.js?v=0.26.0'), 'Counterfactual Foundry must remain integrated after the current evidence layer');
assert.ok(html.includes('trajectory: Array.from({ length: Math.min(420, lastReplay.length) }') && html.includes('checkpoints: Array.isArray(p.checkpoints)'), 'physics event must contain a bounded trace from the real replay frames');
assert.ok(!source.includes('fetch(') && !source.includes('XMLHttpRequest') && !source.includes('sendBeacon('), 'Trajectory X-Ray must not upload runs');
assert.ok(!source.includes('.innerHTML'), 'Trajectory X-Ray must create text-safe DOM nodes');

const trace = [
  { t:0, x:0, y:0, vx:3, vy:4, gateOpen:false, checkpoints:[] },
  { t:1, x:3, y:4, vx:3, vy:4, gateOpen:false, checkpoints:[] },
  { t:2, x:6, y:8, vx:0, vy:0, gateOpen:true, checkpoints:['cp1'] }
];
const baseInput = {
  id:'run-base', at:'2026-10-14T00:00:00.000Z', status:'lost', levelId:2, levelTitle:'Шлюз',
  mode:'campaign', dailyDate:null, reason:'Шлюз остался закрыт', grade:'—', timeSeconds:2,
  par:3, parTime:5, deviceCount:2, gateCount:1, gateOpen:true,
  position:{x:6,y:8}, velocity:{x:0,y:0},
  devices:[{type:'switch',x:300,y:420,angle:0}],
  checkpoints:[{id:'cp1',label:'Сканер',x:6,y:8}], checkpointsReached:['cp1'],
  telemetry:{distance:10,peakSpeed:5,lastImpactSpeed:0,impacts:0,contacts:1,activations:1,
    events:[{type:'switch',label:'Контакт сработал',t:1.5,x:5,y:7,speed:5}]},
  trajectory:trace
};
const base = api.normalizeRun(baseInput);
assert.ok(base, 'valid run with actual trajectory must normalize');
assert.equal(base.trajectory.length,3);
assert.equal(base.telemetry.events[0].label,'Контакт сработал');
assert.equal(api.normalizeRun({...baseInput,trajectory:[{t:0,x:0,y:0}]}),null,'a one-frame trace is insufficient');
assert.equal(api.normalizeRun({...baseInput,levelId:99}),null,'unknown level IDs must be rejected');

const metrics=api.computeMetrics(base);
assert.equal(metrics.distance,10);
assert.equal(metrics.peakSpeed,5);
assert.equal(metrics.frameCount,3);
assert.match(metrics.signature,/^TX22-[0-9A-F]{8}$/);
assert.equal(api.interpolateFrame(base.trajectory,0.5).x,1.5,'frame scrubber interpolation must be continuous');

const shifted=api.normalizeRun({
  ...baseInput,id:'run-shifted',at:'2026-10-14T00:01:00.000Z',status:'won',timeSeconds:1.5,deviceCount:1,
  trajectory:trace.map(p=>({...p,x:p.x+10}))
});
const diff=api.compareRuns(shifted,base);
assert.equal(diff.outcome,'recovered');
assert.equal(diff.timeDelta,-0.5);
assert.equal(diff.devicesDelta,-1);
assert.equal(diff.meanTrajectoryDeviation,10);
assert.equal(api.trajectoryDeviation(base,base),0,'identical traces should have zero spatial deviation');
assert.equal(api.compareRuns(shifted,api.normalizeRun({...baseInput,id:'other-level',levelId:3})),null,'cross-level comparisons must be rejected');
assert.equal(api.compareRuns(shifted,api.normalizeRun({...baseInput,id:'other-mode',mode:'daily'})),null,'cross-mode comparisons must be rejected');

const longTrace=Array.from({length:900},(_,i)=>({t:i/30,x:i,y:i/2,vx:30,vy:15,gateOpen:false,checkpoints:[]}));
const decimated=api.normalizeFrames(longTrace);
assert.equal(decimated.length,420,'long replays must be deterministically bounded to 420 samples');
assert.equal(decimated[0].x,0);
assert.equal(decimated.at(-1).x,899,'frame decimation must retain both endpoints');
assert.ok(decimated.every((p,i)=>i===0||p.t>=decimated[i-1].t),'trace times must be monotonic');

const validArchive=api.validateArchive({schema:api.schema,schemaVersion:1,runs:[base,shifted]});
assert.equal(validArchive.ok,true);
assert.equal(validArchive.archive.runs.length,2);
assert.equal(api.validateArchive({schema:'wrong',schemaVersion:1,runs:[]}).ok,false);
assert.equal(api.validateArchive({schema:api.schema,schemaVersion:1,runs:[base,base]}).ok,false,'duplicate run IDs must be rejected');
assert.equal(api.validateArchive({schema:api.schema,schemaVersion:1,runs:Array.from({length:19},(_,i)=>api.normalizeRun({...baseInput,id:'run-'+i}))}).ok,false,'the archive must be capped at 18 runs');
assert.equal(api.validateArchive({schema:api.schema,schemaVersion:1,runs:[{...base,reason:'x'.repeat(620000)}]}).ok,false,'oversized archives must be rejected');
assert.equal(api.csvCell('=1+1'),'"\'=1+1"','CSV export must prevent spreadsheet formula injection');
assert.equal(api.csvCell('a,"b"'),'"a,""b"""');

console.log('CASCADE LAB Trajectory X-Ray smoke: PASS — real trace contract, bounded sampling, frame interpolation, speed/distance metrics, same-scenario path deviation, archive validation and local-only boundaries.');
