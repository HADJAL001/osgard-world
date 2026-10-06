const values = new Map([['osgard.auth.accessToken', 'fixture-token']])
globalThis.localStorage = {
  getItem: key => values.get(key) ?? null,
  setItem: (key, value) => values.set(key, value),
}

const { reconcilePendingEvents } = await import('../src/core/pendingEvents.mjs')
const first = { id: 'first' }
const second = { id: 'second' }
const next = reconcilePendingEvents([second], new Set(['first']), [])
if (next.some(event => event.id === first.id)) throw new Error('completed event was retained')
if (!next.some(event => event.id === second.id)) throw new Error('new event was lost during flush')
console.log('OSGARD_EVENT_QUEUE_SMOKE_OK')
