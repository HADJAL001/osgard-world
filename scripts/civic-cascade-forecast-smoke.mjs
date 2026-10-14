import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../public/games/civic-cascade/index.html', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../public/games/civic-cascade/release.json', import.meta.url), 'utf8'))
const check = (value, message) => assert.ok(value, message)

assert.equal(manifest.gameId, 'civic-cascade')
assert.equal(manifest.version, '3.4.0', 'release manifest must match this regression suite')
assert.equal(manifest.buildContract?.cascadeForecast?.enabled, true)
assert.deepEqual(manifest.buildContract?.cascadeForecast?.horizonsGameSeconds, [30, 60, 90])
assert.equal(manifest.buildContract?.cascadeForecast?.randomIncidentsForecasted, false)
assert.equal(manifest.buildContract?.infrastructureNetwork?.enabled, true)
assert.equal(manifest.buildContract?.infrastructureNetwork?.nodeCount, 6)
assert.equal(manifest.buildContract?.infrastructureNetwork?.directedDependencies, 6)
assert.equal(manifest.buildContract?.infrastructureNetwork?.checkpointSchema, 2)
assert.equal(manifest.buildContract?.adaptiveCrisisDirector?.enabled, true)
assert.equal(manifest.buildContract?.adaptiveCrisisDirector?.criticalThreshold, 45)
assert.equal(manifest.buildContract?.operationDebrief?.enabled, true)
assert.equal(manifest.buildContract?.operationDebrief?.maxEvents, 20)
assert.equal(manifest.buildContract?.operationDebrief?.counterfactualClaims, false)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.enabled, true)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.algorithm, 'deterministic bounded beam search')
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.maxCommands, 4)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.beamWidth, 6)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.localOnly, true)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.callsOpenAIAPI, false)
assert.deepEqual(manifest.buildContract?.autonomousDoctrinePlanner?.forecastHorizonsGameSeconds, [30, 60, 90])
assert.deepEqual(manifest.buildContract?.autonomousDoctrinePlanner?.robustnessProfiles, ['water-surge-mild','water-surge-moderate','water-surge-severe','grid-overload-mild','grid-overload-moderate','grid-overload-severe','weak-node-shock-mild','weak-node-shock-moderate','weak-node-shock-severe'])
assert.deepEqual(manifest.buildContract?.autonomousDoctrinePlanner?.robustnessFamilies, ['water-surge','grid-overload','weak-node-shock'])
assert.deepEqual(manifest.buildContract?.autonomousDoctrinePlanner?.stressSeverityLevels, ['mild','moderate','severe'])
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.robustnessProfileCount, 9)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.comparesThreeSeverityLevelsPerFamily, true)
assert.deepEqual(manifest.buildContract?.autonomousDoctrinePlanner?.severityScaleFactors, [0.5,1,1.5])
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.stressRankingUsesAllSeverityLevels, true)
assert.equal(manifest.buildContract?.decisionDossier?.modelVersion, '3.4.0')
assert.equal(manifest.buildContract?.decisionAssurance?.enabled, true)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.reserveAwareScoring, true)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.minimumSupplyReserve, 15)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.minimumCrewReserve, 1)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.leaveOneCommandOutAttribution, true)
assert.deepEqual(manifest.buildContract?.autonomousDoctrinePlanner?.fullStressRiskTrajectories, [0,30,60,90])
assert.equal(manifest.buildContract?.decisionDossier?.stressProfileCount, 9)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.robustnessCandidateLimit, 8)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.reranksCandidatesByStressAdjustedScore, true)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.comparesAgainstNoInterventionUnderSameStress, true)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.stressChangesOnlyClonedStates, true)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.decisionPortfolio, 'bounded-pareto-frontier')
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.portfolioLimit, 3)
assert.equal(manifest.buildContract?.autonomousDoctrinePlanner?.explainsCandidateTradeoffs, true)
assert.equal(manifest.buildContract?.decisionDossier?.enabled, true)
assert.equal(manifest.buildContract?.decisionDossier?.tracksNoPersonalData, true)
assert.equal(manifest.buildContract?.decisionDossier?.schema, 'osgard.civic-cascade.decision-dossier/v1')
assert.equal(manifest.buildContract?.decisionDossier?.exportFormat, 'application/json')
assert.equal(manifest.buildContract?.decisionDossier?.payloadIntegrityHash, 'SHA-256')
assert.equal(manifest.buildContract?.decisionDossier?.verifierEnabled, true)
assert.equal(manifest.buildContract?.decisionDossier?.maxImportBytes, 1048576)
assert.equal(manifest.buildContract?.decisionDossier?.importedPlanExecution, false)
assert.equal(manifest.buildContract?.decisionDossier?.hashScope, 'canonical recursively key-sorted JSON payload without exportMetadata')
assert.equal(manifest.buildContract?.dossierVerification?.enabled, true)
assert.equal(manifest.buildContract?.dossierVerification?.maxDepth, 32)
assert.equal(manifest.buildContract?.dossierVerification?.maxNodes, 50000)
assert.equal(manifest.buildContract?.dossierVerification?.neverExecutesImportedOrders, true)
assert.equal(manifest.buildContract?.dossierVerification?.sendsTelemetry, false)
assert.equal(manifest.buildContract?.dossierVerification?.networkRequests, false)
assert.equal(manifest.buildContract?.decisionDossier?.localOnly, true)
assert.equal(manifest.buildContract?.decisionDossier?.userInitiatedDownloadOnly, true)
assert.equal(manifest.buildContract?.decisionDossier?.sendsTelemetry, false)
assert.equal(manifest.buildContract?.decisionDossier?.includesPersonalData, false)
assert.deepEqual(manifest.buildContract?.adaptiveCrisisDirector?.nodes, ['substation','pump','bridge','hospital','shelter'])

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique')
for (const id of [
  'cc-cascade-forecast', 'cc-cascade-30', 'cc-cascade-60', 'cc-cascade-90',
  'cc-cascade-wait-30', 'cc-cascade-plan-30', 'cc-cascade-wait-90',
  'cc-cascade-plan-90', 'cc-cascade-note', 'cc-node-inspector', 'cc-node-health',
  'cc-node-health-bar', 'cc-node-status', 'cc-node-chain', 'cc-node-effect', 'cc-adaptive-crisis',
  'cc-causal-debrief', 'cc-causal-summary', 'cc-causal-count', 'cc-causal-risk-change', 'cc-causal-weakest', 'cc-causal-best', 'cc-causal-ledger',
  'cc-doctrine-lab', 'cc-doctrine-mode', 'cc-doctrine-run', 'cc-doctrine-status', 'cc-doctrine-results', 'cc-doctrine-apply', 'cc-doctrine-reset', 'cc-doctrine-export', 'cc-doctrine-import-file', 'cc-doctrine-verify-import', 'cc-doctrine-verification-result'
]) check(ids.includes(id), 'missing forecast UI element: ' + id)

