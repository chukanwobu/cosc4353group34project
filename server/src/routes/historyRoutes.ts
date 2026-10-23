import { Router, Request, Response } from 'express'
import { store } from '../data/memoryStore'

const router = Router()

// GET /api/history - Return user queue participation history
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: store.history
  })
})

export default router
