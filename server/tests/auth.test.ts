import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import { app } from '../src/app'
import { store } from '../src/data/memoryStore'

describe('Authentication & User Management Module (Samuel Sabu)', () => {
  beforeEach(() => {
    // Reset in-memory store before each test to guarantee isolation
    store.reset()
  })

  describe('POST /api/auth/register - User Registration & Role Assignment', () => {
    it('should successfully register a new student user with default role "user"', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newstudent@uh.edu',
          password: 'Password123',
          name: 'Alex Johnson',
          studentId: '2058192'
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.user).toBeDefined()
      expect(res.body.user.email).toBe('newstudent@uh.edu')
      expect(res.body.user.name).toBe('Alex Johnson')
      expect(res.body.user.role).toBe('user')
      expect(res.body.user.password).toBeUndefined() // never expose plain password
    })

    it('should successfully register an administrator when role "admin" is explicitly requested', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'newadmin@queuesmart.com',
          password: 'AdminPassword123',
          name: 'Advisor Smith',
          role: 'admin'
        })

      expect(res.status).toBe(201)
      expect(res.body.success).toBe(true)
      expect(res.body.user.role).toBe('admin')
    })

    it('should reject registration with 409 Conflict if email is already taken', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'user@queuesmart.com', // pre-seeded demo user
          password: 'ValidPassword123',
          name: 'Duplicate Test'
        })

      expect(res.status).toBe(409)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toContain('already exists')
    })

    it('should reject registration with 400 Bad Request for invalid email format', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'invalid-email-format',
          password: 'Password123',
          name: 'Test Student'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.email).toBeDefined()
    })

    it('should reject registration with 400 Bad Request for short password (< 8 chars)', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'shortpass@example.com',
          password: 'pass1',
          name: 'Short Pass'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.password).toContain('at least 8 characters')
    })

    it('should reject registration with 400 Bad Request for password missing numbers', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'nonumbers@example.com',
          password: 'passwordonlyletters',
          name: 'No Numbers'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.password).toContain('at least one letter and one number')
    })

    it('should reject registration with 400 Bad Request when name is empty', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'noname@example.com',
          password: 'Password123',
          name: '   '
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.name).toBeDefined()
    })

    it('should reject registration with 400 Bad Request for invalid role specification', async () => {
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email: 'badrole@example.com',
          password: 'Password123',
          name: 'Bad Role',
          role: 'superuser' as any
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.details?.role).toContain('"user" or "admin"')
    })
  })

  describe('POST /api/auth/login - Authentication & Role Verification', () => {
    it('should authenticate demo student user and return user object with "user" role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@queuesmart.com',
          password: 'password123'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.role).toBe('user')
      expect(res.body.data.user.email).toBe('user@queuesmart.com')
      expect(res.body.data.token).toBeDefined()
    })

    it('should authenticate demo administrator and return user object with "admin" role', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'admin@queuesmart.com',
          password: 'admin1234'
        })

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.data.user.role).toBe('admin')
      expect(res.body.data.user.name).toBe('Campus Administrator')
    })

    it('should reject login with 401 Unauthorized for incorrect password', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@queuesmart.com',
          password: 'WrongPassword999'
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe('Invalid email or password.')
    })

    it('should reject login with 401 Unauthorized for non-existent email', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'doesnotexist@example.com',
          password: 'password123'
        })

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toBe('Invalid email or password.')
    })

    it('should reject login with 400 Bad Request when email or password is missing', async () => {
      const res = await request(app)
        .post('/api/auth/login')
        .send({
          email: 'user@queuesmart.com'
        })

      expect(res.status).toBe(400)
      expect(res.body.success).toBe(false)
      expect(res.body.error).toContain('required')
    })
  })

  describe('GET /api/auth/me - Session Verification', () => {
    it('should return the current user profile when valid user ID header is provided', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('x-user-id', 'usr-1')

      expect(res.status).toBe(200)
      expect(res.body.success).toBe(true)
      expect(res.body.user.email).toBe('user@queuesmart.com')
    })

    it('should return 401 Unauthorized when user ID header is omitted', async () => {
      const res = await request(app).get('/api/auth/me')

      expect(res.status).toBe(401)
      expect(res.body.success).toBe(false)
    })

    it('should return 404 Not Found for non-existent user ID', async () => {
      const res = await request(app)
        .get('/api/auth/me')
        .set('x-user-id', 'non-existent-id')

      expect(res.status).toBe(404)
      expect(res.body.success).toBe(false)
    })
  })
})
