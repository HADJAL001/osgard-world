import { applyTax, createTimeState } from '../src/core/timeState.ts'

const initial = createTimeState()
const higher = applyTax(initial, 20)
if (higher.tick !== 1 || higher.treasury <= initial.treasury || !higher.lastConsequence.includes('Higher tax')) throw new Error('TIME higher-tax transition failed')
const lower = applyTax(higher, 5)
if (!lower.lastConsequence.includes('Lower tax') || lower.energy !== 96) throw new Error('TIME lower-tax transition failed')
const steady = applyTax(lower, 5)
if (!steady.lastConsequence.includes('steady tax')) throw new Error('TIME steady-tax transition failed')
console.log('OSGARD_CORE_STATE_SMOKE_OK')
