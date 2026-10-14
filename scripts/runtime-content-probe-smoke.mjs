import assert from 'node:assert/strict'
import { extractRuntimeBundleUrls, findRuntimeTermMatches, probeRuntimeContent } from './runtime-content-probe.mjs'

const base = 'https://example.test'
const html = '<!doctype html><html><head><title>OSGARD WORLD</title>' +
  '<script type="module" crossorigin src="/assets/index-a_12.js"></script>' +
  '<link rel="modulepreload" crossorigin href="/assets/react-x.js">' +
  '<link rel="modulepreload" crossorigin href="https://cdn.example.test/foreign.js">' +
  '<link rel="stylesheet" href="/assets/index.css">' +
  '</head><body><div id="root"><noscript>OSGARD WORLD</noscript></div></body></html>'

const extracted = extractRuntimeBundleUrls(html, base)
assert.deepEqual(extracted, ['https://example.test/assets/index-a_12.js', 'https://example.test/assets/react-x.js'])

const matching = findRuntimeTermMatches({
  html,
  assets: [{ path: '/assets/index-a_12.js', ok: true, content: 'const title="OSGARD AI Academy";' }],
  terms: ['OSGARD AI Academy', 'OSGARD WORLD'],
})
assert.equal(matching[0].found, true)
assert.equal(matching[0].inHtml, false, 'React-rendered text must be distinguished from the HTML shell')
assert.deepEqual(matching[0].inAssets, ['/assets/index-a_12.js'])
assert.equal(matching[1].inHtml, true)

const calls = []
const fakeFetch = async (url, options) => {
  calls.push({ url: String(url), options })
  if (String(url) === 'https://example.test/') {
    return { ok: true, status: 200, headers: { get: () => 'text/html' }, text: async () => html }
  }
  if (String(url) === 'https://example.test/assets/index-a_12.js') {
    return { ok: true, status: 200, headers: { get: () => 'text/javascript' }, text: async () => 'const product="OSGARD AI Academy";' }
  }
  if (String(url) === 'https://example.test/assets/react-x.js') {
    return { ok: true, status: 200, headers: { get: () => 'text/javascript' }, text: async () => 'React runtime' }
  }
  throw new Error('Cross-origin or unexpected fetch: ' + url)
}
const report = await probeRuntimeContent({
  base,
  terms: ['OSGARD AI Academy', 'Missing phrase'],
  requiredTerms: ['Missing phrase'],
  fetchImpl: fakeFetch,
})
assert.equal(report.status, 'required-term-missing')
assert.equal(report.bundleCount, 2)
assert.equal(report.terms[0].inHtml, false)
assert.deepEqual(report.terms[0].inAssets, ['/assets/index-a_12.js'])
assert.equal(report.terms[1].found, false)
assert.deepEqual(report.requiredMissing, ['Missing phrase'])
assert.equal(calls.length, 3)
assert.ok(calls.every(call => call.options.redirect === 'follow'))
assert.ok(calls.every(call => call.options.signal), 'Every request must have an explicit timeout')

const failedAssetReport = await probeRuntimeContent({
  base,
  terms: ['Anything'],
  fetchImpl: async url => String(url) === 'https://example.test/'
    ? { ok: true, status: 200, headers: { get: () => 'text/html' }, text: async () => html }
    : { ok: false, status: 404, headers: { get: () => 'text/javascript' }, text: async () => '' },
})
assert.equal(failedAssetReport.status, 'asset-errors')
assert.equal(failedAssetReport.assetErrors.length, 2)
console.log('PASS runtime content probe: shell-vs-bundle matching, same-origin-only fetches, hashed asset discovery, timeouts, missing terms, and asset HTTP failures.')
