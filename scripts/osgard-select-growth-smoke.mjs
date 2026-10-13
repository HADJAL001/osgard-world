import assert from 'node:assert/strict'
import { readFileSync } from 'node:fs'
import vm from 'node:vm'

const read = (path) => readFileSync(path, 'utf8')
const source = read('public/games/game-session-recommendations.js')
const css = read('public/games/game-session-recommendations.css')
const core = read('services/osgard-commerce-api/src/core.mjs')
const playSelect = read('src/PlaySelectLoop.tsx')
const signalRun = read('public/games/signal-run/game.js')
new vm.Script(source, { filename: 'game-session-recommendations.js' })
const select = source.slice(source.indexOf('/* OSGARD SELECT'))
const services = [
 ['MARCOSA','https://marcosa.club/'],['OSGARD PROJECTS','https://osgardbewworld.com/'],
 ['O2 SYSTEM','https://o2system.art/'],['SENJORIO','https://senjorio.com/'],
 ['SUPERDAY','https://superday.run/'],['MYOSA','https://myosa.world/'],
 ['GOLD GLAMOUR','https://gold-glamour.online/'],['GARD VPN','https://gardvpn.is/'],
 ['OSGARD BUSINESS','https://osgardos.com/'],['OSGARD VANGUARD','https://osgardvanguard.studio/'],
]
for (const [name,url] of services) {
 assert.ok(select.includes(name),'Missing self-promo label: '+name)
 assert.ok(select.includes(url),'Missing official destination: '+url)
}
for (const game of ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab']) assert.ok(select.includes("'"+game+"'"),'Missing game context: '+game)
assert.ok(select.includes("const preferredServiceKey='osgard.games.preferred-service.v1'")&&select.includes('function readPreferredService()')&&select.includes('function savePreferredService(id)'), 'Preferred service should persist locally')
assert.ok(select.includes('function renderSpotlight(serviceId)')&&select.includes('Другой проект')&&select.includes('Запомнить мой выбор'), 'Spotlight needs rotate and save-preference controls')
assert.ok(select.includes("collapseToggle.textContent='Выбрать из 10 сервисов'")&&select.includes('grid.hidden=true;filters.hidden=true'), 'Full service catalogue must be compact by default and user-opened')
assert.ok(select.includes("u.searchParams.set('utm_source','osgard_games')")&&select.includes("u.searchParams.set('utm_medium','post_game')")&&select.includes("u.searchParams.set('utm_campaign','after_game')"), 'Spotlight links need source and game attribution')
assert.ok(select.includes("РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD")&&select.includes('Автозапуска нет'), 'Cross-promo must be labelled and must not autoplay')
assert.ok(select.includes('function sendSelectEvent')&&select.includes('function hasConsent()'), 'Analytics must reuse the explicit consent gate')
assert.ok(select.includes("sendSelectEvent('owned_promo_impression',gameId,'osgard-select:spotlight:'"), 'Spotlight visibility must be measured via the consented owned-promo event')
assert.ok(core.includes('"cross_promo_clicked"')&&core.includes('"owned_promo_impression"'), 'Commerce API must accept the existing first-party promotion metrics')
assert.ok(!/GARD VPN[^\n]+false,false/.test(select), 'GARD VPN should link to its official site without asserting functionality is verified')
assert.ok(css.includes('.og-postgame-spotlight')&&css.includes('@media(max-width:760px)')&&css.includes('prefers-reduced-motion:reduce'), 'Spotlight layout must support mobile and reduced motion')
console.log(JSON.stringify({status:'passed',checks:services.length+9+7,serviceCount:services.length,contextualGames:9}))

const rewardSource = source.slice(source.indexOf('function rewardShelf(gameId){'), source.indexOf('function renderOutsideIntermission(detail)'))
assert.ok(rewardSource.includes("pending='native-share'") && rewardSource.includes('claim.hidden=false'), 'Native share should reveal an explicit claim action rather than grant a reward immediately')
assert.ok(rewardSource.includes('Копирование само по себе не считается репостом') && rewardSource.includes('claim.hidden=true'), 'Copying a link must never grant SHARDS automatically')
assert.ok(!rewardSource.includes("show(award(source+':'+gameId))"), 'Native-share completion or clipboard success must not auto-award SHARDS')
assert.ok(rewardSource.includes("claim.addEventListener('click'") && rewardSource.includes("award('social-confirmation:'+network)"), 'SHARDS can only be claimed after an explicit social-post confirmation')
assert.ok(playSelect.includes("setPendingNetwork('native-share')") && playSelect.includes("grantReward('homepage-social-confirmation:' + pendingNetwork)"), 'Homepage social rewards must also require an explicit claim')
assert.ok(!playSelect.includes("grantReward('homepage-native-share')") && !playSelect.includes("grantReward('homepage-clipboard')"), 'Homepage share-sheet completion or link copying must not automatically grant SHARDS')
assert.ok(signalRun.includes("claimShare.addEventListener('click'") && signalRun.includes("pendingShareReward"), 'SIGNAL RUN share reward must require an explicit in-game claim')
assert.ok(!signalRun.includes("awardShareShards('web-share-image')") && !signalRun.includes("awardShareShards('web-share')"), 'SIGNAL RUN share completion must not automatically award SHARDS')
