export type UserRole = 'user' | 'admin'

export interface User {
  id: string
  email: string
  password: string // in-memory stored credential
  name: string
  role: UserRole
  studentId?: string
  createdAt: string
}

export interface RegisterDTO {
  email: string
  password: string
  name: string
  role?: UserRole
  studentId?: string
}

export interface LoginDTO {
  email: string
  password: string
}

export interface AuthResponse {
  user: {
    id: string
    email: string
    name: string
    role: UserRole
    studentId?: string
  }
  token: string
}
