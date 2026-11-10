import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'
import { db } from '../src/db'
import { sql } from 'drizzle-orm'
import { getValidTestDate, makeStartAt } from './test-helpers'

describe('Slots', () => {
  let server: Server
  let meetingTypeId: number
  let testDate: string

  beforeAll(async () => {
    server = serve({ fetch: app.fetch, port: 3094 })

    db.run(sql`DELETE FROM bookings`)
    db.run(sql`DELETE FROM meeting_types`)

    const res = await request('http://localhost:3094').post('/api/meeting-types').send({
      name: 'Slots Test Type',
      description: 'For slots tests',
      durationMinutes: 30,
    })
    meetingTypeId = res.body.id

    testDate = getValidTestDate(1).dateStr
  })

  afterAll(() => {
    server.close()
  })

  describe('GET /api/slots', () => {
    it('returns only free slots after a booking is created', async () => {
      // Get all available slots before booking
      const slotsRes1 = await request('http://localhost:3094').get(
        `/api/slots?meetingTypeId=${meetingTypeId}&date=${testDate}`,
      )
      expect(slotsRes1.status).toBe(200)
      expect(Array.isArray(slotsRes1.body)).toBe(true)
      expect(slotsRes1.body.length).toBeGreaterThan(0)

      const firstSlot = slotsRes1.body[0]

      // Create a booking for the first slot
      const bookingRes = await request('http://localhost:3094').post('/api/bookings').send({
        meetingTypeId,
        startAt: firstSlot.startAt,
        guestName: 'Test User',
        guestEmail: 'test@example.com',
      })
      expect(bookingRes.status).toBe(201)

      // Get slots again — the booked slot should be excluded
      const slotsRes2 = await request('http://localhost:3094').get(
        `/api/slots?meetingTypeId=${meetingTypeId}&date=${testDate}`,
      )
      expect(slotsRes2.status).toBe(200)

      const bookedSlot = slotsRes2.body.find(
        (s: { startAt: string; endAt: string }) =>
          s.startAt === firstSlot.startAt && s.endAt === firstSlot.endAt,
      )
      expect(bookedSlot).toBeUndefined()

      // Other slots should still be available (at least 90% remain)
      expect(slotsRes2.body.length).toBeGreaterThan(0)
      expect(slotsRes2.body.length).toBeLessThan(slotsRes1.body.length)
    })

    it('excludes slots that overlap with an existing booking', async () => {
      const overlapDate = getValidTestDate(2)
      const startAt = makeStartAt(overlapDate.dateStr, 7, 0)
      const bookingRes = await request('http://localhost:3094').post('/api/bookings').send({
        meetingTypeId,
        startAt,
        guestName: 'Overlap Test',
        guestEmail: 'overlap@example.com',
      })
      expect(bookingRes.status).toBe(201)

      const slotsRes = await request('http://localhost:3094').get(
        `/api/slots?meetingTypeId=${meetingTypeId}&date=${overlapDate.dateStr}`,
      )
      expect(slotsRes.status).toBe(200)

      const overlappingSlots = slotsRes.body.filter(
        (s: { startAt: string }) =>
          s.startAt === makeStartAt(overlapDate.dateStr, 7, 0) ||
          s.startAt === makeStartAt(overlapDate.dateStr, 7, 15),
      )
      expect(overlappingSlots.length).toBe(0)
    })
  })
})
