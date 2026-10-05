import { addObject, createChallenge, publishChallenge, startChallenge, submitRun, validateChallenge } from './remixState'
const base = createChallenge('creator-1', 42)
const withGoal = addObject(base, { id: 'goal-1', kind: 'goal', x: 80, y: 20 })
const validated = validateChallenge(withGoal)
if (validated.status !== 'VALIDATED') throw new Error('validation fixture failed')
const published = publishChallenge(validated)
const playing = startChallenge(published)
const submitted = submitRun(playing, 184200)
if (submitted.status !== 'SUBMITTED' || submitted.bestTimeMs !== 184200) throw new Error('submission fixture failed')
