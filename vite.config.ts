import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// Frontend on :5173, API proxied to the Express server on :3001.
// `host: true` exposes the dev server on the LAN so you can front it with an
// HTTPS tunnel (ngrok/cloudflared) for a phone / QR demo — see README §Demo.
export default defineConfig({
  plugins: [react()],
  server: {
    host: true,
    proxy: {
      '/api': 'http://localhost:3001',
      '/clips': 'http://localhost:3001',
    },
  },
})
