import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'
import { isIP } from 'node:net'

export const PROJECTS = [
  { id: 'osgardbewworld', name: 'OSGARD BEW WORLD', url: 'https://osgardbewworld.com/', intendedRole: 'Создание проектов и приложений' },
  { id: 'o2system', name: 'O2System', url: 'https://o2system.art/', intendedRole: 'Система учёта кассы обменников' },
  { id: 'senjorio', name: 'Senjorio', url: 'https://senjorio.com/', intendedRole: 'Премиальное такси' },
  { id: 'superday', name: 'Superday', url: 'https://superday.run/', intendedRole: 'Умная карта и планировщик дня' },
  { id: 'marcosa', name: 'Marcosa', url: 'https://marcosa.club/', intendedRole: 'Социальная сеть нового поколения' },
  { id: 'myosa', name: 'Myosa', url: 'https://myosa.world/', intendedRole: 'Платформа искусственного интеллекта' },
  { id: 'gold-glamour', name: 'Gold Glamour', url: 'https://gold-glamour.online/', intendedRole: 'Премиальные услуги с золотом и выездным обслуживанием' },
  { id: 'gardvpn', name: 'GardVPN', url: 'https://gardvpn.is/', intendedRole: 'VPN-сервис' },
  { id: 'osgardos', name: 'OSGARD OS', url: 'https://osgardos.com/', intendedRole: 'Развитие бизнеса' },
  { id: 'osgardvanguard', name: 'OSGARD Vanguard Studio', url: 'https://osgardvanguard.studio/', intendedRole: 'Создание видео' },
]

const USER_AGENT = 'OSGARD-External-Project-Health/1.0 (+https://osgard.world/games/)'
const MAX_ERROR_LENGTH = 240
const MAX_REDIRECTS = 5
const MAX_BODY_BYTES = 1024 * 1024
const REDIRECT_STATUSES = new Set([301, 302, 303, 307, 308])

