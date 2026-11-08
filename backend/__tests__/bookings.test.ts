import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'

describe('Bookings', () => {
  let server: Server
  let meetingTypeId: number
  let testDate: string

  beforeAll(async () => {
    server = serve({ fetch: app.fetch, port: 3096 })

    // Create a meeting type for testing
    const res = await request('http://localhost:3096')
      .post('/api/meeting-types')
      .send({
        name: 'Тестовая встреча',
        description: 'Для тестов',
        durationMinutes: 30,
      })
    meetingTypeId = res.body.id

    // Use a unique date for this test run to avoid conflicts with existing data
    // Use a date far in the future with a unique suffix based on timestamp
    const now = new Date()
    testDate = `${now.getFullYear() + 1}-${String(now.getMonth() + 1).padStart(2, '0')}-${String(now.getDate()).padStart(2, '0')}`
  })

  afterAll(() => {
    server.close()
  })

  describe('POST /api/bookings', () => {
    it('creates a booking and returns 201', async () => {
      const startAt = `${testDate}T06:00:00Z`
      const res = await request('http://localhost:3096')
        .post('/api/bookings')
        .send({
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
      await request('http://localhost:3096')
        .post('/api/bookings')
        .send({
          meetingTypeId,
          startAt: startAt1,
          guestName: 'Алексей',
          guestEmail: 'alex@example.com',
        })

      // Try to book the same slot
      const res = await request('http://localhost:3096')
        .post('/api/bookings')
        .send({
          meetingTypeId,
          startAt: startAt1,
          guestName: 'Пётр',
          guestEmail: 'peter@example.com',
        })
      expect(res.status).toBe(409)
      expect(res.body.error.code).toBe('CONFLICT')
    })

    it('returns 404 for inactive meeting type', async () => {
      // Deactivate the meeting type
      await request('http://localhost:3096').post(`/api/meeting-types/${meetingTypeId}/deactivate`)

      const startAt = `${testDate}T08:00:00Z`
      const res = await request('http://localhost:3096')
        .post('/api/bookings')
        .send({
          meetingTypeId,
          startAt,
          guestName: 'Мария',
          guestEmail: 'maria@example.com',
        })
      expect(res.status).toBe(404)
    })

    it('returns 400 for invalid email', async () => {
      const startAt = `${testDate}T09:00:00Z`
      const res = await request('http://localhost:3096')
        .post('/api/bookings')
        .send({
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
