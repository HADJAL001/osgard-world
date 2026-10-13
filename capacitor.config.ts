import type { CapacitorConfig } from '@capacitor/cli'

const config: CapacitorConfig = {
  appId: 'world.osgard.play',
  appName: 'OSGARD PLAY',
  webDir: 'mobile-dist',
  loggingBehavior: 'none',
  server: {
    // Load the locally bundled games portal, not a remote website wrapper.
    appStartPath: 'games/',
  },
}

export default config
