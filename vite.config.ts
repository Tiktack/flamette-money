import { defineConfig, loadEnv } from "vite"
import viteReact from "@vitejs/plugin-react"
import tailwindcss from "@tailwindcss/vite"
import { tanstackStart } from "@tanstack/react-start/plugin/vite"

const config = defineConfig(({ mode }) => {
  const env = loadEnv(mode, process.cwd(), "")
  const port = Number.parseInt(env.VITE_PORT ?? "5174", 10)

  return {
    plugins: [tailwindcss(), tanstackStart(), viteReact()],
    resolve: {
      tsconfigPaths: true,
    },
    server: {
      host: true,
      port,
    },
    ssr: {
      // better-sqlite3 is a native module and must not be bundled into the server build.
      external: ["better-sqlite3"],
    },
  }
})

export default config
