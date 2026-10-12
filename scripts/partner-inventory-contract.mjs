export function isValidPartnerInventoryText(content) {
  try {
    const inventory = JSON.parse(content)
    if (
      inventory?.schemaVersion !== 1 ||
      inventory?.commercialStatus !== 'inquiry_only' ||
      !Array.isArray(inventory.placements) ||
      inventory.placements.length < 3
    ) return false

    const ids = new Set()
    return inventory.placements.every(item => {
      if (
        !item ||
        typeof item.id !== 'string' ||
        ids.has(item.id) ||
        typeof item.title !== 'string' ||
        typeof item.description !== 'string' ||
        typeof item.measurement !== 'string' ||
        item.active !== false ||
        item.sponsorLabelRequired !== true ||
        !['planned', 'inquiry'].includes(item.status)
      ) return false
      ids.add(item.id)
      return true
    })
  } catch {
    return false
  }
}
