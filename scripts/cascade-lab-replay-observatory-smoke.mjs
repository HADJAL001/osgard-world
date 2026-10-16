import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
const root=new URL('../public/games/cascade-lab/',import.meta.url);
const html=readFileSync(new URL('index.html',root),'utf8');
const worker=readFileSync(new URL('service-worker.js',root),'utf8');
const source=readFileSync(new URL('replay-observatory.js',root),'utf8');
await import(new URL('replay-observatory.js',root));
const api=globalThis.__CASCADELAB026_TEST__;
assert.ok(api&&api.version==='0.26.0','Replay Observatory API must be exposed for deterministic tests');
assert.equal(api.schema,'osgard.cascade-lab.replay-observatory.v1');
assert.equal(api.maxRuns,30);
assert.equal(api.maxFrames,420);
assert.ok(html.includes('id="CASCADELAB026"')&&html.includes('replay-observatory.js?v=0.26.0'),'v0.26 loader must be cache-busted and integrated');
assert.ok(html.includes('name="osgard-game-version" content="0.26.0-replay-observatory"'),'game metadata must match replay release');
assert.ok(!source.includes('fetch(')&&!source.includes('XMLHttpRequest')&&!source.includes('sendBeacon(')&&!source.includes('.innerHTML'),'module must remain local-only and use safe DOM text rendering');
assert.ok(worker.includes('./replay-observatory.js?v=0.26.0'),'new module must be pre-cached for offline use');
const makeRun=(overrides={})=>({
 schema:'osgard.cascade-lab.run-summary/v1',id:'run-a',at:'2026-10-16T10:00:00.000Z',levelId:1,levelTitle:'Первый каскад',
 status:'won',timeSeconds:2,grade:'A',mode:'campaign',
 devices:[{type:'spring',x:20,y:40,angle:0}],
 checkpointsReached:['cp1'],
 trajectory:[
  {t:0,x:0,y:0,vx:0,vy:0,gateOpen:false,checkpoints:[]},
  {t:1,x:5,y:6,vx:4,vy:5,gateOpen:false,checkpoints:[]},
  {t:2,x:12,y:15,vx:0,vy:0,gateOpen:true,checkpoints:['cp1']}
 ],
 telemetry:{distance:20,peakSpeed:7,impacts:1,activations:2,events:[{type:'gate',label:'Шлюз открыт',t:1.8,x:12,y:15,speed:0}]},
 ...overrides
});
const a=api.normalize(makeRun());
assert.ok(a);
assert.equal(a.levelId,1);
assert.equal(a.status,'won');
assert.equal(a.quality.score,100);
assert.equal(a.quality.grade,'STRONG');
assert.equal(a.metrics.frameCount,3);
assert.equal(a.metrics.eventCount,1);
assert.equal(a.metrics.peakSpeed,7);
assert.equal(a.duration,2);
assert.equal(a.blueprintFingerprint,api.normalize(makeRun({id:'run-b'})).blueprintFingerprint,'blueprint fingerprint must ignore run ID');
assert.equal(a.traceFingerprint,api.normalize(makeRun({id:'run-b'})).traceFingerprint,'trace fingerprint must be deterministic');
const b=api.normalize(makeRun({id:'run-b',at:'2026-10-16T10:01:00.000Z',trajectory:[
 {t:0,x:0,y:0,vx:0,vy:0,gateOpen:false,checkpoints:[]},
 {t:1,x:5.5,y:6,vx:4,vy:5,gateOpen:false,checkpoints:[]},
 {t:2,x:12.5,y:15,vx:0,vy:0,gateOpen:true,checkpoints:['cp1']}
]}));
const c=api.compareRuns(a,b);
assert.equal(c.ok,true);
assert.equal(c.sameBlueprint,true);
assert.equal(c.verdict,'TRACE_STABLE');
assert.equal(c.confidence,'HIGH');
assert.ok(c.meanTrajectoryDeviation>0&&c.meanTrajectoryDeviation<2);
assert.equal(api.compareRuns(a,api.normalize(makeRun({levelId:2}))).ok,false,'cross-level comparison must be rejected');
const bad=api.normalize(makeRun({trajectory:[{t:2,x:0,y:0},{t:1,x:0,y:0}],telemetry:{events:[]}}));
assert.ok(bad.quality.score<100);
assert.ok(bad.quality.issues.some(x=>x.includes('назад')));
assert.equal(api.normalize({status:'unknown',levelId:1,at:'2026-10-16T10:00:00Z'}),null);
const archive={schema:api.archiveSchema,schemaVersion:1,runs:[a,b]};
assert.equal(api.validateArchive(archive).ok,true);
assert.equal(api.validateArchive({schema:'wrong',schemaVersion:1,runs:[]}).ok,false);
assert.equal(api.validateArchive({...archive,runs:[a,a]}).ok,false,'duplicate IDs must be rejected');
assert.equal(api.validateArchive({...archive,runs:Array.from({length:31},(_,i)=>({...a,id:'r'+i}))}).ok,false,'archive must be bounded to 30 runs');
const restored=api.validateArchive({schema:api.archiveSchema,schemaVersion:1,runs:[a]});
assert.equal(restored.ok,true);
assert.equal(restored.runs[0].events.length,a.events.length,'JSON archive roundtrip must preserve event telemetry');
assert.equal(restored.runs[0].duration,a.duration,'JSON archive roundtrip must preserve duration');
assert.equal(api.hash(api.canonical({b:2,a:1})),api.hash(api.canonical({a:1,b:2})),'canonical fingerprint must ignore object key order');
console.log('CASCADE LAB Replay Observatory smoke: PASS — deterministic fingerprints, data-quality grading, same-level trajectory drift, bounded archive validation, telemetry roundtrip and local-only privacy.');
