import { describe, it, expect, beforeEach } from 'vitest'
import Database from 'better-sqlite3'
import { getDb, resetDatabase, seedDatabase, initializeSchema, Db } from '../src/db/database'
import {
  joinQueue,
  leaveQueue,
  serveNext,
  listActiveTickets,
  listQueueForService,
  listHistory,
  getTicket,
  estimateWait,
  syncService,
  QueueError
} from '../src/db/queueRepository'

// Clean seeded database per test (services 1-4, TICK-101 in progress, TICK-102 waiting, TICK-098 served).
// Under Vitest the shared connection is in-memory, so nothing touches queuesmart.db.
let db: Db
beforeEach(() => {
  resetDatabase()
  db = getDb()
})

const base = { serviceId: 2, userName: 'Test User', studentId: 'S100', notes: 'Need help' } // service 2: 20 min, medium
const join = (over: object = {}) => joinQueue({ ...base, ...over }, db)
const ids = (rows: { id: string }[]) => rows.map((r) => r.id)
const sqlError = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    return (e as Error).message
  }
  return null
}
const errorCode = (fn: () => unknown) => {
  try {
    fn()
  } catch (e) {
    return e instanceof QueueError ? e.code : 'OTHER'
  }
  return null
}

const insertUser = (id = 'u-1') =>
  db.prepare(`INSERT INTO UserCredentials (user_id, email, password_hash, role) VALUES (?, ?, 'hash', 'user')`).run(id, `${id}@x.com`)

const rawEntry = (over: Record<string, unknown> = {}) => {
  const row = {
    entry_id: 'RAW-1', queue_id: 'q-2', service_id: 2, user_name: 'Raw', student_id: 'S1', notes: 'n',
    position: 1, priority: 'low', status: 'waiting', estimated_wait: 0, ...over
  }
  return db
    .prepare(
      `INSERT INTO QueueEntry (entry_id, queue_id, service_id, user_name, student_id, notes, position, priority, status, estimated_wait)
       VALUES (@entry_id, @queue_id, @service_id, @user_name, @student_id, @notes, @position, @priority, @status, @estimated_wait)`
    )
    .run(row)
}

