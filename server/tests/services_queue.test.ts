import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { store } from '../src/data/memoryStore'

describe('Service & Queue Backend Modules', () => {
  beforeEach(() => {
    store.reset()
  })

  describe('Service Management Endpoints (/api/services)', () => {
    it('should list all available services', async () => {
      const res = await request(app).get('/api/services')
      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.length).toBeGreaterThan(0)
    })

    it('should reject service creation when name exceeds 100 characters', async () => {
      const longName = 'A'.repeat(101)
      const res = await request(app)
        .post('/api/services')
        .send({
          name: longName,
          description: 'Valid description',
          duration: 15,
          priority: 'high'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.name).toContain('100 characters')
    })

    it('should reject service creation when duration is invalid or non-positive', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({
          name: 'Career Counseling',
          description: 'Valid description',
          duration: 0,
          priority: 'medium'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.duration).toBeDefined()
    })

    it('should toggle service open/close queue status', async () => {
      const res = await request(app).patch('/api/services/1/toggle')
      expect(res.status).toBe(200)
      expect(res.body.data.isOpen).toBe(false)
    })

    
    it('should update an existing service', async () => {
      const updatedService = {
        name: 'Academic Advising Center',
        description: 'Updated academic advising services.',
        duration: 25,
        priority: 'high'
      }

      const res = await request(app)
        .put('/api/services/1')
        .send(updatedService)

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.name).toBe('Academic Advising Center')
      expect(res.body.data.duration).toBe(25)

      const savedService = store.services.find(
        (service) => service.id === 1
      )

      expect(savedService?.name).toBe('Academic Advising Center')
    })

    
    it('should reject invalid service updates', async () => {
      const res = await request(app)
        .put('/api/services/1')
        .send({
          name: 'A'.repeat(101),
          description: 'Updated description',
          duration: 0,
          priority: 'invalid'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details.name).toBeDefined()
      expect(res.body.details.duration).toBeDefined()
      expect(res.body.details.priority).toBeDefined()
    })

    it('should return 404 when updating a nonexistent service', async () => {
      const res = await request(app)
        .put('/api/services/99999')
        .send({
          name: 'New Service',
          description: 'Test description',
          duration: 20,
          priority: 'medium'
        })

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })

    it('should reject fractional service durations', async () => {
      const res = await request(app)
        .post('/api/services')
        .send({
          name: 'Career Counseling',
          description: 'Career planning assistance',
          duration: 2.5,
          priority: 'medium'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details.duration).toBeDefined()
    })

  })

  describe('Queue Management Endpoints (/api/queue)', () => {
    it('should calculate rule-based wait time correctly upon joining queue', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({
          serviceId: 2, // Financial Aid (duration 20 min)
          userName: 'Morgan Reed',
          studentId: '1928374',
          notes: 'FAFSA inquiry'
        })

      expect(res.status).toBe(201)
      expect(res.body.data.position).toBe(1)
      expect(res.body.data.estimatedWait).toBe(0) // first in line wait is 0 min
    })

    it('should reject queue entry with 400 if notes exceed 200 characters', async () => {
      const longNotes = 'X'.repeat(201)
      const res = await request(app)
        .post('/api/queue/join')
        .send({
          serviceId: 1,
          userName: 'Morgan Reed',
          studentId: '1928374',
          notes: longNotes
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.notes).toContain('200 characters')
    })

    it('should reject joining a closed queue with 400 Bad Request', async () => {
      const res = await request(app)
        .post('/api/queue/join')
        .send({
          serviceId: 4, // Campus IT Help Desk is closed by default
          userName: 'Test Student',
          studentId: '1234567',
          notes: 'Wi-Fi help'
        })

      expect(res.status).toBe(400)
      expect(res.body.error).toContain('closed')
    })

    it('should allow user to leave queue and adjust downstream positions', async () => {
      const res = await request(app)
        .post('/api/queue/leave')
        .send({ ticketId: 'TICK-102' })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
    })
  })
})
