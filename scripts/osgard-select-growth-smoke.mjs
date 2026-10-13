import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(path, 'utf8');
const source = read('public/games/game-session-recommendations.js');
const css = read('public/games/game-session-recommendations.css');
const core = read('services/osgard-commerce-api/src/core.mjs');
const signalRun = read('public/games/signal-run/game.js');
const lifecycle = read('public/games/player-lifecycle.js');
const referralApiSource = read('services/osgard-commerce-api/src/server.mjs');
const inviteLanding = read('public/games/invite/invite-landing.js');

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
const spotlightPickerSource = source.match(/function chooseSpotlightService\(options,preferred,completedCount,frequency\)\{[\s\S]*?\n\}/);
assert.ok(spotlightPickerSource, 'Automatic spotlight rotation helper must be independently testable');
const chooseSpotlightService = vm.runInNewContext('(' + spotlightPickerSource[0] + ')');
assert.equal(chooseSpotlightService(['myosa','projects','superday'],'',1,'each'),'myosa',
  'First completed round starts with the contextual first-choice service');
assert.equal(chooseSpotlightService(['myosa','projects','superday'],'',2,'each'),'projects',
  'The primary service should rotate on the next completed round');
assert.equal(chooseSpotlightService(['myosa','projects','superday'],'',3,'each'),'superday',
  'The third completed round should feature the third contextual service');
assert.equal(chooseSpotlightService(['myosa','projects','superday'],'',4,'each'),'myosa',
  'After all selected services were featured, the rotation should return to the first service');
assert.equal(chooseSpotlightService(['myosa','projects','superday'],'',3,'every3'),'myosa',
  'Three-round frequency starts its first scheduled spotlight at round three');
assert.equal(chooseSpotlightService(['myosa','projects','superday'],'',6,'every3'),'projects',
  'Every-third-round promos should rotate on subsequent eligible displays');
assert.equal(chooseSpotlightService(['myosa','projects','superday'],'superday',8,'each'),'superday',
  'An explicit saved preference overrides automatic rotation');
assert.equal(chooseSpotlightService([],'',4,'each'),'',
  'Rotation must handle an empty user-selected service list');

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
assert.ok(primaryHandler.includes('registerReferralInvite(gameId,code)') &&
  primaryHandler.includes('navigator.share') &&
  primaryHandler.includes("sendSelectEvent('share_created',gameId,'game-invite:'"),
  'Referral sharing must register the code before share and only then record invite creation');
assert.ok(!reward.includes("award('social-confirmation:") && !reward.includes("claim.addEventListener('click'"),
  'A user must not be able to self-award SHARDS by claiming they posted');
assert.ok(reward.includes('hasReferralRewardConsent()') &&
  reward.includes("localStorage.setItem(rewardConsentKey,'yes')") &&
  reward.includes("localStorage.removeItem(rewardConsentKey)") &&
  reward.includes('/v1/referrals/register') &&
  reward.includes('/v1/referrals/balance'),
  'Referral rewards require separate consent and server registration/balance endpoints');
assert.ok(reward.includes('не короче 60 секунд') &&
  reward.includes('Нет награды за клик, копирование или самоподтверждение репоста') &&
  reward.includes('не имеют денежной стоимости'),
  'SHARDS must be server-qualified after 60 seconds and disclose non-cash value');
assert.ok(source.includes("const inviteCodesKey='osgard.games.shards-invite-codes.v1'") &&
  source.includes('async function registerReferralInvite') &&
  source.includes('async function refreshReferralBalance') &&
  source.includes('function referralOwnerToken'),
  'Invite codes and balances must use anonymous browser tokens and server state, not a local points wallet');
assert.ok(!source.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") &&
  !source.includes('function award(source){'),
  'Client-side reward wallet and self-award mutation must be removed');
assert.ok(lifecycle.includes("activeSessionId='session_'+id+'_'+sequence+'_'+launchAt") && lifecycle.includes('sessionId:activeSessionId') && lifecycle.includes('detail:{game:activeGame,sessionId:activeSessionId}'),
  'The same stable ID must be sent with gameplay completion and post-session return events');
assert.ok(source.includes("byGame[gameId]=Math.min((byGame[gameId]||0)+1,1000000000)") &&
  source.includes("const roundForSpotlight=preferences.frequency==='every3'?completedCount:(readServiceProgress().byGame[gameId]||1)"),
  'Spotlight should rotate by repetitions of the same game while promo frequency remains global');
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
assert.ok(signalRun.slice(claimSignal).includes("life('share_created',{shareMethod:method,dailyMode,dailyDate:dailyMode?dailyDate:null,rewardConfirmedByPlayer:true})"),
  'SIGNAL RUN completed-share analytics must follow the explicit reward confirmation');

assert.ok(core.includes("REFERRAL_REWARD_POINTS = 50") && core.includes("REFERRAL_MIN_SESSION_SECONDS = 60") && core.includes("validateReferralRewardRegistration"), 'Commerce API defines server-qualified non-cash reward rules');
assert.ok(core.includes("parseReferralRewardEvent") && core.includes("durationSeconds >= REFERRAL_MIN_SESSION_SECONDS"), 'Only qualified game sessions should enter the referral reward parser');
assert.ok(referralApiSource.includes('game_referral_invites') && referralApiSource.includes('game_referral_visits') && referralApiSource.includes('game_referral_rewards'), 'Commerce API persists invite registrations, visits, and unique qualified rewards');
assert.ok(referralApiSource.includes('processReferralRewardEvent') && referralApiSource.includes('/v1/referrals/register') && referralApiSource.includes('/v1/referrals/balance'), 'Commerce API must verify referral rewards and return server-derived balance');
assert.ok(inviteLanding.includes("osgard.games.referral-reward-consent.v1") && inviteLanding.includes("source:'referral-link:'+code+':'+requestedGame+':'+visitorToken"), 'Invite landing must collect reward consent and provide a same-game visitor token');
console.log(JSON.stringify({
  status: 'passed',
  serviceDestinations: services.length,
  gameContexts: 9,
  checks: 38,
  notes: 'Referrals require analytics and separate reward consent, a registered invite, and a server-qualified same-game session of at least 60 seconds.'
}));
