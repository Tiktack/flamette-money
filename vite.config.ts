import { defineConfig, loadEnv } from "vite"
import { cloudflare } from "@cloudflare/vite-plugin"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const port = Number.parseInt(env.VITE_PORT ?? "5174", 10)

  return {
    plugins: [tailwindcss(), cloudflare({ viteEnvironment: { name: "ssr" } }), tanstackStart(), viteReact()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: true,
      port,
    },
  }
})

export default config
