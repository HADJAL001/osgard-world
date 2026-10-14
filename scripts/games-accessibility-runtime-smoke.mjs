import assert from 'node:assert/strict';
import { readFile } from 'node:fs/promises';
import { runInNewContext } from 'node:vm';

class ClassList {
  constructor() { this.values = new Set(); }
  toggle(name, force) {
    if (force === undefined ? !this.values.has(name) : force) this.values.add(name);
    else this.values.delete(name);
    return this.values.has(name);
  }
  contains(name) { return this.values.has(name); }
}
class Element {
  constructor(tagName = 'div', id = '') {
    this.tagName = tagName.toUpperCase();
    this.id = id;
    this.attributes = new Map();
    this.listeners = new Map();
    this.children = [];
    this.dataset = {};
    this.classList = new ClassList();
    this.checked = false;
    this.value = '';
    this.hidden = false;
    this.disabled = false;
    this.isConnected = true;
    this.textContent = '';
    this._innerHTML = '';
    this.className = '';
  }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type, event = {}) {
    const payload = { type, target: this, preventDefault() { this.defaultPrevented = true; }, ...event };
    for (const fn of this.listeners.get(type) || []) fn(payload);
    return payload;
  }
  setAttribute(name, value) { this.attributes.set(name, String(value)); }
  getAttribute(name) { return this.attributes.has(name) ? this.attributes.get(name) : null; }
  removeAttribute(name) { this.attributes.delete(name); }
  get open() { return this.attributes.has('open'); }
  focus() { this.ownerDocument.activeElement = this; }
  click() { this.dispatch('click'); }
  append(...items) {
    this.children.push(...items);
    for (const item of items) this.ownerDocument.register(item);
  }
  set innerHTML(value) {
    this._innerHTML = value;
    if (this.tagName !== 'DIALOG') return;
    const re = /<([a-z][a-z0-9]*)\b[^>]*\bid="([^"]+)"/gi;
    for (const match of value.matchAll(re)) {
      const element = new Element(match[1], match[2]);
      element.ownerDocument = this.ownerDocument;
      this.ownerDocument.register(element);
      this.children.push(element);
    }
  }
  get innerHTML() { return this._innerHTML; }
  querySelectorAll() {
    return this.children.filter(element =>
      ['BUTTON', 'A', 'INPUT', 'SELECT', 'TEXTAREA'].includes(element.tagName) &&
      !element.disabled && element.getAttribute('tabindex') !== '-1'
    );
  }
}
class FakeDocument {
  constructor() {
    this.nodes = new Map();
    this.listeners = new Map();
    this.activeElement = new Element('body');
    this.activeElement.ownerDocument = this;
    this.documentElement = new Element('html');
    this.documentElement.ownerDocument = this;
    this.documentElement.dataset = {};
    this.body = new Element('body');
    this.body.ownerDocument = this;
    this.body.append = (...nodes) => { for (const node of nodes) this.register(node); };
  }
  createElement(tag) {
    const node = new Element(tag);
    node.ownerDocument = this;
    return node;
  }
  register(node) {
    node.ownerDocument = this;
    if (node.id) this.nodes.set(node.id, node);
  }
  getElementById(id) { return this.nodes.get(id) || null; }
  addEventListener(type, fn) {
    if (!this.listeners.has(type)) this.listeners.set(type, []);
    this.listeners.get(type).push(fn);
  }
  dispatch(type, event = {}) {
    const payload = { type, target: this.activeElement, preventDefault() { this.defaultPrevented = true; }, ...event };
    for (const fn of this.listeners.get(type) || []) fn(payload);
    return payload;
  }
}
class MemoryStorage {
  constructor(initial = {}) { this.values = new Map(Object.entries(initial)); }
  getItem(key) { return this.values.has(key) ? this.values.get(key) : null; }
  setItem(key, value) { this.values.set(key, String(value)); }
  removeItem(key) { this.values.delete(key); }
}
class FakeCustomEvent { constructor(type) { this.type = type; } }

const a11ySource = await readFile('public/games/accessibility-center.js', 'utf8');
const document = new FakeDocument();
const windowEvents = new Map();
const window = {
  addEventListener(type, fn) {
    if (!windowEvents.has(type)) windowEvents.set(type, []);
    windowEvents.get(type).push(fn);
  },
  dispatchEvent(event) { for (const fn of windowEvents.get(event.type) || []) fn(event); },
};
const localStorage = new MemoryStorage({
  'osgard.games.accessibility.v1': JSON.stringify({ motion: 'corrupt', contrast: true, largeType: 'yes', largeTargets: false }),
});
const storageEvents = new Map();
window.dispatchEvent = (event) => {
  for (const fn of windowEvents.get(event.type) || []) fn(event);
};
runInNewContext(a11ySource, { window, document, localStorage, CustomEvent: FakeCustomEvent });

const api = window.OSGARDAccessibility;
assert.ok(api, 'accessibility centre should initialize without third-party libraries');
assert.deepEqual({ ...api.getPreferences() }, { motion: 'system', contrast: true, largeType: false, largeTargets: false },
  'stored settings must be normalized against the supported schema');
