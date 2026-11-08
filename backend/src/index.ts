import { Hono, Context } from 'hono'
import { cors } from 'hono/cors'
import type { ContentfulStatusCode } from 'hono/utils/http-status'
import { eq, and, gt } from 'drizzle-orm'
import { z } from 'zod'
import { db } from './db'
import { meetingTypes, bookings } from './db/schema'

const app = new Hono()

// CORS
app.use('/*', cors({
  origin: ['http://localhost:5173', 'http://localhost:3000'],
  allowMethods: ['GET', 'POST', 'PATCH', 'OPTIONS'],
  allowHeaders: ['Content-Type'],
}))

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
const errorResponse = (code: string, message: string, status: ContentfulStatusCode, c: Context) => {
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

// POST /api/bookings - create booking
app.post('/api/bookings', async (c) => {
  const body = await c.req.json()

  const bookingSchema = z.object({
    meetingTypeId: z.number().int().positive(),
    startAt: z.string().refine((val) => !isNaN(Date.parse(val)), { message: 'Invalid ISO date' }),
    guestName: z.string().min(1).max(100),
    guestEmail: z.string().email().max(255),
  })

  const validation = bookingSchema.safeParse(body)
  if (!validation.success) {
    return errorResponse(
      'VALIDATION_ERROR',
      validation.error.issues.map((e) => e.message).join(', '),
      400,
      c
    )
  }

  const { meetingTypeId, startAt, guestName, guestEmail } = validation.data

  // Get meeting type
  const mtResult = await db
    .select()
    .from(meetingTypes)
    .where(eq(meetingTypes.id, meetingTypeId))

  if (mtResult.length === 0 || !mtResult[0].isActive) {
    return errorResponse('NOT_FOUND', 'Meeting type not found', 404, c)
  }

  const duration = mtResult[0].durationMinutes
  const startDateTime = new Date(startAt)
  const endDateTime = new Date(startDateTime.getTime() + duration * 60000)

  // Atomic transaction: check conflicts then insert
  try {
    const startStr = startDateTime.toISOString()
    const endStr = endDateTime.toISOString()

    const result = db.transaction((tx) => {
      // Get all bookings and filter in JS
      const allBookings = tx.select().from(bookings).all()

      const hasConflict = allBookings.some(
        (b) => b.startAt <= endStr && b.endAt > startStr
      )

      if (hasConflict) {
        throw new Error('CONFLICT')
      }

      // Insert booking using raw SQL to avoid circular structure
      const insertResult = tx.run(
        `INSERT INTO bookings (meeting_type_id, start_at, end_at, guest_name, guest_email)
         VALUES (${meetingTypeId}, '${startStr}', '${endStr}', '${guestName}', '${guestEmail}')`
      )

      const newId = insertResult.lastInsertRowid

      // Get the inserted booking
      const [newBooking] = tx
        .select()
        .from(bookings)
        .where(eq(bookings.id, Number(newId)))
        .all()

      return newBooking
    })

    return c.json(result, 201)
  } catch (err: unknown) {
    if (err instanceof Error && err.message === 'CONFLICT') {
      return errorResponse('CONFLICT', 'Slot is already booked', 409, c)
    }
    throw err
  }
})

// GET /api/bookings - list future bookings
app.get('/api/bookings', async (c) => {
  const now = new Date().toISOString()

  const result = await db
    .select({
      id: bookings.id,
      meetingTypeId: bookings.meetingTypeId,
      meetingTypeName: meetingTypes.name,
      startAt: bookings.startAt,
      endAt: bookings.endAt,
      guestName: bookings.guestName,
      guestEmail: bookings.guestEmail,
      createdAt: bookings.createdAt,
    })
    .from(bookings)
    .innerJoin(meetingTypes, eq(bookings.meetingTypeId, meetingTypes.id))
    .where(gt(bookings.startAt, now))
    .orderBy(bookings.startAt)
    .all()

  return c.json(result)
})

export default app
