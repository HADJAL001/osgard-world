import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(path, 'utf8');
const source = read('public/games/game-session-recommendations.js');
const css = read('public/games/game-session-recommendations.css');
const core = read('services/osgard-commerce-api/src/core.mjs');
const consentQueue = read('public/games/consented-analytics.js');
const commerceApi = read('services/osgard-commerce-api/src/server.mjs');
const commerceAdmin = read('public/games/commerce-admin/index.html');
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
assert.ok(entertainmentGateway.includes("const PROMOTABLE_SERVICE_IDS = services.filter(service => service.id !== 'gardvpn').map(service => service.id)") &&
  source.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN','Временно не продвигается: главная страница не подтверждает, что VPN-соединение действительно устанавливается.','https://gardvpn.is/',false,false]") &&
  entertainmentGateway.includes("const limitedVerification = service.id === 'gardvpn'") &&
  entertainmentGateway.includes("disabled={limitedVerification}") &&
  entertainmentGateway.includes("VPN connectivity unverified") &&
  entertainmentGateway.includes('className="play-select-service is-limited-verification"') &&
  entertainmentStyles.includes('.play-select-preference-option.is-limited-verification'),
  'GARD VPN must remain visible as unavailable but not selectable in promotions until connection health is verified');
assert.ok(entertainmentGateway.includes("window.localStorage.setItem(PROMO_PREFERENCES_KEY, JSON.stringify(next))") &&
  entertainmentGateway.includes("frequency: draftFrequency") &&
  entertainmentGateway.includes("selected: PROMOTABLE_SERVICE_IDS.filter(id => draftSelected.includes(id))"),
  'Entertainment preferences must be saved in the same shape as Games intermission preferences');
assert.ok(entertainmentGateway.includes("value.frequency === 'every3'") && entertainmentGateway.includes("value.frequency === 'off'") &&
  entertainmentGateway.includes('value="each"') && entertainmentGateway.includes('value="every3"') && entertainmentGateway.includes('value="off"') &&
  entertainmentGateway.includes("После каждой завершённой игры") && entertainmentGateway.includes("Не показывать межигровую подборку"),
  'Entertainment must expose each-game, every-third-game and off preferences');
assert.ok(entertainmentGateway.includes("aria-controls=\"play-select-preferences-panel\"") &&
  entertainmentGateway.includes("const limitedVerification = service.id === 'gardvpn'") &&
  entertainmentGateway.includes("VPN connectivity unverified") &&
  entertainmentGateway.includes('osgard:service-preferences-updated'),
  'The settings panel must be accessible, disclose unverified VPN availability, and notify same-page consumers when preferences change');
for (const selector of ['.play-select-preferences-panel','.play-select-preference-grid','.play-select-preference-option','.play-select-preferences-status']) {
  assert.ok(entertainmentStyles.includes(selector), 'Premium responsive preferences style missing: ' + selector);
}
assert.ok(entertainmentStyles.includes('.play-select-service.is-limited-verification{border-style:dashed') && entertainmentStyles.includes('cursor:not-allowed'), 'The unverified GARD VPN directory entry must look disabled and must not imply it can be launched as a promo link');

