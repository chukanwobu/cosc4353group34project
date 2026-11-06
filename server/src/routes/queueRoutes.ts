import { Router, Request, Response } from 'express'
import { store } from '../data/memoryStore'
import { JoinQueueDTO } from '../types/queue'
import * as queueRepo from '../db/queueRepository'
import { QueueError } from '../db/queueRepository'

const router = Router()

// ---------- Helpers (added) ----------

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }
const MAX_NAME_LENGTH = 100
const MAX_STUDENT_ID_LENGTH = 20
const MAX_NOTES_LENGTH = 200

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** Maps repository errors to HTTP responses; returns true when handled. */
function sendQueueError(res: Response, err: unknown): boolean {
  if (!(err instanceof QueueError)) return false
  const status: Record<QueueError['code'], number> = {
    SERVICE_NOT_FOUND: 404,
    TICKET_NOT_FOUND: 404,
    UNKNOWN_USER: 400,
    SERVICE_CLOSED: 400,
    EMPTY_QUEUE: 400
  }
  res.status(status[err.code]).json({ success: false, error: err.message })
  return true
}

// ---------- Routes ----------

// GET /api/queue - List all active tickets
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: queueRepo.listActiveTickets()
  })
})

// GET /api/queue/status/:ticketId - Look up one ticket (added: used by the Queue Status screen)
router.get('/status/:ticketId', (req: Request, res: Response) => {
  const ticket = queueRepo.getTicket(req.params.ticketId)
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found.' })
    return
  }
  res.status(200).json({ success: true, data: ticket })
})

// GET /api/queue/:serviceId - Get queue for specific service
router.get('/:serviceId', (req: Request, res: Response) => {
  const serviceId = Number(req.params.serviceId)
  const serviceQueue = queueRepo.listQueueForService(serviceId)

  res.status(200).json({
    success: true,
    data: serviceQueue
  })
})

// POST /api/queue/join - Join a service queue (Jordan)
router.post('/join', (req: Request, res: Response) => {
  const { serviceId, userName, studentId, notes, priority }: JoinQueueDTO = req.body

  const errors: Record<string, string> = {}
  if (serviceId === undefined || serviceId === null || (serviceId as unknown) === '') {
    errors.serviceId = 'Service ID is required.'
  } else if (!Number.isInteger(Number(serviceId))) {
    errors.serviceId = 'Service ID must be a whole number.'
  }

  if (!userName || typeof userName !== 'string' || !userName.trim()) {
    errors.userName = 'Full name is required.'
  } else if (userName.trim().length > MAX_NAME_LENGTH) {
    errors.userName = `Full name must not exceed ${MAX_NAME_LENGTH} characters.`
  }

  if (!studentId || typeof studentId !== 'string' || !studentId.trim()) {
    errors.studentId = 'Student ID is required.'
  } else if (studentId.trim().length > MAX_STUDENT_ID_LENGTH) {
    errors.studentId = `Student ID must not exceed ${MAX_STUDENT_ID_LENGTH} characters.`
  }

  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    errors.notes = 'Reason for visit is required.'
  } else if (notes.length > MAX_NOTES_LENGTH) {
    errors.notes = `Reason for visit must not exceed ${MAX_NOTES_LENGTH} characters.`
  }

  if (priority !== undefined && !(typeof priority === 'string' && Object.hasOwn(PRIORITY_RANK, priority))) {
    errors.priority = 'Priority must be "low", "medium", or "high".'
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ success: false, error: 'Validation failed.', details: errors })
    return
  }

  // Services still live in the in-memory store until /api/services moves to SQL, so it decides whether the service
  // exists; its current state is mirrored into the Service table for the queue tables to reference.
  const targetService = store.services.find((s) => s.id === Number(serviceId))
  if (!targetService) {
    res.status(404).json({ success: false, error: 'Service not found.' })
    return
  }
  queueRepo.syncService({
    id: targetService.id,
    name: targetService.name,
    description: targetService.description,
    duration: targetService.duration,
    priority: targetService.priority,
    isOpen: targetService.isOpen
  })

  const userId = typeof req.body.userId === 'string' && req.body.userId ? req.body.userId : undefined

  let newTicket
  try {
    newTicket = queueRepo.joinQueue({
      serviceId: Number(serviceId),
      userName,
      studentId,
      notes,
      priority,
      userId
    })
  } catch (err) {
    if (sendQueueError(res, err)) return
    throw err
  }

  // Dispatch notification
  store.notifications.unshift({
    id: `notif-${Date.now()}`,
    message: `You joined queue for ${newTicket.serviceName}! Ticket #${newTicket.id} (Position #${newTicket.position}).`,
    type: 'success',
    timestamp: nowTime()
  })

  res.status(201).json({
    success: true,
    message: 'Successfully joined queue.',
    data: newTicket
  })
})

// POST /api/queue/leave - Leave a queue line
router.post('/leave', (req: Request, res: Response) => {
  const { ticketId } = req.body ?? {}

  if (!ticketId) {
    res.status(400).json({ success: false, error: 'Ticket ID is required.' })
    return
  }

  let removed
  try {
    removed = queueRepo.leaveQueue(String(ticketId))
  } catch (err) {
    if (sendQueueError(res, err)) return
    throw err
  }

  res.status(200).json({
    success: true,
    message: `Left queue for ticket #${ticketId}.`,
    data: removed
  })
})

// POST /api/queue/serve-next - Serve next waiting student (Luis)
router.post('/serve-next', (req: Request, res: Response) => {
  const { serviceId } = req.body ?? {}
  const sId = Number(serviceId)

  let result
  try {
    result = queueRepo.serveNext(sId)
  } catch (err) {
    if (sendQueueError(res, err)) return
    throw err
  }

  if (result.serving) {
    // Trigger notification
    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      message: `Now serving ${result.serving.userName} (Ticket #${result.serving.id})!`,
      type: 'info',
      timestamp: nowTime()
    })

    res.status(200).json({
      success: true,
      message: `Now serving ${result.serving.userName}.`,
      data: result.serving
    })
    return
  }

  res.status(200).json({
    success: true,
    message: 'All tickets for this service completed.',
    data: null
  })
})

export default router
