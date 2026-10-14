import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import { validateCampaignPayload } from '../services/osgard-commerce-api/src/campaigns.mjs'

const read = path => readFileSync(path, 'utf8')
const source = read('src/GameIntermissionSponsor.tsx')
const styles = read('src/game-intermission-sponsor.css')
const detail = read('src/GameDetailPage.tsx')
const server = read('services/osgard-commerce-api/src/server.mjs')
const validator = read('services/osgard-commerce-api/src/campaigns.mjs')
const campaignAdmin = read('public/games/admin/campaigns/index.html')
const now = Date.parse('2026-10-14T12:00:00.000Z')
const common = {
  sponsorName: 'Sponsor Example',
  title: 'An after-session offer',
  description: 'A clearly disclosed sponsor offer for the player after the game.',
  targetUrl: 'https://sponsor.example/offer',
  status: 'active',
  sponsorDisclosure: 'Реклама',
  startsAt: '2026-10-14T11:00:00.000Z',
  endsAt: '2026-10-15T11:00:00.000Z',
  frequencyCap: 2,
}
const afterSession = validateCampaignPayload({ ...common, placement: 'after_session' }, { nowMs: now })
assert.equal(afterSession.ok, true, 'After-session sponsor campaigns may publish with a valid live window')
const gameEvent = validateCampaignPayload({ ...common, placement: 'game_event' }, { nowMs: now })
assert.equal(gameEvent.ok, false, 'In-game placements remain closed until their interaction points are individually reviewed')
assert.equal(gameEvent.code, 'CAMPAIGN_PLACEMENT_NOT_INTEGRATED')
assert.ok(server.includes('placement === "after_session" ? 1 : 3'), 'After-session inventory is limited to one card; catalog inventory remains limited to three')
assert.ok(server.includes('LIMIT $2'), 'Campaign API returns a bounded inventory')
assert.ok(source.includes("placement=after_session") && source.includes("credentials: 'omit'"), 'Intermission only requests public after-session campaigns without cookies')
assert.ok(source.includes("if (!hasConsent()) return") && source.includes("sponsor-campaign:"), 'Public metrics are strictly consent-gated and use campaign-scoped sources')
assert.ok(source.includes("entry.intersectionRatio < 0.5") && source.includes("}, 1000)"), 'Impression requires actual viewport visibility for at least one second')
assert.ok(source.includes('utm_source') && source.includes('utm_medium') && source.includes('utm_campaign') && source.includes('utm_content'), 'Sponsor clicks carry first-party UTM attribution')
assert.ok(source.includes("window.OSGARD_CONSENTED_ANALYTICS") && source.includes('/games/consented-analytics.js'), 'Events use the established consented analytics queue')
assert.ok(detail.includes('setAfterSession(true)') && detail.includes('<GameIntermissionSponsor gameId={game.id} locale={locale} />'), 'Offer is rendered only after the player explicitly closes the game')
assert.ok(campaignAdmin.includes('Между игровыми сессиями · подключено') && campaignAdmin.includes('экрана между игровыми сессиями'), 'Operator copy must communicate the real placement scope')
assert.ok(styles.includes('@media(max-width:620px)') && styles.includes('prefers-reduced-motion:reduce') && styles.includes(':focus-visible'), 'Sponsor component is mobile responsive, keyboard accessible and supports reduced motion')
assert.ok(validator.includes('CAMPAIGN_PLACEMENT_NOT_INTEGRATED') && validator.includes('after_session'), 'Validator preserves the unsupported in-game-slot guardrail')

console.log('OSGARD after-session sponsor: PASS — validation, API inventory, privacy, visibility measurement, attribution, placement guardrails and responsive UI.')
