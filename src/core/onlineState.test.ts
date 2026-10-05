import { createSwarmState, extractSwarm, readyPlayer, swarmAction } from './swarmState'
import { createNullState, extractNull, hackNode, recoverCore, shiftReality } from './nullState'
let swarm = readyPlayer(readyPlayer(createSwarmState(), 'a'), 'b'); for (let i = 0; i < 4; i++) swarm = swarmAction(swarm, true); if (extractSwarm(swarm).status !== 'EXTRACTED') throw new Error('SWARM fixture failed')
let nul = createNullState(); nul = shiftReality(nul); nul = hackNode(nul, true); nul = hackNode(nul, true); nul = hackNode(nul, true); nul = recoverCore(nul); if (extractNull(nul).status !== 'EXTRACTED') throw new Error('NULL fixture failed')
