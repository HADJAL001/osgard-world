import assert from 'node:assert/strict'
import { execFileSync } from 'node:child_process'
import { readFileSync, existsSync } from 'node:fs'
import {
  CASE_ID, MAX_HISTORY, MAX_IMPORT_BYTES, PATINA_UPGRADE_VERSION,
  journalToCsv, journalToMarkdown, makeCaseReport, normalizeStats,
  recordCompletedCase, sanitizeCaseState, summarizeCase, validateCaseReportText
} from '../public/games/patina/atelier-upgrades-core.mjs'

const html = readFileSync('public/games/patina/index.html', 'utf8')
const ui = readFileSync('public/games/patina/atelier-upgrades.js', 'utf8')
const css = readFileSync('public/games/patina/atelier-upgrades.css', 'utf8')
const coreSource = readFileSync('public/games/patina/atelier-upgrades-core.mjs', 'utf8')
const requiredUi = [
  'patina-atelier-console','patina-undo','patina-redo','patina-restore-backup','patina-import',
  'patina-export','patina-copy-summary','patina-export-csv','patina-help-open','patina-contrast',
  'patina-text-size','patina-calm','patina-clear-stats','patina-stat-completed','patina-stat-best',
  'patina-stat-average','patina-stat-coverage','patina-stat-actions','patina-stat-duration',
  'patina-case-insight','patina-local-badges','patina-save-status','MAX_HISTORY','captureMutation',
  'Ctrl/Cmd','restoreBackup','resetCase','aria-live','MAX_IMPORT_BYTES','recordCompletedCase',
  'highContrast','largeText','calmMotion'
]
assert.ok(html.includes('./atelier-upgrades.css') && html.includes('type="module" src="./atelier-upgrades.js"'), 'PATINA page must load the self-hosted 2.0 UI')
assert.ok(html.includes('id="finish-case"') && html.includes('id="export-case"'), 'Existing PATINA actions must remain intact')
assert.ok(requiredUi.every(feature => ui.includes(feature)), 'PATINA console lacks one or more required capabilities')
assert.ok(css.includes('@media(max-width:560px)') && css.includes('prefers-reduced-motion:reduce') && css.includes('.patina-high-contrast'), 'PATINA accessibility/responsive styling is incomplete')
assert.ok(!ui.includes('fetch(') && !ui.includes('XMLHttpRequest') && !ui.includes('<script'), 'PATINA upgrade must not add network calls or injected scripts')
assert.ok(ui.includes('textContent') && !ui.includes('innerHTML'), 'Dynamic imported values must only use text-safe DOM APIs')
assert.ok(coreSource.includes('sanitizeCaseState') && coreSource.includes('MAX_IMPORT_BYTES = 128 * 1024') && coreSource.includes('schemaVersion: 2'), 'Import validation contract missing')
execFileSync(process.execPath, ['--check', 'public/games/patina/atelier-upgrades.js'])
execFileSync(process.execPath, ['--check', 'public/games/patina/atelier-upgrades-core.mjs'])

const startedAt = '2026-10-14T00:00:00.000Z'
const validState = {
  selected: 'A', actions: 5, authenticity: 100, clarity: 48, stability: 58, residue: 76, saltActivity: 68,
  diagnosed: { A: false, B: false, C: false }, treated: { A: false, B: false, C: false }, preserved: { A: false, B: false, C: false },
  journal: [], finished: false, startedAt, quality: null
}
const report = makeCaseReport(validState, '2026-10-14T00:01:00.000Z')
assert.equal(report.product, 'PATINA Atelier')
assert.equal(report.caseId, CASE_ID)
assert.equal(report.version, PATINA_UPGRADE_VERSION)
assert.equal(report.schemaVersion, 2)
assert.equal(validateCaseReportText(JSON.stringify(report)).ok, true, 'A valid current export must round-trip')
assert.equal(sanitizeCaseState(validState).actions, 5)
assert.equal(sanitizeCaseState({ ...validState, actions: 6 }), null, 'Action budget must be bounded')
assert.equal(sanitizeCaseState({ ...validState, authenticity: 1000 }), null, 'Metrics must be bounded')
assert.equal(sanitizeCaseState({ ...validState, selected: 'X' }), null, 'Unknown zones must be rejected')
assert.equal(sanitizeCaseState({ ...validState, diagnosed: { A: true, B: 1, C: false } }), null, 'Flags must be booleans')
assert.equal(sanitizeCaseState({ ...validState, journal: Array.from({ length: 41 }, () => ({})) }), null, 'Journal size must be bounded')
assert.equal(validateCaseReportText('{broken').ok, false, 'Malformed JSON must fail closed')
assert.equal(validateCaseReportText('x'.repeat(MAX_IMPORT_BYTES + 1)).ok, false, 'Oversized imports must fail closed')
assert.equal(validateCaseReportText(JSON.stringify({ ...report, product: 'other' })).ok, false, 'Other products must not be imported')
assert.equal(validateCaseReportText(JSON.stringify({ ...report, version: '999' })).ok, false, 'Unknown versions must be rejected')
assert.equal(validateCaseReportText(JSON.stringify({ ...report, schemaVersion: 1 })).ok, false, 'Unsupported current schemas must be rejected')
const legacy = { ...report, version: '1.9' }; delete legacy.schemaVersion
const migrated = validateCaseReportText(JSON.stringify(legacy))
assert.equal(migrated.ok, true, 'Previous 1.9 exports remain importable')
assert.equal(migrated.migrated, true, 'Legacy imports must be marked as migrated')
const journalState = { ...validState, journal: [{ time: '00:01', iso: '2026-10-14T00:01:00.000Z', title: 'Probe', detail: 'Removed, "quoted" residue', area: 'A', actionsLeft: 4 }] }
assert.ok(journalToCsv(journalState).includes('""quoted""'), 'CSV must quote embedded quotes safely')
assert.ok(journalToMarkdown(journalState).includes('не являются реальными измерениями'), 'Copied report must carry the simulation disclaimer')
assert.equal(MAX_HISTORY, 50, 'Undo/redo history must be bounded to 50 states')
const finishedState = {
  ...validState, actions: 2, authenticity: 90, clarity: 70, stability: 80,
  diagnosed: { A: true, B: true, C: false }, finished: true,
  quality: { score: 81, grade: 'B', coverage: 67, authenticity: 90, clarity: 70, stability: 80, completedAt: '2026-10-14T00:04:00.000Z' }
}
const emptyStats = normalizeStats(null)
const once = recordCompletedCase(emptyStats, finishedState)
assert.equal(once.completed, 1)
assert.equal(once.bestScore, 81)
assert.equal(once.grades.B, 1)
assert.equal(recordCompletedCase(once, finishedState).completed, 1, 'The same startedAt run must not be counted twice')
assert.equal(summarizeCase(finishedState).coverage, 67)
assert.equal(summarizeCase(finishedState).actionsUsed, 3)
assert.equal(normalizeStats({ completed: -4, bestScore: 1000 }).completed, 0, 'Stored counters must be normalized')
assert.ok(existsSync('public/games/patina/atelier-upgrades.js'))
console.log('PASS PATINA Atelier 2.0: undo/redo contract, local backup/export/import, 128 KiB cap, v1.9 migration, schema/range checks, stats dedupe, CSV/Markdown safety, accessibility controls and offline-only integration.')
