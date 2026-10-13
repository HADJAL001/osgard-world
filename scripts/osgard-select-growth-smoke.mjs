import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(path, 'utf8');
const source = read('public/games/game-session-recommendations.js');
const css = read('public/games/game-session-recommendations.css');
const core = read('services/osgard-commerce-api/src/core.mjs');
const signalRun = read('public/games/signal-run/game.js');
const lifecycle = read('public/games/player-lifecycle.js');
const serverSource = read('services/osgard-commerce-api/src/server.mjs');

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
assert.ok(reward.includes('og-postgame-reward-consent') && reward.includes('hasRewardConsent()'), 'Referral rewards must require separate opt-in');
assert.ok(!reward.includes("claim.addEventListener('click'") && !reward.includes("award('social-confirmation:'), 'The intermission must not award SHARDS for self-confirmed posts');
assert.ok(reward.includes('registerInvite(gameId,code)') && reward.includes('refreshShardsBalance') && reward.includes('60 секунд'), 'Referral rewards must be registered and calculated by the server after qualified play');
assert.ok(reward.includes('Публикацию поста соцсеть не подтверждает') && reward.includes('не имеют денежной стоимости'), 'SHARDS must be disclosed as non-cash with no false claim of social-post verification');
assert.ok(source.includes("const REWARD_CONSENT_KEY='osgard.games.referral-reward-consent.v1'") &&
  source.includes("base+'/v1/referrals/register'") && source.includes("base+'/v1/referrals/reward-status'"),
  'Reward balances must be retrieved through the commerce API, not a local daily wallet');
assert.ok(!source.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") && !source.includes('function award(source)'), 'Legacy local SHARDS minting must be removed from OSGARD SELECT');
assert.ok(lifecycle.includes("activeSessionId='session_'+id+'_'+sequence+'_'+launchAt") && lifecycle.includes('sessionId:activeSessionId') && lifecycle.includes('detail:{game:activeGame,sessionId:activeSessionId}'),
  'The same stable ID must be sent with gameplay completion and post-session return events');
assert.ok(source.includes('function recordCompletedRound(gameId,sessionId)') && source.includes('current.sessions.includes(key)') && source.includes('slice(-100)'),
  'Post-game promotion cadence must deduplicate session IDs, not rely only on a 2.5-second timing window');
assert.ok(source.includes('const isSpotlight=id===spotlightServiceId') && source.includes("cards.forEach(card=>card.classList.toggle('is-featured',card.dataset.service===spotlightServiceId))"),
  'The featured directory card must always match the personalized spotlight, including after rotation');

const claimSignal = signalRun.indexOf("claimShare.addEventListener('click'");
const shareSignal = signalRun.indexOf("$('share').addEventListener('click',async()=>{");
const shareSignalEnd = signalRun.indexOf("});document.addEventListener('keydown'", shareSignal);
assert.ok(claimSignal >= 0 && shareSignal >= 0 && shareSignalEnd > shareSignal,
  'SIGNAL RUN explicit claim and share-intent handlers must be present');
const signalShareHandler = signalRun.slice(shareSignal, shareSignalEnd);
assert.ok(!signalShareHandler.includes("life('share_created'"),
  'SIGNAL RUN must not report a completed share before the player confirms it');
assert.ok(!signalRun.includes('awardShareShards') && signalRun.slice(claimSignal).includes("window.top.location.assign(destination)") &&
  signalRun.slice(claimSignal).includes('60 секунд'),
  'SIGNAL RUN must route to the verified invite program and never mint local rewards');

console.log(JSON.stringify({
  status: 'passed',
  serviceDestinations: services.length,
  gameContexts: 9,
  checks: 33,
  notes: 'Source-level guardrails; social publication is self-confirmed, not verified by social-network APIs.'
}));

assert.ok(core.includes('REFERRAL_REWARD_POINTS') && core.includes('REFERRAL_MIN_SESSION_SECONDS = 60') && core.includes('parseReferralRewardEvent'), 'Commerce core must validate server-verified referral sessions and fixed rewards');
assert.ok(serverSource.includes('game_referral_rewards') && serverSource.includes('processReferralRewardEvent') && serverSource.includes('game_referral_visits'), 'Commerce API must persist referral qualification and deduplicate awards');
assert.ok(lifecycle.includes('og_[a-f0-9]{32}') && lifecycle.includes('value.visitorToken'), 'Gameplay events must preserve the secure referral code and invited-player token');
assert.ok(!signalRun.includes('awardShareShards') && !signalRun.includes("life('share_created',{shareMethod:method,dailyMode,dailyDate:dailyMode?dailyDate:null,rewardConfirmedByPlayer:true})"), 'SIGNAL RUN must never mint referral rewards from an unverified post');
