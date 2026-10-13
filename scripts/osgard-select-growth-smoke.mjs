import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const read = (path) => readFileSync(path, 'utf8')
const source = read('public/games/game-session-recommendations.js')
const css = read('public/games/game-session-recommendations.css')
const core = read('services/osgard-commerce-api/src/core.mjs')
new vm.Script(source, { filename: 'game-session-recommendations.js' })
const select = source.slice(source.indexOf('/* OSGARD SELECT'))
const serviceLinks = [
  ['MARCOSA','https://marcosa.club/'],['OSGARD PROJECTS','https://osgardbewworld.com/'],
  ['O2 SYSTEM','https://o2system.art/'],['SENJORIO','https://senjorio.com/'],
  ['SUPERDAY','https://superday.run/'],['MYOSA','https://myosa.world/'],
  ['GOLD GLAMOUR','https://gold-glamour.online/'],['GARD VPN','https://gardvpn.is/'],
  ['OSGARD BUSINESS','https://osgardos.com/'],['OSGARD VANGUARD','https://osgardvanguard.studio/'],
]
for(const [name,url] of serviceLinks){assert.ok(select.includes(name),'Missing self-promo label: '+name);assert.ok(select.includes(url),'Missing official destination: '+url)}
for(const game of ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab']) assert.ok(select.includes("'"+game+"'"),'Missing contextual game: '+game)
assert.ok(select.includes("const preferredServiceKey='osgard.games.preferred-service.v1'")&&select.includes('function readPreferredService()')&&select.includes('function savePreferredService(id)'), 'The preferred service must persist locally')
assert.ok(select.includes('function renderSpotlight(serviceId)')&&select.includes('Другой проект')&&select.includes('Запомнить мой выбор'), 'Personal spotlight needs next-service and save-choice controls')
assert.ok(select.includes("collapseToggle.textContent='Выбрать из 10 сервисов'")&&select.includes('grid.hidden=true;filters.hidden=true'), 'The full service directory must be compact by default and user-opened')
assert.ok(select.includes("u.searchParams.set('utm_source','osgard_games')")&&select.includes("u.searchParams.set('utm_medium','post_game')")&&select.includes("u.searchParams.set('utm_campaign','after_game')"), 'Spotlight links must include campaign attribution')
assert.ok(select.includes("РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD")&&select.includes('Автозапуска нет'), 'Owned promotion must remain explicitly labelled and must not autoplay')
assert.ok(select.includes('osgard.games.analytics-consent.v1')&&select.includes("function sendSelectEvent"), 'Analytics must remain consent-gated')
assert.ok(select.includes("['gardvpn','08','GARD VPN'")&&!/GARD VPN[^\n]+false,false/.test(select), 'GARD VPN is an official-site link; the catalogue must not claim service functionality is verified')
assert.ok(css.includes('.og-postgame-spotlight')&&css.includes('@media(max-width:760px)')&&css.includes('prefers-reduced-motion:reduce'), 'Spotlight layout must support mobile and reduced motion')
assert.ok(core.includes('"cross_promo_clicked"')&&core.includes('"owned_promo_impression"'), 'The API already supports consented cross-promotion analytics')
console.log(JSON.stringify({status:'passed',checks:serviceLinks.length+9+7,serviceCount:serviceLinks.length,contextualGames:9}))
