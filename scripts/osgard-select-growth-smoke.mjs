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
const select = js.slice(js.indexOf('function servicesShelf'), js.lastIndexOf('})();'))
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
assert.ok(js.includes('function renderSpotlight(requestedId)'), 'Contextual premium spotlight renderer missing')
assert.ok(js.includes('Другой проект') && js.includes('Запомнить выбор') && js.includes('Изучить проект ↗'), 'Spotlight choice, remember and destination actions missing')
assert.ok(js.includes("if(showPromos&&activeSelected.length)section.append(spotlight)"), 'Spotlight must obey the configured promotion frequency and selected services')
assert.ok(js.includes("const collapseToggle=make('button','og-postgame-toggle og-postgame-collapse-toggle','Выбрать из 10 сервисов')"), 'Complete service directory must be optional, not the first dense screen')
assert.ok(js.includes("['each','После каждой завершённой игры']") && js.includes("['every3','Раз в три завершённых раунда']") && js.includes("['off','Не показывать подборку']"), 'The user-configurable display frequency was removed')
assert.ok(js.includes('function writeServicePreferences(value)'), 'Per-service selection preferences missing')
assert.ok(js.includes('utm_source') && js.includes('utm_medium') && js.includes('utm_campaign') && js.includes('utm_content'), 'Promotional links must preserve first-party campaign attribution')
assert.ok(js.includes('РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD'), 'Promotional content must be disclosed as OSGARD self-promotion')
assert.ok(js.includes("if(!hasConsent())return") && js.includes("sendSelectEvent('owned_promo_impression'") && js.includes('entry.intersectionRatio>=0.5'), 'Exposure measurement must require visibility and the existing consent gate')
assert.ok(commerceCore.includes('"owned_promo_impression"') && commerceCore.includes('"cross_promo_clicked"'), 'Analytics names must be accepted by the existing first-party API contract')
assert.ok(js.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") && js.includes('current.day===day'), 'Local invite reward must remain capped to once per UTC day and browser')
assert.ok(js.includes('Соцсеть не сообщает сайту подтверждение публикации') && js.includes('не являются платёжным средством'), 'Must disclose that social publishing is not verified and SHARDS are non-cash')
assert.ok(lifecycle.includes("function openBetweenWorlds(") && lifecycle.includes("event.preventDefault()"), 'The current player lifecycle must preserve the active-session return/Escape intermission')
assert.ok(js.includes("detail.sessionStarted!==true") && js.includes("detail.reason!=='closed_by_user'"), 'The outer page intermission must only cover genuine active-session close, not finished-game duplication')
assert.ok(js.includes("document.addEventListener('osgard:game-session-ended',event=>{if(event.detail&&event.detail.sessionStarted===true)renderOsgardSelect(event.detail.game)})"), 'The in-player recommendation suite must support active-session return')
assert.ok(css.includes('.og-postgame-spotlight') && css.includes('.og-postgame-spotlight[hidden]') && css.includes('@media(max-width:760px)') && css.includes('prefers-reduced-motion:reduce'), 'Spotlight styles must be responsive, hide correctly and respect reduced motion')
assert.ok(portalSmoke.includes('premium contextual spotlight') && portalSmoke.includes('postGameSpotlight') && portalSmoke.includes('Active game returns must open the between-worlds chooser'), 'Portal regression smoke must exercise the new spotlight and close flow')

console.log(JSON.stringify({
  status:'passed',
  games:games.length,
  ownedProjects:projects.length,
  coverage:'static contracts and JavaScript syntax; runtime assertions are in games-portal-smoke and deployment CI'
}))
