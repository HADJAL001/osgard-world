(() => {
  'use strict';
  const $ = selector => document.querySelector(selector);
  const apiInput = $('#api-base'), tokenInput = $('#operator-token'), accessStatus = $('#access-status');
  const connectButton = $('#connect'), disconnectButton = $('#disconnect'), refreshButton = $('#refresh');
  const reportList = $('#report-list'), count = $('#result-count');
  let apiBase = '', token = '', connected = false, busy = false;
  const STATUSES = ['new', 'triaged', 'in_progress', 'resolved', 'wontfix'];
  const STATUS_LABELS = { new: 'Новый', triaged: 'Проверка', in_progress: 'В работе', resolved: 'Исправлен', wontfix: 'Не исправляется' };
  const GAMES = { catalog: 'Каталог', 'null-shift': 'NULL//SHIFT', time: 'Империя времени', swarm: 'SWARM', inherit: 'INHERIT', remix: 'REMIX', 'civic-cascade': 'CIVIC CASCADE', patina: 'PATINA ATELIER', 'signal-run': 'SIGNAL RUN', 'cascade-lab': 'CASCADE LAB', 'afterimage-run': 'AFTERIMAGE//RUN', 'aether-grid': 'AETHER GRID' };
  function safeBase(raw) {
    if (typeof raw !== 'string' || !raw.trim()) return '';
    try {
      const parsed = new URL(raw, location.origin);
      const host = parsed.hostname === 'osgard.world' || parsed.hostname.endsWith('.osgard.world');
      if ((parsed.origin !== location.origin && !host) || (parsed.protocol !== 'https:' && !(['localhost','127.0.0.1'].includes(parsed.hostname) && parsed.protocol === 'http:')) || parsed.username || parsed.password || parsed.search || parsed.hash || !['/','/commerce-api'].includes(parsed.pathname)) return '';
      return parsed.origin + (parsed.pathname === '/' ? '' : parsed.pathname);
    } catch { return ''; }
  }
  async function configure() {
    try {
      const response = await fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(4000) });
      const config = response.ok ? await response.json() : {};
      apiBase = safeBase(config.apiBaseUrl);
      apiInput.value = apiBase || 'API не настроен';
      if (!apiBase) message('API отчётов не настроен. Токен не отправлялся.', 'error');
    } catch { apiBase = ''; apiInput.value = 'API недоступен'; message('Не удалось прочитать безопасную конфигурацию API.', 'error'); }
  }
  function message(text, kind) { accessStatus.textContent = text; accessStatus.dataset.kind = kind || ''; }
  function setConnected(value) { connected = value; refreshButton.disabled = !connected || busy; connectButton.disabled = connected || busy; disconnectButton.disabled = !connected || busy; }
  async function request(path, options = {}) {
    if (!apiBase || !token) throw new Error('Нет API или административного токена.');
    const response = await fetch(apiBase + path, {
      ...options, cache: 'no-store', credentials: 'omit', signal: AbortSignal.timeout(10000),
      headers: { 'Authorization': 'Bearer ' + token, ...(options.headers || {}) }
    });
    const result = await response.json().catch(() => ({}));
    if (!response.ok) throw new Error(result.message || result.error || ('HTTP ' + response.status));
    return result;
  }
  function node(tag, cls, text) { const result = document.createElement(tag); if (cls) result.className = cls; if (text !== undefined) result.textContent = String(text); return result; }
  function field(labelText, select) { const label=node('label','field',labelText); label.append(select); return label; }
  function selectOf(values, selected, labels) {
    const select=node('select');
    for (const value of values) { const option=node('option','',labels[value] || value); option.value=value; option.selected=value===selected; select.append(option); }
    return select;
  }
  function fmtDate(value) {
    const ms = Date.parse(value);
    return Number.isFinite(ms) ? new Date(ms).toLocaleString() : 'Дата не определена';
  }
  function render(items) {
    reportList.replaceChildren();
    count.textContent = String(items.length) + ' отчётов в текущей выборке';
    if (!items.length) { reportList.append(node('p','empty','Отчётов по заданным фильтрам нет. Это не свидетельствует об отсутствии ошибок в игре.')); return; }
    for (const item of items) {
      const card=node('article','report');
      card.dataset.severity = ['minor','major','blocker'].includes(item.severity) ? item.severity : 'minor';
      const meta=node('div','meta');
      for (const value of [GAMES[item.gameId] || 'Неизвестная игра', item.category, item.severity, STATUS_LABELS[item.status] || 'Неизвестный статус']) meta.append(node('span','pill' + (value===item.severity ? ' priority' : ''),value));
      card.append(meta);
      card.append(node('h2','',item.title || 'Без заголовка'));
      card.append(node('p','body',item.description || 'Описание отсутствует.'));
      const details = node('div','detail');
      details.textContent = [
        'ID: ' + String(item.feedbackId || ''),
        'Создан: ' + fmtDate(item.createdAt),
        'Шаги: ' + (item.stepsToReproduce || 'не указаны'),
        'Ожидалось: ' + (item.expectedResult || 'не указано'),
        'Произошло: ' + (item.actualResult || 'не указано'),
        'Ответ: ' + (item.replyTo || 'не оставлен'),
        'Устройство: ' + String(item.deviceClass || 'unknown') + '; браузер: ' + String(item.browserFamily || 'unknown') + '; окно: ' + String(item.viewportWidth || 0) + '×' + String(item.viewportHeight || 0)
      ].join('\n');
      card.append(details);
      const controls=node('div','report-controls');
      const statusSelect=selectOf(STATUSES,item.status,STATUS_LABELS);
      controls.append(field('Статус',statusSelect));
      const save=node('button','button','Сохранить статус');
      save.type='button';
      save.addEventListener('click',async()=>{
        save.disabled=true;
        try {
          await request('/v1/admin/game-feedback/' + encodeURIComponent(String(item.feedbackId || '')) + '/status',{method:'POST',headers:{'Content-Type':'application/json'},body:JSON.stringify({status:statusSelect.value})});
          message('Статус обновлён для ' + String(item.feedbackId || ''), 'success');
          await load();
        } catch(error) { message('Не удалось обновить статус: ' + (error.message || 'ошибка'), 'error'); save.disabled=false; }
      });
      controls.append(save); card.append(controls); reportList.append(card);
    }
  }
  async function load() {
    if (!connected || busy) return;
    busy=true; setConnected(true); refreshButton.disabled=true; count.textContent='Загружаем…';
    try {
      const query = new URLSearchParams({ status: $('#filter-status').value, limit: '100' });
      if ($('#filter-game').value !== 'all') query.set('gameId', $('#filter-game').value);
      const result = await request('/v1/admin/game-feedback?' + query.toString());
      render(Array.isArray(result.items) ? result.items : []);
      message('Подключено. Данные загружены без общего браузерного кэша.', 'success');
    } catch(error) { message('Загрузка не удалась: ' + (error.message || 'ошибка'), 'error'); }
    finally { busy=false; setConnected(true); refreshButton.disabled=!connected; }
  }
  connectButton.addEventListener('click',async()=>{
    const candidate=tokenInput.value.trim();
    if (!apiBase) { message('API не настроен; сначала разверни сервис и укажи безопасный apiBaseUrl.', 'error'); return; }
    if (candidate.length < 32) { message('Токен должен содержать не менее 32 символов.', 'error'); return; }
    token=candidate; tokenInput.value=''; busy=true; connectButton.disabled=true;
    try {
      const result=await request('/v1/admin/game-feedback?limit=1&status=all');
      connected=true; render(Array.isArray(result.items)?result.items:[]); message('Админ-доступ подтверждён. Токен хранится только в памяти вкладки.', 'success');
    } catch(error) { token=''; connected=false; message('Доступ не подтверждён: ' + (error.message || 'ошибка'), 'error'); }
    finally { busy=false; setConnected(connected); }
  });
  disconnectButton.addEventListener('click',()=>{token='';connected=false;reportList.replaceChildren(node('p','empty','Токен очищен. Подключись, чтобы прочитать очередь.'));count.textContent='Нет данных';message('Токен удалён из памяти вкладки.','');setConnected(false);});
  refreshButton.addEventListener('click',load);
  $('#filter-status').addEventListener('change',load);
  $('#filter-game').addEventListener('change',load);
  setConnected(false);
  void configure();
})();