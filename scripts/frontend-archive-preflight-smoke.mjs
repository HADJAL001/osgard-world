import assert from 'node:assert/strict'
import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { mkdtempSync, mkdirSync, rmSync, writeFileSync, readFileSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join, relative } from 'node:path'

const temporary = mkdtempSync(join(tmpdir(), 'osgard-release-manifest-'))
const artifact = join(temporary, 'artifact')
const manifestPath = join(temporary, 'release-manifest.json')
const tool = 'scripts/frontend-archive-preflight.mjs'
const revision = 'a'.repeat(40)
const env = {
  ...process.env,
  GITHUB_SHA: revision,
  GITHUB_REPOSITORY: 'OSGARD/test-fixture',
  GITHUB_REF_NAME: 'test-branch',
  GITHUB_RUN_ID: '12345',
  GITHUB_RUN_ATTEMPT: '2',
  npm_config_user_agent: 'npm/10.8.1 node/v20.20.0 linux x64',
  OSGARD_FRONTEND_MANIFEST: manifestPath,
}
try {
  mkdirSync(join(artifact, 'assets'), { recursive: true })
  mkdirSync(join(artifact, 'games', 'demo'), { recursive: true })
  writeFileSync(join(artifact, 'index.html'), '<!doctype html><html lang="en"><title>fixture</title></html>\n')
  writeFileSync(join(artifact, 'assets', 'app.js'), 'globalThis.appReady = true;\n')
  writeFileSync(join(artifact, 'games', 'demo', 'index.html'), '<!doctype html><html lang="en"><title>demo</title></html>\n')

  execFileSync(process.execPath, [tool, artifact], { encoding: 'utf8', env })
  const manifest = JSON.parse(readFileSync(manifestPath, 'utf8'))
  assert.equal(manifest.schema, 'osgard.release-manifest.v1')
  assert.equal(manifest.status, 'ready')
  assert.equal(manifest.source.revision, revision)
  assert.equal(manifest.source.repository, 'OSGARD/test-fixture')
  assert.equal(manifest.source.ref, 'test-branch')
  assert.equal(manifest.source.workflowRunId, '12345')
  assert.equal(manifest.app.name, 'osgard-world')
  assert.equal(manifest.files, 3)
  assert.equal(manifest.artifact.fileCount, 3)
  assert.equal(manifest.bytes, manifest.artifact.totalBytes)
  assert.equal(manifest.sha256, manifest.artifact.rootSha256)
  assert.match(manifest.sha256, /^[a-f0-9]{64}$/)
  assert.match(manifest.releaseId, new RegExp('^' + revision.slice(0, 12) + '-[a-f0-9]{12}$'))
  assert.deepEqual(manifest.inventory.map(file => file.path), ['assets/app.js', 'games/demo/index.html', 'index.html'])

  const expectedTree = createHash('sha256')
  for (const item of manifest.inventory) {
    const bytes = readFileSync(join(artifact, item.path))
    assert.equal(item.bytes, bytes.byteLength)
    assert.equal(item.sha256, createHash('sha256').update(bytes).digest('hex'))
    expectedTree.update(item.path + '\0')
    expectedTree.update(bytes)
  }
  assert.equal(manifest.sha256, expectedTree.digest('hex'), 'Artifact digest must bind sorted paths and exact file bytes')

  assert.throws(() => execFileSync(process.execPath, [tool, artifact], {
    encoding: 'utf8',
    env: { ...env, OSGARD_FRONTEND_MANIFEST: join(artifact, 'self-referential.json') },
    stdio: 'pipe',
  }), /Release manifest must be written outside the artifact directory/i)

  writeFileSync(join(artifact, 'games', 'demo', 'index.html'), '<html>вЂ broken</html>\n')
  assert.throws(() => execFileSync(process.execPath, [tool, artifact], { encoding: 'utf8', env }), /HTML mojibake marker/i)
  console.log('PASS release manifest: source SHA, sorted per-file hashes, aggregate artifact digest, compatibility fields and fail-closed validation')
} finally {
  rmSync(temporary, { recursive: true, force: true })
}
