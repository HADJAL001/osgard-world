import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const read = (path) => readFileSync(path, 'utf8')
const source = read('public/games/game-session-recommendations.js')
const css = read('public/games/game-session-recommendations.css')
const commerceCore = read('services/osgard-commerce-api/src/core.mjs')
const start = source.indexOf('/* OSGARD SELECT v2')
assert.ok(start >= 0, 'OSGARD SELECT v2 block must exist')
const select = source.slice(start)
new vm.Script(source, { filename: 'game-session-recommendations.js' })

const projects = [
  ['MARCOSA', 'https://marcosa.club/'],
  ['OSGARD PROJECTS', 'https://osgardbewworld.com/'],
  ['O2 SYSTEM', 'https://o2system.art/'],
  ['SENJORIO', 'https://senjorio.com/'],
  ['SUPERDAY', 'https://superday.run/'],
  ['MYOSA', 'https://myosa.world/'],
  ['GOLD GLAMOUR', 'https://gold-glamour.online/'],
  ['GARD VPN', 'https://gardvpn.is/'],
  ['OSGARD BUSINESS', 'https://osgardos.com/'],
  ['OSGARD VANGUARD', 'https://osgardvanguard.studio/'],
]
for (const [name, url] of projects) {
  assert.ok(select.includes(name), 'Missing own-service card: ' + name)
  assert.ok(select.includes(url), 'Missing official service destination: ' + url)
}
for (const game of ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab']) {
  assert.ok(select.includes("'" + game + "'"), 'Missing game context: ' + game)
}
for (const metric of ['cross_promo_clicked','share_dialog_opened','share_created','share_link_copied','service_recommendation_changed']) {
  assert.ok(select.includes("'" + metric + "'"), 'Missing consent-aware event: ' + metric)
}
for (const network of ['Telegram','WhatsApp','VK','X','Facebook']) assert.ok(select.includes("'" + network + "'"), 'Missing social sharing target: ' + network)
assert.ok(select.includes("const preferredKey='osgard.games.preferred-service.v1'"), 'The user's preferred service must persist on-device')
assert.ok(select.includes("const initial=readPreferred()||recommendationByGame[gameId]||'marcosa'"), 'Contextual suggestion must respect an explicitly saved preference')
assert.ok(select.includes("u.searchParams.set('utm_source','osgard_games')") && select.includes("u.searchParams.set('utm_campaign','after_game')"), 'Service links must include game-level campaign attribution')
assert.ok(commerceCore.includes('"cross_promo_clicked"') && commerceCore.includes('"share_dialog_opened"') && commerceCore.includes('"share_link_copied"') && commerceCore.includes('"service_recommendation_changed"'), 'Commerce API must allow the client events this intermission emits')
assert.ok(select.includes("if(!hasConsent())return"), 'Optional event delivery must be consent-gated')
assert.ok(select.includes("const walletKey='osgard.games.shards-wallet.v1'") && select.includes("current.day===day"), 'Local reward must be limited to once per day on that browser')
assert.ok(select.includes('РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'), 'Cross-promotion must be identified as self-promotion')
assert.ok(select.includes('Соцсеть не передаёт сайту надёжного подтверждения публикации'), 'UI must not claim social-post verification')
assert.ok(select.includes('не деньги, не платёжное средство') && select.includes('серверный журнал начислений'), 'Local SHARDS restrictions and server-ledger limitation must be disclosed')
assert.ok(select.includes("const toggle=make('button','og-postgame-toggle','Выбрать из 10 сервисов')") && select.includes("const grid=make('div','og-postgame-service-grid');grid.hidden=true"), 'The intermission should start compact, with the full service catalog optional')
assert.ok(select.includes('function renderSpotlight(id)') && select.includes('Другой проект') && select.includes('Запомнить мой выбор'), 'The contextual spotlight must allow browsing and saving a preferred service')
assert.ok(css.includes('.og-postgame-spotlight') && css.includes('@media(max-width:760px)') && css.includes('prefers-reduced-motion:reduce'), 'Spotlight styles must support mobile and reduced motion')
console.log(JSON.stringify({status:'passed',checks:projects.length+9+5+8,projects:projects.length,networks:5,contextualGames:9}))
