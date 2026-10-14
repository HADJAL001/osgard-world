import assert from 'node:assert/strict';
import { Script } from 'node:vm';
import { existsSync, readFileSync } from 'node:fs';
import { resolve } from 'node:path';
import { runInNewContext } from 'node:vm';

const read = path => readFileSync(resolve(path), 'utf8');
const root = 'public/games';
const page = read(root + '/index.html');
const manifest = JSON.parse(read(root + '/app.webmanifest'));
const icon = read(root + '/osgard-play-icon.svg');
const offline = read(root + '/offline.html');
const css = read(root + '/pwa-install.css');
const install = read(root + '/pwa-install.js');
const deferredEnhancements = read(root + '/deferred-enhancements.js');
const sw = read(root + '/osgard-play-sw.js');
const stateScript = read(root + '/catalog-state.js');
const clientAnalytics = read(root + '/consented-analytics.js');
const serverCore = read('services/osgard-commerce-api/src/core.mjs');
const packageJson = JSON.parse(read('package.json'));
const workflow = read('.github/workflows/osgard-play-qa.yml');

for (const path of [
  root + '/app.webmanifest', root + '/osgard-play-icon.svg', root + '/offline.html',
  root + '/pwa-install.css', root + '/pwa-install.js', root + '/deferred-enhancements.js', root + '/device-fit.css', root + '/device-fit.js', root + '/experiment-core.js', root + '/experiment-runtime.js', root + '/osgard-play-sw.js',
  root + '/catalog-state.js'
]) assert.ok(existsSync(resolve(path)), 'Missing PWA asset: ' + path);

