const base = process.env.OSGARD_BASE_URL || 'https://osgard.world'
const routes = ['/','/skillcred/','/skillcred-api/health','/skillcred-api/ready','/skillcred-api/issuer','/entertainment','/community','/stream','/archive','/profile','/r/1842','/games/time','/play/swarm','/play/null-shift','/play/inherit','/play/remix','/media','/business','/create','/mobility']
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
        text.includes('id="trustSpine"') &&
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
        : route === '/entertainment'
          ? text.includes('<title>OSGARD Entertainment</title>')
          : text.includes('<div id="root">')
    const assetPaths = route === '/skillcred/' ? ['/skillcred/styles.css', '/skillcred/app.js', '/skillcred/fonts/InterVariable.woff2', '/skillcred/fonts/InstrumentSerif-Italic.woff2', '/skillcred/fonts/JetBrainsMono-Regular.woff2'] : []
    const assetChecks = await Promise.all(assetPaths.map(async path => {
      const expectedType = path.endsWith('.css') ? 'text/css' : path.endsWith('.js') ? 'javascript' : 'font'
      const asset = await fetch(new URL(path, base), { headers: { 'user-agent': userAgent } })
      const contentType = asset.headers.get('content-type') || ''
      const typeOk = expectedType === 'text/css' ? contentType.toLowerCase().includes('text/css') : expectedType === 'javascript' ? /javascript|ecmascript/i.test(contentType) : /font\/woff2|application\/octet-stream/i.test(contentType)
      let nonEmpty = false
      if (expectedType === 'font') {
        const size = (await asset.arrayBuffer()).byteLength
        const minimum = path.endsWith('InterVariable.woff2') ? 100000 : 5000
        nonEmpty = size > minimum
      } else {
        const content = await asset.text()
        const normalized = content.toLowerCase()
        nonEmpty = path.endsWith('.css')
          ? normalized.includes('--acid:#c8ff3d') && normalized.includes('--hero-size:clamp(80px,5.8vw,92px)') && normalized.includes('.trust-spine[data-state=\\"revoked\\"]') && normalized.includes('/skillcred/fonts/intervariable.woff2') && normalized.includes('/skillcred/fonts/instrumentserif-italic.woff2') && normalized.includes('/skillcred/fonts/jetbrainsmono-regular.woff2')
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
