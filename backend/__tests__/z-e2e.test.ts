import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'
import { db } from '../src/db'
import { bookings } from '../src/db/schema'
import { getValidTestDate, makeStartAt } from './test-helpers'

describe('E2E: Full booking flow', () => {
  let server: Server
  let meetingTypeId: number
  let testDate: string

  beforeAll(async () => {
    server = serve({ fetch: app.fetch, port: 3095 })

    db.delete(bookings).run()

    const res = await request('http://localhost:3095').post('/api/meeting-types').send({
      name: 'E2E Консультация',
      description: 'E2E тест',
      durationMinutes: 30,
    })
    meetingTypeId = res.body.id

    const testDateInfo = getValidTestDate(1)
    testDate = testDateInfo.dateStr
  })

  afterAll(() => {
    server.close()
  })

  it('complete guest flow: view types -> view slots -> book -> verify', async () => {
    // Step 1: View available meeting types
    const typesRes = await request('http://localhost:3095').get('/api/meeting-types')
    expect(typesRes.status).toBe(200)
    expect(typesRes.body.length).toBeGreaterThanOrEqual(1)
    const mt = typesRes.body.find((m: unknown) => m.id === meetingTypeId)
    expect(mt).toBeDefined()
    expect(mt.name).toBe('E2E Консультация')
    expect(mt.durationMinutes).toBe(30)

    // Step 2: View available slots for a date
    const slotsRes = await request('http://localhost:3095').get(
      `/api/slots?meetingTypeId=${meetingTypeId}&date=${testDate}`,
    )
    expect(slotsRes.status).toBe(200)
    expect(Array.isArray(slotsRes.body)).toBe(true)
    expect(slotsRes.body.length).toBeGreaterThan(0)

    // Verify slot structure
    const slot = slotsRes.body[0]
    expect(slot).toHaveProperty('startAt')
    expect(slot).toHaveProperty('endAt')

    // Step 3: Book a slot
    const bookingRes = await request('http://localhost:3095').post('/api/bookings').send({
      meetingTypeId,
      startAt: slot.startAt,
      guestName: 'Иван Петров',
      guestEmail: 'ivan@example.com',
    })
    expect(bookingRes.status).toBe(201)
    expect(bookingRes.body.guestName).toBe('Иван Петров')
    expect(bookingRes.body.guestEmail).toBe('ivan@example.com')
    expect(bookingRes.body).toHaveProperty('endAt')

    // Step 4: Verify booking appears in owner's list
    const bookingsRes = await request('http://localhost:3095').get('/api/bookings')
    expect(bookingsRes.status).toBe(200)
    const booking = bookingsRes.body.find((b: unknown) => b.guestEmail === 'ivan@example.com')
    expect(booking).toBeDefined()
    expect(booking.meetingTypeName).toBe('E2E Консультация')
  })

  it('handles 409 conflict when two guests try to book the same slot', async () => {
    const conflictDate = getValidTestDate(2)
    const localTestDate = conflictDate.dateStr

    const slotsRes = await request('http://localhost:3095').get(
      `/api/slots?meetingTypeId=${meetingTypeId}&date=${localTestDate}`,
    )
    const slot = slotsRes.body[0]

    // First booking succeeds
    const res1 = await request('http://localhost:3095').post('/api/bookings').send({
      meetingTypeId,
      startAt: slot.startAt,
      guestName: 'Анна',
      guestEmail: 'anna@example.com',
    })
    expect(res1.status).toBe(201)

    // Second booking for same slot fails with 409
    const res2 = await request('http://localhost:3095').post('/api/bookings').send({
      meetingTypeId,
      startAt: slot.startAt,
      guestName: 'Борис',
      guestEmail: 'boris@example.com',
    })
    expect(res2.status).toBe(409)
    expect(res2.body.error.code).toBe('CONFLICT')
  })

  it('validates guest data (name and email)', async () => {
    const validationDate = getValidTestDate(3)
    const dateStr = validationDate.dateStr

    const res1 = await request('http://localhost:3095')
      .post('/api/bookings')
      .send({
        meetingTypeId,
        startAt: makeStartAt(dateStr, 10, 0),
        guestName: '',
        guestEmail: 'valid@example.com',
      })
    expect(res1.status).toBe(400)

    const res2 = await request('http://localhost:3095')
      .post('/api/bookings')
      .send({
        meetingTypeId,
        startAt: makeStartAt(dateStr, 10, 15),
        guestName: 'Валид',
        guestEmail: 'not-an-email',
      })
    expect(res2.status).toBe(400)
  })
})
