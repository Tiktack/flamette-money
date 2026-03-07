import { defineConfig, loadEnv } from "vite"
import viteReact from "@vitejs/plugin-react"
import { tanstackRouter } from "@tanstack/router-plugin/vite"
import viteTsConfigPaths from "vite-tsconfig-paths"
import tailwindcss from "@tailwindcss/vite"

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), '')
  const port = Number.parseInt(env.VITE_PORT ?? '5174', 10)
  const proxyTarget =
    process.env.API_HTTPS ??
    process.env.API_HTTP ??
    process.env.services__api__https__0 ??
    process.env.services__api__http__0 ??
    env.VITE_API_PROXY_TARGET ??
    'http://localhost:5224'

  const proxyOptions = {
    target: proxyTarget,
    changeOrigin: true,
    secure: false,
  }

  return {
    plugins: [
      viteTsConfigPaths({
        projects: ["./tsconfig.json"],
      }),
      tailwindcss(),
      tanstackRouter({
        target: 'react',
        autoCodeSplitting: true,
      }),
      viteReact(),
    ],
    server: {
      host: true,
      port,
      proxy: {
        '/api': proxyOptions,
        '/signin-google': proxyOptions,
      },
    },
  }
})

export default config
