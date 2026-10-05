import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  server: { port: 4188, strictPort: false },
  build: {
    rollupOptions: {
      output: {
        manualChunks(id) {
          if (id.includes('/node_modules/three/')) return 'three'
          if (id.includes('/node_modules/react/') || id.includes('/node_modules/react-dom/')) return 'react'
        },
      },
    },
  },
})
