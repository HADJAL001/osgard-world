(() => {
  'use strict';
  const $ = (selector, root = document) => root.querySelector(selector);
  const form = $('#campaign-form');
  const accessForm = $('#access-form');
  const tokenInput = $('#operator-token');
  const statusNode = $('#access-status');
  const formStatus = $('#form-status');
  const list = $('#campaign-list');
  const connectButton = $('#connect-button');
  const disconnectButton = $('#disconnect-button');
  const saveButton = $('#save-button');
  const refreshButton = $('#refresh-button');
  const editState = $('#edit-state');
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  let token = '';
  let editingId = '';
  let campaigns = [];

  function status(node, message, kind = '') {
    node.textContent = message;
    node.dataset.kind = kind;
  }
  function setConnected(connected) {
    connectButton.disabled = connected;
    disconnectButton.disabled = !connected;
    saveButton.disabled = !connected;
    refreshButton.disabled = !connected;
    $('#connection-state').textContent = connected ? 'API подключён' : 'API не подключён';
    $('#connection-state').dataset.state = connected ? 'ok' : '';
  }
  function apiBaseFromConfig(config) {
    const raw = typeof config?.apiBaseUrl === 'string' ? config.apiBaseUrl.trim() : '';
    if (!raw) return '';
    try {
      const parsed = new URL(raw, location.origin);
      const localApi = ['localhost', '127.0.0.1'].includes(parsed.hostname) &&
        parsed.protocol === 'http:' && parsed.pathname === '/';
      const sameOriginApi = parsed.origin === location.origin &&
        parsed.protocol === 'https:' && parsed.pathname === '/commerce-api';
      // This page carries a privileged Bearer token. Never send it to an arbitrary
      // host read from a public JSON file, even when that host uses HTTPS.
      if ((!sameOriginApi && !localApi) || parsed.username || parsed.password || parsed.search || parsed.hash) return '';
      return parsed.origin + parsed.pathname;
    } catch { return ''; }
  }
  async function getBase() {
    const response = await fetch('/games/commerce-config.json', {
      cache: 'no-store', credentials: 'same-origin', signal: AbortSignal.timeout(5000),
    });
    if (!response.ok) throw new Error('Не удалось прочитать конфигурацию Commerce API.');
    const config = await response.json();
    const base = apiBaseFromConfig(config);
    if (!base) throw new Error('Commerce API не настроен: apiBaseUrl должен указывать на подтверждённый HTTPS endpoint.');
    return base;
  }
  async function api(path, options = {}) {
    if (!token) throw new Error('Сначала подключите административный токен.');
    const base = await getBase();
    const response = await fetch(base + path, {
      method: options.method || 'GET',
      cache: 'no-store',
      credentials: 'omit',
      signal: AbortSignal.timeout(7000),
      headers: {
        Authorization: 'Bearer ' + token,
        ...(options.body ? { 'Content-Type': 'application/json' } : {}),
      },
      ...(options.body ? { body: JSON.stringify(options.body) } : {}),
    });
    const data = await response.json().catch(() => ({}));
    if (!response.ok) {
      const messages = {
        UNAUTHORIZED: 'Токен не принят. Проверьте ADMIN_API_TOKEN.',
        ADMIN_NOT_CONFIGURED: 'На сервере не настроен административный токен.',
        CAMPAIGNS_NOT_READY: 'База кампаний не готова. Проверьте Commerce API и PostgreSQL.',
        CAMPAIGN_SLOT_FULL: 'Достигнут лимит в три активные кампании.',
        CAMPAIGN_PLACEMENT_NOT_INTEGRATED: 'Это место ещё не подключено к работающему игровому экрану.',
        CAMPAIGN_URL_MUST_BE_SAFE_HTTPS: 'Используйте HTTPS-ссылку без логина, пароля, query-параметров и фрагмента.',
        CAMPAIGN_ACTIVE_WINDOW_MUST_INCLUDE_NOW: 'Для активной кампании начало должно быть в прошлом или сейчас, а окончание — в будущем.',
        CAMPAIGN_SCHEDULE_START_MUST_BE_FUTURE: 'Для запланированной кампании укажите будущее время начала.',
      };
      throw new Error(messages[data.error] || data.message || data.error || ('HTTP ' + response.status));
    }
    return data;
  }
  function localDateValue(value) {
    if (!value) return '';
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) return '';
    date.setMinutes(date.getMinutes() - date.getTimezoneOffset());
    return date.toISOString().slice(0, 16);
  }
  function toIso(value) {
    if (!value) return null;
    const date = new Date(value);
    if (!Number.isFinite(date.getTime())) throw new Error('Проверьте даты кампании.');
    return date.toISOString();
  }
  function getPayload() {
    const data = new FormData(form);
    return {
      sponsorName: String(data.get('sponsorName') || '').trim(),
      title: String(data.get('title') || '').trim(),
      description: String(data.get('description') || '').trim(),
      targetUrl: String(data.get('targetUrl') || '').trim(),
      placement: String(data.get('placement') || ''),
      status: String(data.get('status') || 'draft'),
      sponsorDisclosure: String(data.get('sponsorDisclosure') || 'Реклама'),
      frequencyCap: Number(data.get('frequencyCap')),
      startsAt: toIso(data.get('startsAt')),
      endsAt: toIso(data.get('endsAt')),
    };
  }
  function resetForm() {
    editingId = '';
    form.reset();
    form.elements.namedItem('frequencyCap').value = '3';
    editState.textContent = 'Новый черновик';
    saveButton.textContent = 'Создать кампанию';
    status(formStatus, '');
  }
  function safeText(tag, className, value) {
    const node = document.createElement(tag);
    if (className) node.className = className;
    node.textContent = String(value ?? '');
    return node;
  }
  function campaignDate(start, end) {
    if (!start || !end) return 'Период не задан';
    const a = new Date(start), b = new Date(end);
    if (!Number.isFinite(a.getTime()) || !Number.isFinite(b.getTime())) return 'Даты нужно проверить';
    return a.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' }) + ' — ' +
      b.toLocaleString('ru-RU', { dateStyle: 'medium', timeStyle: 'short' });
  }
  function makeButton(label, className, action) {
    const button = document.createElement('button');
    button.type = 'button'; button.className = 'button ' + (className || 'secondary');
    button.textContent = label; button.addEventListener('click', action);
    return button;
  }
  function editCampaign(item) {
    editingId = item.id;
    for (const field of ['sponsorName', 'title', 'description', 'targetUrl', 'placement', 'status', 'sponsorDisclosure', 'frequencyCap']) {
      form.elements.namedItem(field).value = String(item[field] ?? (field === 'frequencyCap' ? 3 : ''));
    }
    form.elements.namedItem('startsAt').value = localDateValue(item.startsAt);
    form.elements.namedItem('endsAt').value = localDateValue(item.endsAt);
    editState.textContent = 'Редактирование ' + item.id;
    saveButton.textContent = 'Сохранить изменения';
    status(formStatus, 'Изменения ещё не сохранены.');
    form.scrollIntoView({ behavior: matchMedia('(prefers-reduced-motion: reduce)').matches ? 'auto' : 'smooth', block: 'start' });
    form.elements.namedItem('sponsorName').focus({ preventScroll: true });
  }
  function renderCampaigns() {
    list.replaceChildren();
    if (!campaigns.length) {
      list.append(safeText('div', 'empty', 'Кампаний пока нет. Создайте черновик и проверьте официальную ссылку перед публикацией.'));
      return;
    }
    const labels = {
      draft: 'Черновик', scheduled: 'Запланирована', active: 'Активна', paused: 'Приостановлена',
      catalog_feature: 'Слот каталога', after_session: 'Между сессиями · не подключено',
      game_event: 'Игровое событие · не подключено',
    };
    for (const item of campaigns) {
      const card = document.createElement('article'); card.className = 'campaign-card';
      const top = document.createElement('div'); top.className = 'campaign-top';
      top.append(safeText('span', '', labels[item.placement] || item.placement));
      const pill = safeText('span', 'campaign-status', labels[item.status] || item.status);
      pill.dataset.status = item.status; top.append(pill);
      const title = safeText('h3', '', item.title);
      const sponsor = safeText('p', 'sponsor', item.sponsorName + ' · ' + item.sponsorDisclosure);
      const description = safeText('p', 'description', item.description);
      const meta = document.createElement('div'); meta.className = 'campaign-meta';
      for (const [value, label] of [
        [Number(item.impressions30d || 0).toLocaleString('ru-RU'), 'Видимые показы · 30 дн.'],
        [Number(item.clicks30d || 0).toLocaleString('ru-RU'), 'Переходы · 30 дн.'],
        [String(item.frequencyCap || 3), 'Лимит / устройство / день'],
      ]) {
        const metric = document.createElement('div');
        metric.append(safeText('b', '', value), safeText('small', '', label));
        meta.append(metric);
      }
      const footer = document.createElement('div'); footer.className = 'campaign-footer';
      const info = document.createElement('div');
      info.append(safeText('small', '', campaignDate(item.startsAt, item.endsAt)), safeText('div', 'campaign-id', item.id));
      const controls = document.createElement('div'); controls.className = 'actions';
      controls.append(makeButton('Редактировать', 'secondary', () => editCampaign(item)));
      if (item.status === 'active' || item.status === 'scheduled') {
        controls.append(makeButton('Приостановить', 'secondary', () => setPaused(item)));
      }
      footer.append(info, controls);
      card.append(top, title, sponsor, description, meta, footer);
      list.append(card);
    }
  }
  async function refresh() {
    status(statusNode, 'Загрузка списка кампаний…');
    const data = await api('/v1/admin/campaigns');
    campaigns = Array.isArray(data.items) ? data.items : [];
    renderCampaigns();
    status(statusNode, 'Подключено. Кампаний: ' + campaigns.length + '. Данные обновлены.', 'success');
  }
  async function setPaused(item) {
    if (!confirm('Приостановить кампанию «' + item.title + '»?')) return;
    const payload = {
      sponsorName: item.sponsorName, title: item.title, description: item.description, targetUrl: item.targetUrl,
      placement: item.placement, status: 'paused', sponsorDisclosure: item.sponsorDisclosure,
      frequencyCap: item.frequencyCap || 3, startsAt: item.startsAt, endsAt: item.endsAt,
    };
    try {
      await api('/v1/admin/campaigns/' + encodeURIComponent(item.id), { method: 'POST', body: payload });
      await refresh();
      status(statusNode, 'Кампания приостановлена.', 'success');
    } catch (error) {
      status(statusNode, error.message || 'Не удалось приостановить кампанию.', 'error');
    }
  }
  accessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!accessForm.reportValidity()) return;
    token = tokenInput.value.trim();
    if (token.length < 32) {
      token = ''; setConnected(false);
      return status(statusNode, 'Токен должен содержать не менее 32 символов.', 'error');
    }
    connectButton.disabled = true;
    try {
      await refresh();
      setConnected(true);
      tokenInput.value = '';
    } catch (error) {
      token = ''; setConnected(false);
      status(statusNode, error.message || 'Не удалось подключиться.', 'error');
    }
  });
  disconnectButton.addEventListener('click', () => {
    token = ''; campaigns = []; renderCampaigns(); setConnected(false);
    status(statusNode, 'Токен удалён из памяти вкладки.');
    tokenInput.value = '';
  });
  refreshButton.addEventListener('click', async () => {
    try { await refresh(); } catch (error) { status(statusNode, error.message || 'Не удалось обновить данные.', 'error'); }
  });
  $('#new-button').addEventListener('click', resetForm);
  form.addEventListener('change', () => {
    if (form.elements.namedItem('status').value === 'active' &&
        form.elements.namedItem('placement').value !== 'catalog_feature') {
      status(formStatus, 'Активное размещение пока разрешено только в каталоге. Для другого места оставьте черновик.', 'error');
    }
  });
  form.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!form.reportValidity() || !token) return;
    saveButton.disabled = true;
    try {
      const payload = getPayload();
      const result = await api(editingId ? '/v1/admin/campaigns/' + encodeURIComponent(editingId) : '/v1/admin/campaigns', {
        method: 'POST', body: payload,
      });
      status(formStatus, editingId ? 'Кампания обновлена.' : 'Кампания создана.', 'success');
      resetForm();
      await refresh();
      if (result.item?.status === 'active') status(formStatus, 'Кампания опубликована в слоте каталога. Метрики начнут поступать только при реальной видимости и разрешённой аналитике.', 'success');
    } catch (error) {
      status(formStatus, error.message || 'Не удалось сохранить кампанию.', 'error');
    } finally {
      saveButton.disabled = !token;
    }
  });

  // No visitor analytics is generated by merely opening this operator page.
  setConnected(false);
  renderCampaigns();
  if (new URLSearchParams(location.search).has('demo')) {
    status(statusNode, 'Демонстрационный режим не загружает и не записывает данные. Подключите настроенный API для настоящего списка.', 'error');
  }
})();
