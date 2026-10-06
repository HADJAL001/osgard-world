const base = process.env.OSGARD_BASE_URL || 'https://osgard.world'
const routes = ['/','/entertainment','/community','/stream','/archive','/profile','/r/1842','/games/time','/play/swarm','/play/null-shift','/play/inherit','/play/remix','/media','/business','/create','/mobility']
const agents = { desktop: 'OSGARD-Route-Matrix/1.0 Desktop', mobile: 'OSGARD-Route-Matrix/1.0 Mobile' }
const results = []
for (const [device, userAgent] of Object.entries(agents)) for (const route of routes) {
  const started = Date.now()
  try {
    const response = await fetch(new URL(route, base), { headers: { 'user-agent': userAgent } })
    const text = await response.text()
    const shellOk = route === '/entertainment' ? text.includes('<title>OSGARD Entertainment</title>') : text.includes('<div id="root">')
    const gameHrefs = route === '/entertainment' ? [...new Set([...text.matchAll(/href=["'](\/games\/[^"']+)["']/g)].map(match => match[1]))] : []
    const gameLinkChecks = await Promise.all(gameHrefs.map(async path => {
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const target = await fetch(new URL(path, base), { headers: { 'user-agent': userAgent } })
          if (target.status === 200 || attempt === 3) return { path, status: target.status, attempts: attempt, ok: target.status === 200 }
        } catch (error) {
          if (attempt === 3) return { path, status: 0, attempts: attempt, ok: false, error: String(error) }
        }
        await new Promise(resolve => setTimeout(resolve, 200 * attempt))
      }
    }))
    const cardCount = route === '/entertainment' ? [...text.matchAll(/class=["'][^"']*\bcard\b/g)].length : 0
    const gameLinksOk = route !== '/entertainment' || (gameHrefs.length === 5 && cardCount === 5 && gameLinkChecks.every(link => link.ok))
    const entertainmentCatalogOk = route === '/entertainment'
      ? [...text.matchAll(/href=["']\/games\//g)].length === 5 && [...text.matchAll(/class=["'][^"']*\bcard\b/g)].length === 5 && !text.includes('РљР')
      : true
    const assetPaths = route === '/entertainment' ? [] : [...text.matchAll(/<(?:script|link)\b[^>]*(?:src|href)=["']([^"']+\.(?:js|css)(?:\?[^"']*)?)["'][^>]*>/gi)].map(match => match[1]).filter(path => path.startsWith('/'))
    const assetChecks = await Promise.all(assetPaths.map(async path => {
      const expectedType = path.includes('.css') ? 'text/css' : 'javascript'
      for (let attempt = 1; attempt <= 3; attempt++) {
        try {
          const asset = await fetch(new URL(path, base), { headers: { 'user-agent': userAgent } })
          const contentType = asset.headers.get('content-type') || ''
          const typeOk = expectedType === 'text/css' ? contentType.toLowerCase().includes('text/css') : /javascript|ecmascript/i.test(contentType)
          return { path, status: asset.status, contentType, attempts: attempt, ok: asset.status === 200 && typeOk }
        } catch (error) {
          if (attempt === 3) return { path, status: 0, attempts: attempt, ok: false, error: String(error) }
          await new Promise(resolve => setTimeout(resolve, 200 * attempt))
        }
      }
    }))
    const assetsOk = assetChecks.every(asset => asset.ok)
    results.push({ device, route, status: response.status, assets: assetChecks, catalog: route === '/entertainment' ? { gameLinks: gameHrefs.length, cards: cardCount, links: gameLinkChecks, ok: entertainmentCatalogOk && gameLinksOk } : undefined, ok: response.status === 200 && shellOk && assetsOk && entertainmentCatalogOk && gameLinksOk, durationMs: Date.now() - started })
  } catch (error) { results.push({ device, route, status: 0, ok: false, error: String(error), durationMs: Date.now() - started }) }
}
const failed = results.filter(item => !item.ok)
const report = { base, checkedAt: new Date().toISOString(), routes: results.length, failed: failed.length, status: failed.length ? 'failed' : 'ready', results }
console.log(JSON.stringify(report, null, 2))
if (failed.length) process.exitCode = 1
