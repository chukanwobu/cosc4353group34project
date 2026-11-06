import { getDb, Db } from './database'
import { PriorityLevel, Ticket, TicketStatus } from '../types/queue'

/**
 * Queue + QueueEntry persistence layer (A4).
 *
 * Rules implemented in SQL:
 *  - one Queue row per Service (queue_id = "q-<service_id>"), created on demand
 *  - ordering: the ticket being served is first, then waiting tickets by priority (high > medium > low),
 *    and equal priority keeps arrival order (FIFO). Arrival order uses SQLite's rowid, which only ever grows,
 *    because join_time (CURRENT_TIMESTAMP) only has 1-second resolution.
 *  - wait time = (position - 1) x service duration, 0 for the ticket being served
 *  - every write that changes order runs inside one IMMEDIATE transaction (atomic, no duplicate positions)
 *
 * DB statuses: waiting | in_progress | served | canceled
 * API statuses (unchanged from A3): waiting | in_progress | completed | cancelled
 */

// ---------- Errors the routes translate into HTTP codes ----------

export class QueueError extends Error {
  constructor(
    public readonly code: 'SERVICE_NOT_FOUND' | 'SERVICE_CLOSED' | 'TICKET_NOT_FOUND' | 'EMPTY_QUEUE' | 'UNKNOWN_USER',
    message: string
  ) {
    super(message)
    this.name = 'QueueError'
  }
}

// ---------- Types ----------

export interface JoinInput {
  serviceId: number
  userName: string
  studentId: string
  notes: string
  priority?: PriorityLevel
  userId?: string
}

interface EntryRow {
  entry_id: string
  queue_id: string
  service_id: number
  service_name: string
  user_id: string | null
  user_name: string
  student_id: string
  notes: string | null
  position: number
  join_time: string
  priority: PriorityLevel
  status: 'waiting' | 'in_progress' | 'served' | 'canceled'
  estimated_wait: number
}

interface ServiceRow {
  service_id: number
  name: string
  duration: number
  priority: PriorityLevel
  is_open: number
}

// ---------- Mapping helpers ----------

/** SQL fragment: numeric rank for ordering (high first). Safe constant, no user input. */
const PRIORITY_RANK_SQL = `CASE priority WHEN 'high' THEN 3 WHEN 'medium' THEN 2 ELSE 1 END`

const SELECT_ENTRY = `
  SELECT e.entry_id, e.queue_id, e.service_id, s.name AS service_name, e.user_id, e.user_name, e.student_id,
         e.notes, e.position, e.join_time, e.priority, e.status, e.estimated_wait
  FROM QueueEntry e
  JOIN Service s ON s.service_id = e.service_id`

const API_STATUS: Record<EntryRow['status'], TicketStatus> = {
  waiting: 'waiting',
  in_progress: 'in_progress',
  served: 'completed',
  canceled: 'cancelled'
}

/** "2026-11-04 10:15:00" (UTC, from CURRENT_TIMESTAMP) -> "10:15 AM" in the server's locale, like A3. */
function displayTime(joinTime: string): string {
  const d = new Date(joinTime.replace(' ', 'T') + 'Z')
  if (Number.isNaN(d.getTime())) return joinTime
  return d.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
}

function toTicket(row: EntryRow): Ticket {
  return {
    id: row.entry_id,
    serviceId: row.service_id,
    serviceName: row.service_name,
    userName: row.user_name,
    studentId: row.student_id,
    notes: row.notes ?? '',
    position: row.position,
    status: API_STATUS[row.status],
    estimatedWait: row.estimated_wait,
    priority: row.priority,
    createdAt: displayTime(row.join_time)
  }
}

// ---------- Core (internal) ----------

function queueIdFor(serviceId: number): string {
  return `q-${serviceId}`
}

/** Get (or lazily create) the single Queue row for a service. Keeps Queue.status in sync with Service.is_open. */
function ensureQueue(db: Db, service: ServiceRow): string {
  const queueId = queueIdFor(service.service_id)
  const wanted = service.is_open ? 'open' : 'closed'
  db.prepare('INSERT OR IGNORE INTO Queue (queue_id, service_id, status) VALUES (?, ?, ?)').run(
    queueId,
    service.service_id,
    wanted
  )
  db.prepare('UPDATE Queue SET status = ? WHERE queue_id = ? AND status <> ?').run(wanted, queueId, wanted)
  return queueId
}

function getServiceRow(db: Db, serviceId: number): ServiceRow | undefined {
  return db
    .prepare('SELECT service_id, name, duration, priority, is_open FROM Service WHERE service_id = ?')
    .get(serviceId) as ServiceRow | undefined
}

/** Next sequential ticket id (TICK-103, ...). Called inside the write transaction, so it cannot collide. */
function nextTicketId(db: Db): string {
  const row = db
    .prepare(
      `SELECT COALESCE(MAX(CAST(SUBSTR(entry_id, 6) AS INTEGER)), 100) AS max_id
       FROM QueueEntry WHERE entry_id GLOB 'TICK-[0-9]*'`
    )
    .get() as { max_id: number }
  return `TICK-${row.max_id + 1}`
}

