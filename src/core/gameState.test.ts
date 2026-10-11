import { serializeReplay } from './replay'
import { applyCouncilAction, applyTax, buildStructure, createTimeState, getTurnForecast, hasUsedCouncilAction, resolveTimeTurn } from './timeState'

const expectThrow = (fn: () => unknown) => {
  let threw = false
  try { fn() } catch { threw = true }
  if (!threw) throw new Error('Expected guarded TIME transition to throw')
}

const initial = createTimeState()
const changed = applyTax(initial, 20)
if (changed.tick !== 1 || changed.treasury <= initial.treasury) throw new Error('TIME policy fixture failed')
if (!changed.lastConsequence.includes('Higher tax') || !changed.lastConsequence.includes('Energy ')) throw new Error('TIME consequence fixture failed')

const lowered = applyTax(changed, 5)
if (!lowered.lastConsequence.includes('Lower tax') || lowered.energy >= changed.energy) throw new Error('TIME lower-tax consequence fixture failed')
const steady = applyTax(lowered, 5)
if (!steady.lastConsequence.includes('steady tax')) throw new Error('TIME steady-tax consequence fixture failed')

const plan = { taxRate: 14, policy: 'GREEN' as const }
const turnA = resolveTimeTurn(initial, plan)
const turnB = resolveTimeTurn(initial, plan)
if (JSON.stringify(turnA) !== JSON.stringify(turnB)) throw new Error('TIME seeded incidents are not deterministic')
if (turnA.tick !== 1 || turnA.districts.find((item) => item.id === 'aqueduct')!.prosperity <= initial.districts.find((item) => item.id === 'aqueduct')!.prosperity) {
  throw new Error('TIME policy should change the calendar and improve its matching district')
}

const solar = buildStructure(initial, 'aqueduct', 'SOLAR_ARRAY')
if (solar.treasury !== initial.treasury - 220 || solar.districts.find((item) => item.id === 'aqueduct')!.buildingLevel !== 1) throw new Error('TIME construction transition failed')
const beforeSolar = getTurnForecast(initial, { taxRate: 10, policy: 'BALANCED' })
const afterSolar = getTurnForecast(solar, { taxRate: 10, policy: 'BALANCED' })
if (afterSolar.energyDelta - beforeSolar.energyDelta !== 7) throw new Error('TIME solar building does not affect energy output')
expectThrow(() => buildStructure(solar, 'aqueduct', 'MARKET_HALL'))
expectThrow(() => buildStructure({ ...initial, treasury: 0 }, 'forum', 'ACADEMY'))
expectThrow(() => applyTax({ ...initial, status: 'COLLAPSED' }, 10))
expectThrow(() => resolveTimeTurn(initial, { taxRate: 41, policy: 'BALANCED' }))

const replay = serializeReplay('time', 'session-1', 7, [{ tick: 1, action: 'SET_TAX', value: 20 }], [{ tick: 1, stateHash: 'fixture' }])
if (replay.version !== 1 || !replay.hash) throw new Error('replay fixture failed')


const gridBase = { ...initial, energy: 60 }
const repaired = applyCouncilAction(gridBase, 'GRID_REPAIR', 'aqueduct')
if (repaired.treasury !== gridBase.treasury - 130 || repaired.energy !== 74 || repaired.approval.guild !== gridBase.approval.guild + 2 || !hasUsedCouncilAction(repaired)) {
  throw new Error('TIME grid-repair decree did not apply the declared effects')
}
expectThrow(() => applyCouncilAction(repaired, 'CIVIC_RELIEF', 'commons'))
const nextDecreeTurn = resolveTimeTurn(repaired, { taxRate: 10, policy: 'BALANCED' })
if (hasUsedCouncilAction(nextDecreeTurn)) throw new Error('TIME council decree must become available after the next turn')
const relief = applyCouncilAction(initial, 'CIVIC_RELIEF', 'commons')
if (relief.approval.commons !== initial.approval.commons + 6 || relief.stability !== initial.stability + 3 ||
  relief.districts.find((item) => item.id === 'commons')!.prosperity !== initial.districts.find((item) => item.id === 'commons')!.prosperity + 3) {
  throw new Error('TIME civic-relief decree did not apply its declared effects')
}
expectThrow(() => applyCouncilAction({ ...initial, treasury: 50 }, 'SENATE_COMPACT', 'forum'))
expectThrow(() => applyCouncilAction({ ...initial, energy: 100 }, 'GRID_REPAIR', 'aqueduct'))
expectThrow(() => applyCouncilAction({ ...initial, status: 'COLLAPSED' }, 'CIVIC_RELIEF', 'commons'))
