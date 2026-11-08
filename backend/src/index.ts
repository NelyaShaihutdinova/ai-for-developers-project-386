import { Hono, Context } from 'hono'
import { eq, and } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { meetingTypes } from './db/schema'

const app = new Hono()

// Schemas
const createMeetingTypeSchema = z.object({
  name: z.string().min(1).max(255),
  description: z.string().max(1000),
  durationMinutes: z.number().int().positive().refine((val) => val % 15 === 0, {
    message: 'durationMinutes must be a multiple of 15',
  }),
})

const updateMeetingTypeSchema = z.object({
  name: z.string().min(1).max(255).optional(),
  description: z.string().max(1000).optional(),
  durationMinutes: z
    .number()
    .int()
    .positive()
    .refine((val) => val % 15 === 0, {
      message: 'durationMinutes must be a multiple of 15',
    })
    .optional(),
})

// Helpers
const errorResponse = (code: string, message: string, status: number, c: Context) => {
  return c.json({ error: { code, message } }, status)
}

// Health check
app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

// GET /api/meeting-types - list active types
app.get('/api/meeting-types', async (c) => {
  const types = await db
    .select()
    .from(meetingTypes)
    .where(eq(meetingTypes.isActive, true))
  return c.json(types)
})

// GET /api/meeting-types/:id - get by id
app.get('/api/meeting-types/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const types = await db
    .select()
    .from(meetingTypes)
    .where(eq(meetingTypes.id, id))
  if (types.length === 0) {
    return errorResponse('NOT_FOUND', 'Meeting type not found', 404, c)
  }
  return c.json(types[0])
})

// POST /api/meeting-types - create
app.post('/api/meeting-types', async (c) => {
  const body = await c.req.json()
  const validation = createMeetingTypeSchema.safeParse(body)
  if (!validation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validation.error.issues.map((e) => e.message).join(', '),
      400,
      c
    )
  }

  const result = await db
    .insert(meetingTypes)
    .values({
      name: validation.data.name,
      description: validation.data.description,
      durationMinutes: validation.data.durationMinutes,
    })
    .returning()

  return c.json(result[0], 201)
})

// PATCH /api/meeting-types/:id - update
app.patch('/api/meeting-types/:id', async (c) => {
  const id = parseInt(c.req.param('id'))
  const body = await c.req.json()
  const validation = updateMeetingTypeSchema.safeParse(body)
  if (!validation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validation.error.issues.map((e) => e.message).join(', '),
      400,
      c
    )
  }

  const existing = await db
    .select()
    .from(meetingTypes)
    .where(eq(meetingTypes.id, id))

  if (existing.length === 0) {
    return errorResponse('NOT_FOUND', 'Meeting type not found', 404, c)
  }

  const result = await db
    .update(meetingTypes)
    .set(validation.data)
    .where(eq(meetingTypes.id, id))
    .returning()

  return c.json(result[0])
})

// POST /api/meeting-types/:id/deactivate - deactivate
app.post('/api/meeting-types/:id/deactivate', async (c) => {
  const id = parseInt(c.req.param('id'))

  const existing = await db
    .select()
    .from(meetingTypes)
    .where(and(eq(meetingTypes.id, id), eq(meetingTypes.isActive, true)))

  if (existing.length === 0) {
    return errorResponse('NOT_FOUND', 'Meeting type not found', 404, c)
  }

  const result = await db
    .update(meetingTypes)
    .set({ isActive: false })
    .where(eq(meetingTypes.id, id))
    .returning()

  return c.json(result[0])
})

export default app