const mainScript = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1]
check(mainScript, 'inline game script must exist')
new Function(mainScript)
check(html.includes('window.crypto.subtle.digest'), 'decision dossier export must compute SHA-256 over the canonical payload')
check(html.includes('function exportDoctrineDossier()'), 'decision dossier export handler must be present')

function extractBetween(startMarker, endMarker) {
  const start = html.indexOf(startMarker)
  const end = html.indexOf(endMarker, start)
  check(start >= 0 && end > start, 'could not extract source section: ' + startMarker)
  return html.slice(start, end)
}
const literal = (pattern, description) => {
  const match = html.match(pattern)
  check(match, 'could not find ' + description)
  return new Function('return (' + match[1] + ')')()
}
const scenarios = literal(/const scenarioData=(\{[\s\S]*?\n\});/, 'scenario definitions')
const nodes = literal(/const nodes=(\[[\s\S]*?\n\]);/, 'city nodes')
const dependencies = literal(/const NODE_DEPENDENCIES=(\[[\s\S]*?\n\]);/, 'directed infrastructure dependencies')
const actions = literal(/const PLAN_ACTIONS=(\{[^\n]+\});/, 'command action definitions')
const riskSource = html.match(/function projectedRisk\(s\)\{[^\n]+\}/)?.[0]
check(riskSource, 'projectedRisk helper must exist')
const clamp = (value, min = 0, max = 100) => Math.max(min, Math.min(max, value))
const infrastructureSource = extractBetween('function seedNodeIntegrity(s)', 'let state={},selected=')
const infrastructure = new Function('clamp', 'nodes', 'NODE_DEPENDENCIES',
  infrastructureSource + '\nreturn { seedNodeIntegrity, ensureNodeIntegrity, applyNodeActionIntegrity, advanceNodeIntegrity };'
)(clamp, nodes, dependencies)
const { seedNodeIntegrity, ensureNodeIntegrity, applyNodeActionIntegrity, advanceNodeIntegrity } = infrastructure
const causalSource = extractBetween('function operationSnapshot(s)', 'function objectiveState()')
const causal = new Function('clamp', 'nodes', 'ensureNodeIntegrity', 'clock', 'elapsed', causalSource + '\nreturn { operationSnapshot, cleanOperationSnapshot, operationDelta, recordOperationEvent };')(clamp, nodes, ensureNodeIntegrity, seconds => 'T+' + seconds, 7)
const { operationSnapshot, cleanOperationSnapshot, recordOperationEvent } = causal
const projectedRisk = new Function('clamp', riskSource + '\nreturn projectedRisk;')(clamp)
const directSource = extractBetween('function simulatePlannedOrders(orders)', 'function planCrewDemand')
const simulateDirect = state => new Function(
  'state', 'PLAN_ACTIONS', 'clamp', 'nodes', 'projectedRisk', 'ensureNodeIntegrity', 'applyNodeActionIntegrity',
  directSource + '\nreturn simulatePlannedOrders;'
)(state, actions, clamp, nodes, projectedRisk, ensureNodeIntegrity, applyNodeActionIntegrity)
const pathSource = extractBetween('function simulateCascadingPath(source,horizons)', 'function renderCascadeForecast')
const simulatePath = startElapsed => new Function(
  'elapsed', 'clamp', 'projectedRisk', 'nodes', 'ensureNodeIntegrity', 'advanceNodeIntegrity',
  pathSource + '\nreturn simulateCascadingPath;'
)(startElapsed, clamp, projectedRisk, nodes, ensureNodeIntegrity, advanceNodeIntegrity)

