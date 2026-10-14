(() => {
  'use strict';
  const API = '/commerce-api/v1';
  const $ = (selector, root = document) => root.querySelector(selector);
  const accessForm = $('#access-form');
  const tokenField = $('#token');
  const accessStatus = $('#access-status');
  const editorStatus = $('#editor-status');
  const editor = $('#editor');
  const list = $('#game-list');
  const saveButton = $('#save');
  const connectButton = $('#connect');
  const GENRES = ['tactical', 'systems', 'social', 'creative', 'arcade'];
  let operatorToken = '';

  function status(node, message, kind = '') { node.textContent = message; node.dataset.kind = kind; }
  function headers(json = false) {
    return { authorization: 'Bearer ' + operatorToken, ...(json ? { 'content-type': 'application/json' } : {}), accept: 'application/json' };
  }
  async function request(path, options = {}) {
    const response = await fetch(API + path, { credentials: 'same-origin', cache: 'no-store', redirect: 'error', signal: AbortSignal.timeout(8000), ...options });
    const type = response.headers.get('content-type') || '';
    const body = type.includes('application/json') ? await response.json() : null;
    if (!response.ok) {
      const message = body && typeof body.message === 'string' ? body.message : 'API ответил HTTP ' + response.status + '.';
      throw new Error(message);
    }
    if (!body) throw new Error('API вернул ответ неизвестного формата.');
    return body;
  }
  function field(labelText, name, value, type = 'text', full = false) {
    const label = document.createElement('label');
    label.className = 'field' + (full ? ' full' : '');
    const caption = document.createElement('span'); caption.textContent = labelText; label.append(caption);
    const control = type === 'textarea' ? document.createElement('textarea') : document.createElement('input');
    control.dataset.field = name;
    if (type !== 'textarea') control.type = type;
    if (type === 'number') { control.min = '1'; control.max = '99'; control.step = '1'; }
    if (type === 'textarea') control.maxLength = 520;
    else if (name === 'title') control.maxLength = 80;
    if (type === 'checkbox') { control.checked = Boolean(value); control.setAttribute('aria-label', labelText); }
    else control.value = String(value ?? '');
    label.append(control); return label;
  }
  function selectField(labelText, name, value) {
    const label = document.createElement('label'); label.className = 'field';
    const caption = document.createElement('span'); caption.textContent = labelText; label.append(caption);
    const select = document.createElement('select'); select.dataset.field = name;
    for (const [v, text] of [['playable', 'Игра доступна'], ['prototype', 'Прототип']]) {
      const option = document.createElement('option'); option.value = v; option.textContent = text; select.append(option);
    }
    select.value = value; label.append(select); return label;
  }
  function render(items) {
    if (!Array.isArray(items) || items.length !== 11) throw new Error('Список каталога не прошёл проверку схемы.');
    list.replaceChildren();
    for (const item of items) {
      const card = document.createElement('article'); card.className = 'game'; card.dataset.game = item.id;
      const head = document.createElement('div'); head.className = 'game-head';
      const identity = document.createElement('div'); const title = document.createElement('h3'); title.textContent = item.title;
      const code = document.createElement('div'); code.className = 'game-code'; code.textContent = item.id.toUpperCase();
      const route = document.createElement('code'); route.className = 'route'; route.textContent = 'Маршрут зафиксирован: ' + item.href;
      identity.append(title, code, route); head.append(identity);
      const form = document.createElement('div'); form.className = 'fields';
      form.append(field('Название карточки', 'title', item.title));
      form.append(selectField('Статус', 'status', item.status));
      form.append(field('Описание', 'description', item.description, 'textarea', true));
      form.append(field('Жанры через запятую', 'genres', item.genres.join(', '), 'text', true));
      form.append(field('Порядок показа', 'sortOrder', item.sortOrder, 'number'));
      const flags = document.createElement('div'); flags.className = 'flags';
      flags.append(field('Показывать в каталоге', 'visible', item.visible, 'checkbox'));
      flags.append(field('Выделить как главную', 'featured', item.featured, 'checkbox'));
      card.append(head, form, flags); list.append(card);
    }
    saveButton.disabled = false;
    $('#editor-title').textContent = 'Зарегистрированные игры · ' + items.length;
    status(editorStatus, 'Загружено ' + items.length + ' карточек. URL запуска остаются под серверным контролем.', 'success');
  }
  function readItems() {
    return [...list.querySelectorAll('[data-game]')].map((card) => {
      const value = (name) => card.querySelector('[data-field="' + name + '"]');
      const rawGenres = value('genres').value.split(',').map((v) => v.trim()).filter(Boolean);
      return {
        id: card.dataset.game,
        title: value('title').value,
        description: value('description').value,
        genres: rawGenres,
        sortOrder: Number(value('sortOrder').value),
        status: value('status').value,
        visible: value('visible').checked,
        featured: value('featured').checked,
      };
    });
  }
  async function load() {
    const body = await request('/admin/game-catalog', { method: 'GET', headers: headers() });
    if (body.schemaVersion !== 1 || !Array.isArray(body.items)) throw new Error('Сервер вернул некорректную схему каталога.');
    render(body.items);
    editor.hidden = false;
  }
  accessForm.addEventListener('submit', async (event) => {
    event.preventDefault();
    if (!accessForm.reportValidity()) return;
    operatorToken = tokenField.value.trim();
    connectButton.disabled = true;
    status(accessStatus, 'Проверяем права оператора…');
    try { await load(); status(accessStatus, 'Подключение подтверждено. Токен находится только в памяти вкладки.', 'success'); tokenField.value = ''; }
    catch (error) { operatorToken = ''; editor.hidden = true; list.replaceChildren(); status(accessStatus, error instanceof Error ? error.message : 'Не удалось подключиться.', 'error'); }
    finally { connectButton.disabled = false; }
  });
  saveButton.addEventListener('click', async () => {
    if (!operatorToken) return status(editorStatus, 'Сначала подключите API.', 'error');
    saveButton.disabled = true;
    status(editorStatus, 'Проверяем и сохраняем каталог на сервере…');
    try {
      const body = await request('/admin/game-catalog', { method: 'POST', headers: headers(true), body: JSON.stringify({ schemaVersion: 1, items: readItems() }) });
      if (body.schemaVersion !== 1 || !Array.isArray(body.items)) throw new Error('Сервер вернул неожиданный результат сохранения.');
      render(body.items);
      status(editorStatus, 'Изменения сохранены на сервере. Источник: ' + (body.source || 'database') + '.', 'success');
    } catch (error) { status(editorStatus, error instanceof Error ? error.message : 'Сохранение не выполнено.', 'error'); }
    finally { saveButton.disabled = false; }
  });
  $('#disconnect').addEventListener('click', () => {
    operatorToken = ''; tokenField.value = ''; editor.hidden = true; list.replaceChildren(); saveButton.disabled = true;
    status(accessStatus, 'Токен очищен из памяти вкладки.');
  });
})();
