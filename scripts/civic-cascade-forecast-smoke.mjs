import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'

const html = await readFile(new URL('../public/games/civic-cascade/index.html', import.meta.url), 'utf8')
const manifest = JSON.parse(await readFile(new URL('../public/games/civic-cascade/release.json', import.meta.url), 'utf8'))
const check = (value, message) => assert.ok(value, message)

assert.equal(manifest.gameId, 'civic-cascade')
assert.equal(manifest.version, '2.7.0', 'release manifest must match this regression suite')
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
assert.deepEqual(manifest.buildContract?.adaptiveCrisisDirector?.nodes, ['substation','pump','bridge','hospital','shelter'])

const ids = [...html.matchAll(/\bid="([^"]+)"/g)].map(match => match[1])
assert.equal(new Set(ids).size, ids.length, 'HTML IDs must be unique')
for (const id of [
  'cc-cascade-forecast', 'cc-cascade-30', 'cc-cascade-60', 'cc-cascade-90',
  'cc-cascade-wait-30', 'cc-cascade-plan-30', 'cc-cascade-wait-90',
  'cc-cascade-plan-90', 'cc-cascade-note', 'cc-node-inspector', 'cc-node-health',
  'cc-node-health-bar', 'cc-node-status', 'cc-node-chain', 'cc-node-effect', 'cc-adaptive-crisis',
  'cc-causal-debrief', 'cc-causal-summary', 'cc-causal-count', 'cc-causal-risk-change', 'cc-causal-weakest', 'cc-causal-best', 'cc-causal-ledger'
]) check(ids.includes(id), 'missing forecast UI element: ' + id)

const mainScript = html.match(/<script>([\s\S]*?)<\/script>/i)?.[1]
check(mainScript, 'inline game script must exist')
new Function(mainScript)

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

const thresholdSource = makeState('blackout')
const thresholdForecast = simulatePath(64)(thresholdSource, [30])[0]
check(thresholdForecast.access <= 59, 'the post-65s low-grid cascade should affect access in the deterministic forecast')
const floodThreshold = makeState('flood')
const gridAt89 = simulatePath(89)(floodThreshold, [90])[0]
check(gridAt89.grid < floodThreshold.grid - floodThreshold.gridRate * 90,
  'the post-90s high-water cascade should further weaken the grid')

console.log(JSON.stringify({
  status: 'passed',
  suite: 'CIVIC CASCADE causal operation debrief, infrastructure integrity and deterministic cascade forecast',
  release: manifest.version,
  scenarios: 3,
  horizons: [30, 60, 90],
  boundedMetricAssertions: 36,
  keyAssertions: 20,
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
    causalSnapshotValidation: 'PASS'
  }
}, null, 2))
