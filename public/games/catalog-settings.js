(() => {
  'use strict';
  const endpoint = '/games/commerce-config.json';
  const style = document.createElement('style');
  style.textContent = 'article.card[data-catalog-admin-hidden="1"]{display:none!important}.catalog-featured-badge{display:inline-flex;align-items:center;min-height:22px;padding:2px 7px;border:1px solid #d3ff6970;color:#d3ff69;font:8px/1.2 ui-monospace,Consolas,monospace;letter-spacing:.1em;white-space:nowrap}';
  document.head.append(style);
  async function applySettings() {
    try {
      const configResponse = await fetch(endpoint, { cache: 'no-store', credentials: 'same-origin', redirect: 'error' });
      if (!configResponse.ok) return;
      const publicConfig = await configResponse.json();
      const rawBase = typeof publicConfig.apiBaseUrl === 'string' ? publicConfig.apiBaseUrl.trim() : '';
      if (!rawBase) return;
      const api = new URL(rawBase, location.origin);
      if (api.protocol !== 'https:' && api.hostname !== 'localhost' && api.hostname !== '127.0.0.1') return;
      const response = await fetch(api.href.replace(/\/+$/, '') + '/v1/game-catalog', {
        cache: 'no-store',
        credentials: api.origin === location.origin ? 'same-origin' : 'omit',
        redirect: 'error',
      });
      if (!response.ok) return;
      const payload = await response.json();
      const config = payload && payload.config;
      if (!config || config.schemaVersion !== 1 || !Array.isArray(config.games) || config.games.length !== 10) return;
      const grid = document.querySelector('#games-grid');
      if (!grid) return;
      const cards = new Map(Array.from(grid.querySelectorAll('article.card[data-game]'), card => [card.dataset.game, card]));
      const sorted = config.games.slice().sort((a, b) => Number(a.order) - Number(b.order));
      for (const item of sorted) {
        const card = cards.get(item.id);
        if (!card || typeof item.visible !== 'boolean' || typeof item.featured !== 'boolean') continue;
        if (item.visible) delete card.dataset.catalogAdminHidden;
        else card.dataset.catalogAdminHidden = '1';
        const title = card.querySelector('.game-title h3');
        if (title) {
          if (!Object.prototype.hasOwnProperty.call(title.dataset, 'catalogOriginalText')) title.dataset.catalogOriginalText = title.textContent || '';
          title.textContent = typeof item.titleOverride === 'string' && item.titleOverride.trim() ? item.titleOverride : title.dataset.catalogOriginalText;
        }
        const summary = card.querySelector('.copy > p');
        if (summary) {
          if (!Object.prototype.hasOwnProperty.call(summary.dataset, 'catalogOriginalText')) summary.dataset.catalogOriginalText = summary.textContent || '';
          summary.textContent = typeof item.descriptionOverride === 'string' && item.descriptionOverride.trim() ? item.descriptionOverride : summary.dataset.catalogOriginalText;
        }
        const titleRow = card.querySelector('.game-title');
        let badge = titleRow && titleRow.querySelector('.catalog-featured-badge');
        if (item.featured && titleRow && !badge) {
          badge = document.createElement('span');
          badge.className = 'catalog-featured-badge';
          badge.textContent = 'OSGARD PICK';
          titleRow.append(badge);
        } else if (!item.featured && badge) badge.remove();
      }
      sorted.map(item => cards.get(item.id)).filter(Boolean).forEach(card => grid.append(card));
    } catch {
      // Settings are optional. Keep the published static catalog on any API/network failure.
    }
  }
  void applySettings();
})();