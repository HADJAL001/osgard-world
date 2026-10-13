import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(path, 'utf8');
const source = read('public/games/game-session-recommendations.js');
const css = read('public/games/game-session-recommendations.css');
const core = read('services/osgard-commerce-api/src/core.mjs');
const referralApi = read('services/osgard-commerce-api/src/server.mjs');
const inviteLanding = read('public/games/invite/invite-landing.js');
const signalRun = read('public/games/signal-run/game.js');
const lifecycle = read('public/games/player-lifecycle.js')
const entertainmentGateway = read('src/PlaySelectLoop.tsx')
const entertainmentStyles = read('src/styles.css');

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

assert.ok(entertainmentGateway.includes("const PROMO_PREFERENCES_KEY = 'osgard.games.postgame-service-preferences.v1'") &&
  source.includes("const servicePreferencesKey='osgard.games.postgame-service-preferences.v1'"),
  'The Entertainment gateway and between-game intermission must use one shared preferences key');
assert.ok(entertainmentGateway.includes("const PROMOTABLE_SERVICE_IDS = services.map(service => service.id)") &&
  source.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN','VPN-сервис. Описание и условия доступны на сайте проекта; доступность домена не была подтверждена проверкой.','https://gardvpn.is/',false,false]") &&
  entertainmentGateway.includes("const unverified = service.id === 'gardvpn'") &&
  entertainmentGateway.includes("Availability not verified; opens the project site"),
  'GARD VPN remains selectable like the other owner projects, with an explicit warning that its availability is unverified');
assert.ok(entertainmentGateway.includes("window.localStorage.setItem(PROMO_PREFERENCES_KEY, JSON.stringify(next))") &&
  entertainmentGateway.includes("frequency: draftFrequency") &&
  entertainmentGateway.includes("selected: PROMOTABLE_SERVICE_IDS.filter(id => draftSelected.includes(id))"),
  'Entertainment preferences must be saved in the same shape as Games intermission preferences');
assert.ok(entertainmentGateway.includes("value.frequency === 'every3'") && entertainmentGateway.includes("value.frequency === 'off'") &&
  entertainmentGateway.includes('value="each"') && entertainmentGateway.includes('value="every3"') && entertainmentGateway.includes('value="off"') &&
  entertainmentGateway.includes("После каждой завершённой игры") && entertainmentGateway.includes("Не показывать межигровую подборку"),
  'Entertainment must expose each-game, every-third-game and off preferences');
assert.ok(entertainmentGateway.includes("aria-controls=\"play-select-preferences-panel\"") &&
  entertainmentGateway.includes("const unverified = service.id === 'gardvpn'") &&
  entertainmentGateway.includes("Availability not verified; opens the project site") &&
  entertainmentGateway.includes('osgard:service-preferences-updated'),
  'The settings panel must be accessible, disclose unverified VPN availability, and notify same-page consumers when preferences change');
for (const selector of ['.play-select-preferences-panel','.play-select-preference-grid','.play-select-preference-option','.play-select-preferences-status']) {
  assert.ok(entertainmentStyles.includes(selector), 'Premium responsive preferences style missing: ' + selector);
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
assert.ok(source.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN','VPN-сервис. Описание и условия доступны на сайте проекта; доступность домена не была подтверждена проверкой.','https://gardvpn.is/',false,false]"),
  'GARD VPN must remain selectable but clearly disclosed as not independently verified');
assert.ok(source.includes("const availableServiceIds=services.filter(item=>item[7]!==false).map(item=>item[0])") &&
  source.includes("input.disabled=active===false"),
  'The promotion list must obey explicit service-availability flags while keeping the unverified VPN disclosed');
assert.ok(source.includes("const activeSelected=services.filter(([id,,,,,,featured=false,active=true])=>active!==false&&preferences.selected.includes(id))") &&
  source.includes("const visible=activeSelected;"),
  'Unavailable service IDs must be excluded from the promotable service card grid');
assert.ok(source.includes("if(!hasConsent()||!selectAllowedEvents.has(name))return false") &&
  source.includes("sendSelectEvent('owned_promo_impression',gameId,'osgard-select:spotlight:'"),
  'Spotlight exposure measurement must be behind explicit analytics consent');
const spotlightGateSource = source.match(/function canCountSpotlightImpression\([^)]*\)\{\s*return Boolean\(([^;]+)\);\s*\}/);
assert.ok(spotlightGateSource, 'Spotlight impression guard must be independently testable');
const canCountSpotlightImpression = vm.runInNewContext('(' + spotlightGateSource[0] + ')');
assert.equal(canCountSpotlightImpression(true,true,true,false,false,'myosa','myosa'), true,
  'A consented, visible, connected spotlight can count after its visibility timer');
