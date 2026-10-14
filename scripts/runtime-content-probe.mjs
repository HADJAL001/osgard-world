import { pathToFileURL } from 'node:url'
import { resolve } from 'node:path'

const DEFAULT_TIMEOUT_MS = 10000

function parseAttributes(tag) {
  const attributes = new Map()
  const pattern = /([a-zA-Z_:][-a-zA-Z0-9_:.]*)\s*=\s*(["'])(.*?)\2/g
  for (const match of tag.matchAll(pattern)) attributes.set(match[1].toLowerCase(), match[3])
  return attributes
}

export function extractRuntimeBundleUrls(html, baseUrl) {
  const base = new URL(baseUrl)
  const urls = new Set()
  for (const match of String(html).matchAll(/<(script|link)\b[^>]*>/gi)) {
    const tagName = match[1].toLowerCase()
    const attributes = parseAttributes(match[0])
    const reference = tagName === 'script' ? attributes.get('src') : attributes.get('href')
    if (!reference || !/\.js(?:[?#]|$)/i.test(reference)) continue
    if (tagName === 'link') {
      const rel = (attributes.get('rel') || '').toLowerCase().split(/\s+/)
      const isScriptPreload = rel.includes('modulepreload') || (rel.includes('preload') && attributes.get('as') === 'script')
      if (!isScriptPreload) continue
    }
    let url
    try { url = new URL(reference, base) } catch { continue }
    if (!['http:', 'https:'].includes(url.protocol)) continue
    if (url.origin !== base.origin || url.username || url.password) continue
    urls.add(url.href)
  }
  return [...urls]
}

export function findRuntimeTermMatches({ html, assets, terms }) {
  const normalizedTerms = [...new Set(terms.map(term => String(term).trim()).filter(Boolean))]
  return normalizedTerms.map(term => {
    const needle = term.toLocaleLowerCase('en-US')
    const inHtml = String(html).toLocaleLowerCase('en-US').includes(needle)
    const inAssets = assets.filter(asset => asset.ok && asset.content.toLocaleLowerCase('en-US').includes(needle)).map(asset => asset.path)
    return { term, inHtml, inAssets, found: inHtml || inAssets.length > 0 }
  })
}

export async function probeRuntimeContent({ base = 'https://osgard.world', terms = ['OSGARD AI Academy', 'OSGARD WORLD'], requiredTerms = [], fetchImpl = fetch, timeoutMs = DEFAULT_TIMEOUT_MS } = {}) {
  const root = new URL(base)
  if (!['http:', 'https:'].includes(root.protocol) || root.username || root.password) {
    throw new Error('OSGARD_BASE_URL must be an HTTP(S) URL without embedded credentials')
  }
  root.pathname = '/'
  root.search = ''
  root.hash = ''

  const rootResponse = await fetchImpl(root.href, {
    headers: { accept: 'text/html' },
    redirect: 'follow',
    signal: AbortSignal.timeout(timeoutMs),
  })
  if (!rootResponse.ok) throw new Error('Homepage request failed: HTTP ' + rootResponse.status)
  const html = await rootResponse.text()
  const bundleUrls = extractRuntimeBundleUrls(html, root.href)
  if (bundleUrls.length === 0) throw new Error('No same-origin JavaScript bundles found in homepage HTML')

  const assets = await Promise.all(bundleUrls.map(async href => {
    try {
      const response = await fetchImpl(href, {
        headers: { accept: 'text/javascript, application/javascript, */*;q=0.1' },
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
      })
      if (!response.ok) {
        return { path: new URL(href).pathname, ok: false, status: response.status, contentType: response.headers?.get?.('content-type') || '', bytes: 0, content: '' }
      }
      const content = await response.text()
      return {
        path: new URL(href).pathname,
        ok: true,
        status: response.status,
        contentType: response.headers?.get?.('content-type') || '',
        bytes: Buffer.byteLength(content, 'utf8'),
        content,
      }
    } catch (error) {
      return { path: new URL(href).pathname, ok: false, status: 0, contentType: '', bytes: 0, content: '', error: error?.name || 'FetchError' }
    }
  }))
  const termMatches = findRuntimeTermMatches({ html, assets, terms })
  const assetErrors = assets.filter(asset => !asset.ok).map(({ path, status, error }) => ({ path, status, error }))
  const required = new Set(requiredTerms.map(term => String(term).trim()).filter(Boolean))
  const requiredMissing = termMatches.filter(match => required.has(match.term) && !match.found).map(match => match.term)
  const title = html.match(/<title\b[^>]*>([\s\S]*?)<\/title>/i)?.[1]?.replace(/\s+/g, ' ').trim() || null
  return {
    base: root.origin,
    title,
    bundleCount: assets.length,
    assets: assets.map(({ path, ok, status, contentType, bytes, error }) => ({ path, ok, status, contentType, bytes, ...(error ? { error } : {}) })),
    terms: termMatches,
    assetErrors,
    requiredMissing,
    status: assetErrors.length ? 'asset-errors' : requiredMissing.length ? 'required-term-missing' : 'complete',
  }
}

async function main() {
  const args = process.argv.slice(2)
  const terms = []
  const required = new Set((process.env.OSGARD_REQUIRED_RUNTIME_TERMS || '').split('|').map(value => value.trim()).filter(Boolean))
  for (const arg of args) {
    if (arg.startsWith('--require=')) required.add(arg.slice('--require='.length).trim())
    else if (arg.startsWith('--base=')) process.env.OSGARD_BASE_URL = arg.slice('--base='.length)
    else terms.push(arg)
  }
  const requestedTerms = terms.length ? terms : ['OSGARD AI Academy', 'OSGARD WORLD']
  const searchTerms = [...new Set([...requestedTerms, ...required])]
  const report = await probeRuntimeContent({
    base: process.env.OSGARD_BASE_URL || 'https://osgard.world',
    terms: searchTerms,
    requiredTerms: [...required],
  })
  console.log(JSON.stringify(report, null, 2))
  if (report.assetErrors.length || report.requiredMissing.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(JSON.stringify({ status: 'failed', message: error?.message || String(error) }))
    process.exitCode = 1
  })
}
