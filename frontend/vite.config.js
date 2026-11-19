import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'
import { VitePWA } from 'vite-plugin-pwa'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react(), VitePWA({
    registerType: 'autoUpdate',
    workbox: {
      globPatterns: ['**/*.{js,jsx,css,html,ico,png,svg}'],
      // Las fotos de producto se empaquetan con hash en /assets y suman
      // ~109 MB (8 superan el límite de 2 MiB de Workbox y rompen el build).
      // Se excluyen del precaché; se sirven por red. Los iconos de public/
      // (ico.png, screen.png, favicon.svg, icons.svg) sí se precachean.
      globIgnores: ['**/assets/*.png']
    },
    includeAssets: ['favicon.svg', 'icons.svg'],
    manifest: {
      name: 'Store la mansion',
      short_name: 'My App',
      description: 'La mansion store',
      scope: '/',
      start_url: '/',
      display: 'standalone',
      theme_color: '#000000',

      screenshots: [
        {
          src: "screen.png",
          sizes: "1911x983",
          type: "image/png",
          form_factor: "narrow"
        },
        {
          src: "screen.png",
          sizes: "1911x983",
          type: "image/png",
          form_factor: "wide"
        }
      ],
      icons: [
          {
          src: 'ico.png',
          sizes: '192x192',
          type: 'image/png'
        },
        {
          src: 'ico.png',
          sizes: '512x512',
          type: 'image/png'
        }
      ]
    }
  })
  ],
})