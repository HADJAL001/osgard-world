import { createHash } from 'node:crypto'
import { execFileSync } from 'node:child_process'
import { stat, readdir, readFile, writeFile } from 'node:fs/promises'
import { basename, dirname, extname, isAbsolute, join, relative, resolve, sep } from 'node:path'
import { fileURLToPath } from 'node:url'

const scriptRoot = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const root = resolve(process.argv[2] || 'dist')
const output = resolve(process.env.OSGARD_FRONTEND_MANIFEST || join(scriptRoot, 'release-manifest.json'))
const required = ['index.html', 'assets']
const files = []

const outputRelativeToArtifact = relative(root, output)
if (
  outputRelativeToArtifact === '' ||
  (!isAbsolute(outputRelativeToArtifact) &&
    outputRelativeToArtifact !== '..' &&
    !outputRelativeToArtifact.startsWith('..' + sep))
) {
  throw new Error('Release manifest must be written outside the artifact directory so it cannot escape its own inventory.')
}

const contractReportPath = resolve(process.env.OSGARD_CONTRACT_AUDIT || join(scriptRoot, 'osgard-contract-audit.json'))
const secretExact = new Set([
  '.env', '.env.local', '.env.production', '.npmrc', '.pypirc',
  'id_rsa', 'id_ed25519', 'credentials.json', 'service-account.json',
])
const secretExtensions = new Set(['.pem', '.p12', '.pfx', '.key', '.keystore'])
function isSecretPath(path) {
  const name = basename(path).toLowerCase()
  if (secretExact.has(name) || name.startsWith('id_rsa') || name.startsWith('id_ed25519')) return true
  if (/^\.env\.(?!example$|sample$)[a-z0-9._-]+$/i.test(name)) return true
  return secretExtensions.has(extname(name))
}
async function readContractGate(path) {
  const raw = await readFile(path)
  const report = JSON.parse(raw.toString('utf8'))
  const summary = report?.summary
  const fingerprint = String(report?.contract?.sha256 || '')
  if (report?.schema !== 'osgard.contract-integrity.v1' ||
      report.status !== 'ready' ||
      !Array.isArray(report.checks) ||
      !summary ||
      !Number.isSafeInteger(summary.checks) || summary.checks < 1 ||
      !Number.isSafeInteger(summary.passed) || summary.passed < 0 ||
      !Number.isSafeInteger(summary.failed) || summary.failed !== 0 ||
      !Number.isSafeInteger(summary.warnings) || summary.warnings < 0 ||
      summary.checks !== report.checks.length ||
      summary.passed + summary.warnings !== summary.checks ||
      report.checks.some(item => !item || !['passed', 'warning'].includes(item.status)) ||
      !/^[a-f0-9]{64}$/.test(fingerprint)) {
    throw new Error('Contract audit report is blocked, missing or malformed: ' + path)
  }
  return {
    schema: report.schema,
    reportSha256: createHash('sha256').update(raw).digest('hex'),
    contractFingerprint: fingerprint,
    checkCount: summary.checks,
    passed: summary.passed,
    warnings: summary.warnings,
  }
}
const qualityGate = await readContractGate(contractReportPath)

async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isSymbolicLink()) {
      throw new Error('Symbolic links are not permitted in a production archive: ' + relative(root, path))
    }
    if (entry.isDirectory()) await walk(path)
    else if (entry.isFile()) {
      const rel = relative(root, path).split(sep).join('/')
      if (isSecretPath(rel)) throw new Error('Secret-like file is not permitted in a production archive: ' + rel)
      files.push(path)
    }
    else throw new Error('Unsupported filesystem entry in production archive: ' + relative(root, path))
  }
}

for (const item of required) {
  const metadata = await stat(join(root, item))
  if (item === 'index.html' && !metadata.isFile()) throw new Error('archive entrypoint must be a regular file')
  if (item === 'assets' && !metadata.isDirectory()) throw new Error('archive assets must be a directory')
}
await walk(root)
if (!files.some(file => file.endsWith('.html'))) throw new Error('archive has no html entrypoint')

const mojibakeMarkers = ['вЂ', 'пїЅ', '\ufffd']
for (const file of files.filter(item => item.endsWith('.html'))) {
  const html = await readFile(file, 'utf8')
  const marker = mojibakeMarkers.find(value => html.includes(value))
  if (marker) throw new Error(`HTML mojibake marker ${JSON.stringify(marker)} in ${relative(root, file)}`)
}

const normalizedFiles = files
  .map(path => ({ absolutePath: path, path: relative(root, path).split(sep).join('/') }))
  .sort((a, b) => a.path.localeCompare(b.path, 'en'))

const treeHash = createHash('sha256')
let totalBytes = 0
const inventory = []
for (const file of normalizedFiles) {
  const data = await readFile(file.absolutePath)
  const sha256 = createHash('sha256').update(data).digest('hex')
  totalBytes += data.byteLength
  treeHash.update(file.path + '\0')
  treeHash.update(data)
  inventory.push({ path: file.path, bytes: data.byteLength, sha256 })
}

let revision = typeof process.env.GITHUB_SHA === 'string' && /^[a-f0-9]{40,64}$/i.test(process.env.GITHUB_SHA)
  ? process.env.GITHUB_SHA.toLowerCase()
  : null
if (!revision) {
  try {
    const candidate = execFileSync('git', ['rev-parse', 'HEAD'], { cwd: scriptRoot, encoding: 'utf8', stdio: ['ignore', 'pipe', 'ignore'] }).trim()
    if (/^[a-f0-9]{40,64}$/i.test(candidate)) revision = candidate.toLowerCase()
  } catch { /* Source revision is explicitly unknown outside Git/CI; it is never guessed. */ }
}

const packageData = JSON.parse(await readFile(join(scriptRoot, 'package.json'), 'utf8'))
const userAgent = String(process.env.npm_config_user_agent || '')
const npmVersion = userAgent.match(/(?:^|\s)npm\/([^\s]+)/)?.[1] || null
const treeSha256 = treeHash.digest('hex')
const createdAt = new Date().toISOString()
const report = {
  schema: 'osgard.release-manifest.v1',
  status: 'ready',
  createdAt,
  releaseId: (revision ? revision.slice(0, 12) : 'unknown-revision') + '-' + treeSha256.slice(0, 12),
  source: {
    repository: process.env.GITHUB_REPOSITORY || null,
    revision,
    ref: process.env.GITHUB_REF_NAME || null,
    workflowRunId: process.env.GITHUB_RUN_ID || null,
    workflowRunAttempt: process.env.GITHUB_RUN_ATTEMPT || null,
  },
  app: { name: packageData.name, version: packageData.version },
  toolchain: { node: process.version, npm: npmVersion },
  artifact: {
    root: relative(scriptRoot, root).split(sep).join('/'),
    fileCount: inventory.length,
    totalBytes,
    rootSha256: treeSha256,
    hashAlgorithm: 'sha256',
  },
  // Keep the old scalar fields for existing dashboards and integrations.
  files: inventory.length,
  bytes: totalBytes,
  sha256: treeSha256,
  // This list is intentionally outside the hashed artifact to avoid self-reference.
  inventory,
  qualityGate,
}
await writeFile(output, JSON.stringify(report, null, 2) + '\n', { mode: 0o600 })
console.log(JSON.stringify({
  schema: report.schema,
  status: report.status,
  releaseId: report.releaseId,
  revision: report.source.revision,
  files: report.files,
  bytes: report.bytes,
  sha256: report.sha256,
  qualityGate: report.qualityGate,
  manifestPath: relative(scriptRoot, output).split(sep).join('/'),
}, null, 2))
