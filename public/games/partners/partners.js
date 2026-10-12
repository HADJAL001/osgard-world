(() => {
'use strict';
const $ = (selector) => document.querySelector(selector);
const inventoryRoot = $('#inventory-grid');
const form = $('#campaign-form');
const status = $('#form-status');
const sendLink = $('#send-link');
const safeText = (value, max = 500) => String(value ?? '').replace(/[\u0000-\u001f\u007f]/g, ' ').trim().slice(0, max);
const isPlacement = (item) => item && /^[a-z0-9-]{1,40}$/.test(item.id) && typeof item.title === 'string' && item.title.length <= 100 && typeof item.description === 'string' && item.description.length <= 600 && item.active === false && item.sponsorLabelRequired === true && ['planned', 'inquiry'].includes(item.status);
function renderInventory(data) {
  if (!data || data.schemaVersion !== 1 || !Array.isArray(data.placements)) throw new Error('Некорректная схема инвентаря');
  const placements = data.placements.filter(isPlacement).slice(0, 12);
  if (!placements.length) throw new Error('Нет описанных форматов');
  inventoryRoot.replaceChildren();
  for (const item of placements) {
    const card = document.createElement('article'); card.className = 'format';
    const top = document.createElement('div'); top.className = 'format-top';
    const code = document.createElement('span'); code.className = 'format-code'; code.textContent = 'OSG / ' + safeText(item.number, 4);
    const tag = document.createElement('span'); tag.className = 'format-status'; tag.textContent = safeText(item.statusLabel, 50); top.append(code, tag);
    const title = document.createElement('h3'); title.textContent = safeText(item.title, 100);
    const description = document.createElement('p'); description.textContent = safeText(item.description, 600);
    const details = document.createElement('dl');
    for (const [label, value] of [['Где', item.where], ['Цель', item.bestFor], ['Статус', 'Не активировано']]) {
      const dt = document.createElement('dt'); dt.textContent = label;
      const dd = document.createElement('dd'); dd.textContent = safeText(value, 240); details.append(dt, dd);
    }
    const link = document.createElement('a'); link.className = 'format-link'; link.href = '#brief'; link.textContent = 'Обсудить формат ↗';
    link.addEventListener('click', () => { const field = form?.elements.namedItem('format'); if (field instanceof HTMLSelectElement) { const match = Array.from(field.options).find((option) => option.text.toLowerCase().includes(item.title.split(' ')[0].toLowerCase())); if (match) field.value = match.value; } });
    card.append(top, title, description, details, link); inventoryRoot.append(card);
  }
}
fetch('./inventory.json', { credentials: 'same-origin', cache: 'no-cache' })
  .then((response) => { if (!response.ok) throw new Error('HTTP ' + response.status); return response.json(); })
  .then(renderInventory)
  .catch(() => { inventoryRoot.replaceChildren(); const message = document.createElement('p'); message.className = 'load-state'; message.textContent = 'Каталог форматов временно недоступен. Напишите на osman.osmanov0099@gmail.com — подтвердим возможность интеграции вручную.'; inventoryRoot.append(message); });
form?.addEventListener('submit', (event) => {
  event.preventDefault(); if (!form.reportValidity()) return;
  const data = new FormData(form);
  const fields = ['OSGARD PLAY — запрос на партнёрскую интеграцию','Формат: ' + safeText(data.get('format'), 120),'Цель: ' + safeText(data.get('goal'), 120),'География: ' + safeText(data.get('geo'), 80),'Бюджет: ' + safeText(data.get('budget'), 80),'Компания и контакт: ' + safeText(data.get('contact'), 180),'Описание: ' + safeText(data.get('brief'), 1800),'Источник: osgard.world/games/partners/'];
  sendLink.href = 'https://wa.me/79640027222?text=' + encodeURIComponent(fields.join('\n'));
  sendLink.hidden = false;
  status.textContent = 'Черновик подготовлен локально. Откройте ссылку ниже, проверьте сообщение в WhatsApp и отправьте его вручную.';
  sendLink.focus();
});
const menu = $('#menu-toggle'); const mobile = $('#mobile-nav');
menu?.addEventListener('click', () => { const isOpen = menu.getAttribute('aria-expanded') === 'true'; menu.setAttribute('aria-expanded', String(!isOpen)); mobile.hidden = isOpen; });
mobile?.querySelectorAll('a').forEach((link) => link.addEventListener('click', () => { mobile.hidden = true; menu?.setAttribute('aria-expanded', 'false'); }));
})();
