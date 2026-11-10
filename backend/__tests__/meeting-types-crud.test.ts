import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'

describe('MeetingTypes CRUD', () => {
  let server: Server

  beforeAll(() => {
    server = serve({ fetch: app.fetch, port: 3097 })
  })

  afterAll(() => {
    server.close()
  })

  describe('GET /api/meeting-types', () => {
    it('returns 200 and an array', async () => {
      const res = await request('http://localhost:3097').get('/api/meeting-types')
      expect(res.status).toBe(200)
      expect(Array.isArray(res.body)).toBe(true)
    })
  })

  describe('POST /api/meeting-types', () => {
    it('creates a meeting type and returns 201', async () => {
      const res = await request('http://localhost:3097').post('/api/meeting-types').send({
        name: 'Консультация',
        description: 'Индивидуальная консультация',
        durationMinutes: 30,
      })
      expect(res.status).toBe(201)
      expect(res.body.name).toBe('Консультация')
      expect(res.body.durationMinutes).toBe(30)
      expect(res.body.isActive).toBe(true)
      expect(res.body).toHaveProperty('id')
      expect(res.body).toHaveProperty('createdAt')
    })

    it('returns 400 for invalid duration (not multiple of 15)', async () => {
      const res = await request('http://localhost:3097').post('/api/meeting-types').send({
        name: 'Тест',
        description: 'Тест',
        durationMinutes: 20,
      })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })

    it('returns 400 for missing required fields', async () => {
      const res = await request('http://localhost:3097')
        .post('/api/meeting-types')
        .send({ name: 'Тест' })
      expect(res.status).toBe(400)
      expect(res.body.error.code).toBe('VALIDATION_ERROR')
    })
  })

  describe('GET /api/meeting-types/:id', () => {
    it('returns 404 for non-existent id', async () => {
      const res = await request('http://localhost:3097').get('/api/meeting-types/99999')
      expect(res.status).toBe(404)
      expect(res.body.error.code).toBe('NOT_FOUND')
    })
  })

  describe('PATCH /api/meeting-types/:id', () => {
    it('returns 404 for non-existent id', async () => {
      const res = await request('http://localhost:3097')
        .patch('/api/meeting-types/99999')
        .send({ name: 'Обновлённый' })
      expect(res.status).toBe(404)
    })
  })

  describe('POST /api/meeting-types/:id/deactivate', () => {
    it('deactivates a meeting type', async () => {
      const createRes = await request('http://localhost:3097').post('/api/meeting-types').send({
        name: 'Для деактивации',
        description: 'Будет деактивирован',
        durationMinutes: 15,
      })
      const id = createRes.body.id

      const deactRes = await request('http://localhost:3097').post(
        `/api/meeting-types/${id}/deactivate`,
      )
      expect(deactRes.status).toBe(200)
      expect(deactRes.body.isActive).toBe(false)
    })

    it('is idempotent - deactivating twice returns same result', async () => {
      const createRes = await request('http://localhost:3097').post('/api/meeting-types').send({
        name: 'Идемпотентный тест',
        description: 'Тест',
        durationMinutes: 15,
      })
      const id = createRes.body.id

      await request('http://localhost:3097').post(`/api/meeting-types/${id}/deactivate`)
      const res2 = await request('http://localhost:3097').post(
        `/api/meeting-types/${id}/deactivate`,
      )
      expect(res2.status).toBe(404)
    })

    it('returns 404 for non-existent id', async () => {
      const res = await request('http://localhost:3097').post('/api/meeting-types/99999/deactivate')
      expect(res.status).toBe(404)
    })
  })
})
