import assert from 'node:assert/strict'
import fs from 'node:fs'

const paths = process.argv.slice(2)
assert.ok(paths.length > 0, 'Pass at least one Lighthouse JSON report')
const names = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  seo: 'SEO',
}
let lowest = 100
for (const path of paths) {
  const json = JSON.parse(fs.readFileSync(path, 'utf8'))
  const label = path.includes('mobile') ? 'MOBILE' : path.includes('desktop') ? 'DESKTOP' : path
  console.log('\nLighthouse ' + label + ' — ' + json.finalDisplayedUrl)
  for (const [key, title] of Object.entries(names)) {
    const category = json.categories && json.categories[key]
    const score = category && typeof category.score === 'number' ? Math.round(category.score * 100) : null
    if (score === null) {
      console.log('  ' + title + ': not reported')
      continue
    }
    lowest = Math.min(lowest, score)
    console.log('  ' + title + ': ' + score + '/100')
  }
  const audits = json.audits || {}
  console.log('Core Web Vitals diagnostics:')
  for (const id of ['first-contentful-paint', 'largest-contentful-paint', 'speed-index', 'total-blocking-time', 'cumulative-layout-shift', 'interactive', 'uses-text-compression']) {
    const audit = audits[id]
    if (audit) console.log('  ' + id + ': score=' + audit.score + (audit.displayValue ? ', value=' + audit.displayValue : ''))
  }
  const issues = Object.values(audits).filter(a => a && a.score !== null && a.score < 1 && ['contrast','font-display','uses-text-compression','render-blocking-resources','uses-responsive-images','meta-description','document-title','html-has-lang'].some(key => (a.id || '').includes(key)))
  if (issues.length) console.log('  High-priority findings: ' + issues.map(a => a.id + ' (' + Math.round((a.score || 0) * 100) + ')').join(', '))
}
console.log('\nLowest measured category score: ' + lowest + '/100')
