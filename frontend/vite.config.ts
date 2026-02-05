import { defineConfig } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-vite-plugin'

// https://vite.dev/config/
export default defineConfig({
  plugins: [tanstackRouter(), react()],
  server: {
    proxy: {
      '/api': {
        target: 'http://localhost:5224',
        changeOrigin: true,
        secure: false,
      },
    },
  },
})
