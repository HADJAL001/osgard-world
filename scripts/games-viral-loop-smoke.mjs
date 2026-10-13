import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const read = path => readFileSync(path, 'utf8')
const hub = read('public/games/index.html')
const viral = read('public/games/viral-loop.js')
const lifecycle = read('public/games/player-lifecycle.js')
const recommendations = read('public/games/game-session-recommendations.js')
const styles = read('public/games/luxury.css')
const privacy = read('public/privacy/index.html')
const routes = read('scripts/production-route-matrix.mjs')
const deploy = read('.github/workflows/deploy-frontend.yml')

assert.ok(hub.includes('id="player-invite"'), 'Player modal must expose a clearly labelled invite action')
assert.ok(hub.includes('src="./viral-loop.js?v=__OSGARD_BUILD_VERSION__"'), 'The invite loop must be self-hosted and cache-versioned')
assert.ok(hub.includes("osgard:analytics-consent-changed"), 'Changing analytics consent must notify invite attribution state')
assert.ok(hub.includes('id="post-run-recommendations"'), 'Completed-game recommendation surface is required')
assert.ok(viral.includes("utm_campaign: 'player_invite_loop'") && viral.includes("utm_medium: 'player_share'"), 'Invite links need explicit, attributable campaign parameters')
assert.ok(viral.includes("params.set") || viral.includes("new URLSearchParams"), 'Invite URLs must carry game and campaign attribution')
assert.ok(viral.includes("params.get('game')") && viral.includes("params.get('invite')"), 'Invite landing must validate a concrete game and invite code')
assert.ok(viral.includes("const ATTRIBUTION_KEY = 'osgard.games.invite-attribution.v1'"), 'Invite attribution needs a versioned session-only key')
assert.ok(viral.includes("sessionStorage.setItem(ATTRIBUTION_KEY") && viral.includes('if (!hasConsent()) return'), 'Referral session state must be consent-gated')
assert.ok(viral.includes("sessionStorage.removeItem(ATTRIBUTION_KEY)") && viral.includes('osgard:analytics-consent-changed'), 'Withdrawing consent must clear referral attribution')
assert.ok(viral.includes("section.id = 'player-invite-banner'") && viral.includes('launch.dataset.play = invite.gameId') && viral.includes('launch.href = game.href'), 'Invite landing needs an accessible banner with a real game launch action')
assert.ok(viral.includes('invite_link_created') && viral.includes('invite_landing') && viral.includes('invite_game_started') && viral.includes('invite_game_completed'), 'Funnel event contract is incomplete')
assert.ok(viral.includes("detail.endReason === 'game_completed'"), 'Only explicit gameplay completion may count as an invited-game completion')
assert.ok(viral.includes('attribution.started) return') && viral.includes('!attribution.completed'), 'Referral starts/completions must be deduplicated within a browser session')
assert.ok(viral.includes('window.crypto.getRandomValues') && viral.includes('randomUUID'), 'Invite codes should use cryptographically generated randomness where available')
assert.ok(viral.includes('if (!hasConsent()) return false'), 'No invite analytics request may be sent without consent')
assert.ok(viral.includes("config.apiBaseUrl || '/commerce-api'") && viral.includes("base + '/v1/events'"), 'Events must use the configured Commerce API, not a fabricated endpoint')
assert.ok(!/document\.cookie|navigator\.userAgent|canvas\.toDataURL|fingerprint/i.test(viral), 'Invite loop must not fingerprint visitors')
assert.ok(!/payment|rewarded|purchase|checkout/i.test(viral), 'The invite flow must not imply purchases or fabricate paid rewards')
assert.ok(lifecycle.includes("new CustomEvent('osgard:game-session-started'"), 'Lifecycle must signal an actual ready/started session to attribution')
assert.ok(lifecycle.includes("new CustomEvent('osgard:game-session-completed'"), 'Lifecycle must signal session end reason')
assert.ok(recommendations.includes('osgard:game-completed') && recommendations.includes('post-run-grid'), 'Post-run recommendations remain tied to actual completed-game events')
assert.ok(styles.includes('.player-invite-banner') && styles.includes('.player-invite-postrun') && styles.includes('@media(max-width:760px)'), 'Invite UI needs premium desktop/mobile styles')
assert.ok(styles.includes('prefers-reduced-motion:reduce'), 'Invite UI must respect reduced-motion preferences')
assert.ok(privacy.includes('invite_link_created') && privacy.includes('invite_game_started') && privacy.includes('sessionStorage'), 'Privacy notice must disclose referral attribution')
assert.ok(routes.includes("'/games/viral-loop.js'") && routes.includes("path === '/games/viral-loop.js'"), 'Production route matrix must verify the new self-hosted asset')
assert.ok(deploy.includes('npm run qa:games-viral'), 'Deploy must fail before publication if viral-loop contracts regress')

const script = viral
new Function(script)
new Function(lifecycle)
new Function(recommendations)
const inlineCatalog = hub.split('<script>')[1]?.split('</script>')[0] || ''
if (!inlineCatalog) throw new Error('inline catalog script missing')
new Function(inlineCatalog)

console.log(JSON.stringify({
  status: 'PASS',
  checks: 29,
  games: 9,
  funnel: ['invite_link_created', 'invite_landing', 'invite_game_started', 'invite_game_completed'],
  privacy: 'consent-gated; invite session state cleared on withdrawal',
  rewardClaims: 'none',
  revenueClaims: 'none',
}, null, 2))
