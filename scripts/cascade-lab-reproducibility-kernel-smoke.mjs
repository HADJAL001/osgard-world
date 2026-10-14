import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';

const html = readFileSync(new URL('../public/games/cascade-lab/index.html', import.meta.url), 'utf8');
const source = readFileSync(new URL('../public/games/cascade-lab/reproducibility-kernel.js', import.meta.url), 'utf8');
await import(new URL('../public/games/cascade-lab/reproducibility-kernel.js', import.meta.url));
const api = globalThis.__CASCADELAB026_TEST__;

assert.ok(api && api.version === '0.26.0', 'pure Reproducibility Kernel API must load');
assert.equal(api.improvements.length, 30, 'v0.26 must enumerate exactly 30 improvements');
assert.equal(new Set(api.improvements).size, 30, 'all 30 improvement IDs must be unique');
assert.equal(api.schema, 'osgard.cascade-lab.reproducibility-kernel.v1');
assert.equal(api.contractSchema, 'osgard.cascade-lab.physics-contract.v1');
assert.equal(api.archiveSchema, 'osgard.cascade-lab.reproducibility-archive.v1');
assert.equal(api.engineRevision, 'cascade-physics-v1');
assert.equal(api.maxFrames, 420);
assert.equal(api.maxRuns, 12);
assert.equal(api.maxImportBytes, 900 * 1024);

