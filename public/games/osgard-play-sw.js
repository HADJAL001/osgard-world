'use strict';

/*
 * OSGARD PLAY shell cache.
 * Only public, same-origin shell assets are eligible. Do not cache commerce,
 * admin, operator, checkout-success or cross-origin requests.
 */
const CACHE_PREFIX = 'osgard-play-shell-';
const CACHE_NAME = 'osgard-play-shell-v1.0.3';
const PRECACHE_URLS = [
  '/games/',
  '/games/index.html',
  '/games/app.webmanifest',
  '/games/osgard-play-icon.svg',
  '/games/offline.html',
  '/games/pwa-install.css',
  '/games/luxury.css',
  '/games/sponsored-campaigns.css',
  '/games/favicon.svg',
  '/games/pwa-install.js',
  '/games/deferred-enhancements.js',
  '/games/catalog-state.js',
  '/games/expedition/',
  '/games/expedition/index.html',
  '/games/expedition/core.js',
  '/games/expedition/app.js',
  '/games/expedition/catalog-runtime.js',
  '/games/expedition/expedition.css',
  '/games/device-fit.css',
  '/games/device-fit.js',
  '/games/experiment-core.js',
  '/games/experiment-runtime.js'
];
const PUBLIC_STATIC_ALLOWLIST = new Set([
  '/games/app.webmanifest',
  '/games/osgard-play-icon.svg',
  '/games/offline.html',
  '/games/pwa-install.css',
  '/games/luxury.css',
  '/games/luxury.js',
  '/games/sponsored-campaigns.css',
  '/games/pwa-install.js',
  '/games/deferred-enhancements.js',
  '/games/catalog-state.js',
  '/games/expedition/core.js',
  '/games/expedition/app.js',
  '/games/expedition/catalog-runtime.js',
  '/games/expedition/expedition.css',
  '/games/device-fit.css',
  '/games/device-fit.js',
  '/games/experiment-core.js',
  '/games/experiment-runtime.js',
  '/games/favicon.svg'
]);

function mustBypass(pathname) {
  return pathname === '/games/commerce-config.json'
    || pathname.startsWith('/commerce-api/')
    || pathname === '/commerce-api'
    || pathname.startsWith('/api/')
    || pathname.startsWith('/games/admin/')
    || pathname === '/games/admin'
    || pathname.startsWith('/games/operations/')
    || pathname === '/games/operations'
    || pathname.startsWith('/games/commerce-admin/')
    || pathname === '/games/commerce-admin'
    || pathname.startsWith('/games/premium/success/');
}

self.addEventListener('install', event => {
  event.waitUntil((async () => {
    const cache = await caches.open(CACHE_NAME);
    await Promise.all(PRECACHE_URLS.map(async path => {
      try {
        const response = await fetch(path, { cache: 'reload' });
        if (response.ok && response.type === 'basic') await cache.put(path, response);
      } catch {
        // A temporarily missing asset must not prevent the existing site from opening.
      }
    }));
    await self.skipWaiting();
  })());
});

self.addEventListener('activate', event => {
  event.waitUntil((async () => {
    const names = await caches.keys();
    await Promise.all(names
      .filter(name => name.startsWith(CACHE_PREFIX) && name !== CACHE_NAME)
      .map(name => caches.delete(name)));
    await self.clients.claim();
  })());
});

self.addEventListener('fetch', event => {
  const request = event.request;
  if (request.method !== 'GET') return;

  const url = new URL(request.url);
  if (url.origin !== self.location.origin || mustBypass(url.pathname)) return;

  if (request.mode === 'navigate') {
    event.respondWith((async () => {
      try {
        const response = await fetch(request);
        if (response.ok && (url.pathname === '/games/' || url.pathname === '/games/index.html')) {
          const cache = await caches.open(CACHE_NAME);
          // Cache only the generic catalogue shell, never its query-specific route state.
          await cache.put('/games/', response.clone());
        }
        return response;
      } catch {
        const cache = await caches.open(CACHE_NAME);
        if (url.pathname === '/games/' || url.pathname === '/games/index.html') {
          const cachedCatalog = await cache.match(url.pathname === '/games/' ? '/games/' : '/games/index.html');
          if (cachedCatalog) return cachedCatalog;
        }
        if (url.pathname === '/games/expedition/' || url.pathname === '/games/expedition/index.html') {
          const cachedExpedition = await cache.match(url.pathname === '/games/expedition/' ? '/games/expedition/' : '/games/expedition/index.html');
          if (cachedExpedition) return cachedExpedition;
        }
        const cached = await cache.match('/games/offline.html');
        return cached || new Response('OSGARD PLAY is offline. Reconnect and try again.', {
          status: 503,
          headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
        });
      }
    })());
    return;
  }

  if (!PUBLIC_STATIC_ALLOWLIST.has(url.pathname)) return;

  event.respondWith((async () => {
    try {
      const response = await fetch(request);
      if (response.ok && response.type === 'basic') {
        const cache = await caches.open(CACHE_NAME);
        await cache.put(request, response.clone());
      }
      return response;
    } catch {
      const cached = await caches.match(request, { ignoreSearch: true });
      return cached || new Response('This OSGARD PLAY asset is unavailable offline.', {
        status: 503,
        headers: { 'Content-Type': 'text/plain; charset=utf-8', 'Cache-Control': 'no-store' }
      });
    }
  })());
});

self.addEventListener('message', event => {
  if (event.data && event.data.type === 'OSGARD_PLAY_SKIP_WAITING') void self.skipWaiting();
});
