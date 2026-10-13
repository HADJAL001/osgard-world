import { mkdir, writeFile } from 'node:fs/promises'
import { dirname, resolve } from 'node:path'
import { pathToFileURL } from 'node:url'

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
const MAX_RESPONSE_BYTES = 1024 * 1024

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

async function readLimitedText(response, maxBytes = MAX_RESPONSE_BYTES) {
  const body = response.body
  if (!body || typeof body.getReader !== 'function') {
    const text = await response.text()
    const bytesRead = new TextEncoder().encode(text).byteLength
    return bytesRead > maxBytes
      ? { text: '', tooLarge: true, bytesRead }
      : { text, tooLarge: false, bytesRead }
  }

  const reader = body.getReader()
  const chunks = []
  let bytesRead = 0
  try {
    while (true) {
      const part = await reader.read()
      if (part.done) break
      const chunk = part.value instanceof Uint8Array ? part.value : new Uint8Array(part.value)
      bytesRead += chunk.byteLength
      if (bytesRead > maxBytes) {
        try { await reader.cancel() } catch {}
        return { text: '', tooLarge: true, bytesRead }
      }
      chunks.push(chunk)
    }
  } finally {
    try { reader.releaseLock() } catch {}
  }

  const bytes = new Uint8Array(bytesRead)
  let offset = 0
  for (const chunk of chunks) {
    bytes.set(chunk, offset)
    offset += chunk.byteLength
  }
  return { text: new TextDecoder('utf-8').decode(bytes), tooLarge: false, bytesRead }
}

export async function checkProject(project, {
  fetchImpl = globalThis.fetch,
  timeoutMs = 12000,
  maxAttempts = 2,
  maxResponseBytes = MAX_RESPONSE_BYTES,
  retryDelayMs = 250,
  now = () => new Date(),
} = {}) {
  const started = Date.now()
  const checkedAt = now().toISOString()
  for (let attempt = 1; attempt <= Math.max(1, maxAttempts); attempt++) {
    try {
      const response = await fetchImpl(project.url, {
        method: 'GET',
        redirect: 'follow',
        signal: AbortSignal.timeout(timeoutMs),
        headers: {
          accept: 'text/html,application/xhtml+xml,application/xml;q=0.9,*/*;q=0.8',
          'user-agent': USER_AGENT,
        },
      })
      if (response.status >= 500 && attempt < maxAttempts) {
        try { await response.body?.cancel() } catch {}
        await new Promise(resolve => setTimeout(resolve, retryDelayMs * attempt))
        continue
      }
      const contentType = responseHeader(response, 'content-type').split(';')[0].trim().toLowerCase()
      const limitBytes = Number.isSafeInteger(maxResponseBytes) && maxResponseBytes > 0 ? maxResponseBytes : MAX_RESPONSE_BYTES
      const bodyRead = await readLimitedText(response, limitBytes)
      const isHtml = contentType === 'text/html' || contentType === 'application/xhtml+xml'
      const body = bodyRead.text
      const finalUrl = response.url || project.url
      let finalHost = null
      try { finalHost = new URL(finalUrl).hostname } catch {}
      const reachable = response.status >= 200 && response.status < 400
      if (bodyRead.tooLarge) {
        return {
          id: project.id,
          name: project.name,
          intendedRole: project.intendedRole,
          requestedUrl: project.url,
          finalUrl,
          finalHost,
          redirected: Boolean(response.redirected) || finalUrl.replace(/\/$/, '') !== project.url.replace(/\/$/, ''),
          statusCode: response.status,
          contentType: contentType || null,
          pageTitle: null,
          metaDescription: null,
          outcome: reachable ? 'reachable_body_too_large' : 'http_error',
          reachable,
          bodyTooLarge: true,
          bodyLimitBytes: limitBytes,
          bodyBytesRead: bodyRead.bytesRead,
          responseMs: Math.max(0, Date.now() - started),
          attempts: attempt,
          checkedAt,
          note: reachable
            ? 'Homepage responded successfully, but its body exceeded the metadata audit size limit; this is not an availability failure.'
            : 'An HTTP error response exceeded the metadata audit size limit; its body was not parsed.',
        }
      }
      const title = isHtml ? extractPageTitle(body) : null
      const outcome = classifyHttp(response.status, isHtml, title)
      return {
        id: project.id,
        name: project.name,
        intendedRole: project.intendedRole,
        requestedUrl: project.url,
        finalUrl,
        finalHost,
        redirected: Boolean(response.redirected) || finalUrl.replace(/\/$/, '') !== project.url.replace(/\/$/, ''),
        statusCode: response.status,
        contentType: contentType || null,
        pageTitle: title,
        metaDescription: isHtml ? extractMetaDescription(body) : null,
        outcome,
        reachable,
        bodyTooLarge: false,
        bodyLimitBytes: limitBytes,
        bodyBytesRead: bodyRead.bytesRead,
        responseMs: Math.max(0, Date.now() - started),
        attempts: attempt,
        checkedAt,
        note: 'HTTP homepage check only; it does not confirm product features, login, API, checkout, or service reliability.',
      }
    } catch (error) {
      const name = error && typeof error.name === 'string' ? error.name : 'Error'
      if (attempt < maxAttempts && (name === 'TypeError' || name === 'TimeoutError' || name === 'AbortError')) {
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
  maxResponseBytes = MAX_RESPONSE_BYTES,
  now = () => new Date(),
} = {}) {
  const checkedAt = now().toISOString()
  const limitBytes = Number.isSafeInteger(maxResponseBytes) && maxResponseBytes > 0 ? maxResponseBytes : MAX_RESPONSE_BYTES
  const results = await Promise.all(projects.map(project => checkProject(project, { fetchImpl, timeoutMs, maxResponseBytes: limitBytes, now })))
  const outcomeCounts = results.reduce((counts, result) => {
    counts[result.outcome] = (counts[result.outcome] || 0) + 1
    return counts
  }, {})
  const reachableCount = results.filter(result => result.reachable).length
  return {
    schemaVersion: 1,
    checkedAt,
    scope: 'Homepage HTTP reachability and visible HTML metadata only; response body cap is applied before parsing',
    maxResponseBytes: limitBytes,
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
    const title = result.pageTitle || result.error || (result.bodyTooLarge ? result.note : 'No title returned')
    return '| ' + mdCell(result.name) + ' | ' + mdCell(result.outcome) + ' | ' + status + ' | ' + result.responseMs + ' ms | ' + mdCell(host) + ' | ' + mdCell(title) + ' |'
  })
  const content = [
    '## OSGARD external project homepage check',
    '',
    'Checked at: ' + report.checkedAt,
    '',
    'Reachable homepages: **' + report.reachableCount + '/' + report.projectCount + '**. Unavailable or HTTP-error results: **' + report.unavailableCount + '**.',
    'Per-response body cap: **' + Number(report.maxResponseBytes || MAX_RESPONSE_BYTES).toLocaleString('en-US') + ' bytes**. Reachable pages skipped for size: **' + report.results.filter(result => result.outcome === 'reachable_body_too_large').length + '**.',
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
    maxResponseBytes: report.maxResponseBytes,
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
