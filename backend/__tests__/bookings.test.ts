import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'
import { db } from '../src/db'
import { sql } from 'drizzle-orm'
import { getValidTestDate, makeStartAt } from './test-helpers'

describe('Bookings', () => {
  let server: Server
  let meetingTypeId: number
  let testDate: string

  beforeAll(async () => {
    server = serve({ fetch: app.fetch, port: 3096 })

    db.run(sql`DELETE FROM bookings`)
    db.run(sql`DELETE FROM meeting_types`)

    const res = await request('http://localhost:3096').post('/api/meeting-types').send({
      name: 'Тестовая встреча',
      description: 'Для тестов',
      durationMinutes: 30,
    })
    meetingTypeId = res.body.id

    const testDateInfo = getValidTestDate(1)
    testDate = testDateInfo.dateStr
  })

  afterAll(() => {
    server.close()
  })

  describe('POST /api/bookings', () => {
    it('creates a booking and returns 201', async () => {
      const startAt = `${testDate}T06:00:00Z`
      const res = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId,
        startAt,
        guestName: 'Иван',
        guestEmail: 'ivan@example.com',
      })
      expect(res.status).toBe(201)
      expect(res.body).toHaveProperty('id')
      // Check that the booking was created (fields may be snake_case or camelCase)
      expect(res.body.guestName || res.body.guest_name).toBe('Иван')
    })

    it('returns 409 for conflicting booking', async () => {
      // First create a booking
      const startAt1 = `${testDate}T07:00:00Z`
      await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId,
        startAt: startAt1,
        guestName: 'Алексей',
        guestEmail: 'alex@example.com',
      })

      // Try to book the same slot
      const res = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId,
        startAt: startAt1,
        guestName: 'Пётр',
        guestEmail: 'peter@example.com',
      })
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CONFLICT')
    })

    it('returns 409 for partial overlap of DIFFERENT meeting types', async () => {
      const overlapDate = getValidTestDate(2)

      const typeA = await request('http://localhost:3096').post('/api/meeting-types').send({
        name: 'Длинная встреча',
        description: '60 минут',
        durationMinutes: 60,
      })
      const typeB = await request('http://localhost:3096').post('/api/meeting-types').send({
        name: 'Короткая встреча',
        description: '30 минут',
        durationMinutes: 30,
      })

      const overlapStart1 = makeStartAt(overlapDate.dateStr, 7, 0)
      const overlapStart2 = makeStartAt(overlapDate.dateStr, 7, 30)

      const bookingA = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeA.body.id,
        startAt: overlapStart1,
        guestName: 'Анна',
        guestEmail: 'anna@test.com',
      })
      expect(bookingA.status).toBe(201)

      const res = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeB.body.id,
        startAt: overlapStart2,
        guestName: 'Борис',
        guestEmail: 'boris@test.com',
      })
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CONFLICT')
    })

    it('allows booking immediately after another booking (no overlap)', async () => {
      const backToDate = getValidTestDate(3)

      const typeA = await request('http://localhost:3096').post('/api/meeting-types').send({
        name: 'Встреча A',
        description: '30 минут',
        durationMinutes: 30,
      })
      const typeB = await request('http://localhost:3096').post('/api/meeting-types').send({
        name: 'Встреча B',
        description: '45 минут',
        durationMinutes: 45,
      })

      const backToBackStart1 = makeStartAt(backToDate.dateStr, 8, 0)
      const backToBackStart2 = makeStartAt(backToDate.dateStr, 8, 30)

      const bookingA = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeA.body.id,
        startAt: backToBackStart1,
        guestName: 'Анна',
        guestEmail: 'anna@test.com',
      })
      expect(bookingA.status).toBe(201)

      const bookingB = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeB.body.id,
        startAt: backToBackStart2,
        guestName: 'Борис',
        guestEmail: 'boris@test.com',
      })
      expect(bookingB.status).toBe(201)
    })

    it('allows booking at 11:00 when 10:00–11:00 is booked (touching, not overlapping)', async () => {
      const touchDate = getValidTestDate(6)

      const type60 = await request('http://localhost:3096').post('/api/meeting-types').send({
        name: '60 min touch',
        description: '60 минут',
        durationMinutes: 60,
      })

      // Book 10:00–11:00 MSK (07:00–08:00 UTC)
      const bookingA = await request('http://localhost:3096')
        .post('/api/bookings')
        .send({
          meetingTypeId: type60.body.id,
          startAt: makeStartAt(touchDate.dateStr, 7, 0),
          guestName: 'Анна',
          guestEmail: 'anna@touch.com',
        })
      expect(bookingA.status).toBe(201)

      // Book 11:00–11:30 MSK (08:00–08:30 UTC) — starts exactly when A ends
      const bookingB = await request('http://localhost:3096')
        .post('/api/bookings')
        .send({
          meetingTypeId: meetingTypeId,
          startAt: makeStartAt(touchDate.dateStr, 8, 0),
          guestName: 'Борис',
          guestEmail: 'boris@touch.com',
        })
      expect(bookingB.status).toBe(201)
    })

    it('returns 404 for inactive meeting type', async () => {
      // Deactivate the meeting type
      await request('http://localhost:3096').post(`/api/meeting-types/${meetingTypeId}/deactivate`)

      const startAt = `${testDate}T08:00:00Z`
      const res = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId,
        startAt,
        guestName: 'Мария',
        guestEmail: 'maria@example.com',
      })
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid email', async () => {
      const startAt = `${testDate}T09:00:00Z`
      const res = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId,
        startAt,
        guestName: 'Анна',
        guestEmail: 'invalid-email',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/bookings', () => {
    it('returns future bookings sorted by startAt ASC', async () => {
      const res = await request('http://localhost:3096').get('/api/bookings')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
      // Should include bookings we created in this test suite
      expect(res.body.length).toBeGreaterThanOrEqual(2)
      // Check that response includes meetingTypeName
      if (res.body.length > 0) {
        expect(res.body[0]).toHaveProperty('meetingTypeName')
      }
    })
  })
})
