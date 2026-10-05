export type PlayerProfile = { avatarFrame?: string; displayName?: string; version?: number }
export type PlayerNotification = { id: string; message: string; createdAt: number }
export type PlayerSession = { id: string; gameId: string; status: 'active' | 'completed'; payload: Record<string, unknown>; startedAt: number; completedAt?: number | null }

function token() { return localStorage.getItem('osgard.auth.accessToken') }
function headers() { const value = token(); return value ? { authorization: `Bearer ${value}`, 'content-type': 'application/json' } : null }

export async function loadPlayerProfile(): Promise<PlayerProfile | null> {
  const requestHeaders = headers(); if (!requestHeaders) return null
  const response = await fetch('/api/v1/player/profile', { headers: requestHeaders }); if (!response.ok) return null
  const body = await response.json() as { profile?: PlayerProfile }; return body.profile ?? null
}

export async function savePlayerProfile(profile: PlayerProfile): Promise<boolean> {
  const requestHeaders = headers(); if (!requestHeaders) return false
  const response = await fetch('/api/v1/player/profile', { method: 'POST', headers: requestHeaders, body: JSON.stringify({ profile: { ...profile, version: 1 } }) }); return response.ok
}

export async function listPlayerNotifications(): Promise<PlayerNotification[]> {
  const requestHeaders = headers(); if (!requestHeaders) return []
  const response = await fetch('/api/v1/player/notifications', { headers: requestHeaders }); if (!response.ok) return []
  const body = await response.json() as { notifications?: PlayerNotification[] }; return body.notifications ?? []
}

export async function startPlayerSession(gameId: string, payload: Record<string, unknown> = {}): Promise<PlayerSession | null> {
  const requestHeaders = headers(); if (!requestHeaders) return null
  const response = await fetch('/api/v1/player/sessions', { method: 'POST', headers: requestHeaders, body: JSON.stringify({ gameId, payload }) }); if (!response.ok) return null
  const body = await response.json() as { sessionId?: string; gameId?: string; status?: 'active'; startedAt?: number }; if (!body.sessionId || !body.gameId || !body.startedAt) return null
  return { id: body.sessionId, gameId: body.gameId, status: body.status ?? 'active', payload, startedAt: body.startedAt }
}

export async function completePlayerSession(sessionId: string, payload: Record<string, unknown> = {}): Promise<boolean> {
  const requestHeaders = headers(); if (!requestHeaders) return false
  const response = await fetch(`/api/v1/player/sessions/${encodeURIComponent(sessionId)}/complete`, { method: 'POST', headers: requestHeaders, body: JSON.stringify({ payload }) }); return response.ok
}

export async function listPlayerSessions(gameId?: string): Promise<PlayerSession[]> {
  const requestHeaders = headers(); if (!requestHeaders) return []
  const query = gameId ? `?gameId=${encodeURIComponent(gameId)}` : ''
  const response = await fetch(`/api/v1/player/sessions${query}`, { headers: requestHeaders }); if (!response.ok) return []
  const body = await response.json() as { sessions?: PlayerSession[] }; return body.sessions ?? []
}

export async function submitPlayerResult(gameId: string, payload: Record<string, unknown>): Promise<boolean> {
  const requestHeaders = headers(); if (!requestHeaders) return false
  const dedupeKey = `osgard.result.submitted.${gameId}.${String(payload.resultId ?? payload.score ?? '')}`
  if (sessionStorage.getItem(dedupeKey) === '1') return true
  const response = await fetch('/api/v1/player/results', { method: 'POST', headers: requestHeaders, body: JSON.stringify({ gameId, payload }) }); if (response.ok) sessionStorage.setItem(dedupeKey, '1'); return response.ok
}

export async function listPlayerResults(gameId?: string): Promise<Array<{ id: string; gameId: string; payload: Record<string, unknown>; createdAt: number }>> {
  const requestHeaders = headers(); if (!requestHeaders) return []
  const query = gameId ? `?gameId=${encodeURIComponent(gameId)}&limit=50` : '?limit=50'
  const response = await fetch(`/api/v1/player/results${query}`, { headers: requestHeaders }); if (!response.ok) return []
  const body = await response.json() as { results?: Array<{ id: string; gameId: string; payload: Record<string, unknown>; createdAt: number }> }; return body.results ?? []
}

export async function listPlayerReplays(gameId?: string): Promise<Array<{ id: string; gameId: string; payload: Record<string, unknown>; createdAt: number }>> {
  const requestHeaders = headers(); if (!requestHeaders) return []
  const query = gameId ? `?gameId=${encodeURIComponent(gameId)}&limit=50` : '?limit=50'
  const response = await fetch(`/api/v1/player/replays${query}`, { headers: requestHeaders }); if (!response.ok) return []
  const body = await response.json() as { replays?: Array<{ id: string; gameId: string; payload: Record<string, unknown>; createdAt: number }> }; return body.replays ?? []
}

export async function syncPlayerEvent(event: { name: string; payload?: Record<string, unknown> }): Promise<boolean> {
  const requestHeaders = headers(); if (!requestHeaders) return false
  const eventId = typeof (event as { id?: unknown }).id === 'string' ? String((event as { id?: unknown }).id) : `${event.name}:${JSON.stringify(event.payload ?? {})}`
  const dedupeKey = `osgard.event.synced.${eventId}`
  if (sessionStorage.getItem(dedupeKey) === '1') return true
  const response = await fetch('/api/v1/player/events', { method: 'POST', headers: requestHeaders, body: JSON.stringify({ event }) }); if (response.ok) sessionStorage.setItem(dedupeKey, '1'); return response.ok
}
