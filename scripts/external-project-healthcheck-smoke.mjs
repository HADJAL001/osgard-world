import assert from 'node:assert/strict'
import { checkProject, extractMetaDescription, extractPageTitle, isSafePublicHttpsUrl, PROJECTS, runAudit } from './external-project-healthcheck.mjs'

assert.equal(PROJECTS.length, 10, 'The audit must include all ten owner-listed projects')
assert.equal(new Set(PROJECTS.map(project => project.id)).size, 10, 'Project IDs must be unique')
for (const project of PROJECTS) {
  const url = new URL(project.url)
  assert.equal(url.protocol, 'https:')
  assert.ok(url.hostname.includes('.'))
  assert.ok(project.intendedRole.length > 0)
}
assert.equal(extractPageTitle('<html><head><title> Example &amp; One </title></head></html>'), 'Example & One')
assert.equal(extractPageTitle('<html><head></head></html>'), null)
assert.equal(extractMetaDescription('<meta content="A &amp; B" name="description">'), 'A & B')
assert.equal(extractMetaDescription('<meta name="viewport" content="width=device-width">'), null)

const calls = []
const myosaAttempts = new Map()
const fakeFetch = async (url, options) => {
  calls.push({ url, options })
  if (url.includes('o2system')) {
    return {
      status: 403, url, redirected: false,
      headers: { get: name => name === 'content-type' ? 'text/html; charset=utf-8' : null },
      text: async () => '<title>Forbidden</title>',
    }
  }
  if (url.includes('senjorio')) throw Object.assign(new TypeError('simulated DNS failure'), { cause: Object.assign(new Error('getaddrinfo ENOTFOUND senjorio.com'), { code: 'ENOTFOUND' }) })
  if (url.includes('superday')) throw Object.assign(new Error('simulated timeout'), { name: 'TimeoutError' })
  if (url.includes('myosa')) { const count = (myosaAttempts.get(url) || 0) + 1; myosaAttempts.set(url, count); if (count === 1) return { status: 503, url, redirected: false, headers: { get: name => name === 'content-type' ? 'text/html' : null }, text: async () => '<title>Temporary outage</title>' } }
  return {
    status: 200, url, redirected: false,
    headers: { get: name => name === 'content-type' ? 'text/html; charset=utf-8' : null },
    text: async () => '<html><head><title>OSGARD Product</title><meta name="description" content="Test homepage"></head></html>',
  }
}
const fixedNow = () => new Date('2026-10-13T00:00:00.000Z')
const good = await checkProject(PROJECTS[0], { fetchImpl: fakeFetch, now: fixedNow })
assert.equal(good.outcome, 'reachable')
assert.equal(good.pageTitle, 'OSGARD Product')
assert.equal(good.metaDescription, 'Test homepage')
assert.equal(good.reachable, true)
assert.equal(calls[0].options.method, 'GET')
assert.equal(calls[0].options.redirect, 'manual')
assert.ok(calls[0].options.signal, 'HTTP requests need an explicit timeout signal')

assert.equal(isSafePublicHttpsUrl('https://public.example.com/'), true)
assert.equal(isSafePublicHttpsUrl('https://public.example.com./'), true, 'A trailing DNS dot should not make a public hostname fail validation')
assert.equal(isSafePublicHttpsUrl('https://service.internal./'), false, 'A trailing DNS dot must not bypass internal-host blocking')
let unsafeInitialCalls = 0
const unsafeInitial = await checkProject(
  { id: 'unsafe-target', name: 'Unsafe Target', url: 'https://127.0.0.1/' },
  { fetchImpl: async () => { unsafeInitialCalls += 1; throw new Error('must not be called') }, now: fixedNow },
)
assert.equal(unsafeInitial.outcome, 'unsafe_target')
assert.equal(unsafeInitial.blockedTargetHost, '127.0.0.1')
assert.equal(unsafeInitialCalls, 0, 'Configured unsafe targets must never reach fetch')

for (const url of [
  'http://public.example/',
  'https://127.0.0.1/',
  'https://127.1/',
  'https://[::1]/',
  'https://localhost/',
  'https://private.internal/',
  'https://public.example.com:8443/',
  'https://user:pass@public.example.com/',
]) assert.equal(isSafePublicHttpsUrl(url), false, 'Unsafe audit target must be rejected: ' + url)

const redirectResponse = (status, location = null, body = '<title>Redirecting</title>') => ({
  status,
  headers: { get: name => name === 'location' ? location : name === 'content-type' ? 'text/html; charset=utf-8' : null },
  body: { cancel: async () => {} },
  text: async () => body,
})
const finalResponse = (url, body = '<html><head><title>Canonical OSGARD</title><meta name="description" content="Canonical page"></head></html>') => ({
  status: 200,
  url,
  headers: { get: name => name === 'content-type' ? 'text/html; charset=utf-8' : null },
  text: async () => body,
})
const redirectCalls = []
const safeRedirectFetch = async (url, options) => {
  redirectCalls.push({ url, options })
  if (url === 'https://redirect.example.com/') return redirectResponse(301, 'https://www.redirect.example.com/home')
  return finalResponse(url)
}
const redirected = await checkProject(
  { id: 'redirect-test', name: 'Redirect Test', url: 'https://redirect.example.com/' },
  { fetchImpl: safeRedirectFetch, now: fixedNow },
)
assert.equal(redirected.outcome, 'reachable')
assert.equal(redirected.finalHost, 'www.redirect.example')
assert.equal(redirected.redirected, true)
assert.equal(redirected.redirectsFollowed, 1)
assert.equal(redirectCalls.length, 2, 'A safe same-domain HTTPS redirect should be followed once')
assert.ok(redirectCalls.every(call => call.options.redirect === 'manual'), 'Every hop must use manual redirect mode')

