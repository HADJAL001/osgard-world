import { applyCouncilAction, applyTax, buildStructure, createTimeState, getTurnForecast, hasUsedCouncilAction, resolveTimeTurn } from '../src/core/timeState.ts'

const initial = createTimeState()
const higher = applyTax(initial, 20)
if (higher.tick !== 1 || higher.treasury <= initial.treasury || !higher.lastConsequence.includes('Higher tax')) throw new Error('TIME higher-tax transition failed')
const lower = applyTax(higher, 5)
if (!lower.lastConsequence.includes('Lower tax') || lower.energy >= higher.energy) throw new Error('TIME lower-tax transition failed')
const steady = applyTax(lower, 5)
if (!steady.lastConsequence.includes('steady tax')) throw new Error('TIME steady-tax transition failed')

const plan = { taxRate: 14, policy: 'GREEN' }
const a = resolveTimeTurn(initial, plan)
const b = resolveTimeTurn(initial, plan)
if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('TIME incident sequence is not deterministic')
const solar = buildStructure(initial, 'aqueduct', 'SOLAR_ARRAY')
const normalEnergy = getTurnForecast(initial, { taxRate: 10, policy: 'BALANCED' }).energyDelta
const solarEnergy = getTurnForecast(solar, { taxRate: 10, policy: 'BALANCED' }).energyDelta
if (solar.treasury !== initial.treasury - 220 || solarEnergy - normalEnergy !== 7) throw new Error('TIME building economic effect failed')
console.log('OSGARD_CORE_STATE_SMOKE_OK')

const gridBase = { ...initial, energy: 60 }
const gridDecree = applyCouncilAction(gridBase, 'GRID_REPAIR', 'aqueduct')
if (gridDecree.treasury !== gridBase.treasury - 130 || gridDecree.energy !== 74 || !hasUsedCouncilAction(gridDecree)) throw new Error('TIME council energy decree failed')
let decreeGuarded = false
try { applyCouncilAction(gridDecree, 'CIVIC_RELIEF', 'commons') } catch { decreeGuarded = true }
if (!decreeGuarded) throw new Error('TIME allows more than one council decree per turn')
const reliefDecree = applyCouncilAction(initial, 'CIVIC_RELIEF', 'commons')
if (reliefDecree.approval.commons !== initial.approval.commons + 6 || reliefDecree.stability !== initial.stability + 3) throw new Error('TIME civic relief effects failed')
if (hasUsedCouncilAction(resolveTimeTurn(gridDecree, { taxRate: 10, policy: 'BALANCED' }))) throw new Error('TIME decree availability did not reset at the next turn')
