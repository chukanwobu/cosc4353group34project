
import { getDb } from './database'
import type { CreateServiceDTO, Service } from '../types/service'

type ServiceRow = {
  service_id: number
  name: string
  description: string
  duration: number
  priority: Service['priority']
  is_open: number
  created_at: string
}

function toService(row: ServiceRow): Service {
  return {
    id: row.service_id,
    name: row.name,
    description: row.description,
    duration: row.duration,
    priority: row.priority,
    isOpen: row.is_open === 1,
    createdAt: row.created_at,
  }
}

export function getAllServices(): Service[] {
  const db = getDb()

  const rows = db.prepare(`
    SELECT * FROM Service
    ORDER BY service_id ASC
  `).all() as ServiceRow[]

  return rows.map(toService)
}

export function getServiceById(id: number): Service | null {
  const db = getDb()

  const row = db.prepare(`
    SELECT * FROM Service
    WHERE service_id = ?
  `).get(id) as ServiceRow | undefined

  return row ? toService(row) : null
}

export function createService(data: CreateServiceDTO): Service {
  const db = getDb()

  const result = db.prepare(`
    INSERT INTO Service (name, description, duration, priority)
    VALUES (?, ?, ?, ?)
  `).run(
    data.name,
    data.description,
    data.duration,
    data.priority
  )

  return getServiceById(Number(result.lastInsertRowid))!
}

export function updateService(
  id: number,
  data: CreateServiceDTO
): Service | null {
  const db = getDb()

  const result = db.prepare(`
    UPDATE Service
    SET name = ?, description = ?, duration = ?, priority = ?
    WHERE service_id = ?
  `).run(
    data.name,
    data.description,
    data.duration,
    data.priority,
    id
  )

  if (result.changes === 0) return null

  return getServiceById(id)
}

export function deleteService(id: number): boolean {
  const db = getDb()

  const result = db.prepare(`
    DELETE FROM Service
    WHERE service_id = ?
  `).run(id)

  return result.changes > 0
}
