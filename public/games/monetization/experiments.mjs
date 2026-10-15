export const EXPERIMENT_LEDGER_KIND = 'osgard-revenue-experiment-ledger';
export const EXPERIMENT_LEDGER_VERSION = 1;
export const MAX_EXPERIMENTS = 40;
export const MAX_EXPERIMENT_BACKUP_BYTES = 500_000;

export const EXPERIMENT_DRIVERS = Object.freeze([
  { key: 'monthlyVisitors', label: 'Стартовый трафик', unit: 'visitors', direction: 'increase' },
  { key: 'gameStartRate', label: 'Конверсия в запуск игры', unit: '%', direction: 'increase' },
  { key: 'sessionsPerPlayer', label: 'Сессии на игрока', unit: 'sessions', direction: 'increase' },
  { key: 'adFillRate', label: 'Заполнение рекламных мест', unit: '%', direction: 'increase' },
  { key: 'ecpmUsd', label: 'Рекламный eCPM', unit: 'USD', direction: 'increase' },
  { key: 'paidConversionRate', label: 'Конверсия в покупку', unit: '%', direction: 'increase' },
  { key: 'subscriptionConversionRatePct', label: 'Конверсия в Premium', unit: '%', direction: 'increase' },
  { key: 'subscriptionMonthlyChurnPct', label: 'Месячный отток Premium', unit: '%', direction: 'decrease' },
  { key: 'leadRate', label: 'Конверсия в заявку', unit: '%', direction: 'increase' },
  { key: 'leadCloseRate', label: 'Закрытие заявок в проекты', unit: '%', direction: 'increase' },
  { key: 'maxProjectsPerMonth', label: 'Мощность команды', unit: 'projects', direction: 'increase' },
  { key: 'averageProjectValueUsd', label: 'Средний чек проекта', unit: 'USD', direction: 'increase' },
  { key: 'monthlyOperatingCostUsd', label: 'Операционные расходы', unit: 'USD', direction: 'decrease' },
]);

const STATUS = new Set(['planned', 'running', 'completed', 'cancelled']);
const CONTROL = /[\u0000-\u001f\u007f]/g;
const ID_RE = /^[A-Za-z0-9_-]{1,80}$/;
const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;