function htmlText(value) {
  return String(value || '')
    .replace(/<script\b[^>]*>[\s\S]*?<\/script>/gi, ' ')
    .replace(/<style\b[^>]*>[\s\S]*?<\/style>/gi, ' ')
    .replace(/<[^>]*>/g, ' ')
    .replace(/&amp;/gi, '&')
    .replace(/&quot;/gi, '"')
    .replace(/&#39;|&apos;/gi, "'")
    .replace(/&lt;/gi, '<')
    .replace(/&gt;/gi, '>')
    .replace(/\s+/g, ' ')
    .trim()
}

export function extractPageTitle(html) {
  const match = String(html || '').match(/<title\b[^>]*>([\s\S]*?)<\/title\s*>/i)
  return match ? htmlText(match[1]).slice(0, 240) : null
}

export function extractMetaDescription(html) {
  const tags = String(html || '').match(/<meta\b[^>]*>/gi) || []
  for (const tag of tags) {
    if (!/\bname\s*=\s*["']description["']/i.test(tag)) continue
    const content = tag.match(/\bcontent\s*=\s*(["'])([\s\S]*?)\1/i)
    if (content) return htmlText(content[2]).slice(0, 400) || null
  }
  return null
}

function responseHeader(response, name) {
  try { return response.headers?.get(name) || '' } catch { return '' }
}

function classifyHttp(status, isHtml, title) {
  if (status < 200 || status >= 400) return 'http_error'
  if (!isHtml) return 'reachable_non_html'
  if (!title) return 'reachable_no_title'
  return 'reachable'
}


/**
 * Redirect destinations are fetched by a scheduled CI job. Only public HTTPS
 * hostnames are allowed; literal IPs, credentials, non-standard ports, and
 * local/special-use hostnames are rejected before another network request.
 */
function isWithinConfiguredHostFamily(candidate, configuredHost) {
  const candidateHost = String(candidate || '').toLowerCase().replace(/\\.$/, '')
  const baseHost = String(configuredHost || '').toLowerCase().replace(/\\.$/, '')
  return Boolean(candidateHost && baseHost && (candidateHost === baseHost || candidateHost.endsWith('.' + baseHost)))
}

export function isSafePublicHttpsUrl(value) {
  let url
  try { url = new URL(value) } catch { return false }
  if (url.protocol !== 'https:' || url.username || url.password) return false
  if (url.port && url.port !== '443') return false

  const hostname = url.hostname.toLowerCase().replace(/\\.$/, '')
  const ipHost = hostname.startsWith('[') && hostname.endsWith(']')
    ? hostname.slice(1, -1)
    : hostname
  if (!hostname || isIP(ipHost) !== 0 || !hostname.includes('.')) return false

  const deniedSuffixes = [
    '.localhost', '.local', '.internal', '.test', '.example', '.invalid',
    '.onion', '.home', '.lan', '.corp', '.arpa',
  ]
  if (hostname === 'localhost' || deniedSuffixes.some(suffix => hostname.endsWith(suffix))) return false
  return true
}

async function cancelResponseBody(response) {
  try {
    if (typeof response.body?.cancel === 'function') await response.body.cancel()
  } catch {}
}

async function readBoundedBody(response, maxBytes = MAX_BODY_BYTES) {
  const reader = typeof response.body?.getReader === 'function'
    ? response.body.getReader()
    : null

  if (!reader) {
    const text = typeof response.text === 'function' ? await response.text() : ''
    const bytes = new TextEncoder().encode(text)
    if (bytes.byteLength <= maxBytes) return { text, truncated: false, bytesRead: bytes.byteLength }
    const bounded = bytes.subarray(0, maxBytes)
    return { text: new TextDecoder().decode(bounded), truncated: true, bytesRead: bounded.byteLength }
  }

  const decoder = new TextDecoder()
  let text = ''
  let bytesRead = 0
  let truncated = false
  try {
    while (true) {
      const result = await reader.read()
      if (result.done) break
      const chunk = result.value instanceof Uint8Array ? result.value : new Uint8Array(result.value)
      const remaining = Math.max(0, maxBytes - bytesRead)
      if (chunk.byteLength > remaining) {
        if (remaining > 0) {
          text += decoder.decode(chunk.subarray(0, remaining), { stream: true })
          bytesRead += remaining
        }
        truncated = true
        try { await reader.cancel() } catch {}
        break
      }
      text += decoder.decode(chunk, { stream: true })
      bytesRead += chunk.byteLength
    }
    text += decoder.decode()
  } finally {
    try { reader.releaseLock() } catch {}
  }
  return { text, truncated, bytesRead }
}

function redirectFailure(project, {
  outcome, currentUrl, statusCode, started, checkedAt, attempt, blockedHost = null, note,
}) {
  return {
    id: project.id,
    name: project.name,
    intendedRole: project.intendedRole,
    requestedUrl: project.url,
    finalUrl: currentUrl ? currentUrl.href : null,
    finalHost: currentUrl ? currentUrl.hostname : null,
    redirected: statusCode !== null,
    statusCode,
    contentType: null,
    pageTitle: null,
    metaDescription: null,
    bodyTruncated: false,
    outcome,
    reachable: false,
    responseMs: Math.max(0, Date.now() - started),
    attempts: attempt,
    checkedAt,
    ...(blockedHost ? { blockedRedirectHost: blockedHost } : {}),
    note,
  }
}

export async function checkProject(project, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000,
  maxAttempts = 2,
  retryDelayMs = 250,
  now = () => new Date(),
} = {}) {
  const started = Date.now()
  const checkedAt = now().toISOString()

  if (!isSafePublicHttpsUrl(project.url)) {
    let initialUrl = null
    try { initialUrl = new URL(project.url) } catch {}
    return redirectFailure(project, {
      outcome: 'unsafe_target',
      currentUrl: null,
      statusCode: null,
      started,
      checkedAt,
      attempt: 0,
      blockedHost: initialUrl?.hostname || null,
      note: 'Request was not sent because the configured target is not a public HTTPS hostname.',
    })
  }

  const attemptsLimit = Math.max(1, Math.floor(Number(maxAttempts) || 1))
  for (let attempt = 1; attempt <= attemptsLimit; attempt++) {
    try {
      const deadlineAt = Date.now() + Math.max(1, Number(timeoutMs) || 12000)
      let currentUrl = new URL(project.url)
      const visitedUrls = new Set([currentUrl.href])
      let redirectsFollowed = 0
      let response

      while (true) {
        const remainingMs = Math.max(1, deadlineAt - Date.now())
        response = await fetchImpl(currentUrl.href, {
          method: 'GET',
          // Do not let fetch follow an untrusted Location automatically. Each
          // hop is validated before the healthcheck runner makes another request.
          redirect: 'manual',
          signal: AbortSignal.timeout(remainingMs),
          headers: {
            accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
            'user-agent': USER_AGENT,
          },
        })

        if (!REDIRECT_STATUSES.has(response.status)) break

        const location = responseHeader(response, 'location')
        if (!location) {
          await cancelResponseBody(response)
          return redirectFailure(project, {
            outcome: 'redirect_missing_location', currentUrl, statusCode: response.status,
            started, checkedAt, attempt,
            note: 'The homepage returned a redirect without a Location header; the destination was not inferred.',
          })
        }

        let destination
        try {
          destination = new URL(location, currentUrl)
          destination.hash = ''
        } catch {}

        if (!destination || !isSafePublicHttpsUrl(destination.href) || !isWithinConfiguredHostFamily(destination.hostname, new URL(project.url).hostname)) {
          let blockedHost = null
          try { blockedHost = destination?.hostname || new URL(location, currentUrl).hostname } catch {}
          await cancelResponseBody(response)
          return redirectFailure(project, {
            outcome: 'unsafe_redirect', currentUrl, statusCode: response.status,
            started, checkedAt, attempt, blockedHost,
            note: 'Redirect destination was not requested because it is not a public HTTPS hostname on an allowed port and the original project host family is the only allowed redirect scope.',
          })
        }

        if (visitedUrls.has(destination.href)) {
          await cancelResponseBody(response)
          return redirectFailure(project, {
            outcome: 'redirect_loop', currentUrl, statusCode: response.status,
            started, checkedAt, attempt,
            note: 'Redirect loop detected; no further request was sent.',
          })
        }

        if (redirectsFollowed >= MAX_REDIRECTS) {
          await cancelResponseBody(response)
          return redirectFailure(project, {
            outcome: 'redirect_limit', currentUrl, statusCode: response.status,
            started, checkedAt, attempt,
            note: 'Redirect limit reached; no further request was sent.',
          })
        }

        await cancelResponseBody(response)
        redirectsFollowed += 1
        visitedUrls.add(destination.href)
        currentUrl = destination
      }

      if (response.status >= 500 && attempt < attemptsLimit) {
        await cancelResponseBody(response)
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
        continue
      }

      const contentType = responseHeader(response, 'content-type').split(';')[0].trim().toLowerCase()
      const { text: body, truncated: bodyTruncated, bytesRead } = await readBoundedBody(response)
      const isHtml = contentType === 'text/html' || contentType === 'application/xhtml+xml'
      const title = isHtml ? extractPageTitle(body) : null
      const finalUrl = currentUrl.href
      const outcome = classifyHttp(response.status, isHtml, title)
      return {
        id: project.id,
        name: project.name,
        intendedRole: project.intendedRole,
        requestedUrl: project.url,
        finalUrl,
        finalHost: currentUrl.hostname,
        redirected: redirectsFollowed > 0,
        statusCode: response.status,
        contentType: contentType || null,
        pageTitle: title,
        metaDescription: isHtml ? extractMetaDescription(body) : null,
        bodyTruncated,
        bodyBytesRead: bytesRead,
        outcome,
        reachable: response.status >= 200 && response.status < 400,
        responseMs: Math.max(0, Date.now() - started),
        attempts: attempt,
        redirectsFollowed,
        checkedAt,
        note: 'HTTP homepage check only; it does not confirm product features, login, API, checkout, or service reliability.',
      }
    } catch (error) {
      const name = error && typeof error.name === 'string' ? error.name : 'Error'
      if (attempt < attemptsLimit && (name === 'TypeError' || name === 'TimeoutError' || name === 'AbortError')) {
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
        continue
      }
      const message = String(error && error.message ? error.message : error).slice(0, MAX_ERROR_LENGTH)
      const cause = error && error.cause ? error.cause : null
      const causeMessage = cause && (cause.message || cause.code) ? String(cause.message || cause.code).slice(0, MAX_ERROR_LENGTH) : null
      const errorCode = cause && typeof cause.code === 'string' ? cause.code : null
      const outcome = name === 'TimeoutError' || name === 'AbortError' ? 'timeout' : 'network_error'
      return {
        id: project.id,
        name: project.name,
        intendedRole: project.intendedRole,
        requestedUrl: project.url,
        finalUrl: null,
        finalHost: null,
        redirected: false,
        statusCode: null,
        contentType: null,
        pageTitle: null,
        metaDescription: null,
        bodyTruncated: false,
        outcome,
        reachable: false,
        responseMs: Math.max(0, Date.now() - started),
        attempts: attempt,
        checkedAt,
        errorName: name,
        errorCode,
        errorCause: causeMessage,
        error: message,
        note: 'No response received; this does not by itself prove that the product is down for every visitor.',
      }
    }
  }
  throw new Error('Healthcheck completed without a response or classified error.')
}

export async function runAudit({
  projects = PROJECTS,
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000,
  now = () => new Date(),
} = {}) {
  const checkedAt = now().toISOString()
  const results = await Promise.all(projects.map(project => checkProject(project, { fetchImpl, timeoutMs, now })))
  const outcomeCounts = results.reduce((counts, result) => {
    counts[result.outcome] = (counts[result.outcome] || 0) + 1
    return counts
  }, {})
  const reachableCount = results.filter(result => result.reachable).length
  return {
    schemaVersion: 1,
    checkedAt,
    scope: 'Homepage HTTP reachability and visible HTML metadata only',
    projectCount: results.length,
    reachableCount,
    unavailableCount: results.length - reachableCount,
    outcomeCounts,
    results,
  }
}

function mdCell(value) {
  return String(value ?? '').replace(/[|\r\n]+/g, ' ').slice(0, 180)
}

async function appendStepSummary(report) {
  const target = process.env.GITHUB_STEP_SUMMARY
  if (!target) return
  const rows = report.results.map(result => {
    const status = result.statusCode === null ? '—' : String(result.statusCode)
    const host = result.finalHost || '—'
    const title = result.pageTitle || result.error || 'No title returned'
    return '| ' + mdCell(result.name) + ' | ' + mdCell(result.outcome) + ' | ' + status + ' | ' + result.responseMs + ' ms | ' + mdCell(host) + ' | ' + mdCell(title) + ' |'
  })
  const content = [
    '## OSGARD external project homepage check',
    '',
    'Checked at: ' + report.checkedAt,
    '',
    'Reachable homepages: **' + report.reachableCount + '/' + report.projectCount + '**. Unavailable or HTTP-error results: **' + report.unavailableCount + '**.',
    '',
    '> Intended roles are owner-provided descriptions. A 2xx response checks only that a homepage responded; it does not verify product capabilities, security, service reliability or purchase flows.',
    '',
    '| Project | Outcome | HTTP | Response | Final host | Returned page title / error |',
    '|---|---|---:|---:|---|---|',
    ...rows,
    '',
    'Full JSON report is attached as a workflow artifact.',
    '',
  ].join('\n')
  const { appendFile } = await import('node:fs/promises')
  await appendFile(target, content, 'utf8')
}

export async function main(argv = process.argv.slice(2)) {
  const outIndex = argv.indexOf('--out')
  const outPath = outIndex >= 0 && argv[outIndex + 1] ? resolve(argv[outIndex + 1]) : resolve('artifacts/external-project-health.json')
  const strict = argv.includes('--strict')
  const report = await runAudit()
  await mkdir(dirname(outPath), { recursive: true })
  await writeFile(outPath, JSON.stringify(report, null, 2) + '\n', 'utf8')
  await appendStepSummary(report)
  console.log(JSON.stringify({
    checkedAt: report.checkedAt,
    projectCount: report.projectCount,
    reachableCount: report.reachableCount,
    unavailableCount: report.unavailableCount,
    outcomeCounts: report.outcomeCounts,
    reportPath: outPath,
  }, null, 2))
  for (const result of report.results) {
    const code = result.statusCode === null ? '—' : result.statusCode
    console.log('[' + result.outcome + '] ' + result.name + ': HTTP ' + code + '; ' + result.responseMs + ' ms; ' + (result.finalUrl || result.error || 'no final URL'))
  }
  if (strict && report.unavailableCount > 0) process.exitCode = 1
  return report
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.stack : String(error))
    process.exitCode = 1
  })
}