/**
 * Single source of truth for order and wait time of ONE queue, done in a single SQL statement:
 * rank active entries (in_progress first, then priority, then arrival) and write position + estimated_wait.
 */
function recalculatePositions(db: Db, queueId: string): void {
  db.prepare(
    `WITH ranked AS (
       SELECT entry_id,
              ROW_NUMBER() OVER (
                ORDER BY CASE status WHEN 'in_progress' THEN 0 ELSE 1 END,
                         ${PRIORITY_RANK_SQL} DESC,
                         rowid ASC
              ) AS rn
       FROM QueueEntry
       WHERE queue_id = @queueId AND status IN ('waiting', 'in_progress')
     )
     UPDATE QueueEntry
     SET position = ranked.rn,
         estimated_wait = CASE
           WHEN QueueEntry.status = 'in_progress' THEN 0
           ELSE MAX(0, (ranked.rn - 1) * (SELECT duration FROM Service WHERE service_id = QueueEntry.service_id))
         END
     FROM ranked
     WHERE QueueEntry.entry_id = ranked.entry_id`
  ).run({ queueId })
}

function findTicket(db: Db, ticketId: string): Ticket | undefined {
  const row = db.prepare(`${SELECT_ENTRY} WHERE e.entry_id = ?`).get(ticketId) as EntryRow | undefined
  return row ? toTicket(row) : undefined
}

// ---------- Service bridge (temporary) ----------

export interface ServiceSnapshot {
  id: number
  name: string
  description: string
  duration: number
  priority: PriorityLevel
  isOpen: boolean
}

/**
 * TEMPORARY: services are still managed in the in-memory store (/api/services). Joining mirrors the service into the
 * Service table first, so the QueueEntry foreign key, the wait-time math and the open/closed check use current data.
 * Upsert (never REPLACE), so existing queue rows are not cascade-deleted. Remove once /api/services is SQL-backed.
 */
export function syncService(svc: ServiceSnapshot, db: Db = getDb()): void {
  try {
    db.prepare(
      `INSERT INTO Service (service_id, name, description, duration, priority, is_open)
       VALUES (@id, @name, @description, @duration, @priority, @isOpen)
       ON CONFLICT(service_id) DO UPDATE SET
         name = excluded.name, description = excluded.description, duration = excluded.duration,
         priority = excluded.priority, is_open = excluded.is_open`
    ).run({
      id: svc.id,
      name: svc.name,
      description: svc.description,
      duration: svc.duration,
      priority: svc.priority,
      isOpen: svc.isOpen ? 1 : 0
    })
  } catch (err) {
    // Another row already owns this (UNIQUE) name: keep what the DB has rather than failing the join.
    if (!(err instanceof Error) || !/UNIQUE constraint failed: Service\.name/.test(err.message)) throw err
  }
}

// ---------- Public API ----------

/** All active (waiting / in_progress) tickets, grouped by service then position. */
export function listActiveTickets(db: Db = getDb()): Ticket[] {
  const rows = db
    .prepare(
      `${SELECT_ENTRY}
       WHERE e.status IN ('waiting', 'in_progress')
       ORDER BY e.service_id, e.position`
    )
    .all() as EntryRow[]
  return rows.map(toTicket)
}

/** Active tickets for one service in position order. */
export function listQueueForService(serviceId: number, db: Db = getDb()): Ticket[] {
  const rows = db
    .prepare(
      `${SELECT_ENTRY}
       WHERE e.service_id = ? AND e.status IN ('waiting', 'in_progress')
       ORDER BY e.position`
    )
    .all(serviceId) as EntryRow[]
  return rows.map(toTicket)
}

/** One ticket (any status), or undefined. */
export function getTicket(ticketId: string, db: Db = getDb()): Ticket | undefined {
  return findTicket(db, ticketId)
}

/** Finished tickets (completed / cancelled), most recently joined first. Optionally limited to one user. */
export function listHistory(userId?: string, db: Db = getDb()): Ticket[] {
  const sql = `${SELECT_ENTRY}
    WHERE e.status IN ('served', 'canceled') ${userId ? 'AND e.user_id = ?' : ''}
    ORDER BY e.rowid DESC`
  const rows = (userId ? db.prepare(sql).all(userId) : db.prepare(sql).all()) as EntryRow[]
  return rows.map(toTicket)
}

/** Number of people ahead of a would-be new entry and the resulting wait, without writing anything. */
export function estimateWait(serviceId: number, db: Db = getDb()): { ahead: number; estimatedWait: number } {
  const service = getServiceRow(db, serviceId)
  if (!service) throw new QueueError('SERVICE_NOT_FOUND', 'Service not found.')
  const { n } = db
    .prepare(`SELECT COUNT(*) AS n FROM QueueEntry WHERE service_id = ? AND status IN ('waiting', 'in_progress')`)
    .get(serviceId) as { n: number }
  return { ahead: n, estimatedWait: n * service.duration }
}

