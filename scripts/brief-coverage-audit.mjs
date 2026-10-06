import fs from 'node:fs'
import crypto from 'node:crypto'

const sourcePath = process.argv[2]
if (!sourcePath) {
  console.error('Usage: node scripts/brief-coverage-audit.mjs <brief-file>')
  process.exit(2)
}

const source = fs.readFileSync(sourcePath)
const text = source.toString('utf8')
const lines = text.split(/\r?\n/)
const sections = [...text.matchAll(/^\s*#\s+(\d+)\b/gm)].map((match) => Number(match[1]))
const uniqueSections = [...new Set(sections)].sort((a, b) => a - b)
const expected = Array.from({ length: 255 }, (_, index) => index + 1)
const missing = expected.filter((number) => !uniqueSections.includes(number))
const extra = uniqueSections.filter((number) => number < 0 || number > 255)
const result = {
  file: sourcePath,
  lines: lines.length,
  bytes: source.byteLength,
  sha256: crypto.createHash('sha256').update(source).digest('hex'),
  headingCount: uniqueSections.length,
  numberedSections: uniqueSections.filter((number) => number >= 1).length,
  preambleSections: uniqueSections.filter((number) => number === 0),
  missing,
  extra,
  status: uniqueSections.length === 255 && missing.length === 0 && extra.length === 0 ? 'ready' : 'not-ready',
}
console.log(JSON.stringify(result, null, 2))
if (result.status !== 'ready') process.exit(1)