assert.equal(manifest.scope, '/games/');
assert.equal(new URL(manifest.start_url, 'https://osgard.world').pathname, '/games/');
assert.equal(manifest.display, 'standalone');
assert.ok(manifest.icons.some(item => item.src === '/games/osgard-play-icon.svg' && item.type === 'image/svg+xml'));
assert.equal(manifest.shortcuts.length, 3);
for (const shortcut of manifest.shortcuts) {
  const path = new URL(shortcut.url, 'https://osgard.world').pathname;
  assert.ok(path.startsWith('/games/'), 'PWA shortcuts must remain same-origin under /games/');
}
assert.ok(icon.includes('<svg') && icon.includes('viewBox="0 0 512 512"'));
assert.ok(!/<script[^>]+src=["']https?:/i.test(offline), 'Offline page must not require a third-party script');
assert.ok(offline.includes('нет соединения') || offline.includes('Нет соединения'));
assert.ok(offline.includes('Вернуться в каталог'));
assert.ok(page.includes('rel="manifest"') && page.includes('app.webmanifest'));
assert.ok(page.includes('id="pwa-install-panel"') && page.includes('id="pwa-install-button"'));
assert.ok(page.includes('id="catalog-share-state"') && page.includes('id="catalog-share-status"'));
assert.ok(page.includes('/games/pwa-install.css?v=__OSGARD_BUILD_VERSION__'));
assert.ok(page.includes('/games/deferred-enhancements.js?v=__OSGARD_BUILD_VERSION__'));
assert.ok(!page.includes('<script src="/games/pwa-install.js?v=__OSGARD_BUILD_VERSION__" defer></script>'));
assert.ok(!page.includes('<script src="/games/experiment-core.js?v=__OSGARD_BUILD_VERSION__" defer></script>'));
assert.ok(!page.includes('<script src="/games/experiment-runtime.js?v=__OSGARD_BUILD_VERSION__" defer></script>'));
assert.ok(deferredEnhancements.includes("loadScript('pwa-install.js')"));
assert.ok(deferredEnhancements.includes("loadScript('experiment-core.js')"));
assert.ok(deferredEnhancements.includes("loadScript('experiment-runtime.js')"));
assert.ok(deferredEnhancements.includes('4200') && deferredEnhancements.includes('requestIdleCallback'));
assert.ok(page.includes('/games/device-fit.css?v=__OSGARD_BUILD_VERSION__'));
assert.ok(page.includes('/games/device-fit.js?v=__OSGARD_BUILD_VERSION__'));
assert.ok(page.includes('rel="preload" as="style" href="/games/sponsored-campaigns.css?v=__OSGARD_BUILD_VERSION__"'));
assert.ok(page.includes('<noscript><link rel="stylesheet" href="/games/sponsored-campaigns.css?v=__OSGARD_BUILD_VERSION__">'));
assert.doesNotThrow(() => new Script(sw), 'The PWA service worker must be valid JavaScript before release.');
assert.ok(page.includes('/games/catalog-state.js?v=__OSGARD_BUILD_VERSION__'));
assert.ok(css.includes('@media(max-width:620px)') && css.includes('prefers-reduced-motion:reduce'));
assert.ok(install.includes("addEventListener('beforeinstallprompt'") && install.includes("addEventListener('appinstalled'"));
assert.ok(deferredEnhancements.includes("addEventListener('beforeinstallprompt'") && deferredEnhancements.includes('window.OSGARDInstallPrompt'), 'Early install prompt must survive deferred installer loading.');
assert.ok(install.includes('navigator.serviceWorker.register') && install.includes("scope: '/games/'"));
assert.ok(install.includes('osgard.games.analytics-consent.v1'), 'PWA analytics must use the existing consent key');
assert.ok(install.includes("track('pwa_install_prompt_shown')") && install.includes("track('pwa_install_accepted')") && install.includes("track('pwa_install_dismissed')"));
assert.ok(install.includes('Safari') && install.includes('На экран') && install.includes('aria-hidden'));
assert.ok(install.includes("storageName === 'session'") && install.includes('window.localStorage'), 'Install flow must degrade safely when browser storage access is blocked.');
assert.ok(!install.includes('document.cookie') && !install.includes('fetch('), 'Install helper must not add non-consented trackers or network APIs');
assert.ok(sw.includes("if (request.method !== 'GET') return"));
assert.ok(sw.includes('url.origin !== self.location.origin'));
for (const path of ['/games/admin/', '/games/operations/', '/games/commerce-admin/', '/games/premium/success/', '/games/commerce-config.json', '/commerce-api/']) {
  assert.ok(sw.includes(path), 'Private or API routes must be excluded from the offline cache: ' + path);
}
assert.ok(sw.includes("request.mode === 'navigate'") && sw.includes('/games/offline.html'));
const precacheStart = sw.indexOf('const PRECACHE_URLS = [');
const precacheEnd = sw.indexOf('];', precacheStart);
const precacheSource = sw.slice(precacheStart, precacheEnd);
const precachePaths = [...precacheSource.matchAll(/'([^']+)'/g)].map(match => match[1]);
assert.equal(precachePaths.length, new Set(precachePaths).size, 'PWA precache must not contain duplicate paths.');
const staticAllowlistStart = sw.indexOf('const PUBLIC_STATIC_ALLOWLIST = new Set([');
const staticAllowlistEnd = sw.indexOf(']);', staticAllowlistStart);
const staticAllowlist = sw.slice(staticAllowlistStart, staticAllowlistEnd);
for (const path of ['/games/luxury.css', '/games/deferred-enhancements.js', '/games/device-fit.css', '/games/device-fit.js', '/games/experiment-core.js', '/games/experiment-runtime.js', '/games/sponsored-campaigns.css', '/games/favicon.svg','/games/expedition/core.js','/games/expedition/app.js','/games/expedition/catalog-runtime.js','/games/expedition/expedition.css']) {
  assert.ok(precachePaths.includes(path), 'Core public shell asset must be precached: ' + path);
  assert.ok(staticAllowlist.includes("'" + path + "'"), 'Core public shell asset must be allowed for cached fallback: ' + path);
}
assert.ok(precachePaths.includes('/games/expedition/') && precachePaths.includes('/games/expedition/index.html'), 'The expedition builder shell must remain available offline');
assert.ok(sw.includes("url.pathname === '/games/expedition/'") && sw.includes("const cachedExpedition = await cache.match(url.pathname === '/games/expedition/' ? '/games/expedition/' : '/games/expedition/index.html')"), 'Offline navigation should return the cached expedition builder when available');
assert.ok(sw.includes("cache.put('/games/'") && sw.includes('ignoreSearch: true'));
assert.ok(sw.includes('CACHE_PREFIX') && sw.includes('caches.delete(name)'));
assert.ok(!sw.includes("caches.match(request) || fetch(request)"), 'Do not use a stale generic cache-first strategy for the entire site.');
assert.ok(stateScript.includes("params.get('q')") && stateScript.includes("params.get('genre')") && stateScript.includes("params.get('favorites')") && stateScript.includes("params.get('games')"));
assert.ok(stateScript.includes("url.searchParams.delete(key)") && stateScript.includes('history.replaceState'));
assert.ok(stateScript.includes("url.searchParams.set('games', selected.join(','))"));
assert.ok(stateScript.includes("osgard.games.favorites.v1"), 'Shared favorites must be the sender actual game IDs, not the receiver-local favorites flag.');
assert.ok(stateScript.includes("name: 'share_created'") && stateScript.includes('catalog-filter-share'));
assert.ok(stateScript.includes("new URL('/games/', location.origin)"), 'Shared catalogue links must not leak incoming referral or campaign parameters.');
assert.ok(stateScript.includes('window.OSGARDCatalogState = Object.freeze'));

const eventNames = [
  'pwa_install_prompt_shown',
  'pwa_install_accepted',
  'pwa_install_dismissed',
  'pwa_standalone_opened'
];
for (const name of eventNames) {
  assert.ok(clientAnalytics.includes("'" + name + "'"), 'Client analytics must allow ' + name);
  assert.ok(serverCore.includes('"' + name + '"'), 'Server analytics must allow ' + name);
}
assert.equal(packageJson.scripts['qa:pwa'], 'node scripts/osgard-play-pwa-smoke.mjs');
assert.ok(workflow.includes('npm run qa:pwa') && workflow.includes('npm run qa:games-portal'));

const context = {
  URL, URLSearchParams, location: { search: '?q=%20city%20&genre=systems&favorites=1' },
  window: {}, document: {
    getElementById: () => null,
    querySelector: () => null,
    querySelectorAll: () => []
  }
};
runInNewContext(stateScript, context);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.window.OSGARDCatalogState.normalizedState({ query: '  flood  ', genre: 'tactical', favorites: 1 }))),
  { query: 'flood', genre: 'tactical', favorites: true }
);
assert.deepEqual(
  JSON.parse(JSON.stringify(context.window.OSGARDCatalogState.cleanGameIds('swarm,bad,swarm,aether-grid', ['swarm', 'aether-grid']))),
  ['swarm', 'aether-grid'],
  'Shared collections must contain unique IDs from the allow-list.'
);
console.log('PASS OSGARD PLAY PWA: manifest, install flow, offline cache boundary, shareable catalog state, consented metrics, and release CI');