function cleanText(value, maxLength) {
  return String(value ?? '').replace(CONTROL, ' ').replace(/\s+/g, ' ').trim().slice(0, maxLength);
}
function finiteBounded(value, label, min = -1e12, max = 1e12) {
  const number = Number(value);
  if (!Number.isFinite(number) || number < min || number > max) {
    throw new TypeError(label + ' должен быть конечным числом в допустимом диапазоне.');
  }
  return number;
}
function validDate(value) {
  if (value === '' || value === null || value === undefined) return '';
  const text = String(value);
  if (!DATE_RE.test(text) || !Number.isFinite(Date.parse(text + 'T00:00:00Z'))) {
    throw new TypeError('Дата эксперимента должна быть в формате YYYY-MM-DD.');
  }
  const parsed = new Date(text + 'T00:00:00Z');
  if (parsed.toISOString().slice(0, 10) !== text) throw new TypeError('Указана несуществующая календарная дата.');
  return text;
}
export function createExperiment(draft = {}, options = {}) {
  const title = cleanText(draft.title, 80);
  const hypothesis = cleanText(draft.hypothesis, 320);
  const driver = String(draft.driver || '');
  const direction = String(draft.direction || '');
  if (title.length < 3) throw new TypeError('Название эксперимента должно содержать не менее 3 символов.');
  if (hypothesis.length < 8) throw new TypeError('Опиши гипотезу хотя бы в 8 символах.');
  if (!EXPERIMENT_DRIVERS.some(item => item.key === driver)) throw new TypeError('Неизвестный показатель эксперимента.');
  if (!['increase', 'decrease'].includes(direction)) throw new TypeError('Выбери направление изменения показателя.');
  const baseline = finiteBounded(draft.baseline, 'Базовое значение', 0, 1e12);
  const target = finiteBounded(draft.target, 'Целевое значение', 0, 1e12);
  if (target === baseline) throw new TypeError('Целевое значение должно отличаться от базового.');
  const dueDate = validDate(draft.dueDate);
  const nowValue = options.now ?? new Date().toISOString();
  const now = new Date(nowValue);
  if (!Number.isFinite(now.getTime())) throw new TypeError('Некорректная дата создания эксперимента.');
  const id = String(options.id ?? ('exp_' + now.getTime().toString(36) + '_' + Math.random().toString(36).slice(2, 10)));
  if (!ID_RE.test(id)) throw new TypeError('Некорректный идентификатор эксперимента.');
  return {
    schema: 'osgard.experiment.v1',
    id,
    title,
    hypothesis,
    driver,
    direction,
    baseline,
    target,
    actual: null,
    status: 'planned',
    dueDate,
    createdAt: now.toISOString(),
    updatedAt: now.toISOString(),
    completedAt: null,
    targetAchieved: null,
  };
}
export function normalizeExperiment(item) {
  if (!item || typeof item !== 'object' || Array.isArray(item) ||
      item.schema !== 'osgard.experiment.v1' ||
      typeof item.id !== 'string' || !ID_RE.test(item.id) ||
      !STATUS.has(item.status) ||
      !EXPERIMENT_DRIVERS.some(driver => driver.key === item.driver) ||
      !['increase', 'decrease'].includes(item.direction)) return null;
  try {
    const baseline = finiteBounded(item.baseline, 'Базовое значение', 0, 1e12);
    const target = finiteBounded(item.target, 'Целевое значение', 0, 1e12);
    if (baseline === target) return null;
    const title = cleanText(item.title, 80);
    const hypothesis = cleanText(item.hypothesis, 320);
    if (title.length < 3 || hypothesis.length < 8) return null;
    const created = new Date(item.createdAt);
    const updated = new Date(item.updatedAt);
    if (!Number.isFinite(created.getTime()) || !Number.isFinite(updated.getTime())) return null;
    const dueDate = validDate(item.dueDate || '');
    const actual = item.actual === null || item.actual === undefined || item.actual === ''
      ? null : finiteBounded(item.actual, 'Фактическое значение', 0, 1e12);
    if (item.status === 'completed' && actual === null) return null;
    const completedAt = item.completedAt === null || item.completedAt === undefined
      ? null : new Date(item.completedAt).toISOString();
    const targetAchieved = actual === null ? null
      : (item.direction === 'increase' ? actual >= target : actual <= target);
    return {
      schema: 'osgard.experiment.v1',
      id: item.id,
      title,
      hypothesis,
      driver: item.driver,
      direction: item.direction,
      baseline,
      target,
      actual,
      status: item.status,
      dueDate,
      createdAt: created.toISOString(),
      updatedAt: updated.toISOString(),
      completedAt,
      targetAchieved,
    };
  } catch {
    return null;
  }
}
export function transitionExperiment(item, status, options = {}) {
  const normalized = normalizeExperiment(item);
  if (!normalized) throw new TypeError('Невозможно изменить повреждённую запись эксперимента.');
  if (!STATUS.has(status)) throw new TypeError('Неизвестный статус эксперимента.');
  if (normalized.status === 'completed' || normalized.status === 'cancelled') {
    throw new TypeError('Завершённый или отменённый эксперимент нельзя повторно запустить.');
  }
  if (status === 'completed') throw new TypeError('Для завершения запиши фактическое значение.');
  if (status === 'planned' && normalized.status === 'running') {
    // Reopening an in-progress run is allowed; the user can revise the test before starting again.
  }
  const now = new Date(options.now ?? new Date().toISOString());
  if (!Number.isFinite(now.getTime())) throw new TypeError('Некорректное время перехода.');
  return { ...normalized, status, updatedAt: now.toISOString() };
}
export function completeExperiment(item, actualValue, options = {}) {
  const normalized = normalizeExperiment(item);
  if (!normalized || ['completed', 'cancelled'].includes(normalized.status)) {
    throw new TypeError('Невозможно завершить этот эксперимент.');
  }
  const actual = finiteBounded(actualValue, 'Фактическое значение', 0, 1e12);
  const now = new Date(options.now ?? new Date().toISOString());
  if (!Number.isFinite(now.getTime())) throw new TypeError('Некорректное время завершения.');
  return {
    ...normalized,
    actual,
    status: 'completed',
    updatedAt: now.toISOString(),
    completedAt: now.toISOString(),
    targetAchieved: normalized.direction === 'increase' ? actual >= normalized.target : actual <= normalized.target,
  };
}
export function normalizeExperimentCollection(items) {
  if (!Array.isArray(items)) return [];
  const normalized = [];
  const ids = new Set();
  for (const item of items.slice(0, 500)) {
    const entry = normalizeExperiment(item);
    if (entry && !ids.has(entry.id)) {
      ids.add(entry.id);
      normalized.push(entry);
      if (normalized.length >= MAX_EXPERIMENTS) break;
    }
  }
  return normalized.sort((a, b) => Date.parse(b.createdAt) - Date.parse(a.createdAt));
}
export function summarizeExperiments(items = [], nowValue = new Date().toISOString()) {
  const entries = normalizeExperimentCollection(items);
  const completed = entries.filter(item => item.status === 'completed');
  const successful = completed.filter(item => item.targetAchieved === true);
  const pending = entries.filter(item => ['planned', 'running'].includes(item.status));
  const overdue = pending.filter(item => item.dueDate && item.dueDate < String(nowValue).slice(0, 10));
  const lifts = completed.map(item => item.baseline === 0 ? null : ((item.actual - item.baseline) / Math.abs(item.baseline)) * 100)
    .filter(value => Number.isFinite(value));
  return {
    total: entries.length,
    planned: entries.filter(item => item.status === 'planned').length,
    running: entries.filter(item => item.status === 'running').length,
    completed: completed.length,
    cancelled: entries.filter(item => item.status === 'cancelled').length,
    overdue: overdue.length,
    targetHitRatePct: completed.length ? successful.length / completed.length * 100 : null,
    averageObservedLiftPct: lifts.length ? lifts.reduce((sum, value) => sum + value, 0) / lifts.length : null,
  };
}
export function createExperimentBackup(items = [], options = {}) {
  const entries = normalizeExperimentCollection(items);
  return {
    kind: EXPERIMENT_LEDGER_KIND,
    version: EXPERIMENT_LEDGER_VERSION,
    generatedAt: new Date(options.now ?? new Date().toISOString()).toISOString(),
    entries,
  };
}
export function parseExperimentBackup(raw) {
  if (typeof raw !== 'string' || new TextEncoder().encode(raw).length > MAX_EXPERIMENT_BACKUP_BYTES) {
    throw new TypeError('JSON журнала больше 500 КБ или имеет неверный формат.');
  }
  let payload;
  try { payload = JSON.parse(raw); } catch { throw new TypeError('Файл журнала не является корректным JSON.'); }
  if (!payload || payload.kind !== EXPERIMENT_LEDGER_KIND || payload.version !== EXPERIMENT_LEDGER_VERSION ||
      !Array.isArray(payload.entries) || payload.entries.length > 500) {
    throw new TypeError('Файл журнала не соответствует поддерживаемой схеме.');
  }
  const normalized = normalizeExperimentCollection(payload.entries);
  if (normalized.length !== payload.entries.length) {
    throw new TypeError('Импорт содержит повреждённые или дублирующиеся записи.');
  }
  return normalized;
}
