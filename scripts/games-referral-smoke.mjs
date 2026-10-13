import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { runInNewContext } from 'node:vm'

const source = readFileSync('public/games/referral-sharing.js', 'utf8')
const storage = new Map()
const announced = []
let copied = ''
let nativeShareCalled = false
const location = { origin: 'https://osgard.world', search: '' }
const localStorage = {
  getItem(key) { return storage.has(key) ? storage.get(key) : null },
  setItem(key, value) { storage.set(key, String(value)) },
}
const navigator = {
  clipboard: { async writeText(value) { copied = value } },
}
const window = {
  location,
  crypto: { getRandomValues(bytes) { bytes.fill(10); return bytes } },
  dispatchEvent(event) { announced.push(event); return true },
}
class TestCustomEvent { constructor(type, options = {}) { this.type = type; this.detail = options.detail } }
runInNewContext(source, {
  window, location, localStorage, navigator,
  URL, URLSearchParams, Uint8Array, CustomEvent: TestCustomEvent,
  Object, String, Number, Array, Math,
})

const api = window.OSGARDReferral
assert.ok(api, 'Global invite API must be available to toolbar and session recommendations')
assert.equal(api.buildInviteUrl('../outside'), null, 'Unknown games must not produce arbitrary invite targets')
const first = api.buildInviteUrl('null-shift', 'post run / weird')
const parsed = new URL(first)
assert.equal(parsed.origin, 'https://osgard.world', 'Invite links must remain same-origin')
assert.equal(parsed.pathname, '/games/', 'Invites must use the canonical Games hub')
assert.equal(parsed.searchParams.get('play'), 'null-shift', 'Invite should start the selected game')
assert.match(parsed.searchParams.get('ref') || '', /^r[a-f0-9]{12}$/, 'Referral token must be an anonymous random code')
assert.equal(parsed.searchParams.get('utm_source'), 'osgard_games')
assert.equal(parsed.searchParams.get('utm_medium'), 'friend_invite')
assert.equal(parsed.searchParams.get('utm_campaign'), 'player_invite')
assert.equal(parsed.searchParams.get('utm_content'), 'null-shift')
assert.equal(parsed.searchParams.get('utm_term'), 'postrunweird')
assert.equal(api.buildInviteUrl('swarm', 'another-placement').match(/ref=([^&]+)/)?.[1], parsed.searchParams.get('ref'), 'A browser must reuse its anonymous referral code')

location.search = parsed.search
const attribution = api.readAttribution()
assert.equal(attribution?.referralCode, parsed.searchParams.get('ref'))
assert.equal(attribution?.utmCampaign, 'player_invite')
assert.equal(attribution?.utmContent, 'null-shift')
location.search = '?play=swarm&ref=not-valid&utm_source=other&utm_medium=friend_invite&utm_campaign=player_invite&utm_content=swarm'
assert.equal(api.readAttribution(), null, 'Unrecognized and malformed referral URLs must not be attributed')
location.search = '?play=swarm&ref=r0a0a0a0a0a0a&utm_source=osgard_games&utm_medium=friend_invite&utm_campaign=player_invite&utm_content=null-shift'
assert.equal(api.readAttribution(), null, 'Changing the requested game must invalidate attribution that points at another game')

const copiedResult = await api.share('swarm', 'post-run')
assert.equal(copiedResult.status, 'copied')
assert.equal(copiedResult.method, 'clipboard')
assert.ok(copied.includes('play=swarm') && copied.includes('utm_campaign=player_invite'), 'Clipboard fallback must copy the full attributed launch URL')
assert.equal(announced.length, 1, 'Successful copy must emit exactly one invite-created event')
assert.equal(announced[0].type, 'osgard:invite-created')
assert.equal(announced[0].detail.gameId, 'swarm')

navigator.share = async (payload) => { nativeShareCalled = true; assert.ok(payload.url.includes('play=patina')) }
const sharedResult = await api.share('patina', 'player-toolbar')
assert.equal(nativeShareCalled, true)
assert.equal(sharedResult.status, 'shared')
assert.equal(announced.length, 2, 'Successful native share should emit one event')
assert.equal(announced[1].detail.method, 'web-share')

navigator.share = async () => { const error = new Error('dismissed'); error.name = 'AbortError'; throw error }
const beforeCancel = announced.length
assert.equal((await api.share('time', 'player-toolbar')).status, 'cancelled', 'Dismissing native share is not a successful share')
assert.equal(announced.length, beforeCancel, 'A cancelled share must not be counted')

console.log(JSON.stringify({
  status: 'PASS',
  checks: 24,
  covered: ['same-origin allowlisted links', 'launch-on-open parameters', 'anonymous referral token reuse', 'UTM attribution validation', 'clipboard fallback', 'native share', 'cancelled share not counted'],
}, null, 2))
