import assert from 'node:assert/strict';
import { readFileSync } from 'node:fs';
import { Script } from 'node:vm';

const page = readFileSync('public/games/index.html', 'utf8');
const client = readFileSync('public/games/device-fit.js', 'utf8');
const css = readFileSync('public/games/device-fit.css', 'utf8');
const pkg = JSON.parse(readFileSync('package.json', 'utf8'));
const release = readFileSync('scripts/release-readiness.mjs', 'utf8');
const serviceWorker = readFileSync('public/games/osgard-play-sw.js', 'utf8');
const pwaSmoke = readFileSync('scripts/osgard-play-pwa-smoke.mjs', 'utf8');
const optimizer = readFileSync('scripts/optimize-games-static-assets.mjs', 'utf8');

const gameIds = [
  'null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade',
  'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid',
];
for (const id of gameIds) {
  assert.ok(page.includes('data-game="' + id + '"'), 'catalog is missing game: ' + id);
}
assert.ok(page.includes('/games/device-fit.css?v=__OSGARD_BUILD_VERSION__'), 'device-fit CSS must be versioned with the catalog build');
assert.ok(page.includes('/games/device-fit.js?v=__OSGARD_BUILD_VERSION__'), 'device-fit JS must be versioned with the catalog build');
assert.ok(client.includes("hasContextApi('webgl2')") && client.includes("typeof window.WebGL2RenderingContext === 'function'"), 'must detect WebGL 2 API without creating a real GPU context');
assert.ok(!client.includes('.getContext(') && !client.includes("getExtension('WEBGL_lose_context')"), 'catalog entry must not allocate/destroy GPU contexts during the first render');
assert.ok(client.includes('navigator.maxTouchPoints'), 'must detect touch capability without claiming per-game touch support');
assert.ok(client.includes('prefers-reduced-motion: reduce'), 'must respect reduced motion');
assert.ok(client.includes('aria-live="polite"'), 'must announce filter results to assistive technology');
assert.ok(client.includes('data-osgard-fit-hidden'), 'filter must be reversible and scoped to this enhancement');
assert.ok(client.includes('Игры не блокируются автоматически'), 'the advisory must disclose that launch is not blocked');
assert.ok(client.includes('характеристики устройства не отправляются на сервер'), 'privacy statement must be explicit');
for (const forbidden of [
  /\bfetch\s*\(/i, /\bXMLHttpRequest\b/i, /sendBeacon/i,
  /localStorage/i, /sessionStorage/i, /document\.cookie/i, /gtag\s*\(/i,
]) assert.ok(!forbidden.test(client), 'smart launch must remain local-only; forbidden capability matched: ' + forbidden);
assert.ok(css.includes('@media(prefers-reduced-motion:reduce)'), 'CSS must honor the reduced-motion preference');
assert.ok(serviceWorker.includes("'/games/device-fit.css'") && serviceWorker.includes("'/games/device-fit.js'"), 'Smart Launch assets must be included in PWA cache');
assert.doesNotThrow(() => new Script(serviceWorker), 'The service worker must parse without syntax errors');
assert.ok(pwaSmoke.includes("'/games/device-fit.css'") && pwaSmoke.includes("'/games/device-fit.js'"), 'PWA smoke must enforce offline eligibility for Smart Launch assets');
assert.ok(optimizer.includes("'device-fit.css'") && optimizer.includes("'device-fit.js'"), 'Smart Launch assets must be optimized and precompressed');
assert.ok(/@media\(max-width:760px\)/.test(css), 'panel must include a mobile layout');
assert.equal(pkg.scripts['qa:device-fit'], 'node scripts/device-fit-smoke.mjs', 'package QA command is missing');
assert.ok(release.includes("check('device-fit-smoke'"), 'release readiness must run the new contract test');
assert.ok(pwaSmoke.includes('new Script(sw)'), 'PWA smoke should validate service worker parser contract');

assert.doesNotThrow(() => new Script(client), 'Smart Launch JavaScript must parse');
assert.ok(client.includes('const CARD_BATCH_LIMIT = 3'), 'catalog card work must use a small bounded batch');
assert.ok(client.includes('window.requestIdleCallback(callback, { timeout: 250 })'), 'catalog batching must yield to idle time with a bounded timeout');
assert.ok(client.includes('function annotateCard(card)') && client.includes('function processCardBatch()'), 'card annotation must be isolated from the initial setup task');
assert.ok(client.includes('if (cardIndex < cards.length) scheduleIdle(processCardBatch)'), 'remaining cards must be scheduled as separate tasks');

function makeRuntimeHarness() {
  const idleQueue = [];
  const doc = {
    readyState: 'complete',
    panel: null,
    chipsAdded: 0,
    querySelector(selector) {
      if (selector === '#games-grid') return this.grid;
      if (selector === '#osgard-device-fit') return this.panel;
      return null;
    },
    createElement(tag) { return new FakeElement(tag, this); },
  };
  class FakeElement {
    constructor(tag, ownerDocument) {
      this.tagName = tag;
      this.ownerDocument = ownerDocument;
      this.dataset = {};
      this.attributes = {};
      this.children = [];
      this.named = new Map();
      this.listeners = {};
      this.textContent = '';
      this.className = '';
      this.href = '';
      this.title = '';
      this.parentNode = null;
      this.strong = null;
      this._innerHTML = '';
    }
    set innerHTML(value) {
      this._innerHTML = value;
      for (const match of value.matchAll(/\bid="([^"]+)"/g)) {
        const id = match[1];
        const node = new FakeElement('div', this.ownerDocument);
        this.named.set(id, node);
        if (['osgard-fit-webgl', 'osgard-fit-input', 'osgard-fit-network', 'osgard-fit-motion'].includes(id)) {
          node.strong = new FakeElement('strong', this.ownerDocument);
        }
      }
    }
    get innerHTML() { return this._innerHTML; }
    setAttribute(name, value) { this.attributes[name] = String(value); }
    getAttribute(name) { return this.attributes[name] || (name === 'href' ? this.href : null); }
    querySelector(selector) {
      if (selector.startsWith('#')) return this.named.get(selector.slice(1)) || null;
      if (selector === 'strong') return this.strong;
      return null;
    }
    addEventListener(name, callback) { this.listeners[name] = callback; }
    appendChild(child) {
      this.children.push(child);
      if (child.className === 'osgard-fit-chip') this.ownerDocument.chipsAdded += 1;
      return child;
    }
    toggleAttribute(name, force) {
      if (force) this.attributes[name] = '';
      else delete this.attributes[name];
      return Boolean(force);
    }
  }

  const cards = [
    'null-shift', 'time', 'swarm', 'inherit', 'remix', 'civic-cascade',
    'patina', 'signal-run', 'cascade-lab', 'afterimage-run', 'aether-grid',
  ].map(id => {
    const card = new FakeElement('article', doc);
    card.dataset.game = id;
    const kicker = new FakeElement('div', doc);
    const anchor = new FakeElement('a', doc);
    anchor.href = '/games/' + id + '/';
    const heading = new FakeElement('h3', doc);
    heading.textContent = id.toUpperCase();
    card.querySelector = selector => {
      if (selector === '.kicker' || selector === '.copy') return kicker;
      if (selector === 'a[data-play]' || selector === 'a[href]') return anchor;
      if (selector === 'h3') return heading;
      return null;
    };
    return card;
  });
  const grid = new FakeElement('div', doc);
  grid.querySelectorAll = selector => selector === '[data-game]' ? cards : [];
  grid.parentNode = { insertBefore(panel) { doc.panel = panel; } };
  doc.grid = grid;
  const window = {
    WebGL2RenderingContext: function WebGL2RenderingContext() {},
    WebGLRenderingContext: function WebGLRenderingContext() {},
    matchMedia: () => ({ matches: false }),
    requestIdleCallback(callback) { idleQueue.push(callback); },
    setTimeout(callback) { idleQueue.push(callback); },
  };
  const navigator = { maxTouchPoints: 0, onLine: true, deviceMemory: 8 };
  return { doc, window, navigator, idleQueue, cards };
}

const runtime = makeRuntimeHarness();
new Script(client).runInNewContext({
  document: runtime.doc,
  window: runtime.window,
  navigator: runtime.navigator,
  performance: { now: () => 0 },
});
assert.equal(runtime.doc.chipsAdded, 0, 'first render must not decorate every catalogue card synchronously');
assert.equal(runtime.idleQueue.length, 1, 'first annotation batch must be scheduled');
let batches = 0;
while (runtime.idleQueue.length && batches < 10) {
  const callback = runtime.idleQueue.shift();
  const before = runtime.doc.chipsAdded;
  callback({ didTimeout: false, timeRemaining: () => 20 });
  const added = runtime.doc.chipsAdded - before;
  assert.ok(added <= 3, 'each idle task must annotate no more than three cards');
  batches += 1;
}
assert.equal(runtime.doc.chipsAdded, 11, 'all eleven catalogue cards must eventually receive the compatibility chip');
assert.equal(runtime.idleQueue.length, 0, 'all catalog work must finish');
assert.ok(batches >= 4, 'eleven cards must be split over multiple tasks');

console.log('PASS OSGARD Smart Launch: 11 catalog entries, local-only capability checks, reversible filtering, PWA syntax, mobile and reduced-motion contracts.');
