import { hasAnalyticsConsent } from './analyticsConsent.mjs'

const GAME_IDS = new Set(['time','swarm','null-shift','inherit','remix','civic-cascade','patina','signal-run','cascade-lab','afterimage-run','aether-grid'])
const DESTINATIONS = new Set(['development-intake', 'sponsorship-inquiry'])
const SESSION_KEY = 'osgard.games.conversion-session.v1'

function makeToken(prefix) {
  try {
    const uuid = globalThis.crypto?.randomUUID?.()
    if (uuid) return prefix + '_' + uuid
  } catch {
    // Use a non-identifying, tab-scoped fallback if the browser lacks randomUUID.
  }
  return prefix + '_' + Date.now().toString(36) + '_' + Math.random().toString(36).slice(2, 15)
}

function getSessionId() {
  try {
    const existing = window.sessionStorage.getItem(SESSION_KEY) || ''
    if (/^[a-zA-Z0-9_-]{12,96}$/.test(existing)) return existing
    const next = makeToken('session')
    window.sessionStorage.setItem(SESSION_KEY, next)
    return next
  } catch {
    return makeToken('session')
  }
}

/**
 * Records only the user's explicitly consented, allow-listed CTA intent.
 * The event contains no contact details, query string, referrer or auth token.
 * The public event endpoint is optional: a failed call never blocks navigation.
 */
export async function trackGameConversionClick(gameId, destination) {
  if (!hasAnalyticsConsent()) return false
  if (typeof window === 'undefined' || typeof window.fetch !== 'function') return false
  if (!DESTINATIONS.has(destination)) return false

  const event = {
    eventId: makeToken('evt'),
    name: 'cross_promo_clicked',
    sessionId: getSessionId(),
    gameId: GAME_IDS.has(gameId) ? gameId : 'unknown',
    source: 'game-detail-' + destination,
    path: window.location.pathname,
    durationSeconds: 0,
  }

  try {
    const response = await window.fetch('/commerce-api/v1/events', {
      method: 'POST',
      credentials: 'omit',
      cache: 'no-store',
      keepalive: true,
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ consent: true, events: [event] }),
    })
    return response.ok
  } catch {
    return false
  }
}
