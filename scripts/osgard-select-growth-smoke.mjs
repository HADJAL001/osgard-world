import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(path, 'utf8');
const source = read('public/games/game-session-recommendations.js');
const css = read('public/games/game-session-recommendations.css');
const core = read('services/osgard-commerce-api/src/core.mjs');
const server = read('services/osgard-commerce-api/src/server.mjs');
const signalRun = read('public/games/signal-run/game.js');

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
assert.ok(source.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN','Временно не включён в промо-переходы, пока доступность не подтверждена','https://gardvpn.is/',false,false]"),
  'GARD VPN must not be promoted as available until confirmed');
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
assert.ok(primaryHandler.includes('registerInvite(gameId,code)') && primaryHandler.includes('navigator.share'),
  'Share and copy actions must register an invite with the server; they do not mint points');
const registrationAt = primaryHandler.indexOf('await registerInvite(gameId,code)');
const nativeShareAt = primaryHandler.indexOf('await navigator.share(');
const completedShareAt = primaryHandler.indexOf('reportInviteShareCreated(gameId,code)');
assert.ok(registrationAt >= 0 && nativeShareAt > registrationAt && completedShareAt > nativeShareAt,
  'Rewardable URL must be registered before it leaves the page, and share telemetry waits for the share promise');
assert.ok(!source.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") &&
  !source.includes('function award(source){') && !reward.includes("award('social-confirmation:"),
  'The post-game reward UI must not grant points from a browser-local wallet');
assert.ok(source.includes("const INVITE_CODES_KEY='osgard.games.shards-invite-codes.v1'") &&
  source.includes("async function registerInvite(gameId,code)") &&
  source.includes("base+'/v1/referrals/register'") &&
  source.includes("base+'/v1/referrals/reward-status'"),
  'The invite programme must use server-side registration and balance endpoints');
assert.ok(reward.includes("consentToggle.type='checkbox'") &&
  source.includes("REWARD_CONSENT_KEY='osgard.games.referral-reward-consent.v1'") &&
  source.includes("if(!hasConsent()||!hasRewardConsent()||!titles[gameId]"),
  'Reward eligibility must require separate analytics and reward consent');
assert.ok(reward.includes('Копирование само по себе не считается репостом') &&
  reward.includes('не имеют денежной стоимости') && reward.includes('60 секунд'),
  'SHARDS must be non-cash and not awarded for a click or self-asserted post');
assert.ok(core.includes('export function validateReferralRewardRegistration') &&
  core.includes('export function parseReferralRewardEvent') &&
  core.includes('REFERRAL_MIN_SESSION_SECONDS = 60'),
  'Commerce core must validate referral consent and qualifying sessions');
assert.ok(server.includes('app.post("/v1/referrals/register"') &&
  server.includes('app.post("/v1/referrals/reward-status"') &&
  server.includes('game_referral_rewards') &&
  server.includes("start.received_at <= finish.received_at - ($2 * INTERVAL '1 second')") &&
  server.includes('ON CONFLICT(invite_code,visitor_token) DO NOTHING'),
  'The server must qualify same-game 60-second sessions and deduplicate rewards');

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

console.log(JSON.stringify({
  status: 'passed',
  serviceDestinations: services.length,
  gameContexts: 9,
  checks: 30,
  notes: 'Source-level guardrails; social publication is self-confirmed, not verified by social-network APIs.'
}));
