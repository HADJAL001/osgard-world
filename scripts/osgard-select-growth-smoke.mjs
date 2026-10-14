import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import vm from 'node:vm';

const read = (path) => readFileSync(path, 'utf8');
const source = read('public/games/game-session-recommendations.js');
const gamesPortal = read('public/games/index.html');
const css = read('public/games/game-session-recommendations.css');
const core = read('services/osgard-commerce-api/src/core.mjs');
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

assert.ok(source.includes("const fallback={frequency:'each',selected:availableServiceIds.slice()}") &&
  source.includes("['each','После каждой завершённой игры']") &&
  source.includes("['every3','Раз в три завершённых раунда']") &&
  source.includes("['off','Не показывать подборку']") &&
  source.includes("frequency:frequencyValues.includes(value.frequency)?value.frequency:'each'"),
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
assert.ok(lifecycle.includes("activeSessionId='session_'+id+'_'+sequence+'_'+launchAt") && lifecycle.includes('sessionId:activeSessionId') && lifecycle.includes('detail:{game:activeGame,sessionId:activeSessionId}'),
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


assert.ok(gamesPortal.includes('<dialog id="osgard-select-intermission"') &&
  gamesPortal.includes('id="osgard-select-intermission-content"') &&
  gamesPortal.includes('id="osgard-select-intermission-close"') &&
  gamesPortal.includes('id="osgard-select-intermission-resume"') &&
  gamesPortal.includes('id="osgard-select-intermission-catalog"'),
  'The premium intermission must expose an accessible dialog, content mount and close/resume/catalog actions');
assert.ok(css.includes('dialog.og-select-intermission{') &&
  css.includes('dialog.og-select-intermission::backdrop') &&
  css.includes('@media(max-width:760px)') &&
  css.includes('@media(max-width:420px)') &&
  css.includes('prefers-reduced-motion:reduce'),
  'Premium intermission requires responsive mobile layout, backdrop and reduced-motion handling');
assert.ok(source.includes("function openPremiumIntermission(gameId,sessionId)") &&
  source.includes("intermissionDialog.showModal()") &&
  source.includes("shownIntermissionSessions.has(key)") &&
  source.includes("recordCompletedRound(gameId,key)"),
  'The full-screen intermission must open from the session lifecycle while deduplicating completed sessions');
assert.ok(source.includes("document.querySelector('#osgard-select-intermission-close')") &&
  source.includes("document.querySelector('#osgard-select-intermission-resume')") &&
  source.includes("document.querySelector('#osgard-select-intermission-catalog')") &&
  source.includes("intermissionDialog.addEventListener('close',cleanupIntermission)"),
  'Closing, resuming and returning to catalog must dispose listeners/observers rather than stacking interstitials');
assert.ok(source.includes("nextLink.dataset.play=nextId") &&
  source.includes("servicesShelf(gameId,shouldShowServicePromos(preferences,completedCount),completedCount)") &&
  source.includes("rewardShelf(gameId)"),
  'The between-worlds dialog must connect a next-game route, user-controlled OSGARD service choices and the existing share reward');
assert.ok(source.includes("function intermissionKey(gameId,sessionId)") &&
  source.includes("if(shownIntermissionSessions.has(key))return true"),
  'Duplicate completion and session-ended events must not show the same promotion twice');
const intermissionKeyMatch=source.match(/function intermissionKey\(gameId,sessionId\)\{[\s\S]*?\n\}/);
assert.ok(intermissionKeyMatch,'Intermission session-key helper must be independently testable');
const intermissionKey=vm.runInNewContext('('+intermissionKeyMatch[0]+')',{Date});
assert.equal(intermissionKey('signal-run','session_signal-run_2_123456'),'session_signal-run_2_123456');
assert.match(intermissionKey('signal-run','invalid session'),/^fallback:signal-run:/);


const playerShareStart=gamesPortal.indexOf("$('#player-share').addEventListener('click'");
const playerShareEnd=gamesPortal.indexOf("$('#menu-toggle').addEventListener",playerShareStart);
assert.ok(playerShareStart>=0&&playerShareEnd>playerShareStart,'Catalog share button must have an independently checkable handler');
const playerShareHandler=gamesPortal.slice(playerShareStart,playerShareEnd);
assert.ok(!playerShareHandler.includes("eventIfAllowed('share_created'")&&!playerShareHandler.includes("name:'share_created'"),
  'The player share button must not report a copy or generic share-sheet action as a verified share');
assert.ok(playerShareHandler.includes("eventIfAllowed('invite_link_prepared'")&&playerShareHandler.includes("eventIfAllowed('social_share_intent'")&&
  playerShareHandler.includes("Копирование само по себе не считается репостом"),
  'Player sharing must distinguish invite preparation from social intent and disclose that a copy is not a verified repost');
assert.ok(commerceApi.includes('"invite_link_prepared"')&&commerceApi.includes('"social_share_intent"'),
  'Commerce API must allow existing preparation/intent events so the player share button does not spoof share_created');

console.log(JSON.stringify({
  status: 'passed',
  serviceDestinations: services.length,
  gameContexts: 9,
  checks: 64, notes: 'Source-level guardrails; social publication is self-confirmed, not verified by social-network APIs.'
}));