const dialog = document.getElementById('osgard-accessibility-dialog');
const trigger = document.getElementById('osgard-accessibility-open');
assert.ok(dialog && trigger, 'the launcher and settings dialog must be mounted');
api.open();
assert.equal(dialog.open, true, 'fallback dialog should open when showModal is unavailable');
assert.equal(dialog.getAttribute('aria-modal'), 'true', 'fallback dialog must announce modal semantics');
assert.equal(trigger.getAttribute('aria-expanded'), 'true', 'trigger must expose expanded state');
assert.equal(document.activeElement.id, 'osgard-a11y-motion', 'opening should move focus into dialog');
const focusable = dialog.querySelectorAll();
assert.ok(focusable.length >= 5, 'dialog must expose keyboard-focusable controls');
document.activeElement = focusable[0];
const shiftTab = document.dispatch('keydown', { key: 'Tab', shiftKey: true, altKey: false, ctrlKey: false, metaKey: false });
assert.equal(shiftTab.defaultPrevented, true, 'fallback modal should trap Shift+Tab at its first control');
assert.equal(document.activeElement, focusable.at(-1), 'Shift+Tab should wrap to the last control');

const contrast = document.getElementById('osgard-a11y-contrast');
contrast.checked = false;
contrast.dispatch('change', { target: contrast });
assert.equal(api.getPreferences().contrast, false, 'toggle change should update live preferences');
assert.equal(localStorage.getItem('osgard.games.accessibility.v1') !== null, true, 'preferences should persist locally');
assert.equal(document.documentElement.classList.contains('osgard-a11y-contrast'), false, 'live class should match the stored setting');

const escape = document.dispatch('keydown', { key: 'Escape', altKey: false, ctrlKey: false, metaKey: false, shiftKey: false });
assert.equal(escape.defaultPrevented, true, 'fallback modal should handle Escape');
assert.equal(dialog.open, false, 'Escape should close fallback dialog');
assert.equal(trigger.getAttribute('aria-expanded'), 'false', 'closed trigger should expose collapsed state');
assert.equal(document.activeElement, trigger, 'closing should restore focus to the opener');

localStorage.setItem('osgard.games.accessibility.v1', JSON.stringify({ motion: 'reduced', contrast: true, largeType: true, largeTargets: true }));
for (const fn of windowEvents.get('storage') || []) fn({ key: 'osgard.games.accessibility.v1' });
assert.deepEqual({ ...api.getPreferences() }, { motion: 'reduced', contrast: true, largeType: true, largeTargets: true },
  'external storage changes should synchronize the active tab');
api.reset();
assert.deepEqual({ ...api.getPreferences() }, { motion: 'system', contrast: false, largeType: false, largeTargets: false },
  'reset should restore complete defaults');
assert.equal(document.documentElement.classList.contains('osgard-a11y-contrast'), false, 'reset must remove active preference styles');
console.log('PASS accessibility runtime: schema normalization, local persistence, fallback focus trap, Escape, focus restoration, cross-tab sync and reset.');

const funnelSource = await readFile('public/games/catalog-funnel-events.js', 'utf8');
let consent = 'yes';
let queuedEvent = null;
let enqueueMode = 'reject';
const analytics = {
  enqueue(event) {
    queuedEvent = event;
    if (enqueueMode === 'throw') throw new Error('storage unavailable');
    return Promise.reject(new Error('queue offline'));
  },
};
const funnelWindow = {
  OSGARD_CONSENTED_ANALYTICS: analytics,
  addEventListener() {},
};
const funnelDocument = { getElementById: () => null, addEventListener() {} };
const sessionStorage = new MemoryStorage();
const funnelContext = {
  window: funnelWindow,
  document: funnelDocument,
  location: { pathname: '/games/' },
  localStorage: { getItem: key => key === 'osgard.games.analytics-consent.v1' ? consent : null },
  sessionStorage,
  crypto: { randomUUID: () => '00112233-4455-6677-8899-aabbccddeeff' },
  Promise,
  Element: class {},
  MutationObserver: undefined,
  setTimeout,
  clearTimeout,
};
runInNewContext(funnelSource, funnelContext);
const funnel = funnelWindow.OSGARDGamesFunnel;
assert.ok(funnel, 'consented funnel should initialize safely without player UI elements');
assert.equal(funnel.track('catalog_filter_changed', 'unknown', 'games-hub-filter:all'), true,
  'valid consented events should be accepted even if the offline queue later rejects');
assert.equal(queuedEvent?.name, 'catalog_filter_changed', 'event should use the allow-listed name');
assert.equal(queuedEvent?.path, '/games/', 'event should contain only the bounded local route');
assert.equal(JSON.stringify(queuedEvent).includes('password'), false, 'event should not include unrelated personal fields');
consent = 'no';
assert.equal(funnel.track('catalog_filter_changed'), false, 'refused consent must suppress events');
consent = 'yes';
enqueueMode = 'throw';
assert.equal(funnel.track('game_favorite_toggled', 'time'), false, 'synchronous queue errors must be contained');
console.log('PASS funnel runtime: consent default-deny, allowed event schema, bounded path, rejected queue and synchronous failure isolation.');
