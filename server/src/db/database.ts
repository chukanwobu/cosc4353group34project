import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'
export interface DatabaseContext {
  db: Database.Database
}

// In test environment, use ':memory:' for isolated, non-locking execution.
// In development/production, use a persistent file (override with DB_PATH).
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
const DB_PATH = isTestEnv
  ? ':memory:'
  : process.env.DB_PATH ?? path.resolve(__dirname, '../../queuesmart.db')

// bcrypt cost: low in tests so seeding stays fast, standard otherwise.
const BCRYPT_ROUNDS = isTestEnv ? 4 : 10

let dbInstance: Database.Database | null = null

export function getDb(): Database.Database {
  if (dbInstance) return dbInstance

  // Build on a local variable and only publish the singleton once setup fully
  // succeeds, so a failed init can't leave a half-configured DB behind.
  const db = new Database(DB_PATH)

  try {
    // Configure SQLite pragmas for relational integrity and performance
    db.pragma('foreign_keys = ON')
    if (!isTestEnv) {
      db.pragma('journal_mode = WAL')
    }
    db.pragma('busy_timeout = 5000')

    const isNewDatabase =
      isTestEnv ||
      !db
        .prepare("SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Service'")
        .get()

    initializeSchema(db)

    if (isNewDatabase) {
      seedDatabase(db)
    }
  } catch (err) {
    db.close()
    throw err
  }

  dbInstance = db
  return db
}

export function closeDb(): void {
  if (dbInstance) {
    dbInstance.close()
    dbInstance = null
  }
}

export function initializeSchema(db: Database.Database): void {
  db.exec(`
    PRAGMA foreign_keys = ON;

    -- ============================================================================
    -- 1. UserCredentials Table (Encrypted Authentication)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS UserCredentials (
      user_id TEXT PRIMARY KEY,
      email TEXT UNIQUE NOT NULL,
      password_hash TEXT NOT NULL,
      role TEXT NOT NULL CHECK(role IN ('user', 'admin')),
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      updated_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ============================================================================
    -- 2. UserProfile Table (User Details)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS UserProfile (
      profile_id TEXT PRIMARY KEY,
      user_id TEXT UNIQUE NOT NULL,
      full_name TEXT NOT NULL,
      email TEXT NOT NULL,
      student_id TEXT,
      phone TEXT,
      preferences TEXT DEFAULT '{}',
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id) ON DELETE CASCADE,
      FOREIGN KEY (email) REFERENCES UserCredentials(email) ON UPDATE CASCADE
    );

    -- ============================================================================
    -- 3. Service Table (Organizational Services)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS Service (
      service_id INTEGER PRIMARY KEY AUTOINCREMENT,
      name TEXT UNIQUE NOT NULL CHECK(length(name) <= 100),
      description TEXT NOT NULL,
      duration INTEGER NOT NULL CHECK(duration > 0),
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
      is_open BOOLEAN NOT NULL DEFAULT 1,
      created_at TIMESTAMP DEFAULT CURRENT_TIMESTAMP
    );

    -- ============================================================================
    -- 4. Queue Table (Active Service Queues)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS Queue (
      queue_id TEXT PRIMARY KEY,
      service_id INTEGER NOT NULL,
      status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
      created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      FOREIGN KEY (service_id) REFERENCES Service(service_id) ON DELETE CASCADE
    );

    -- ============================================================================
    -- 5. QueueEntry Table (Waiting Students & Queue Order)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS QueueEntry (
      entry_id TEXT PRIMARY KEY,
      queue_id TEXT NOT NULL,
      service_id INTEGER NOT NULL,
      user_id TEXT,
      user_name TEXT NOT NULL,
      student_id TEXT NOT NULL,
      notes TEXT CHECK(length(notes) <= 200),
      position INTEGER NOT NULL,
      join_time TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      priority TEXT NOT NULL CHECK(priority IN ('low', 'medium', 'high')),
      status TEXT NOT NULL CHECK(status IN ('waiting', 'served', 'canceled')),
      estimated_wait INTEGER NOT NULL DEFAULT 0,
      FOREIGN KEY (queue_id) REFERENCES Queue(queue_id) ON DELETE CASCADE,
      FOREIGN KEY (service_id) REFERENCES Service(service_id) ON DELETE CASCADE,
      FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id) ON DELETE SET NULL
    );

    -- ============================================================================
    -- 6. NotificationHistory Table (Audit Logs & Notifications)
    -- ============================================================================
    CREATE TABLE IF NOT EXISTS NotificationHistory (
      notification_id TEXT PRIMARY KEY,
      user_id TEXT,
      ticket_id TEXT,
      service_name TEXT NOT NULL,
      message TEXT NOT NULL,
      type TEXT NOT NULL CHECK(type IN ('info', 'success', 'warning', 'alert')),
      timestamp TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
      status TEXT NOT NULL CHECK(status IN ('sent', 'viewed')),
      FOREIGN KEY (user_id) REFERENCES UserCredentials(user_id) ON DELETE CASCADE
    );

    -- Performance Indexes
    CREATE INDEX IF NOT EXISTS idx_queue_entry_status ON QueueEntry(queue_id, status, position);
    CREATE INDEX IF NOT EXISTS idx_notification_user ON NotificationHistory(user_id);
    CREATE INDEX IF NOT EXISTS idx_user_credentials_email ON UserCredentials(email);

    -- Integrity Indexes
    -- A signed-in user can only have one active (waiting) entry per queue.
    CREATE UNIQUE INDEX IF NOT EXISTS idx_one_active_entry_per_user
      ON QueueEntry(queue_id, user_id)
      WHERE status = 'waiting' AND user_id IS NOT NULL;

    -- Optional: enforce unique positions among waiting entries. Enable only if
    -- you reorder positions inside a transaction (shifting can briefly collide).
    -- CREATE UNIQUE INDEX IF NOT EXISTS idx_unique_waiting_position
    --   ON QueueEntry(queue_id, position) WHERE status = 'waiting';
  `)
}

