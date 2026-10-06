export function reconcilePendingEvents(latest, completed, failed) {
  const pendingIds = new Set(latest.map(event => event.id))
  return [...latest.filter(event => !completed.has(event.id)), ...failed.filter(event => !pendingIds.has(event.id))]
}
