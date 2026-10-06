const base = (process.env.OSGARD_PRODUCTION_API_BASE || '').replace(/\/$/, '')
const bearer = process.env.OSGARD_PRODUCTION_BEARER_TOKEN || ''

if (!base || !bearer) {
  console.log(JSON.stringify({ status: 'skipped', reason: 'OSGARD_PRODUCTION_API_BASE and OSGARD_PRODUCTION_BEARER_TOKEN are not configured' }))
  process.exit(0)
}

const request = async (path, options = {}) => {
  const response = await fetch(`${base}${path}`, { ...options, signal: AbortSignal.timeout(5000) })
  const body = await response.text()
  return { status: response.status, body }
}

try {
  const readiness = await request('/health/ready')
  if (readiness.status !== 200) throw new Error(`readiness returned HTTP ${readiness.status}`)
  const readinessBody = JSON.parse(readiness.body)
  if (readinessBody.status !== 'ready' || readinessBody.authConfigured !== true) throw new Error('readiness contract is not ready/authenticated')

  const profile = await request('/api/v1/player/profile', { headers: { Authorization: `Bearer ${bearer}` } })
  if (profile.status !== 200) throw new Error(`authenticated profile returned HTTP ${profile.status}`)
  JSON.parse(profile.body)
  console.log(JSON.stringify({ status: 'ready', readiness: { status: readinessBody.status, authConfigured: readinessBody.authConfigured }, profileStatus: profile.status }))
} catch (error) {
  console.error(JSON.stringify({ status: 'failed', error: error instanceof Error ? error.message : 'probe failed' }))
  process.exitCode = 1
}
