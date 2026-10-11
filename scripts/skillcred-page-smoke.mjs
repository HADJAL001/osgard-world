import assert from 'node:assert/strict'
import { existsSync, readFileSync } from 'node:fs'
import { resolve, dirname } from 'node:path'

const candidates = process.argv.slice(2).length
  ? process.argv.slice(2)
  : ['public/skillcred/index.html', 'dist/skillcred/index.html']
const files = candidates.filter(path => existsSync(resolve(path)))
assert.ok(files.length > 0, 'SkillCred page is missing from source and build output')

const nginxPath = resolve('nginx.conf')
assert.ok(existsSync(nginxPath), 'nginx.conf is missing')
const nginx = readFileSync(nginxPath, 'utf8')
assert.ok(nginx.includes('location /skillcred/'), 'SkillCred static location is missing')
assert.ok(nginx.includes('location ^~ /skillcred-api/'), 'same-origin API proxy is missing')
assert.ok(nginx.includes('gzip_static on;'), 'precompressed static asset delivery is missing')
assert.ok(nginx.includes('max-age=31536000, immutable'), 'versioned static asset cache policy is missing')
assert.ok(nginx.includes('proxy_set_header Authorization "";'), 'proxy must not forward browser Authorization')
assert.ok(nginx.includes('proxy_set_header Cookie "";'), 'proxy must not forward browser cookies')
assert.ok(nginx.includes("connect-src 'self'"), 'CSP must restrict API connections to same origin')
for (const header of ['X-Content-Type-Options nosniff', 'X-Frame-Options SAMEORIGIN', 'Referrer-Policy strict-origin-when-cross-origin', 'Permissions-Policy']) {
  assert.ok(nginx.includes(header), 'security header missing for SkillCred: ' + header)
}

const requiredIds = [
  'issueBtn', 'verifyBtn', 'revokeBtn', 'downloadBtn',
  'demoResult', 'demoCard', 'badgeTitle', 'eventLog',
  'heroIssuer', 'heroStatus', 'copyCode', 'menuToggle',
]
const requiredSections = ['demo', 'how', 'audience', 'developers', 'faq']
for (const file of files) {
  const html = readFileSync(resolve(file), 'utf8')
  const folder = dirname(resolve(file))
  const cssPath = resolve(folder, 'styles.css')
  const jsPath = resolve(folder, 'app.js')
  const fontPath = resolve(folder, 'fonts/InterVariable.woff2')
  const fontLicensePath = resolve(folder, 'fonts/OFL.txt')
  assert.ok(existsSync(fontPath), file + ': self-hosted Inter variable font not found')
  assert.ok(existsSync(fontLicensePath), file + ': font license not found')
  assert.match(html, /<html lang="ru">/i, file + ': missing Russian document language')
  assert.match(html, /name="api-base" content="\/skillcred-api"/, file + ': missing same-origin proxy')
  assert.match(html, /https:\/\/osgard\.world\/skillcred\//, file + ': missing canonical URL')
  assert.match(html, /\/skillcred\/styles\.css/, file + ': missing external stylesheet')
  assert.match(html, /\/skillcred\/app\.js/, file + ': missing application script')
  assert.ok(html.includes('.nav-right .nav-cta::after'), file + ': mobile CTA must keep a visible glyph')
  for (const id of requiredIds) assert.match(html, new RegExp('id=["\\x27]' + id + '["\\x27]'), file + ': missing #' + id)
  for (const section of requiredSections) assert.ok(html.includes('id="' + section + '"'), file + ': missing section #' + section)
  for (const endpoint of ['/demo/issue', '/demo/verify', '/demo/revoke']) assert.ok(html.includes(endpoint), file + ': missing endpoint contract ' + endpoint)
  assert.ok(!html.includes('DEMO_ISSUER_TOKEN'), file + ': server secret name leaked into UI')
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(html), file + ': external font CDN found')
  assert.ok(!/google-analytics|gtag\(|mixpanel|segment\.com/.test(html), file + ': analytics code found')
  assert.ok(existsSync(cssPath), file + ': styles.css not found')
  assert.ok(existsSync(jsPath), file + ': app.js not found')
  const css = readFileSync(cssPath, 'utf8')
  const js = readFileSync(jsPath, 'utf8')
  assert.match(css, /@font-face[^{}]*\{[^}]*InterVariable\.woff2/, file + ': self-hosted Inter font is not configured')
  assert.match(css, /prefers-reduced-motion/, file + ': missing reduced motion support')
  assert.match(css, /@media\(max-width:380px\)/, file + ': missing small-screen layout rules')
  assert.doesNotThrow(() => new Function(js), file + ': app.js has a syntax error')
  assert.match(js, /credentials\s*:\s*["']same-origin["']/, file + ': API requests must use same-origin proxy')
  assert.ok(js.includes('HTTP '), file + ': HTTP response codes are not logged')
  assert.ok(!js.includes('DEMO_ISSUER_TOKEN'), file + ': server secret name leaked into JS')
  assert.ok(!/fonts\.googleapis\.com|fonts\.gstatic\.com/.test(js), file + ': external font CDN found')
  assert.match(css, /faq-answer p\\s*\\{[^}]*font-size:\\s*13px/, file + ': mobile FAQ text should remain legible')
  assert.match(css, /footer-col>a\\s*\\{[^}]*min-height:\\s*27px/, file + ': mobile footer links need at least 24px targets')
  console.log('PASS ' + file + ': semantic page, local assets, same-origin API and JS syntax')
}