/**
 * Join a service queue. Atomic: id generation, insert and re-ranking happen in one IMMEDIATE transaction.
 * Throws QueueError for unknown/closed service or unknown user.
 */
export function joinQueue(input: JoinInput, db: Db = getDb()): Ticket {
  const run = db.transaction((): Ticket => {
    const service = getServiceRow(db, input.serviceId)
    if (!service) throw new QueueError('SERVICE_NOT_FOUND', 'Service not found.')
    if (!service.is_open) throw new QueueError('SERVICE_CLOSED', 'Cannot join queue: Service is currently closed.')

    if (input.userId) {
      const user = db.prepare('SELECT 1 AS ok FROM UserCredentials WHERE user_id = ?').get(input.userId)
      if (!user) throw new QueueError('UNKNOWN_USER', 'User not found.')
    }

    const queueId = ensureQueue(db, service)
    const entryId = nextTicketId(db)

    db.prepare(
      `INSERT INTO QueueEntry
         (entry_id, queue_id, service_id, user_id, user_name, student_id, notes, position, priority, status, estimated_wait)
       VALUES (@entryId, @queueId, @serviceId, @userId, @userName, @studentId, @notes, 0, @priority, 'waiting', 0)`
    ).run({
      entryId,
      queueId,
      serviceId: service.service_id,
      userId: input.userId ?? null,
      userName: input.userName.trim(),
      studentId: input.studentId.trim(),
      notes: input.notes.trim(),
      priority: input.priority ?? service.priority
    })

    recalculatePositions(db, queueId)
    return findTicket(db, entryId)!
  })
  return run.immediate()
}

/**
 * Leave the queue (waiting -> canceled, or in_progress -> canceled). Positions behind it move up.
 * Throws TICKET_NOT_FOUND when the ticket does not exist or is already finished.
 */
export function leaveQueue(ticketId: string, db: Db = getDb()): Ticket {
  const run = db.transaction((): Ticket => {
    const row = db
      .prepare(`SELECT queue_id FROM QueueEntry WHERE entry_id = ? AND status IN ('waiting', 'in_progress')`)
      .get(ticketId) as { queue_id: string } | undefined
    if (!row) throw new QueueError('TICKET_NOT_FOUND', 'Ticket not found in active queue.')

    db.prepare(`UPDATE QueueEntry SET status = 'canceled', position = 0, estimated_wait = 0 WHERE entry_id = ?`).run(ticketId)
    recalculatePositions(db, row.queue_id)
    return findTicket(db, ticketId)!
  })
  return run.immediate()
}

export interface ServeResult {
  /** the ticket now being served, or null when the line is finished */
  serving: Ticket | null
  /** the ticket that was completed by this call, if any */
  completed: Ticket | null
}

/**
 * Serve the next student. Atomic: completes the ticket currently in progress (in_progress -> served),
 * promotes the front waiting ticket (waiting -> in_progress), and re-ranks everyone else.
 * Throws EMPTY_QUEUE when nobody is waiting or in progress.
 */
export function serveNext(serviceId: number, db: Db = getDb()): ServeResult {
  const run = db.transaction((): ServeResult => {
    const service = getServiceRow(db, serviceId)
    const queueId = queueIdFor(serviceId)

    const active = db
      .prepare(`SELECT COUNT(*) AS n FROM QueueEntry WHERE queue_id = ? AND status IN ('waiting', 'in_progress')`)
      .get(queueId) as { n: number }
    if (!service || active.n === 0) {
      throw new QueueError('EMPTY_QUEUE', 'No students currently waiting in this service queue.')
    }

    const current = db
      .prepare(`SELECT entry_id FROM QueueEntry WHERE queue_id = ? AND status = 'in_progress'`)
      .get(queueId) as { entry_id: string } | undefined
    if (current) {
      db.prepare(`UPDATE QueueEntry SET status = 'served', position = 0, estimated_wait = 0 WHERE entry_id = ?`).run(
        current.entry_id
      )
    }

    // Front of the line = lowest position among waiting entries (priority, then arrival)
    recalculatePositions(db, queueId)
    const next = db
      .prepare(`SELECT entry_id FROM QueueEntry WHERE queue_id = ? AND status = 'waiting' ORDER BY position LIMIT 1`)
      .get(queueId) as { entry_id: string } | undefined

    if (next) {
      db.prepare(`UPDATE QueueEntry SET status = 'in_progress' WHERE entry_id = ?`).run(next.entry_id)
      recalculatePositions(db, queueId)
    }

    return {
      completed: current ? findTicket(db, current.entry_id)! : null,
      serving: next ? findTicket(db, next.entry_id)! : null
    }
  })
  return run.immediate()
}
