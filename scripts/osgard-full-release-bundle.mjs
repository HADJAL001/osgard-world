import { createHash } from 'node:crypto'
import { createReadStream } from 'node:fs'
import { mkdir, readFile, readdir, rm, stat, writeFile } from 'node:fs/promises'
import { tmpdir } from 'node:os'
import { join, relative, resolve } from 'node:path'
import { spawnSync } from 'node:child_process'

function run(command, args, options = {}) {
  const result = spawnSync(command, args, { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'], ...options })
  if (result.error || result.status !== 0) {
    throw new Error([
      'Command failed: ' + command + ' ' + args.join(' '),
      result.error ? String(result.error) : '',
      result.stdout || '',
      result.stderr || '',
    ].filter(Boolean).join('\n'))
  }
  return (result.stdout || '').trim()
}

async function sha256(path) {
  const hash = createHash('sha256')
  for await (const chunk of createReadStream(path)) hash.update(chunk)
  return hash.digest('hex')
}

async function filesUnder(dir) {
  const found = []
  async function walk(current) {
    const entries = await readdir(current, { withFileTypes: true })
    for (const entry of entries) {
      const full = join(current, entry.name)
      if (entry.isDirectory()) await walk(full)
      else if (entry.isFile()) found.push(relative(dir, full).replaceAll('\\', '/'))
    }
  }
  await walk(dir)
  return found.sort()
}

const root = process.cwd()
const pkg = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'))
const commit = process.env.RELEASE_COMMIT || run('git', ['rev-parse', 'HEAD'])
const shortSha = commit.slice(0, 8)
const ref = process.env.RELEASE_REF || run('git', ['branch', '--show-current']) || 'detached'
const outDir = resolve(process.env.OSGARD_BUNDLE_OUT || join(tmpdir(), 'osgard-world-full-release-bundle'))
const distDir = join(root, 'dist')
const sourceName = 'OSGARD-WORLD-GAMING-' + pkg.version + '-' + shortSha + '-SOURCE.zip'
const siteName = 'OSGARD-WORLD-GAMING-' + pkg.version + '-' + shortSha + '-SITE.zip'

if (!(await stat(distDir).catch(() => null))?.isDirectory()) {
  throw new Error('Production directory dist is missing. Run npm run build first.')
}
await rm(outDir, { recursive: true, force: true })
await mkdir(outDir, { recursive: true })
const sourceZip = join(outDir, sourceName)
const siteZip = join(outDir, siteName)
const prefix = 'OSGARD-WORLD-GAMING-' + pkg.version + '-' + shortSha + '/'

run('git', ['archive', '--format=zip', '--prefix=' + prefix, 'HEAD', '-o', sourceZip], { cwd: root })
run('zip', ['-X', '-q', '-r', siteZip, '.'], { cwd: distDir })
run('unzip', ['-t', sourceZip])
run('unzip', ['-t', siteZip])

const tracked = run('git', ['ls-files', '-z'], { cwd: root })
const sourceFileCount = tracked ? tracked.split('\0').filter(Boolean).length : 0
const distFiles = await filesUnder(distDir)
const sourceInfo = await stat(sourceZip)
const siteInfo = await stat(siteZip)
const createdAtUtc = new Date().toISOString()
const qualityGates = (process.env.OSGARD_QA_GATES || 'preflight,build,qa:games-portal,qa:ecosystem,qa:privacy-consent,qa:games-model')
  .split(',').map((x) => x.trim()).filter(Boolean)

const manifest = {
  format: 'osgard-world-release-bundle/v1',
  packageName: pkg.name,
  packageVersion: pkg.version,
  sourceCommit: commit,
  sourceRef: ref,
  createdAtUtc,
  delivery: {
    sourceArchive: {
      file: sourceName,
      bytes: sourceInfo.size,
      sha256: await sha256(sourceZip),
      trackedSourceFiles: sourceFileCount,
      excludes: ['.git metadata', 'node_modules', 'dist build output', 'ignored local artifacts', 'untracked files'],
    },
    deployArchive: {
      file: siteName,
      bytes: siteInfo.size,
      sha256: await sha256(siteZip),
      builtFiles: distFiles.length,
      sourceDirectory: 'dist/',
    },
  },
  qualityGates,
  deploymentStatus: 'not-deployed-by-bundle-workflow',
  monetizationStatus: 'requires-production-provider-credentials-and-operator-approval',
}
await writeFile(join(outDir, 'bundle-manifest.json'), JSON.stringify(manifest, null, 2) + '\n')
const sums = [
  manifest.delivery.sourceArchive.sha256 + '  ' + sourceName,
  manifest.delivery.deployArchive.sha256 + '  ' + siteName,
]
await writeFile(join(outDir, 'SHA256SUMS.txt'), sums.join('\n') + '\n')
console.log(JSON.stringify({
  status: 'passed',
  outputDirectory: outDir,
  packageVersion: pkg.version,
  source: { file: sourceName, bytes: sourceInfo.size, sha256: manifest.delivery.sourceArchive.sha256, files: sourceFileCount },
  deploy: { file: siteName, bytes: siteInfo.size, sha256: manifest.delivery.deployArchive.sha256, files: distFiles.length },
  manifest: join(outDir, 'bundle-manifest.json'),
  sums: join(outDir, 'SHA256SUMS.txt'),
}, null, 2))