assert.match(html, /osgard-game-version" content="0\\.26\\.0-reproducibility-kernel"/, 'page metadata must identify v0.26');
assert.match(html, /<title>CASCADE LAB — Premium Physics Lab 0\\.26\\.0<\\/title>/, 'page title must identify v0.26');
assert.ok(html.includes('id="CASCADELAB026"') && html.includes('reproducibility-kernel.js?v=0.26.0') && html.includes('data-cascade-lab-reproducibility="0.26.0"'), 'Reproducibility Kernel must load with cache-busting');
assert.ok(html.includes("schema: 'osgard.cascade-lab.physics-contract.v1'") && html.includes('fixedStepSeconds: WORLD.fixedStep') && html.includes('engineRevision: CASCADE_PHYSICS_ENGINE_REVISION'), 'completed run event must carry a versioned physical contract');
assert.ok(html.includes('const CASCADE_PHYSICS_ENGINE_REVISION = \'cascade-physics-v1\''), 'the physics revision must be explicit');
assert.doesNotMatch(source, /\\b(?:fetch|XMLHttpRequest|sendBeacon)\\s*\\(/, 'Reproducibility Kernel must not upload runs');
assert.ok(!source.includes('.innerHTML'), 'imported archive fields must never be inserted as HTML');
assert.ok(source.includes('cryptographic:false') && source.includes('not a cryptographic signature'), 'the checksum must not be misrepresented as cryptographic proof');
for (const marker of [
  'function canonicalize(', 'function fnv1a(', 'function normalizeContract(', 'function normalizeFrames(',
  'function signatures(', 'function verifyPassport(', 'function validateArchive(', 'function validatePassportEnvelope(',
  'function compareRuns(', 'exact-repeat', 'near-repeat', 'trace-drift', 'different-contract', 'different-blueprint',
  'trajectoryDeviation(', 'MAX_IMPORT_BYTES', 'drawOverlay(', 'aria-live'
]) assert.ok(source.includes(marker), 'Reproducibility Kernel contract missing: ' + marker);

const contract = {
  schema: api.contractSchema, engineRevision: api.engineRevision, fixedStepSeconds: 1/120, maxStepSeconds: 1/30,
  world: {width:1000,height:560,gravity:1060,radius:12},
  physics: {
    startVelocityX:92,fanRangeX:78,fanMinDy:-100,fanMaxDy:48,fanAccelX:410,fanAccelY:520,
    magnetRadius:190,magnetStrength:620,springSpeed:500,springSurfaceCooldown:0.8,
    bumperFieldSpeedX:285,bumperFieldSpeedY:320,bumperFieldCooldown:0.65,bumperFieldDistance:31,
    bumperSurfaceSpeedX:320,bumperSurfaceSpeedY:360,bumperSurfaceCooldown:0.8,
    beltDeviceImpulse:85,beltSurfaceAcceleration:210,dragPer60Hz:0.998,
    minVelocityX:-480,maxVelocityX:520,minVelocityY:-720,maxVelocityY:780,
    fragileImpactLimit:560,switchRadius:31,maxSimulationSeconds:28,checkpointExtraRadius:12,
    goalVerticalTolerance:36,goalMinVerticalVelocity:-150
  },
  level: {
    id:1,start:{x:80,y:100},goal:{x:900,y:460,w:60,h:80},par:1,parTime:3,
    platforms:[{x:0,y:500,w:1000,h:60}],gates:[],
    checkpoints:[{id:'scan-a',label:'Сканер A',x:480,y:360,radius:24,required:true}],
    switchZone:null,fragile:false
  }
};
function makeRun(id, overrides = {}) {
  return {
    id, at:'2026-10-14T10:00:00.000Z', levelId:1, levelTitle:'Контрольный уровень',
    status:'won', mode:'campaign', dailyDate:null, timeSeconds:2, reason:'', grade:'A', par:1, parTime:3,
    gateOpen:false, checkpointsReached:['scan-a'],
    devices:[{type:'spring',x:200,y:300,angle:0}],
    simulationContract:contract,
    trajectory:[
      {t:0,x:80,y:100,vx:92,vy:0,gateOpen:false,checkpoints:[]},
      {t:1,x:200,y:200,vx:100,vy:120,gateOpen:false,checkpoints:[]},
      {t:2,x:900,y:460,vx:0,vy:0,gateOpen:false,checkpoints:['scan-a']}
    ],
    telemetry:{distance:500,peakSpeed:200,impacts:1,contacts:2,activations:1,lastImpactSpeed:120,events:[{type:'spring',label:'Пружина сработала',t:1,x:200,y:300,speed:120}]},
    ...overrides
  };
}

const runA = api.normalizeRun(makeRun('run-a'));
const runB = api.normalizeRun(makeRun('run-b',{at:'2026-10-14T10:01:00.000Z'}));
assert.ok(runA && runB, 'valid run summaries must normalize');
assert.equal(runA.fingerprints.contractFingerprint, runB.fingerprints.contractFingerprint);
assert.equal(runA.fingerprints.blueprintFingerprint, runB.fingerprints.blueprintFingerprint);
assert.equal(runA.fingerprints.traceFingerprint, runB.fingerprints.traceFingerprint);
assert.equal(api.compareRuns(runB,runA).tier,'exact-repeat','same contract + same blueprint + same trace must be an exact repeat');

const driftTrace = makeRun('run-drift',{
  at:'2026-10-14T10:02:00.000Z',timeSeconds:2.25,
  trajectory:[
    {t:0,x:80,y:100,vx:92,vy:0,gateOpen:false,checkpoints:[]},
    {t:1,x:210,y:207,vx:102,vy:120,gateOpen:false,checkpoints:[]},
    {t:2,x:900,y:460,vx:0,vy:0,gateOpen:false,checkpoints:['scan-a']}
  ],
  telemetry:{distance:508,peakSpeed:203,impacts:1,contacts:2,activations:1,lastImpactSpeed:121,events:[{type:'spring',label:'Пружина сработала',t:1,x:200,y:300,speed:120}]}
});
const drift = api.compareRuns(api.normalizeRun(driftTrace),runA);
assert.equal(drift.tier,'trace-drift');
assert.equal(drift.comparable,true);
assert.ok(drift.meanTrajectoryDeviation > 0);
assert.equal(drift.secondsDelta,0.25);

const differentBlueprint = api.normalizeRun(makeRun('run-blueprint',{devices:[{type:'spring',x:220,y:300,angle:0}]}));
assert.equal(api.compareRuns(differentBlueprint,runA).tier,'different-blueprint');
const differentContract = api.normalizeRun(makeRun('run-contract',{
  simulationContract:{...contract,physics:{...contract.physics,fanAccelX:411}}
}));
assert.notEqual(differentContract.fingerprints.contractFingerprint,runA.fingerprints.contractFingerprint);
assert.equal(api.compareRuns(differentContract,runA).tier,'different-contract');
assert.equal(api.compareRuns(api.normalizeRun(makeRun('daily-run',{mode:'daily',dailyDate:'2026-10-14'})),runA).tier,'different-scenario');
assert.equal(api.compareRuns(runA,runA).tier,'same-record');

const verified = api.verifyPassport(runA);
assert.equal(verified.ok,true);
assert.equal(api.verifyPassport({...runA,timeSeconds:9}).ok,false,'editing run duration without updating its digest must be detected');
assert.equal(api.verifyPassport({...runA,simulationContract:{...contract,physics:{...contract.physics,fanAccelX:411}}}).ok,false,'editing physical contract without updating its digest must be detected');

const passportEnvelope = {schema:api.schema,schemaVersion:1,run:runA};
assert.equal(api.validatePassportEnvelope(passportEnvelope).ok,true);
assert.equal(api.validatePassportEnvelope({...passportEnvelope,run:{...runA,grade:'A+'}}).ok,false,'single-passport import must verify stored fingerprints');
const archive = api.validateArchive({schema:api.archiveSchema,schemaVersion:1,runs:[runA,runB]});
assert.equal(archive.ok,true);
assert.equal(archive.archive.runs.length,2);
assert.equal(api.validateArchive({schema:'wrong',schemaVersion:1,runs:[]}).ok,false);
assert.equal(api.validateArchive({schema:api.archiveSchema,schemaVersion:1,runs:[runA,runA]}).ok,false,'duplicate run IDs must be rejected');
const tooMany = Array.from({length:13},(_,i)=>api.normalizeRun(makeRun('run-'+i,{at:new Date(Date.parse('2026-10-14T10:00:00Z')+i*1000).toISOString()})));
assert.equal(api.validateArchive({schema:api.archiveSchema,schemaVersion:1,runs:tooMany}).ok,false,'archive must be capped at 12 runs');
assert.equal(api.validateArchive({schema:api.archiveSchema,schemaVersion:1,runs:[runA],extra:'x'.repeat(920*1024)}).ok,false,'oversized JSON must be rejected');

const frames = Array.from({length:600},(_,i)=>({t:i/120,x:i,y:i/2,vx:1,vy:2,gateOpen:false,checkpoints:[]}));
assert.equal(api.normalizeFrames(frames).length,420,'frame normalization must cap memory and archive size');
assert.equal(api.fnv1a(api.canonicalize({a:1,b:[2,3]})),api.fnv1a(api.canonicalize({b:[2,3],a:1})),'canonical fingerprints must be key-order independent');
assert.notEqual(api.fnv1a(api.canonicalize({a:1})),api.fnv1a(api.canonicalize({a:2})),'different normalized values should change the illustrative fingerprint');

console.log('CASCADE LAB Reproducibility Kernel smoke: PASS — 30 improvements, same-setup gates, exact repeats, drift detection, physics/blueprint fingerprints, tamper checks and bounded local archives.');
