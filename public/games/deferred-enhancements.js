(() => {
  'use strict';

  const BUILD_VERSION = document.querySelector('meta[name="osgard-build"]')?.content || 'local';
  const CONSENT_KEY = 'osgard.games.analytics-consent.v1';
  const scripts = new Map();
  let installPromise = null;
  let experimentPromise = null;

  // Capture the browser install event immediately; the non-critical installer itself loads later.
  if (!('OSGARDInstallPrompt' in window)) window.OSGARDInstallPrompt = null;
  window.addEventListener('beforeinstallprompt', event => {
    event.preventDefault();
    window.OSGARDInstallPrompt = event;
  });

  const installButton = document.getElementById('pwa-install-button');
  const installStatus = document.getElementById('pwa-install-status');
  const heroCta = document.getElementById('catalog-hero-cta');
  const analyticsToggle = document.getElementById('analytics-toggle');

  function hasAnalyticsConsent() {
    try { return localStorage.getItem(CONSENT_KEY) === 'yes'; }
    catch { return false; }
  }

  function loadScript(name) {
    const src = '/games/' + name + '?v=' + encodeURIComponent(BUILD_VERSION);
    if (scripts.has(src)) return scripts.get(src);

    const promise = new Promise((resolve, reject) => {
      const script = document.createElement('script');
      script.src = src;
      script.async = true;
      script.onload = () => resolve(true);
      script.onerror = () => {
        scripts.delete(src);
        reject(new Error('Optional OSGARD enhancement failed to load: ' + name));
      };
      document.head.appendChild(script);
    });
    scripts.set(src, promise);
    return promise;
  }

  function ensureInstallFeatures() {
    if (window.OSGARDPwaInstallReady) return Promise.resolve(true);
    if (!installPromise) {
      installPromise = loadScript('pwa-install.js').then(() => true).catch(() => {
        installPromise = null;
        if (installStatus) installStatus.textContent = 'Установка временно недоступна. Каталог продолжает работать; попробуй ещё раз позже.';
        return false;
      });
    }
    return installPromise;
  }

  function ensureExperiment() {
    if (!hasAnalyticsConsent()) return Promise.resolve(false);
    if (window.OSGARDProductExperiment) return Promise.resolve(true);
    if (!experimentPromise) {
      experimentPromise = loadScript('experiment-core.js')
        .then(() => loadScript('experiment-runtime.js'))
        .then(() => true)
        .catch(() => {
          experimentPromise = null;
          return false;
        });
    }
    return experimentPromise;
  }

  if (installButton) {
    installButton.addEventListener('click', () => {
      if (window.OSGARDPwaInstallReady) return;
      if (installStatus) installStatus.textContent = 'Подготавливаем функции установки. Нажми кнопку ещё раз через несколько секунд.';
      void ensureInstallFeatures().then(ready => {
        if (ready && installStatus && !window.OSGARDInstallPrompt) {
          installStatus.textContent = 'Готово. Нажми кнопку ещё раз, чтобы открыть инструкции по установке.';
        }
      });
    });
  }

  // Preload the optional experiment when the player approaches the tested CTA.
  // Analytics and variant assignment remain consent-gated inside experiment-runtime.js.
  const warmExperiment = () => { if (hasAnalyticsConsent()) void ensureExperiment(); };
  heroCta?.addEventListener('pointerenter', warmExperiment, { once: true, passive: true });
  heroCta?.addEventListener('focus', warmExperiment, { once: true });

  analyticsToggle?.addEventListener('click', () => {
    window.setTimeout(warmExperiment, 0);
  });
  window.addEventListener('storage', event => {
    if (event.key === CONSENT_KEY && event.newValue === 'yes') warmExperiment();
  });

  function startNonCriticalFeatures() {
    // Schedule only after the initial interactive window. PWA caching and experiment
    // attribution are useful, but neither should compete with the first mobile render.
    void ensureInstallFeatures();
    window.setTimeout(warmExperiment, 900);
  }

  window.addEventListener('load', () => {
    window.setTimeout(() => {
      if (typeof window.requestIdleCallback === 'function') {
        window.requestIdleCallback(startNonCriticalFeatures, { timeout: 1500 });
      } else {
        startNonCriticalFeatures();
      }
    }, 4200);
  }, { once: true });
})();