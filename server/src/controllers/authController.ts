import { Request, Response } from 'express'
import { authService } from '../services/authService'
import { RegisterDTO, LoginDTO } from '../types/user'

export class AuthController {
  /**
   * Handle user registration
   * POST /api/auth/register
   */
  public static async register(req: Request, res: Response): Promise<void> {
    try {
      const dto: RegisterDTO = req.body
      const result = authService.register(dto)

      if (result.error) {
        res.status(result.status || 400).json({
          success: false,
          error: result.error,
          details: result.details
        })
        return
      }

      res.status(201).json({
        success: true,
        message: 'Account successfully registered.',
        user: result.user
      })
    } catch {
      res.status(500).json({
        success: false,
        error: 'An internal server error occurred during registration.'
      })
    }
  }

  /**
   * Handle user login
   * POST /api/auth/login
   */
  public static async login(req: Request, res: Response): Promise<void> {
    try {
      const dto: LoginDTO = req.body
      const result = authService.login(dto)

      if (result.error) {
        res.status(result.status || 401).json({
          success: false,
          error: result.error
        })
        return
      }

      res.status(200).json({
        success: true,
        message: 'Login successful.',
        data: result.auth
      })
    } catch {
      res.status(500).json({
        success: false,
        error: 'An internal server error occurred during login.'
      })
    }
  }

  /**
   * Get current authenticated user profile
   * GET /api/auth/me
   */
  public static async getProfile(req: Request, res: Response): Promise<void> {
    try {
      const userId = req.headers['x-user-id'] as string
      if (!userId) {
        res.status(401).json({
          success: false,
          error: 'Missing authentication credentials.'
        })
        return
      }

      const user = authService.getUserById(userId)
      if (!user) {
        res.status(404).json({
          success: false,
          error: 'User not found.'
        })
        return
      }

      res.status(200).json({
        success: true,
        user
      })
    } catch {
      res.status(500).json({
        success: false,
        error: 'Failed to retrieve user profile.'
      })
    }
  }
}
