import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'

// https://vite.dev/config/
export default defineConfig({
  base: './',
  plugins: [react()],
  build: {
    outDir: '../MyCMS.API/wwwroot',
    emptyOutDir: true,
  },
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5250',
        changeOrigin: true,
      },
      '/hubs': {
        target: 'http://localhost:5250',
        changeOrigin: true,
        ws: true,
      },
    },
  },
})
