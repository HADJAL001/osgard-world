import { resolve, dirname } from 'node:path';
import { fileURLToPath } from 'node:url';
import { defineConfig } from 'vite';

const mobileDir = dirname(fileURLToPath(import.meta.url));
const repoRoot = resolve(mobileDir, '..');

export default defineConfig({
  configFile: false,
  root: mobileDir,
  build: {
    outDir: resolve(repoRoot, 'dist/games'),
    emptyOutDir: false,
    sourcemap: false,
    minify: true,
    lib: {
      entry: resolve(mobileDir, 'capacitor-share-bridge.js'),
      name: 'OSGARDNativeShareBridge',
      formats: ['iife'],
      fileName: () => 'osgard-native-share.js',
    },
    rollupOptions: {
      output: {
        inlineDynamicImports: true,
      },
    },
  },
});
