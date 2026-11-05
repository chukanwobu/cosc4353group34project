import bcrypt from 'bcryptjs'
import { getDb } from '../db/database'
import { store } from '../data/memoryStore'
import { SafeUser, RegisterDTO, LoginDTO, AuthResponse, UserRole } from '../types/user'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

interface JoinedUserRecord {
  user_id: string
  email: string
  password_hash: string
  role: UserRole
  full_name: string
  student_id: string | null
  phone: string | null
  preferences: string | null
  created_at: string
}

export class AuthService {
  /**
   * Validate registration payload defense rules
   */
  public static validateRegisterInput(data: RegisterDTO): { isValid: boolean; errors: Record<string, string> } {
    const errors: Record<string, string> = {}

    if (!data.email || typeof data.email !== 'string' || !data.email.trim()) {
      errors.email = 'Email address is required.'
    } else if (!EMAIL_REGEX.test(data.email.trim())) {
      errors.email = 'Enter a valid email address, such as name@example.com.'
    } else if (data.email.length > 150) {
      errors.email = 'Email address must not exceed 150 characters.'
    }

    if (!data.password || typeof data.password !== 'string') {
      errors.password = 'Password is required.'
    } else if (data.password.length < 8) {
      errors.password = 'Password must be at least 8 characters long.'
    } else if (!PASSWORD_REGEX.test(data.password)) {
      errors.password = 'Password must include at least one letter and one number.'
    }

    if (!data.name || typeof data.name !== 'string' || !data.name.trim()) {
      errors.name = 'Full name is required.'
    } else if (data.name.trim().length > 100) {
      errors.name = 'Name must not exceed 100 characters.'
    }

    if (data.role && data.role !== 'user' && data.role !== 'admin') {
      errors.role = 'Role must be either "user" or "admin".'
    }

    return {
      isValid: Object.keys(errors).length === 0,
      errors
    }
  }

