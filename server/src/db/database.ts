import Database from 'better-sqlite3'
import bcrypt from 'bcryptjs'
import path from 'path'

export interface DatabaseContext {
  db: Database.Database
}

// In test environment, use ':memory:' for isolated, non-locking sub-millisecond execution.
// In development/production, use persistent 'queuesmart.db' file.
const isTestEnv = process.env.NODE_ENV === 'test' || process.env.VITEST === 'true'
const DB_PATH = isTestEnv ? ':memory:' : path.resolve(__dirname, '../../queuesmart.db')

let dbInstance: Database.Database | null = null

export function getDb(): Database.Database {
  if (!dbInstance) {
    dbInstance = new Database(DB_PATH)
    // Configure SQLite pragmas for relational integrity and performance
    dbInstance.pragma('foreign_keys = ON')
    if (!isTestEnv) {
      dbInstance.pragma('journal_mode = WAL')
    }
    dbInstance.pragma('busy_timeout = 5000')

    
  const isNewDatabase =
    isTestEnv ||
    !dbInstance.prepare(
      "SELECT name FROM sqlite_master WHERE type = 'table' AND name = 'Service'"
    ).get()

  initializeSchema(dbInstance)

  if (isNewDatabase) {
    seedDatabase(dbInstance)
  }

  }
  return dbInstance
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
  `)
}

export function seedDatabase(db: Database.Database): void {
  initializeSchema(db)

  const studentPasswordHash = bcrypt.hashSync('password123', 10)
  const adminPasswordHash = bcrypt.hashSync('admin1234', 10)

  const insertCred = db.prepare(`
    INSERT OR REPLACE INTO UserCredentials (user_id, email, password_hash, role)
    VALUES (?, ?, ?, ?)
  `)

  const insertProfile = db.prepare(`
    INSERT OR REPLACE INTO UserProfile (profile_id, user_id, full_name, email, student_id, phone, preferences)
    VALUES (?, ?, ?, ?, ?, ?, ?)
  `)

  
  const insertService = db.prepare(`
    INSERT OR IGNORE INTO Service
      (service_id, name, description, duration, priority, is_open)
    VALUES (?, ?, ?, ?, ?, ?)
  `)


  const insertQueue = db.prepare(`
    INSERT OR REPLACE INTO Queue (queue_id, service_id, status)
    VALUES (?, ?, ?)
  `)

  const seedTransaction = db.transaction(() => {
    // Seed Demo Student (Samuel Sabu)
    insertCred.run('usr-1', 'user@queuesmart.com', studentPasswordHash, 'user')
    insertProfile.run('prof-1', 'usr-1', 'Samuel Sabu', 'user@queuesmart.com', '1984203', '713-555-0199', '{"notifications":true}')

    // Seed Demo Admin
    insertCred.run('usr-2', 'admin@queuesmart.com', adminPasswordHash, 'admin')
    insertProfile.run('prof-2', 'usr-2', 'Campus Administrator', 'admin@queuesmart.com', 'ADMIN-01', '713-555-0100', '{"notifications":true,"adminAlerts":true}')

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
