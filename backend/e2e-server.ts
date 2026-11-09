import { join } from 'path'
import { serve } from '@hono/node-server'
import { serveStatic } from '@hono/node-server/serve-static'
import { readFileSync } from 'fs'

const dbPath = process.env.E2E_DB || join(__dirname, 'data', 'calendar-e2e.db')
const port = Number(process.env.E2E_PORT) || 3001

// Set env before importing app
process.env.DB_PATH = dbPath

async function start() {
  const { default: app } = await import('./src/index')

  app.use('/assets/*', serveStatic({ root: '../frontend/dist' }))

  const indexHtml = readFileSync('../frontend/dist/index.html')
  app.get('/*', async (c) => {
    return c.body(indexHtml, 200, {
      'Content-Type': 'text/html; charset=utf-8',
      'Cache-Control': 'no-cache',
    })
  })

  console.log(`E2E server running on http://localhost:${port} with DB: ${dbPath}`)

  serve({
    fetch: app.fetch,
    port,
    hostname: '0.0.0.0',
  })
}

start()
