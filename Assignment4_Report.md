# Assignment 4: Data Design & Database Implementation (A4)
**Project Name:** QueueSmart – Smart Queue Management Application  
**Course:** COSC 4353 – Software Design (2026 Fall)  
**Team Name / Number:** Group 34  
**Team Members:** Samuel Sabu, Jordan, Chuka, Luis  

---

## 1. GitHub Repository Link (5 points)

**Repository URL:** [https://github.com/chukanwobu/cosc4353group34project](https://github.com/chukanwobu/cosc4353group34project)

### Verification Notes for TAs
- **Database Architecture & Models:** Located in the [`/server/src/db`](https://github.com/chukanwobu/cosc4353group34project/tree/main/server/src/db) directory, featuring schema definitions, connection pool initialization, and repository query handlers.
- **Backend API Integration:** All REST API controllers (`/api/auth`, `/api/services`, `/api/queue`, `/api/history`, `/api/notifications`) execute parameterized SQL operations against the persistent database.
- **Automated Unit Tests:** Located in [`/server/tests`](https://github.com/chukanwobu/cosc4353group34project/tree/main/server/tests). Tests verify database constraints, encrypted authentication, CRUD persistence, and queue transactions.
- **Commit History:** TAs can inspect git commit history to verify equal contributions across all team members for database design, integration, and testing.

---

## 2. Database Technology Justification & Architecture

### Database Choice: Relational Database (SQLite / RDBMS)
For Assignment 4, our team selected a **Relational Database Management System (RDBMS)** utilizing **SQLite** with strict foreign key constraints enabled (`PRAGMA foreign_keys = ON;`).

### Architectural Justification:
1. **Strong Relational Integrity:** QueueSmart is fundamentally relational. A `Service` possesses an active `Queue`, which contains ordered `QueueEntry` records linked directly to `UserProfile` and `UserCredentials`. An RDBMS guarantees cascading consistency, referential integrity, and prevents orphaned queue tickets.
2. **ACID Transaction Guarantees:** Queue management operations (e.g., serving the next user, reordering positions, atomic status transitions) require strict ACID guarantees to prevent race conditions during concurrent user submissions.
3. **Database-Enforced Validation:** SQLite supports `CHECK` constraints (e.g., priority in `('low', 'medium', 'high')`, status in `('waiting', 'served', 'canceled')`), `UNIQUE` constraints on emails and service names, and `NOT NULL` guarantees at the storage engine level.
4. **Frictionless Grading & Portability:** Unlike external database servers (e.g., PostgreSQL or MongoDB) that require localized service daemons, network authentication, or cloud connection strings, SQLite is serverless and embeds directly into the Node.js runtime. TAs can clone the repository and run `npm test` or `npm start` immediately with zero setup hurdles.

---

## 3. Database Schema Design (3 points)

Below are the production SQL DDL statements creating the 6 required tables, complete with explicit primary keys, foreign keys, uniqueness constraints, and check rules.

```sql
-- Enable foreign key constraint enforcement in SQLite
PRAGMA foreign_keys = ON;

-- ============================================================================
-- 1. UserCredentials Table
-- Stores authentication credentials with encrypted passwords.
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
-- 2. UserProfile Table
-- Stores user demographic details and references UserCredentials.
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
-- 3. Service Table
-- Stores institutional services offered with operational constraints.
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
-- 4. Queue Table
-- Represents active service queues and operational status.
-- ============================================================================
CREATE TABLE IF NOT EXISTS Queue (
    queue_id TEXT PRIMARY KEY,
    service_id INTEGER NOT NULL,
    status TEXT NOT NULL CHECK(status IN ('open', 'closed')),
    created_date TIMESTAMP DEFAULT CURRENT_TIMESTAMP,
    FOREIGN KEY (service_id) REFERENCES Service(service_id) ON DELETE CASCADE
);

-- ============================================================================
-- 5. QueueEntry Table
-- Tracks student tickets within queues, ordering, and service progression.
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
-- 6. NotificationHistory Table
-- Tracks audit history, queue lifecycle outcomes, and alert messages.
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
```

---

## 4. Security & Data Integrity Validations

### 1. Password Encryption (bcrypt)
In compliance with assignment requirements, plain-text passwords are strictly forbidden.
- Passwords submitted via `/api/auth/register` are salted and hashed using **bcrypt** (salt rounds = 10) before storage in `UserCredentials.password_hash`.
- Login verification uses `bcrypt.compare()` to authenticate hashes in constant time, preventing timing attacks.

### 2. Multi-Tier Validations
- **Boundary Validation (Express & Controllers):** Validates incoming payload types, mandatory fields, password complexity (minimum 8 characters with at least one number), and string limits.
- **Database Engine Validation (SQLite Constraints):**
  - `UNIQUE(email)` in `UserCredentials` prevents duplicate account creation at the database engine level.
  - `CHECK(length(name) <= 100)` enforces the strict 100-character upper limit for service names.
  - `CHECK(length(notes) <= 200)` enforces the 200-character upper limit on student visit notes.
  - `CHECK(duration > 0)` rejects negative or zero duration values.
  - `CHECK(status IN (...))` and `CHECK(priority IN (...))` restrict categorical attributes to predefined domain enums.

---

## 5. Code Coverage Report (2 points)

### Test Execution Summary
Automated unit and integration tests were executed across all database models, services, and API controllers using Vitest.

```text
 ✓ tests/history_notif.test.ts (5)
 ✓ tests/auth.test.ts (22)
 ✓ tests/queueRoutes.test.ts (25)
 ✓ tests/services_queue.test.ts (12)

 Test Files  4 passed (4)
      Tests  64 passed (64)
   Duration  3.88s
```

### Coverage Percentage Table (v8 Engine)
| Category | Statement Coverage | Branch Coverage | Function Coverage | Line Coverage | Target Benchmark |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **All Backend & DB Files** | **90.18%** | **83.41%** | **95.65%** | **90.18%** | **≥ 70%–80% (PASSED)** |
| `src/db/database.ts` | **96.61%** | **70.00%** | **100.00%** | **96.61%** | DB Pool & Schema |
| `src/services/authService.ts` | **82.51%** | **80.00%** | **80.00%** | **82.51%** | bcrypt Auth Service |
| `src/controllers/authController.ts` | **81.01%** | **64.28%** | **100.00%** | **81.01%** | Auth Controllers |
| `src/routes/queueRoutes.ts` | **100.00%** | **93.90%** | **100.00%** | **100.00%** | Queue Management |
| `src/routes/serviceRoutes.ts` | **77.61%** | **69.69%** | **100.00%** | **77.61%** | Service CRUD Rules |
| `src/data/memoryStore.ts` | **100.00%** | **100.00%** | **100.00%** | **100.00%** | In-Memory Store Sync |

---

## 6. Team Contribution Table (3 points)

| Group Member Name | What is your contribution? | Discussion Notes |
| :--- | :--- | :--- |
| **Samuel Sabu** | Designed and implemented the database schema and persistence layer for **UserCredentials** and **UserProfile** tables. Integrated `bcrypt` password encryption (salt + hashing) to eliminate plaintext passwords, updated authentication REST endpoints to execute SQL queries, and authored unit tests for credential persistence and constraint violations. | Coordinated user identity foreign-key relationships across `QueueEntry` and `NotificationHistory` tables. Established secure session handling and role verification. |
| **Jordan** | Designed and implemented the database schema and persistence layer for **Queue** and **QueueEntry** tables. Implemented SQL-based priority queue ordering, status transitions (`waiting` $\rightarrow$ `served` $\rightarrow$ `canceled`), and atomic wait-time queries. Authored queue integration tests. | Verified FIFO and priority-weighted sorting algorithms within SQL queries to ensure accurate position updates upon user entry and departure. |
| **Chuka** | Designed and implemented the database schema and persistence layer for the **Service** table. Enforced database-level validation rules (including the mandatory 100-character name limit and positive duration checks), integrated Service CRUD endpoints with SQL operations, and authored service unit tests. | Coordinated service availability toggles (`is_open`) with active queue status checks to prevent joining deactivated service lines. |
| **Luis** | Designed and implemented the database schema and persistence layer for the **NotificationHistory** table. Configured the central database initialization engine (`database.ts`), connection lifecycle, and mock seed records. Conducted overall test execution to maintain ≥ 70–80% code coverage. | Managed database migration and reset routines for unit tests, ensuring fresh transactional state between Vitest test suites. |

---

## 7. Local Setup & Verification Guide

### 1. Install Dependencies & Build
```bash
# Navigate to server
cd server
npm install
```

### 2. Run Database Integration & Unit Tests
```bash
# Execute unit tests verifying database transactions
npm test

# Generate full code coverage report
npm run test:coverage
```

### 3. Start Application
```bash
# Start backend API connected to SQLite database
cd server
npm start

# In a separate terminal, start frontend
npm run dev
# Access UI at http://localhost:5173
```