const doctrineSource = extractBetween('function doctrineObjectiveScore', 'let doctrineResult=null')
const dossierSource = extractBetween('function buildDoctrineDossierPayload', 'async function exportDoctrineDossier')
const planner = new Function('nodes', 'PLAN_ACTIONS', 'clamp',
  doctrineSource + '\nreturn {searchDoctrinePlans, doctrineDominates, doctrineParetoPortfolio, doctrineStressProfiles, canonicalDossierStringify, validateDoctrineDossierStructure, assessDoctrineDossierIntegrity, validateDoctrineForecast, doctrineRiskExposure, analyzeDoctrineCommandContributions, assessDoctrineSafety};'
)(nodes, actions, clamp)
const {searchDoctrinePlans, doctrineDominates, doctrineParetoPortfolio, doctrineStressProfiles, canonicalDossierStringify, validateDoctrineDossierStructure, assessDoctrineDossierIntegrity, validateDoctrineForecast, doctrineRiskExposure, analyzeDoctrineCommandContributions, assessDoctrineSafety} = planner
const buildDoctrineDossierPayload = new Function('canonicalDossierStringify', dossierSource + '\nreturn buildDoctrineDossierPayload;')(canonicalDossierStringify)
const makeState = scenario => {
  const state = {
    ...scenarios[scenario], scenario, crews: 4, maxCrews: 4,
    openedRoutes: scenario === 'blockade' ? 1 : 2,
    repairs: 0, pumps: 0, stabilized: 0, actionCount: 0, score: 0
  }
  state.nodeIntegrity = seedNodeIntegrity(state)
  state.nodeOutages = Object.fromEntries(nodes.map(node => [node.id, false]))
  state.nodeIncidentFlags = Object.fromEntries(nodes.map(node => [node.id, false]))
  state.pendingNodeIncidents = []
  state.operationLedger = []
  state.operationBaseline = operationSnapshot(state)
  return state
}

for (const scenario of ['flood', 'blackout', 'blockade']) {
  const state = makeState(scenario)
  const samples = simulatePath(0)(state, [30, 60, 90])
  assert.deepEqual(samples.map(sample => sample.seconds), [30, 60, 90])
  for (const sample of samples) {
    for (const node of nodes) {
      const health = sample.nodeIntegrity[node.id]
      check(Number.isFinite(health) && health >= 0 && health <= 100, scenario + ' node ' + node.id + ' health must remain bounded')
    }
    check(Number.isFinite(sample.weakestIntegrity) && sample.weakestIntegrity >= 0 && sample.weakestIntegrity <= 100, scenario + ' weakest-node forecast must be bounded')
    for (const metric of ['water', 'grid', 'access', 'risk']) {
      check(Number.isFinite(sample[metric]), scenario + ' ' + sample.seconds + 's ' + metric + ' must be finite')
      check(sample[metric] >= 0 && sample[metric] <= 100, scenario + ' ' + metric + ' must remain bounded')
    }
  }
}

