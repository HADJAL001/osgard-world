import assert from 'node:assert/strict'
import { checkProject, evaluatePromotionGate, extractMetaDescription, extractPageTitle, PROJECTS, runAudit } from './external-project-healthcheck.mjs'

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
assert.equal(good.destinationHostMatches, true)
assert.equal(good.promotionGate, 'manual_review_required', 'A reachable same-host HTTPS page still requires owner review before paid campaigns')
assert.ok(good.promotionReason.includes('Owner review'), 'The automated check must explain the manual-review boundary')
assert.equal(calls[0].options.method, 'GET')
assert.equal(calls[0].options.redirect, 'follow')
assert.ok(calls[0].options.signal, 'HTTP requests need an explicit timeout signal')

const forbidden = await checkProject(PROJECTS[1], { fetchImpl: fakeFetch, now: fixedNow })
assert.equal(forbidden.outcome, 'http_error')
assert.equal(forbidden.statusCode, 403)
assert.equal(forbidden.reachable, false)
assert.equal(forbidden.promotionGate, 'blocked_http_status')
const network = await checkProject(PROJECTS[2], { fetchImpl: fakeFetch, now: fixedNow })
assert.equal(network.outcome, 'network_error')
assert.equal(network.errorName, 'TypeError')
assert.equal(network.errorCode, 'ENOTFOUND')
assert.equal(network.attempts, 2)
assert.equal(network.promotionGate, 'blocked_no_response')
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
assert.equal(report.paidPromotionBlockedCount, 3, 'HTTP/network/timeouts must block promotion preflight')
assert.equal(report.paidPromotionReviewCount, 7, 'Reachable project homepages still require manual review')
assert.equal(report.paidPromotionEligibleCount, 0, 'An automated HTTP check must never auto-approve paid promotion')
assert.equal(report.schemaVersion, 2, 'The report schema must expose the promotion-gate semantics')
assert.ok(report.results.every(result => result.note.includes('HTTP homepage check only') || result.note.includes('does not by itself prove')))

// A bare-to-www alias is acceptable, but a subdomain or unrelated destination is not.
const responseFor = (url, status = 200) => ({
  status, url, redirected: true,
  headers: { get: name => name === 'content-type' ? 'text/html; charset=utf-8' : null },
  text: async () => '<html><head><title>Checked destination</title></head></html>',
})
const wwwAlias = await checkProject(PROJECTS[0], {
  fetchImpl: async () => responseFor('https://www.osgardbewworld.com/'),
  now: fixedNow,
})
assert.equal(wwwAlias.destinationHostMatches, true, 'The exact www alias should be treated as the same host family')
assert.equal(wwwAlias.promotionGate, 'manual_review_required')
const crossHost = await checkProject(PROJECTS[0], {
  fetchImpl: async () => responseFor('https://unrelated-example.test/landing'),
  now: fixedNow,
})
assert.equal(crossHost.outcome, 'reachable', 'Reachability remains distinct from destination integrity')
assert.equal(crossHost.destinationHostMatches, false)
assert.equal(crossHost.promotionGate, 'blocked_redirect_host_mismatch')
assert.ok(crossHost.promotionReason.includes('confirm domain ownership'))
const downgrade = await checkProject(PROJECTS[0], {
  fetchImpl: async () => responseFor('http://osgardbewworld.com/'),
  now: fixedNow,
})
assert.equal(downgrade.promotionGate, 'blocked_https_downgrade')
assert.equal(evaluatePromotionGate(PROJECTS[0].url, null, null).promotionGate, 'blocked_no_response')

console.log('PASS external project healthcheck: 10 URLs, bounded GET requests, HTML metadata, HTTP/network/timeout classification, redirect and HTTPS promotion gate, and manual-review policy.')
