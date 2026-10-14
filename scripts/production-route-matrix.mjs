import { isValidPartnerInventoryText } from './partner-inventory-contract.mjs'
import { writeFile } from 'node:fs/promises'
import { summarizeRouteFailures } from './route-matrix-report.mjs'
const base = process.env.OSGARD_BASE_URL || 'https://osgard.world'
const expectCurrentDesign = process.env.SKILLCRED_EXPECT_CURRENT_DESIGN === '1'
const expectedBuild = String(process.env.OSGARD_EXPECTED_BUILD || '').trim()
const ROUTE_TIMEOUT_MS = 10000
const GODOT_ROUTE_TIMEOUT_MS = 20000
const routes = ['/','/skillcred/','/skillcred-api/health','/skillcred-api/ready','/skillcred-api/issuer','/entertainment','/entertainment/','/entertainment/entertainment.css','/entertainment/entertainment.js','/games/','/games/index.html','/games/en/','/games/en/index.html','/games/game-catalog-fallback.json','/games/diagnostics/','/games/diagnostics/diagnostics.js','/games/expedition/','/games/expedition/index.html','/games/expedition/core.js','/games/expedition/app.js','/games/expedition/catalog-runtime.js','/games/expedition/expedition.css','/sitemap.xml','/games/civic-cascade/','/games/civic-cascade/release.json','/games/patina/','/games/cascade-lab/','/games/cascade-lab/manifest.webmanifest','/games/cascade-lab/service-worker.js','/games/cascade-lab/lab-icon.svg','/games/cascade-lab/hypothesis-lab.js','/games/cascade-lab/engineering-suite.js','/games/cascade-lab/experiment-studio.js','/games/cascade-lab/case-passport.js','/games/cascade-lab/trajectory-xray.js','/games/cascade-lab/evidence-integrity.js','/games/cascade-lab/counterfactual-lab.js','/games/afterimage-run/','/games/aether-grid/','/games/partners/','/games/ecosystem/','/games/growth-studio/','/games/experiments/','/games/experiments/app.js','/games/experiments/evidence-engine.js','/games/monetization/','/games/monetization/export.mjs','/games/premium/','/games/premium/success/','/games/commerce-admin/','/games/commerce-config.json','/games/commerce-client.js','/games/admin/','/games/admin/campaigns/','/games/operations/','/games/command-center/','/games/player-console.js','/games/player-console.css','/games/admin/partners/','/games/admin/catalog/','/games/admin/catalog/catalog.js','/games/catalog-runtime.js','/commerce-api/v1/game-catalog','/commerce-api/v1/admin/game-catalog','/games/invite/','/games/invite/null-shift/','/games/invite/time/','/games/invite/swarm/','/games/invite/inherit/','/games/invite/remix/','/games/invite/civic-cascade/','/games/invite/patina/','/games/invite/signal-run/','/games/invite/cascade-lab/','/games/invite/afterimage-run/','/games/invite/aether-grid/','/games/invite/invite-landing.js','/games/share-cards/catalog.png','/games/share-cards/null-shift.png','/games/share-cards/afterimage-run.png','/games/share-cards/aether-grid.png','/games/favicon.svg','/privacy/','/terms/','/support/osgard-play/','/community','/stream','/archive','/profile','/api/v1/player/profile','/api/v1/analytics/summary?from=0&to=1','/r/1842','/games/time','/game/time','/game/swarm','/game/null-shift','/game/inherit','/game/remix','/game/signal-run','/game/civic-cascade','/game/patina','/game/cascade-lab','/game/afterimage-run','/game/aether-grid','/games/swarm/','/games/swarm/index.html','/games/inherit/','/games/inherit/index.html','/games/remix/','/games/remix/index.html','/games/signal-run/','/games/null-shift/','/games/null-shift/index.html','/games/null-shift-godot/','/games/null-shift-godot/index.html','/play/swarm','/play/null-shift','/play/inherit','/play/remix','/media','/business','/create','/mobility']
const agents = { desktop: 'OSGARD-Route-Matrix/1.1 Desktop', mobile: 'OSGARD-Route-Matrix/1.1 Mobile' }
const results = []
for (const [device, userAgent] of Object.entries(agents)) for (const route of routes) {
  const started = Date.now()
  try {
    const timeoutMs = route === '/games/null-shift-godot/' ? GODOT_ROUTE_TIMEOUT_MS : ROUTE_TIMEOUT_MS
    const isGodotDirectory = route === '/games/null-shift-godot/'
    // The directory URL can stream a large WebAssembly HTML shell slowly. Probe only
    // its headers; the explicit index.html route and required binary assets below still
    // receive content-aware GET checks.
    const response = await fetch(new URL(route, base), { method: isGodotDirectory ? 'HEAD' : 'GET', headers: { 'user-agent': userAgent }, signal: AbortSignal.timeout(timeoutMs) })
    const responseBody = route.startsWith('/games/share-cards/') ? new Uint8Array(await response.arrayBuffer()) : isGodotDirectory ? '' : await response.text()
    const text = typeof responseBody === 'string' ? responseBody : ''
    const isExpeditionPage = route === '/games/expedition/' || route === '/games/expedition/index.html'
    const isGamesHub = route === '/games/' || route === '/games/index.html'
    const isEnglishGamesHub = route === '/games/en/' || route === '/games/en/index.html'
    const actualBuild = isGamesHub ? (text.match(/<meta name="osgard-build" content="([a-f0-9]{12})">/i)?.[1] || '') : ''
    const expectedBuildMatches = !isGamesHub || (actualBuild.length === 12 && (!expectedBuild || actualBuild === expectedBuild.slice(0, 12)))
    const shellOk = route.startsWith('/api/v1/')
      ? [401, 403].includes(response.status) && (response.headers.get('content-type') || '').toLowerCase().includes('application/json') && (() => { try { JSON.parse(text); return true } catch { return false } })()
      : route === '/commerce-api/v1/game-catalog'
        ? response.status === 200 && (response.headers.get('content-type') || '').toLowerCase().includes('application/json') && (() => { try { const body = JSON.parse(text); return body.schemaVersion === 1 && Array.isArray(body.items) && body.items.length === 11 && body.items.every((item) => typeof item.id === 'string' && item.href.startsWith('/games/')) } catch { return false } })()
        : route === '/commerce-api/v1/admin/game-catalog'
          ? [401, 403, 503].includes(response.status) && (response.headers.get('content-type') || '').toLowerCase().includes('application/json') && (() => { try { JSON.parse(text); return true } catch { return false } })()
      : route === '/games/admin/catalog/'
        ? text.includes('<meta name="robots" content="noindex,nofollow,noarchive">') && text.includes('id="token"') && text.includes('/games/admin/catalog/catalog.js') && text.includes('URL запуска защищены серверным allow-list')
      : route === '/games/admin/catalog/catalog.js'
        ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes('/admin/game-catalog') && text.includes("authorization: 'Bearer ' + operatorToken") && !text.includes('localStorage') && !text.includes('sessionStorage')
      : route === '/games/catalog-runtime.js'
        ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && (() => { const compact = text.replace(/\s+/g, ''); return compact.includes('catalogContentSource') && compact.includes('.textContent=') && compact.includes('.title') && !compact.includes('.innerHTML'); })()
      : isEnglishGamesHub
        ? text.includes('<title>OSGARD PLAY — Explore Digital Worlds</title>') && text.includes('<html lang="en">') && text.includes('href="https://osgard.world/games/en/"') && text.includes('hreflang="ru"') && text.includes('name="description"') && text.includes('Language availability:') && text.includes('id="aether-grid"')
      : route === '/games/game-catalog-fallback.json'
        ? (response.headers.get('content-type') || '').toLowerCase().includes('application/json') && (() => { try { const body = JSON.parse(text); return body.schemaVersion === 1 && body.source === 'defaults' && Array.isArray(body.items) && body.items.length === 11 && new Set(body.items.map(item => item.id)).size === 11 && body.items.every(item => typeof item.href === 'string' && item.href.startsWith('/games/')); } catch { return false; } })()
      : route === '/skillcred/'
      ? text.includes('id="issueBtn"') &&
        text.includes('id="verifyBtn"') &&
        text.includes('id="revokeBtn"') &&
        text.includes('id="downloadBtn"') &&
        (!expectCurrentDesign || text.includes('id="trustSpine"')) &&
        text.includes('id="signatureClock"') &&
        text.includes('id="timeElapsed"') &&
        text.includes('id="heroCredential"') &&
        text.includes('name="api-base" content="/skillcred-api"') &&
        text.includes('/demo/issue') &&
        text.includes('/demo/verify') &&
        text.includes('/demo/revoke')
      : route.startsWith('/skillcred-api/')
        ? route.endsWith('/health') ? /"service"\s*:\s*"skillcred"/.test(text) && /"version"\s*:\s*"0\.3\.0"/.test(text)
          : route.endsWith('/ready') ? /"ready"\s*:\s*true/.test(text)
            : /"id"\s*:/.test(text) && /"name"\s*:/.test(text)
        : isExpeditionPage
          ? text.includes('<title>OSGARD PLAY — Конструктор экспедиций</title>') && text.includes('id="game-options"') && text.includes('id="share-panel"') && text.includes('id="open-catalog"')
        : route === '/games/expedition/core.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes('window.OSGARDExpeditionCore')
        : route === '/games/expedition/app.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes('expedition_route_created')
        : route === '/games/expedition/catalog-runtime.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes("osgard:game-completed")
        : route === '/games/expedition/expedition.css'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('text/css') && text.includes('.og-expedition-band') && text.includes('prefers-reduced-motion')
        : route === '/games/diagnostics/'
          ? text.includes('<title>OSGARD PLAY — Проверка совместимости</title>') && text.includes('data-og-diagnostics="1"') && text.includes('30 диагностических проверок')
        : route === '/games/diagnostics/diagnostics.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes('window.OSGARDDiagnostics') && text.includes("schema: 'osgard.play.diagnostics.v1'")
        : route === '/games/premium/'
          ? text.includes('id="products"') && text.includes('id="buyer-email"') && text.includes('id="terms-accepted"') && text.includes('/games/premium/app.js')
        : route === '/games/premium/success/'
          ? text.includes('/v1/checkout/status') && text.includes('result.paid===true') && text.includes("result.orderStatus==='refunded'")
        : route === '/games/commerce-admin/'
          ? text.includes('<meta name="robots" content="noindex,nofollow,noarchive">') && text.includes('id="token"') && text.includes('ADMIN_API_TOKEN') && text.includes('/v1/admin/orders') && text.includes('id="social-network-table"') && text.includes('id="social-network-body"')
        : route === '/games/commerce-config.json'
          ? (() => { try { const config = JSON.parse(text); return typeof config.apiBaseUrl === 'string' && !/(sk_(?:live|test)_|whsec_)/i.test(text) } catch { return false } })()
        : route === '/games/commerce-client.js'
          ? text.includes('/v1/leads') && text.includes('wa.me/79640027222') && !/(sk_(?:live|test)_|whsec_)/i.test(text)
        : route === '/games/player-console.js'
          ? text.includes('window.OSGARDPlayerConsole') && text.includes('MAX_QUEUE = 5') && text.includes('MAX_IMPORT_BYTES = 100 * 1024') && text.includes('data-pc-missions-list') && text.includes('validateMissionState') && text.includes('MAX_MISSION_CLAIMS = 4000') && text.includes('completionLog') && text.includes("osgard:game-level-completed")
        : route === '/games/player-console.css'
          ? text.includes('#og-pc-launcher') && text.includes('.og-pc-high-contrast') && text.includes('.og-pc-reduced-motion') && text.includes('.og-pc-mission-hero') && text.includes('.og-pc-mission-meter')
        : route === '/games/operations/'
          ? text.includes('<title>OSGARD PLAY — диагностика публикации</title>') && text.includes('id="run-checks"') && text.includes('const TARGETS = [') && text.includes("reportType:'osgard-games-readonly-route-health'") && text.includes("credentials: 'omit'")
        : route === '/games/command-center/'
          ? text.includes('<title>OSGARD PLAY — Command Deck</title>') &&
            text.includes('id="run-checks"') &&
            text.includes('id="download-report"') &&
            text.includes("reportType: 'osgard-play-command-deck'") &&
            text.includes('databaseReady !== true') &&
            text.includes('noindex,nofollow,noarchive')
        : route === '/games/admin/'
          ? text.includes('<meta name="robots" content="noindex,nofollow,noarchive">') && text.includes('id="access-form"') && text.includes('X-Moderation-Token') && text.includes('/api/v1/analytics/summary')
      : route === '/games/admin/campaigns/'
          ? text.includes('<meta name="robots" content="noindex,nofollow,noarchive">') && text.includes('id="access-form"') && text.includes('id="campaign-form"') && text.includes('/games/admin/campaigns/admin.js') && text.includes('id="campaign-list"')
      : route === '/games/admin/partners/'
          ? text.includes('<meta name="robots" content="noindex,nofollow,noarchive">') && text.includes('id="editor-list"') && text.includes('id="download"') && text.includes('inventory.json')
      : route === '/games/invite/invite-landing.js'
           ? text.includes("osgard.games.referral-attribution.v1") && text.includes("name: 'referral_link_opened'")
                 : route === '/games/invite/afterimage-run/'
           ? text.includes('property="og:title" content="AFTERIMAGE//RUN — OSGARD PLAY"') && text.includes('property="og:image" content="https://osgard.world/games/share-cards/afterimage-run.png"') && text.includes('id="play-link"') && text.includes('noindex,follow')
         : route.startsWith('/games/invite/')
          ? text.includes('property="og:title"') && text.includes('property="og:image"') && text.includes('name="twitter:card" content="summary_large_image"') && text.includes('id="play-link"') && text.includes('noindex,follow')
        : route.startsWith('/games/share-cards/')
          ? (response.headers.get('content-type') || '').toLowerCase().includes('image/png') && responseBody[0]===137 && responseBody[1]===80 && responseBody[2]===78 && responseBody[3]===71 && responseBody.length>5000 && new DataView(responseBody.buffer,responseBody.byteOffset,responseBody.byteLength).getUint32(16)===1200 && new DataView(responseBody.buffer,responseBody.byteOffset,responseBody.byteLength).getUint32(20)===630
        : route === '/games/favicon.svg'
          ? text.includes('<svg') && text.includes('viewBox="0 0 64 64"')
        : route === '/sitemap.xml'
          ? text.includes('<urlset') && text.includes('https://osgard.world/games/ecosystem/')
        : route === '/privacy/'
          ? text.includes('<title>Конфиденциальность OSGARD PLAY</title>') && text.includes('osgard.games.analytics-consent.v1')
        : route === '/terms/'
          ? text.includes('<title>Условия использования OSGARD PLAY</title>') && text.includes('прототип')
        : route === '/games/partners/'
          ? text.includes('id="campaign-form"') && text.includes('id="inventory-grid"') && text.includes('id="principles"') && text.includes('partners.js') && text.includes('mailto:osman.osmanov0099@gmail.com')
        : route === '/games/ecosystem/'
          ? text.includes('<title>OSGARD WORLD — Экосистема проектов</title>') && text.includes('id="project-grid"') && text.includes('data-project="osgardbewworld"') && text.includes('data-project="osgardvanguard"') && text.includes('id="project-search"') && text.includes('id="analytics-toggle"') && text.includes('directory.css') && text.includes('directory.js')
        : route === '/games/experiments/'
          ? text.includes('<title>OSGARD PLAY — Лаборатория доказательств роста</title>') && text.includes('id="import-text"') && text.includes('id="a-exposures"') && text.includes('id="export-report"') && text.includes('/games/experiments/app.js')
        : route === '/games/experiments/app.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes('parseExperimentImport') && text.includes('function render(report)')
        : route === '/games/experiments/evidence-engine.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes('export function analyzeExperiment') && text.includes('newcombeDifferenceInterval')
        : route === '/games/growth-studio/'
          ? text.includes('<title>Growth Studio — OSGARD PLAY</title>') && text.includes('id="campaign-url"') && text.includes('canvas id="share-card" width="1200" height="630"') && text.includes("url.searchParams.set('og_game',game)") && text.includes("url.searchParams.set('utm_campaign','play_with_friends')") && text.includes("source:'game-invite:'+state.game+':'+state.code")
        : route === '/games/monetization/'
          ? text.includes('data-estimate="not-live-data"') && text.includes('id="assumptions-form"') && text.includes('id="scenario-results"') && text.includes('id="export-json"') && text.includes('id="export-csv"') && text.includes('не отправляются на сервер')
        : route === '/games/monetization/export.mjs'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') && text.includes('export function buildFinancialCsv') && text.includes('function safeTextCell') && text.includes('FINANCIAL_CSV_NOTE')
        : /^\/game\/(time|swarm|null-shift|inherit|remix|signal-run|civic-cascade|patina|cascade-lab|afterimage-run|aether-grid)$/.test(route)
          ? text.includes('<div id="root">') && text.includes('type="module"')
        : (route === '/games/' || route === '/games/index.html')
          ? expectedBuildMatches && text.includes('id="games-grid"') && text.includes('data-game="null-shift"') && text.includes('data-game="time"') && text.includes('data-game="swarm"') && text.includes('data-game="inherit"') && text.includes('data-game="remix"') && text.includes('data-game="civic-cascade"') && text.includes('data-game="patina"') && text.includes('data-game="signal-run"') && text.includes('data-game="cascade-lab"') && text.includes('data-game="afterimage-run"') && text.includes('data-game="aether-grid"') && text.includes('"numberOfItems":11') && text.includes('id="player-dialog"') && text.includes('id="player-share"') && text.includes('player-lifecycle.js') && text.includes('id="project-form"') && text.includes('id="analytics-toggle"') && text.includes('osgardvanguard.studio')
        : route === '/games/aether-grid/'
          ? text.includes('<title>AETHER GRID — OSGARD WORLD GAMING</title>') &&
            text.includes('content="1.2.0-challenge-protocol-forge"') &&
            text.includes('data-aether-grid-ready="true"') &&
            text.includes('id="board"') && text.includes('id="challenge-code"') &&
            text.includes('id="protocol-select"') && text.includes('id="protocol-apply"') && text.includes('id="protocol-share"') &&
            ['standard','no-hints','no-undo','iron-circuit'].every(id => text.includes('value="'+id+'"')) &&
            text.includes("function runStorageKey()") && text.includes("url.searchParams.set('og_protocol',selected)") &&
            text.includes("notify('ready')") && text.includes("notify('completed'") &&
            text.includes("notify('share_created'")
        : route === '/games/civic-cascade/release.json'
           ? (() => { try { const release = JSON.parse(text); const widths = release.cinematicExport?.profiles?.map(profile => profile.width) || []; return release.gameId === 'civic-cascade' && release.version === '3.4.0' && release.buildContract?.commandPlanning?.enabled === true && release.buildContract?.commandPlanning?.queueLimit === 4 && release.buildContract?.commandPlanning?.executesActualGameActions === true && ['cc-command-deck','cc-plan-action','cc-plan-add','cc-plan-list','cc-plan-execute','cc-cascade-forecast','cc-cascade-30','cc-cascade-60','cc-cascade-90','cc-cascade-wait-30','cc-cascade-plan-30','cc-cascade-wait-90','cc-cascade-plan-90','cc-cascade-note'].every(marker => release.buildContract?.readinessMarkers?.includes(marker)) && release.buildContract?.missionChallenges?.enabled === true && release.buildContract?.missionChallenges?.globalLeaderboard === false && release.cinematicExport?.audio === true && release.cinematicExport?.audioMode === 'procedural-ambient-and-risk-cues' && release.cinematicExport?.microphoneUsed === false && release.entrypoint === '/games/civic-cascade/' && release.canonicalUrl === 'https://osgard.world/games/civic-cascade/' && release.buildContract?.infrastructureNetwork?.enabled === true && release.buildContract?.infrastructureNetwork?.nodeCount === 6 && release.buildContract?.infrastructureNetwork?.directedDependencies === 6 && ['cc-node-inspector','cc-node-health','cc-node-health-bar','cc-node-status','cc-node-chain','cc-node-effect','cc-adaptive-crisis','cc-causal-debrief','cc-causal-summary','cc-causal-count','cc-causal-risk-change','cc-causal-weakest','cc-causal-best','cc-causal-ledger','cc-doctrine-lab','cc-doctrine-mode','cc-doctrine-run','cc-doctrine-status','cc-doctrine-results','cc-doctrine-apply','cc-doctrine-reset','cc-doctrine-export','cc-doctrine-import-file','cc-doctrine-verify-import','cc-doctrine-verification-result','cc-doctrine-ai-advisor','cc-doctrine-ai-consent','cc-doctrine-ai-run','cc-doctrine-ai-status','cc-doctrine-ai-result'].every(marker => release.buildContract?.readinessMarkers?.includes(marker)) && release.buildContract?.adaptiveCrisisDirector?.enabled === true && release.buildContract?.adaptiveCrisisDirector?.triggerMode === 'node-integrity-threshold' && release.buildContract?.adaptiveCrisisDirector?.criticalThreshold === 45 && release.buildContract?.adaptiveCrisisDirector?.oneIncidentPerNodePerOperation === true && release.buildContract?.operationDebrief?.enabled === true && release.buildContract?.operationDebrief?.maxEvents === 20 && release.buildContract?.operationDebrief?.counterfactualClaims === false && release.buildContract?.autonomousDoctrinePlanner?.enabled === true && release.buildContract?.autonomousDoctrinePlanner?.algorithm === 'deterministic bounded beam search' && release.buildContract?.autonomousDoctrinePlanner?.maxCommands === 4 && release.buildContract?.autonomousDoctrinePlanner?.beamWidth === 6 && release.buildContract?.autonomousDoctrinePlanner?.localOnly === true && release.buildContract?.autonomousDoctrinePlanner?.callsOpenAIAPI === false && release.buildContract?.autonomousDoctrinePlanner?.neverExecutesAutomatically === true && release.buildContract?.autonomousDoctrinePlanner?.robustnessCandidateLimit === 8 && release.buildContract?.autonomousDoctrinePlanner?.decisionPortfolio === 'bounded-pareto-frontier' && release.buildContract?.autonomousDoctrinePlanner?.portfolioLimit === 3 && release.buildContract?.autonomousDoctrinePlanner?.explainsCandidateTradeoffs === true && release.buildContract?.autonomousDoctrinePlanner?.maximizesDistinctOpeningPrefixes === true && release.buildContract?.decisionDossier?.enabled === true && release.buildContract?.decisionDossier?.schema === 'osgard.civic-cascade.decision-dossier/v1' && release.buildContract?.decisionDossier?.exportFormat === 'application/json' && release.buildContract?.decisionDossier?.payloadIntegrityHash === 'SHA-256' && release.buildContract?.decisionDossier?.hashScope === 'canonical recursively key-sorted JSON payload without exportMetadata' && release.buildContract?.decisionDossier?.userInitiatedDownloadOnly === true && release.buildContract?.decisionDossier?.localOnly === true && release.buildContract?.decisionDossier?.includesPersonalData === false && release.buildContract?.decisionDossier?.verifierEnabled === true && release.buildContract?.decisionDossier?.maxImportBytes === 1048576 && release.buildContract?.decisionDossier?.importedPlanExecution === false && release.buildContract?.decisionDossier?.hashScope === 'canonical recursively key-sorted JSON payload without exportMetadata' && release.buildContract?.dossierVerification?.enabled === true && release.buildContract?.dossierVerification?.mode === 'local-only read-only audit' && release.buildContract?.dossierVerification?.maxDepth === 32 && release.buildContract?.dossierVerification?.maxNodes === 50000 && release.buildContract?.dossierVerification?.neverExecutesImportedOrders === true && release.buildContract?.dossierVerification?.networkRequests === false && release.buildContract?.dossierVerification?.sendsTelemetry === false && release.buildContract?.autonomousDoctrinePlanner?.reranksCandidatesByStressAdjustedScore === true && release.buildContract?.autonomousDoctrinePlanner?.comparesAgainstNoInterventionUnderSameStress === true && ['water-surge-mild','water-surge-moderate','water-surge-severe','grid-overload-mild','grid-overload-moderate','grid-overload-severe','weak-node-shock-mild','weak-node-shock-moderate','weak-node-shock-severe'].every(profile => release.buildContract?.autonomousDoctrinePlanner?.robustnessProfiles?.includes(profile)) && release.buildContract?.autonomousDoctrinePlanner?.robustnessProfileCount === 9 && release.buildContract?.autonomousDoctrinePlanner?.comparesThreeSeverityLevelsPerFamily === true && release.buildContract?.openAICivicCascadeAdvisor?.enabled === true && release.buildContract?.openAICivicCascadeAdvisor?.defaultFeatureFlag === false && release.buildContract?.openAICivicCascadeAdvisor?.requiresPerRequestConsent === true && release.buildContract?.openAICivicCascadeAdvisor?.responsesApiStore === false && release.buildContract?.openAICivicCascadeAdvisor?.canMutateGameState === false && release.buildContract?.decisionDossier?.modelVersion === '3.4.0' && release.buildContract?.decisionDossier?.stressProfileCount === 9 && release.buildContract?.infrastructureNetwork?.checkpointSchema === 2 && release.buildContract?.readinessMarkers?.includes('cc-game-root') && [1920,3840,7680].every(width => widths.includes(width)) } catch { return false } })()
        : route === '/games/civic-cascade/'
          ? text.includes('<title>CIVIC CASCADE — кризисная стратегия | OSGARD PLAY</title>') &&
            text.includes('<meta name="osgard-game-version" content="3.4.0-openai-civic-advisor">') &&
            ['cc-game-root','cc-status','cc-result-challenge','cc-challenge-banner','cc-command-deck','cc-plan-add','cc-plan-list','cc-plan-execute','cc-cascade-forecast','cc-cascade-wait-30','cc-cascade-plan-90','cc-causal-debrief','cc-causal-summary','cc-causal-count','cc-causal-risk-change','cc-causal-weakest','cc-causal-best','cc-causal-ledger','cc-doctrine-lab','cc-doctrine-mode','cc-doctrine-run','cc-doctrine-status','cc-doctrine-results','cc-doctrine-apply','cc-doctrine-reset','cc-doctrine-export'].every(marker => text.includes('id="'+marker+'"'))
        : route === '/games/patina/'
          ? text.includes('<title>PATINA Atelier — OSGARD WORLD GAMING</title>') && text.includes('id="patina-workbench"') && text.includes('data-patina-ready="true"') && text.includes('id="diagnose"') && text.includes('id="finish-case"') && text.includes('id="export-case"')
        : route === '/games/signal-run/'
          ? text.includes('<title>SIGNAL RUN — OSGARD WORLD</title>') && text.includes('id="arena"') && text.includes('game.js')
                : route === '/games/afterimage-run/'
          ? text.includes('<title>AFTERIMAGE//RUN — OSGARD PLAY</title>') &&
            text.includes('<meta name="osgard-game-version" content="1.7.0">') &&
            text.includes('id="runnerCanvas"') && text.includes('id="run-start"') && text.includes('id="daily-seed"') &&
            text.includes('id="share-telegram"') && text.includes('id="claim-share-reward"') && text.includes('id="focus-mode"') &&
            text.includes('id="phase-splits"') && text.includes('id="split-delta"') && text.includes('id="split-history"') &&
            text.includes("const RELEASE_VERSION='1.7.0'") && text.includes("schema:'osgard.afterimage.run-report.v3'") &&
            text.includes('osgard:game-lifecycle')
        : route === '/games/cascade-lab/engineering-suite.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            text.includes("const VERSION = '0.19.0'") &&
            text.includes("const SCHEMA = 'osgard.cascade-lab.engineering-suite.v1'") &&
            text.includes('const IMPROVEMENTS = Object.freeze([') &&
            text.includes('function validateArchive(') && text.includes('function diagnoseRun(') &&
            !text.includes('fetch(') && !text.includes('XMLHttpRequest') && !text.includes('sendBeacon') && !text.includes('.innerHTML')
        : route === '/games/cascade-lab/trajectory-xray.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            text.includes("const VERSION = '0.22.0'") &&
            text.includes("const SCHEMA = 'osgard.cascade-lab.trajectory-xray.v1'") &&
            text.includes('function normalizeFrames(') && text.includes('function trajectoryDeviation(') &&
            text.includes('function drawPathChart(') && text.includes('function drawSpeedChart(') &&
            text.includes('MAX_FRAMES = 420') && !text.includes('fetch(') &&
            !text.includes('XMLHttpRequest') && !text.includes('sendBeacon') && !text.includes('.innerHTML')
        : route === '/games/cascade-lab/case-passport.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            text.includes("const VERSION='0.21.0'") && text.includes('osgard.cascade-lab.case-passport.v1') &&
            text.includes('function validateShape(') && text.includes('function verifyPassport(') && text.includes('fingerprintProject') &&
            !text.includes('fetch(') && !text.includes('XMLHttpRequest') && !text.includes('sendBeacon') && !text.includes('.innerHTML')
        : route === '/games/cascade-lab/experiment-studio.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            text.includes("const VERSION = '0.20.0'") &&
            text.includes("const STUDY_SCHEMA = 'osgard.cascade-lab.experiment-study.v1'") &&
            text.includes("const ARCHIVE_SCHEMA = 'osgard.cascade-lab.experiment-studio-archive.v1'") &&
            text.includes('MAX_STUDIES = 40') && text.includes('MAX_OBSERVATIONS = 5') &&
            text.includes('MAX_IMPORT_BYTES = 512 * 1024') &&
            text.includes('function startStudy(input)') && text.includes('function reconcile()') &&
            text.includes('function calculateDelta(') && text.includes('function importArchive(payload)') &&
            text.includes("platform === 'telegram'") && text.includes("platform === 'whatsapp'") &&
            text.includes("platform === 'vk'") && text.includes("platform === 'x'") && text.includes("platform === 'linkedin'") &&
            !text.includes('fetch(') && !text.includes('XMLHttpRequest') && !text.includes('sendBeacon') && !text.includes('.innerHTML')
        : route === '/games/cascade-lab/counterfactual-lab.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            text.includes("const VERSION = '0.27.0'") &&
            text.includes("const SCHEMA = 'osgard.cascade-lab.counterfactual-lab.v1'") &&
            text.includes('function analyzeSweep(') && text.includes('function validateArchive(') &&
            !text.includes('fetch(') && !text.includes('XMLHttpRequest') && !text.includes('sendBeacon') && !text.includes('.innerHTML')
        : route === '/games/cascade-lab/evidence-integrity.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            /VERSION\s*=\s*['"]0\.25\.0['"]/.test(text) &&
            /SCHEMA\s*=\s*['"]osgard\.cascade-lab\.evidence-integrity\.v1['"]/.test(text) &&
            /ARCHIVE_SCHEMA\s*=\s*['"]osgard\.cascade-lab\.evidence-integrity-archive\.v1['"]/.test(text) &&
            !/\bfetch\s*\(/.test(text) && !/\bXMLHttpRequest\b/.test(text) && !/\bsendBeacon\b/.test(text)
        : route === '/games/cascade-lab/hypothesis-lab.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            text.includes("const SCHEMA = 'osgard.cascade-lab.next-experiment.v1'") &&
            text.includes('function proposalForPair(pair)') && text.includes('function reconcilePlan(') &&
            !text.includes('fetch(') && !text.includes('XMLHttpRequest') && !text.includes('sendBeacon')
        : route === '/games/cascade-lab/manifest.webmanifest'
          ? (() => { try { const value = JSON.parse(text); return (response.headers.get('content-type') || '').toLowerCase().includes('json') && value.name === 'CASCADE LAB — Premium Physics Lab' && value.scope === './' && value.display === 'standalone' } catch { return false } })()
        : route === '/games/cascade-lab/service-worker.js'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('javascript') &&
            /CACHE\s*=\s*PREFIX\s*\+\s*['"]v\d+\.\d+\.\d+['"]/.test(text) &&
            /\bmethod\s*!==\s*['"]GET['"]/.test(text) &&
            /\bmode\s*===\s*['"]navigate['"]/.test(text)
        : route === '/games/cascade-lab/lab-icon.svg'
          ? (response.headers.get('content-type') || '').toLowerCase().includes('image/svg+xml') && text.includes('<svg') && text.includes('CASCADE LAB')
        : route === '/games/cascade-lab/'
          ? text.includes('<title>CASCADE LAB — Premium Physics Lab 0.27.0</title>') &&
            text.includes('name="osgard-game-version" content="0.27.0-counterfactual-twin"') &&
            text.includes('data-cascade-lab-upgrades="0.14.0"') && text.includes('CASCADELAB014') &&
            text.includes('data-cascade-lab-ledger="0.15.0"') && text.includes('CASCADELAB015') && text.includes('id="CASCADELAB017"') && text.includes('data-cascade-lab-delta="0.17.0"') &&
            text.includes('id="CASCADELAB018"') && text.includes('data-cascade-lab-experiment="0.18.0"') && text.includes('hypothesis-lab.js?v=0.18.0') &&
            text.includes('osgard.cascade-lab.experiment-ledger.v1') &&
            text.includes('data-cascade-lab-ready="true"') &&
            text.includes('id="runButton"') && text.includes('id="exportTelemetryButton"') &&
            text.includes('id="exportGrowthButton"') && text.includes('id="serviceAdDialog"') &&
            text.includes('id="serviceAdChoices"') && text.includes('Я поделился — получить +10 LC') &&
            text.includes("notifyOsgardLifecycle('ready', { version: '0.27.0' })") && text.includes("notifyOsgardLifecycle('ready'") && text.includes("notifyOsgardLifecycle('started'") &&
            text.includes("notifyOsgardLifecycle('paused'") && text.includes("notifyOsgardLifecycle('resumed'") &&
            text.includes("notifyOsgardLifecycle('level_completed'") && !text.includes("notifyOsgardLifecycle('completed'") &&
            text.includes('id="CASCADELAB019"') && text.includes('data-cascade-lab-engineering="0.19.0"') &&
            text.includes('id="CASCADELAB020"') && text.includes('data-cascade-lab-studio="0.20.0"') && text.includes('experiment-studio.js?v=0.20.0') && text.includes('id="CASCADELAB021"') && text.includes('data-cascade-lab-passport="0.21.0"') && text.includes('case-passport.js?v=0.21.0') && text.includes('restoreProject,undo') &&
            text.includes("new CustomEvent('cascade-lab:run-finished'") &&
            text.includes('id="CASCADELAB022"') && text.includes('data-cascade-lab-xray="0.22.0"') &&
            text.includes('trajectory-xray.js?v=0.22.0') && text.includes('id="CASCADELAB024"') && text.includes('data-cascade-lab-director="0.24.0"') && text.includes('mission-director.js?v=0.24.1') && text.includes('id="CASCADELAB025"') && text.includes('data-cascade-lab-evidence="0.25.0"') && text.includes('evidence-integrity.js?v=0.25.0') && text.includes('trajectory: Array.from({ length: Math.min(420, lastReplay.length) }') &&
            text.includes('name="osgard-game-pwa" content="0.27.0-counterfactual-twin"') &&
            text.includes('id="CASCADELAB027"') && text.includes('data-cascade-lab-counterfactual="0.27.0"') &&
            text.includes('counterfactual-lab.js?v=0.27.0') && text.includes("service-worker.js?v=0.27.0")
        : route.startsWith('/games/null-shift-godot')
          ? isGodotDirectory
            ? (response.headers.get('content-type') || '').toLowerCase().includes('text/html') &&
              ['/games/null-shift-godot/', '/games/null-shift-godot/index.html'].includes(new URL(response.url).pathname)
            : /<canvas/i.test(text) && /godot/i.test(text) && text.includes('index.wasm') && text.includes('index.pck') &&
              text.includes('data-nullshift-shell="premium-v1"') &&
              text.includes('data-nullshift-release="0.22.0-operator-chronicle"') &&
              text.includes('name="osgard-game-version" content="0.22.0-operator-chronicle"') &&
              text.includes('RELEASE 0.22.0') &&
              text.includes('Engine.isWebGLAvailable(2)') &&
              text.includes('onProgress') &&
              text.includes('НАЧАТЬ ОПЕРАЦИЮ') && text.includes('osgard:game-lifecycle')
          : route.startsWith('/games/null-shift')
            ? text.includes('id="game"') && text.includes('id="mobile-ui"') && text.includes('id="diag-panel"') && text.includes('id="sound-toggle"') && text.includes('id="touch-sound"') && text.includes('./styles.css') && text.includes('./game.js') && text.includes('./engine-3d.js') && text.includes('id="engine-toggle"') && text.includes('id="touch-engine"') && text.includes('id="godot-preview"')
          : route === '/games/swarm/' || route === '/games/swarm/index.html'
             ? text.includes('<title>SWARM — One Body. Eight Minds.</title>') && text.includes('href="./styles.css"') && text.includes('src="./game.js"')
           : route === '/games/inherit/' || route === '/games/inherit/index.html'
             ? text.includes('<title>INHERIT — The Quiet Reach</title>') && text.includes('id="world"') && text.includes('id="pass"') && text.includes('Leave one trace')
           : route === '/games/remix/' || route === '/games/remix/index.html'
             ? text.includes('<title>REMIX — OSGARD WORLD GAMING</title>') && text.includes('href="/games/remix/player/index.html"') && text.includes('Invite a rival.')
           : route === '/entertainment' || route === '/entertainment/'
            ? new URL(response.url).pathname === '/entertainment/' &&
              text.includes('<title>OSGARD ENTERTAINMENT — Играй. Исследуй. Передавай вызов.</title>') &&
              text.includes('id="world-catalog"') &&
              text.includes('id="game-search"') &&
              text.includes('id="favorites-filter"') &&
              text.includes('id="share-dialog"') &&
              text.includes('href="/entertainment/entertainment.css?v=20261014.3"') &&
              /src="\/entertainment\/entertainment\.js\?v=[^"]+"/.test(text) &&
              ['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid'].every(id => text.includes('data-game="'+id+'"')) &&
              text.includes('"numberOfItems":11')
            : route === '/entertainment/entertainment.css'
              ? text.includes('.world-grid') && text.includes('prefers-reduced-motion:reduce') && (response.headers.get('content-type') || '').toLowerCase().includes('text/css')
            : route === '/entertainment/entertainment.js'
              ? text.includes('makeInviteLink') && text.includes('OSGARD_CONSENTED_ANALYTICS') && (response.headers.get('content-type') || '').toLowerCase().includes('javascript')
            : route === '/support/osgard-play/'
              ? text.includes('<title>Поддержка OSGARD PLAY — OSGARD WORLD</title>') &&
                text.includes('mailto:osman.osmanov0099@gmail.com') &&
                text.includes('href="/privacy/"') &&
                text.includes('href="/terms/"')
            : text.includes('<div id="root">')
    const isCampaignAdmin = route === '/games/admin/campaigns/'
    const isPartnerPage = route === '/games/partners/'
    const isEcosystemDirectory = route === '/games/ecosystem/'
    const isGodot = route.startsWith('/games/null-shift-godot')
    const isCatalogAdmin = route === '/games/admin/catalog/'
    const assetPaths = isEnglishGamesHub ? ['/games/favicon.svg', '/games/share-cards/catalog.png'] : isCatalogAdmin ? ['/games/admin/catalog/catalog.js'] : route.startsWith('/games/swarm/') ? ['/games/swarm/styles.css', '/games/swarm/game.js'] : route === '/games/favicon.svg' || route === '/privacy/' || route === '/terms/' ? [] : isCampaignAdmin ? ['/games/admin/campaigns/admin.js', '/games/admin/campaigns/admin.css'] : isPartnerPage ? ['/games/partners/partners.js', '/games/partners/inventory.json'] : isEcosystemDirectory ? ['/games/ecosystem/directory.css', '/games/ecosystem/directory.js'] : route === '/games/diagnostics/' ? ['/games/diagnostics/diagnostics.js'] : isExpeditionPage ? ['/games/expedition/core.js','/games/expedition/app.js','/games/expedition/expedition.css'] : isGamesHub ? ['/games/consented-analytics.js','/games/player-lifecycle.js','/games/game-session-recommendations.js','/games/game-session-recommendations.css','/games/daily-circuit.js','/games/daily-circuit.css','/games/sponsored-campaigns.js','/games/sponsored-campaigns.css','/games/expedition/core.js','/games/expedition/catalog-runtime.js','/games/catalog-runtime.js'] : route === '/skillcred/' ? ['/skillcred/styles.css', '/skillcred/app.js', '/skillcred/fonts/InterVariable.woff2', '/skillcred/fonts/InstrumentSerif-Italic.woff2', '/skillcred/fonts/JetBrainsMono-Regular.woff2'] : route === '/games/cascade-lab/' ? ['/games/cascade-lab/case-passport.js','/games/cascade-lab/trajectory-xray.js','/games/cascade-lab/mission-director.js','/games/cascade-lab/evidence-integrity.js','/games/cascade-lab/counterfactual-lab.js'] : route === '/games/signal-run/' ? ['/games/signal-run/game.js'] : isGodot ? ['/games/null-shift-godot/index.js', '/games/null-shift-godot/index.wasm', '/games/null-shift-godot/index.pck'] : route.startsWith('/games/null-shift') ? ['/games/null-shift/styles.css', '/games/null-shift/game.js', '/games/null-shift/engine-3d.js'] : route.startsWith('/games/invite/') && route !== '/games/invite/invite-landing.js' ? ['/games/invite/invite-landing.js', '/games/share-cards/' + (route.split('/')[3] || 'catalog') + '.png'] : []
    const assetChecks = await Promise.all(assetPaths.map(async path => {
      const expectedType = path.endsWith('.css') ? 'text/css' : path.endsWith('.json') ? 'json' : path.endsWith('.js') ? 'javascript' : path.endsWith('.png') ? 'png' : path.endsWith('.wasm') ? 'wasm' : path.endsWith('.pck') ? 'pack' : 'font'
      // Large immutable artifacts only need an existence/MIME/size check. HEAD avoids
      // downloading Godot WebAssembly, PCK and font files for both device profiles.
      const sizeOnlyTypes = new Set(['font','wasm','pack'])
      const sizeOnly = sizeOnlyTypes.has(expectedType)
      // Probe the current release, not an old immutable edge-cache entry at the unversioned asset URL.
      // The app itself uses versioned asset URLs; use the build SHA here to keep route-matrix evidence aligned.
      const assetUrl = new URL(path, base)
      assetUrl.searchParams.set('_osgard_route_check', expectedBuild || String(Date.now()))
      const asset = await fetch(assetUrl, { method: sizeOnly ? 'HEAD' : 'GET', headers: { 'user-agent': userAgent, 'cache-control': 'no-cache', pragma: 'no-cache' }, cache: 'no-store', signal: AbortSignal.timeout(ROUTE_TIMEOUT_MS) })
      const contentType = asset.headers.get('content-type') || ''
      const mime = contentType.toLowerCase()
      const typeOk = expectedType === 'text/css' ? mime.includes('text/css') : expectedType === 'json' ? mime.includes('application/json') || mime.includes('text/json') || mime.includes('text/plain') : expectedType === 'javascript' ? mime.includes('javascript') || mime.includes('ecmascript') : expectedType === 'png' ? mime.includes('image/png') : expectedType === 'wasm' ? mime.includes('wasm') || mime.includes('octet-stream') : expectedType === 'pack' ? mime.length > 0 : mime.includes('font/woff2') || mime.includes('application/octet-stream')
      let nonEmpty = false
      if (sizeOnly) {
        const size = Number(asset.headers.get('content-length') || 0)
        const minimum = expectedType === 'font' ? (path.endsWith('InterVariable.woff2') ? 100000 : 5000) : expectedType === 'wasm' ? 100000 : 10000
        nonEmpty = Number.isFinite(size) && size > minimum
      } else if (expectedType === 'png') {
        const buffer = await asset.arrayBuffer()
        const size = buffer.byteLength
        const bytes = new Uint8Array(buffer)
        const view = new DataView(buffer)
        nonEmpty = size > 5000 && bytes[0] === 137 && bytes[1] === 80 && bytes[2] === 78 && bytes[3] === 71 && view.getUint32(16) === 1200 && view.getUint32(20) === 630
      } else {
        const content = await asset.text()
        const normalized = content.toLowerCase()
      const compact = normalized.replace(/\s+/g, '')
        nonEmpty = path === '/games/diagnostics/diagnostics.js'
          ? content.includes('window.OSGARDDiagnostics') && content.includes("schema: 'osgard.play.diagnostics.v1'") && !content.includes('sendBeacon(')
          : isCatalogAdmin
          ? content.includes("const API = '/commerce-api/v1'") && content.includes('/admin/game-catalog') && !content.includes('localStorage') && !content.includes('sessionStorage') && !content.includes('.innerHTML')
          : path === '/games/catalog-runtime.js'
           ? content.includes("const endpoint = '/commerce-api/v1/game-catalog'") &&
             content.includes('function safeItem(') &&
             content.includes('textContent = item.title') &&
             content.includes('AbortSignal.timeout(4500)') &&
             !content.includes('.innerHTML')
           : isCampaignAdmin
          ? (path.endsWith('.js') ? content.includes('apiBaseFromConfig') && content.includes('/v1/admin/campaigns') && !content.includes('localStorage.setItem(') : content.includes('.campaign-card') && content.includes('prefers-reduced-motion:reduce'))
          : isGamesHub && path === '/games/sponsored-campaigns.js'
            ? content.includes('sponsored_campaign_impression') && content.includes("credentials: 'omit'") && content.includes('osgard.games.sponsor-exposures.v1')
          : isGamesHub && path === '/games/sponsored-campaigns.css'
            ? content.includes('.og-live-sponsored__card') && content.includes('prefers-reduced-motion:reduce')
          : isEcosystemDirectory
          ? (path.endsWith('.js') ? content.includes("getElementById('project-search')") && content.includes('aria-pressed') : content.includes('.project-grid{display:grid') && content.includes('prefers-reduced-motion:reduce'))
          : isPartnerPage
          ? path.endsWith('.json') ? isValidPartnerInventoryText(content) : content.includes("fetch('./inventory.json'") && content.includes('item.active === false') && content.includes("sendLink.href = 'https://wa.me/79640027222?text='")
          : isGodot
          ? content.length > 100000
          : path.startsWith('/games/null-shift/')
            ? path.endsWith('engine-3d.js')
              ? content.includes("getContext('webgl'") && content.includes('NULL_SHIFT_GET_SCENE_STATE') && content.includes('function cube(){') && content.includes('NULL_SHIFT_SCREEN_TO_WORLD') && content.includes('drawParticles') && content.includes('ANGLE_instanced_arrays') && content.includes('renderInstanced') && content.includes('gpuFrameStats.triangles') && content.includes('function updateAdaptiveResolution(') && content.includes('adaptiveScale') && content.includes('renderCost.toFixed(1)') && content.includes('lastStats=0') && content.includes('renderCost=0') && content.includes('function softShadow(') && content.includes('aVertexAlpha') && content.includes('G.shadow')
              : path.endsWith('.css')
                ? content.includes('.mobile-ui') && content.includes('prefers-reduced-motion') && content.includes('.engine-minimap')
                : content.includes('premiumAtmosphere') && content.includes('PerformanceObserver') && content.includes('premiumV05DrawMotion') && content.includes('premiumV05ArmAudio') && content.includes('premiumV05UpdateMotion') && content.includes('NULL_SHIFT_GET_SCENE_STATE')
            : path === '/games/signal-run/game.js'
                 ? content.includes("game:'signal-run'") && content.includes("function life(state,extra={})") && content.includes("life('ready',") && content.includes("life('completed',") && content.includes('dailyMode,dailyDate') && content.includes('osgard.signal-run.best.v1')
               : path === '/games/game-session-recommendations.js'
               ? content.includes("document.addEventListener('osgard:game-completed'") && content.includes("document.addEventListener('osgard:game-launching'") && content.includes('link.dataset.play=nextId')
             : path === '/games/game-session-recommendations.css'
               ? content.includes('.post-run-recommendations') && content.includes('prefers-reduced-motion:reduce')
             : path === '/games/invite/invite-landing.js'
               ? content.includes("const validGameIds = new Set(") && content.includes("name: 'referral_link_opened'") && content.includes("localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'") && content.includes("sessionStorage.setItem(marker, 'pending')") && content.includes("target.searchParams.set('utm_campaign', campaign)") && content.includes("rawAdaptiveContract.length <= 7000") && content.includes("candidate.schema === 'osgard.cascade-lab.mission-invite.v1'") && content.includes("candidate.version === '0.24.0'") && content.includes("target.searchParams.set('clmd', adaptiveContract)")
             : path === '/games/daily-circuit.js'
               ? content.includes('OSGARDDailyCircuitCore') && content.includes('navigator.share') && content.includes('daily_circuit')
             : path === '/games/daily-circuit.css'
               ? content.includes('.daily-circuit-grid') && content.includes('prefers-reduced-motion:reduce')
             : path === '/games/expedition/core.js'
               ? content.includes('window.OSGARDExpeditionCore') && content.includes('function advanceProgress(')
             : path === '/games/expedition/app.js'
               ? content.includes('function buildRoute(') && content.includes("track('expedition_route_created'")
             : path === '/games/expedition/catalog-runtime.js'
               ? content.includes("document.addEventListener('osgard:game-completed'") && content.includes("section.className='og-expedition-band'")
             : path === '/games/consented-analytics.js'
              ? content.includes('window.OSGARD_CONSENTED_ANALYTICS') && content.includes('analytics-pending.v1') && content.includes('analytics-consent.v1') && content.includes('referral_link_opened') && content.includes('game_session_completed') && content.includes('/v1/events') && content.includes('accepted')
             : path === '/games/player-lifecycle.js'
              ? content.includes('function startSession(') && content.includes('game_session_completed') && content.includes('osgard:game-lifecycle') && content.includes('event.source!==frame.contentWindow')
              : path === '/games/expedition/expedition.css'
              ? content.includes('.og-expedition-band') && content.includes('prefers-reduced-motion:reduce')
              : path === '/games/swarm/styles.css'
              ? compact.includes('--acid:#d9ff57') && compact.includes('.arena') && compact.includes('.playtest-feedback') && compact.includes('prefers-reduced-motion:reduce') && compact.includes('/skillcred/fonts/intervariable.woff2') && compact.includes('/skillcred/fonts/jetbrainsmono-regular.woff2') && !compact.includes('fonts.googleapis.com')
            : path === '/games/swarm/game.js'
              ? compact.includes("queryselector('#game')") && compact.includes('constroles=[') && compact.includes('functionnewgame(') && compact.includes('swarm-room-session') && compact.includes('restoreroomsession()') && compact.includes('recordinviteopen')
            : path.endsWith('.css')
              ? normalized.includes('--acid:#c8ff3d') && normalized.includes('/skillcred/fonts/intervariable.woff2') && normalized.includes('/skillcred/fonts/instrumentserif-italic.woff2') && normalized.includes('/skillcred/fonts/jetbrainsmono-regular.woff2') && (!expectCurrentDesign || (normalized.includes('--hero-size:clamp(88px,6vw,104px)') && normalized.replace(/["']/g, '').includes('.trust-spine[data-state=revoked]')))
              : path === '/games/cascade-lab/case-passport.js'
              ? content.includes("const VERSION='0.21.0'") && content.includes("SCHEMA='osgard.cascade-lab.case-passport.v1'") && content.includes('function verifyPassport(') && !content.includes('fetch(') && !content.includes('sendBeacon(')
            : path === '/games/cascade-lab/trajectory-xray.js'
              ? content.includes("const VERSION = '0.22.0'") && content.includes("const SCHEMA = 'osgard.cascade-lab.trajectory-xray.v1'") && content.includes('function trajectoryDeviation(') && !content.includes('fetch(') && !content.includes('sendBeacon(')
            : path === '/games/cascade-lab/mission-director.js'
              ? content.includes("const VERSION='0.24.0'") && content.includes("const SCHEMA='osgard.cascade-lab.mission-director.v1'") && content.includes('function buildRecommendations') && content.includes('function observeContract') && !content.includes('fetch(') && !content.includes('sendBeacon(') && !content.includes('.innerHTML') && content.includes("https://osgard.world/games/invite/cascade-lab/") && content.includes("host.OSGARDInvite.createLink('cascade-lab')") && !content.includes("https://osgard.world/games/cascade-lab/?clmd=") && content.includes("function notifyPortalShare") && content.includes("notifyPortalShare(result.url,'clipboard')")
            : path === '/games/cascade-lab/counterfactual-lab.js'
              ? content.includes("const VERSION = '0.27.0'") && content.includes("const SCHEMA = 'osgard.cascade-lab.counterfactual-lab.v1'") && content.includes('function analyzeSweep(') && !content.includes('fetch(') && !content.includes('XMLHttpRequest') && !content.includes('sendBeacon') && !content.includes('.innerHTML')
            : path === '/games/cascade-lab/evidence-integrity.js'
              ? /VERSION\s*=\s*['"]0\.25\.0['"]/.test(content) &&
                /SCHEMA\s*=\s*['"]osgard\.cascade-lab\.evidence-integrity\.v1['"]/.test(content) &&
                /ARCHIVE_SCHEMA\s*=\s*['"]osgard\.cascade-lab\.evidence-integrity-archive\.v1['"]/.test(content) &&
                !/\bfetch\s*\(/.test(content) && !/\bXMLHttpRequest\b/.test(content) &&
                !/\bsendBeacon\b/.test(content) && !/\.innerHTML\b/.test(content)
            : content.includes('demo/issue') && content.includes('data-clock-step')
      }
      return { path, status: asset.status, expectedType, contentType, typeOk, nonEmpty, ok: asset.status === 200 && typeOk && nonEmpty }
    }))
    const assetsOk = assetChecks.every(asset => asset.ok)
    const statusOk = route.startsWith('/api/v1/') ? [401, 403].includes(response.status) : route === '/commerce-api/v1/admin/game-catalog' ? [401, 403, 503].includes(response.status) : response.status === 200
    results.push({ device, route, status: response.status, ...(isGamesHub ? { build: { expected: expectedBuild ? expectedBuild.slice(0, 12) : null, actual: actualBuild || null, matches: expectedBuildMatches } } : {}), checks: { statusOk, shellOk, assetsOk }, assets: assetChecks, ok: statusOk && shellOk && assetsOk, durationMs: Date.now() - started })
  } catch (error) { results.push({ device, route, status: 0, ok: false, error: String(error), durationMs: Date.now() - started }) }
}
const failed = results.filter(item => !item.ok)
const failureDetails = summarizeRouteFailures(failed)
const report = { schema: 'osgard.production-route-matrix.v1', sourceRevision: expectedBuild || null, base, checkedAt: new Date().toISOString(), routes: results.length, failed: failed.length, status: failed.length ? 'failed' : 'ready', ...(failureDetails.length ? { failureDetails } : {}), results }
const reportPath = process.env.OSGARD_ROUTE_MATRIX_REPORT || 'production-route-matrix.json'
if (reportPath !== 'production-route-matrix.json' && (reportPath.includes('/') || reportPath.includes('\\') || !reportPath.endsWith('.json'))) {
  throw new Error('OSGARD_ROUTE_MATRIX_REPORT must be a root-level JSON filename')
}
await writeFile(reportPath, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 })
console.log(JSON.stringify({ schema: report.schema, sourceRevision: report.sourceRevision, routes: report.routes, failed: report.failed, status: report.status, reportPath }, null, 2))
if (failureDetails.length) {
  console.error('Production route matrix failure details:')
  console.error(JSON.stringify(failureDetails, null, 2))
}
if (failed.length) process.exitCode = 1
