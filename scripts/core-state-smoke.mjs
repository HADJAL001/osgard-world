import { applyTax, buildStructure, createTimeState, getTurnForecast, resolveTimeTurn } from '../src/core/timeState.ts'

const initial = createTimeState()
const higher = applyTax(initial, 20)
if (higher.tick !== 1 || higher.treasury <= initial.treasury || !higher.lastConsequence.includes('Higher tax')) throw new Error('TIME higher-tax transition failed')
const lower = applyTax(higher, 5)
if (!lower.lastConsequence.includes('Lower tax') || lower.energy >= higher.energy) throw new Error('TIME lower-tax transition failed')
const steady = applyTax(lower, 5)
if (!steady.lastConsequence.includes('steady tax')) throw new Error('TIME steady-tax transition failed')

const plan = { taxRate: 14, policy: 'GREEN' as const }
const a = resolveTimeTurn(initial, plan)
const b = resolveTimeTurn(initial, plan)
if (JSON.stringify(a) !== JSON.stringify(b)) throw new Error('TIME incident sequence is not deterministic')
const solar = buildStructure(initial, 'aqueduct', 'SOLAR_ARRAY')
const normalEnergy = getTurnForecast(initial, { taxRate: 10, policy: 'BALANCED' }).energyDelta
const solarEnergy = getTurnForecast(solar, { taxRate: 10, policy: 'BALANCED' }).energyDelta
if (solar.treasury !== initial.treasury - 220 || solarEnergy - normalEnergy !== 7) throw new Error('TIME building economic effect failed')
console.log('OSGARD_CORE_STATE_SMOKE_OK')
