import { Router, Request, Response } from 'express'
import { store } from '../data/memoryStore'
import { JoinQueueDTO, Ticket } from '../types/queue'

const router = Router()

// ---------- Helpers (added) ----------

const PRIORITY_RANK: Record<string, number> = { high: 3, medium: 2, low: 1 }
const MAX_NAME_LENGTH = 100
const MAX_STUDENT_ID_LENGTH = 20
const MAX_NOTES_LENGTH = 200

const nowTime = () => new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })

/** Unique, sequential ticket IDs (TICK-103, TICK-104, ...) instead of random 3-digit numbers that can collide. */
function nextTicketId(): string {
  const used = [...store.tickets, ...store.history]
    .map((t) => Number(/^TICK-(\d+)$/.exec(t.id)?.[1]))
    .filter((n) => !Number.isNaN(n))
  return `TICK-${Math.max(100, ...used) + 1}`
}

/**
 * Single source of truth for queue order and wait times.
 *  - the ticket being served stays at position 1
 *  - waiting tickets are ordered by priority (high > medium > low)
 *  - equal priority keeps arrival order (FIFO): Array.sort is stable and store.tickets is in arrival order
 *  - wait time = (position - 1) x service duration
 */
function recalculateQueue(serviceId: number): void {
  const service = store.services.find((s) => s.id === serviceId)
  const duration = service ? service.duration : 15
  const rank = (t: Ticket) => PRIORITY_RANK[t.priority ?? service?.priority ?? 'low'] ?? 1

  const inProgress = store.tickets.filter((t) => t.serviceId === serviceId && t.status === 'in_progress')
  const waiting = store.tickets
    .filter((t) => t.serviceId === serviceId && t.status === 'waiting')
    .sort((a, b) => rank(b) - rank(a))

  let position = 1
  inProgress.forEach((t) => {
    t.position = position++
    t.estimatedWait = 0
  })
  waiting.forEach((t) => {
    t.position = position++
    t.estimatedWait = Math.max(0, (t.position - 1) * duration)
  })
}

// ---------- Routes ----------

// GET /api/queue - List all active tickets
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: store.tickets
  })
})

// GET /api/queue/status/:ticketId - Look up one ticket (added: used by the Queue Status screen)
router.get('/status/:ticketId', (req: Request, res: Response) => {
  const ticket = store.tickets.find((t) => t.id === req.params.ticketId)
  if (!ticket) {
    res.status(404).json({ success: false, error: 'Ticket not found.' })
    return
  }
  res.status(200).json({ success: true, data: ticket })
})

// GET /api/queue/:serviceId - Get queue for specific service
router.get('/:serviceId', (req: Request, res: Response) => {
  const serviceId = Number(req.params.serviceId)
  const serviceQueue = store.tickets
    .filter((t) => t.serviceId === serviceId && (t.status === 'waiting' || t.status === 'in_progress'))
    .sort((a, b) => a.position - b.position)

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

  if (priority !== undefined && !(priority in PRIORITY_RANK)) {
    errors.priority = 'Priority must be "low", "medium", or "high".'
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({ success: false, error: 'Validation failed.', details: errors })
    return
  }

  const targetService = store.services.find((s) => s.id === Number(serviceId))
  if (!targetService) {
    res.status(404).json({ success: false, error: 'Service not found.' })
    return
  }

  if (!targetService.isOpen) {
    res.status(400).json({ success: false, error: 'Cannot join queue: Service is currently closed.' })
    return
  }

  const newTicket: Ticket = {
    id: nextTicketId(),
    serviceId: targetService.id,
    serviceName: targetService.name,
    userName: userName.trim(),
    studentId: studentId.trim(),
    notes: notes.trim(),
    position: 0, // set by recalculateQueue
    status: 'waiting',
    estimatedWait: 0, // set by recalculateQueue: (position - 1) * service.duration
    priority: priority ?? targetService.priority,
    createdAt: nowTime()
  }

  store.tickets.push(newTicket)
  recalculateQueue(targetService.id)

  // Dispatch notification
  store.notifications.unshift({
    id: `notif-${Date.now()}`,
    message: `You joined queue for ${targetService.name}! Ticket #${newTicket.id} (Position #${newTicket.position}).`,
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

  const index = store.tickets.findIndex((t) => t.id === ticketId)
  if (index === -1) {
    res.status(404).json({ success: false, error: 'Ticket not found in active queue.' })
    return
  }

  const [removed] = store.tickets.splice(index, 1)
  removed.status = 'cancelled'
  store.history.unshift(removed)

  // Re-calculate positions and waits for everyone still in that service's queue
  recalculateQueue(removed.serviceId)

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

  const serviceQueue = store.tickets.filter(
    (t) => t.serviceId === sId && (t.status === 'waiting' || t.status === 'in_progress')
  )

  if (serviceQueue.length === 0) {
    res.status(400).json({ success: false, error: 'No students currently waiting in this service queue.' })
    return
  }

  // Complete any current in-progress ticket
  const currentInProgressIndex = store.tickets.findIndex((t) => t.serviceId === sId && t.status === 'in_progress')
  if (currentInProgressIndex !== -1) {
    const [completed] = store.tickets.splice(currentInProgressIndex, 1)
    completed.status = 'completed'
    completed.completedAt = nowTime()
    store.history.unshift(completed)
  }

  // Advance the front of the line (lowest position = highest priority, then earliest arrival)
  const nextWaiting = store.tickets
    .filter((t) => t.serviceId === sId && t.status === 'waiting')
    .sort((a, b) => a.position - b.position)[0]

  if (nextWaiting) {
    nextWaiting.status = 'in_progress'
    recalculateQueue(sId) // gives the served ticket position 1 and re-numbers everyone behind it

    // Trigger notification
    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      message: `Now serving ${nextWaiting.userName} (Ticket #${nextWaiting.id})!`,
      type: 'info',
      timestamp: nowTime()
    })

    res.status(200).json({
      success: true,
      message: `Now serving ${nextWaiting.userName}.`,
      data: nextWaiting
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
