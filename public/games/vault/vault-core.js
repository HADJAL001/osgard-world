(function (root) {
  'use strict';

  const FORMAT = 'osgard-player-vault';
  const SCHEMA_VERSION = 1;
  const MAX_BACKUP_BYTES = 1024 * 1024;
  const MAX_ENTRY_BYTES = 256 * 1024;
  const GAME_IDS = new Set([
    'time', 'swarm', 'null-shift', 'inherit', 'remix', 'civic-cascade',
    'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid'
  ]);
  const TOOL_IDS = new Set(['tree', 'stone', 'light', 'path']);
  const STATIC_KEYS = [
    { id: 'catalog-favorites', key: 'osgard.games.favorites.v1' },
    { id: 'inherit-world', key: 'inherit-world-v1' },
    { id: 'inherit-author', key: 'inherit-author' },
    { id: 'inherit-last-passed', key: 'inherit-last-passed' },
    { id: 'inherit-journey', key: 'inherit-journey' },
    { id: 'signal-run-streak', key: 'osgard.signal-run.daily-streak.v1' }
  ];
  const STATIC_KEY_MAP = new Map(STATIC_KEYS.map(item => [item.key, item.id]));
  const DYNAMIC_BEST_RE = /^osgard\.signal-run\.daily-best\.(\d{4}-\d{2}-\d{2})$/;
  const DATE_RE = /^\d{4}-\d{2}-\d{2}$/;
  const SAFE_BACKUP_FIELDS = new Set([
    'format', 'schemaVersion', 'product', 'createdAt', 'storage', 'entries', 'note', 'integrity'
  ]);

  function isRecord(value) {
    return value !== null && typeof value === 'object' && !Array.isArray(value);
  }
  function validDate(value) {
    if (typeof value !== 'string' || !DATE_RE.test(value)) return false;
    const parsed = new Date(value + 'T00:00:00.000Z');
    return Number.isFinite(parsed.getTime()) && parsed.toISOString().slice(0, 10) === value;
  }
  function safeInteger(value, min, max) {
    if (value === null || value === undefined || value === '') return null;
    const number = typeof value === 'number' ? value : Number(value);
    return Number.isSafeInteger(number) && number >= min && number <= max ? number : null;
  }
  function cleanText(value, maxLength) {
    if (typeof value !== 'string') return null;
    const result = value.normalize('NFC')
      .replace(/[\u0000-\u001f\u007f]/g, ' ')
      .replace(/[<>]/g, '')
      .replace(/&/g, '')
      .replace(/\s+/g, ' ')
      .trim()
      .slice(0, maxLength);
    return result || null;
  }
  function normalizeTrace(item, pending) {
    if (!isRecord(item)) return null;
    const tool = typeof item.tool === 'string' ? item.tool : item.type;
    if (!TOOL_IDS.has(tool)) return null;
    const x = typeof item.x === 'number' ? item.x : Number(item.x);
    const y = typeof item.y === 'number' ? item.y : Number(item.y);
    if (!Number.isFinite(x) || !Number.isFinite(y) || x < 0 || x > 100 || y < 0 || y > 100) return null;
    const trace = { x: Math.round(x * 100) / 100, y: Math.round(y * 100) / 100 };
    if (pending) trace.type = tool;
    else trace.tool = tool;
    return trace;
  }
  function normalizeWorld(value) {
    if (!isRecord(value)) return null;
    const generation = safeInteger(value.generation, 0, 1000000000);
    const budget = safeInteger(value.budget, 0, 1000000);
    if (generation === null || budget === null) return null;
    const arrays = ['changes', 'objects', 'history', 'pending', 'snapshots'];
    if (arrays.some(key => value[key] !== undefined && !Array.isArray(value[key]))) return null;
    const changes = (value.changes || []).slice(-300).map(item => cleanText(item, 200)).filter(Boolean);
    const objects = (value.objects || []).slice(-500).map(item => normalizeTrace(item, false)).filter(Boolean);
    const pending = (value.pending || []).slice(-300).map(item => normalizeTrace(item, true)).filter(Boolean);
    const history = (value.history || []).slice(-500).map(item => {
      if (!isRecord(item)) return null;
      const itemGeneration = safeInteger(item.generation, 0, 1000000000);
      const by = cleanText(item.by, 32);
      const action = cleanText(item.action, 300);
      const when = cleanText(item.when, 80);
      if (itemGeneration === null || !by || !action || !when) return null;
      return { generation: itemGeneration, by, action, when };
    }).filter(Boolean);
    const snapshots = (value.snapshots || []).slice(-100).map(frame => {
      if (!isRecord(frame) || !Array.isArray(frame.objects)) return null;
      const frameGeneration = safeInteger(frame.generation, 0, 1000000000);
      if (frameGeneration === null) return null;
      return {
        generation: frameGeneration,
        objects: frame.objects.slice(-500).map(item => normalizeTrace(item, false)).filter(Boolean)
      };
    }).filter(Boolean);
    return { generation, budget, changes, objects, history, pending, snapshots };
  }
  function normalizeJourney(value) {
    if (!isRecord(value)) return null;
    const result = Object.create(null);
    for (const key of Object.keys(value).slice(0, 40)) {
      if (!/^[a-z0-9][a-z0-9-]{0,39}$/i.test(key)) continue;
      if (value[key] === true) result[key] = true;
    }
    return result;
  }
  function normalizeStreak(value) {
    if (!isRecord(value)) return null;
    const count = safeInteger(value.count, 0, 1000000);
    const lastDate = validDate(value.lastDate) ? value.lastDate : null;
    if (count === null || !lastDate) return null;
    return { count, lastDate };
  }
  function expectedIdForKey(key) {
    const id = STATIC_KEY_MAP.get(key);
    if (id) return id;
    const match = DYNAMIC_BEST_RE.exec(key);
    if (match && validDate(match[1])) return 'signal-run-best:' + match[1];
    return null;
  }
  function normalizeLogicalValue(key, value) {
    if (key === 'osgard.games.favorites.v1') {
      if (!Array.isArray(value)) return null;
      return [...new Set(value.filter(id => typeof id === 'string' && GAME_IDS.has(id)))].slice(0, 11);
    }
    if (key === 'inherit-world-v1') return normalizeWorld(value);
    if (key === 'inherit-author') return cleanText(value, 32);
    if (key === 'inherit-last-passed') {
      const number = safeInteger(value, 0, 1000000000);
      return number === null ? null : String(number);
    }
    if (key === 'inherit-journey') return normalizeJourney(value);
    if (key === 'osgard.signal-run.daily-streak.v1') return normalizeStreak(value);
    const bestMatch = DYNAMIC_BEST_RE.exec(key);
    if (bestMatch && validDate(bestMatch[1])) {
      const score = safeInteger(value, 0, 1000000000);
      return score === null ? null : score;
    }
    return null;
  }
  function parseStoredValue(key, raw) {
    if (raw === null || raw === undefined) return null;
    let logical = raw;
    if (key === 'osgard.games.favorites.v1' || key === 'inherit-world-v1' ||
        key === 'inherit-journey' || key === 'osgard.signal-run.daily-streak.v1') {
      try { logical = JSON.parse(raw); } catch { return null; }
    }
    if (DYNAMIC_BEST_RE.test(key) && typeof raw === 'string' && !/^\d+$/.test(raw)) return null;
    return normalizeLogicalValue(key, logical);
  }
  function entryBytes(entry, encoder) {
    return encoder.encode(canonical(entry)).byteLength;
  }
  function collect(storage, encoder) {
    const entries = [];
    let skipped = 0;
    const keys = new Set();
    for (const item of STATIC_KEYS) keys.add(item.key);
    for (let index = 0; index < Number(storage.length || 0); index += 1) {
      let key = null;
      try { key = storage.key(index); } catch { break; }
      if (typeof key === 'string' && DYNAMIC_BEST_RE.test(key)) keys.add(key);
    }
    for (const key of keys) {
      let raw = null;
      try { raw = storage.getItem(key); } catch { skipped += 1; continue; }
      if (raw === null) continue;
      const value = parseStoredValue(key, raw);
      const id = expectedIdForKey(key);
      if (value === null || !id) { skipped += 1; continue; }
      const entry = { id, key, value };
      if (entryBytes(entry, encoder) > MAX_ENTRY_BYTES) { skipped += 1; continue; }
      entries.push(entry);
    }
    entries.sort((a, b) => a.id.localeCompare(b.id));
    return { entries, skipped, supportedCount: entries.length };
  }
  function canonical(value) {
    if (value === null || typeof value !== 'object') return JSON.stringify(value);
    if (Array.isArray(value)) return '[' + value.map(canonical).join(',') + ']';
    const keys = Object.keys(value).sort();
    return '{' + keys.map(key => JSON.stringify(key) + ':' + canonical(value[key])).join(',') + '}';
  }
  function byteLength(value, encoder) {
    return encoder.encode(typeof value === 'string' ? value : JSON.stringify(value)).byteLength;
  }
  async function checksum(value, cryptoApi, encoder) {
    if (!cryptoApi || !cryptoApi.subtle || typeof cryptoApi.subtle.digest !== 'function') {
      throw new Error('Для проверки целостности нужен безопасный контекст браузера с Web Crypto.');
    }
    const digest = await cryptoApi.subtle.digest('SHA-256', encoder.encode(canonical(value)));
    return Array.from(new Uint8Array(digest), byte => byte.toString(16).padStart(2, '0')).join('');
  }
  async function createBackup(storage, cryptoApi, encoder, date) {
    const inventory = collect(storage, encoder);
    const payload = {
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      product: 'OSGARD WORLD',
      createdAt: (date instanceof Date ? date : new Date()).toISOString(),
      storage: 'browser-local',
      entries: inventory.entries,
      note: 'Local-only backup. No account tokens, consent choices, analytics queues, payment data, referral codes or session storage are included.'
    };
    const backup = Object.assign({}, payload, {
      integrity: { algorithm: 'SHA-256', checksum: await checksum(payload, cryptoApi, encoder) }
    });
    if (byteLength(backup, encoder) > MAX_BACKUP_BYTES) {
      throw new Error('Резервная копия превышает лимит 1 MiB. Удалите старые записи в поддерживаемой игре и повторите экспорт.');
    }
    return { backup, inventory };
  }
  async function validateBackup(input, cryptoApi, encoder) {
    const serializedSize = byteLength(input, encoder);
    if (serializedSize > MAX_BACKUP_BYTES) throw new Error('Файл больше допустимого лимита 1 MiB.');
    if (!isRecord(input)) throw new Error('Файл не является объектом резервной копии.');
    for (const key of Object.keys(input)) if (!SAFE_BACKUP_FIELDS.has(key)) throw new Error('Файл содержит неизвестное верхнеуровневое поле: ' + key);
    if (input.format !== FORMAT || input.schemaVersion !== SCHEMA_VERSION || input.product !== 'OSGARD WORLD' || input.storage !== 'browser-local') {
      throw new Error('Формат или версия резервной копии не поддерживается.');
    }
    if (typeof input.createdAt !== 'string' || !Number.isFinite(Date.parse(input.createdAt))) throw new Error('Дата резервной копии некорректна.');
    if (!Array.isArray(input.entries) || input.entries.length > 200) throw new Error('Список данных повреждён или слишком велик.');
    if (!isRecord(input.integrity) || input.integrity.algorithm !== 'SHA-256' ||
        typeof input.integrity.checksum !== 'string' || !/^[a-f0-9]{64}$/.test(input.integrity.checksum)) {
      throw new Error('В файле отсутствует корректная контрольная сумма.');
    }
    const payload = Object.assign({}, input);
    delete payload.integrity;
    if (await checksum(payload, cryptoApi, encoder) !== input.integrity.checksum) {
      throw new Error('Контрольная сумма не совпадает. Файл мог быть повреждён.');
    }
    const seenIds = new Set();
    const seenKeys = new Set();
    const entries = [];
    for (const item of input.entries) {
      if (!isRecord(item) || Object.keys(item).some(key => !['id', 'key', 'value'].includes(key)) ||
          typeof item.id !== 'string' || typeof item.key !== 'string') {
        throw new Error('Одна из записей имеет неверную структуру.');
      }
      const expected = expectedIdForKey(item.key);
      if (!expected || expected !== item.id || seenIds.has(item.id) || seenKeys.has(item.key)) {
        throw new Error('Обнаружена неподдерживаемая или повторяющаяся запись.');
      }
      const value = normalizeLogicalValue(item.key, item.value);
      if (value === null) throw new Error('Данные записи «' + item.id + '» не прошли проверку.');
      const entry = { id: item.id, key: item.key, value };
      if (entryBytes(entry, encoder) > MAX_ENTRY_BYTES) throw new Error('Одна запись превышает лимит 256 KiB.');
      seenIds.add(item.id);
      seenKeys.add(item.key);
      entries.push(entry);
    }
    entries.sort((a, b) => a.id.localeCompare(b.id));
    return {
      format: FORMAT,
      schemaVersion: SCHEMA_VERSION,
      createdAt: input.createdAt,
      entries,
      supportedCount: entries.length,
      hasInheritWorld: entries.some(entry => entry.key === 'inherit-world-v1')
    };
  }
  function serializeEntry(entry) {
    if (entry.key === 'inherit-author' || entry.key === 'inherit-last-passed' || DYNAMIC_BEST_RE.test(entry.key)) {
      return String(entry.value);
    }
    return JSON.stringify(entry.value);
  }
  function labelForEntry(entry) {
    if (entry.id === 'catalog-favorites') return { label: 'Избранные игры', detail: entry.value.length + ' из 11' };
    if (entry.id === 'inherit-world') return { label: 'INHERIT · локальный мир', detail: entry.value.generation + ' поколение · ' + entry.value.objects.length + ' следов' };
    if (entry.id === 'inherit-author') return { label: 'INHERIT · имя автора', detail: entry.value };
    if (entry.id === 'inherit-last-passed') return { label: 'INHERIT · последнее поколение', detail: entry.value };
    if (entry.id === 'inherit-journey') return { label: 'INHERIT · этапы пути', detail: Object.keys(entry.value).length + ' отметок' };
    if (entry.id === 'signal-run-streak') return { label: 'SIGNAL RUN · серия', detail: entry.value.count + ' дней · ' + entry.value.lastDate };
    if (entry.id.startsWith('signal-run-best:')) return { label: 'SIGNAL RUN · рекорд', detail: entry.id.slice('signal-run-best:'.length) + ' · ' + entry.value };
    return { label: entry.id, detail: 'Поддерживаемые локальные данные' };
  }
  root.OSGARDPlayerVaultCore = Object.freeze({
    FORMAT, SCHEMA_VERSION, MAX_BACKUP_BYTES, MAX_ENTRY_BYTES,
    collect, createBackup, validateBackup, serializeEntry, labelForEntry,
    expectedIdForKey, normalizeWorld, normalizeLogicalValue, canonical
  });
})(globalThis);
