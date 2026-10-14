import assert from 'node:assert/strict'
import { readFileSync, existsSync } from 'node:fs'
import { gunzipSync } from 'node:zlib'
import { join, resolve } from 'node:path'

const root = resolve(process.argv[2] || 'dist/games')
const path = join(root, 'catalog-runtime.js')
const body = readFileSync(path)
const source = body.toString('utf8')
assert.ok(body.length > 1000, 'catalog-runtime.js must be non-empty in the selected source/publish tree')
assert.ok(source.includes("const endpoint = '/commerce-api/v1/game-catalog'"), 'catalogue runtime must call the same-origin public read endpoint')
assert.ok(source.includes('textContent = item.title') && !source.includes('.innerHTML'), 'catalogue values must be rendered as text, not HTML')
assert.ok(source.includes('AbortSignal.timeout(4500)'), 'catalogue requests must have a bounded timeout')
if (existsSync(path + '.gz')) assert.deepEqual(gunzipSync(readFileSync(path + '.gz')), body, 'precompressed catalogue runtime must match JavaScript byte-for-byte')
console.log('PASS Games catalogue runtime source/artifact: ' + body.length + ' bytes.')
