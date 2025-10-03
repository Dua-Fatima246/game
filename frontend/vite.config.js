// vite.config.js
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  base: './', // ensures assets resolve correctly
  server: {
    proxy: {
      // This is only for local dev, Vercel won't use it
      '/api': 'http://localhost:5001'
    }
  },
  build: {
    outDir: 'dist' // Vercel expects the built files in /dist
  }
})
