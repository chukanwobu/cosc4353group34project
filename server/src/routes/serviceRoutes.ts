import { getDb } from '../db/database'
import { Router, Request, Response } from 'express'

import {
  getAllServices,
  getServiceById,
  createService,
  updateService,
  deleteService
} from '../db/serviceRepository'
import { CreateServiceDTO } from '../types/service'

const router = Router()

// GET /api/services - Retrieve services from SQLite
router.get('/', (_req: Request, res: Response) => {
  res.status(200).json({
    success: true,
    data: getAllServices()
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

  const numDuration = duration

  if (
    typeof duration !== 'number' ||
    !Number.isInteger(duration) ||
    duration < 1
  ) {
    errors.duration =
      'Expected duration must be a positive integer (minimum 1 minute).'
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

  try {
  const newService = createService({
    name: name.trim(),
    description: description.trim(),
    duration: numDuration,
    priority
  })

  res.status(201).json({
    success: true,
    message: 'Service successfully created.',
    data: newService
  })
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes('UNIQUE constraint failed')
  ) {
    res.status(409).json({
      success: false,
      error: 'A service with this name already exists.'
    })
    return
  }

  console.error('Failed to create service:', error)
  res.status(500).json({
    success: false,
    error: 'Failed to create service.'
  })
}
})

// PATCH /api/services/:id/toggle - Open/Close service queue

router.patch('/:id/toggle', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id)
  const service = getServiceById(serviceId)

  if (!service) {
    res.status(404).json({
      success: false,
      error: 'Service not found.'
    })
    return
  }

  try {
    const db = getDb()
    const newStatus = service.isOpen ? 0 : 1

    const toggleTransaction = db.transaction(() => {
      db.prepare(`
        UPDATE Service
        SET is_open = ?
        WHERE service_id = ?
      `).run(newStatus, serviceId)

      db.prepare(`
        UPDATE Queue
        SET status = ?
        WHERE service_id = ?
      `).run(newStatus ? 'open' : 'closed', serviceId)
    })

    toggleTransaction()

    const updatedService = getServiceById(serviceId)

    res.status(200).json({
      success: true,
      message: `Service "${service.name}" queue is now ${newStatus ? 'OPEN' : 'CLOSED'}.`,
      data: updatedService
    })
  } catch (error) {
    console.error('Failed to toggle service:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to toggle service.'
    })
  }
})



// PUT /api/services/:id - Update an existing service
router.put('/:id', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id)

  const service = getServiceById(serviceId)

  if (!service) {
    res.status(404).json({
      success: false,
      error: 'Service not found.'
    })
    return
  }

  const { name, description, duration, priority } = req.body ?? {}

  const errors: Record<string, string> = {}

  if (typeof name !== 'string' || !name.trim()) {
    errors.name = 'Service name is required.'
  } else if (name.trim().length > 100) {
    errors.name = 'Service name must not exceed 100 characters.'
  }

  if (typeof description !== 'string' || !description.trim()) {
    errors.description = 'Service description is required.'
  }

  if (
    typeof duration !== 'number' ||
    !Number.isInteger(duration) ||
    duration < 1
  ) {
    errors.duration = 'Duration must be a positive integer.'
  }

  if (!['low', 'medium', 'high'].includes(priority)) {
    errors.priority = 'Invalid priority level.'
  }

  if (Object.keys(errors).length > 0) {
    res.status(400).json({
      success: false,
      error: 'Validation failed.',
      details: errors
    })
    return
  }

  
try {
  const updatedService = updateService(serviceId, {
    name: name.trim(),
    description: description.trim(),
    duration,
    priority
  })

  res.status(200).json({
    success: true,
    message: 'Service successfully updated.',
    data: updatedService
  })
} catch (error) {
  if (
    error instanceof Error &&
    error.message.includes('UNIQUE constraint failed')
  ) {
    res.status(409).json({
      success: false,
      error: 'A service with this name already exists.'
    })
    return
  }

  console.error('Failed to update service:', error)
  res.status(500).json({
    success: false,
    error: 'Failed to update service.'
  })
}
})



// DELETE /api/services/:id
router.delete('/:id', (req: Request, res: Response) => {
  const serviceId = Number(req.params.id)
  const service = getServiceById(serviceId)

  if (!service) {
    res.status(404).json({
      success: false,
      error: 'Service not found.'
    })
    return
  }

  try {
    deleteService(serviceId)

    res.status(200).json({
      success: true,
      message: `Service "${service.name}" deleted successfully.`
    })
  } catch (error) {
    console.error('Failed to delete service:', error)
    res.status(500).json({
      success: false,
      error: 'Failed to delete service.'
    })
  }
})


export default router
