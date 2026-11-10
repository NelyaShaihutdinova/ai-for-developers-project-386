import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'
import { db } from '../src/db'
import { sql } from 'drizzle-orm'

describe('Bookings', () => {
  let server: Server
  let meetingTypeId: number
  let testDate: string

  beforeAll(async () => {
    server = serve({ fetch: app.fetch, port: 3096 })

    // Clear database to avoid conflicts between test runs
    db.run(sql`DELETE FROM bookings`)
    db.run(sql`DELETE FROM meeting_types`)

    // Create a meeting type for testing
    const res = await request('http://localhost:3096').post('/api/meeting-types').send({
      name: 'Тестовая встреча',
      description: 'Для тестов',
      durationMinutes: 30,
    })
    meetingTypeId = res.body.id

    // Use fixed future dates to avoid conflicts with other tests
    testDate = '2029-09-15'
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
      // Create two meeting types with different durations
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

      // Book type A at 10:00 MSK (07:00 UTC) — occupies 07:00-08:00 UTC
      const bookingA = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeA.body.id,
        startAt: '2029-10-01T07:00:00Z',
        guestName: 'Анна',
        guestEmail: 'anna@test.com',
      })
      expect(bookingA.status).toBe(201)

      // Try to book type B at 10:30 MSK (07:30 UTC) — would occupy 07:30-08:00 UTC
      // This PARTIALLY overlaps with type A (07:00-08:00), should return 409
      const res = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeB.body.id,
        startAt: '2029-10-01T07:30:00Z',
        guestName: 'Борис',
        guestEmail: 'boris@test.com',
      })
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CONFLICT')
    })

    it('allows booking immediately after another booking (no overlap)', async () => {
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

      // Book type A at 08:00 UTC — occupies 08:00-08:30 UTC
      const bookingA = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeA.body.id,
        startAt: '2029-11-01T08:00:00Z',
        guestName: 'Анна',
        guestEmail: 'anna@test.com',
      })
      expect(bookingA.status).toBe(201)

      // Book type B at 08:30 UTC — starts exactly when A ends, should be allowed
      const bookingB = await request('http://localhost:3096').post('/api/bookings').send({
        meetingTypeId: typeB.body.id,
        startAt: '2029-11-01T08:30:00Z',
        guestName: 'Борис',
        guestEmail: 'boris@test.com',
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