const doctrineResults = {}
const dossierVerifierCases = {}
const verifierBase = makeState('flood')
const verifierSearch = searchDoctrinePlans(verifierBase, 'balanced', 'hub', simulateDirect(verifierBase), simulatePath(0), nodes, actions)
const verifierPayload = buildDoctrineDossierPayload(verifierBase, verifierSearch, '3.4.0-auditable-dossier-verifier', scenarios, nodes, 0)
const canonicalA = canonicalDossierStringify({z:1,a:{y:2,x:3}})
const canonicalB = canonicalDossierStringify({a:{x:3,y:2},z:1})
assert.equal(canonicalA, canonicalB, 'canonical JSON must ignore object key insertion order')
const verifierDigest = createHash('sha256').update(canonicalDossierStringify(verifierPayload), 'utf8').digest('hex')
const verifierDossier = {...verifierPayload, exportMetadata:{exportedAtUtc:'2026-10-14T00:00:00.000Z',integrity:{algorithm:'SHA-256',scope:'canonical recursively key-sorted JSON payload without exportMetadata',status:'computed',digest:verifierDigest}}}
const currentValidation = validateDoctrineDossierStructure(verifierDossier, '3.4.0')
assert.equal(currentValidation.valid, true, 'a correctly structured current dossier must pass validation: '+currentValidation.errors.join('; '))
assert.equal(currentValidation.modelCompatible, true)
assert.equal(assessDoctrineDossierIntegrity(verifierDossier,verifierDigest).verified,true)
const reorderedPayload = Object.fromEntries(Object.entries(verifierPayload).reverse())
const reorderedDossier = {...reorderedPayload,exportMetadata:verifierDossier.exportMetadata}
const reorderedDigest=createHash('sha256').update(canonicalDossierStringify(reorderedPayload),'utf8').digest('hex')
assert.equal(reorderedDigest,verifierDigest,'key order must not change the canonical payload hash')
assert.equal(assessDoctrineDossierIntegrity(reorderedDossier,reorderedDigest).verified,true,'key-reordered JSON must preserve its verified digest')
assert.equal(validateDoctrineDossierStructure(reorderedDossier,'3.4.0').valid,true,'key-reordered source-state JSON must preserve its diagnostic fingerprint')
const alteredDossier=JSON.parse(JSON.stringify(verifierDossier))
alteredDossier.candidates[0].scores.stressAdjusted+=1
const alteredPayload=(({exportMetadata,...payload})=>payload)(alteredDossier)
const alteredDigest=createHash('sha256').update(canonicalDossierStringify(alteredPayload),'utf8').digest('hex')
assert.equal(assessDoctrineDossierIntegrity(verifierDossier,alteredDigest).verified,false,'an altered payload must not pass the embedded SHA-256 check')
const badSchema=JSON.parse(JSON.stringify(verifierDossier));badSchema.schema='untrusted.schema/v9'
check(!validateDoctrineDossierStructure(badSchema,'3.4.0').valid,'unsupported dossier schema must be rejected')
const badPrivacy=JSON.parse(JSON.stringify(verifierDossier));badPrivacy.assumptions.personalDataIncluded=true
check(!validateDoctrineDossierStructure(badPrivacy,'3.4.0').valid,'a dossier that claims personal data is included must be rejected')
const badOrder=JSON.parse(JSON.stringify(verifierDossier));badOrder.candidates[0].orders[0].action='javascript:alert(1)'
check(!validateDoctrineDossierStructure(badOrder,'3.4.0').valid,'unknown or executable-looking actions must be rejected')
const badStress=JSON.parse(JSON.stringify(verifierDossier));badStress.candidates[0].robustness.profiles.pop()
check(!validateDoctrineDossierStructure(badStress,'3.4.0').valid,'incomplete stress evidence must be rejected')
const historicalDossier=JSON.parse(JSON.stringify(verifierDossier))
historicalDossier.engine.modelVersion='3.2.0'
historicalDossier.exportMetadata.integrity.scope='UTF-8 JSON payload without exportMetadata'
historicalDossier.exportMetadata.integrity.digest=createHash('sha256').update(JSON.stringify((({exportMetadata,...payload})=>payload)(historicalDossier)),'utf8').digest('hex')
const historicalValidation=validateDoctrineDossierStructure(historicalDossier,'3.4.0')
assert.equal(historicalValidation.valid,true,'historically valid dossiers remain readable: '+historicalValidation.errors.join('; '))
assert.equal(historicalValidation.modelCompatible,false,'historical model versions must be flagged read-only')
check(historicalValidation.warnings.length>0,'historical import must disclose model/hash compatibility warnings')
const futureValidation=validateDoctrineDossierStructure(verifierDossier,'3.5.0')
assert.equal(futureValidation.valid,true,'other model versions remain readable in audit mode')
assert.equal(futureValidation.modelCompatible,false)
const badDepth=JSON.parse(JSON.stringify(verifierDossier));let deep=badDepth;for(let i=0;i<35;i++){deep.child={};deep=deep.child}
check(!validateDoctrineDossierStructure(badDepth,'3.4.0').valid,'pathologically deep JSON structures must be rejected')
const unavailableHashDossier=JSON.parse(JSON.stringify(verifierDossier));unavailableHashDossier.exportMetadata.integrity.status='unavailable';unavailableHashDossier.exportMetadata.integrity.digest=null
const unavailableValidation=validateDoctrineDossierStructure(unavailableHashDossier,'3.4.0')
assert.equal(unavailableValidation.valid,true,'Web Crypto-less exports may be structurally inspected with a warning')
assert.equal(assessDoctrineDossierIntegrity(unavailableHashDossier,null).verified,false,'unavailable hash must never be presented as verified')
dossierVerifierCases.current='PASS'
dossierVerifierCases.keyOrderCanonicalization='PASS'
dossierVerifierCases.hashTamperDetection='PASS'
dossierVerifierCases.schemaAndPrivacyRejection='PASS'
dossierVerifierCases.actionAllowlist='PASS'
dossierVerifierCases.incompleteStressRejection='PASS'
dossierVerifierCases.historicalReadOnly='PASS'
dossierVerifierCases.pathDepthLimit='PASS'
dossierVerifierCases.unavailableHashNotVerified='PASS'