  /**
   * Register a new user with encrypted password in UserCredentials and profile in UserProfile
   */
  public register(dto: RegisterDTO): { user?: SafeUser; error?: string; status?: number; details?: Record<string, string> } {
    const validation = AuthService.validateRegisterInput(dto)
    if (!validation.isValid) {
      return {
        error: 'Validation failed.',
        status: 400,
        details: validation.errors
      }
    }

    const normalizedEmail = dto.email.trim().toLowerCase()
    const db = getDb()

    // Database uniqueness pre-check
    const existing = db.prepare('SELECT user_id FROM UserCredentials WHERE lower(email) = ?').get(normalizedEmail) as { user_id: string } | undefined
    if (existing) {
      return {
        error: 'An account with this email address already exists. Please log in.',
        status: 409
      }
    }

    // Password encryption via bcrypt (cost factor = 10)
    const salt = bcrypt.genSaltSync(10)
    const passwordHash = bcrypt.hashSync(dto.password, salt)

    const userId = `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const profileId = `prof-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`
    const assignedRole: UserRole = dto.role === 'admin' ? 'admin' : 'user'
    const trimmedName = dto.name.trim()
    const studentId = dto.studentId?.trim() || null
    const phone = dto.phone?.trim() || null
    const preferences = dto.preferences ? (typeof dto.preferences === 'string' ? dto.preferences : JSON.stringify(dto.preferences)) : '{}'

    const insertCred = db.prepare(`
      INSERT INTO UserCredentials (user_id, email, password_hash, role)
      VALUES (?, ?, ?, ?)
    `)

    const insertProfile = db.prepare(`
      INSERT INTO UserProfile (profile_id, user_id, full_name, email, student_id, phone, preferences)
      VALUES (?, ?, ?, ?, ?, ?, ?)
    `)

    try {
      const registerTransaction = db.transaction(() => {
        insertCred.run(userId, normalizedEmail, passwordHash, assignedRole)
        insertProfile.run(profileId, userId, trimmedName, normalizedEmail, studentId, phone, preferences)
      })

      registerTransaction()

      const safeUser: SafeUser = {
        id: userId,
        email: normalizedEmail,
        name: trimmedName,
        role: assignedRole,
        studentId: studentId || undefined,
        phone: phone || undefined,
        preferences,
        createdAt: new Date().toISOString()
      }

      // Synchronize in-memory mirror for backward compatibility
      store.users.push({
        id: userId,
        email: normalizedEmail,
        name: trimmedName,
        role: assignedRole,
        studentId: studentId || undefined,
        phone: phone || undefined,
        preferences,
        createdAt: safeUser.createdAt!
      })

      return {
        user: safeUser,
        status: 201
      }
    } catch (err: any) {
      if (err.message && err.message.includes('UNIQUE constraint failed')) {
        return {
          error: 'An account with this email address already exists. Please log in.',
          status: 409
        }
      }
      return {
        error: 'Database registration failed: ' + err.message,
        status: 500
      }
    }
  }

  /**
   * Authenticate an existing user using bcrypt password comparison against UserCredentials
   */
  public login(dto: LoginDTO): { auth?: AuthResponse; error?: string; status?: number } {
    if (!dto.email || !dto.password) {
      return {
        error: 'Email and password are required.',
        status: 400
      }
    }

    const normalizedEmail = dto.email.trim().toLowerCase()
    const db = getDb()

    const record = db.prepare(`
      SELECT c.user_id, c.email, c.password_hash, c.role, p.full_name, p.student_id, p.phone, p.preferences, c.created_at
      FROM UserCredentials c
      JOIN UserProfile p ON c.user_id = p.user_id
      WHERE lower(c.email) = ?
    `).get(normalizedEmail) as JoinedUserRecord | undefined

    if (!record) {
      return {
        error: 'Invalid email or password.',
        status: 401
      }
    }

    // Constant-time hash comparison
    const isPasswordValid = bcrypt.compareSync(dto.password, record.password_hash)
    if (!isPasswordValid) {
      return {
        error: 'Invalid email or password.',
        status: 401
      }
    }

    const authResponse: AuthResponse = {
      user: {
        id: record.user_id,
        email: record.email,
        name: record.full_name,
        role: record.role,
        studentId: record.student_id || undefined,
        phone: record.phone || undefined,
        preferences: record.preferences || undefined,
        createdAt: record.created_at
      },
      token: `jwt-auth-${record.user_id}-${Date.now()}`
    }

    return {
      auth: authResponse,
      status: 200
    }
  }

  /**
   * Find user by ID (joined from UserCredentials and UserProfile)
   */
  public getUserById(id: string): SafeUser | null {
    const db = getDb()
    const record = db.prepare(`
      SELECT c.user_id, c.email, c.role, p.full_name, p.student_id, p.phone, p.preferences, c.created_at
      FROM UserCredentials c
      JOIN UserProfile p ON c.user_id = p.user_id
      WHERE c.user_id = ?
    `).get(id) as Omit<JoinedUserRecord, 'password_hash'> | undefined

    if (!record) return null

    return {
      id: record.user_id,
      email: record.email,
      name: record.full_name,
      role: record.role,
      studentId: record.student_id || undefined,
      phone: record.phone || undefined,
      preferences: record.preferences || undefined,
      createdAt: record.created_at
    }
  }

  /**
   * Find user by Email (joined from UserCredentials and UserProfile)
   */
  public getUserByEmail(email: string): SafeUser | null {
    const db = getDb()
    const record = db.prepare(`
      SELECT c.user_id, c.email, c.role, p.full_name, p.student_id, p.phone, p.preferences, c.created_at
      FROM UserCredentials c
      JOIN UserProfile p ON c.user_id = p.user_id
      WHERE lower(c.email) = ?
    `).get(email.trim().toLowerCase()) as Omit<JoinedUserRecord, 'password_hash'> | undefined

    if (!record) return null

    return {
      id: record.user_id,
      email: record.email,
      name: record.full_name,
      role: record.role,
      studentId: record.student_id || undefined,
      phone: record.phone || undefined,
      preferences: record.preferences || undefined,
      createdAt: record.created_at
    }
  }
}

export const authService = new AuthService()
