import assert from 'node:assert/strict'
import { mkdtempSync, mkdirSync, readFileSync, rmSync, writeFileSync, existsSync } from 'node:fs'
import { tmpdir } from 'node:os'
import { join } from 'node:path'
import { gunzipSync } from 'node:zlib'
import { optimizeGamesStaticAssets } from './optimize-games-static-assets.mjs'

const root = mkdtempSync(join(tmpdir(), 'osgard-games-assets-'))
try {
  mkdirSync(join(root, 'nested'), { recursive: true })
  const longCss = Array.from({ length: 100 }, (_, i) =>
    '.sample-' + i + ' { color: #65eaff; margin: ' + (i % 12) + 'px; padding: ' + (i % 9) + 'px; border: 1px solid #302f50; }'
  ).join('\n')
  const longJs = 'const tones=[' + Array.from({ length: 300 }, (_, i) => "'tone-" + i + "'").join(',') + '];\nfunction pickTone(n) { return tones[Math.max(0, Math.min(tones.length - 1, n))]; }\n'
  const catalogRuntime = readFileSync('public/games/catalog-runtime.js', 'utf8')
  assert.ok(catalogRuntime.length > 1000 && catalogRuntime.includes("const endpoint = '/commerce-api/v1/game-catalog'"), 'The live Games catalogue runtime must exist in source and use only its same-origin API')
  writeFileSync(join(root, 'catalog-runtime.js'), catalogRuntime)
  for (const path of ['luxury.css', 'daily-circuit.css', 'device-fit.css']) writeFileSync(join(root, path), longCss)
  for (const path of ['consented-analytics.js', 'commerce-client.js', 'luxury.js', 'daily-circuit.js', 'device-fit.js', 'experiment-core.js', 'experiment-runtime.js']) writeFileSync(join(root, path), longJs)
  writeFileSync(join(root, 'nested', 'lazy.mjs'), longJs + '\nexport { pickTone }\n')

  const result = await optimizeGamesStaticAssets(root)
  assert.equal(result.minified.length, 11, 'All critical Games CSS/JS assets, including the catalogue runtime, must be minified')
  assert.ok(result.minified.some(item => item.path === 'catalog-runtime.js' && item.after > 1000), 'The catalogue runtime must stay non-empty after minification')
  assert.ok(result.minifiedBytesAfter < result.minifiedBytesBefore, 'Minification must reduce the critical asset byte count')
  assert.ok(result.compressed.length >= 7, 'Critical and lazy CSS/JS should have precompressed siblings')
  assert.ok(result.compressed.some(item => item.path === 'catalog-runtime.js'), 'The catalogue runtime must be shipped with a precompressed sibling')

  for (const item of result.compressed) {
    const sourcePath = join(root, item.path)
    const gzipPath = sourcePath + '.gz'
    assert.ok(existsSync(gzipPath), 'Precompressed asset is missing: ' + item.path + '.gz')
    assert.deepEqual(gunzipSync(readFileSync(gzipPath)), readFileSync(sourcePath), 'Gzip response must reproduce ' + item.path + ' exactly')
    assert.ok(item.gzipBytes < item.originalBytes, 'Gzip should save bytes for ' + item.path)
  }
  const catalogAsset = readFileSync(join(root, 'catalog-runtime.js'))
  assert.ok(catalogAsset.length > 1000 && catalogAsset.toString('utf8').includes('textContent = item.title'), 'The catalogue runtime must not become an empty/placeholder asset during optimization')
  assert.deepEqual(gunzipSync(readFileSync(join(root, 'catalog-runtime.js.gz'))), catalogAsset, 'The published catalogue gzip must exactly match the non-empty source')
  console.log('PASS Games static assets: ' + result.minified.length + ' minified, ' + result.compressed.length + ' gzip sidecars, ' + (result.compressedBytesBefore - result.compressedBytesAfter) + ' bytes saved.')
} finally {
  rmSync(root, { recursive: true, force: true })
}
