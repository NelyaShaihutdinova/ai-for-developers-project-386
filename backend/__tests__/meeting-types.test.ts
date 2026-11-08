import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import type { Server } from 'node:http'
import app from '../src/index'

describe('GET /api/meeting-types', () => {
  let server: Server

  beforeAll(() => {
    server = serve({ fetch: app.fetch, port: 3098 })
  })

  afterAll(() => {
    server.close()
  })

  it('returns 200 and an array of active meeting types', async () => {
    const res = await request('http://localhost:3098').get('/api/meeting-types')
    expect(res.status).toBe(200)
    expect(Array.isArray(res.body)).toBe(true)
  })

  it('returns meeting type objects with expected fields', async () => {
    const res = await request('http://localhost:3098').get('/api/meeting-types')
    if (res.body.length > 0) {
      const mt = res.body[0]
      expect(mt).toHaveProperty('id')
      expect(mt).toHaveProperty('name')
      expect(mt).toHaveProperty('description')
      expect(mt).toHaveProperty('durationMinutes')
      expect(mt).toHaveProperty('isActive')
      expect(mt).toHaveProperty('createdAt')
    }
  })
})
