import { createHash } from 'node:crypto'
import { stat, readdir, readFile, writeFile } from 'node:fs/promises'
import { join, relative } from 'node:path'

const root = process.argv[2] || 'dist'
const required = ['index.html', 'assets']
const files = []
async function walk(directory) {
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name)
    if (entry.isDirectory()) await walk(path)
    else files.push(path)
  }
}
await walk(root)
for (const item of required) await stat(join(root, item))
if (!files.some(file => file.endsWith('.html'))) throw new Error('archive has no html entrypoint')
const hash = createHash('sha256')
let bytes = 0
for (const file of files.sort()) { const data = await readFile(file); bytes += data.length; hash.update(relative(root, file).replaceAll('\\', '/') + '\0'); hash.update(data) }
const report = { root, files: files.length, bytes, sha256: hash.digest('hex'), status: 'ready' }
await writeFile(process.env.OSGARD_FRONTEND_MANIFEST || 'release-manifest.json', `${JSON.stringify({ ...report, generatedAt: new Date().toISOString() }, null, 2)}\n`)
console.log(JSON.stringify(report, null, 2))
