(() => {
  "use strict";
  const CONFIG_URL = "/games/experiments/active.json";
  const CONSENT_KEY = "osgard.games.analytics-consent.v1";
  const ASSIGNMENT_PREFIX = "osgard.experiment.assignment.";
  const EXPOSURE_PREFIX = "osgard.experiment.exposure.";
  const CONVERSION_PREFIX = "osgard.experiment.conversion.";
  const CTA_SELECTOR = '[data-osgard-experiment="catalog-cta-v1"]';
  let configPromise = null;

  function consentGranted() {
    try { return localStorage.getItem(CONSENT_KEY) === "yes"; } catch { return false; }
  }
  function randomToken(prefix) {
    try {
      if (crypto && typeof crypto.randomUUID === "function") return prefix + crypto.randomUUID().replace(/-/g, "");
    } catch { /* fallback below */ }
    return prefix + Date.now().toString(36) + Math.random().toString(36).slice(2, 20);
  }
  function sessionValue(key, create) {
    try {
      let value = sessionStorage.getItem(key);
      if (!value && create) { value = create(); sessionStorage.setItem(key, value); }
      return value || "";
    } catch { return ""; }
  }
  function record(name, experimentId, variant) {
    if (!consentGranted()) return false;
    const queue = window.OSGARD_CONSENTED_ANALYTICS;
    if (!queue || typeof queue.enqueue !== "function") return false;
    const sessionId = sessionValue("osgard.experiment.session", () => randomToken("sess_"));
    if (!sessionId) return false;
    const event = {
      eventId: randomToken("exp_evt_"),
      name: name,
      sessionId: sessionId,
      gameId: "unknown",
      source: "experiment:" + experimentId + ":" + variant,
      path: location.pathname.split("?")[0].slice(0, 120) || "/games/",
      durationSeconds: 0
    };
    void queue.enqueue(event);
    return true;
  }
  function chooseVariant(config) {
    const key = ASSIGNMENT_PREFIX + config.experimentId;
    const prior = sessionValue(key, null);
    if (prior === "a" || prior === "b") return prior;
    const percentageA = Math.max(0, Math.min(100, Number(config.allocation && config.allocation.a || 50)));
    let pick;
    try {
      const array = new Uint32Array(1);
      crypto.getRandomValues(array);
      pick = (array[0] / 4294967296) * 100;
    } catch {
      pick = Math.random() * 100;
    }
    const variant = pick < percentageA ? "a" : "b";
    try { sessionStorage.setItem(key, variant); } catch { return ""; }
    return variant;
  }
  function restoreControl(button) {
    if (!button) return;
    const label = button.dataset.controlLabel || "Исследовать игры ↘";
    button.textContent = label;
    button.removeAttribute("data-experiment-variant");
    button.removeAttribute("data-experiment-active");
  }
  async function loadConfig() {
    if (!configPromise) {
      configPromise = fetch(CONFIG_URL, { cache: "no-store", credentials: "same-origin" })
        .then(response => response.ok ? response.json() : {})
        .catch(() => ({}));
    }
    return configPromise;
  }
  async function initialise() {
    const button = document.querySelector(CTA_SELECTOR);
    const config = await loadConfig();
    if (!button) return;
    button.dataset.controlLabel = button.dataset.controlLabel || button.textContent.trim();
    if (!config.enabled || config.experimentId !== "catalog-cta-v1" || !/^[a-z0-9-]{1,40}$/.test(config.experimentId)) {
      restoreControl(button);
      return;
    }
    if (!consentGranted() || !window.OSGARD_CONSENTED_ANALYTICS) {
      restoreControl(button);
      return;
    }
    const variant = chooseVariant(config);
    if (variant !== "a" && variant !== "b") { restoreControl(button); return; }
    const labels = config.variants || {};
    const label = labels[variant] && typeof labels[variant].cta === "string" ? labels[variant].cta.slice(0, 80) : "";
    if (!label) { restoreControl(button); return; }
    button.textContent = label;
    button.dataset.experimentVariant = variant;
    button.dataset.experimentActive = "true";
    const exposureKey = EXPOSURE_PREFIX + config.experimentId;
    if (sessionValue(exposureKey, null) !== "1") {
      if (record("experiment_exposure", config.experimentId, variant)) {
        try { sessionStorage.setItem(exposureKey, "1"); } catch { /* no persistent assignment */ }
      }
    }
    if (button.dataset.experimentClickBound !== "true") {
      button.dataset.experimentClickBound = "true";
      button.addEventListener("click", () => {
        if (!consentGranted()) return;
        const currentVariant = button.dataset.experimentVariant;
        if (currentVariant !== "a" && currentVariant !== "b") return;
        const key = CONVERSION_PREFIX + config.experimentId;
        if (sessionValue(key, null) === "1") return;
        if (record("experiment_conversion", config.experimentId, currentVariant)) {
          try { sessionStorage.setItem(key, "1"); } catch { /* event already queued */ }
        }
      });
    }
  }
  document.addEventListener("click", event => {
    if (event.target && event.target.closest && event.target.closest("#analytics-toggle")) {
      window.setTimeout(() => { void initialise(); }, 0);
    }
  });
  window.addEventListener("storage", event => {
    if (event.key === CONSENT_KEY) void initialise();
  });
  void initialise();
})();