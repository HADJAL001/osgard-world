import { serializeReplay } from './replay'
import { applyTax, createTimeState } from './timeState'
const initial = createTimeState(); const changed = applyTax(initial, 20)
if (changed.tick !== 1 || changed.treasury <= initial.treasury) throw new Error('TIME policy fixture failed')
const replay = serializeReplay('time', 'session-1', 7, [{ tick: 1, action: 'SET_TAX', value: 20 }], [{ tick: 1, stateHash: 'fixture' }])
if (replay.version !== 1 || !replay.hash) throw new Error('replay fixture failed')
