import { Router, Request, Response } from 'express'
import { store } from '../data/memoryStore'
import { CreateServiceDTO, Priority, Service } from '../types/service'

const router = Router()

// GET /api/services - List all services
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: store.services
  })
})

// POST /api/services - Create new service (Chuka)
router.post('/', (req: Request, res: Response) => {
  const { name, description, duration, priority }: CreateServiceDTO = req.body

  const errors: Record<string, string> = {}
  if (!name || typeof name !== 'string' || !name.trim()) {
    errors.name = 'Service name is required.'
  } else if (name.trim().length > 100) {
    errors.name = 'Service name must not exceed 100 characters.'
  }

  if (!description || typeof description !== 'string' || !description.trim()) {
    errors.description = 'Service description is required.'
  }

  const numDuration = Number(duration)
  if (!duration || isNaN(numDuration) || numDuration < 1) {
    errors.duration = 'Expected duration must be a positive integer (minimum 1 minute).'
  }

  if (!priority || !['low', 'medium', 'high'].includes(priority)) {
    errors.priority = 'Priority must be either "low", "medium", or "high".'
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed.',
      details: errors
    })
    return
  }

  const newService: Service = {
    id: Date.now(),
    name: name.trim(),
    description: description.trim(),
    duration: numDuration,
    priority: priority as Priority,
    isOpen: true,
    createdAt: new Date().toISOString()
  }

  store.services.push(newService)
  res.status(201).json({
    success: true,
    message: 'Service successfully created.',
    data: newService
  })
})

// PATCH /api/services/:id/toggle - Open/Close service queue
router.patch('/:id/toggle', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id)
  const service = store.services.find((s) => s.id === serviceId)

  if (!service) {
    res.status(404).json({ success: false, error: 'Service not found.' })
    return
  }

  service.isOpen = !service.isOpen
  res.status(200).json({
    success: true,
    message: `Service "${service.name}" queue is now ${service.isOpen ? 'OPEN' : 'CLOSED'}.`,
    data: service
  })
})

// DELETE /api/services/:id
router.delete('/:id', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id)
  const index = store.services.findIndex((s) => s.id === serviceId)

  if (index === -1) {
    res.status(404).json({ success: false, error: 'Service not found.' })
    return
  }

  const removed = store.services.splice(index, 1)[0]
  res.status(200).json({
    success: true,
    message: `Service "${removed.name}" deleted successfully.`
  })
})

export default router
