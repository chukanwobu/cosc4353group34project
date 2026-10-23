const API_BASE_URL = 'http://localhost:5001/api'

export interface ApiUser {
  id: string
  email: string
  name: string
  role: 'user' | 'admin'
  studentId?: string
}

export interface AuthApiResponse {
  success: boolean
  message?: string
  data?: {
    user: ApiUser
    token: string
  }
  user?: ApiUser
  error?: string
  details?: Record<string, string>
}

/**
 * Call backend registration endpoint
 * POST /api/auth/register
 */
export async function registerApi(payload: {
  email: string
  password: string
  name: string
  role?: 'user' | 'admin'
  studentId?: string
}): Promise<AuthApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/register`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    return data
  } catch {
    // If backend server is not running during standalone dev, provide structured offline response
    return {
      success: false,
      error: 'Unable to connect to QueueSmart backend API server on http://localhost:5001.'
    }
  }
}

/**
 * Call backend login endpoint
 * POST /api/auth/login
 */
export async function loginApi(payload: {
  email: string
  password: string
}): Promise<AuthApiResponse> {
  try {
    const res = await fetch(`${API_BASE_URL}/auth/login`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify(payload)
    })
    const data = await res.json()
    return data
  } catch {
    return {
      success: false,
      error: 'Unable to connect to QueueSmart backend API server on http://localhost:5001.'
    }
  }
}
