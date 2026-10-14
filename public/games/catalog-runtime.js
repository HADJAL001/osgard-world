(() => {
  'use strict';
  const endpoint = '/commerce-api/v1/game-catalog';
  const genreLabels = {
    tactical: 'Тактика', systems: 'Системы', social: 'Совместная игра',
    creative: 'Эксперименты', arcade: 'Аркады',
  };
  const statusLabels = { playable: 'Игра', prototype: 'Прототип' };
  const fallback = () => {};
  function safeItem(item) {
    return item && typeof item.id === 'string' && /^[a-z0-9-]{2,40}$/.test(item.id) &&
      typeof item.title === 'string' && item.title.length >= 2 && item.title.length <= 80 &&
      typeof item.description === 'string' && item.description.length >= 10 && item.description.length <= 520 &&
      typeof item.visible === 'boolean' && typeof item.featured === 'boolean' &&
      Number.isInteger(item.sortOrder) && item.sortOrder >= 1 && item.sortOrder <= 99 &&
      ['playable', 'prototype'].includes(item.status) &&
      Array.isArray(item.genres) && item.genres.length > 0 && item.genres.length <= 4 &&
      item.genres.every((genre) => Object.prototype.hasOwnProperty.call(genreLabels, genre));
  }
  function applyCatalog(payload) {
    if (!payload || payload.schemaVersion !== 1 || !Array.isArray(payload.items) || payload.items.length > 11 || !payload.items.every(safeItem)) return;
    const grid = document.getElementById('games-grid');
    if (!grid) return;
    const items = new Map(payload.items.map((item) => [item.id, item]));
    const cards = [...grid.querySelectorAll(':scope > [data-game]')];
    const managed = [];
    for (const card of cards) {
      const item = items.get(card.dataset.game);
      if (!item) continue;
      card.hidden = !item.visible;
      card.style.order = String(item.sortOrder);
      card.classList.toggle('featured', item.featured);
      const title = card.querySelector('.copy .game-title h3');
      if (title) title.textContent = item.title;
      const description = card.querySelector('.copy > p');
      if (description) description.textContent = item.description;
      card.dataset.title = item.title.toLocaleLowerCase();
      card.dataset.search = [item.title, item.description, item.genres.map((genre) => genreLabels[genre]).join(' ')].join(' ').toLocaleLowerCase();

      const tags = card.querySelector('.copy .tags');
      if (tags) {
        tags.replaceChildren();
        for (const genre of item.genres) {
          const tag = document.createElement('span');
          tag.textContent = genreLabels[genre];
          tags.append(tag);
        }
      }
      const kicker = card.querySelector('.copy .kicker');
      if (kicker) {
        let badge = kicker.querySelector('[data-catalog-status]');
        if (!badge) {
          badge = document.createElement('span');
          badge.dataset.catalogStatus = '1';
          badge.className = 'catalog-status';
          kicker.append(badge);
        }
        badge.textContent = statusLabels[item.status];
      }
      managed.push(card);
    }
    for (const item of [...items.values()].sort((a, b) => a.sortOrder - b.sortOrder)) {
      const card = managed.find((candidate) => candidate.dataset.game === item.id);
      if (card) grid.append(card);
    }
    const visibleCount = payload.items.filter((item) => item.visible).length;
    const total = document.getElementById('catalog-total');
    if (total) total.textContent = String(visibleCount);
    const range = document.getElementById('catalog-range');
    if (range) range.textContent = visibleCount ? '01—' + String(visibleCount).padStart(2, '0') : '00';
    const count = document.getElementById('result-count');
    if (count) count.textContent = visibleCount + ' игровых проектов';
    document.documentElement.dataset.catalogContentSource = payload.source === 'database' ? 'managed' : 'defaults';
  }
  if (typeof fetch !== 'function') return;
  fetch(endpoint, { method: 'GET', credentials: 'same-origin', cache: 'no-store', headers: { accept: 'application/json' }, signal: AbortSignal.timeout(4500) })
    .then((response) => response.ok ? response.json() : null)
    .then((payload) => { if (payload) applyCatalog(payload); })
    .catch(fallback);
})();
