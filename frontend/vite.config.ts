import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'
import { resolve } from 'path'

const SPA_ROUTES = [
  '/login',
  '/signup',
  '/pending',
  '/dashboard',
  '/accounts',
  '/trades',
  '/strategies',
  '/funding',
  '/stats',
  '/calendar',
  '/admin',
]

function isSpaRoute(url: string) {
  return SPA_ROUTES.some((route) => url === route || url.startsWith(`${route}/`))
}

export default defineConfig({
  plugins: [
    react(),
    tailwindcss(),
    {
      name: 'spa-fallback',
      configureServer(server) {
        server.middlewares.use((req, _res, next) => {
          const raw = req.url ?? ''
          const path = raw.split('?')[0] ?? ''
          if (isSpaRoute(path)) {
            const query = raw.includes('?') ? raw.slice(raw.indexOf('?')) : ''
            req.url = `/app.html${query}`
          }
          next()
        })
      },
    },
  ],
  build: {
    rollupOptions: {
      input: {
        index: resolve(__dirname, 'index.html'),
        app: resolve(__dirname, 'app.html'),
      },
    },
  },
})
