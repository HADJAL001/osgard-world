import type { OsgardEvent, OsgardEventName } from './manifest'
import { syncPlayerEvent } from './playerApi'
// The helper is shared with the zero-build smoke runner.
// @ts-expect-error JavaScript helper has a colocated runtime module.
import { reconcilePendingEvents } from './pendingEvents.mjs'
const STORAGE_KEY = 'osgard.core.events.v1'
const PENDING_KEY = 'osgard.core.events.pending.v1'
let flushPromise: Promise<void> | null = null
export function recordOsgardEvent(name: OsgardEventName, payload: Record<string, unknown> = {}) { const event: OsgardEvent = { id: crypto.randomUUID(), name, payload, occurredAt: new Date().toISOString(), schemaVersion: 1 }; try { const current = JSON.parse(localStorage.getItem(STORAGE_KEY) ?? '[]') as OsgardEvent[]; localStorage.setItem(STORAGE_KEY, JSON.stringify([...current.slice(-49), event])); const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as OsgardEvent[]; localStorage.setItem(PENDING_KEY, JSON.stringify([...pending.slice(-49), event])) } catch { /* storage is optional */ } void flushPendingEvents(); return event }
export function flushPendingEvents(): Promise<void> {
  if (flushPromise) return flushPromise
  flushPromise = (async () => {
    try {
      const pending = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as OsgardEvent[]
      const failed: OsgardEvent[] = []
      const completed = new Set<string>()
      for (const event of pending) {
        if (await syncPlayerEvent(event)) completed.add(event.id)
        else failed.push(event)
      }
      // Re-read after network work: events recorded during the flush must survive.
      const latest = JSON.parse(localStorage.getItem(PENDING_KEY) ?? '[]') as OsgardEvent[]
      const next = reconcilePendingEvents(latest, completed, failed)
      localStorage.setItem(PENDING_KEY, JSON.stringify(next.slice(-50)))
    } catch { /* storage/network is optional */ }
    finally { flushPromise = null }
  })()
  return flushPromise
}

if (typeof window !== 'undefined') {
  window.addEventListener('online', () => { void flushPendingEvents() })
  document.addEventListener('visibilitychange', () => {
    if (document.visibilityState === 'visible') void flushPendingEvents()
  })
}
