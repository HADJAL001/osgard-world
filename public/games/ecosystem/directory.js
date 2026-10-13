(() => {
  'use strict';
  const cards = Array.from(document.querySelectorAll('[data-project]'));
  const search = document.getElementById('project-search');
  const chips = Array.from(document.querySelectorAll('[data-filter]'));
  const count = document.getElementById('project-count');
  const empty = document.getElementById('empty-state');
  const consentButton = document.getElementById('analytics-toggle');
  const consentState = document.getElementById('consent-state');
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const PENDING_KEY = 'osgard.games.analytics-pending.v1';
  let activeFilter = 'all';

  function currentConsent() {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; }
    catch { return false; }
  }
  function syncConsent() {
    const enabled = currentConsent();
    if (consentButton) {
      consentButton.setAttribute('aria-pressed', String(enabled));
      const label = consentButton.querySelector('b');
      if (label) label.textContent = enabled ? 'Выключить' : 'Разрешить';
    }
    if (consentState) consentState.textContent = enabled ? 'Аналитика разрешена' : 'Аналитика выключена';
  }
  function updateResults() {
    const query = String(search?.value || '').trim().toLocaleLowerCase('ru');
    let visible = 0;
    for (const card of cards) {
      const categoryMatches = activeFilter === 'all' || card.dataset.category === activeFilter;
      const haystack = [
        card.dataset.search || '',
        card.dataset.project || '',
        card.textContent || '',
      ].join(' ').toLocaleLowerCase('ru');
      const searchMatches = !query || haystack.includes(query);
      const show = categoryMatches && searchMatches;
      card.hidden = !show;
      if (show) visible += 1;
    }
    if (count) count.textContent = 'Показано ' + visible + ' из ' + cards.length + ' проектов';
    if (empty) empty.hidden = visible > 0;
    for (const chip of chips) chip.setAttribute('aria-pressed', String(chip.dataset.filter === activeFilter));
  }
  search?.addEventListener('input', updateResults);
  for (const chip of chips) {
    chip.addEventListener('click', () => {
      const next = chip.dataset.filter || 'all';
      if (next === activeFilter) return;
      activeFilter = next;
      updateResults();
    });
  }
  document.addEventListener('keydown', (event) => {
    if (event.key !== '/' || event.ctrlKey || event.metaKey || event.altKey) return;
    const target = event.target;
    if (target instanceof HTMLElement && (target.isContentEditable || /^(INPUT|TEXTAREA|SELECT)$/.test(target.tagName))) return;
    event.preventDefault();
    search?.focus();
  });
  consentButton?.addEventListener('click', () => {
    const next = !currentConsent();
    try {
      localStorage.setItem(CONSENT_KEY, next ? 'yes' : 'no');
      if (!next) localStorage.removeItem(PENDING_KEY);
    } catch {
      if (consentState) consentState.textContent = 'Настройку не удалось сохранить в этом браузере';
      syncConsent();
      return;
    }
    syncConsent();
    if (consentState) consentState.textContent = next
      ? 'Аналитика разрешена. Новые допустимые события могут записываться.'
      : 'Аналитика выключена. Ожидающие события удалены.';
  });
  window.addEventListener('storage', (event) => {
    if (event.key === CONSENT_KEY || event.key === null) syncConsent();
  });
  updateResults();
  syncConsent();
})();
