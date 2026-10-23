import { store } from '../data/memoryStore'
import { User, RegisterDTO, LoginDTO, AuthResponse, UserRole } from '../types/user'

const EMAIL_REGEX = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PASSWORD_REGEX = /^(?=.*[A-Za-z])(?=.*\d).{8,}$/

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
   * Register a new user
   */
  public register(dto: RegisterDTO): { user?: Omit<User, 'password'>; error?: string; status?: number; details?: Record<string, string> } {
    const validation = AuthService.validateRegisterInput(dto)
    if (!validation.isValid) {
      return {
        error: 'Validation failed.',
        status: 400,
        details: validation.errors
      }
    }

    const normalizedEmail = dto.email.trim().toLowerCase()

    // Duplicate email check
    const existing = store.users.find((u) => u.email.toLowerCase() === normalizedEmail)
    if (existing) {
      return {
        error: 'An account with this email address already exists. Please log in.',
        status: 409
      }
    }

    const assignedRole: UserRole = dto.role === 'admin' ? 'admin' : 'user'

    const newUser: User = {
      id: `usr-${Date.now()}-${Math.random().toString(36).substring(2, 6)}`,
      email: normalizedEmail,
      password: dto.password,
      name: dto.name.trim(),
      role: assignedRole,
      studentId: dto.studentId?.trim() || undefined,
      createdAt: new Date().toISOString()
    }

    store.users.push(newUser)

    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = newUser
    return {
      user: safeUser,
      status: 201
    }
  }

  /**
   * Authenticate an existing user
   */
  public login(dto: LoginDTO): { auth?: AuthResponse; error?: string; status?: number } {
    if (!dto.email || !dto.password) {
      return {
        error: 'Email and password are required.',
        status: 400
      }
    }

    const normalizedEmail = dto.email.trim().toLowerCase()
    const user = store.users.find((u) => u.email.toLowerCase() === normalizedEmail)

    if (!user) {
      return {
        error: 'Invalid email or password.',
        status: 401
      }
    }

    if (user.password !== dto.password) {
      return {
        error: 'Invalid email or password.',
        status: 401
      }
    }

    const authResponse: AuthResponse = {
      user: {
        id: user.id,
        email: user.email,
        name: user.name,
        role: user.role,
        studentId: user.studentId
      },
      token: `mock-jwt-token-${user.id}-${Date.now()}`
    }

    return {
      auth: authResponse,
      status: 200
    }
  }

  /**
   * Find user by ID
   */
  public getUserById(id: string): Omit<User, 'password'> | null {
    const user = store.users.find((u) => u.id === id)
    if (!user) return null
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user
    return safeUser
  }

  /**
   * Find user by Email
   */
  public getUserByEmail(email: string): Omit<User, 'password'> | null {
    const user = store.users.find((u) => u.email.toLowerCase() === email.trim().toLowerCase())
    if (!user) return null
    // eslint-disable-next-line @typescript-eslint/no-unused-vars
    const { password, ...safeUser } = user
    return safeUser
  }
}

export const authService = new AuthService()
