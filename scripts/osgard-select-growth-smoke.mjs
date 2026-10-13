import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const read = (path) => readFileSync(path, 'utf8')
const js = read('public/games/game-session-recommendations.js')
const lifecycle = read('public/games/player-lifecycle.js')
const css = read('public/games/game-session-recommendations.css')
const portalSmoke = read('scripts/games-portal-smoke.mjs')
const commerceCore = read('services/osgard-commerce-api/src/core.mjs')

new vm.Script(js, { filename: 'game-session-recommendations.js' })
const select = js.slice(js.indexOf('/* OSGARD SELECT'), js.lastIndexOf('})();'))
const titleMap = js.slice(js.indexOf('const titles='), js.indexOf('const services='))

const games = ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab']
for (const game of games) {
  assert.ok(titleMap.includes("'" + game + "':") || titleMap.includes(game + ':'), 'Missing game ID from the current player title map: ' + game)
}
const projects = [
  ['MARCOSA','https://marcosa.club/'],['OSGARD PROJECTS','https://osgardbewworld.com/'],
  ['O2 SYSTEM','https://o2system.art/'],['SENJORIO','https://senjorio.com/'],
  ['SUPERDAY','https://superday.run/'],['MYOSA','https://myosa.world/'],
  ['GOLD GLAMOUR','https://gold-glamour.online/'],['GARD VPN','https://gardvpn.is/'],
  ['OSGARD BUSINESS','https://osgardos.com/'],['OSGARD VANGUARD','https://osgardvanguard.studio/'],
]
for (const [name,url] of projects) {
  assert.ok(js.includes(name), 'Missing OSGARD project: ' + name)
  assert.ok(js.includes(url), 'Missing project destination: ' + url)
}
assert.ok(js.includes("const preferredServiceKey='osgard.games.preferred-service.v1'"), 'Saved preferred service key missing')
assert.ok(js.includes('const recommendationByGame='), 'Per-game recommendation map missing')
assert.ok(select.includes('function renderSpotlight(requestedId)'), 'Contextual premium spotlight renderer missing')
assert.ok(select.includes('Другой проект') && select.includes('Запомнить выбор') && select.includes('Изучить проект ↗'), 'Spotlight must let a player open, cycle and remember a service')
assert.ok(select.includes("if(showPromos&&activeSelected.length)section.append(spotlight)"), 'Spotlight must honour selected services and current display frequency')
assert.ok(select.includes("const collapseToggle=make('button','og-postgame-toggle og-postgame-collapse-toggle','Выбрать из 10 сервисов')"), 'The full service directory must be opt-in')
assert.ok(select.includes("['each','После каждой завершённой игры']") && select.includes("['every3','Раз в три завершённых раунда']") && select.includes("['off','Не показывать подборку']"), 'Existing user-controlled frequency options must be preserved')
assert.ok(select.includes('function writeServicePreferences(value)'), 'Per-service selection settings must remain available')
assert.ok(select.includes('utm_source') && select.includes('utm_medium') && select.includes('utm_campaign') && select.includes('utm_content'), 'Promotional links must preserve first-party game attribution')
assert.ok(select.includes('РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'), 'Owned promotion must be clearly disclosed')
assert.ok(select.includes('function hasConsent()') && select.includes('sendSelectEvent(\'owned_promo_impression\'') && select.includes('entry.intersectionRatio>=0.5'), 'Exposure tracking must remain visibility-based and consent-gated')
assert.ok(select.includes("new Set(['cross_promo_clicked','owned_promo_impression','social_share_intent','social_reward_claimed','share_created'])") && select.includes("fetch('/games/commerce-config.json'") && select.includes("fetch(base+'/v1/events'"), 'SELECT telemetry must use its allowlisted current same-origin API client')
assert.ok(commerceCore.includes('"owned_promo_impression"') && commerceCore.includes('"cross_promo_clicked"'), 'Telemetry names must be accepted by the existing first-party API contract')
assert.ok(select.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") && select.includes('current.day===day'), 'Local invite reward must remain capped once per UTC day and browser')
assert.ok(select.includes('Соцсеть не сообщает сайту подтверждение публикации') && select.includes('не являются платёжным средством'), 'Social sharing must not be represented as verified and SHARDS must remain non-cash')
assert.ok(lifecycle.includes('function openBetweenWorlds(') && lifecycle.includes("osgard:request-postgame") && lifecycle.includes('event.preventDefault()'), 'The latest active-session/Escape return flow must remain intact')
assert.ok(select.includes("detail.sessionStarted!==true") && select.includes("detail.reason!=='closed_by_user'"), 'Finished rounds must not create an extra outside intermission')
assert.ok(select.includes("document.addEventListener('osgard:game-session-ended',event=>{if(event.detail&&event.detail.sessionStarted===true)renderOsgardSelect(event.detail.game)})"), 'The SELECT suite must still be available after an active game returns to the catalogue')
assert.ok(css.includes('.og-postgame-spotlight') && css.includes('.og-postgame-spotlight[hidden]') && css.includes('@media(max-width:760px)') && css.includes('prefers-reduced-motion:reduce'), 'Spotlight styles must be responsive, hide correctly and respect reduced motion')
assert.ok(portalSmoke.includes('premium contextual spotlight') && portalSmoke.includes('postGameSpotlight') && portalSmoke.includes('The full service directory should be hidden until requested'), 'Portal smoke must exercise the spotlight and compact directory')

console.log(JSON.stringify({
  status:'passed',
  games:games.length,
  ownedProjects:projects.length,
  coverage:'static contracts and JavaScript syntax; browser/runtime behaviour is exercised by qa:games-portal'
}))
