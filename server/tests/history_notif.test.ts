import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { store } from '../src/data/memoryStore'

describe('History, Notification, and Health Endpoints', () => {
  beforeEach(() => {
    store.reset()
  })

  it('should return health status 200 OK from /api/health', async () => {
    const res = await request(app).get('/api/health')
    expect(res.status).toBe(200)
    expect(res.body.status).toBe('ok')
  })

  it('should list past queue history from /api/history', async () => {
    const res = await request(app).get('/api/history')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should list real-time notifications from /api/notifications', async () => {
    const res = await request(app).get('/api/notifications')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
    expect(Array.isArray(res.body.data)).toBe(true)
  })

  it('should serve next waiting student and update queue from /api/queue/serve-next', async () => {
    const res = await request(app)
      .post('/api/queue/serve-next')
      .send({ serviceId: 1 })

    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })

  it('should delete a service from /api/services/:id', async () => {
    const res = await request(app).delete('/api/services/4')
    expect(res.status).toBe(200)
    expect(res.body.success).toBe(true)
  })
})