const stressFixture=makeState('flood')
const envelope=doctrineStressProfiles(stressFixture,nodes)
const expectedProfileIds=['water-surge-mild','water-surge-moderate','water-surge-severe','grid-overload-mild','grid-overload-moderate','grid-overload-severe','weak-node-shock-mild','weak-node-shock-moderate','weak-node-shock-severe']
assert.deepEqual(envelope.map(profile=>profile.id),expectedProfileIds,'stress envelope must enumerate all family/severity combinations deterministically')
for(const family of ['water-surge','grid-overload','weak-node-shock']){
 const familyProfiles=envelope.filter(profile=>profile.family===family).sort((a,b)=>a.severityRank-b.severityRank)
 assert.deepEqual(familyProfiles.map(profile=>profile.severity),['mild','moderate','severe'],family+' must expose monotonic severity levels')
 assert.deepEqual(familyProfiles.map(profile=>profile.magnitude),[.5,1,1.5],family+' severity factors must be explicit and monotonic')
 const impactStates=familyProfiles.map(profile=>{
  const trial={...stressFixture,nodeIntegrity:{...stressFixture.nodeIntegrity},nodeOutages:{...(stressFixture.nodeOutages||{})},nodeIncidentFlags:{...(stressFixture.nodeIncidentFlags||{})},pendingNodeIncidents:[...(stressFixture.pendingNodeIncidents||[])]}
  profile.apply(trial)
  return trial
 })
 if(family==='water-surge'){
  const impacts=impactStates.map(state=>state.water-stressFixture.water)
  check(impacts[0]<impacts[1]&&impacts[1]<impacts[2], 'water-surge impact must increase monotonically across severity')
 }else if(family==='grid-overload'){
  const impacts=impactStates.map(state=>stressFixture.grid-state.grid)
  check(impacts[0]<impacts[1]&&impacts[1]<impacts[2], 'grid-overload impact must increase monotonically across severity')
 }else{
  const target=familyProfiles[0].targetNode
  const impacts=impactStates.map(state=>(stressFixture.nodeIntegrity[target]||0)-(state.nodeIntegrity[target]||0))
  const supplyImpacts=impactStates.map(state=>stressFixture.supplies-state.supplies)
  check(impacts[0]<impacts[1]&&impacts[1]<impacts[2], 'weak-node damage must increase monotonically across severity')
  check(supplyImpacts[0]<supplyImpacts[1]&&supplyImpacts[1]<supplyImpacts[2], 'supply loss must increase monotonically across severity')
 }
}
check(envelope.every(profile=>profile.severityRank>=1&&profile.severityRank<=3&&profile.targetNode!==undefined), 'every stress profile must have explicit severity metadata and target scope')
for (const scenario of ['flood', 'blackout', 'blockade']) {
  const base = makeState(scenario)
  const before = JSON.stringify({water:base.water,grid:base.grid,access:base.access,supplies:base.supplies,crews:base.crews,nodeIntegrity:base.nodeIntegrity})
  const runOrders = simulateDirect(base)
  const runPath = simulatePath(0)
  const result = searchDoctrinePlans(base, 'balanced', 'hub', runOrders, runPath, nodes, actions)
  check(result.evaluatedCount > 0 && result.evaluatedCount <= 1000, scenario + ' doctrine search must stay bounded')
  const dossier=buildDoctrineDossierPayload(base,result,'3.4.0-auditable-dossier-verifier',scenarios,nodes,0)
  assert.equal(dossier.schema,'osgard.civic-cascade.decision-dossier/v1')
  assert.equal(dossier.scenario.id,scenario)
  assert.equal(dossier.candidates.length,result.alternatives.length)
  assert.equal(dossier.baseline.forecast.length,3)
  assert.equal(dossier.engine.modelVersion,'3.4.0')
  assert.equal(dossier.decisionAssurance.schema,'osgard.civic-cascade.decision-assurance/v1')
  check(/^[a-f0-9]{8}$/.test(dossier.decisionAssurance.stateFingerprint),'dossier must include the bounded reproducibility fingerprint')
  assert.equal(dossier.candidates[0].commandAttribution.length,dossier.candidates[0].orders.length)
  assert.equal(dossier.candidates[0].robustness.profiles[0].trajectory.length,4)
  check(['green','amber','red'].includes(dossier.candidates[0].safety.level),'dossier candidate must expose a bounded safety verdict')
  assert.equal(dossier.assumptions.personalDataIncluded,false)
  assert.equal(dossier.assumptions.telemetrySent,false)
  assert.equal(dossier.assumptions.openAIAPIUsed,false)
  assert.equal(dossier.candidates[0].robustness.profiles.length,9)
  check(!/email|phone|userId|accessToken|password/i.test(JSON.stringify(dossier)),'dossier export must not include personal data or secrets')
  assert.deepEqual(dossier,buildDoctrineDossierPayload(base,result,'3.4.0-auditable-dossier-verifier',scenarios,nodes,0),
    scenario+' dossier payload must be byte-for-byte reproducible before export metadata')
  check(Array.isArray(result.alternatives) && result.alternatives.length <= 3, scenario + ' planner must return at most three candidates')
check(result.robustnessEvaluatedCount >= 0 && result.robustnessEvaluatedCount <= 8, scenario + ' stress ranking must stay within eight candidates')
  check(result.alternatives.every(candidate=>candidate.commandAttribution.length===candidate.orders.length),scenario+' every command must have a leave-one-out entry')
  check(result.alternatives.every(candidate=>Number.isFinite(candidate.riskExposure)&&candidate.riskExposure>=0&&candidate.riskExposure<=100),scenario+' candidate exposure must be bounded')
  check(result.alternatives.every(candidate=>Number.isFinite(candidate.reserves.reservePenalty)&&candidate.reserves.suppliesAfter>=0&&candidate.reserves.crewsAfter>=0),scenario+' resource reserve audit must be bounded')
  check(result.alternatives.every(candidate=>['green','amber','red'].includes(candidate.safety.level)),scenario+' candidate must receive a safety verdict')
  check(result.alternatives.every(candidate=>candidate.robustness.profiles.every(profile=>profile.trajectory.length===4&&profile.trajectory.map(point=>point.seconds).join(',')==='0,30,60,90')),scenario+' all stress profiles must retain full risk trajectories')
  check(result.alternatives.every(candidate=>Number.isFinite(candidate.robustness.worstRiskExposureDelta)&&candidate.robustness.sensitivityByFamily.length===3),scenario+' stress sensitivity summary must be complete')
check(result.alternatives.every(candidate => typeof candidate.portfolioRole === 'string' && typeof candidate.paretoMember === 'boolean'), scenario + ' portfolio candidates must declare their selection role and dominance status')
  const prefixes = result.alternatives.map(candidate => candidate.orders.slice(0,2).map(order => order.action + ':' + (order.nodeId || '-')).join('|'))
  assert.equal(new Set(prefixes).size, Math.min(result.alternatives.length, result.openingPrefixCount), scenario + ' portfolio should maximize the available distinct opening command prefixes')
  check(result.portfolioSize === result.alternatives.length, scenario + ' portfolio count must match returned options')
  check(result.openingPrefixCount >= 1 && result.openingPrefixCount <= result.robustnessEvaluatedCount, scenario + ' available prefix diversity must be bounded')
  check(result.paretoFrontSize >= 0 && result.paretoFrontSize <= result.robustnessEvaluatedCount, scenario + ' Pareto front size must be bounded')
  for (const candidate of result.alternatives) {
    check(candidate.robustness.profileCount === 9, scenario + ' candidate must be checked against all nine stress-envelope profiles')
    check(candidate.robustness.profiles.length === 9, scenario + ' candidate must include every stress severity result')
    check(candidate.robustness.stableProfiles >= 0 && candidate.robustness.stableProfiles <= 9, scenario + ' robust profile count must be bounded')
    check(Number.isFinite(candidate.robustScore), scenario + ' adjusted score must be finite')
    check(candidate.robustness.profiles.every(profile => Number.isFinite(profile.riskDelta90) && Number.isFinite(profile.weakestIntegrityDelta) && Number.isFinite(profile.magnitude)), scenario + ' stress results and severity levels must be finite')
  }
  for (const candidate of result.alternatives) {
    check(candidate.orders.length >= 1 && candidate.orders.length <= 4, scenario + ' candidate length must respect queue limit')
    const feasibility = runOrders(candidate.orders)
    check(feasibility.valid, scenario + ' candidate must satisfy supply and crew constraints')
    check(candidate.forecast.length === 3, scenario + ' candidate must include all forecast horizons')
    for (const sample of candidate.forecast) {
      check(Number.isFinite(sample.risk) && sample.risk >= 0 && sample.risk <= 100, scenario + ' planner risk must remain bounded')
      check(Number.isFinite(sample.weakestIntegrity) && sample.weakestIntegrity >= 0 && sample.weakestIntegrity <= 100, scenario + ' planner integrity must remain bounded')
    }
  }
  assert.equal(JSON.stringify({water:base.water,grid:base.grid,access:base.access,supplies:base.supplies,crews:base.crews,nodeIntegrity:base.nodeIntegrity}), before,
    scenario + ' planner must not mutate the live source state')
  doctrineResults[scenario] = {evaluated:result.evaluatedCount,stressEvaluated:result.robustnessEvaluatedCount,recommendations:result.alternatives.length,firstRisk:result.alternatives[0]?.forecast[2].risk ?? null,stableProfiles:result.alternatives[0]?.robustness.stableProfiles ?? null}
}
const paretoA={signature:'a',robustScore:1,cost:20,orders:[{action:'pump',nodeId:null},{action:'grid',nodeId:null}],robustness:{worstRiskDelta:0,worstIntegrityDelta:0,stableProfiles:3}}
const paretoB={signature:'b',robustScore:2,cost:30,orders:[{action:'pump',nodeId:null},{action:'route',nodeId:null}],robustness:{worstRiskDelta:2,worstIntegrityDelta:-2,stableProfiles:2}}
const paretoC={signature:'c',robustScore:1.5,cost:10,orders:[{action:'route',nodeId:null},{action:'grid',nodeId:null}],robustness:{worstRiskDelta:3,worstIntegrityDelta:1,stableProfiles:3}}
check(doctrineDominates(paretoA,paretoB), 'Pareto dominance should exclude strictly worse candidates')
check(!doctrineDominates(paretoA,paretoC) && !doctrineDominates(paretoC,paretoA), 'Pareto frontier should preserve meaningful cost/resilience trade-offs')
const fixturePortfolio=doctrineParetoPortfolio([paretoB,paretoC,paretoA],3)
assert.equal(fixturePortfolio[0].signature,'a','Pareto portfolio should put the robust score leader first')
check(fixturePortfolio.some(candidate=>candidate.signature==='c'),'Pareto portfolio should keep a cheaper non-dominated option')
const repeatBase = makeState('flood')
const repeatSearch = () => searchDoctrinePlans(repeatBase, 'balanced', 'hub', simulateDirect(repeatBase), simulatePath(0), nodes, actions)
const firstRepeat = repeatSearch(), secondRepeat = repeatSearch()
assert.deepEqual(firstRepeat.alternatives.map(plan => ({signature:plan.signature,score:plan.score,robustScore:plan.robustScore,stress:plan.robustness.profiles.map(profile => ({id:profile.id,riskDelta90:profile.riskDelta90,weakestIntegrityDelta:profile.weakestIntegrityDelta}))})),
  secondRepeat.alternatives.map(plan => ({signature:plan.signature,score:plan.score,robustScore:plan.robustScore,stress:plan.robustness.profiles.map(profile => ({id:profile.id,riskDelta90:profile.riskDelta90,weakestIntegrityDelta:profile.weakestIntegrityDelta}))})), 'doctrine search and stress-adjusted ranking must be deterministic')
