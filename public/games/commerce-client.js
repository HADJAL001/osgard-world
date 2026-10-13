(() => {
  'use strict';
  const API_FALLBACK = '/commerce-api';
  const configPromise = fetch('/games/commerce-config.json', { cache: 'no-store', credentials: 'same-origin' })
    .then((response) => response.ok ? response.json() : {})
    .catch(() => ({}));
  const clean = (value, max = 1800) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
  const apiBase = async () => {
    const config = await configPromise;
    return String(config.apiBaseUrl || API_FALLBACK).replace(/\/+$/, '');
  };
  function fallbackLink(form, text) {
    const status = form.querySelector('[role="status"]') || document.getElementById('form-status');
    let link = form.querySelector('#form-fallback-link') || document.getElementById('send-link');
    if (!link) {
      link = document.createElement('a');
      link.id = 'form-fallback-link';
      link.className = 'btn primary';
      link.target = '_blank';
      link.rel = 'noopener noreferrer';
      link.textContent = 'Открыть подготовленное сообщение в WhatsApp ↗';
      const submit = form.querySelector('[type="submit"]');
      submit?.insertAdjacentElement('afterend', link);
    }
    link.href = 'https://wa.me/79640027222?text=' + encodeURIComponent(text);
    link.hidden = false;
    if (status) status.textContent = 'Заявка не отправлена автоматически. Проверьте подготовленное сообщение и отправьте его в WhatsApp вручную.';
    link.focus();
  }
  async function submitLead(form) {
    if (!form.reportValidity()) return;
    const data = new FormData(form);
    const projectType = clean(data.get('projectType') || ('Партнёрская интеграция: ' + clean(data.get('format'), 120)), 120);
    const contact = clean(data.get('contact'), 180);
    const budget = clean(data.get('budget'), 80);
    const description = clean(data.get('brief') || [
      'Цель: ' + clean(data.get('goal'), 120),
      'География: ' + clean(data.get('geo'), 80),
    ].filter(Boolean).join('\n'), 1800);
    const consent = data.get('dataConsent') === 'on' || data.get('consent') === 'on';
    const status = form.querySelector('[role="status"]') || document.getElementById('form-status');
    const fallbackText = [
      'Здравствуйте! Хочу обсудить проект с OSGARD.',
      'Направление: ' + projectType,
      'Бюджет: ' + (budget || 'не указан'),
      'Мой контакт: ' + contact,
      'Описание: ' + description,
      'Источник: ' + location.pathname,
    ].join('\n');

    if (!consent) {
      if (status) status.textContent = 'Подтвердите обработку данных для ответа на заявку.';
      return;
    }
    const button = form.querySelector('[type="submit"]');
    if (button) button.disabled = true;
    if (status) status.textContent = 'Проверяем подключение безопасной формы…';
    try {
      const base = await apiBase();
      const response = await fetch(base + '/v1/leads', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({
          projectType,
          budget,
          contact,
          description,
          consent: true,
          website: clean(data.get('website'), 200),
          sourcePath: location.pathname,
          campaign: clean(new URLSearchParams(location.search).get('utm_campaign') || '', 80),
          campaignMedium: clean(new URLSearchParams(location.search).get('utm_medium') || '', 80),
          campaignContent: clean(new URLSearchParams(location.search).get('utm_content') || '', 80),
        }),
      });
      const result = await response.json().catch(() => ({}));
      if (!response.ok || result.accepted !== true) {
        throw new Error(result.message || 'LEAD_NOT_ACCEPTED');
      }
      if (status) status.textContent = 'Заявка сохранена. Номер: ' + clean(result.leadId || 'принято', 80) + '. Для ответа используем указанный контакт.';
      if (form.id === 'campaign-form') {
        const sendLink = document.getElementById('send-link');
        if (sendLink) sendLink.hidden = true;
      } else {
        const fallback = document.getElementById('form-fallback-link');
        if (fallback) fallback.hidden = true;
      }
      form.reset();
      sendAnalytics('lead_submitted', 'unknown');
    } catch {
      if (status) status.textContent = 'Сервер заявок пока недоступен или не настроен. Ниже можно открыть черновик и отправить его вручную.';
      fallbackLink(form, fallbackText);
    } finally {
      if (button) button.disabled = false;
    }
  }
  function sendAnalytics(name, gameId, source = 'contact-form') {
    let allowed = false;
    try { allowed = localStorage.getItem('osgard.games.analytics-consent.v1') === 'yes'; } catch {}
    if (!allowed) return;
    const sessionId = 'session_' + (globalThis.crypto?.randomUUID?.() || (Date.now().toString(36) + Math.random().toString(36).slice(2, 15))).replace(/[^a-zA-Z0-9_-]/g, '');
    void apiBase().then((base) => fetch(base + '/v1/events', {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, events: [{ name, sessionId, gameId, source: clean(source, 80), path: location.pathname, durationSeconds: 0 }] }),
    })).catch(() => {});
  }
  document.addEventListener('click', (event) => {
    const target = event.target;
    const anchor = target instanceof Element ? target.closest('a[href]') : null;
    if (!anchor) return;
    let url;
    try { url = new URL(anchor.href, location.href); } catch { return; }
    if (url.origin === location.origin || url.searchParams.get('utm_source') !== 'osgard_games' || url.searchParams.get('utm_medium') !== 'cross_promo') return;
    let gameId = 'unknown';
    const gameCard = anchor.closest('[data-game]');
    if (gameCard) gameId = clean(gameCard.getAttribute('data-game'), 40);
    const destination = clean(url.searchParams.get('utm_content'), 40) || 'project';
    sendAnalytics('cross_promo_clicked', gameId || 'unknown', 'cross-promo:' + destination);
  }, true);
  document.addEventListener('submit', (event) => {
    const form = event.target;
    if (!(form instanceof HTMLFormElement) || !['project-form', 'campaign-form'].includes(form.id)) return;
    event.preventDefault();
    event.stopImmediatePropagation();
    void submitLead(form);
  }, true);
})();