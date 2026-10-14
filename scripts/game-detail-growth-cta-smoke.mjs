import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'

const detail = readFileSync('src/GameDetailPage.tsx', 'utf8')
const styles = readFileSync('src/games-hub.css', 'utf8')
const eventQueue = readFileSync('src/core/eventQueue.ts', 'utf8')
const conversionAnalytics = readFileSync('src/core/gameConversionAnalytics.mjs', 'utf8')
const manifest = readFileSync('src/core/manifest.ts', 'utf8')
const commerceClient = readFileSync('public/games/commerce-client.js', 'utf8')
const partnerPage = readFileSync('public/games/partners/index.html', 'utf8')
const partnerInventory = readFileSync('public/games/partners/partners.js', 'utf8')
const apiCore = readFileSync('services/osgard-commerce-api/src/core.mjs', 'utf8')
const packageJson = JSON.parse(readFileSync('package.json', 'utf8'))

assert.ok(detail.includes('function gameConversionUrl('), 'Game detail needs one canonical URL builder for conversion links')
for (const value of [
  "utm_source: 'osgard_games'", "utm_medium: 'cross_promo'",
  "utm_campaign: kind === 'development' ? 'game_detail_intake' : 'game_detail_sponsorship'",
  'utm_content: gameId', 'game_id: gameId', '#project-intake', '#brief',
  'gh-commercial-bridge', 'Discuss game development', 'Обсудить создание игры', 'Обсудить спонсорство',
]) assert.ok(detail.includes(value), 'Game-detail conversion bridge is missing: ' + value)
assert.equal(detail.split('trackGameConversionClick(game.id,').length - 1, 2, 'Both first-party CTAs should use the consented conversion endpoint')
assert.ok(manifest.includes("| 'cross_promo_clicked'"), 'Cross-promo event must use the existing first-party event schema')
assert.ok(eventQueue.includes('if (!hasAnalyticsConsent())'), 'The event queue must default-deny analytics without consent')
assert.ok(eventQueue.includes('clearAnalyticsRecords()'), 'Consent revocation must continue to clear queued records')
assert.ok(conversionAnalytics.includes("import { hasAnalyticsConsent } from './analyticsConsent.mjs'"), 'Conversion analytics must reuse the explicit site consent choice')
assert.ok(conversionAnalytics.includes('if (!hasAnalyticsConsent()) return false'), 'Conversion analytics must default-deny without explicit consent')
assert.ok(conversionAnalytics.includes("name: 'cross_promo_clicked'"), 'Commercial CTA intent must use the existing event schema')
assert.ok(conversionAnalytics.includes("window.fetch('/commerce-api/v1/events'"), 'Anonymous consented clicks must reach the first-party Commerce API')
assert.ok(conversionAnalytics.includes("credentials: 'omit'") && conversionAnalytics.includes('keepalive: true'), 'Conversion request must omit ambient cookies and survive supported navigations')
assert.ok(conversionAnalytics.includes('path: window.location.pathname'), 'Only pathname, not query string or full referrer, may be stored')
assert.ok(!conversionAnalytics.includes('document.referrer') && !conversionAnalytics.includes('location.search'), 'Conversion analytics must not collect query strings or referrer URLs')
assert.ok(conversionAnalytics.includes("const DESTINATIONS = new Set(['development-intake', 'sponsorship-inquiry'])"), 'Conversion destinations must be allow-listed')
assert.ok(apiCore.includes('"cross_promo_clicked"'), 'Server must allow the existing cross-promo event')
assert.ok(apiCore.includes('if (input.consent !== true)'), 'Server event batch must require explicit consent')

assert.ok(commerceClient.includes('function readLeadAttribution(form)'), 'Server lead submission must read a bounded attribution object')
assert.ok(commerceClient.includes('attribution: leadAttribution'), 'Lead submission must persist attribution as structured fields, not only embed it in free text')
assert.ok(commerceClient.includes("const ATTRIBUTION_GAME_IDS = new Set(['time','swarm','null-shift','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid'])"), 'Lead attribution must allow-list known game IDs')
assert.ok(commerceClient.includes("gameId: ATTRIBUTION_GAME_IDS.has(gameCandidate) ? gameCandidate : 'unknown'"), 'Unknown game IDs must be normalized rather than trusted')
assert.ok(commerceClient.includes("safeAttributionSlug(params.get('utm_source'"), 'Source/campaign values need strict slug normalization')
assert.ok(commerceClient.includes("form.id === 'campaign-form' ? 'partner-form' : 'development-page'"), 'Non-campaign inquiries must have a truthful fallback source')
assert.ok(apiCore.includes('attribution: normalizeCheckoutAttribution(input.attribution)'), 'Commerce API must validate lead attribution on the server')
assert.ok(apiCore.includes('gameId: GAME_IDS.has(gameCandidate) ? gameCandidate : "unknown"'), 'Server must independently allow-list game IDs')
assert.ok(partnerPage.includes('id="campaign-form"') && partnerPage.includes('name="consent" required'), 'Sponsor form needs explicit processing acknowledgement')
assert.ok(partnerPage.includes('commerce-client.js') && partnerInventory.includes('Черновик подготовлен локально'), 'Manual WhatsApp fallback must remain available')
assert.ok(commerceClient.includes('if (!consent)'), 'No partner form data may be submitted without explicit consent')
assert.ok(commerceClient.includes("if (!base) throw new Error('COMMERCE_API_NOT_CONFIGURED')"), 'Unconfigured API must not be represented as successful storage')
assert.ok(commerceClient.includes('fallbackLink(form, fallbackText)'), 'Failed server submission must retain manual contact fallback')

for (const value of ['.gh-commercial-bridge', '.gh-commercial-bridge__actions', 'min-height:66px', 'focus-visible', 'prefers-reduced-motion']) {
  assert.ok(styles.includes(value), 'Responsive/accessibility styling missing: ' + value)
}
assert.ok(!/https?:\/\/(?:fonts\.googleapis|cdn\.jsdelivr|unpkg\.com)/i.test(detail + styles), 'Conversion bridge must not add third-party runtime dependencies')
assert.ok(packageJson.scripts['qa:game-business-bridge'], 'Package scripts must expose the new smoke check')

console.log('PASS OSGARD game-to-business bridge: 11-game allowlist, contextual links, consent-gated events, validated server attribution, responsive focus and manual fallback.')
