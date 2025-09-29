import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { VitePWA } from 'vite-plugin-pwa'

// https://vitejs.dev/config/
export default defineConfig({
  plugins: [
    react(),
    VitePWA({
      registerType: 'autoUpdate',
      includeAssets: ['icon.svg'],
      manifest: {
        name: 'FocusBrew - Study Timer',
        short_name: 'FocusBrew',
        description: 'A pixel art study timer app that fills up a coffee cup as you focus',
        theme_color: '#D2691E',
        background_color: '#F5E6D3',
        display: 'standalone',
        orientation: 'portrait',
        scope: '/',
        start_url: '/',
        icons: [
          { src: 'icon.svg', sizes: 'any', type: 'image/svg+xml' }
        ]
      },
      // use default workbox settings
    })
  ],
})
