import { Capacitor } from '@capacitor/core'
import { Share } from '@capacitor/share'

/**
 * Use the native iOS share sheet for the bundled game catalogue and game pages.
 * Local capacitor:// links are converted into public OSGARD URLs so a friend can open them.
 * This bridge deliberately does not grant rewards or claim that a public post was verified.
 */
if (Capacitor.isNativePlatform() && typeof navigator !== 'undefined') {
  const toPublicUrl = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || !value.trim()) return undefined
    try {
      const target = new URL(value, window.location.href)
      if (
        target.hostname === 'localhost' &&
        (target.protocol === 'capacitor:' || target.protocol === 'https:' || target.protocol === 'http:')
      ) {
        return 'https://osgard.world' + target.pathname + target.search + target.hash
      }
      return target.href
    } catch {
      return value
    }
  }

  const normalizeText = (value: unknown): string | undefined => {
    if (typeof value !== 'string' || !value.trim()) return undefined
    return value
      .replace(/capacitor:\/\/localhost/gi, 'https://osgard.world')
      .replace(/https?:\/\/localhost/gi, 'https://osgard.world')
  }

  Object.defineProperty(navigator, 'share', {
    configurable: true,
    writable: true,
    value: async (data: ShareData) => {
      const url = toPublicUrl(data.url)
      const text = normalizeText(data.text)
      await Share.share({
        title: data.title || undefined,
        text,
        url,
        dialogTitle: 'Поделиться OSGARD PLAY',
      })
    },
  })
}