const recommendationMapMatch = source.match(/const recommendationByGame=(\{[\s\S]*?\});/);
assert.ok(recommendationMapMatch, 'Missing game-specific recommendation map');
const recommendationMap = vm.runInNewContext('(' + recommendationMapMatch[1] + ')');
const recommendationKeys = [...recommendationMapMatch[1].matchAll(/^\s*['"]?([a-z0-9-]+)['"]?\s*:/gm)].map(match => match[1]);
assert.equal(new Set(recommendationKeys).size, recommendationKeys.length,
  'Each game must define service priorities exactly once; duplicate object keys silently shadow earlier choices.');
const expectedGameIds = ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid'];
assert.deepEqual([...recommendationKeys].sort(), [...expectedGameIds].sort(),
  'The promotion map must match every current game ID exactly, with no missing or stale entries.');
for (const id of expectedGameIds) {
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

assert.ok(source.includes("defaultFrequency:'each'") &&
  source.includes("const fallback={frequency:managedPromoConfig.defaultFrequency,selected:managedPromoConfig.defaultSelectedServices.slice()}") &&
  source.includes("const frequencyValues=['each','every3','off']") &&
  source.includes("['each','После каждой завершённой игры']") &&
  source.includes("['every3','Раз в три завершённых раунда']") &&
  source.includes("['off','Не показывать подборку']") &&
  source.includes("frequency:frequencyValues.includes(value.frequency)?value.frequency:managedPromoConfig.defaultFrequency"),
  'Post-game promos must default to every completed round and remain user-controllable');
assert.ok(source.includes('grid.hidden=true;filters.hidden=true') &&
  source.includes("collapseToggle.textContent=showPromos?'Выбрать из '+availableServiceIds.length+' сервисов'"),
  'The service directory must be compact by default and open only when requested');
assert.ok(source.includes("u.searchParams.set('utm_source','osgard_games')") &&
  source.includes("u.searchParams.set('utm_medium','post_game')") &&
  source.includes("u.searchParams.set('utm_campaign','after_game')"),
  'Each service link needs source, placement and campaign attribution');
assert.ok(source.includes("РЕКЛАМА · СОБСТВЕННЫЕ ПРОЕКТЫ OSGARD") &&
  source.includes('Автозапуска нет'), 'Self-promotion must be labelled and never autoplay');
assert.ok(source.includes("['gardvpn','08','GARD VPN','PRIVACY / VPN','Временно не продвигается: главная страница не подтверждает, что VPN-соединение действительно устанавливается.','https://gardvpn.is/',false,false]"),
  'GARD VPN must remain in the owner inventory but unavailable for promotions until VPN connectivity is verified');
assert.ok(source.includes("const availableServiceIds=services.filter(item=>item[7]!==false).map(item=>item[0])") &&
  source.includes("input.disabled=active===false"),
  'The promotion list must obey explicit service-availability flags while keeping the unverified VPN disclosed');
assert.ok(source.includes("const activeSelected=services.filter(([id,,,,,,featured=false,active=true])=>active!==false&&managedPromoConfig.enabledServices.includes(id)&&preferences.selected.includes(id))") &&
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
assert.ok(core.includes('"invite_link_prepared"'),
  'Prepared referral links must use the explicit consented analytics allow-list');
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
assert.ok(rewardStart >= 0 && rewardEnd > rewardStart, 'Social reward section must remain independently testable');
const reward = source.slice(rewardStart, rewardEnd);
const primaryStart = reward.indexOf("primary.addEventListener('click',async()=>{");
const primaryEnd = reward.indexOf("const note=make('p','og-postgame-reward-note'", primaryStart);
assert.ok(primaryStart >= 0 && primaryEnd > primaryStart, 'Share intent handler boundaries are required');
const primaryHandler = reward.slice(primaryStart, primaryEnd);
assert.ok(!primaryHandler.includes("sendSelectEvent('share_created'"),
  'Opening the system share sheet or copying a link must not count as a completed share');
const claimStart = reward.indexOf("claim.addEventListener('click'");
const claimEnd = reward.indexOf("primary.addEventListener('click',async()=>{", claimStart);
assert.ok(claimStart >= 0 && claimEnd > claimStart, 'Explicit share confirmation handler is required');
const claimHandler = reward.slice(claimStart, claimEnd);
const networkIntentStart = reward.indexOf("networks.forEach(([name,href])=>{");
const networkIntentEnd = reward.indexOf('grid.append(link)', networkIntentStart);
assert.ok(networkIntentStart >= 0 && networkIntentEnd > networkIntentStart, 'Social-network action handlers must be testable');
const networkIntent = reward.slice(networkIntentStart, networkIntentEnd);
assert.ok(networkIntent.includes("sendSelectEvent('invite_link_prepared',gameId,'game-invite:'+gameId+':'+inviteCode)"),
  'Opening a social publish form must record the matching invite code before the recipient funnel');
const nativeShareStart = primaryHandler.indexOf("if(typeof navigator.share==='function')");
const clipboardStart = primaryHandler.indexOf("else if(navigator.clipboard?.writeText)");
assert.ok(nativeShareStart >= 0 && clipboardStart > nativeShareStart && primaryHandler.slice(nativeShareStart, clipboardStart).includes("sendSelectEvent('invite_link_prepared'"),
  'A completed native share action must attach the same referral code to the invite funnel');
assert.ok(!primaryHandler.slice(clipboardStart).includes("sendSelectEvent('invite_link_prepared'"),
  'Copy-only fallback must not be counted as a social share intent');
assert.ok(commerceApi.includes("event_name IN ('invite_link_prepared', 'share_created')") && commerceApi.includes('AS invite_code'),
  'Referral funnels must include prepared invite links and legacy self-confirmed links without double-counting codes');
assert.ok(commerceAdmin.includes('Ссылки, подготовленные для публикации') && commerceAdmin.includes('Факт публикации не подтверждается автоматически'),
  'The admin label must distinguish prepared links from verified social publication');
assert.ok(claimHandler.includes("award('social-confirmation:'+network)") &&
  !claimHandler.includes("sendSelectEvent('share_created'") &&
  claimHandler.includes("sendSelectEvent('social_reward_claimed'"),
  'A manual reward claim must be recorded separately and must not inflate the created-share metric');
assert.ok(reward.includes('Копирование само по себе не считается репостом') &&
  reward.includes('OSGARD не получает надёжный сигнал о факте публикации') &&
  reward.includes('не имеют денежной стоимости'),
  'SHARDS must disclose that social posts are self-confirmed and have no cash value');
assert.ok(source.includes("const walletKey='osgard.games.shards-wallet.v1',dailyReward=50") &&
  source.includes('current.day===day'),
  'Local SHARDS reward must be capped to one claim per UTC day and device wallet');

const serviceShareStart = source.indexOf('const serviceShare=make(', source.indexOf('function renderSpotlight(serviceId)'));
const serviceShareEnd = source.indexOf('spotlight.append(copy,serviceShare,spotlightStatus);', serviceShareStart);
assert.ok(serviceShareStart >= 0 && serviceShareEnd > serviceShareStart, 'Selected-service share UI must live in the current service spotlight');
const serviceShareCode = source.slice(serviceShareStart, serviceShareEnd + 'spotlight.append(copy,serviceShare,spotlightStatus);'.length);
assert.ok(serviceShareCode.includes("const serviceShareUrl=new URL(item[5],location.origin)") &&
  serviceShareCode.includes("serviceShareUrl.searchParams.set('utm_campaign','owned_service_share')") &&
  serviceShareCode.includes("serviceShareUrl.searchParams.set('utm_content',item[0]+'_'+gameId)"),
  'Sharing a service must use the user-selected service destination and label its attribution');
assert.ok(['Telegram','WhatsApp','VK','X','Facebook'].every(network => serviceShareCode.includes("['"+network+"'")),
  'Selected-service share must expose supported social publishing buttons');
assert.ok(serviceShareCode.includes("navigator.share({title:item[2]+' — OSGARD',text:serviceShareMessage,url:serviceShareUrl.href})") &&
  serviceShareCode.includes("setServiceSharePending('native-share')") &&
  serviceShareCode.includes("serviceShareClaim.addEventListener('click'"),
  'Native sharing must target the selected service and require a separate explicit reward claim');
assert.ok(serviceShareCode.includes("award('service-share-confirmation:'+item[0]+':'+method)") &&
  serviceShareCode.includes("sendSelectEvent('social_reward_claimed',gameId,'osgard-service-share-reward:'+item[0]+':'+method)") &&
  !serviceShareCode.includes("sendSelectEvent('share_created'"),
  'A self-confirmed reward must stay distinct from a verified share event');
const serviceCopyStart = serviceShareCode.indexOf("copyServiceLink.addEventListener('click',async()=>{");
const serviceCopyEnd = serviceShareCode.indexOf("});", serviceCopyStart);
assert.ok(serviceCopyStart >= 0 && serviceCopyEnd > serviceCopyStart &&
  serviceShareCode.slice(serviceCopyStart, serviceCopyEnd).includes('Копирование само по себе не считается репостом и не даёт SHARDS') &&
  !serviceShareCode.slice(serviceCopyStart, serviceCopyEnd).includes('setServiceSharePending'),
  'Copying a service URL must never unlock the social reward');
assert.ok(serviceShareCode.includes("copyServiceLink.addEventListener('click',async()=>{\n   pendingServiceShare='';serviceShareClaim.hidden=true;serviceShareClaim.disabled=false;") &&
  serviceShareCode.includes("nativeShare.addEventListener('click',async()=>{\n   pendingServiceShare='';serviceShareClaim.hidden=true;serviceShareClaim.disabled=false;"),
  'Copying or cancelling a new native-share flow must clear any stale pending reward claim');
assert.ok(source.includes('osgard:shards-wallet-updated') &&
  css.includes('.og-postgame-service-share-networks') &&
  css.includes('@media(max-width:600px)') &&
  css.includes('prefers-reduced-motion:reduce') &&
  css.includes('.og-postgame-service-share button:focus-visible'),
  'Service-share controls must remain responsive, reduced-motion aware, keyboard accessible and sync wallet updates');
assert.ok(source.includes("window.addEventListener('osgard:shards-wallet-updated',syncShardsWalletUI)") &&
  source.includes("window.addEventListener('storage',event=>{if(!event.key||event.key===walletKey)syncShardsWalletUI()})") &&
  source.includes("document.querySelectorAll('.og-postgame-wallet')"),
  'Wallet changes in SIGNAL RUN or the post-session panel must update the intermission balance and prevent another same-day local reward claim');
assert.ok(lifecycle.includes("activeSessionId='session_'+id+'_'+sequence+'_'+launchAt") && lifecycle.includes('sessionId:activeSessionId') && lifecycle.includes('detail:{game:activeGame,sessionId:activeSessionId,...dailyChallengeContext(activeGame,activeUrl)}'),
  'The same stable ID must be sent with gameplay completion and post-session return events');
assert.ok(source.includes("byGame[gameId]=Math.min((byGame[gameId]||0)+1,1000000000)") &&
  source.includes("const roundForSpotlight=preferences.frequency==='every3'?completedCount:(readServiceProgress().byGame[gameId]||1)"),
  'Spotlight should rotate by repetitions of the same game while promo frequency remains global');
assert.ok(source.includes('function recordCompletedRound(gameId,sessionId)') && source.includes('current.sessions.includes(key)') && source.includes('slice(-100)'),
  'Post-game promotion cadence must deduplicate session IDs, not rely only on a 2.5-second timing window');
assert.ok(source.includes('const isSpotlight=id===spotlightServiceId') && source.includes("cards.forEach(card=>card.classList.toggle('is-featured',card.dataset.service===spotlightServiceId))"),
  'The featured directory card must always match the personalized spotlight, including after rotation');

const disposerMatch = source.match(/function disposePostgameTree\(node\)\{[^\n]*\}/);
assert.ok(disposerMatch, 'Intermission DOM teardown helper must be independently testable');
const disposePostgameTree = vm.runInNewContext('(' + disposerMatch[0] + ')');
const disposalCalls = [];
const mockPostgameTree = {
  __osgardDispose: () => disposalCalls.push('root'),
  children: [{ __osgardDispose: () => disposalCalls.push('child'), children: [] }]
};
disposePostgameTree(mockPostgameTree);
disposePostgameTree(mockPostgameTree);
assert.deepEqual(disposalCalls.sort(), ['child', 'root'],
  'Every intermission teardown callback must run exactly once, including nested service shelves');
assert.ok(source.includes("document.dispatchEvent(new CustomEvent('osgard:dispose-postgame'))") &&
  source.includes("document.addEventListener('osgard:dispose-postgame',disposeCurrentPostgame)") &&
  source.includes('section.__osgardDispose=()=>{') &&
  source.includes('cards.forEach(card=>{if(card.__osgardImpressionTimer)'),
  'Replacing or closing the intermission must disconnect observers and clear impression timers');
assert.ok(source.includes('disposePostgameTree(section);section.replaceWith(replacement)') &&
  source.includes('disposePostgameTree(previousSuite);previousSuite.remove()') &&
  source.includes('disposeCurrentPostgame();'),
  'Cleanup must run when saving preferences, refreshing a round or launching the next game');

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


assert.ok(core.includes('export function validateReferralClaimAckPayload'), 'Referral receipt acknowledgement payload validator missing')
assert.ok(commerceApi.includes('app.post("/v1/referrals/prepare-claim"') && commerceApi.includes('app.post("/v1/referrals/ack"'), 'Retryable reward prepare/ack endpoints missing')
assert.ok(commerceApi.includes('SET qualified_session_id = COALESCE(qualified_session_id, $2)') && commerceApi.includes('SET reward_claimed_at = COALESCE(reward_claimed_at, NOW())'), 'Qualified receipt must be prepared first and acknowledged idempotently later')
const prepareStart=commerceApi.indexOf('app.post("/v1/referrals/prepare-claim"')
const prepareEnd=commerceApi.indexOf('app.post("/v1/referrals/ack"',prepareStart)
const prepareRoute=commerceApi.slice(prepareStart,prepareEnd)
assert.ok(prepareStart>=0&&prepareEnd>prepareStart&&!prepareRoute.includes('reward_claimed_at = NOW()'), 'Preparing a reward must not mark it claimed before the browser has persisted the receipt')
assert.ok(commerceApi.slice(prepareEnd,commerceApi.indexOf('app.post("/v1/referrals/claim"',prepareEnd)).includes('referralCodes = ANY($2::text[])') || commerceApi.slice(prepareEnd,commerceApi.indexOf('app.post("/v1/referrals/claim"',prepareEnd)).includes('referral_code = ANY($2::text[])'), 'Acknowledgement must be restricted to the token owner and supplied receipt IDs')
assert.ok(source.includes("postReferralRequest('/v1/referrals/prepare-claim'") && source.includes("postReferralRequest('/v1/referrals/ack'"), 'Client must use the retryable prepare/ack flow, not the legacy one-phase claim')
assert.ok(source.includes("async function resolveReferralApiBase()") && source.includes("fetch('/commerce-api/healthz'") && source.includes("health.databaseReady===true"), 'Referral rewards must auto-discover only the healthy same-origin Commerce API when the public config is blank')
const walletSaveOffset=source.indexOf('const saved=addQualifiedReferralShards(result.claims)')
const walletAckOffset=source.indexOf("postReferralRequest('/v1/referrals/ack'",walletSaveOffset)
assert.ok(walletSaveOffset>=0&&walletAckOffset>walletSaveOffset, 'Persist receipt IDs in the local wallet before acknowledging them to the server')
assert.ok(source.includes('const qualifiedClaims=[...current.claims,...accepted].slice(-5000)') && source.includes('current.claims,updatedAt'), 'Wallet must deduplicate receipt IDs and preserve them when daily social rewards are written')
assert.ok(source.includes("if(!known.has(code)){known.add(code);accepted.push(code)}") && source.includes("const amount=accepted.length*50"), 'Retrying a pending receipt must not award the same 50 SHARDS twice')
assert.ok(source.includes('Серверное подтверждение временно недоступно; повторная проверка не начислит эти receipt-ID второй раз'), 'The player must get an explicit retry-safe status when acknowledgement temporarily fails')
assert.ok(source.includes("const promoImpressionKeyPrefix='osgard.games.promo-impression.v1:'") && source.includes("function claimPromoImpression(key)"), 'Session-level promo impression deduplication key missing')
assert.ok(source.includes("claimPromoImpression('spotlight-click:'+seenKey)") && source.includes("if(!hasConsent())return") && source.includes("canCountSpotlightImpression(spotlightIsVisible,hasConsent(),spotlight.isConnected,spotlight.hidden,document.visibilityState!=='visible',spotlight.dataset.service,item[0])"), 'Spotlight CTA clicks must be deduplicated and require explicit consent plus observed visibility')
assert.ok(source.includes('getSessionSpotlightVariant()') && source.includes("osgard.games.select-spotlight-variant.v1"), 'Spotlight A/B cohort should remain stable across intermission rebuilds in one tab session')
assert.ok(source.includes("claimPromoImpression('spotlight:'+seenKey)") && source.includes("claimPromoImpression('card:'+gameId+':'+serviceId)"), 'Spotlight and directory card impression deduplication must both be applied')
const variantMatch=source.match(/function getSessionSpotlightVariant\(\)\{[\s\S]*?\n\}/)
assert.ok(variantMatch, 'Session-stable spotlight cohort helper missing')
const sessionValues=new Map()
const sessionStorageMock={getItem(key){return sessionValues.has(key)?sessionValues.get(key):null},setItem(key,value){sessionValues.set(key,String(value))}}
const getVariant=vm.runInNewContext('('+variantMatch[0]+')',{sessionStorage:sessionStorageMock,Math,memorySpotlightVariant:''})
const variantFirst=getVariant(),variantSecond=getVariant()
assert.ok(variantFirst==='a'||variantFirst==='b'||variantFirst==='c')
assert.equal(variantSecond,variantFirst,'Re-rendering a spotlight must not move a player to a different A/B/C variant in the same tab')
const variantForRoll=roll=>vm.runInNewContext('('+variantMatch[0]+')',{sessionStorage:{getItem(){return null},setItem(){}},Math:{random(){return roll}},memorySpotlightVariant:''})()
assert.equal(variantForRoll(0.1),'a','First third of sessions should enter variant A')
assert.equal(variantForRoll(0.5),'b','Middle third of sessions should enter variant B')
assert.equal(variantForRoll(0.9),'c','Final third of sessions should enter variant C')
const deniedSessionStorage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}}
const getVariantDenied=vm.runInNewContext('('+variantMatch[0]+')',{sessionStorage:deniedSessionStorage,Math,memorySpotlightVariant:''})
const deniedVariantFirst=getVariantDenied(),deniedVariantSecond=getVariantDenied()
assert.equal(deniedVariantSecond,deniedVariantFirst,'A/B/C cohort must remain stable in memory even when session storage is blocked')
const impressionMatch=source.match(/function claimPromoImpression\(key\)\{[\s\S]*?\n\}/)
assert.ok(impressionMatch, 'Impression dedupe helper missing')
const impressionValues=new Map()
const impressionStorage={getItem(key){return impressionValues.has(key)?impressionValues.get(key):null},setItem(key,value){impressionValues.set(key,String(value))}}
const claimImpression=vm.runInNewContext('('+impressionMatch[0]+')',{sessionStorage:impressionStorage,promoImpressionKeyPrefix:'osgard.games.promo-impression.v1:',fallbackPromoImpressions:new Set()})
assert.equal(claimImpression('spotlight:swarm:marcosa:a'),true,'First valid exposure may be counted')
assert.equal(claimImpression('spotlight:swarm:marcosa:a'),false,'A repeated exposure for the same session/service/variant must be deduplicated')
assert.equal(claimImpression('spotlight-click:swarm:marcosa:a'),true,'First CTA click for a service/game/variant may be counted')
assert.equal(claimImpression('spotlight-click:swarm:marcosa:a'),false,'Repeated CTA clicks in the same tab exposure must be deduplicated')
assert.equal(claimImpression('card:swarm:marcosa'),true,'A separately visible directory card may be measured once')
const deniedImpressionStorage={getItem(){throw new Error('blocked')},setItem(){throw new Error('blocked')}}
const claimImpressionDenied=vm.runInNewContext('('+impressionMatch[0]+')',{sessionStorage:deniedImpressionStorage,promoImpressionKeyPrefix:'osgard.games.promo-impression.v1:',fallbackPromoImpressions:new Set()})
assert.equal(claimImpressionDenied('spotlight:time:myosa:a'),true,'First visible impression may be recorded with an in-memory fallback')
assert.equal(claimImpressionDenied('spotlight:time:myosa:a'),false,'The in-memory fallback must deduplicate impression events if browser storage is blocked')
assert.ok(source.includes("lastSource:accepted.length?'qualified-referral':'qualified-referral-retry'"), 'Retrying a previously saved receipt should not be mistaken for a newly created award')


const intermissionCss = read('public/games/game-session-recommendations.css')
assert.ok(source.includes("const promoSnoozeKey='osgard.games.postgame-snooze-until.v1'") && source.includes("const promoSnoozeMs=24*60*60*1000"), 'A separate one-day promo pause must not overwrite the shared frequency preference')
assert.ok(source.includes("function snoozeServicePromosForDay(now=Date.now())") && source.includes("readPromoSnoozeUntil(now)>now"), 'Promo pause needs a bounded 24-hour expiry and must gate scheduled service prompts')
assert.ok(source.includes("snoozeButton.addEventListener('click'") && source.includes("if(hasConsent())void sendSelectEvent('owned_promo_snoozed'"), 'Pause action must work even without analytics consent and only measure after consent')
assert.ok(source.includes("servicesShelf(id,shouldShowServicePromos(preferences,completedCount),completedCount)") && source.includes("if(managedPromoConfig.showShareRewards)panels.push(rewardShelf(id))"), 'Snoozing service promotions must not remove invite rewards; reward visibility has its own admin switch')
assert.ok(source.includes("window.addEventListener('storage'") && source.includes("document.addEventListener('osgard:service-preferences-updated'"), 'Intermission must refresh preferences changed from another tab or the Entertainment page')
assert.ok(source.includes("function normalizeServiceSearchQuery(value)") && source.includes("function matchesServiceFilter(category,selectedCategory,searchableText,query)"), 'Service search must be normalized and separated from category filtering')
assert.ok(source.includes("serviceSearch.addEventListener('input'") && source.includes("clearServiceSearch.addEventListener('click'"), 'The expanded service directory needs live search and a clear-search action')
assert.ok(source.includes("serviceSearchStatus.setAttribute('aria-live','polite')") && source.includes("if(!collapsed){applyFilter(activeServiceCategory);serviceSearch.focus()}"), 'Search results must be announced and the search field receives focus when opened')
assert.ok(source.includes("searchLabel.hidden=collapsed;serviceSearchStatus.hidden=collapsed;clearServiceSearch.hidden=collapsed"), 'Search controls must collapse with the service directory rather than occupy hidden space')
assert.ok(intermissionCss.includes('.og-postgame-service-search-wrap') && intermissionCss.includes('.og-postgame-search-clear:focus-visible') && intermissionCss.includes('@media(max-width:600px)') && intermissionCss.includes('prefers-reduced-motion:reduce'), 'Search and pause controls require mobile layout, visible focus and reduced-motion support')
assert.ok(core.includes('"owned_promo_snoozed"') && core.includes('"owned_promo_snooze_cleared"') && commerceApi.includes('"ownedPromoSnoozes"') && commerceApi.includes('"ownedPromoSnoozeClears"'), 'Pause and resume events plus their privacy-bounded aggregates must be wired end-to-end')
assert.ok(consentQueue.includes("'owned_promo_snoozed'") && consentQueue.includes("'owned_promo_snooze_cleared'"), 'The consented analytics queue must allow both pause events after explicit consent')
assert.ok(commerceAdmin.includes('id="owned-promo-snoozes"') && commerceAdmin.includes("$('#owned-promo-snoozes').textContent = fmt(funnel.ownedPromoSnoozes)") && commerceAdmin.includes('id="owned-promo-snooze-clears"') && commerceAdmin.includes("$('#owned-promo-snooze-clears').textContent = fmt(funnel.ownedPromoSnoozeClears)"), 'The protected dashboard must distinguish pause and resume actions')
const snoozeWriteMatch = source.match(/function snoozeServicePromosForDay\(now=Date\.now\(\)\)\{[\s\S]*?\n\}/)
const snoozeReadMatch = source.match(/function readPromoSnoozeUntil\(now=Date\.now\(\)\)\{[\s\S]*?\n\}/)
assert.ok(snoozeWriteMatch && snoozeReadMatch, 'Promo pause helpers must stay independently testable')
const snoozeStorageData = new Map()
const snoozeStorage = {getItem(key){return snoozeStorageData.has(key)?snoozeStorageData.get(key):null},setItem(key,value){snoozeStorageData.set(key,String(value))},removeItem(key){snoozeStorageData.delete(key)}}
const snoozeContext = {localStorage:snoozeStorage,promoSnoozeKey:'osgard.games.postgame-snooze-until.v1',promoSnoozeMs:86400000,memoryPromoSnoozeUntil:0}
const snoozeWrite = vm.runInNewContext('('+snoozeWriteMatch[0]+')',snoozeContext)
const snoozeRead = vm.runInNewContext('('+snoozeReadMatch[0]+')',snoozeContext)
const snoozeResult = snoozeWrite(1000)
assert.equal(snoozeResult.until,86401000,'One-day pause should expire exactly 24 hours after the user action')
assert.equal(snoozeRead(1000),86401000,'A valid future pause must survive a reload through persistent storage')
assert.equal(snoozeRead(86401000),0,'The pause must expire exactly at its deadline')
assert.equal(snoozeStorageData.has('osgard.games.postgame-snooze-until.v1'),false,'Expired pause markers should be removed')
snoozeStorage.setItem('osgard.games.postgame-snooze-until.v1',String(1000+2*86400000))
assert.equal(snoozeRead(1000),0,'Malformed pauses longer than the bounded interval must be ignored')
const searchNormalizerMatch = source.match(/function normalizeServiceSearchQuery\(value\)\{[^\n]*\}/)
const searchMatcherMatch = source.match(/function matchesServiceFilter\(category,selectedCategory,searchableText,query\)\{[\s\S]*?\n\}/)
assert.ok(searchNormalizerMatch && searchMatcherMatch, 'Normalized search helpers are required')
const normalizeServiceSearchQuery = vm.runInNewContext('('+searchNormalizerMatch[0]+')')
const matchesServiceFilter = vm.runInNewContext('('+searchMatcherMatch[0]+')',{normalizeServiceSearchQuery})
assert.equal(normalizeServiceSearchQuery('  ВИДЕО  '),'видео','Search should normalize whitespace and case')
assert.equal(matchesServiceFilter('studio','all','Создание сайтов и приложений','САЙТОВ'),true,'Search should match Russian service descriptions')
assert.equal(matchesServiceFilter('studio','business','Создание сайтов','сайтов'),false,'Search results must still obey the active category')
assert.equal(matchesServiceFilter('business','all','O2 System cash office','vpn'),false,'Search must hide non-matching services')
assert.equal(matchesServiceFilter('luxury','all','Gold Glamour luxury services','gold'),true,'Search should cover service names and descriptions')

assert.ok(source.includes('CONTINUE BEYOND THE ROUND / OSGARD WORLD') &&
  source.includes('Исследовать экосистему ↗') &&
  source.includes('Создать свой цифровой продукт ↗'),
  'The between-game panel must offer both the full OSGARD ecosystem and a custom-product route');
assert.ok(source.includes("new URL('/games/ecosystem/',location.origin)") &&
  source.includes("directoryUrl.searchParams.set('utm_medium','post_game')") &&
  source.includes("directoryUrl.searchParams.set('utm_campaign','between_worlds')"),
  'The ecosystem CTA must point to the real project directory with source/game attribution');
assert.ok(source.includes("new URL('https://osgardbewworld.com/')") &&
  source.includes("creationUrl.searchParams.set('utm_campaign','custom_product_intake')") &&
  source.includes("creationUrl.searchParams.set('utm_content',gameId)"),
  'The custom product CTA must use the owner-supplied official destination and preserve the current game source');
assert.ok(source.includes("'osgard-select:ecosystem:'+gameId") &&
  source.includes("'osgard-select:development:'+gameId") &&
  source.includes("if(hasConsent())void sendSelectEvent('cross_promo_clicked'"),
  'The commercial CTAs must use consent-gated first-party click measurement');
assert.ok(css.includes('.og-postgame-portfolio-actions') &&
  css.includes('.og-postgame-portfolio-link:focus-visible') &&
  css.includes('@media(max-width:680px)') &&
  css.includes('prefers-reduced-motion:reduce'),
  'The intermission commercial panel must be keyboard-accessible, responsive and respect reduced motion');
assert.ok(commerceApi.includes('ownedPromoDirectoryClicks') &&
  commerceApi.includes('osgard-select:ecosystem:') &&
  commerceApi.includes('ownedPromoDevelopmentClicks') &&
  commerceApi.includes('osgard-select:development:'),
  'The protected analytics API must aggregate these two separate click funnels with strict source patterns');
assert.ok(commerceAdmin.includes('id="owned-promo-directory-clicks"') &&
  commerceAdmin.includes('id="owned-promo-development-clicks"') &&
  commerceAdmin.includes("$('#owned-promo-directory-clicks').textContent = fmt(funnel.ownedPromoDirectoryClicks)") &&
  commerceAdmin.includes("$('#owned-promo-development-clicks').textContent = fmt(funnel.ownedPromoDevelopmentClicks)"),
  'The commerce admin dashboard must render both CTA metrics from the API');
assert.ok(!source.includes('portfolioActions,foot,decision') || source.includes('if(showPromos&&activeSelected.length)'),
  'The commercial CTA must remain within the opted-in/selected promo surface, not bypass the user off setting');

console.log(JSON.stringify({
  status: 'passed',
  serviceDestinations: services.length,
  gameContexts: 9,
  checks: 84, notes: 'Source-level guardrails; social publication is self-confirmed, not verified by social-network APIs.'
}));
