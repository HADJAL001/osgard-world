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
  for (const path of ['luxury.css', 'daily-circuit.css', 'device-fit.css']) writeFileSync(join(root, path), longCss)
  for (const path of ['consented-analytics.js', 'commerce-client.js', 'luxury.js', 'daily-circuit.js', 'device-fit.js', 'experiment-core.js', 'experiment-runtime.js', 'deferred-enhancements.js']) writeFileSync(join(root, path), longJs)
  writeFileSync(join(root, 'nested', 'lazy.mjs'), longJs + '\nexport { pickTone }\n')

  const result = await optimizeGamesStaticAssets(root)
  assert.equal(result.minified.length, 10, 'All critical Games CSS/JS assets must be minified')
  assert.ok(result.minifiedBytesAfter < result.minifiedBytesBefore, 'Minification must reduce the critical asset byte count')
  assert.ok(result.compressed.length >= 7, 'Critical and lazy CSS/JS should have precompressed siblings')

  for (const item of result.compressed) {
    const sourcePath = join(root, item.path)
    const gzipPath = sourcePath + '.gz'
    assert.ok(existsSync(gzipPath), 'Precompressed asset is missing: ' + item.path + '.gz')
    assert.deepEqual(gunzipSync(readFileSync(gzipPath)), readFileSync(sourcePath), 'Gzip response must reproduce ' + item.path + ' exactly')
    assert.ok(item.gzipBytes < item.originalBytes, 'Gzip should save bytes for ' + item.path)
  }
  console.log('PASS Games static assets: ' + result.minified.length + ' minified, ' + result.compressed.length + ' gzip sidecars, ' + (result.compressedBytesBefore - result.compressedBytesAfter) + ' bytes saved.')
} finally {
  rmSync(root, { recursive: true, force: true })
}
