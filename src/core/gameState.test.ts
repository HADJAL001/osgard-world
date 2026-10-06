import { serializeReplay } from './replay'
import { applyTax, createTimeState } from './timeState'
const initial = createTimeState(); const changed = applyTax(initial, 20)
if (changed.tick !== 1 || changed.treasury <= initial.treasury) throw new Error('TIME policy fixture failed')
if (!changed.lastConsequence.includes('Higher tax') || !changed.lastConsequence.includes('Energy -2')) throw new Error('TIME consequence fixture failed')
const lowered = applyTax(changed, 5)
if (!lowered.lastConsequence.includes('Lower tax') || lowered.energy !== 96) throw new Error('TIME lower-tax consequence fixture failed')
const steady = applyTax(lowered, 5)
if (!steady.lastConsequence.includes('steady tax')) throw new Error('TIME steady-tax consequence fixture failed')
const replay = serializeReplay('time', 'session-1', 7, [{ tick: 1, action: 'SET_TAX', value: 20 }], [{ tick: 1, stateHash: 'fixture' }])
if (replay.version !== 1 || !replay.hash) throw new Error('replay fixture failed')