const protectBase = makeState('blackout')
const protectedPlan = searchDoctrinePlans(protectBase, 'protect', 'hub', simulateDirect(protectBase), simulatePath(0), nodes, actions)
check(protectedPlan.mode === 'protect', 'infrastructure-protection objective must be selectable')

const causalState = makeState('flood')
const causalBefore = operationSnapshot(causalState)
causalState.water = clamp(causalState.water - 7)
causalState.grid = clamp(causalState.grid + 4)
causalState.supplies = clamp(causalState.supplies - 5)
const causalEvent = recordOperationEvent(causalState, 'action', 'Проверка вмешательства', 'pump', causalBefore)
assert.equal(causalEvent.delta.water, -7)
assert.equal(causalEvent.delta.grid, 4)
assert.equal(causalEvent.delta.supplies, -5)
assert.equal(causalState.operationLedger.length, 1)
for (let i = 0; i < 25; i++) recordOperationEvent(causalState, 'action', 'Событие ' + i, 'hub', operationSnapshot(causalState))
assert.equal(causalState.operationLedger.length, 20, 'causal ledger must keep no more than 20 entries')
const invalidSnapshot = cleanOperationSnapshot({ water: 999 }, causalState)
assert.equal(invalidSnapshot.water, causalState.water, 'invalid ledger snapshot must be replaced with a safe snapshot')

