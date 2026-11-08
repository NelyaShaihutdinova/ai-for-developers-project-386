import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'
import app from './src/index'

// Serve frontend static files
app.use('/assets/*', serveStatic({ root: '/app/frontend/dist' }))

// SPA fallback: serve index.html for all other routes
const indexHtml = readFileSync('/app/frontend/dist/index.html')
app.get('/*', async (c) => {
  return c.body(indexHtml, 200, {
    'Content-Type': 'text/html; charset=utf-8',
    'Cache-Control': 'no-cache',
  })
})

const port = Number(process.env.PORT) || 3000
console.log(`Server is running on http://0.0.0.0:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})
