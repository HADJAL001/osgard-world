import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(path, 'utf8');
const source = read('public/games/game-session-recommendations.js');
const css = read('public/games/game-session-recommendations.css');
const core = read('services/osgard-commerce-api/src/core.mjs');
const signalRun = read('public/games/signal-run/game.js');
const lifecycle = read('public/games/player-lifecycle.js');

new vm.Script(source, { filename: 'game-session-recommendations.js' });
new vm.Script(signalRun, { filename: 'signal-run/game.js' });

const services = [
  ['MARCOSA', 'https://marcosa.club/'],
  ['OSGARD BEW WORLD', 'https://osgardbewworld.com/'],
  ['O2 SYSTEM', 'https://o2system.art/'],
  ['SENJORIO', 'https://senjorio.com/'],
  ['SUPERDAY', 'https://superday.run/'],
  ['MYOSA', 'https://myosa.world/'],
  ['GOLD GLAMOUR', 'https://gold-glamour.online/'],
  ['GARD VPN', 'https://gardvpn.is/'],
  ['OSGARD OS', 'https://osgardos.com/'],
  ['OSGARD VANGUARD STUDIO', 'https://osgardvanguard.studio/'],
];
for (const [label, url] of services) {
  assert.ok(source.includes(label), 'Missing official service label: ' + label);
  assert.ok(source.includes(url), 'Missing official destination: ' + url);
}
const recommendationMapMatch = source.match(/const recommendationByGame=(\{[\s\S]*?\});/);
assert.ok(recommendationMapMatch, 'Missing game-specific recommendation map');
const recommendationMap = vm.runInNewContext('(' + recommendationMapMatch[1] + ')');
for (const id of ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run']) {
  assert.ok(Object.prototype.hasOwnProperty.call(recommendationMap, id), 'Missing game-specific growth context: ' + id);
  assert.ok(Array.isArray(recommendationMap[id]) && recommendationMap[id].length > 0,
    'Game-specific growth context must contain prioritized services: ' + id);
}
assert.ok(source.includes("const preferredServiceKey='osgard.games.preferred-service.v1'") &&
  source.includes('function readPreferredService()') && source.includes('function savePreferredService(id)'),
  'A locally saved preferred service must be available');
assert.ok(source.includes('function renderSpotlight(serviceId)') &&
  source.includes('Другой проект') && source.includes('Запомнить мой выбор'),
  'The luxury spotlight requires rotate and save-preference controls');
assert.ok(source.includes("frequency:'each'") &&
  source.includes("['each','После каждой завершённой игры']") &&
  source.includes("['every3','Раз в три завершённых раунда']") &&
  source.includes("['off','Не показывать подборку']"),
  'Post-game promos must default to every round and remain user-controllable');
assert.ok(source.includes('grid.hidden=true;filters.hidden=true') &&
  source.includes("collapseToggle.textContent=showPromos?'Выбрать из '+availableServiceIds.length+' сервисов'"),
  'The service directory must be compact by default and open only when requested');
assert.ok(source.includes("u.searchParams.set('utm_source','osgard_games')") &&
  source.includes("u.searchParams.set('utm_medium','post_game')") &&
  source.includes("u.searchParams.set('utm_campaign','after_game')"),
  'Each service link needs source, placement and campaign attribution');
assert.ok(source.includes("РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD") &&
  source.includes('Автозапуска нет'), 'Self-promotion must be labelled and never autoplay');
assert.ok(source.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN','VPN-сервис. Описание и условия доступны на сайте проекта; доступность домена не была подтверждена проверкой.','https://gardvpn.is/',false,true]"),
  'GARD VPN is selectable, with an explicit disclosure that its live availability was not independently confirmed');
assert.ok(source.includes("const activeSelected=services.filter(([id,,,,,,featured=false,active=true])=>active!==false&&preferences.selected.includes(id))") &&
  source.includes("const visible=activeSelected;"),
  'Unavailable service IDs must be excluded from the promotable service card grid');
assert.ok(source.includes("if(!hasConsent()||!selectAllowedEvents.has(name))return false") &&
  source.includes("sendSelectEvent('owned_promo_impression',gameId,'osgard-select:spotlight:'"),
  'Spotlight exposure measurement must be behind explicit analytics consent');
assert.ok(core.includes('"owned_promo_impression"') && core.includes('"cross_promo_clicked"'),
  'Commerce API must allow only the existing, consented first-party promo events');
assert.ok(css.includes('.og-postgame-spotlight{') &&
  css.includes('@media(max-width:760px)') && css.includes('prefers-reduced-motion:reduce'),
  'Premium spotlight styling must support mobile and reduced-motion settings');