const flood = makeState('flood')
const noPlan = simulateDirect(flood)([])
const pumpPlan = simulateDirect(flood)([{ action: 'pump', nodeId: null }])
assert.equal(noPlan.state.water, flood.water)
assert.equal(pumpPlan.state.water, flood.water - 12)
assert.equal(pumpPlan.state.supplies, flood.supplies - 18)
assert.equal(pumpPlan.state.waterRate, Math.max(-.02, flood.waterRate - .12))
check(pumpPlan.state.nodeIntegrity.pump > flood.nodeIntegrity.pump, 'pump action must restore pump node integrity')
assert.deepEqual(flood.nodeIntegrity, seedNodeIntegrity(flood), 'planned action preview must not mutate live node map')
const noAction90 = simulatePath(0)(noPlan.state, [90])[0]
const withPump90 = simulatePath(0)(pumpPlan.state, [90])[0]
check(withPump90.water < noAction90.water, 'pump plan should reduce projected flood water at +90s')
check(withPump90.risk < noAction90.risk, 'pump plan should reduce projected risk at +90s')

const blackout = makeState('blackout')
blackout.crews = 1
const gridPlan = simulateDirect(blackout)([{ action: 'grid', nodeId: null }])
assert.equal(gridPlan.state.grid, blackout.grid + 15)
assert.equal(gridPlan.state.crews, 0)
assert.equal(gridPlan.state.riskOffset, Math.max(0, blackout.riskOffset - 1), 'crew exhaustion risk-offset effect must match live action logic')
check(gridPlan.state.nodeIntegrity.substation > blackout.nodeIntegrity.substation, 'grid action must strengthen upstream power infrastructure')

const repairState = makeState('flood')
repairState.crews = 1
repairState.waterRate = -.02
const repairPlan = simulateDirect(repairState)([{ action: 'repair', nodeId: 'pump' }])
assert.equal(repairPlan.state.waterRate, -.03, 'repair rates must be clamped to live minimum')
assert.equal(repairPlan.state.crews, 0)
check(repairPlan.state.nodeIntegrity.pump > repairState.nodeIntegrity.pump, 'targeted repair must improve the selected pump node')

const invalid = makeState('flood')
invalid.supplies = 20
check(!simulateDirect(invalid)([{ action: 'grid', nodeId: null }, { action: 'pump', nodeId: null }]).valid,
  'over-budget command plan must be marked invalid')

const healthyNetwork = makeState('blackout')
healthyNetwork.nodeIntegrity.hub = 72
healthyNetwork.nodeIntegrity.substation = 90
const weakNetwork = makeState('blackout')
weakNetwork.nodeIntegrity.hub = 72
weakNetwork.nodeIntegrity.substation = 20
advanceNodeIntegrity(healthyNetwork, 10)
advanceNodeIntegrity(weakNetwork, 10)
check(weakNetwork.nodeIntegrity.hub < healthyNetwork.nodeIntegrity.hub, 'weak upstream power node must accelerate dependent hub degradation')
check(weakNetwork.nodeOutages.substation, 'critical infrastructure crossing threshold must create a node outage')
check(weakNetwork.nodeIncidentFlags.substation, 'critical node must trigger only once per operation')
check(weakNetwork.pendingNodeIncidents.includes('substation'), 'critical node must enqueue a dynamic incident')
advanceNodeIntegrity(weakNetwork, 10)
assert.equal(weakNetwork.pendingNodeIncidents.filter(id => id === 'substation').length, 1, 'a critical node must not enqueue duplicate incidents')
check(weakNetwork.grid < scenarios.blackout.grid, 'node outage must damage associated city-wide service metric')


