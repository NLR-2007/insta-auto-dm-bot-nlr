import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  plugins: [react()],
  // A crashed/stale Vite process can keep node_modules/.vite locked on
  // Windows. A per-process cache prevents EPERM unlink failures on restart.
  cacheDir: `.vite-cache/${process.pid}`,
  server: {
    port: 5173,
    strictPort: true,
  },
  build: {
    emptyOutDir: false,
  }
})
