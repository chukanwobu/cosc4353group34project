import { Router } from 'express'
import { AuthController } from '../controllers/authController'

const router = Router()

// Authentication & Role Management routes (Samuel Sabu)
router.post('/register', AuthController.register)
router.post('/login', AuthController.login)
router.get('/me', AuthController.getProfile)

export default router
