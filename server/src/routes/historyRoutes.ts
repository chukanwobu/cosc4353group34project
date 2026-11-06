import { Router, Request, Response } from 'express'
import { listHistory } from '../db/queueRepository'

const router = Router()

// GET /api/history - Return queue participation history (finished tickets, most recently joined first).
// Optional ?userId= limits it to one account.
router.get('/', (req: Request, res: Response) => {
  const userId = typeof req.query.userId === 'string' && req.query.userId ? req.query.userId : undefined
  res.status(200).json({
    success: true,
    data: listHistory(userId)
  })
})

export default router
