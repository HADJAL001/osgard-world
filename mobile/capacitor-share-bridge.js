import { Capacitor } from '@capacitor/core';
import { Share } from '@capacitor/share';

if (typeof window !== 'undefined' && Capacitor.isNativePlatform()) {
  window.OSGARDNativeShare = Object.freeze({
    share: (options) => Share.share(options),
    canShare: async () => (await Share.canShare()).value,
  });

  // Existing game screens already use navigator.share. Route that existing
  // interface to the verified native Share plugin inside the iOS build only.
  try {
    Object.defineProperty(navigator, 'share', {
      configurable: true,
      value: (options) => Share.share(options),
    });
  } catch {
    // Existing pages can still call window.OSGARDNativeShare.share directly.
  }
}
