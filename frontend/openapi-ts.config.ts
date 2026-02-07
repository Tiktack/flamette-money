import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  input: './src/lib/api/schema/openapi.json',
  output: './src/lib/api/generated',
  plugins: [
    '@hey-api/typescript',
    '@hey-api/sdk',
    {
      name: '@hey-api/client-fetch',
      runtimeConfigPath: '../heyapi-runtime',
    },
  ],
})