assert.equal(canCountSpotlightImpression(false,true,true,false,false,'myosa','myosa'), false,
  'A spotlight that leaves the viewport must not count an impression');
assert.equal(canCountSpotlightImpression(true,false,true,false,false,'myosa','myosa'), false,
  'Spotlight impressions must remain off without analytics consent');
assert.equal(canCountSpotlightImpression(true,true,false,false,false,'myosa','myosa'), false,
  'A detached spotlight must not count an impression');
assert.equal(canCountSpotlightImpression(true,true,true,true,false,'myosa','myosa'), false,
  'A hidden spotlight must not count an impression');
assert.equal(canCountSpotlightImpression(true,true,true,false,true,'myosa','myosa'), false,
  'A hidden browser tab must not count an impression');
assert.equal(canCountSpotlightImpression(true,true,true,false,false,'projects','myosa'), false,
  'Changing the spotlight before the timer ends must cancel the old service impression');
assert.ok(source.includes('if(!spotlightIsVisible){clearSpotlightImpression();return}') &&
  source.includes('stopSpotlightWatcher()') && source.includes("document.visibilityState!=='visible'"),
  'The spotlight observer must cancel pending timers when the element leaves view, changes or the tab is backgrounded');
assert.ok(core.includes('"owned_promo_impression"') && core.includes('"cross_promo_clicked"'),
  'Commerce API must allow only the existing, consented first-party promo events');
assert.ok(css.includes('.og-postgame-spotlight{') &&
  css.includes('@media(max-width:760px)') && css.includes('prefers-reduced-motion:reduce'),
  'Premium spotlight styling must support mobile and reduced-motion settings');

assert.ok(source.includes("const quickPickIds=[spotlightServiceId,...spotlightOptions.filter(id=>id!==spotlightServiceId)].slice(0,3)") &&
  source.includes("button.setAttribute('aria-pressed',String(serviceId===spotlightServiceId))") &&
  source.includes("quickPickButtons.forEach(choice=>choice.setAttribute('aria-pressed',String(choice.dataset.service===serviceId)))"),
  'Intermission must show up to three contextual service choices immediately and keep their selected state synchronized');
assert.ok(source.includes("section.append(spotlight,quickPickHeading,quickPicks)") &&
  css.includes('.og-postgame-quick-picks{') &&
  css.includes('.og-postgame-quick-pick[aria-pressed="true"]') &&
  css.includes('@media(prefers-reduced-motion:reduce){.og-postgame-quick-pick'),
  'Quick choices must be visible by default with luxury styling, responsive layout and reduced-motion support');

const rewardStart = source.indexOf('function rewardShelf(gameId){');
const rewardEnd = source.indexOf('function renderOutsideIntermission(detail)', rewardStart);
assert.ok(rewardStart >= 0 && rewardEnd > rewardStart, 'Post-game reward module must remain independently testable');
const reward = source.slice(rewardStart, rewardEnd);
assert.ok(reward.includes("consentToggle.addEventListener('change'") && reward.includes("localStorage.setItem(REWARD_CONSENT_KEY,'yes')"),
  'Referral reward tracking requires separate explicit opt-in');
assert.ok(reward.includes('await registerInvite(gameId,code)') && reward.includes('reportInviteShareCreated(gameId,code)') &&
  reward.includes("sendSelectEvent('share_created',gameId,'game-invite:'"),
  'Referral links must be registered and attributed through the consent-gated server analytics');
