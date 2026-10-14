import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve } from 'node:path'

const root = resolve(import.meta.dirname, '..')
const publisher = await readFile(resolve(root, 'scripts/publish-frontend-resumable.ps1'), 'utf8')
const activator = await readFile(resolve(root, 'scripts/activate-frontend-dist-remote.sh'), 'utf8')
const deployment = await readFile(resolve(root, 'DEPLOYMENT.md'), 'utf8')
const pkg = JSON.parse(await readFile(resolve(root, 'package.json'), 'utf8'))
const frontendWorkflow = await readFile(resolve(root, '.github/workflows/frontend-check.yml'), 'utf8')

const checks = [
  ['publisher has a local-only preflight', publisher.includes('[switch]$PreflightOnly') && publisher.includes("mode = if ($PreflightOnly) { 'local-only'")],
  ['publisher validates the archive filename', publisher.includes("Archive -notmatch '^[A-Za-z0-9]") && publisher.includes("Archive.Contains('..')")],
  ['publisher checks native exit codes', publisher.includes('function Invoke-CheckedNative') && publisher.includes('$LASTEXITCODE') && publisher.includes('exited with code')],
  ['publisher creates a unique remote stage', publisher.includes("'/tmp/osgard-frontend-release-' + [guid]::NewGuid().ToString('N')")],
  ['publisher cleans stale local chunks before creating new ones', publisher.indexOf("Remove-Item -LiteralPath $chunkDir -Recurse -Force") < publisher.indexOf("New-Item -ItemType Directory -Path $chunkDir -Force")],
  ['publisher splits the archive as a stream', publisher.includes('[System.IO.File]::OpenRead($archivePath)') && publisher.includes('$inputStream.Read($buffer, 0, $buffer.Length)')],
  ['publisher verifies remote SHA-256 and byte count', publisher.includes('$remoteHash -ne $localHash') && publisher.includes('$remoteBytes -ne $localBytes')],
  ['activation is opt-in', publisher.includes('if (!$Activate)') && publisher.includes('Production was not changed.')],
  ['activation uses the shared rollback helper', publisher.includes('activate-frontend-dist-remote.sh') && !publisher.includes('rm -rf /usr/share/nginx/html/*')],
  ['activation validates archive digest and paths', activator.includes('sha256sum "$archive"') && activator.includes('Unsafe archive path') && activator.includes('index.html')],
  ['activation rejects link entries', activator.includes('Symbolic and hard links are not allowed')],
  ['activation contains rollback on failed Nginx validation', activator.includes('rollback()') && activator.includes('trap rollback EXIT') && activator.includes('nginx -t')],
  ['activation runs post-deploy route probes', activator.includes('curl --retry') && activator.includes('$origin/games/')],
  ['publisher check is available through npm', pkg.scripts['qa:windows-publisher'] === 'node scripts/publish-frontend-resumable-smoke.mjs'],
  ['frontend CI covers publisher assets', frontendWorkflow.includes('scripts/publish-frontend-resumable.ps1') && frontendWorkflow.includes('scripts/activate-frontend-dist-remote.sh') && frontendWorkflow.includes('qa:windows-publisher')],
  ['deployment docs describe preflight and opt-in activation', deployment.includes('-PreflightOnly') && deployment.includes('-Activate') && deployment.includes('scp -i')],
]
for (const [name, passed] of checks) {
  assert.equal(passed, true, 'FAILED: ' + name)
  console.log('PASS ' + name)
}
console.log('Publisher static contract: ' + checks.length + '/' + checks.length + ' passed')
