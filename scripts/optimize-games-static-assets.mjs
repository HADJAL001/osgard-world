import { existsSync, readFileSync, readdirSync, statSync, writeFileSync } from 'node:fs'
import { extname, join, resolve } from 'node:path'
import { gzipSync, gunzipSync } from 'node:zlib'
import { pathToFileURL } from 'node:url'
import { transform } from 'esbuild'

const MINIFY_ASSETS = [
  'luxury.css',
  'daily-circuit.css',
  'device-fit.css',
  'consented-analytics.js',
  'commerce-client.js',
  'luxury.js',
  'daily-circuit.js',
  'device-fit.js',
  'experiment-core.js',
  'experiment-runtime.js',
  'deferred-enhancements.js',
]

function walk(directory) {
  const files = []
  for (const entry of readdirSync(directory)) {
    const path = join(directory, entry)
    if (statSync(path).isDirectory()) files.push(...walk(path))
    else files.push(path)
  }
  return files
}

export async function optimizeGamesStaticAssets(rootInput) {
  const root = resolve(rootInput)
  if (!existsSync(root) || !statSync(root).isDirectory()) {
    throw new Error('Games asset directory does not exist: ' + root)
  }

  const minified = []
  for (const relativePath of MINIFY_ASSETS) {
    const file = join(root, relativePath)
    if (!existsSync(file)) throw new Error('Required Games asset is missing: ' + relativePath)

    const original = readFileSync(file)
    const loader = extname(file) === '.css' ? 'css' : 'js'
    const result = await transform(original.toString('utf8'), {
      loader,
      minify: true,
      target: 'es2020',
    })
    const output = Buffer.from(result.code)
    if (!output.length) throw new Error('Minification produced an empty asset: ' + relativePath)
    writeFileSync(file, output)
    minified.push({ path: relativePath, before: original.length, after: output.length })
  }

  const compressed = []
  for (const file of walk(root)) {
    if (!/\.(?:css|js|mjs)$/.test(file)) continue

    const original = readFileSync(file)
    const gzipPath = file + '.gz'
    if (existsSync(gzipPath)) {
      throw new Error('Refusing to overwrite an existing precompressed asset: ' + gzipPath)
    }

    const gzip = gzipSync(original, { level: 9 })
    if (gzip.length >= original.length) continue

    const roundTrip = gunzipSync(gzip)
    if (!roundTrip.equals(original)) {
      throw new Error('Gzip round-trip validation failed for: ' + file)
    }
    writeFileSync(gzipPath, gzip)
    compressed.push({
      path: file.slice(root.length + 1),
      originalBytes: original.length,
      gzipBytes: gzip.length,
    })
  }

  const before = minified.reduce((sum, item) => sum + item.before, 0)
  const after = minified.reduce((sum, item) => sum + item.after, 0)
  const originalBytes = compressed.reduce((sum, item) => sum + item.originalBytes, 0)
  const gzipBytes = compressed.reduce((sum, item) => sum + item.gzipBytes, 0)
  return {
    minified,
    compressed,
    minifiedBytesBefore: before,
    minifiedBytesAfter: after,
    compressedBytesBefore: originalBytes,
    compressedBytesAfter: gzipBytes,
  }
}

async function main() {
  const root = process.argv[2] || 'dist/games'
  const result = await optimizeGamesStaticAssets(root)
  const minifySavings = result.minifiedBytesBefore - result.minifiedBytesAfter
  const gzipSavings = result.compressedBytesBefore - result.compressedBytesAfter
  console.log(
    'Games static assets prepared: ' +
    result.minified.length + ' critical assets minified (' +
    minifySavings + ' bytes saved); ' +
    result.compressed.length + ' CSS/JS assets precompressed (' +
    gzipSavings + ' bytes saved before transfer).'
  )
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  main().catch(error => {
    console.error(error instanceof Error ? error.message : String(error))
    process.exitCode = 1
  })
}
