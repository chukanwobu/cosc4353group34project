import { describe, it, expect, beforeEach } from 'vitest'
import request from 'supertest'
import bcrypt from 'bcryptjs'
import { app } from '../src/app'
import { store } from '../src/data/memoryStore'
import { getDb } from '../src/db/database'

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

  describe('Assignment 4: Database Persistence & bcrypt Password Encryption', () => {
    it('should persist user credentials in SQLite UserCredentials table with encrypted bcrypt password', async () => {
      const plainPassword = 'SecurePassword2026!'
      const email = 'db_persist_test@uh.edu'

      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: plainPassword,
          name: 'Database Student',
          studentId: '9876543',
          phone: '713-555-0123'
        })

      expect(res.status).toBe(201)
      const userId = res.body.user.id

      // Query UserCredentials table directly from SQLite
      const db = getDb()
      const credRecord = db.prepare('SELECT * FROM UserCredentials WHERE user_id = ?').get(userId) as any

      expect(credRecord).toBeDefined()
      expect(credRecord.email).toBe(email)
      expect(credRecord.role).toBe('user')

      // CRITICAL SECURITY ASSERTION: Password must be hashed with bcrypt, NOT stored as plaintext
      expect(credRecord.password_hash).not.toBe(plainPassword)
      // bcrypt hashes start with $2a$, $2b$, or $2y$ followed by cost factor (e.g. $2a$10$)
      expect(credRecord.password_hash).toMatch(/^\$2[aby]\$[0-9]{2}\$[./A-Za-z0-9]{53}$/)

      // Verify that bcrypt.compareSync matches the plaintext password
      const isMatch = bcrypt.compareSync(plainPassword, credRecord.password_hash)
      expect(isMatch).toBe(true)
    })

    it('should persist demographic data in SQLite UserProfile table linked via foreign key', async () => {
      const email = 'profile_persist_test@uh.edu'
      const res = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password: 'Password999',
          name: 'Maria Garcia',
          studentId: '3456789',
          phone: '832-555-9876',
          preferences: '{"theme":"dark","notifications":true}'
        })

      expect(res.status).toBe(201)
      const userId = res.body.user.id

      // Query UserProfile table directly from SQLite
      const db = getDb()
      const profileRecord = db.prepare('SELECT * FROM UserProfile WHERE user_id = ?').get(userId) as any

      expect(profileRecord).toBeDefined()
      expect(profileRecord.user_id).toBe(userId)
      expect(profileRecord.full_name).toBe('Maria Garcia')
      expect(profileRecord.email).toBe(email)
      expect(profileRecord.student_id).toBe('3456789')
      expect(profileRecord.phone).toBe('832-555-9876')
      expect(profileRecord.preferences).toContain('theme')
    })

    it('should enforce SQLite UNIQUE constraint on UserCredentials.email directly at the database engine level', async () => {
      const db = getDb()
      const existingUser = 'user@queuesmart.com' // Pre-seeded

      // Attempting a direct SQL insert with duplicate email must fail with UNIQUE constraint
      expect(() => {
        db.prepare(`
          INSERT INTO UserCredentials (user_id, email, password_hash, role)
          VALUES ('usr-duplicate-test', ?, '$2a$10$dummyhashvalue', 'user')
        `).run(existingUser)
      }).toThrow(/UNIQUE constraint failed: UserCredentials\.email/)
    })

    it('should enforce SQLite CHECK constraint on UserCredentials.role', () => {
      const db = getDb()
      // Role must be 'user' or 'admin'
      expect(() => {
        db.prepare(`
          INSERT INTO UserCredentials (user_id, email, password_hash, role)
          VALUES ('usr-bad-role', 'badrole_db@example.com', '$2a$10$dummyhashvalue', 'invalid_role')
        `).run()
      }).toThrow(/CHECK constraint failed/)
    })

    it('should enforce cascading delete from UserCredentials to UserProfile', async () => {
      const db = getDb()
      const tempUserId = 'usr-cascade-test'
      const tempEmail = 'cascade@example.com'

      db.prepare(`
        INSERT INTO UserCredentials (user_id, email, password_hash, role)
        VALUES (?, ?, '$2a$10$dummyhash', 'user')
      `).run(tempUserId, tempEmail)

      db.prepare(`
        INSERT INTO UserProfile (profile_id, user_id, full_name, email)
        VALUES ('prof-cascade-test', ?, 'Cascade Tester', ?)
      `).run(tempUserId, tempEmail)

      // Verify profile exists
      let profile = db.prepare('SELECT * FROM UserProfile WHERE user_id = ?').get(tempUserId)
      expect(profile).toBeDefined()

      // Delete parent credential
      db.prepare('DELETE FROM UserCredentials WHERE user_id = ?').run(tempUserId)

      // Profile should be automatically cascade-deleted
      profile = db.prepare('SELECT * FROM UserProfile WHERE user_id = ?').get(tempUserId)
      expect(profile).toBeUndefined()
    })

    it('should authenticate user against hashed password stored in SQLite database during login', async () => {
      const email = 'db_login_auth@uh.edu'
      const password = 'MyPassword1234'

      // Register user
      const registerRes = await request(app)
        .post('/api/auth/register')
        .send({
          email,
          password,
          name: 'Login Verification User'
        })
      expect(registerRes.status).toBe(201)

      // Login using exact credentials
      const loginRes = await request(app)
        .post('/api/auth/login')
        .send({
          email,
          password
        })

      expect(loginRes.status).toBe(200)
      expect(loginRes.body.success).toBe(true)
      expect(loginRes.body.data.user.email).toBe(email)
      expect(loginRes.body.data.user.name).toBe('Login Verification User')
      expect(loginRes.body.data.token).toBeDefined()
    })
  })
})
