/// <reference types="vitest/config" />
import { defineConfig } from 'vitest/config'
import react from '@vitejs/plugin-react'

export default defineConfig({
  plugins: [react()],
  // Relative asset URLs so the Capacitor iOS WebView can load the built app.
  base: './',

  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:3001',
        changeOrigin: true,
      },
    },
  },

  test: {
    globals: false,
    environment: 'node',
    include: ['src/**/*.test.ts'],
  },
})
