import react from '@vitejs/plugin-react'
import { defineConfig } from 'vite'

// https://vite.dev/config/
export default defineConfig({
  // `npm run dev:server` runs the Worker on 8787; proxy the API (and its
  // websocket upgrade) so the app uses one origin in dev, as it will in prod.
  server: {
    proxy: {
      '/api': { target: 'http://localhost:8787', ws: true, changeOrigin: true },
    },
  },
  plugins: [react()],
})
