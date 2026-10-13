import assert from 'node:assert/strict'
import { checkProject, extractMetaDescription, extractPageTitle, PROJECTS, runAudit } from './external-project-healthcheck.mjs'

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
assert.equal(calls[0].options.redirect, 'follow')
assert.ok(calls[0].options.signal, 'HTTP requests need an explicit timeout signal')

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

let oversizedStreamCancelled = false
const oversizedFetch = async url => new Response(new ReadableStream({
  pull(controller) { controller.enqueue(new Uint8Array(80).fill(65)) },
  cancel() { oversizedStreamCancelled = true },
}), { status: 200, headers: { 'content-type': 'text/html; charset=utf-8' } })
const oversized = await checkProject(PROJECTS[0], {
  fetchImpl: oversizedFetch,
  now: fixedNow,
  maxAttempts: 1,
  maxResponseBytes: 128,
})
assert.equal(oversized.outcome, 'reachable_body_too_large', 'A large 2xx response is still reachable, not an outage')
assert.equal(oversized.statusCode, 200)
assert.equal(oversized.reachable, true)
assert.equal(oversized.bodyTooLarge, true)
assert.equal(oversized.bodyLimitBytes, 128)
assert.ok(oversized.bodyBytesRead > 128, 'The reader should detect crossing the cap without buffering the full body')
assert.equal(oversized.pageTitle, null, 'Oversized pages must not be parsed')
assert.equal(oversizedStreamCancelled, true, 'The oversized response stream must be cancelled after crossing the byte cap')

const oversizedError = await checkProject(PROJECTS[1], {
  fetchImpl: async () => new Response(new ReadableStream({
    pull(controller) { controller.enqueue(new Uint8Array(80).fill(66)) },
  }), { status: 503, headers: { 'content-type': 'text/html' } }),
  now: fixedNow,
  maxAttempts: 1,
  maxResponseBytes: 128,
})
assert.equal(oversizedError.outcome, 'http_error', 'An oversized HTTP error must remain classified as an HTTP error')
assert.equal(oversizedError.statusCode, 503)
assert.equal(oversizedError.reachable, false)
assert.equal(oversizedError.bodyTooLarge, true)

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

console.log('PASS external project healthcheck: 10 URL registry entries, bounded streaming reads, size-safe classification, HTML metadata, HTTP/network/timeout handling, and report boundaries.')
