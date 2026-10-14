export const ANALYTICS_CONSENT_KEY = 'osgard.games.analytics-consent.v1';

export const ANALYTICS_STORAGE_KEYS = Object.freeze([
  'osgard.core.events.v1',
  'osgard.core.events.pending.v1',
  'osgard.games.analytics-pending.v1',
]);

function resolveStorage(storage) {
  if (storage === null) return null;
  if (storage !== undefined) return storage;
  try {
    return globalThis.localStorage ?? null;
  } catch {
    return null;
  }
}

export function hasAnalyticsConsent(storage) {
  const target = resolveStorage(storage);
  if (!target) return false;
  try {
    return target.getItem(ANALYTICS_CONSENT_KEY) === 'yes';
  } catch {
    return false;
  }
}

export function clearAnalyticsRecords(storage) {
  const target = resolveStorage(storage);
  if (!target) return false;
  let cleared = true;
  for (const key of ANALYTICS_STORAGE_KEYS) {
    try {
      target.removeItem(key);
    } catch {
      cleared = false;
    }
  }
  return cleared;
}

/**
 * Stores the choice before returning success. When granting permission, old
 * queues are cleared first so pre-consent events can never be replayed.
 * When revoking, "no" is written first, before any best-effort cleanup.
 */
export function updateAnalyticsConsent(enabled, storage) {
  const target = resolveStorage(storage);
  if (!target) return { ok: false, cleared: false };

  if (enabled) {
    const cleared = clearAnalyticsRecords(target);
    if (!cleared) return { ok: false, cleared: false };
    try {
      target.setItem(ANALYTICS_CONSENT_KEY, 'yes');
      return { ok: true, cleared: true };
    } catch {
      return { ok: false, cleared: false };
    }
  }

  let ok = false;
  try {
    target.setItem(ANALYTICS_CONSENT_KEY, 'no');
    ok = true;
  } catch {
    // Continue with cleanup even if the preference cannot be persisted.
  }
  const cleared = clearAnalyticsRecords(target);
  return { ok, cleared };
}
