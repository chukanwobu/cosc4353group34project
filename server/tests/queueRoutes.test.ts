import { describe, it, expect, beforeEach } from 'vitest'
import express from 'express'
import request from 'supertest'
import { store } from '../src/data/memoryStore'
import queueRoutes from '../src/routes/queueRoutes'

const app = express()
app.use(express.json())
app.use('/api/queue', queueRoutes)

// Seed data (memoryStore.ts): service 1 has TICK-101 in_progress + TICK-102 waiting.
// Service 2 (duration 20, medium) and service 3 (duration 10, medium) are empty. Service 4 is closed.
const base = { serviceId: 2, userName: 'Test User', studentId: 'S100', notes: 'Need help' }
const join = (body: object) => request(app).post('/api/queue/join').send(body)
const queueOf = async (serviceId: number) => (await request(app).get(`/api/queue/${serviceId}`)).body.data

beforeEach(() => store.reset())

describe('GET queue lists', () => {
  it('GET / returns every active ticket', async () => {
    const res = await request(app).get('/api/queue')
    expect(res.status).toBe(200)
    expect(res.body.data).toHaveLength(2)
  })
  it('GET /:serviceId returns that service queue in position order', async () => {
    expect((await queueOf(1)).map((t: any) => t.id)).toEqual(['TICK-101', 'TICK-102'])
    expect(await queueOf(2)).toEqual([])
  })
})

describe('POST /join validation', () => {
  it('returns 400 with details for missing fields', async () => {
    const res = await join({})
    expect(res.status).toBe(400)
    expect(Object.keys(res.body.details).sort()).toEqual(['notes', 'serviceId', 'studentId', 'userName'])
  })
  it('rejects notes over 200 characters', async () => {
    const res = await join({ ...base, notes: 'x'.repeat(201) })
    expect(res.status).toBe(400)
    expect(res.body.details.notes).toMatch(/200/)
  })
  it('rejects names over 100 characters and student IDs over 20', async () => {
    const res = await join({ ...base, userName: 'a'.repeat(101), studentId: 's'.repeat(21) })
    expect(res.status).toBe(400)
    expect(res.body.details.userName).toBeDefined()
    expect(res.body.details.studentId).toBeDefined()
  })
  it('rejects a non-numeric service ID', async () => {
    expect((await join({ ...base, serviceId: 'abc' })).status).toBe(400)
  })
  it('rejects an invalid priority', async () => {
    const res = await join({ ...base, priority: 'urgent' })
    expect(res.status).toBe(400)
    expect(res.body.details.priority).toBeDefined()
  })
  it('returns 404 for an unknown service', async () => {
    expect((await join({ ...base, serviceId: 99 })).status).toBe(404)
  })
  it('returns 400 when the service is closed', async () => {
    const res = await join({ ...base, serviceId: 4 })
    expect(res.status).toBe(400)
    expect(res.body.error).toMatch(/closed/i)
  })
})

describe('POST /join behaviour', () => {
  it('creates a ticket at position 1 with 0 wait and sends a notification', async () => {
    const res = await join(base)
    expect(res.status).toBe(201)
    expect(res.body.data).toMatchObject({ position: 1, estimatedWait: 0, status: 'waiting' })
    expect(store.notifications[0].message).toMatch(/You joined queue/)
  })
  it('uses wait = (position - 1) x duration', async () => {
    const res = await join({ ...base, serviceId: 1 }) // behind 101 and 102, duration 15
    expect(res.body.data.position).toBe(3)
    expect(res.body.data.estimatedWait).toBe(30)
  })
  it('keeps first-come-first-served order at equal priority', async () => {
    const a = await join({ ...base, serviceId: 3, studentId: 'S1' })
    const b = await join({ ...base, serviceId: 3, studentId: 'S2' })
    expect([a.body.data.position, b.body.data.position]).toEqual([1, 2])
    expect(b.body.data.estimatedWait).toBe(10)
  })
  it('puts a higher-priority ticket ahead of a lower-priority one', async () => {
    const low = await join({ ...base, studentId: 'S1', priority: 'low' })
    const high = await join({ ...base, studentId: 'S2', priority: 'high' })
    expect(high.body.data.position).toBe(1)
    const order = await queueOf(2)
    expect(order.map((t: any) => t.id)).toEqual([high.body.data.id, low.body.data.id])
    expect(order[1].position).toBe(2)
    expect(order[1].estimatedWait).toBe(20)
  })
  it('generates unique ticket IDs', async () => {
    const ids = new Set<string>()
    for (let i = 0; i < 6; i++) ids.add((await join({ ...base, studentId: `S${i}` })).body.data.id)
    expect(ids.size).toBe(6)
  })
})

