const base = process.env.OSGARD_BASE_URL || 'https://osgard.world'
const expectCurrentDesign = process.env.SKILLCRED_EXPECT_CURRENT_DESIGN === '1'
const routes = ['/','/skillcred/','/skillcred-api/health','/skillcred-api/ready','/skillcred-api/issuer','/entertainment','/games/','/games/index.html','/games/favicon.svg','/privacy/','/terms/','/community','/stream','/archive','/profile','/r/1842','/games/time','/games/null-shift/','/games/null-shift/index.html','/games/null-shift-godot/','/games/null-shift-godot/index.html','/play/swarm','/play/null-shift','/play/inherit','/play/remix','/media','/business','/create','/mobility']
const agents = { desktop: 'OSGARD-Route-Matrix/1.1 Desktop', mobile: 'OSGARD-Route-Matrix/1.1 Mobile' }
const results = []
for (const [device, userAgent] of Object.entries(agents)) for (const route of routes) {
  const started = Date.now()
  try {
    const response = await fetch(new URL(route, base), { headers: { 'user-agent': userAgent } })
    const text = await response.text()
    const shellOk = route === '/skillcred/'
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
        : route === '/games/favicon.svg'
          ? text.includes('<svg') && text.includes('viewBox="0 0 64 64"')
        : route === '/privacy/'
          ? text.includes('<title>Конфиденциальность OSGARD PLAY</title>') && text.includes('osgard.games.analytics-consent.v1')
        : route === '/terms/'
          ? text.includes('<title>Условия использования OSGARD PLAY</title>') && text.includes('прототип')
        : (route === '/games/' || route === '/games/index.html')
          ? text.includes('id="games-grid"') && text.includes('data-game="null-shift"') && text.includes('data-game="time"') && text.includes('data-game="swarm"') && text.includes('data-game="inherit"') && text.includes('data-game="remix"') && text.includes('id="player-dialog"') && text.includes('id="player-share"') && text.includes('id="player-retry"') && text.includes('id="player-session-clock"') && text.includes('player-lifecycle.js') && text.includes('id="project-form"') && text.includes('id="analytics-toggle"') && text.includes('osgardvanguard.studio')
        : route.startsWith('/games/null-shift-godot')
          ? /<canvas/i.test(text) && /godot/i.test(text) && text.includes('index.wasm') && text.includes('index.pck') &&
            text.includes('data-nullshift-shell="premium-v1"') &&
            text.includes('Engine.isWebGLAvailable(2)') &&
            text.includes('onProgress') &&
            text.includes('НАЧАТЬ ОПЕРАЦИЮ') && text.includes('osgard:game-lifecycle')
          : route.startsWith('/games/null-shift')
            ? text.includes('id="game"') && text.includes('id="mobile-ui"') && text.includes('id="diag-panel"') && text.includes('id="sound-toggle"') && text.includes('id="touch-sound"') && text.includes('./styles.css') && text.includes('./game.js') && text.includes('./engine-3d.js') && text.includes('id="engine-toggle"') && text.includes('id="touch-engine"') && text.includes('id="godot-preview"')
          : route === '/entertainment'
            ? text.includes('<title>OSGARD Entertainment</title>')
            : text.includes('<div id="root">')
    const isGamesHub = route === '/games/' || route === '/games/index.html'
    const isGodot = route.startsWith('/games/null-shift-godot')
    const assetPaths = route === '/games/favicon.svg' || route === '/privacy/' || route === '/terms/' ? [] : isGamesHub ? ['/games/player-lifecycle.js'] : route === '/skillcred/' ? ['/skillcred/styles.css', '/skillcred/app.js', '/skillcred/fonts/InterVariable.woff2', '/skillcred/fonts/InstrumentSerif-Italic.woff2', '/skillcred/fonts/JetBrainsMono-Regular.woff2'] : isGodot ? ['/games/null-shift-godot/index.js', '/games/null-shift-godot/index.wasm', '/games/null-shift-godot/index.pck'] : route.startsWith('/games/null-shift') ? ['/games/null-shift/styles.css', '/games/null-shift/game.js', '/games/null-shift/engine-3d.js'] : []
    const assetChecks = await Promise.all(assetPaths.map(async path => {
      const expectedType = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'javascript' : path.endsWith('.wasm') ? 'wasm' : path.endsWith('.pck') ? 'pack' : 'font'
      const asset = await fetch(new URL(path, base), { headers: { 'user-agent': userAgent } })
      const contentType = asset.headers.get('content-type') || ''
      const mime = contentType.toLowerCase()
      const typeOk = expectedType === 'text/css' ? mime.includes('text/css') : expectedType === 'javascript' ? mime.includes('javascript') || mime.includes('ecmascript') : expectedType === 'wasm' ? mime.includes('wasm') || mime.includes('octet-stream') : expectedType === 'pack' ? mime.length > 0 : mime.includes('font/woff2') || mime.includes('application/octet-stream')
      let nonEmpty = false
      if (expectedType === 'font' || expectedType === 'wasm' || expectedType === 'pack') {
        const size = (await asset.arrayBuffer()).byteLength
        const minimum = expectedType === 'font' ? (path.endsWith('InterVariable.woff2') ? 100000 : 5000) : expectedType === 'wasm' ? 100000 : 10000
        nonEmpty = size > minimum
      } else {
        const content = await asset.text()
        const normalized = content.toLowerCase()
        nonEmpty = isGodot
          ? content.length > 100000
          : path.startsWith('/games/null-shift/')
            ? path.endsWith('engine-3d.js')
              ? content.includes("getContext('webgl'") && content.includes('NULL_SHIFT_GET_SCENE_STATE') && content.includes('function cube(){') && content.includes('NULL_SHIFT_SCREEN_TO_WORLD') && content.includes('drawParticles') && content.includes('ANGLE_instanced_arrays') && content.includes('renderInstanced') && content.includes('gpuFrameStats.triangles') && content.includes('function updateAdaptiveResolution(') && content.includes('adaptiveScale') && content.includes('renderCost.toFixed(1)') && content.includes('lastStats=0') && content.includes('renderCost=0') && content.includes('function softShadow(') && content.includes('aVertexAlpha') && content.includes('G.shadow')
              : path.endsWith('.css')
                ? content.includes('.mobile-ui') && content.includes('prefers-reduced-motion') && content.includes('.engine-minimap')
                : content.includes('premiumAtmosphere') && content.includes('PerformanceObserver') && content.includes('premiumV05DrawMotion') && content.includes('premiumV05ArmAudio') && content.includes('premiumV05UpdateMotion') && content.includes('NULL_SHIFT_GET_SCENE_STATE')
            : path === '/games/player-lifecycle.js'
              ? content.includes('function markSessionStarted(') && content.includes('game_session_completed') && content.includes('osgard:game-lifecycle') && content.includes('event.source!==frame.contentWindow')
              : path.endsWith('.css')
              ? normalized.includes('--acid:#c8ff3d') && normalized.includes('/skillcred/fonts/intervariable.woff2') && normalized.includes('/skillcred/fonts/instrumentserif-italic.woff2') && normalized.includes('/skillcred/fonts/jetbrainsmono-regular.woff2') && (!expectCurrentDesign || (normalized.includes('--hero-size:clamp(88px,6vw,104px)') && normalized.replace(/["']/g, '').includes('.trust-spine[data-state=revoked]')))
              : content.includes('demo/issue') && content.includes('data-clock-step')
      }
      return { path, status: asset.status, contentType, ok: asset.status === 200 && typeOk && nonEmpty }
    }))
    const assetsOk = assetChecks.every(asset => asset.ok)
    results.push({ device, route, status: response.status, assets: assetChecks, ok: response.status === 200 && shellOk && assetsOk, durationMs: Date.now() - started })
  } catch (error) { results.push({ device, route, status: 0, ok: false, error: String(error), durationMs: Date.now() - started }) }
}
const failed = results.filter(item => !item.ok)
const report = { base, checkedAt: new Date().toISOString(), routes: results.length, failed: failed.length, status: failed.length ? 'failed' : 'ready', results }
console.log(JSON.stringify(report, null, 2))
if (failed.length) process.exitCode = 1
