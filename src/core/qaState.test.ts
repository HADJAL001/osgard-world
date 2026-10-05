import { addObject, createChallenge, publishChallenge, startChallenge, validateChallenge } from './remixState'
import { createNullState, extractNull } from './nullState'
import { createSwarmState, extractSwarm, swarmAction } from './swarmState'
import { serializeReplay } from './replay'
const expectThrow = (fn: () => unknown) => { let threw = false; try { fn() } catch { threw = true } if (!threw) throw new Error('Expected guarded transition to throw') }
expectThrow(() => extractSwarm(createSwarmState()))
expectThrow(() => swarmAction(createSwarmState(), true))
expectThrow(() => extractNull(createNullState()))
expectThrow(() => publishChallenge(validateChallenge(createChallenge('qa', 1))))
const challenge = addObject(createChallenge('qa', 3), { id: 'goal', kind: 'goal', x: 1, y: 1 }); const published = publishChallenge(validateChallenge(challenge)); expectThrow(() => startChallenge({ ...published, status: 'DRAFT' }))
const replayA = serializeReplay('time', 'qa', 9, [{ tick: 1, action: 'SET_TAX', value: 20 }], [{ tick: 1, stateHash: 'same' }]); const replayB = serializeReplay('time', 'qa', 9, [{ tick: 1, action: 'SET_TAX', value: 20 }], [{ tick: 1, stateHash: 'same' }]); if (replayA.hash !== replayB.hash) throw new Error('Replay is not deterministic')
