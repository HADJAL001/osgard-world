(() => {
  'use strict';
  const form = document.getElementById('feedback-form');
  if (!form) return;
  const statusNode = document.getElementById('form-status');
  const submitButton = document.getElementById('submit-report');
  const exportButton = document.getElementById('export-report');
  const copyButton = document.getElementById('copy-report');
  const description = form.elements.namedItem('description');
  const count = document.querySelector('[data-count="description"]');
  const categories = new Set(['bug', 'controls', 'gameplay', 'performance', 'accessibility', 'visual', 'monetization', 'other']);
  const severities = new Set(['minor', 'major', 'blocker']);
  const games = new Set(['null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade', 'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid', 'catalog']);
  let busy = false;
  let apiBase = '';
  let activeSubmissionId = '';
  let activeFingerprint = '';

  function status(message, kind) {
    statusNode.textContent = message;
    statusNode.dataset.kind = kind || '';
  }
  function randomId() {
    if (window.crypto && typeof window.crypto.randomUUID === 'function') return window.crypto.randomUUID();
    if (!window.crypto || typeof window.crypto.getRandomValues !== 'function') return '';
    const bytes = new Uint8Array(16);
    window.crypto.getRandomValues(bytes);
    bytes[6] = (bytes[6] & 15) | 64;
    bytes[8] = (bytes[8] & 63) | 128;
    const hex = Array.from(bytes, value => value.toString(16).padStart(2, '0')).join('');
    return hex.slice(0, 8) + '-' + hex.slice(8, 12) + '-' + hex.slice(12, 16) + '-' + hex.slice(16, 20) + '-' + hex.slice(20);
  }
  function safeApiBase(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    try {
      const parsed = new URL(raw.trim(), window.location.origin);
      const local = ['localhost', '127.0.0.1'].includes(parsed.hostname) && parsed.protocol === 'http:';
      const host = parsed.hostname === 'osgard.world' || parsed.hostname.endsWith('.osgard.world');
      const sameOrigin = parsed.origin === window.location.origin;
      const pathOkay = parsed.pathname === '/' || parsed.pathname === '/commerce-api';
      if ((!sameOrigin && !host) || (!local && parsed.protocol !== 'https:') || parsed.username || parsed.password || parsed.search || parsed.hash || !pathOkay) return '';
      return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
    } catch { return ''; }
  }
  async function configure() {
    try {
      const response = await fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(4000) });
      const config = response.ok ? await response.json() : {};
      apiBase = safeApiBase(config.apiBaseUrl);
      if (apiBase) status('Серверный канал настроен. Перед отправкой проверь детали: форма не передаёт отчёты в рекламную аналитику.', '');
      else status('Сервер приёма отчётов не настроен. Ничего не отправлено; можно скачать JSON или скопировать отчёт для ручной передачи.', 'warning');
    } catch {
      apiBase = '';
      status('Сервер пока недоступен. Отчёт можно сохранить локально и передать вручную.', 'warning');
    }
  }
  function deviceClass() {
    const width = Number(window.innerWidth) || 0;
    if (width <= 600) return 'mobile';
    if (width <= 1024) return 'tablet';
    return 'desktop';
  }
  function browserFamily() {
    const ua = String(navigator.userAgent || '');
    if (/Edg\//.test(ua)) return 'edge';
    if (/Firefox\//.test(ua)) return 'firefox';
    if (/Chrome\//.test(ua)) return 'chrome';
    if (/Safari\//.test(ua) && !/Chrome\//.test(ua)) return 'safari';
    return 'other';
  }
  function value(name) { return String(form.elements.namedItem(name)?.value || '').trim(); }
  function currentReport() {
    const width = Math.max(0, Math.min(10000, Number(window.innerWidth) || 0));
    const height = Math.max(0, Math.min(10000, Number(window.innerHeight) || 0));
    const report = {
      schema: 'osgard-game-feedback.v1',
      createdAt: new Date().toISOString(),
      gameId: value('gameId'),
      category: value('category'),
      severity: value('severity'),
      title: value('title'),
      description: value('description'),
      stepsToReproduce: value('stepsToReproduce'),
      expectedResult: value('expectedResult'),
      actualResult: value('actualResult'),
      replyTo: value('replyTo'),
      deviceClass: deviceClass(),
      browserFamily: browserFamily(),
      viewportWidth: Math.floor(width / 50) * 50,
      viewportHeight: Math.floor(height / 50) * 50,
      consent: form.elements.namedItem('consent').checked
    };
    // Reuse the ID on an unchanged retry; changed report content becomes a new submission.
    const fingerprint = JSON.stringify([
      report.gameId, report.category, report.severity, report.title, report.description,
      report.stepsToReproduce, report.expectedResult, report.actualResult, report.replyTo, report.consent
    ]);
    if (!activeSubmissionId || fingerprint !== activeFingerprint) {
      activeSubmissionId = randomId();
      activeFingerprint = fingerprint;
    }
    report.submissionId = activeSubmissionId;
    return report;
  }
  function safeReportForExport() {
    const report = currentReport();
    if (!report.submissionId) throw new Error('Не удалось создать ID отчёта. Сохрани страницу и повтори в современном браузере.');
    if (!games.has(report.gameId) || !categories.has(report.category) || !severities.has(report.severity)) throw new Error('Проверь выбор игры, категории и важности.');
    if (report.title.length < 8 || report.title.length > 120) throw new Error('Заголовок должен содержать от 8 до 120 символов.');
    if (report.description.length < 20 || report.description.length > 3000) throw new Error('Описание должно содержать от 20 до 3000 символов.');
    if (report.stepsToReproduce.length > 1500 || report.expectedResult.length > 600 || report.actualResult.length > 600) throw new Error('Одно из дополнительных полей слишком длинное.');
    if (report.replyTo && !/^[^\s@<>]+@[^\s@<>]+\.[^\s@<>]+$/.test(report.replyTo)) throw new Error('Проверь email для ответа.');
    return report;
  }
  function textReport(report) {
    return [
      'OSGARD PLAY — ОТЧЁТ О ПРОБЛЕМЕ',
      'ID: ' + report.submissionId,
      'Игра: ' + report.gameId,
      'Категория: ' + report.category,
      'Важность: ' + report.severity,
      'Заголовок: ' + report.title,
      '',
      'Описание:',
      report.description,
      '',
      'Шаги: ' + (report.stepsToReproduce || 'не указаны'),
      'Ожидалось: ' + (report.expectedResult || 'не указано'),
      'Произошло: ' + (report.actualResult || 'не указано'),
      'Ответ: ' + (report.replyTo || 'не требуется'),
      'Устройство: ' + report.deviceClass + '; браузер: ' + report.browserFamily + '; окно: ' + report.viewportWidth + '×' + report.viewportHeight,
      'Примечание: это пользовательский отчёт; технические выводы ещё не проверены.'
    ].join('\n');
  }
  function download(filename, content, type) {
    const url = URL.createObjectURL(new Blob([content], { type: type || 'application/octet-stream' }));
    const anchor = document.createElement('a');
    anchor.href = url;
    anchor.download = filename;
    anchor.hidden = true;
    document.body.append(anchor);
    anchor.click();
    anchor.remove();
    window.setTimeout(() => URL.revokeObjectURL(url), 1000);
  }
  function updateCount() { if (count) count.textContent = String(description.value.length) + ' / 3000'; }
  description.addEventListener('input', updateCount);

  exportButton.addEventListener('click', () => {
    try {
      const report = safeReportForExport();
      download('osgard-feedback-' + report.submissionId.slice(0, 8) + '.json', JSON.stringify(report, null, 2), 'application/json;charset=utf-8');
      status('JSON сохранён локально. Он не отправлен на сервер.', 'success');
    } catch (error) { status(error.message || 'Не удалось сформировать отчёт.', 'error'); }
  });
  copyButton.addEventListener('click', async () => {
    try {
      const report = safeReportForExport();
      const text = textReport(report);
      if (!navigator.clipboard || typeof navigator.clipboard.writeText !== 'function') throw new Error('Копирование недоступно в этом браузере. Скачай JSON.');
      await navigator.clipboard.writeText(text);
      status('Текст отчёта скопирован. Он не отправлен на сервер.', 'success');
    } catch (error) { status(error.message || 'Не удалось скопировать отчёт.', 'error'); }
  });
  form.addEventListener('submit', async event => {
    event.preventDefault();
    if (busy) return;
    if (!form.reportValidity()) { status('Проверь обязательные поля и согласие на обработку отчёта.', 'error'); return; }
    let report;
    try { report = safeReportForExport(); }
    catch (error) { status(error.message || 'Проверь поля формы.', 'error'); return; }
    if (!report.consent) { status('Нужно подтвердить обработку заявки.', 'error'); return; }
    if (!apiBase) { status('Отправка не выполнена: сервер не настроен. Используй «Скачать JSON» или «Копировать текст».', 'warning'); return; }

    const payload = { ...report, website: value('website') };
    delete payload.schema;
    delete payload.createdAt;
    busy = true;
    submitButton.disabled = true;
    submitButton.textContent = 'Отправляем…';
    try {
      const response = await fetch(apiBase + '/v1/game-feedback', {
        method: 'POST',
        mode: 'cors',
        credentials: 'omit',
        cache: 'no-store',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
        signal: AbortSignal.timeout(10000)
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.accepted !== true) {
        if (response.status === 503) throw new Error('Приём заявок временно недоступен. Сохрани JSON и повтори позже.');
        if (response.status === 429) throw new Error('Слишком много попыток за короткое время. Подожди и попробуй снова.');
        throw new Error('Сервер не подтвердил сохранение отчёта. Код: ' + String(result.error || response.status));
      }
      status(result.reportId ? (result.duplicate ? 'Отчёт уже сохранён. Номер: ' + result.reportId : 'Отчёт сохранён. Номер: ' + result.reportId) : 'Запрос принят.', 'success');
      form.reset();
      activeSubmissionId = '';
      activeFingerprint = '';
      updateCount();
    } catch (error) {
      status((error && error.message) || 'Отправка не удалась. Сохрани JSON для ручной передачи.', 'error');
    } finally {
      busy = false;
      submitButton.disabled = false;
      submitButton.innerHTML = 'Отправить отчёт <span>↗</span>';
    }
  });
  updateCount();
  void configure();
})();