import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { VitePWA } from 'vite-plugin-pwa'

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      workbox: {
        globPatterns: ['**/*.{js,css,html,png,svg,ico}'],
        navigateFallback: '/index.html',
        navigateFallbackAllowlist: [/^\//],
      },
      manifest: {
        name: 'Noura',
        short_name: 'Noura',
        description: 'Smart finance for everyday life',
        theme_color: '#4f46e5',
        background_color: '#f9fafb',
        display: 'standalone',
        start_url: '/',
        icons: [
          { src: '/android-chrome-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/android-chrome-512x512.png', sizes: '512x512', type: 'image/png' },
        ],
      },
    }),
  ],
})
