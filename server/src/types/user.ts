export type UserRole = 'user' | 'admin'

/**
 * Database record for UserCredentials table (Stores encrypted auth info)
 */
export interface UserCredentialsRecord {
  user_id: string
  email: string
  password_hash: string
  role: UserRole
  created_at?: string
  updated_at?: string
}

/**
 * Database record for UserProfile table (Stores user demographic & preferences)
 */
export interface UserProfileRecord {
  profile_id: string
  user_id: string
  full_name: string
  email: string
  student_id?: string | null
  phone?: string | null
  preferences?: string | null
  created_at?: string
}

/**
 * Public/Safe user object without password or hash
 */
export interface SafeUser {
  id: string
  email: string
  name: string
  role: UserRole
  studentId?: string
  phone?: string
  preferences?: string
  createdAt?: string
}

/**
 * Backward-compatible User interface
 */
export interface User {
  id: string
  email: string
  password?: string
  name: string
  role: UserRole
  studentId?: string
  phone?: string
  preferences?: string
  createdAt: string
}

export interface RegisterDTO {
  email: string
  password: string
  name: string
  role?: UserRole
  studentId?: string
  phone?: string
  preferences?: string
}

export interface LoginDTO {
  email: string
  password: string
}

export interface AuthResponse {
  user: SafeUser
  token: string
}
