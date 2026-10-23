import { Router, Request, Response } from 'express'
import { store } from '../data/memoryStore'

const router = Router()

// GET /api/notifications - List real-time in-app notifications
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: store.notifications
  })
})

export default router