describe('GET /status/:ticketId', () => {
  it('returns one ticket', async () => {
    const created = await join(base)
    const res = await request(app).get(`/api/queue/status/${created.body.data.id}`)
    expect(res.status).toBe(200)
    expect(res.body.data.id).toBe(created.body.data.id)
  })
  it('returns 404 for an unknown ticket', async () => {
    expect((await request(app).get('/api/queue/status/NOPE')).status).toBe(404)
  })
})

describe('POST /leave', () => {
  it('requires a ticket ID', async () => {
    expect((await request(app).post('/api/queue/leave').send({})).status).toBe(400)
  })
  it('returns 404 for an unknown ticket', async () => {
    expect((await request(app).post('/api/queue/leave').send({ ticketId: 'NOPE' })).status).toBe(404)
  })
  it('cancels the ticket, archives it, and moves the line up', async () => {
    const res = await request(app).post('/api/queue/leave').send({ ticketId: 'TICK-101' })
    expect(res.status).toBe(200)
    expect(store.history[0]).toMatchObject({ id: 'TICK-101', status: 'cancelled' })
    const t102 = store.tickets.find((t) => t.id === 'TICK-102')!
    expect(t102.position).toBe(1)
    expect(t102.estimatedWait).toBe(0)
  })
  it('recalculates waits for people behind the one who left', async () => {
    await join({ ...base, studentId: 'A' })
    const b = await join({ ...base, studentId: 'B' })
    const c = await join({ ...base, studentId: 'C' })
    await request(app).post('/api/queue/leave').send({ ticketId: b.body.data.id })
    const ticketC = store.tickets.find((t) => t.id === c.body.data.id)!
    expect(ticketC.position).toBe(2)
    expect(ticketC.estimatedWait).toBe(20)
  })
})

describe('POST /serve-next', () => {
  const serve = (serviceId?: number) => request(app).post('/api/queue/serve-next').send({ serviceId })

  it('completes the current ticket and starts the next one', async () => {
    const res = await serve(1)
    expect(res.status).toBe(200)
    expect(res.body.data).toMatchObject({ id: 'TICK-102', status: 'in_progress', position: 1, estimatedWait: 0 })
    expect(store.history[0]).toMatchObject({ id: 'TICK-101', status: 'completed' })
  })
  it('keeps positions unique when nobody is in progress yet', async () => {
    await join({ ...base, studentId: 'A' })
    await join({ ...base, studentId: 'B' })
    await join({ ...base, studentId: 'C' })
    await serve(2)
    const positions = (await queueOf(2)).map((t: any) => t.position)
    expect(positions).toEqual([1, 2, 3])
  })
  it('serves the highest-priority waiting ticket first', async () => {
    await join({ ...base, studentId: 'A', priority: 'low' })
    const high = await join({ ...base, studentId: 'B', priority: 'high' })
    const res = await serve(2)
    expect(res.body.data.id).toBe(high.body.data.id)
  })
  it('finishes the queue and then reports it empty', async () => {
    await serve(1) // 101 done, 102 in progress
    const last = await serve(1) // 102 done, nobody left
    expect(last.status).toBe(200)
    expect(last.body.data).toBeNull()
    expect((await serve(1)).status).toBe(400)
  })
  it('returns 400 for an empty queue or a missing service ID', async () => {
    expect((await serve(2)).status).toBe(400)
    expect((await serve()).status).toBe(400)
  })
})
