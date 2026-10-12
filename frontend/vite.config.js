process.env.RAYON_NUM_THREADS = process.env.RAYON_NUM_THREADS || '2'

import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),

    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: [
        'favicon.svg',
        'apple-touch-icon.png',
        'pwa-192x192.png',
        'pwa-512x512.png',
        'images/nalam-connect-logo.png',
        'nalam-connect-logo.png',
        'first-aid/content.json',
      ],
      manifest: {
        name: 'Nalam Connect',
        short_name: 'Nalam',
        description: 'Nalam Connect — Accessible Healthcare for Rural Communities',
        start_url: '/',
        scope: '/',
        display: 'standalone',
        background_color: '#f8fafc',
        theme_color: '#00478f',
        icons: [
          {
            src: '/pwa-192x192.png',
            sizes: '192x192',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'any',
          },
          {
            src: '/pwa-512x512-maskable.png',
            sizes: '512x512',
            type: 'image/png',
            purpose: 'maskable',
          },
        ],
      },

      workbox: {
        navigateFallback: '/',
        additionalManifestEntries: [
          { url: '/first-aid/content.json', revision: '1' },
        ],
        runtimeCaching: [
          {
            urlPattern: /\/first-aid\/content\.json$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'first-aid-cache',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 365,
              },
            },
          },
          {
            urlPattern: /\/first-aid\/videos\/.*\.mp4$/,
            handler: 'CacheFirst',
            options: {
              cacheName: 'nalam-first-aid-videos-v1',
              expiration: {
                maxEntries: 10,
                maxAgeSeconds: 60 * 60 * 24 * 30, // 30 days
              },
              cacheableResponse: {
                statuses: [0, 200],
              },
            },
          },
        ],
      },
    }),
  ],

  server: {
    open: false,
    watch: {
      ignored: ['**/public/first-aid/videos/**'],
    },
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://127.0.0.1:8001',
        changeOrigin: true,
      },
    },
  },
})