const rewardStart = source.indexOf('function rewardShelf(gameId){');
const rewardEnd = source.indexOf('function renderOutsideIntermission(detail)', rewardStart);
assert.ok(rewardStart >= 0 && rewardEnd > rewardStart, 'Social reward section must remain independently testable');
const reward = source.slice(rewardStart, rewardEnd);
const primaryStart = reward.indexOf("primary.addEventListener('click',async()=>{");
const primaryEnd = reward.indexOf("const note=make('p','og-postgame-reward-note'", primaryStart);
assert.ok(primaryStart >= 0 && primaryEnd > primaryStart, 'Share intent handler boundaries are required');
const primaryHandler = reward.slice(primaryStart, primaryEnd);
assert.ok(!primaryHandler.includes("sendSelectEvent('share_created'"),
  'Opening the system share sheet or copying a link must not count as a completed share');
assert.ok(!reward.includes("award('social-confirmation:'+network)") && !reward.includes("sendSelectEvent('social_reward_claimed'"),
  'SHARDS must not be granted in return for a repost or self-confirmation of one');
assert.ok(reward.includes("awardDailyPlayReward('daily-play:'+gameId)") &&
  reward.includes("sendSelectEvent('daily_play_reward_claimed'"),
  'Daily SHARDS must be tied to a completed game-session flow, not social publication');
assert.ok(source.includes('function awardReferralWelcomeBonus(gameId)') &&
  source.includes("sendSelectEvent('referral_welcome_reward_claimed'") &&
  source.includes('osgard.games.referral-welcome-reward.v1'),
  'A valid referred player should receive a single local welcome bonus after completing a session');
assert.ok(reward.includes('og-shards-vault') && reward.includes('NORTHSTAR') && reward.includes('ECLIPSE') && reward.includes('AURORA') &&
  reward.includes('cost:100') && reward.includes('cost:250') && reward.includes('cost:400'),
  'The SHARDS Vault must expose three cosmetic-only unlocks with clear local costs');
assert.ok(reward.includes('не имеют денежной стоимости') && reward.includes('Без pay-to-win') &&
  reward.includes('SHARDS не выдаются за сам репост'),
  'Reward copy must disclose non-cash/local status and no reward for reposts');
assert.ok(source.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") &&
  source.includes('current.day===day'),
  'The local daily reward must be limited to once per UTC day/device wallet');
assert.ok(lifecycle.includes("activeSessionId='session_'+id+'_'+sequence+'_'+launchAt") && lifecycle.includes('sessionId:activeSessionId') && lifecycle.includes('detail:{game:activeGame,sessionId:activeSessionId}'),
  'The same stable ID must be sent with gameplay completion and post-session return events');
assert.ok(source.includes('function recordCompletedRound(gameId,sessionId)') && source.includes('current.sessions.includes(key)') && source.includes('slice(-100)'),
  'Post-game promotion cadence must deduplicate session IDs, not rely only on a 2.5-second timing window');
assert.ok(source.includes('const isSpotlight=id===spotlightServiceId') && source.includes("cards.forEach(card=>card.classList.toggle('is-featured',card.dataset.service===spotlightServiceId))"),
  'The featured directory card must always match the personalized spotlight, including after rotation');

const shareSignal = signalRun.indexOf("const rawScore=(s.mode==='running'||s.mode==='over')?s.score:s.best");
const shareSignalEnd = signalRun.indexOf("document.addEventListener('keydown'", shareSignal);
assert.ok(shareSignal >= 0 && shareSignalEnd > shareSignal, 'SIGNAL RUN share-intent handler must be present');
const signalShareHandler = signalRun.slice(shareSignal, shareSignalEnd);
assert.ok(signalShareHandler.includes("life('share_intent'") &&
  !signalShareHandler.includes("awardShareShards") && !signalShareHandler.includes("life('share_created'"),
  'SIGNAL RUN social buttons must not claim completed shares or award SHARDS for publication');
assert.ok(signalRun.includes('function awardDailyPlayShards(source)') &&
  signalRun.includes("const dailyBonus=awardDailyPlayShards('signal-run:'") &&
  signalRun.includes("dailyRewardShards:dailyBonus.ok?SHARDS_DAILY_REWARD:0"),
  'SIGNAL RUN must award daily SHARDS on a completed run');
assert.ok(!signalRun.includes("claimShare.addEventListener") && !signalRun.includes("pendingShareReward") &&
  !read('public/games/signal-run/index.html').includes('claim-share-reward'),
  'The old self-confirmed share-reward control must be removed from SIGNAL RUN');

assert.ok(css.includes('.og-shards-vault-grid{') && css.includes('.og-postgame-daily-reward{') &&
  css.includes('.og-postgame-reward[data-cosmetic="eclipse"]') &&
  css.includes('@media(max-width:600px)') && css.includes('prefers-reduced-motion:reduce'),
  'The SHARDS Vault needs responsive and reduced-motion-safe styles');
assert.ok(core.includes('"daily_play_reward_claimed"') && core.includes('"referral_welcome_reward_claimed"'),
  'Commerce API must allow only bounded, consented gameplay reward events');
console.log(JSON.stringify({
  status: 'passed',
  serviceDestinations: services.length,
  gameContexts: 9,
  checks: 36,
  notes: 'Source-level guardrails; share buttons are voluntary, rewards are gameplay-based, and invite bonuses are a local prototype.'
}));
