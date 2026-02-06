import { defineConfig, loadEnv } from 'vite'
import react from '@vitejs/plugin-react'
import { tanstackRouter } from '@tanstack/router-vite-plugin'

// https://vite.dev/config/
export default defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number.parseInt(env.VITE_PORT ?? '5174', 10)
  const proxyTarget =
    process.env.services__api__https__0 ??
    process.env.services__api__http__0 ??
    env.VITE_API_PROXY_TARGET ??
    'http://localhost:5224'

  return {
    plugins: [tanstackRouter(), react()],
    server: {
      port,
      proxy: {
        '/api': {
          target: proxyTarget,
          changeOrigin: true,
          secure: false,
        },
      },
    },
  }
})
