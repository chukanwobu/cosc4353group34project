import { Router, Request, Response } from 'express'
import { store } from '../data/memoryStore'
import { JoinQueueDTO, Ticket } from '../types/queue'

const router = Router()

// GET /api/queue - List all active tickets
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: store.tickets
  })
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
  const { serviceId, userName, studentId, notes }: JoinQueueDTO = req.body

  const errors: Record<string, string> = {}
  if (!serviceId) errors.serviceId = 'Service ID is required.'
  if (!userName || typeof userName !== 'string' || !userName.trim()) errors.userName = 'Full name is required.'
  if (!studentId || typeof studentId !== 'string' || !studentId.trim()) errors.studentId = 'Student ID is required.'
  if (!notes || typeof notes !== 'string' || !notes.trim()) {
    errors.notes = 'Reason for visit is required.'
  } else if (notes.length > 200) {
    errors.notes = 'Reason for visit must not exceed 200 characters.'
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

  const existingQueue = store.tickets.filter(
    (t) => t.serviceId === targetService.id && (t.status === 'waiting' || t.status === 'in_progress')
  )

  const position = existingQueue.length + 1
  // Wait-time estimation formula: (position - 1) * service.duration
  const estimatedWait = Math.max(0, (position - 1) * targetService.duration)

  const newTicket: Ticket = {
    id: `TICK-${Math.floor(100 + Math.random() * 900)}`,
    serviceId: targetService.id,
    serviceName: targetService.name,
    userName: userName.trim(),
    studentId: studentId.trim(),
    notes: notes.trim(),
    position,
    status: 'waiting',
    estimatedWait,
    createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  }

  store.tickets.push(newTicket)

  // Dispatch notification
  store.notifications.unshift({
    id: `notif-${Date.now()}`,
    message: `You joined queue for ${targetService.name}! Ticket #${newTicket.id} (Position #${position}).`,
    type: 'success',
    timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
  })

  res.status(201).json({
    success: true,
    message: 'Successfully joined queue.',
    data: newTicket
  })
})

// POST /api/queue/leave - Leave a queue line
router.post('/leave', (req: Request, res: Response) => {
  const { ticketId } = req.body

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

  // Re-calculate positions for remaining tickets in same service
  const service = store.services.find((s) => s.id === removed.serviceId)
  const duration = service ? service.duration : 15

  store.tickets
    .filter((t) => t.serviceId === removed.serviceId && t.position > removed.position)
    .forEach((t) => {
      t.position -= 1
      t.estimatedWait = Math.max(0, (t.position - 1) * duration)
    })

  res.status(200).json({
    success: true,
    message: `Left queue for ticket #${ticketId}.`,
    data: removed
  })
})

// POST /api/queue/serve-next - Serve next waiting student (Luis)
router.post('/serve-next', (req: Request, res: Response) => {
  const { serviceId } = req.body
  const sId = Number(serviceId)

  const serviceQueue = store.tickets
    .filter((t) => t.serviceId === sId && (t.status === 'waiting' || t.status === 'in_progress'))
    .sort((a, b) => a.position - b.position)

  if (serviceQueue.length === 0) {
    res.status(400).json({ success: false, error: 'No students currently waiting in this service queue.' })
    return
  }

  // Complete any current in-progress ticket
  const currentInProgressIndex = store.tickets.findIndex((t) => t.serviceId === sId && t.status === 'in_progress')
  if (currentInProgressIndex !== -1) {
    const [completed] = store.tickets.splice(currentInProgressIndex, 1)
    completed.status = 'completed'
    completed.completedAt = new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
    store.history.unshift(completed)
  }

  // Advance next waiting ticket
  const nextWaiting = store.tickets.find((t) => t.serviceId === sId && t.status === 'waiting')
  if (nextWaiting) {
    nextWaiting.status = 'in_progress'
    nextWaiting.position = 1
    nextWaiting.estimatedWait = 0

    // Adjust downstream positions
    const service = store.services.find((s) => s.id === sId)
    const duration = service ? service.duration : 15

    store.tickets
      .filter((t) => t.serviceId === sId && t.id !== nextWaiting.id && t.status === 'waiting')
      .forEach((t) => {
        t.position -= 1
        t.estimatedWait = Math.max(0, (t.position - 1) * duration)
      })

    // Trigger notification
    store.notifications.unshift({
      id: `notif-${Date.now()}`,
      message: `Now serving ${nextWaiting.userName} (Ticket #${nextWaiting.id})!`,
      type: 'info',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
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
