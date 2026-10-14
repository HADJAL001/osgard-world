import { createHash } from 'node:crypto'
import { readdir, readFile, lstat } from 'node:fs/promises'
import { basename, extname, join, relative, resolve, sep } from 'node:path'

const root = resolve(process.argv[2] || 'dist')
const manifestPath = resolve(process.env.OSGARD_FRONTEND_MANIFEST || 'release-manifest.json')
const contractPath = resolve(process.env.OSGARD_CONTRACT_AUDIT || 'osgard-contract-audit.json')
const SHA_RE = /^[a-f0-9]{64}$/
const secretExact = new Set([
  '.env', '.env.local', '.env.production', '.npmrc', '.pypirc',
  'id_rsa', 'id_ed25519', 'credentials.json', 'service-account.json',
])
const secretExtensions = new Set(['.pem', '.p12', '.pfx', '.key', '.keystore'])

function hash(data) { return createHash('sha256').update(data).digest('hex') }
function safePath(path) {
  return typeof path === 'string' && path.length > 0 && !path.startsWith('/') &&
    !path.includes('\\') && !path.split('/').some(part => !part || part === '.' || part === '..')
}
function isSecretPath(path) {
  const name = basename(path).toLowerCase()
  if (secretExact.has(name) || name.startsWith('id_rsa') || name.startsWith('id_ed25519')) return true
  if (/^\.env\.(?!example$|sample$)[a-z0-9._-]+$/i.test(name)) return true
  return secretExtensions.has(extname(name))
}
async function currentInventory() {
  const rootStat = await lstat(root).catch(() => null)
  if (!rootStat || !rootStat.isDirectory() || rootStat.isSymbolicLink()) throw new Error('Build root must be a real directory.')
  const found = []
  const visit = async directory => {
    const entries = await readdir(directory, { withFileTypes: true })
    entries.sort((a, b) => a.name.localeCompare(b.name, 'en'))
    for (const entry of entries) {
      const absolute = join(directory, entry.name)
      const meta = await lstat(absolute)
      const path = relative(root, absolute).split(sep).join('/')
      if (meta.isSymbolicLink()) throw new Error('Symbolic links are forbidden: ' + path)
      if (meta.isDirectory()) await visit(absolute)
      else if (meta.isFile()) {
        if (!safePath(path)) throw new Error('Unsafe artifact path: ' + path)
        if (isSecretPath(path)) throw new Error('Secret-like file found in artifact: ' + path)
        const bytes = await readFile(absolute)
        found.push({ path, bytes: bytes.byteLength, sha256: hash(bytes), data: bytes })
      } else throw new Error('Unsupported artifact filesystem entry: ' + path)
    }
  }
  await visit(root)
  found.sort((a, b) => a.path.localeCompare(b.path, 'en'))
  if (!found.some(item => item.path === 'index.html' && item.bytes > 0)) throw new Error('Artifact is missing non-empty index.html.')
  const treeHash = createHash('sha256')
  let totalBytes = 0
  for (const item of found) {
    totalBytes += item.bytes
    treeHash.update(item.path + '\0')
    treeHash.update(item.data)
    delete item.data
  }
  return { files: found, totalBytes, rootSha256: treeHash.digest('hex') }
}
async function currentQualityGate() {
  const raw = await readFile(contractPath)
  const report = JSON.parse(raw.toString('utf8'))
  const summary = report?.summary
  const fingerprint = String(report?.contract?.sha256 || '')
  if (report?.schema !== 'osgard.contract-integrity.v1' || report.status !== 'ready' ||
      !Array.isArray(report.checks) || !summary ||
      !Number.isSafeInteger(summary.checks) || summary.checks < 1 ||
      !Number.isSafeInteger(summary.passed) || summary.passed < 0 ||
      !Number.isSafeInteger(summary.failed) || summary.failed !== 0 ||
      !Number.isSafeInteger(summary.warnings) || summary.warnings < 0 ||
      summary.checks !== report.checks.length || summary.passed + summary.warnings !== summary.checks ||
      report.checks.some(item => !item || !['passed', 'warning'].includes(item.status)) ||
      !SHA_RE.test(fingerprint)) {
    throw new Error('Contract audit report is blocked, missing or malformed.')
  }
  return {
    schema: report.schema,
    reportSha256: hash(raw),
    contractFingerprint: fingerprint,
    checkCount: summary.checks,
    passed: summary.passed,
    warnings: summary.warnings,
  }
}
async function main() {
  const manifest = JSON.parse(await readFile(manifestPath, 'utf8'))
  if (!manifest || manifest.schema !== 'osgard.release-manifest.v1' || manifest.status !== 'ready' ||
      !manifest.artifact || !Array.isArray(manifest.inventory) || !manifest.qualityGate) {
    throw new Error('Release manifest is malformed or has no bound qualityGate.')
  }
  const gate = await currentQualityGate()
  for (const key of ['schema', 'reportSha256', 'contractFingerprint', 'checkCount', 'passed', 'warnings']) {
    if (manifest.qualityGate[key] !== gate[key]) throw new Error('Contract report no longer matches release manifest field: ' + key)
  }
  const expectedRoot = String(manifest.artifact.rootSha256 || '')
  if (!SHA_RE.test(expectedRoot)) throw new Error('Manifest artifact digest is malformed.')
  const seen = new Set()
  for (const item of manifest.inventory) {
    if (!item || !safePath(item.path) || seen.has(item.path) ||
        !Number.isSafeInteger(item.bytes) || item.bytes < 0 || !SHA_RE.test(String(item.sha256 || ''))) {
      throw new Error('Manifest contains an unsafe or malformed inventory entry.')
    }
    seen.add(item.path)
  }
  const actual = await currentInventory()
  const expectedByPath = new Map(manifest.inventory.map(item => [item.path, item]))
  const actualByPath = new Map(actual.files.map(item => [item.path, item]))
  const missing = [...expectedByPath.keys()].filter(path => !actualByPath.has(path)).sort()
  const extra = [...actualByPath.keys()].filter(path => !expectedByPath.has(path)).sort()
  const changed = []
  for (const [path, expected] of expectedByPath) {
    const item = actualByPath.get(path)
    if (item && (item.bytes !== expected.bytes || item.sha256 !== expected.sha256)) changed.push(path)
  }
  const valid = !missing.length && !extra.length && !changed.length &&
    manifest.artifact.fileCount === actual.files.length &&
    manifest.artifact.totalBytes === actual.totalBytes &&
    manifest.artifact.rootSha256 === actual.rootSha256 &&
    manifest.files === actual.files.length &&
    manifest.bytes === actual.totalBytes &&
    manifest.sha256 === actual.rootSha256
  const result = {
    schema: 'osgard.release-manifest-verification.v1',
    status: valid ? 'verified' : 'mismatch',
    releaseId: manifest.releaseId,
    sourceRevision: manifest.source?.revision || null,
    artifactSha256: actual.rootSha256,
    contractFingerprint: gate.contractFingerprint,
    contractReportSha256: gate.reportSha256,
    fileCount: actual.files.length,
    totalBytes: actual.totalBytes,
    missing,
    extra,
    changed,
  }
  console.log(JSON.stringify(result, null, 2))
  if (!valid) throw new Error('Release manifest integrity mismatch.')
}
main().catch(error => {
  console.error('Release manifest verification failed: ' + String(error?.message || error))
  process.exitCode = 1
})
