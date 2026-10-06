import { createServer } from 'node:http'
import { once } from 'node:events'
import { execFile } from 'node:child_process'
import { promisify } from 'node:util'

const run = promisify(execFile)
const server = createServer((request, response) => {
  if (request.url === '/health/ready') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end(JSON.stringify({ status: 'ready', authConfigured: true }))
    return
  }
  if (request.url === '/api/v1/player/profile' && request.headers.authorization === 'Bearer fixture-token') {
    response.writeHead(200, { 'content-type': 'application/json' })
    response.end('{}')
    return
  }
  response.writeHead(401)
  response.end('{}')
})

server.listen(0, '127.0.0.1')
await once(server, 'listening')
const address = server.address()
try {
  const result = await run(process.execPath, ['scripts/production-api-probe.mjs'], {
    cwd: process.cwd(),
    env: { ...process.env, OSGARD_PRODUCTION_API_BASE: `http://127.0.0.1:${address.port}`, OSGARD_PRODUCTION_BEARER_TOKEN: 'fixture-token' },
  })
  const report = JSON.parse(result.stdout)
  if (report.status !== 'ready' || report.profileStatus !== 200) throw new Error('probe smoke did not report ready')
  console.log('OSGARD_PRODUCTION_API_PROBE_SMOKE_OK')
} finally {
  server.close()
}