const exposureLow=doctrineRiskExposure(20,[{seconds:30,risk:20},{seconds:60,risk:25},{seconds:90,risk:30}])
const exposureHigh=doctrineRiskExposure(20,[{seconds:30,risk:30},{seconds:60,risk:45},{seconds:90,risk:60}])
check(Number.isFinite(exposureLow)&&exposureLow<exposureHigh&&exposureHigh<=100,'normalized risk exposure must integrate the full trajectory and stay bounded')
const validFixtureForecast=simulatePath(0)(makeState('flood'),[30,60,90])
check(validateDoctrineForecast(validFixtureForecast,[30,60,90],nodes).valid,'forecast quality gate must accept a consistent node-by-node forecast')
const badForecast=JSON.parse(JSON.stringify(validFixtureForecast));badForecast[1].seconds=45
check(!validateDoctrineForecast(badForecast,[30,60,90],nodes).valid,'forecast quality gate must reject reordered or missing horizons')
const badNodeForecast=JSON.parse(JSON.stringify(validFixtureForecast));badNodeForecast[2].nodeIntegrity.hub=150
check(!validateDoctrineForecast(badNodeForecast,[30,60,90],nodes).valid,'forecast quality gate must reject unbounded node integrity')
const syntheticSafety=level=>assessDoctrineSafety({robustness:{profileCount:9,stableProfiles:level==='green'?9:level==='amber'?6:2,worstRiskDelta:level==='green'?1:level==='amber'?4:12,worstIntegrityDelta:level==='green'?0:level==='amber'?-10:-25,severeRegressions:level==='green'?0:level==='amber'?2:7},reserves:{suppliesAfter:level==='red'?3:30,crewsAfter:level==='red'?0:2}})
assert.equal(syntheticSafety('green').level,'green','strong stress stability plus preserved reserves should produce green verdict')
assert.equal(syntheticSafety('amber').level,'amber','mixed but bounded trade-offs should produce amber verdict')
assert.equal(syntheticSafety('red').level,'red','severe stress and reserve failure must produce red verdict')

const thresholdSource = makeState('blackout')
const thresholdForecast = simulatePath(64)(thresholdSource, [30])[0]
check(thresholdForecast.access <= 59, 'the post-65s low-grid cascade should affect access in the deterministic forecast')
const floodThreshold = makeState('flood')
const gridAt89 = simulatePath(89)(floodThreshold, [90])[0]
check(gridAt89.grid < floodThreshold.grid - floodThreshold.gridRate * 90,
  'the post-90s high-water cascade should further weaken the grid')

console.log(JSON.stringify({
  status: 'passed',
  suite: 'CIVIC CASCADE 3.4 decision assurance, trajectory analytics, command attribution, reserve guardrails and auditable dossier',
  release: manifest.version,
  scenarios: 3,
  horizons: [30, 60, 90],
  boundedMetricAssertions: 36,
  keyAssertions: 20,
  doctrineSearch: doctrineResults,
  dossierVerifierCases,
  results: {
    floodPlanRiskImprovement: noAction90.risk - withPump90.risk,
    lowGridThreshold: { accessAtT30FromT64: thresholdForecast.access },
    highWaterThreshold: { gridAtT90FromT89: gridAt89.grid },
    actionParity: 'PASS',
    resourceValidation: 'PASS',
    nodeIntegrityBounds: 'PASS',
    dependencyPropagation: 'PASS',
    nodeOutageEffects: 'PASS',
    adaptiveIncidentQueue: 'PASS',
    oneIncidentPerNode: 'PASS',
    causalImmediateDeltas: 'PASS',
    causalLedgerBound: 'PASS',
    causalSnapshotValidation: 'PASS',
    autonomousDoctrineSearch: 'PASS',
    autonomousDoctrineStressSearch: 'PASS',
    doctrineBoundedSearch: 'PASS',
    doctrineResourceAndCrewValidation: 'PASS',
    doctrineNoLiveMutation: 'PASS',
    doctrineDeterminism: 'PASS',
    doctrineStressProfiles: 'PASS',
    nineProfileStressEnvelope: 'PASS',
    severityMonotonicity: 'PASS',
    doctrineRobustReranking: 'PASS',
    doctrineStressNoLiveMutation: 'PASS',
    doctrineParetoDominance: 'PASS',
    doctrinePortfolioDiversity: 'PASS',
    doctrineTradeoffDossier: 'PASS',
    reproducibleDossierPayload: 'PASS',
    dossierPrivacyContract: 'PASS',
    dossierSnapshotForecastCompleteness: 'PASS',
    dossierCanonicalKeyOrdering: 'PASS',
    dossierSha256TamperDetection: 'PASS',
    dossierSchemaPrivacyAndActionAllowlist: 'PASS',
    dossierHistoricalModelReadOnly: 'PASS',
    dossierComplexityLimit: 'PASS',
    dossierImportDoesNotExecuteOrders: 'PASS',
    forecastQualityGate: 'PASS',
    fullTrajectoryRiskExposure: 'PASS',
    commandLeaveOneOutAttribution: 'PASS',
    reserveAwareScoring: 'PASS',
    operationalSafetyVerdict: 'PASS',
    sensitivityAcrossSeverityBands: 'PASS',
    decisionAssuranceFingerprint: 'PASS'
  }
}, null, 2))
