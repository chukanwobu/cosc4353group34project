# Assignment 3: Back-End Development & API Implementation (A3)
**Project Name:** QueueSmart – Smart Queue Management Application  
**Course:** COSC 4353 – Software Design (2026 Fall)  
**Team Name / Number:** Group 34  
**Team Members:** Samuel Sabu, Jordan, Chuka, Luis  

---

## 1. GitHub Repository Link

**Repository URL:** [https://github.com/chukanwobu/cosc4353group34project](https://github.com/chukanwobu/cosc4353group34project)

### Verification Notes for TAs
- **Backend Source Code**: Located in the [`/server`](https://github.com/chukanwobu/cosc4353group34project/tree/main/server) directory, featuring modular REST API routers (`/api/auth`, `/api/services`, `/api/queue`, `/api/history`, `/api/notifications`).
- **Automated Unit Tests**: Located in [`/server/tests`](https://github.com/chukanwobu/cosc4353group34project/tree/main/server/tests) (`auth.test.ts`, `services_queue.test.ts`, `history_notif.test.ts`).
- **Commit History**: TAs can inspect git commit history to verify individual team member commits and contributions across all functional backend modules.

---

## 2. Backend Technologies and Architecture Justification

### Selected Technology Stack
- **Language & Runtime**: **Node.js (v20+ LTS) with TypeScript**
- **Framework**: **Express.js (v4.21+)** with `cors` middleware
- **Testing Framework**: **Vitest & Supertest (v8 coverage engine)**

### Architectural Justification & Alignment with QueueSmart
1. **Modular REST API Design**: Express.js provides a lightweight routing pipeline separating the application into distinct domain controllers (`authController`, `serviceRoutes`, `queueRoutes`, `historyRoutes`, `notifRoutes`). This directly implements the system boundaries specified in Assignment 1 and services the screens built in Assignment 2.
2. **In-Memory Data Structures**: In accordance with Assignment 3 specifications, all state is maintained in TypeScript in-memory collections (`server/src/data/memoryStore.ts`), intentionally deferring persistent database configuration to Assignment 4 while guaranteeing sub-millisecond execution speeds and zero external setup barriers for unit tests.
3. **Payload Validation & Type Safety**: Defensive boundary validation validates all incoming payloads (e.g., email syntax, password complexity, the mandatory 100-character upper limit on service names, and 200-character limits on queue notes), returning standardized HTTP status codes (`201 Created`, `200 OK`, `400 Bad Request`, `401 Unauthorized`, `409 Conflict`).
4. **Front-End Integration**: The A2 React/TypeScript front-end is integrated with these backend endpoints via asynchronous HTTP services (`src/services/authApi.ts`), allowing real-time authentication, session persistence, and role-based views to reflect live backend data.

---

## 3. Automated Unit Testing & Code Coverage Summary

Automated unit tests were authored using **Vitest** and **Supertest** to test core business logic, validation rules, status codes, and edge cases.

### Test Execution Results
```text
 ✓ tests/auth.test.ts (16 tests)
 ✓ tests/services_queue.test.ts (8 tests)
 ✓ tests/history_notif.test.ts (5 tests)

 Test Files  3 passed (3)
      Tests  29 passed (29)
   Duration  435ms
```

### Coverage Report (v8 Engine)
| Category | Statement Coverage | Branch Coverage | Function Coverage | Line Coverage | Target Benchmark |
| :--- | :--- | :--- | :--- | :--- | :--- |
| **All Backend Files** | **84.69%** | **73.87%** | **93.33%** | **84.69%** | **70%–80% (PASSED)** |
| `authService.ts` | **90.59%** | **88.88%** | **80.00%** | **90.59%** | Core Auth Logic |
| `authController.ts` | **81.01%** | **66.66%** | **100.00%** | **81.01%** | Auth HTTP Handlers |
| `authRoutes.ts` | **100.00%** | **100.00%** | **100.00%** | **100.00%** | Auth Router |
| `memoryStore.ts` | **100.00%** | **100.00%** | **100.00%** | **100.00%** | In-Memory Store |

---

## 4. Team Contribution Table

| Group Member Name | What is your contribution? | Discussion Notes |
| :--- | :--- | :--- |
| **Samuel Sabu** | Implemented the Authentication and User Management backend modules (`/api/auth/register`, `/api/auth/login`), role verification (`user` vs `admin`), and defensive payload validation rules. Connected front-end authentication flows to the backend server. | Coordinated API contract definitions, HTTP response status codes, and request/response payload structures with front-end components. |
| **Jordan** | Developed the Queue Management API module (`/api/queue`) and wait-time estimation calculation engine ($\text{Wait} = (\text{Position} - 1) \times \text{Duration}$), implementing FIFO and priority-based queue sorting. | Reviewed wait-time estimation algorithms to ensure realistic wait-time outputs under fluctuating queue lengths and different service duration parameters. |
| **Chuka** | Built the Service Management CRUD API endpoints (`/api/services`) and in-memory service models, enforcing strict field validations including the mandatory 100-character service name constraint. | Defined service constraints, open/close queue status toggle behavior, and priority categories (`low`, `medium`, `high`) across administrative endpoints. |
| **Luis** | Programmed the in-memory History tracking module (`/api/history`), Notification trigger alerts (`/api/notifications`), and authored comprehensive unit test suites achieving 84.69% code coverage. | Configured test runners, automated mock data teardown between test cases, and verified test execution pipelines on GitHub. |

---

## 5. Local Setup & Verification Guide

### 1. Run Backend Unit Tests
```bash
cd server
npm install
npm test
npm run test:coverage
```

### 2. Start Backend REST API Server
```bash
cd server
npm start
# Server listens on http://localhost:5001
```

### 3. Start Front-End Client
```bash
# In the repository root
npm install
npm run dev
# Open http://localhost:5173
```
