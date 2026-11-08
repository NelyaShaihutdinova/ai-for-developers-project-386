import { describe, it, expect, beforeAll, afterAll } from 'vitest'
import request from 'supertest'
import { serve } from '@hono/node-server'
import { Hono } from 'hono'
import type { Server } from 'node:http'

const app = new Hono()

app.get('/health', (c) => {
  return c.json({ status: 'ok' })
})

describe('smoke test', () => {
  let server: Server

  beforeAll(() => {
    server = serve({ fetch: app.fetch, port: 3099 })
  })

  afterAll(() => {
    server.close()
  })

  it('GET /health returns 200 and { status: "ok" }', async () => {
    const res = await request('http://localhost:3099').get('/health')
    expect(res.status).toBe(200)
    expect(res.body).toEqual({ status: 'ok' })
  })
})
