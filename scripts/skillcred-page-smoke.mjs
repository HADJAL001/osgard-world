import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve } from 'node:path'

const candidates = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['public/skillcred/index.html', 'dist/skillcred/index.html']
const files = candidates.filter(path => existsSync(resolve(path)))

assert.ok(files.length > 0, 'SkillCred page is missing from source and build output')

const requiredIds = [
  'issueBtn', 'verifyBtn', 'revokeBtn', 'downloadBtn',
  'demoResult', 'demoCard', 'badgeJson', 'liveStatus',
  'heroIssuer', 'heroStatus',
]
const requiredApiPaths = [
  '/health', '/ready', '/issuer',
  '/demo/issue', '/demo/verify', '/demo/revoke',
]
for (const file of files) {
  const html = readFileSync(resolve(file), 'utf8')
  assert.match(html, /<html lang="ru">/i, `${file}: missing Russian document language`)
  assert.match(html, /https:\/\/skillcred-pilot-api\.onrender\.com/, `${file}: missing API origin`)
  assert.match(html, /https:\/\/osgard\.world\/skillcred\//, `${file}: missing canonical product URL`)
  for (const id of requiredIds) {
    assert.match(html, new RegExp(`id=["']${id}["']`), `${file}: missing #${id}`)
  }
  for (const endpoint of requiredApiPaths) {
    assert.ok(html.includes(endpoint), `${file}: missing live API path ${endpoint}`)
  }
  assert.ok(!html.includes('DEMO_ISSUER_TOKEN'), `${file}: server secret name leaked into browser UI`)
  assert.ok(!html.includes('crypto.subtle.generateKey'), `${file}: demo must use server-issued credentials`)
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), `${file}: external font CDN found`)
  assert.ok(!/google-analytics|gtag\(|mixpanel|segment\.com/.test(html), `${file}: analytics code found`)

  const scripts = [...html.matchAll(/<script(?:\s[^>]*)?>([\s\S]*?)<\/script>/gi)]
    .map(match => match[1].trim())
    .filter(Boolean)
  assert.ok(scripts.length > 0, `${file}: missing interactive script`)
  for (const script of scripts) {
    assert.doesNotThrow(() => new Function(script), `${file}: inline JavaScript has a syntax error`)
  }
  console.log(`PASS ${file}: live API wiring, demo controls, metadata and inline JS`)
}
