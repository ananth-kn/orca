import { defineConfig } from 'vite';
import react from '@vitejs/plugin-react';
import tailwindcss from '@tailwindcss/vite';
import { VitePWA } from 'vite-plugin-pwa';

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    VitePWA({
      registerType: 'autoUpdate',
      manifest: {
        name: 'ORCA - Marine Ecosystem Reasoning',
        short_name: 'ORCA',
        description: 'AI-powered conversational marine intelligence system',
        theme_color: '#0B1B3D',
        background_color: '#0B1B3D',
        display: 'standalone',
        icons: [
          { src: '/icon-192x192.png', sizes: '192x192', type: 'image/png' },
          { src: '/icon-512x512.png', sizes: '512x512', type: 'image/png' }
        ]
      }
    })
  ],
  server: {
    // In dev: proxy /api/* to the local backend (or VITE_BACKEND_URL if set)
    proxy: {
      '/api': {
        target: process.env.VITE_BACKEND_URL || 'http://localhost:8000',
        changeOrigin: true,
        secure: false,
      }
    }
  }
});