export function seedDatabase(db: Database.Database): void {
  initializeSchema(db)

  const studentPasswordHash = bcrypt.hashSync('password123', BCRYPT_ROUNDS)
  const adminPasswordHash = bcrypt.hashSync('admin1234', BCRYPT_ROUNDS)

  // Upserts (not INSERT OR REPLACE): REPLACE deletes then re-inserts the row,
  // which fires ON DELETE CASCADE / SET NULL on child tables.
  const upsertCred = db.prepare(`
    INSERT INTO UserCredentials (user_id, email, password_hash, role)
    VALUES (?, ?, ?, ?)
    ON CONFLICT(user_id) DO UPDATE SET
      email = excluded.email,
      password_hash = excluded.password_hash,
      role = excluded.role,
      updated_at = CURRENT_TIMESTAMP
  `)

  const upsertProfile = db.prepare(`
    INSERT INTO UserProfile (profile_id, user_id, full_name, email, student_id, phone, preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?)
    ON CONFLICT(profile_id) DO UPDATE SET
      user_id = excluded.user_id,
      full_name = excluded.full_name,
      email = excluded.email,
      student_id = excluded.student_id,
      phone = excluded.phone,
      preferences = excluded.preferences
  `)

  const insertService = db.prepare(`
    INSERT INTO Service (service_id, name, description, duration, priority, is_open)
    VALUES (?, ?, ?, ?, ?, ?)
    ON CONFLICT(service_id) DO NOTHING
  `)

  const insertQueue = db.prepare(`
    INSERT INTO Queue (queue_id, service_id, status)
    VALUES (?, ?, ?)
    ON CONFLICT(queue_id) DO NOTHING
  `)

  const seedTransaction = db.transaction(() => {
    // Seed Demo Student (Samuel Sabu)
    upsertCred.run('usr-1', 'user@queuesmart.com', studentPasswordHash, 'user')
    upsertProfile.run(
      'prof-1',
      'usr-1',
      'Samuel Sabu',
      'user@queuesmart.com',
      '1984203',
      '713-555-0199',
      '{"notifications":true}'
    )

    // Seed Demo Admin
    upsertCred.run('usr-2', 'admin@queuesmart.com', adminPasswordHash, 'admin')
    upsertProfile.run(
      'prof-2',
      'usr-2',
      'Campus Administrator',
      'admin@queuesmart.com',
      'ADMIN-01',
      '713-555-0100',
      '{"notifications":true,"adminAlerts":true}'
    )

    // Seed Services & Active Queues
    insertService.run(1, 'Academic Advising', 'Degree planning, course registration overrides, and graduation checks.', 15, 'high', 1)
    insertQueue.run('q-1', 1, 'open')

    insertService.run(2, 'Financial Aid & Scholarships', 'FAFSA counseling, grant inquiries, and tuition payment plan support.', 20, 'medium', 1)
    insertQueue.run('q-2', 2, 'open')

    insertService.run(3, 'Registrar & Records', 'Transcript requests, diploma processing, and enrollment verification.', 10, 'medium', 1)
    insertQueue.run('q-3', 3, 'open')

    insertService.run(4, 'Campus IT Help Desk', 'Password resets, software licensing, campus Wi-Fi, and hardware support.', 12, 'low', 0)
    insertQueue.run('q-4', 4, 'closed')
  })

  seedTransaction()
}

export function resetDatabase(): void {
  if (process.env.NODE_ENV === 'production') {
    throw new Error('resetDatabase() is disabled in production')
  }

  const db = getDb()
  initializeSchema(db)

  const clearTransaction = db.transaction(() => {
    db.exec(`
      DELETE FROM NotificationHistory;
      DELETE FROM QueueEntry;
      DELETE FROM Queue;
      DELETE FROM Service;
      DELETE FROM UserProfile;
      DELETE FROM UserCredentials;
    `)
  })

  clearTransaction()
  seedDatabase(db)
}
