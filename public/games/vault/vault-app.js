(function () {
  'use strict';
  const core = window.OSGARDPlayerVaultCore;
  const encoder = new TextEncoder();
  const $ = selector => document.querySelector(selector);
  const state = { backup: null, backupMarker: '', current: null, checkedAt: 0 };

  const supportedCopy = [
    ['Каталог', 'Список избранных игр OSGARD PLAY.'],
    ['INHERIT', 'Локальный мир, авторское имя и отмеченные этапы пути.'],
    ['SIGNAL RUN', 'Серия и сохранённые дневные рекорды.']
  ];

  function setStatus(target, message, kind) {
    const el = $(target);
    el.textContent = message;
    el.dataset.kind = kind || 'info';
  }
  function safeInventory() {
    try {
      return core.collect(window.localStorage, encoder);
    } catch {
      throw new Error('Браузер запретил доступ к локальному хранилищу. Проверьте настройки сайта и повторите попытку.');
    }
  }
  function signature(entries) {
    return core.canonical(entries || []);
  }
  function text(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = value;
    return node;
  }
  function renderRows(container, entries, emptyText) {
    const root = $(container);
    root.replaceChildren();
    if (!entries.length) {
      root.append(text('p', 'empty', emptyText));
      return;
    }
    for (const entry of entries) {
      const info = core.labelForEntry(entry);
      const row = text('article', 'vault-row', '');
      const mark = text('span', 'vault-mark', entry.id.startsWith('signal-run') ? 'S' : entry.id.startsWith('inherit') ? 'I' : 'O');
      const main = text('div', 'vault-row-copy', '');
      main.append(text('strong', '', info.label));
      main.append(text('small', '', info.detail));
      row.append(mark, main, text('span', 'vault-row-state', 'LOCAL'));
      root.append(row);
    }
  }
  function refresh() {
    try {
      state.current = safeInventory();
      state.checkedAt = Date.now();
      renderRows('#current-items', state.current.entries, 'В поддерживаемых разделах пока нет сохранённых данных.');
      $('#supported-count').textContent = String(state.current.supportedCount);
      $('#skipped-count').textContent = String(state.current.skipped);
      $('#storage-state').textContent = 'Локальное хранилище доступно';
      $('#storage-state').dataset.kind = 'good';
      $('#inventory-refresh').disabled = false;
      updateRestoreAvailability();
      return true;
    } catch (error) {
      state.current = null;
      $('#storage-state').textContent = 'Хранилище недоступно';
      $('#storage-state').dataset.kind = 'bad';
      setStatus('#inventory-status', error.message, 'error');
      $('#inventory-refresh').disabled = true;
      updateRestoreAvailability();
      return false;
    }
  }
  function updateRestoreAvailability() {
    const exists = Boolean(state.current && state.current.entries.length);
    const confirmed = $('#restore-confirm').checked;
    const signatureStillMatches = !exists || Boolean(state.backupMarker && state.backupMarker === signature(state.current.entries));
    const backupOk = !exists || signatureStillMatches;
    $('#restore-button').disabled = !state.backup || !confirmed || !backupOk;
    if (state.backup && exists && !signatureStillMatches) {
      setStatus('#restore-status', 'Локальные данные изменились после резервного копирования. Скачайте свежую копию перед восстановлением.', 'warn');
    }
  }
  function downloadFile(name, payload, mimeType) {
    const blob = new Blob([payload], { type: mimeType || 'application/json;charset=utf-8' });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = name;
    anchor.rel = 'noopener';
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function safeFileDate(date) {
    return date.toISOString().slice(0, 10);
  }
  async function exportCurrent(markAsBackup) {
    try {
      const inventory = safeInventory();
      state.current = inventory;
      const result = await core.createBackup(window.localStorage, window.crypto, encoder, new Date());
      state.current = result.inventory;
      const serialized = JSON.stringify(result.backup, null, 2) + '\n';
      if (encoder.encode(serialized).byteLength > core.MAX_BACKUP_BYTES) throw new Error('Файл превышает допустимый размер.');
      downloadFile('osgard-player-vault-' + safeFileDate(new Date()) + '.json', serialized);
      if (markAsBackup) {
        state.backupMarker = signature(result.inventory.entries);
        setStatus('#inventory-status', 'Резервная копия текущего состояния скачана. Теперь можно безопасно восстановить выбранный файл.', 'good');
      } else {
        setStatus('#inventory-status', 'Резервная копия скачана. Файл не зашифрован — храните его в безопасном месте.', 'good');
      }
      refresh();
      return true;
    } catch (error) {
      setStatus('#inventory-status', error.message || 'Не удалось создать резервную копию.', 'error');
      return false;
    }
  }
  async function previewFile(file) {
    state.backup = null;
    state.backupMarker = '';
    renderRows('#preview-items', [], 'Выберите JSON-файл, чтобы проверить его перед восстановлением.');
    $('#backup-metadata').textContent = 'Файл ещё не проверен';
    $('#restore-confirm').checked = false;
    $('#restore-button').disabled = true;
    if (!file) return;
    if (file.size > core.MAX_BACKUP_BYTES) {
      setStatus('#restore-status', 'Файл больше допустимого лимита 1 MiB.', 'error');
      return;
    }
    try {
      const parsed = JSON.parse(await file.text());
      const verified = await core.validateBackup(parsed, window.crypto, encoder);
      state.backup = verified;
      $('#backup-metadata').textContent = 'Формат v' + verified.schemaVersion + ' · ' + verified.supportedCount + ' записей · создано ' + new Date(verified.createdAt).toLocaleString();
      renderRows('#preview-items', verified.entries, 'Файл допустим, но в нём нет поддерживаемых сохранений.');
      setStatus('#restore-status', 'Файл прошёл проверку структуры и SHA-256. До применения данные на устройстве не менялись.', 'good');
      updateRestoreAvailability();
    } catch (error) {
      state.backup = null;
      $('#backup-metadata').textContent = 'Файл не прошёл проверку';
      setStatus('#restore-status', error.message || 'Не удалось прочитать файл.', 'error');
      updateRestoreAvailability();
    }
  }
  function restoreBackup() {
    if (!state.backup || !$('#restore-confirm').checked) return;
    let inventory;
    try {
      inventory = safeInventory();
    } catch (error) {
      setStatus('#restore-status', error.message, 'error');
      return;
    }
    if (inventory.entries.length && state.backupMarker !== signature(inventory.entries)) {
      setStatus('#restore-status', 'Перед восстановлением скачайте свежую резервную копию текущих данных.', 'warn');
      updateRestoreAvailability();
      return;
    }
    const previous = new Map();
    try {
      for (const entry of state.backup.entries) {
        previous.set(entry.key, window.localStorage.getItem(entry.key));
      }
      for (const entry of state.backup.entries) {
        window.localStorage.setItem(entry.key, core.serializeEntry(entry));
      }
      state.backup = null;
      state.backupMarker = '';
      $('#backup-file').value = '';
      $('#restore-confirm').checked = false;
      refresh();
      renderRows('#preview-items', [], 'Выберите JSON-файл, чтобы проверить его перед восстановлением.');
      $('#backup-metadata').textContent = 'Файл восстановлен';
      setStatus('#restore-status', 'Готово: ' + previous.size + ' поддерживаемых записей восстановлено локально. Перезагрузите соответствующую игру. Внешние миры и серверные данные не изменялись.', 'good');
    } catch {
      for (const [key, value] of previous.entries()) {
        try {
          if (value === null) window.localStorage.removeItem(key);
          else window.localStorage.setItem(key, value);
        } catch {}
      }
      setStatus('#restore-status', 'Не удалось завершить восстановление. Выполнена попытка вернуть прежние значения. Перезагрузите страницу и проверьте локальные данные.', 'error');
    }
    updateRestoreAvailability();
  }

  $('#inventory-refresh').addEventListener('click', refresh);
  $('#download-backup').addEventListener('click', () => void exportCurrent(false));
  $('#backup-current-first').addEventListener('click', () => void exportCurrent(true));
  $('#backup-file').addEventListener('change', event => void previewFile(event.target.files && event.target.files[0]));
  $('#restore-confirm').addEventListener('change', updateRestoreAvailability);
  $('#restore-button').addEventListener('click', restoreBackup);
  $('#clear-file').addEventListener('click', () => {
    $('#backup-file').value = '';
    state.backup = null;
    state.backupMarker = '';
    $('#restore-confirm').checked = false;
    $('#backup-metadata').textContent = 'Файл ещё не проверен';
    renderRows('#preview-items', [], 'Выберите JSON-файл, чтобы проверить его перед восстановлением.');
    setStatus('#restore-status', 'Выбор файла очищен. Сохранения на устройстве не затронуты.', 'info');
    updateRestoreAvailability();
  });
  $('#print-summary').addEventListener('click', () => {
    const current = safeInventory();
    const summary = [
      'OSGARD PLAYER VAULT',
      'Снимок локального состояния: ' + new Date().toISOString(),
      'Поддерживаемые записи: ' + current.supportedCount,
      'Пропущенные неподдерживаемые или повреждённые значения: ' + current.skipped,
      '',
      'Резервная копия не отправляется на сервер. Она не включает токены, согласия, аналитику, коды приглашений, платёжные данные или sessionStorage.',
      'Поддержка: избранное каталога, локальный мир INHERIT, этапы INHERIT, серия и дневные рекорды SIGNAL RUN.'
    ].join('\n');
    downloadFile('osgard-player-vault-report-' + safeFileDate(new Date()) + '.txt', summary, 'text/plain;charset=utf-8');
  });
  $('#menu-toggle').addEventListener('click', () => {
    const nav = $('#mobile-nav');
    const opened = $('#menu-toggle').getAttribute('aria-expanded') === 'true';
    $('#menu-toggle').setAttribute('aria-expanded', String(!opened));
    nav.hidden = opened;
  });

  refresh();
  renderRows('#preview-items', [], 'Выберите JSON-файл, чтобы проверить его перед восстановлением.');
})();