describe('schema and database-level constraints', () => {
  it('creates all six tables and the queue/notification indexes', () => {
    const tables = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'table' AND name NOT LIKE 'sqlite_%'`).all() as { name: string }[]
    expect(tables.map((t) => t.name).sort()).toEqual(
      ['NotificationHistory', 'Queue', 'QueueEntry', 'Service', 'UserCredentials', 'UserProfile']
    )
    const indexes = db.prepare(`SELECT name FROM sqlite_master WHERE type = 'index' AND name LIKE 'idx_%'`).all() as { name: string }[]
    expect(indexes.map((i) => i.name)).toEqual(expect.arrayContaining(['idx_notification_user', 'idx_queue_entry_status']))
  })

  it('enforces foreign keys', () => {
    expect(db.pragma('foreign_keys', { simple: true })).toBe(1)
  })

  it('rejects notes longer than 200 characters', () => {
    expect(sqlError(() => rawEntry({ notes: 'x'.repeat(201) }))).toMatch(/CHECK constraint failed/)
    expect(sqlError(() => rawEntry({ notes: 'x'.repeat(200) }))).toBeNull()
  })

  it('rejects an invalid entry status and an invalid priority', () => {
    expect(sqlError(() => rawEntry({ status: 'done' }))).toMatch(/CHECK constraint failed/)
    expect(sqlError(() => rawEntry({ priority: 'urgent' }))).toMatch(/CHECK constraint failed/)
  })

  it('accepts every status in the lifecycle', () => {
    for (const [i, status] of ['waiting', 'in_progress', 'served', 'canceled'].entries()) {
      expect(sqlError(() => rawEntry({ entry_id: `RAW-${i}`, status }))).toBeNull()
    }
  })

  it('rejects an invalid queue status', () => {
    expect(sqlError(() => db.prepare(`INSERT INTO Queue (queue_id, service_id, status) VALUES ('q-X', 1, 'paused')`).run())).toMatch(
      /CHECK constraint failed/
    )
  })

  it('rejects entries that point at a missing queue, service or user', () => {
    expect(sqlError(() => rawEntry({ queue_id: 'q-NOPE' }))).toMatch(/FOREIGN KEY/)
    expect(sqlError(() => rawEntry({ service_id: 999 }))).toMatch(/FOREIGN KEY/)
    expect(sqlError(() => db.prepare(`UPDATE QueueEntry SET user_id = 'ghost' WHERE entry_id = 'TICK-102'`).run())).toMatch(/FOREIGN KEY/)
  })

  it('rejects a duplicate entry id', () => {
    expect(sqlError(() => rawEntry({ entry_id: 'TICK-101' }))).toMatch(/UNIQUE|PRIMARY KEY/)
  })
})

describe('cascades', () => {
  it('deleting a service removes its queue and tickets', () => {
    db.prepare('DELETE FROM Service WHERE service_id = 1').run()
    expect(db.prepare(`SELECT COUNT(*) AS n FROM Queue WHERE service_id = 1`).get()).toEqual({ n: 0 })
    expect(db.prepare(`SELECT COUNT(*) AS n FROM QueueEntry WHERE service_id = 1`).get()).toEqual({ n: 0 })
    expect(getTicket('TICK-101', db)).toBeUndefined()
  })

  it('deleting a queue removes its tickets but not the service', () => {
    db.prepare(`DELETE FROM Queue WHERE queue_id = 'q-1'`).run()
    expect(listQueueForService(1, db)).toEqual([])
    expect(db.prepare(`SELECT COUNT(*) AS n FROM Service WHERE service_id = 1`).get()).toEqual({ n: 1 })
  })

  it('deleting a user keeps the ticket but clears user_id (ON DELETE SET NULL)', () => {
    insertUser('u-9')
    const t = join({ userId: 'u-9' })
    db.prepare(`DELETE FROM UserCredentials WHERE user_id = 'u-9'`).run()
    const row = db.prepare('SELECT user_id FROM QueueEntry WHERE entry_id = ?').get(t.id) as { user_id: string | null }
    expect(row.user_id).toBeNull()
    expect(getTicket(t.id, db)).toBeDefined()
  })
})

describe('joinQueue', () => {
  it('puts the first person at position 1 with 0 wait', () => {
    expect(join()).toMatchObject({ id: 'TICK-103', position: 1, estimatedWait: 0, status: 'waiting', serviceName: 'Financial Aid & Scholarships' })
  })

  it('computes wait as (position - 1) x service duration', () => {
    expect(join({ serviceId: 1 })).toMatchObject({ position: 3, estimatedWait: 30 }) // behind 101 + 102, 15 min each
    join()
    expect(join({ studentId: 'S2' })).toMatchObject({ position: 2, estimatedWait: 20 })
  })

  it('keeps first-come-first-served order at equal priority, even inside the same second', () => {
    const made = Array.from({ length: 12 }, (_, i) => join({ serviceId: 3, studentId: `S${i}` }))
    expect(made.map((t) => t.position)).toEqual([1, 2, 3, 4, 5, 6, 7, 8, 9, 10, 11, 12])
    expect(ids(listQueueForService(3, db))).toEqual(ids(made))
  })

  it('puts higher priority ahead and re-numbers the people behind', () => {
    const low = join({ studentId: 'A', priority: 'low' })
    const med = join({ studentId: 'B', priority: 'medium' })
    const high = join({ studentId: 'C', priority: 'high' })
    expect(ids(listQueueForService(2, db))).toEqual([high.id, med.id, low.id])
    expect(listQueueForService(2, db).map((t) => [t.position, t.estimatedWait])).toEqual([[1, 0], [2, 20], [3, 40]])
  })

  it('a high-priority newcomer cannot jump ahead of the ticket already being served', () => {
    const t = join({ serviceId: 1, priority: 'high' })
    expect(t.position).toBe(3)
    expect(listQueueForService(1, db)[0]).toMatchObject({ id: 'TICK-101', status: 'in_progress', position: 1 })
  })

  it('defaults to the service priority and trims text fields', () => {
    const t = join({ userName: '  Ada  ', studentId: ' S9 ', notes: '  hi  ' })
    expect(t).toMatchObject({ priority: 'medium', userName: 'Ada', studentId: 'S9', notes: 'hi' })
  })

  it('generates unique sequential ticket ids', () => {
    expect(Array.from({ length: 4 }, () => join().id)).toEqual(['TICK-103', 'TICK-104', 'TICK-105', 'TICK-106'])
  })

  it('stores the user id when given and rejects an unknown user', () => {
    insertUser('u-1')
    const t = join({ userId: 'u-1' })
    expect((db.prepare('SELECT user_id FROM QueueEntry WHERE entry_id = ?').get(t.id) as { user_id: string }).user_id).toBe('u-1')
    expect(errorCode(() => join({ userId: 'ghost' }))).toBe('UNKNOWN_USER')
  })

  it('rejects an unknown service and a closed service', () => {
    expect(errorCode(() => join({ serviceId: 99 }))).toBe('SERVICE_NOT_FOUND')
    expect(errorCode(() => join({ serviceId: 4 }))).toBe('SERVICE_CLOSED')
  })

  it('creates the queue row on demand for a brand-new service', () => {
    db.prepare(`INSERT INTO Service (service_id, name, description, duration, priority) VALUES (5, 'Tutoring', 'Peer tutoring', 30, 'low')`).run()
    expect(join({ serviceId: 5 })).toMatchObject({ position: 1 })
    expect(db.prepare(`SELECT status FROM Queue WHERE queue_id = 'q-5'`).get()).toEqual({ status: 'open' })
  })

  it('syncs Queue.status when the service is opened later', () => {
    db.prepare(`UPDATE Service SET is_open = 1 WHERE service_id = 4`).run()
    join({ serviceId: 4 })
    expect(db.prepare(`SELECT status FROM Queue WHERE queue_id = 'q-4'`).get()).toEqual({ status: 'open' })
  })

  it('uses the current service duration when waits are recalculated', () => {
    db.prepare('UPDATE Service SET duration = 5 WHERE service_id = 2').run()
    join()
    expect(join({ studentId: 'S2' }).estimatedWait).toBe(5)
  })

  it('is atomic: a failing insert rolls everything back and does not burn a ticket id', () => {
    join()
    const before = listActiveTickets(db)
    expect(sqlError(() => join({ notes: 'x'.repeat(201) }))).toMatch(/CHECK constraint failed/)
    expect(listActiveTickets(db)).toEqual(before)
    expect(join({ studentId: 'next' }).id).toBe('TICK-104')
  })
})

describe('estimateWait', () => {
  it('counts everyone ahead and multiplies by the duration', () => {
    expect(estimateWait(1, db)).toEqual({ ahead: 2, estimatedWait: 30 })
    expect(estimateWait(2, db)).toEqual({ ahead: 0, estimatedWait: 0 })
    expect(errorCode(() => estimateWait(99, db))).toBe('SERVICE_NOT_FOUND')
  })
})

describe('leaveQueue (waiting/in_progress -> canceled)', () => {
  it('cancels a ticket and moves the line up', () => {
    const a = join({ studentId: 'A' })
    const b = join({ studentId: 'B' })
    const c = join({ studentId: 'C' })
    expect(leaveQueue(b.id, db)).toMatchObject({ id: b.id, status: 'cancelled', position: 0, estimatedWait: 0 })
    expect(listQueueForService(2, db).map((t) => [t.id, t.position, t.estimatedWait])).toEqual([[a.id, 1, 0], [c.id, 2, 20]])
  })

  it('lets the ticket in progress leave; the next one moves to the front', () => {
    leaveQueue('TICK-101', db)
    expect(listQueueForService(1, db)).toMatchObject([{ id: 'TICK-102', position: 1, estimatedWait: 0, status: 'waiting' }])
  })

  it('does not touch other services', () => {
    const other = join({ serviceId: 3 })
    leaveQueue('TICK-101', db)
    expect(getTicket(other.id, db)).toMatchObject({ position: 1 })
  })

  it('rejects an unknown ticket and one that is already finished', () => {
    expect(errorCode(() => leaveQueue('NOPE', db))).toBe('TICKET_NOT_FOUND')
    expect(errorCode(() => leaveQueue('TICK-098', db))).toBe('TICKET_NOT_FOUND') // already served
    leaveQueue('TICK-102', db)
    expect(errorCode(() => leaveQueue('TICK-102', db))).toBe('TICKET_NOT_FOUND') // already canceled
  })
})

describe('serveNext (waiting -> in_progress -> served)', () => {
  it('completes the current ticket and starts the next', () => {
    const r = serveNext(1, db)
    expect(r.completed).toMatchObject({ id: 'TICK-101', status: 'completed' })
    expect(r.serving).toMatchObject({ id: 'TICK-102', status: 'in_progress', position: 1, estimatedWait: 0 })
    expect(listQueueForService(1, db)).toHaveLength(1)
  })

  it('serves the highest-priority waiting ticket first, FIFO among equals', () => {
    join({ studentId: 'A', priority: 'low' })
    const b = join({ studentId: 'B', priority: 'high' })
    const c = join({ studentId: 'C', priority: 'high' })
    expect(serveNext(2, db).serving?.id).toBe(b.id)
    expect(serveNext(2, db).serving?.id).toBe(c.id)
  })

  it('keeps positions unique and contiguous when nobody was in progress', () => {
    for (const s of ['A', 'B', 'C']) join({ studentId: s })
    serveNext(2, db)
    expect(listQueueForService(2, db).map((t) => t.position)).toEqual([1, 2, 3])
    expect(listQueueForService(2, db).map((t) => t.status)).toEqual(['in_progress', 'waiting', 'waiting'])
  })

  it('walks a whole line to the end, then reports it empty', () => {
    const a = join({ studentId: 'A' })
    const b = join({ studentId: 'B' })
    expect(serveNext(2, db).serving?.id).toBe(a.id)
    expect(serveNext(2, db)).toMatchObject({ completed: { id: a.id }, serving: { id: b.id } })
    expect(serveNext(2, db)).toMatchObject({ completed: { id: b.id }, serving: null })
    expect(errorCode(() => serveNext(2, db))).toBe('EMPTY_QUEUE')
    expect(listQueueForService(2, db)).toEqual([])
  })

  it('moves finished tickets out of the active list and into history', () => {
    serveNext(1, db)
    expect(ids(listActiveTickets(db))).not.toContain('TICK-101')
    expect(listHistory(undefined, db)[0]).toMatchObject({ id: 'TICK-101', status: 'completed' })
  })

  it('rejects an empty queue and an unknown service', () => {
    expect(errorCode(() => serveNext(2, db))).toBe('EMPTY_QUEUE')
    expect(errorCode(() => serveNext(99, db))).toBe('EMPTY_QUEUE')
  })

  it('a finished ticket can never be served or cancelled again', () => {
    serveNext(1, db)
    expect(errorCode(() => leaveQueue('TICK-101', db))).toBe('TICKET_NOT_FOUND')
  })
})

describe('reads', () => {
  it('listActiveTickets returns waiting and in-progress tickets ordered by service then position', () => {
    join({ serviceId: 3 })
    const active = listActiveTickets(db)
    expect(ids(active)).toEqual(['TICK-101', 'TICK-102', 'TICK-103'])
    expect(active.every((t) => t.status === 'waiting' || t.status === 'in_progress')).toBe(true)
  })

  it('getTicket returns any ticket regardless of status, or undefined', () => {
    expect(getTicket('TICK-098', db)).toMatchObject({ status: 'completed', serviceName: 'Registrar & Records' })
    expect(getTicket('NOPE', db)).toBeUndefined()
  })

  it('listHistory lists the most recently joined ticket first and can be limited to one user', () => {
    insertUser('u-1')
    const mine = join({ userId: 'u-1', serviceId: 3 })
    leaveQueue(mine.id, db)
    serveNext(1, db)
    expect(ids(listHistory(undefined, db))).toEqual([mine.id, 'TICK-101', 'TICK-098'])
    expect(ids(listHistory('u-1', db))).toEqual([mine.id])
    expect(listHistory('nobody', db)).toEqual([])
  })

  it('formats createdAt as a short clock time', () => {
    expect(getTicket('TICK-101', db)?.createdAt).toMatch(/\d{1,2}:\d{2}/)
  })

  it('falls back to the raw text if join_time is not a date', () => {
    db.prepare(`UPDATE QueueEntry SET join_time = 'garbage' WHERE entry_id = 'TICK-101'`).run()
    expect(getTicket('TICK-101', db)?.createdAt).toBe('garbage')
  })
})

describe('seed data and schema migration', () => {
  it('seeding twice does not duplicate data', () => {
    seedDatabase(db)
    expect(db.prepare('SELECT COUNT(*) AS n FROM Service').get()).toEqual({ n: 4 })
    expect(db.prepare('SELECT COUNT(*) AS n FROM QueueEntry').get()).toEqual({ n: 3 })
  })

  it('links the demo tickets to the seeded student account', () => {
    expect(ids(listHistory('usr-1', db))).toEqual(['TICK-098'])
    expect(db.prepare(`SELECT user_id FROM QueueEntry WHERE entry_id = 'TICK-101'`).get()).toEqual({ user_id: 'usr-1' })
  })

  it('resetDatabase discards tickets created after the seed', () => {
    join()
    expect(listActiveTickets(db)).toHaveLength(3)
    resetDatabase()
    expect(listActiveTickets(getDb())).toHaveLength(2)
  })

  it('upgrades an old QueueEntry table (no in_progress) and keeps its rows in order', () => {
    const old = new Database(':memory:')
    old.pragma('foreign_keys = ON')
    initializeSchema(old)
    // rebuild QueueEntry the way a pre-migration queuesmart.db had it
    old.pragma('foreign_keys = OFF')
    const ddl = (old.prepare(`SELECT sql FROM sqlite_master WHERE name = 'QueueEntry'`).get() as { sql: string }).sql
    old.exec('DROP TABLE QueueEntry')
    old.exec(ddl.replace("'waiting', 'in_progress', 'served', 'canceled'", "'waiting', 'served', 'canceled'"))
    old.pragma('foreign_keys = ON')
    old.exec(`INSERT INTO Service (service_id, name, description, duration, priority) VALUES (1, 'A', 'd', 10, 'low');
              INSERT INTO Queue (queue_id, service_id, status) VALUES ('q-1', 1, 'open');
              INSERT INTO QueueEntry (entry_id, queue_id, service_id, user_name, student_id, position, priority, status)
                VALUES ('T-2', 'q-1', 1, 'Second inserted first id', 's', 1, 'low', 'waiting'),
                       ('T-1', 'q-1', 1, 'First', 's', 2, 'low', 'waiting')`)
    const insertInProgress = () =>
      old.prepare(`UPDATE QueueEntry SET status = 'in_progress' WHERE entry_id = 'T-1'`).run()
    expect(() => insertInProgress()).toThrow(/CHECK constraint failed/)

    initializeSchema(old) // runs the migration
    expect(() => insertInProgress()).not.toThrow()
    expect(old.prepare('SELECT entry_id FROM QueueEntry ORDER BY rowid').all()).toEqual([{ entry_id: 'T-2' }, { entry_id: 'T-1' }])
    expect(old.pragma('foreign_keys', { simple: true })).toBe(1)
    expect(old.prepare(`SELECT name FROM sqlite_master WHERE name = 'QueueEntry_old'`).get()).toBeUndefined()
    expect(old.prepare(`SELECT name FROM sqlite_master WHERE name = 'idx_queue_entry_status'`).get()).toBeDefined()
    initializeSchema(old) // running again is a no-op
    expect(old.prepare('SELECT COUNT(*) AS n FROM QueueEntry').get()).toEqual({ n: 2 })
    old.close()
  })
})

describe('syncService (temporary bridge to the in-memory services)', () => {
  const svc = { id: 42, name: 'Tutoring', description: 'Peer tutoring', duration: 25, priority: 'low' as const, isOpen: true }

  it('inserts a new service, then updates it in place without losing its queue', () => {
    syncService(svc, db)
    const first = join({ serviceId: 42 })
    syncService({ ...svc, name: 'Tutoring Lab', duration: 30, isOpen: false }, db)
    expect(db.prepare('SELECT name, duration, is_open FROM Service WHERE service_id = 42').get()).toEqual({
      name: 'Tutoring Lab', duration: 30, is_open: 0
    })
    expect(getTicket(first.id, db)).toMatchObject({ serviceName: 'Tutoring Lab' }) // ticket survived the update
  })

  it('ignores a name that another service already owns, and rethrows anything else', () => {
    expect(() => syncService({ ...svc, name: 'Academic Advising' }, db)).not.toThrow()
    expect(db.prepare('SELECT COUNT(*) AS n FROM Service WHERE service_id = 42').get()).toEqual({ n: 0 })
    expect(() => syncService({ ...svc, duration: 0 }, db)).toThrow(/CHECK constraint failed/)
  })
})
