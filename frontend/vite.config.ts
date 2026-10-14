import path from 'node:path'
import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import tailwindcss from '@tailwindcss/vite'

export default defineConfig({
  plugins: [react(), tailwindcss()],
  resolve: { alias: { '@': path.resolve(import.meta.dirname, 'src') } },
  server: {
    // Future FastAPI backend: requests to /api are proxied here during development.
    proxy: { '/api': { target: 'http://localhost:8000', changeOrigin: true } },
  },
})
