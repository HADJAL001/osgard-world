import type { OsgardEvent, OsgardEventName } from './manifest'
import { syncPlayerEvent } from './playerApi'
// The helper is shared with the zero-build smoke runner.
// @ts-expect-error JavaScript helper has a colocated runtime module.
import { reconcilePendingEvents } from './pendingEvents.mjs'
// @ts-expect-error JavaScript helper has a colocated runtime module.
import { ANALYTICS_CONSENT_KEY, clearAnalyticsRecords, hasAnalyticsConsent } from './analyticsConsent.mjs'

const STORAGE_KEY = 'osgard.core.events.v1'
const PENDING_KEY = 'osgard.core.events.pending.v1'
let flushPromise: Promise<void> | null = null

export function recordOsgardEvent(name: OsgardEventName, payload: Record<string, unknown> = {}) {
  const event: OsgardEvent = {
    id: crypto.randomUUID(),
    name,
    payload,
    occurredAt: new Date().toISOString(),
    schemaVersion: 1,
  }

  // Default-deny: without explicit consent, do not store, enqueue or transmit.
  if (!hasAnalyticsConsent()) {
    clearAnalyticsRecords()
    return event
  }

  try {
    const current = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as OsgardEvent[]
    localStorage.setItem(STORAGE_KEY, JSON.stringify([...current.slice(-49), event]))
    const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as OsgardEvent[]
    localStorage.setItem(PENDING_KEY, JSON.stringify([...pending.slice(-49), event]))
  } catch {
    // Storage is optional; analytics must never block the product experience.
  }

  if (hasAnalyticsConsent()) void flushPendingEvents()
  else clearAnalyticsRecords()
  return event
}

export function flushPendingEvents(): Promise<void> {
  if (!hasAnalyticsConsent()) {
    clearAnalyticsRecords()
    return Promise.resolve()
  }
  if (flushPromise) return flushPromise

  flushPromise = (async () => {
    try {
      if (!hasAnalyticsConsent()) {
        clearAnalyticsRecords()
        return
      }
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as OsgardEvent[]
      const failed: OsgardEvent[] = []
      const completed = new Set<string>()

      for (const event of pending) {
        // Recheck before and after every await so a revoke stops later sends.
        if (!hasAnalyticsConsent()) {
          clearAnalyticsRecords()
          return
        }
        const synced = await syncPlayerEvent(event)
        if (!hasAnalyticsConsent()) {
          clearAnalyticsRecords()
          return
        }
        if (synced) completed.add(event.id)
        else failed.push(event)
      }

      // Recheck after network work and re-read events recorded during the flush.
      if (!hasAnalyticsConsent()) {
        clearAnalyticsRecords()
        return
      }
      const latest = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as OsgardEvent[]
      const next = reconcilePendingEvents(latest, completed, failed)
      localStorage.setItem(PENDING_KEY, JSON.stringify(next.slice(-50)))
    } catch {
      // Storage/network is optional; the next explicit, consented retry may recover.
    } finally {
      flushPromise = null
    }
  })()
  return flushPromise
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => {
    if (hasAnalyticsConsent()) void flushPendingEvents()
  })
  window.addEventListener('storage', (event: StorageEvent) => {
    if (event.key !== ANALYTICS_CONSENT_KEY) return
    if (event.newValue !== 'yes') {
      clearAnalyticsRecords()
      return
    }
    void flushPendingEvents()
  })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') {
      if (hasAnalyticsConsent()) void flushPendingEvents()
      else clearAnalyticsRecords()
    }
  })
}