let unsafeTargetRequested = false
const blockedRedirect = await checkProject(
  { id: 'unsafe-redirect', name: 'Unsafe Redirect', url: 'https://safe.example.com/' },
  { fetchImpl: async (url) => {
    if (url !== 'https://safe.example.com/') unsafeTargetRequested = true
    return redirectResponse(302, 'http://127.0.0.1:4317/private')
  }, now: fixedNow },
)
assert.equal(blockedRedirect.outcome, 'unsafe_redirect')
assert.equal(blockedRedirect.reachable, false)
assert.equal(blockedRedirect.blockedRedirectHost, '127.0.0.1')
assert.equal(unsafeTargetRequested, false, 'A local redirect target must never be requested')

let crossDomainRequested = false
const crossDomain = await checkProject(
  { id: 'cross-domain', name: 'Cross Domain Redirect', url: 'https://owner.example.com/' },
  { fetchImpl: async url => {
    if (url !== 'https://owner.example.com/') crossDomainRequested = true
    return redirectResponse(302, 'https://unrelated.example.org/landing')
  }, now: fixedNow },
)
assert.equal(crossDomain.outcome, 'unsafe_redirect')
assert.equal(crossDomainRequested, false, 'A redirect outside the configured domain family must be flagged, not fetched')

const loop = await checkProject(
  { id: 'redirect-loop', name: 'Redirect Loop', url: 'https://loop.example.com/' },
  { fetchImpl: async () => redirectResponse(301, 'https://loop.example.com/'), now: fixedNow },
)
assert.equal(loop.outcome, 'redirect_loop')

let redirectHop = 0
const limited = await checkProject(
  { id: 'redirect-limit', name: 'Redirect Limit', url: 'https://hops.example.com/' },
  { fetchImpl: async url => {
    const host = new URL(url).hostname
    redirectHop += 1
    const n = host === 'hops.example.com' ? 0 : Number(host.startsWith('hop') ? host.slice(3).split('.')[0] : 0)
    return redirectResponse(302, 'https://hop' + (n + 1) + '.hops.example/')
  }, now: fixedNow },
)
assert.equal(limited.outcome, 'redirect_limit')
assert.equal(redirectHop, 6, 'The audit must stop after five followed redirects and not request hop six')

let bodyCancelled = false
let unboundedTextCalled = false
const largeHtml = new TextEncoder().encode('<html><head><title>Bounded response</title></head><body>' + 'x'.repeat(1024 * 1024 + 128) + '</body></html>')
let bodyRead = false
const oversizedResponse = {
  status: 200,
  headers: { get: name => name === 'content-type' ? 'text/html' : null },
  body: {
    getReader() {
      return {
        async read() {
          if (bodyRead) return { done: true }
          bodyRead = true
          return { done: false, value: largeHtml }
        },
        async cancel() { bodyCancelled = true },
        releaseLock() {},
      }
    },
  },
  async text() { unboundedTextCalled = true; return '' },
}
const bounded = await checkProject(
  { id: 'large-page', name: 'Large Page', url: 'https://large.example.com/' },
  { fetchImpl: async () => oversizedResponse, now: fixedNow },
)
assert.equal(bounded.pageTitle, 'Bounded response', 'Useful metadata should be parsed from the bounded prefix')
assert.equal(bounded.bodyTruncated, true, 'Oversized pages must be explicitly marked as truncated')
assert.ok(bounded.bodyBytesRead <= 1024 * 1024, 'The reader must never consume more than the configured body cap')
assert.equal(bodyCancelled, true, 'The remainder of an oversized response must be cancelled')
assert.equal(unboundedTextCalled, false, 'The streaming reader must avoid unbounded response.text()')


const forbidden = await checkProject(PROJECTS[1], { fetchImpl: fakeFetch, now: fixedNow })
assert.equal(forbidden.outcome, 'http_error')
assert.equal(forbidden.statusCode, 403)
assert.equal(forbidden.reachable, false)
const network = await checkProject(PROJECTS[2], { fetchImpl: fakeFetch, now: fixedNow })
assert.equal(network.outcome, 'network_error')
assert.equal(network.errorName, 'TypeError')
assert.equal(network.errorCode, 'ENOTFOUND')
assert.equal(network.attempts, 2)
assert.equal(calls.filter(call => call.url.includes('senjorio')).length, 2, 'A transient network error gets one retry')
const timeout = await checkProject(PROJECTS[3], { fetchImpl: fakeFetch, now: fixedNow })
assert.equal(timeout.outcome, 'timeout')
assert.equal(timeout.attempts, 2, 'A timeout gets one retry')

const report = await runAudit({ fetchImpl: fakeFetch, now: fixedNow })
assert.equal(report.projectCount, 10)
assert.equal(report.results.length, 10)
assert.equal(report.reachableCount, 7)
assert.equal(report.unavailableCount, 3)
assert.equal(report.outcomeCounts.reachable, 7)
assert.equal(report.outcomeCounts.http_error, 1)
assert.equal(report.outcomeCounts.network_error, 1)
assert.equal(report.outcomeCounts.timeout, 1)
assert.equal(report.results.find(result => result.id === 'senjorio').errorCode, 'ENOTFOUND')
assert.equal(report.results.find(result => result.id === 'senjorio').attempts, 2)
assert.equal(report.results.find(result => result.id === 'myosa').attempts, 2, 'A 5xx response gets one retry before classification')
assert.ok(report.results.every(result => result.note.includes('HTTP homepage check only') || result.note.includes('does not by itself prove')))

console.log('PASS external project healthcheck: 10 URL registry entries, safe manual HTTPS redirects, redirect loop/limit handling, bounded streaming reads, HTML metadata, and HTTP/network/timeout classification.')
