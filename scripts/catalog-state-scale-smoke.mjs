import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'
import { runInNewContext } from 'node:vm'

const source = await readFile(resolve('public/games/catalog-state.js'), 'utf8')
const context = { window: {}, document: { getElementById: () => null } }
runInNewContext(source, context)

const api = context.window.OSGARDCatalogState
assert.equal(typeof api?.cleanGameIds, 'function', 'catalog state helpers should be exposed for testing')
assert.equal(typeof api?.normalizedState, 'function', 'catalog state normalization should be exposed for testing')

const twelveIds = Array.from({ length: 12 }, (_, index) => 'game-' + String(index + 1).padStart(2, '0'))
const allowedTwelve = twelveIds
const cleanedTwelve = api.cleanGameIds(twelveIds.concat([twelveIds[0], 'not-registered']).join(','), allowedTwelve)
assert.deepEqual(Array.from(cleanedTwelve), twelveIds, 'all 12 registered game IDs must survive share-link normalization, with duplicates and unknown IDs removed')

const oneHundredTwentyIds = Array.from({ length: 120 }, (_, index) => 'game-' + String(index + 1).padStart(3, '0'))
const allowedLarge = oneHundredTwentyIds
const bounded = api.cleanGameIds(oneHundredTwentyIds.join(','), allowedLarge)
assert.equal(bounded.length, 100, 'shared-game selections must retain a hard safety bound')
assert.deepEqual(Array.from(bounded), oneHundredTwentyIds.slice(0, 100), 'the bounded result must preserve stable input order')

const normalized = api.normalizedState({ query: '  play\u0000\u0007now  ', genre: 'not-a-genre', favorites: 1 })
assert.deepEqual({ ...normalized }, { query: 'play  now', genre: 'all', favorites: true }, 'untrusted URL state should be normalized and control characters stripped')

console.log('PASS OSGARD catalogue state scale: 12-game selection, 100-ID safety bound, duplicate filtering, unknown-ID rejection and URL-state sanitization.')
