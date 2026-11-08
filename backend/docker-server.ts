import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import app from './src/index'

// Serve frontend static files
app.use('/*', serveStatic({ root: '/app/frontend/dist' }))
app.use('/assets/*', serveStatic({ root: '/app/frontend/dist' }))

const port = Number(process.env.PORT) || 3000
console.log(`Server is running on http://0.0.0.0:${port}`)

serve({
  fetch: app.fetch,
  port,
  hostname: '0.0.0.0',
})
