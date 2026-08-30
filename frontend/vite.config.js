import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',

      manifest: {
        name: 'Rural Care Navigator',
        short_name: 'Care Navigator',
        description: 'Lightweight rural healthcare access and care coordination platform.',
        start_url: '/',
        display: 'standalone',
        background_color: '#ffffff',
        theme_color: '#ffffff',
        icons: [],
      },

      workbox: {
        navigateFallback: '/',
      },
    }),
  ],
})