export const PATINA_UPGRADE_VERSION = '2.0.0';
export const MAX_HISTORY = 50;
export const MAX_IMPORT_BYTES = 128 * 1024;
export const CASE_ID = 'ceramic-bird-1898-001';
const ZONES = ['A', 'B', 'C'];
const GRADES = ['A', 'B', 'C', 'D'];
const isRecord = (value) => value !== null && typeof value === 'object' && !Array.isArray(value);
const isFiniteIn = (value, min, max) => typeof value === 'number' && Number.isFinite(value) && value >= min && value <= max;
const cleanText = (value, limit) => typeof value === 'string' ? value.replace(/[\u0000-\u0008\u000b\u000c\u000e-\u001f]/g, '').slice(0, limit) : '';
const validIso = (value) => typeof value === 'string' && value.length <= 40 && Number.isFinite(Date.parse(value));
const cleanFlags = (value) => {
  if (!isRecord(value)) return null;
  const out = {};
  for (const zone of ZONES) {
    if (typeof value[zone] !== 'boolean') return null;
    out[zone] = value[zone];
  }
  return out;
};
export function sanitizeCaseState(input) {
  if (!isRecord(input) || !ZONES.includes(input.selected)) return null;
  if (!Number.isInteger(input.actions) || input.actions < 0 || input.actions > 5) return null;
  for (const key of ['authenticity', 'clarity', 'stability', 'residue', 'saltActivity']) if (!isFiniteIn(input[key], 0, 100)) return null;
  if (!validIso(input.startedAt)) return null;
  const diagnosed = cleanFlags(input.diagnosed), treated = cleanFlags(input.treated), preserved = cleanFlags(input.preserved);
  if (!diagnosed || !treated || !preserved || !Array.isArray(input.journal) || input.journal.length > 40) return null;
  const journal = [];
  for (const entry of input.journal) {
    if (!isRecord(entry) || !validIso(entry.iso) || (!ZONES.includes(entry.area) && entry.area !== 'CASE')) return null;
    if (!Number.isInteger(entry.actionsLeft) || entry.actionsLeft < 0 || entry.actionsLeft > 5) return null;
    journal.push({ time: cleanText(entry.time, 12), iso: entry.iso, title: cleanText(entry.title, 100), detail: cleanText(entry.detail, 800), area: entry.area, actionsLeft: entry.actionsLeft });
  }
  if (typeof input.finished !== 'boolean') return null;
  let quality = null;
  if (input.quality !== null && input.quality !== undefined) {
    if (!isRecord(input.quality) || !Number.isInteger(input.quality.score) || input.quality.score < 0 || input.quality.score > 100 ||
        !GRADES.includes(input.quality.grade) || !isFiniteIn(input.quality.coverage, 0, 100) ||
        !isFiniteIn(input.quality.authenticity, 0, 100) || !isFiniteIn(input.quality.clarity, 0, 100) ||
        !isFiniteIn(input.quality.stability, 0, 100) || !validIso(input.quality.completedAt)) return null;
    quality = { score: input.quality.score, grade: input.quality.grade, coverage: input.quality.coverage, authenticity: input.quality.authenticity, clarity: input.quality.clarity, stability: input.quality.stability, completedAt: input.quality.completedAt };
  }
  if (input.finished && !quality) return null;
  return { selected: input.selected, actions: input.actions, authenticity: input.authenticity, clarity: input.clarity, stability: input.stability, residue: input.residue, saltActivity: input.saltActivity, diagnosed, treated, preserved, journal, finished: input.finished, startedAt: input.startedAt, quality };
}
export function makeCaseReport(state, exportedAt = new Date().toISOString()) {
  const safe = sanitizeCaseState(state);
  if (!safe) throw new TypeError('The case state is not valid.');
  return { product: 'PATINA Atelier', version: PATINA_UPGRADE_VERSION, schemaVersion: 2, caseId: CASE_ID, simulationOnly: true, startedAt: safe.startedAt, exportedAt: validIso(exportedAt) ? exportedAt : new Date().toISOString(), state: safe, notice: 'Simulation values only; not a real conservation assessment.' };
}
export function validateCaseReportText(text) {
  if (typeof text !== 'string') return { ok: false, error: 'Файл должен быть текстом JSON.' };
  if (new TextEncoder().encode(text).byteLength > MAX_IMPORT_BYTES) return { ok: false, error: 'Файл превышает 128 KiB.' };
  let report;
  try { report = JSON.parse(text); } catch { return { ok: false, error: 'Файл не является корректным JSON.' }; }
  if (!isRecord(report) || report.product !== 'PATINA Atelier' || report.caseId !== CASE_ID || report.simulationOnly !== true) return { ok: false, error: 'Файл не является отчётом PATINA Atelier.' };
  if (!['1.9', PATINA_UPGRADE_VERSION].includes(report.version)) return { ok: false, error: 'Версия отчёта не поддерживается.' };
  if (report.version === PATINA_UPGRADE_VERSION && report.schemaVersion !== 2) return { ok: false, error: 'Неверная версия схемы отчёта.' };
  const state = sanitizeCaseState(report.state);
  if (!state) return { ok: false, error: 'Состояние дела не прошло проверку диапазонов и структуры.' };
  return { ok: true, report: makeCaseReport(state, validIso(report.exportedAt) ? report.exportedAt : new Date().toISOString()), migrated: report.version === '1.9' };
}
export function normalizeStats(input) {
  const zeroGrades = { A: 0, B: 0, C: 0, D: 0 };
  if (!isRecord(input)) return { completed: 0, scoreTotal: 0, bestScore: 0, totalActions: 0, diagnosedZones: 0, grades: zeroGrades, lastCompletedAt: '', runIds: [] };
  const grades = {};
  for (const grade of GRADES) grades[grade] = Number.isSafeInteger(input.grades?.[grade]) && input.grades[grade] >= 0 ? Math.min(input.grades[grade], 1000000) : 0;
  return { completed: Number.isSafeInteger(input.completed) && input.completed >= 0 ? Math.min(input.completed, 1000000) : 0, scoreTotal: Number.isSafeInteger(input.scoreTotal) && input.scoreTotal >= 0 ? Math.min(input.scoreTotal, 100000000) : 0, bestScore: Number.isSafeInteger(input.bestScore) && input.bestScore >= 0 && input.bestScore <= 100 ? input.bestScore : 0, totalActions: Number.isSafeInteger(input.totalActions) && input.totalActions >= 0 ? Math.min(input.totalActions, 5000000) : 0, diagnosedZones: Number.isSafeInteger(input.diagnosedZones) && input.diagnosedZones >= 0 ? Math.min(input.diagnosedZones, 3000000) : 0, grades, lastCompletedAt: validIso(input.lastCompletedAt) ? input.lastCompletedAt : '', runIds: Array.isArray(input.runIds) ? input.runIds.filter((id) => typeof id === 'string' && validIso(id)).slice(-500) : [] };
}
export function recordCompletedCase(currentStats, state) {
  const safe = sanitizeCaseState(state), stats = normalizeStats(currentStats);
  if (!safe || !safe.finished || !safe.quality || stats.runIds.includes(safe.startedAt)) return stats;
  const grades = { ...stats.grades, [safe.quality.grade]: stats.grades[safe.quality.grade] + 1 };
  return normalizeStats({ completed: stats.completed + 1, scoreTotal: stats.scoreTotal + safe.quality.score, bestScore: Math.max(stats.bestScore, safe.quality.score), totalActions: stats.totalActions + (5 - safe.actions), diagnosedZones: stats.diagnosedZones + ZONES.filter((zone) => safe.diagnosed[zone]).length, grades, lastCompletedAt: safe.quality.completedAt, runIds: [...stats.runIds, safe.startedAt].slice(-500) });
}
export function summarizeCase(state, now = Date.now()) {
  const safe = sanitizeCaseState(state);
  if (!safe) return null;
  const zonesDone = ZONES.filter((zone) => safe.diagnosed[zone]).length;
  const score = safe.quality?.score ?? Math.round(safe.authenticity * 0.4 + safe.stability * 0.3 + safe.clarity * 0.2 + zonesDone / 3 * 10);
  const start = Date.parse(safe.startedAt), end = safe.quality ? Date.parse(safe.quality.completedAt) : now;
  return { score: Math.min(100, Math.max(0, score)), grade: safe.quality?.grade || (score >= 90 ? 'A' : score >= 78 ? 'B' : score >= 60 ? 'C' : 'D'), coverage: Math.round(zonesDone / 3 * 100), zonesDiagnosed: zonesDone, actionsUsed: 5 - safe.actions, durationSeconds: Number.isFinite(start) && Number.isFinite(end) ? Math.max(0, Math.min(604800, Math.floor((end - start) / 1000))) : 0, authenticityChange: safe.authenticity - 100, clarityChange: safe.clarity - 48, stabilityChange: safe.stability - 58, finished: safe.finished };
}
export function journalToCsv(state) {
  const safe = sanitizeCaseState(state);
  if (!safe) throw new TypeError('The case state is not valid.');
  const quote = (value) => '"' + String(value ?? '').replace(/"/g, '""') + '"';
  return ['time,iso,title,detail,area,actionsLeft', ...safe.journal.map((entry) => [entry.time, entry.iso, entry.title, entry.detail, entry.area, entry.actionsLeft].map(quote).join(','))].join('\r\n');
}
export function journalToMarkdown(state) {
  const safe = sanitizeCaseState(state);
  if (!safe) throw new TypeError('The case state is not valid.');
  const summary = summarizeCase(safe);
  return ['# PATINA Atelier — локальное дело', '', 'Это учебная симуляция. Показатели не являются реальными измерениями состояния предмета.', '', '- Оценка: ' + summary.score + '/100 (' + summary.grade + ')', '- Диагностическое покрытие: ' + summary.coverage + '%', '- Подлинность (модель): ' + safe.authenticity + '/100', '- Читаемость (модель): ' + safe.clarity + '/100', '- Стабильность (модель): ' + safe.stability + '/100', '- Потрачено действий: ' + summary.actionsUsed + '/5', '', '## Журнал', ...safe.journal.map((entry) => '- [' + entry.time + '] ' + entry.area + ' — ' + entry.title + ': ' + entry.detail)].join('\n');
}
