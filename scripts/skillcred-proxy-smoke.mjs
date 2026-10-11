import assert from 'node:assert/strict'

const base = (process.env.OSGARD_BASE_URL || 'https://osgard.world').replace(/\/+$/, '')
const timeout = 15000
const issued = []
async function call(path, method = 'GET', body) {
  const options = {
    method,
    headers: { accept: 'application/json' },
    cache: 'no-store',
    signal: AbortSignal.timeout(timeout),
  }
  if (body !== undefined) {
    options.headers['content-type'] = 'application/json'
    options.body = JSON.stringify(body)
  }
  const response = await fetch(base + '/skillcred-api' + path, options)
  const raw = await response.text()
  let data
  try { data = raw ? JSON.parse(raw) : {} } catch { data = { raw: raw.slice(0, 300) } }
  assert.ok(response.ok, path + ' returned HTTP ' + response.status + ': ' + JSON.stringify(data))
  console.log('PASS ' + method + ' ' + path + ' HTTP ' + response.status)
  return { response, data }
}

try {
  const health = await call('/health')
  assert.equal(health.data.service, 'skillcred', 'proxied /health did not identify SkillCred')
  assert.equal(health.data.version, '0.3.0', 'unexpected API version')
  assert.equal(health.data.demo_ready, true, 'public demo issuer is not ready')

  const ready = await call('/ready')
  assert.equal(ready.data.ready, true, 'API readiness check returned false')
  await call('/issuer')

  const issuedResponse = await call('/demo/issue', 'POST', {})
  const credential = issuedResponse.data
  assert.ok(credential && credential.credentialSubject && credential.proof, 'issue response lacks the credential subject or proof')
  issued.push(credential)

  const active = await call('/demo/verify', 'POST', { credential })
  assert.equal(active.data.signature_valid, true, 'fresh credential signature was not verified')
  assert.equal(active.data.status, 'active', 'fresh credential is not active')
  assert.equal(active.data.valid, true, 'fresh credential was not marked valid')

  const revokedResponse = await call('/demo/revoke', 'POST', { credential })
  assert.equal(revokedResponse.data.revoked, true, 'revoke endpoint did not confirm revocation')

  const final = await call('/demo/verify', 'POST', { credential })
  assert.equal(final.data.signature_valid, true, 'revocation unexpectedly changed the credential signature')
  assert.equal(final.data.status, 'revoked', 'revoked credential did not report revoked status')
  assert.equal(final.data.valid, false, 'revoked credential must not be considered valid')

  console.log('PASS SKILLCRED_SAME_ORIGIN_PROXY: issue -> verify active -> revoke -> verify revoked')
} catch (error) {
  // Avoid leaving a synthetic credential active if a later assertion fails.
  for (const credential of issued) {
    try { await call('/demo/revoke', 'POST', { credential }) } catch {}
  }
  console.error('FAIL SKILLCRED_SAME_ORIGIN_PROXY:', error && error.stack ? error.stack : error)
  process.exitCode = 1
}