assert.ok(reward.includes('refreshShardsBalance(gameId,balance,status)') && reward.includes('/v1/referrals/reward-status'),
  'The visible SHARDS amount must come from the server reward-status endpoint');
assert.ok(reward.includes('не короче 60 секунд') && reward.includes('Публикацию поста соцсеть не подтверждает'),
  'Reward copy must explain the 60-second game-session condition and that social posts are not verified');
assert.ok(!source.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") &&
  !source.includes('function award(source){') && !source.includes("award('social-confirmation:"),
  'The between-game reward system must not mint a client-editable SHARDS wallet');
assert.ok(core.includes('REFERRAL_REWARD_POINTS = 50') && core.includes('REFERRAL_MIN_SESSION_SECONDS = 60') &&
  core.includes('validateReferralRewardRegistration') && core.includes('parseReferralRewardEvent'),
  'Reward policy and referral event validation must be defined in server-side core code');
assert.ok(referralApi.includes('CREATE TABLE IF NOT EXISTS game_referral_invites') &&
  referralApi.includes('CREATE TABLE IF NOT EXISTS game_referral_visits') &&
  referralApi.includes('CREATE TABLE IF NOT EXISTS game_referral_rewards') &&
  referralApi.includes('async function processReferralRewardEvent') &&
  referralApi.includes('app.post("/v1/referrals/register"') &&
  referralApi.includes('app.post("/v1/referrals/reward-status"'),
  'Referrals need a persistent, idempotent server ledger and protected status endpoint');
assert.ok(referralApi.includes('ON CONFLICT(invite_code,visitor_token) DO NOTHING') &&
  referralApi.includes("start.received_at <= finish.received_at - ($2 * INTERVAL '1 second')"),
  'The same referred visitor can earn only once, after a server-timed session of at least 60 seconds');
assert.ok(inviteLanding.includes("localStorage.getItem('osgard.games.referral-reward-consent.v1') === 'yes'") &&
  inviteLanding.includes("source: rewardableInvite ? 'referral-link:' + code + ':' + requestedGame + ':' + visitorToken : 'referral-link:' + code"),
  'Rewardable invitation landing records matching visitor attribution only after separate opt-in');
assert.ok(lifecycle.includes("return 'referral:'+code+':'+activeGame+':'+value.visitorToken") &&
  lifecycle.includes("localStorage.getItem('osgard.games.referral-reward-consent.v1')==='yes'"),
  'Only consented play sessions matching the canonical invite and visitor token can qualify');
assert.ok(!entertainmentGateway.includes("const WALLET_KEY = 'osgard.games.shards-wallet.v1'") &&
  !entertainmentGateway.includes('const grantReward ='),
  'The Entertainment homepage must not mint rewards from a self-confirmed social post');
assert.ok(lifecycle.includes("activeSessionId='session_'+id+'_'+sequence+'_'+launchAt") && lifecycle.includes('sessionId:activeSessionId') && lifecycle.includes('detail:{game:activeGame,sessionId:activeSessionId}'),
  'The same stable game session ID must be sent with gameplay completion and post-game return events');
assert.ok(source.includes("byGame[gameId]=Math.min((byGame[gameId]||0)+1,1000000000)") &&
  source.includes("const roundForSpotlight=preferences.frequency==='every3'?completedCount:(readServiceProgress().byGame[gameId]||1)"),
  'Spotlight should rotate by repetitions of the same game while promo frequency remains global');
assert.ok(source.includes('function recordCompletedRound(gameId,sessionId)') && source.includes('current.sessions.includes(key)') && source.includes('slice(-100)'),
  'Post-game promotion cadence must deduplicate session IDs, not rely only on a short timing window');
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

console.log(JSON.stringify({
  status: 'passed',
  serviceDestinations: services.length,
  gameContexts: 9,
  checks: 43, notes: 'Source-level guardrails; social publication is self-confirmed, not verified by social-network APIs.'
}));
