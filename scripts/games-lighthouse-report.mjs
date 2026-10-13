import fs from 'node:fs'
import path from 'node:path'
import { pathToFileURL } from 'node:url'

const categoryNames = {
  performance: 'Performance',
  accessibility: 'Accessibility',
  'best-practices': 'Best Practices',
  seo: 'SEO',
}

const guardrails = {
  mobile: {
    performance: 85,
    accessibility: 90,
    'best-practices': 90,
    seo: 90,
    maxTbtMs: 500,
    maxLcpMs: 4000,
  },
  desktop: {
    performance: 90,
    accessibility: 90,
    'best-practices': 90,
    seo: 90,
    maxTbtMs: 300,
    maxLcpMs: 3000,
  },
}

export function assessReport(json, label) {
  const mode = label.toLowerCase().includes('mobile') ? 'mobile' : 'desktop'
  const limits = guardrails[mode]
  const issues = []
  const scores = {}

  for (const [key, name] of Object.entries(categoryNames)) {
    const raw = json.categories?.[key]?.score
    if (typeof raw !== 'number') {
      issues.push(name + ': missing score in report')
      continue
    }
    const score = Math.round(raw * 100)
    scores[key] = score
    if (score < limits[key]) issues.push(name + ' below guardrail: ' + score + '/100 (minimum ' + limits[key] + ')')
  }

  const targetSizeRaw = json.audits?.['target-size']?.score
  const targetSizeScore = typeof targetSizeRaw === 'number' ? targetSizeRaw : null
  if (targetSizeScore === null) issues.push('Touch target size audit score is missing')
  else if (targetSizeScore < 1) issues.push('Touch target size audit failed: score ' + targetSizeScore + '/1')

  const tbt = json.audits?.['total-blocking-time']?.numericValue
  const lcp = json.audits?.['largest-contentful-paint']?.numericValue
  const tbtMs = typeof tbt === 'number' ? tbt : null
  const lcpMs = typeof lcp === 'number' ? lcp : null

  if (tbtMs === null) issues.push('Total Blocking Time metric is missing')
  else if (tbtMs > limits.maxTbtMs) issues.push('Total Blocking Time above guardrail: ' + Math.round(tbtMs) + ' ms (maximum ' + limits.maxTbtMs + ' ms)')

  if (lcpMs === null) issues.push('Largest Contentful Paint metric is missing')
  else if (lcpMs > limits.maxLcpMs) issues.push('Largest Contentful Paint above guardrail: ' + (lcpMs / 1000).toFixed(2) + ' s (maximum ' + (limits.maxLcpMs / 1000).toFixed(1) + ' s)')

  return {
    label: mode.toUpperCase(),
    url: json.finalDisplayedUrl ?? '(URL missing from report)',
    scores,
    tbtMs,
    lcpMs,
    targetSizeScore,
    issues,
    pass: issues.length === 0,
  }
}

function main(paths) {
  if (paths.length !== 2) {
    console.error('Usage: node scripts/games-lighthouse-report.mjs <mobile-report.json> <desktop-report.json>')
    process.exitCode = 2
    return
  }

  const results = paths.map(file => {
    const json = JSON.parse(fs.readFileSync(file, 'utf8'))
    const label = path.basename(file)
    return assessReport(json, label)
  })

  for (const result of results) {
    console.log('\nOSGARD GAMES Lighthouse ' + result.label + ' — ' + result.url)
    for (const [key, title] of Object.entries(categoryNames)) {
      console.log('  ' + title + ': ' + (result.scores[key] === undefined ? 'not reported' : result.scores[key] + '/100'))
    }
    console.log('  Total Blocking Time: ' + (result.tbtMs === null ? 'not reported' : Math.round(result.tbtMs) + ' ms'))
    console.log('  Largest Contentful Paint: ' + (result.lcpMs === null ? 'not reported' : (result.lcpMs / 1000).toFixed(2) + ' s'))
    console.log('  Touch target size: ' + (result.targetSizeScore === null ? 'not reported' : result.targetSizeScore === 1 ? 'PASS (1/1)' : 'FAIL (' + result.targetSizeScore + '/1)'))
    if (result.issues.length) {
      for (const issue of result.issues) console.error('  GUARDRAIL: ' + issue)
    } else {
      console.log('  Guardrails: PASS')
    }
  }

  const failed = results.filter(result => !result.pass)
  console.log('\nOSGARD GAMES Lighthouse guardrails: ' + (failed.length ? 'FAIL' : 'PASS'))
  if (failed.length) process.exitCode = 1
}

if (process.argv[1] && import.meta.url === pathToFileURL(path.resolve(process.argv[1])).href) {
  main(process.argv.slice(2))
}
