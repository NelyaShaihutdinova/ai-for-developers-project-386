import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'
import { db } from '../src/db'
import { sql } from 'drizzle-orm'
import { getValidTestDate, makeStartAt } from './test-helpers'

describe('Booking validation rules', () => {
  let server: Server
  let meetingTypeId30: number
  let meetingTypeId60: number
  let day1: string
  let day2: string
  let day3: string

  beforeAll(async () => {
    server = serve({ fetch: app.fetch, port: 3093 })

    db.run(sql`DELETE FROM bookings`)
    db.run(sql`DELETE FROM meeting_types`)

    const res30 = await request('http://localhost:3093').post('/api/meeting-types').send({
      name: '30 min type',
      description: '30 min',
      durationMinutes: 30,
    })
    meetingTypeId30 = res30.body.id

    const res60 = await request('http://localhost:3093').post('/api/meeting-types').send({
      name: '60 min type',
      description: '60 min',
      durationMinutes: 60,
    })
    meetingTypeId60 = res60.body.id

    day1 = getValidTestDate(1).dateStr
    day2 = getValidTestDate(4).dateStr
    day3 = getValidTestDate(7).dateStr
  })

  afterAll(() => {
    server.close()
  })

  describe('Rule: 14-day booking window from tomorrow', () => {
    it('returns 400 when booking is in the past', async () => {
      const pastDate = new Date()
      pastDate.setDate(pastDate.getDate() - 1)
      pastDate.setUTCHours(6, 0, 0, 0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: pastDate.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('14 days')
    })

    it('returns 400 when booking is today', async () => {
      const today = new Date()
      today.setUTCHours(6, 0, 0, 0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: today.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('14 days')
    })

    it('returns 400 when booking is beyond 14 days from tomorrow', async () => {
      const farFuture = new Date()
      farFuture.setUTCDate(farFuture.getUTCDate() + 20)
      farFuture.setUTCHours(6, 0, 0, 0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: farFuture.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('14 days')
    })

    it('allows booking within the 14-day window', async () => {
      const res = await request('http://localhost:3093')
        .post('/api/bookings')
        .send({
          meetingTypeId: meetingTypeId30,
          startAt: makeStartAt(day1, 7, 0),
          guestName: 'Test',
          guestEmail: 'test@example.com',
        })
      expect(res.status).toBe(201)
    })
  })

  describe('Rule: working hours 09:00–18:00 MSK', () => {
    it('returns 400 when booking is before 09:00 MSK', async () => {
      const date = new Date(day2)
      date.setUTCHours(5, 45, 0, 0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: date.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('working hours')
    })

    it('returns 400 when booking start is at 18:00 MSK', async () => {
      const date = new Date(day2)
      date.setUTCHours(15, 0, 0, 0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: date.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('working hours')
    })

    it('allows booking at 09:00 MSK', async () => {
      const res = await request('http://localhost:3093')
        .post('/api/bookings')
        .send({
          meetingTypeId: meetingTypeId30,
          startAt: makeStartAt(day2, 6, 0),
          guestName: 'Test',
          guestEmail: 'test@example.com',
        })
      expect(res.status).toBe(201)
    })

    it('allows booking at 17:30 MSK for 30-min meeting', async () => {
      const res = await request('http://localhost:3093')
        .post('/api/bookings')
        .send({
          meetingTypeId: meetingTypeId30,
          startAt: makeStartAt(day2, 14, 30),
          guestName: 'Test',
          guestEmail: 'test@example.com',
        })
      expect(res.status).toBe(201)
    })
  })

  describe('Rule: weekdays only (Mon–Fri)', () => {
    function findWeekendDay(targetMSKDay: 0 | 6): Date {
      const tomorrow = new Date()
      tomorrow.setUTCDate(tomorrow.getUTCDate() + 1)
      tomorrow.setUTCHours(0, 0, 0, 0)

      for (let i = 0; i < 14; i++) {
        const candidate = new Date(tomorrow)
        candidate.setUTCDate(candidate.getUTCDate() + i)
        candidate.setUTCHours(6, 0, 0, 0)

        const mskTimestamp = candidate.getTime() + 3 * 3600_000
        const mskDay = new Date(mskTimestamp).getUTCDay()
        if (mskDay === targetMSKDay) return candidate
      }
      throw new Error('Could not find target weekend day within 14-day window')
    }

    it('returns 400 when booking is on Saturday', async () => {
      const saturday = findWeekendDay(6)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: saturday.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('weekday')
    })

    it('returns 400 when booking is on Sunday', async () => {
      const sunday = findWeekendDay(0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: sunday.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('weekday')
    })
  })

  describe('Rule: 15-minute granularity', () => {
    it('returns 400 when start time is not on 15-minute boundary', async () => {
      const date = new Date(day2)
      date.setUTCHours(6, 7, 0, 0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId30,
        startAt: date.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('15-minute')
    })
  })

  describe('Rule: slot fully fits before 18:00 MSK', () => {
    it('returns 400 when 60-min meeting would end after 18:00 MSK', async () => {
      const date = new Date(day3)
      date.setUTCHours(14, 30, 0, 0)

      const res = await request('http://localhost:3093').post('/api/bookings').send({
        meetingTypeId: meetingTypeId60,
        startAt: date.toISOString(),
        guestName: 'Test',
        guestEmail: 'test@example.com',
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
      expect(res.body.error.message).toContain('fit')
    })

    it('allows 60-min meeting starting at 17:00 MSK (ends at 18:00)', async () => {
      const res = await request('http://localhost:3093')
        .post('/api/bookings')
        .send({
          meetingTypeId: meetingTypeId60,
          startAt: makeStartAt(day3, 14, 0),
          guestName: 'Test',
          guestEmail: 'test@example.com',
        })
      expect(res.status).toBe(201)
    })
  })
})
