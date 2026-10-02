# Assignment 2: UI / UX Design and Front-End Implementation (A2)
**Project Name:** QueueSmart – Smart Queue Management Application  
**Course:** COSC 4353 – Software Design (2026 Fall)  
**Team Name / Number:** Group 34  
**Team Members:** Samuel Sabu, Jordan, Chuka, Luis  

---

## 1. GitHub Repository Link

**Repository URL:** [https://github.com/chukanwobu/cosc4353group34project](https://github.com/chukanwobu/cosc4353group34project)

> [!NOTE]
> **TA Verification Note**: TAs can inspect the repository commit history to verify equal collaboration, individual code contributions, and incremental component development across all team members.

---

## 2. Design and Development Methodology

### Methodology Evolution
Our team continues to utilize an **Agile development methodology with Scrum sprints**, building directly upon the architectural foundations established in Assignment 1 (A1). While A1 focused on high-level system boundaries, key domain actors (Students, Staff, Administrators), and external integration points (such as the SMS/Email notification provider), **Assignment 2 translates those abstract specifications into a fully interactive, component-driven front-end application**.

Throughout this sprint, we maintained iterative feedback loops to refine the user journey. By transitioning from conceptual sequence diagrams to tangible React components, we were able to evaluate user interface ergonomics, optimize client-side state transitions, and enforce strict input validation rules before connecting to a live database back-end in Assignment 3.

### Sprint Focus & Task Division
To manage project scope effectively across our four team members, we partitioned the application into four modular functional domains:
1. **User Authentication & Personal Dashboard**: Login, registration, role identification, and student queue summaries.
2. **Queue Interaction & Status Tracking**: Department selection, dynamic wait-time estimation, entry validation, and live line progression.
3. **Administrative Services & Controls**: High-level campus metrics, service queue status toggles, and service CRUD operations with input validation.
4. **Queue Control & Notification Engine**: Simulated queue advancement, student reordering, cancellation modal processing, and in-app toast alerts.

Each team member assumed complete ownership of their assigned domain, guaranteeing consistent UI styling, modular TypeScript code architecture, and clear separation of concerns.

---

## 3. Front-End Technologies and Responsibilities

### Technology Stack & Justification

- **Framework / Library**: **React 19 (with TypeScript)**  
  *Justification*: Chosen for its component-driven architecture, declarative rendering, and robust type safety. TypeScript interfaces (`Service`, `Ticket`, `NotificationItem`) allow us to maintain strict data contracts across pages, while React Context (`QueueContext`) provides centralized state management for seamless real-time UI updates without requiring a live back-end database.
- **Build Tooling**: **Vite 8**  
  *Justification*: Selected for its near-instantaneous Hot Module Replacement (HMR) and optimized build speeds, enabling rapid front-end iteration and effortless setup for all team members.
- **Routing**: **React Router DOM v7**  
  *Justification*: Enables clean client-side SPA navigation between User views (`/dashboard`, `/join-queue`, `/queue-status`, `/history`) and Admin views (`/admin`, `/admin/services`, `/admin/queue`).
- **Styling & Responsive Design**: **Modular CSS & Utility CSS Pattern**  
  *Justification*: Clean, structured CSS modules with flexbox and CSS grid layouts ensure total visual consistency, accessible contrast ratios, and seamless responsiveness across desktop, tablet, and mobile displays.

### Team Member Screen & Feature Responsibilities

| Team Member | Assigned Screens & Components | Core Responsibilities |
| :--- | :--- | :--- |
| **Samuel Sabu** | Authentication (`Login.tsx`, `Register.tsx`) & User Dashboard (`UserDashboard.tsx`) | Developed responsive Login and Registration flows with client-side input validation (email regex, password strength, match checks) and the central User Dashboard summarizing active line status, available services, and quick action cards. |
| **Jordan** | Join Queue (`JoinQueue.tsx`) & Queue Status (`QueueStatus.tsx`) | Implemented department service selection, dynamic estimated wait time calculations, entry validation (notes character limits), and the live Queue Status tracking screen with position counter and progress stepper. |
| **Chuka** | Admin Dashboard (`AdminDashboard.tsx`) & Service Management (`ServiceManagement.tsx`) | Built the main Admin Overview dashboard displaying open service metrics and quick queue toggles, alongside the Service Management CRUD form enforcing strict input constraints (**100-character name limit**, positive duration). |
| **Luis** | Queue Management (`QueueManagement.tsx`) & Notification Component (`Notification.tsx`) | Engineered the administrative Queue Management interface (permitting simulated user reordering, serving, and removal) and created the real-time in-app notification toast alert component. |

---

## 4. Screenshots of Front-End Interfaces

### Figure 1: Login and Registration Screens
*Developed by: Samuel Sabu*

The Authentication interface provides secure entry points for both Students and Administrators. The Login component features live client-side validation for email syntax and password length, along with pre-populated demo account credentials (`user@queuesmart.com` / `password123` and `admin@queuesmart.com` / `admin1234`). The Registration component includes live password strength checks, email duplication checks, and password match validation.

```
+-----------------------------------------------------------------------------------+
|                                 LOG IN TO QUEUESMART                              |
|                    See where you are in line, or manage your queues.              |
|                                                                                   |
|  Email Address: [ user@queuesmart.com                                           ] |
|  Password:      [ ••••••••••••                                                  ] |
|                                                                                   |
|  [ LOG IN BUTTON ]                                                                |
|                                                                                   |
|  New to QueueSmart? Create an account                                             |
|  Demo accounts: user@queuesmart.com / password123 | admin@queuesmart.com          |
+-----------------------------------------------------------------------------------+
```

---

### Figure 2: User Dashboard
*Developed by: Samuel Sabu*

The User Dashboard acts as the primary hub for logged-in students. If a student is currently in line, a highlighted **Active Queue Reservation Widget** displays their ticket ID, department name, current line position (e.g., `#2`), estimated wait time, and live status badge ("Waiting in Line" or "Being Served"). Below the active card, an **Available Services Grid** lists all campus departments, current queue counts, and direct "Join Queue" action triggers.

```
+-----------------------------------------------------------------------------------+
|  ⚡ QueueSmart  [Dashboard]  [Join Queue]  [Queue Status]  [History]  [Admin View]  |
+-----------------------------------------------------------------------------------+
|  Welcome back, Samuel!                                                            |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | 🔵 ACTIVE QUEUE RESERVATION                                      #TICK-101  |  |
|  | Academic Advising                                                           |  |
|  | Reason: Need degree plan approval for COSC 4353                             |  |
|  | POSITION: #1    |    EST. WAIT: NOW    |    STATUS: BEING SERVED          |  |
|  | [ View Live Tracker & Details ]        [ Leave Line ]                       |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  Available Services & Current Queues                                              |
|  +-----------------------------------+   +-------------------------------------+  |
|  | Academic Advising          [OPEN] |   | Financial Aid & Scholarships [OPEN] |  |
|  | Degree planning & clearance.      |   | FAFSA & grant counseling.           |  |
|  | People Waiting: 3 | Est: ~45 min  |   | People Waiting: 1 | Est: ~20 min    |  |
|  | [ Join Queue ]                    |   | [ Join Queue ]                      |  |
|  +-----------------------------------+   +-------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

### Figure 3: Join Queue Screen
*Developed by: Jordan*

The Join Queue screen guides students through selecting a department and reserving their place in line. Upon selecting a service, the application dynamically calculates the estimated wait time using the formula: $\text{Est. Wait} = \text{Current Queue Length} \times \text{Average Duration}$. The form enforces client-side validations: Student Name and Student ID are required, and the Visit Reason field enforces a **maximum 200-character limit** complete with an active character counter (`X / 200 chars`).

```
+-----------------------------------------------------------------------------------+
|  JOIN A SERVICE QUEUE                                                             |
|                                                                                   |
|  1. Select Campus Service                 2. Queue Entry Details                  |
|  (*) Academic Advising [OPEN]             +------------------------------------+  |
|      👥 3 in line | ~45 min wait          | Selected: Academic Advising        |  |
|                                           | Est. Wait: ~45 mins                |  |
|  ( ) Financial Aid & Scholarships [OPEN]  |                                    |  |
|      👥 1 in line | ~20 min wait          | Full Name: [ Samuel Sabu         ] |  |
|                                           | Student ID: [ 1984203            ] |  |
|  ( ) Registrar & Records [OPEN]           | Reason for Visit: (42 / 200 chars) |  |
|      👥 0 in line | ~0 min wait           | [ Need degree audit check...     ] |  |
|                                           |                                    |  |
|                                           | [ 🚀 CONFIRM & JOIN QUEUE ]        |  |
|                                           +------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

### Figure 4: Queue Status Screen
*Developed by: Jordan*

The Queue Status screen provides real-time visibility into line movement. It features a hero status card with a **prominent position counter badge** (e.g., `#2 in line`), a live estimated wait countdown, and a **4-stage progression stepper** ("Ticket Issued" $\rightarrow$ "Waiting in Line" $\rightarrow$ "Next in Line" $\rightarrow$ "Being Served"). Students can also initiate queue cancellation via the "Leave Queue Line" button, which opens a confirmation modal before removing the reservation.

```
+-----------------------------------------------------------------------------------+
|  LIVE QUEUE TRACKER                                [ ⚡ Demo: Advance Queue ]     |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | 🟢 Academic Advising                                              #TICK-102 |  |
|  |                                                                             |  |
|  |       YOUR CURRENT POSITION                     ESTIMATED REMAINING TIME    |  |
|  |                #2                                       ~15 min             |  |
|  |             In Line                              Updated live in real-time  |  |
|  |                                                                             |  |
|  |  (✓) Issued ------ (●) Waiting ------ ( ) Next in Line ------ ( ) Serving   |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  Reservation Details                      Service Station Info                    |
|  • Student: Samuel Sabu                   • Location: SSB Floor 2, Counter 3     |
|  • Student ID: 1984203                    • Notification: Stay near lobby         |
|  • Reason: Prerequisites check            [ Cancel / Leave Queue Line ]           |
+-----------------------------------------------------------------------------------+
```

---

### Figure 5: Admin Dashboard
*Developed by: Chuka*

The Admin Dashboard delivers operational oversight for campus administrators. The top overview section features key performance indicators: Active/Open Services count, Total People Waiting, and Average Wait Time. Below the metrics, each service card displays current queue length, service duration, priority level, and an **instant Open/Close toggle button** allowing staff to pause or resume queue entries for any department.

```
+-----------------------------------------------------------------------------------+
|  ADMIN CONTROL DASHBOARD                  [ ⚙️ Services ]  [ 📋 Manage Queues ]   |
|                                                                                   |
|  OVERVIEW METRICS                                                                 |
|  +--------------------------+  +--------------------------+  +-----------------+  |
|  | Active / Open Services   |  | Total People Waiting     |  | Avg Wait Time   |  |
|  |        3 / 4             |  |           4              |  |     ~14 min     |  |
|  +--------------------------+  +--------------------------+  +-----------------+  |
|                                                                                   |
|  SERVICES & QUEUE STATUS                                                          |
|  +-------------------------------------+  +------------------------------------+  |
|  | Academic Advising            [OPEN] |  | Campus IT Help Desk       [CLOSED] |  |
|  | People Waiting: 3 | Est: 45 min     |  | People Waiting: 0 | Est: 0 min     |  |
|  | Priority: HIGH                      |  | Priority: LOW                      |  |
|  | [ Close Queue ]  [ View Queue (3) ] |  | [ Open Queue ]  [ View Queue (0) ] |  |
|  +-------------------------------------+  +------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

### Figure 6: Service Management Screen
*Developed by: Chuka*

The Service Management screen provides a full CRUD interface for administrative personnel. The entry form includes strict client-side validation rules:
- **Service Name**: Required field with an active **100-character max limit counter** (`X / 100 chars`) and validation error messages when exceeded.
- **Description**: Required text input explaining service scope.
- **Expected Duration**: Required numeric input (must be $\ge 1$ minute).
- **Priority Level**: Select dropdown (`Low`, `Medium`, `High`).

Existing services are listed below the form with Edit and Delete controls.

```
+-----------------------------------------------------------------------------------+
|  SERVICE MANAGEMENT                                   [ ← Back to Dashboard ]     |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | ➕ Create New Campus Service                                                 |  |
|  | Service Name: [ Financial Aid & Scholarships          ]  (27 / 100 chars)     |  |
|  | Description:  [ FAFSA counseling & grant assistance.                      ] |  |
|  | Duration (min): [ 20 ]               Priority Level: [ Medium           v ] |  |
|  |                                                                             |  |
|  | [ SAVE NEW SERVICE ]                                                        |  |
|  +-----------------------------------------------------------------------------+  |
|                                                                                   |
|  Active Services Catalog (4)                                                      |
|  • Academic Advising [HIGH] - 15 mins/student             [ Edit ]  [ Delete ]    |
|  • Financial Aid & Scholarships [MEDIUM] - 20 mins        [ Edit ]  [ Delete ]    |
+-----------------------------------------------------------------------------------+
```

---

### Figure 7: Queue Management Screen
*Developed by: Luis*

The Queue Management screen provides interactive queue control for staff operating student counters. Department tabs allow staff to filter queues by service. Features include:
- **"Serve Next Student" Button**: Immediately advances the next student in line to "Being Served" status and dispatches an in-app notification.
- **Currently Serving Highlight Banner**: Displays ticket ID, student name, ID, and reason.
- **Queue Reordering Controls**: `▲` (Move Up) and `▼` (Move Down) buttons to adjust student queue priority in real-time.
- **Student Removal Action**: Opens a modal requiring staff to select a removal reason (*No Show*, *Cancelled by request*, *Resolved out of line*).

```
+-----------------------------------------------------------------------------------+
|  ADMINISTRATIVE QUEUE CONTROL                         [ ← Back to Overview ]      |
|                                                                                   |
|  [ Academic Advising (3) ]  [ Financial Aid (1) ]  [ Registrar (0) ]              |
|                                                                                   |
|  +-----------------------------------------------------------------------------+  |
|  | Academic Advising  | 🟢 Queue Open                    [ 🔔 Serve Next ]    |  |
|  |                                                                             |  |
|  | 🟩 CURRENTLY SERVING: #TICK-101 | Samuel Sabu | Reason: Degree clearance   |  |
|  |                                                                             |  |
|  | POS # | TICKET    | STUDENT NAME | REASON           | REORDER | ACTIONS    |  |
|  | #1    | #TICK-102 | Jordan Lee   | Elective check   | [▲] [▼] | [ Remove ] |  |
|  | #2    | #TICK-103 | Luis Rod.    | Minor audit      | [▲] [▼] | [ Remove ] |  |
|  +-----------------------------------------------------------------------------+  |
+-----------------------------------------------------------------------------------+
```

---

## 5. Team Contribution Table

| Group Member Name | Contribution Details | Discussion & Integration Notes |
| :--- | :--- | :--- |
| **Samuel Sabu** | Designed and coded authentication flows (`Login.tsx`, `Register.tsx`) and the primary User Dashboard (`UserDashboard.tsx`); integrated TypeScript components and local form validations. | Lead the integration of global routing (`App.tsx`) and navbar layout structure. Collaborated with team on consistent CSS card spacing and status badge colors. |
| **Jordan** | Built the Join Queue (`JoinQueue.tsx`) and live Queue Status (`QueueStatus.tsx`) screens, implementing mock state calculations for estimated wait times and position trackers. | Reviewed user journey ergonomics to ensure smooth transitions from browsing services to tracking wait times. Engineered the 4-stage stepper UI logic. |
| **Chuka** | Developed the Admin Dashboard (`AdminDashboard.tsx`) and Service Management CRUD interface (`ServiceManagement.tsx`), ensuring input constraints match requirements (e.g., **100-character name limits**, duration parameters). | Defined administrative permission boundaries, open/close queue toggle behavior, and service priority tag styling across admin screens. |
| **Luis** | Programmed the administrative Queue Management interface (`QueueManagement.tsx` for simulate serving/reordering) and the UI notification alert component (`Notification.tsx`). | Engineered real-time feedback dispatches for simulated queue status updates, reordering logic, and removal modal confirmation handling. |

---

## 6. Teammate Setup Guide

### Group 34 • React + TypeScript + Vite

Use these steps to get the shared **QueueSmart** project running on your computer. Do not create a new Vite project and do not run `git init`; clone the existing repository.

#### 1. Install Required Software
- **Git**
- **Node.js** (Use current supported version; project set up with Node 24.x)
- **Visual Studio Code**

#### 2. Clone the GitHub Repository
Open Command Prompt or Terminal and navigate to your working directory:
```bash
cd Desktop
git clone https://github.com/chukanwobu/cosc4353group34project.git
```

#### 3. Enter Project Folder
```bash
cd cosc4353group34project
```

#### 4. Install Project Dependencies
Run the following command to install all React, Vite, TypeScript, and React Router dependencies:
```bash
npm install
```
*(Do not copy, send, or commit the `node_modules` folder.)*

#### 5. Open Project in VS Code
```bash
code .
```

#### 6. Start Development Server
```bash
npm run dev
```
Open the Local address shown in Vite output (commonly `http://localhost:5173/`).

#### 7. Daily Git Workflow
Always pull the latest changes before beginning new work:
```bash
git pull
```

To commit and push your completed work:
```bash
git status
git add .
git commit -m "Build user dashboard active queue card and service grid"
git push
```
