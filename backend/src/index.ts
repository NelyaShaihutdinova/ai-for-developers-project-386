import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import { eq } from 'drizzle-orm'
import { db } from './db'
import { meetingTypes } from './db/schema'

const app = new Hono()

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

app.get('/api/meeting-types', async (c) => {
  const types = await db
    .select()
    .from(meetingTypes)
    .where(eq(meetingTypes.isActive, true))
  return c.json(types)
})

const port = 3000
console.log(`Server is running on http://localhost:${port}`)

serve({
  fetch: app.fetch,
  port,
})

export default app
