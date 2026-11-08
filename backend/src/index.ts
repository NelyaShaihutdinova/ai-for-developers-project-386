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

// GET /api/slots - list available slots for a day
app.get('/api/slots', async (c) => {
  const meetingTypeId = parseInt(c.req.query('meetingTypeId') || '')
  const dateStr = c.req.query('date') || ''

  // Validate meetingTypeId
  if (isNaN(meetingTypeId)) {
    return errorResponse('VALIDATION_ERROR', 'meetingTypeId is required', 400, c)
  }

  // Get meeting type
  const mtResult = await db
    .select()
    .from(meetingTypes)
    .where(eq(meetingTypes.id, meetingTypeId))

  if (mtResult.length === 0 || !mtResult[0].isActive) {
    return errorResponse('NOT_FOUND', 'Meeting type not found', 404, c)
  }

  const duration = mtResult[0].durationMinutes

  // Generate slots for the given date
  const date = new Date(dateStr)
  if (isNaN(date.getTime())) {
    return errorResponse('VALIDATION_ERROR', 'Invalid date format', 400, c)
  }

  // Working hours 09:00-18:00 in UTC (Moscow is UTC+3, so 09:00 MSK = 06:00 UTC)
  const startHour = 6 // 09:00 MSK in UTC
  const endHour = 15  // 18:00 MSK in UTC
  const slots: { startAt: string; endAt: string }[] = []

  for (let hour = startHour; hour < endHour; hour++) {
    for (let minute = 0; minute < 60; minute += 15) {
      const slotStart = new Date(date)
      slotStart.setUTCHours(hour, minute, 0, 0)

      const slotEnd = new Date(slotStart)
      slotEnd.setUTCMinutes(slotEnd.getUTCMinutes() + duration)

      // Check if slot ends by 18:00 MSK (15:00 UTC)
      if (slotEnd.getUTCHours() > endHour || (slotEnd.getUTCHours() === endHour && slotEnd.getUTCMinutes() > 0)) {
        continue
      }

      slots.push({
        startAt: slotStart.toISOString(),
        endAt: slotEnd.toISOString(),
      })
    }
  }

  return c.json(slots)
})

export default app
