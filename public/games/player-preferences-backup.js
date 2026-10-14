(() => {
  'use strict';
  const FAVORITES_KEY = 'osgard.games.favorites.v1';
  const RECENT_KEY = 'osgard.games.recent.v1';
  const SCHEMA = 'osgard.player-preferences';
  const MAX_FILE_BYTES = 100000;
  const GAME_IDS = new Set(['null-shift','time','swarm','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid']);

  function normalizeIds(value) {
    if (!Array.isArray(value) || value.length > GAME_IDS.size) return { ok:false, value:[], code:'invalid_list' };
    const result = [];
    for (const item of value) {
      if (typeof item !== 'string' || !GAME_IDS.has(item)) return { ok:false, value:[], code:'unknown_game' };
      if (!result.includes(item)) result.push(item);
    }
    return { ok:true, value:result, code:'ok' };
  }
  function createBackup(favorites, recent, exportedAt = new Date().toISOString()) {
    const fav = normalizeIds(Array.isArray(favorites) ? favorites : []);
    const rec = normalizeIds(Array.isArray(recent) ? recent : []);
    return {
      schema:SCHEMA, schemaVersion:1,
      exportedAt:typeof exportedAt === 'string' && exportedAt.length <= 40 ? exportedAt : new Date().toISOString(),
      favorites:fav.ok ? fav.value : [], recent:rec.ok ? rec.value : []
    };
  }
  function validateBackup(input) {
    if (!input || typeof input !== 'object' || Array.isArray(input) || input.schema !== SCHEMA || input.schemaVersion !== 1) {
      return { ok:false, code:'schema_invalid' };
    }
    const favorites = normalizeIds(input.favorites);
    const recent = normalizeIds(input.recent);
    if (!favorites.ok || !recent.ok) return { ok:false, code:!favorites.ok ? 'favorites_' + favorites.code : 'recent_' + recent.code };
    if (input.exportedAt !== undefined && (typeof input.exportedAt !== 'string' || input.exportedAt.length > 40)) {
      return { ok:false, code:'exported_at_invalid' };
    }
    return { ok:true, value:{
      schema:SCHEMA, schemaVersion:1,
      exportedAt:typeof input.exportedAt === 'string' ? input.exportedAt : '',
      favorites:favorites.value, recent:recent.value
    }, code:'ok' };
  }
  if (typeof window !== 'undefined') window.OSGARDPreferencesBackup = Object.freeze({ createBackup, validateBackup, normalizeIds, maxFileBytes:MAX_FILE_BYTES });
  if (typeof document === 'undefined') return;

  const shareButton = document.getElementById('catalog-share-state');
  const status = document.getElementById('catalog-share-status');
  if (!shareButton || !shareButton.parentElement || shareButton.parentElement.querySelector('[data-preferences-backup]')) return;
  const holder = document.createElement('span');
  holder.className = 'player-preferences-tools'; holder.setAttribute('aria-label','Резервная копия коллекции игр'); holder.dataset.preferencesBackup = '1';
  const exportButton = document.createElement('button');
  exportButton.type = 'button'; exportButton.className = 'catalog-share-button'; exportButton.textContent = 'Скачать копию';
  exportButton.setAttribute('aria-label','Скачать копию избранного и недавних игр');
  exportButton.title = 'Сохраняется только локальная коллекция, без аккаунта и игровых сохранений';
  const importButton = document.createElement('button');
  importButton.type = 'button'; importButton.className = 'catalog-share-button'; importButton.textContent = 'Восстановить';
  importButton.setAttribute('aria-label','Восстановить избранное и недавние игры из JSON-файла');
  const fileInput = document.createElement('input');
  fileInput.type = 'file'; fileInput.accept = '.json,application/json'; fileInput.hidden = true;
  fileInput.setAttribute('aria-label','Выбрать JSON-файл резервной копии');
  let live = status;
  if (!live) {
    live = document.createElement('span'); live.id = 'player-preferences-status'; live.className = 'sr';
    live.setAttribute('role','status'); live.setAttribute('aria-live','polite'); shareButton.parentElement.append(live);
  }
  function say(message) { live.textContent = message; }
  function readIds(key) {
    try { const raw = JSON.parse(localStorage.getItem(key) || '[]'); const result = normalizeIds(Array.isArray(raw) ? raw : []); return result.ok ? result.value : []; }
    catch { return []; }
  }
  function saveBlob(name, text) {
    if (typeof Blob === 'undefined' || !window.URL || typeof window.URL.createObjectURL !== 'function') { say('Этот браузер не поддерживает экспорт JSON.'); return false; }
    const url = window.URL.createObjectURL(new Blob([text], { type:'application/json' }));
    const anchor = document.createElement('a'); anchor.href = url; anchor.download = name; anchor.hidden = true;
    document.body.append(anchor); anchor.click(); anchor.remove();
    window.setTimeout(() => window.URL.revokeObjectURL(url), 1000); return true;
  }
  exportButton.addEventListener('click', () => {
    const backup = createBackup(readIds(FAVORITES_KEY), readIds(RECENT_KEY));
    if (saveBlob('osgard-play-collection.json', JSON.stringify(backup, null, 2))) say('Копия коллекции скачана. Она содержит только избранное и историю игр.');
  });
  importButton.addEventListener('click', () => fileInput.click());
  fileInput.addEventListener('change', async () => {
    const file = fileInput.files && fileInput.files[0]; fileInput.value = '';
    if (!file) return;
    if (file.size > MAX_FILE_BYTES) { say('Файл слишком большой. Допустимо не более 100 КБ.'); return; }
    try {
      const raw = await file.text();
      if (raw.length > MAX_FILE_BYTES) { say('Файл слишком большой. Допустимо не более 100 КБ.'); return; }
      const validated = validateBackup(JSON.parse(raw));
      if (!validated.ok) { say('Копия не принята: формат или список игр не совпадает с OSGARD PLAY.'); return; }
      if (!window.confirm('Заменить текущее избранное и историю играми из этой копии? Игровой прогресс не затрагивается.')) {
        say('Восстановление отменено.'); return;
      }
      localStorage.setItem(FAVORITES_KEY, JSON.stringify(validated.value.favorites));
      localStorage.setItem(RECENT_KEY, JSON.stringify(validated.value.recent));
      say('Коллекция восстановлена. Обновляем каталог…');
      window.setTimeout(() => window.location.reload(), 350);
    } catch { say('Не удалось прочитать файл. Выбери корректный JSON-файл резервной копии OSGARD PLAY.'); }
  });
  holder.append(exportButton, importButton);
  shareButton.insertAdjacentElement('afterend', holder);
  shareButton.parentElement.append(fileInput);
  const style = document.createElement('style');
  style.textContent = '.player-preferences-tools{display:inline-flex;flex-wrap:wrap;align-items:center;gap:7px;margin-inline-start:7px}.player-preferences-tools button{min-height:38px}@media(max-width:700px){.player-preferences-tools{margin-inline-start:0;width:100%}.player-preferences-tools button{flex:1;min-width:110px}}';
  document.head.append(style);
})();