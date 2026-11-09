import { defineConfig } from '@hey-api/openapi-ts'

export default defineConfig({
  client: '@hey-api/client-fetch',
  input: '../backend/openapi/openapi.yaml',
  output: {
    path: './src/api/generated',
  },
  plugins: ['@hey-api/schemas', '@hey-api/sdk', '@hey-api/typescript'],
})
