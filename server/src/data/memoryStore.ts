import { User } from '../types/user'
import { Service } from '../types/service'
import { Ticket, NotificationItem } from '../types/queue'

export class MemoryStore {
  public users: User[] = []
  public services: Service[] = []
  public tickets: Ticket[] = []
  public history: Ticket[] = []
  public notifications: NotificationItem[] = []

  constructor() {
    this.seed()
  }

  public reset(): void {
    this.users = []
    this.services = []
    this.tickets = []
    this.history = []
    this.notifications = []
    this.seed()
  }

  private seed(): void {
    // Default demo accounts (Required for A2 and A3 consistency)
    this.users = [
      {
        id: 'usr-1',
        email: 'user@queuesmart.com',
        password: 'password123',
        name: 'Samuel Sabu',
        role: 'user',
        studentId: '1984203',
        createdAt: new Date().toISOString()
      },
      {
        id: 'usr-2',
        email: 'admin@queuesmart.com',
        password: 'admin1234',
        name: 'Campus Administrator',
        role: 'admin',
        createdAt: new Date().toISOString()
      }
    ]

    // Default services
    this.services = [
      {
        id: 1,
        name: 'Academic Advising',
        description: 'Degree planning, course registration overrides, and graduation checks.',
        duration: 15,
        priority: 'high',
        isOpen: true
      },
      {
        id: 2,
        name: 'Financial Aid & Scholarships',
        description: 'FAFSA counseling, grant inquiries, and tuition payment plan support.',
        duration: 20,
        priority: 'medium',
        isOpen: true
      },
      {
        id: 3,
        name: 'Registrar & Records',
        description: 'Transcript requests, diploma processing, and enrollment verification.',
        duration: 10,
        priority: 'medium',
        isOpen: true
      },
      {
        id: 4,
        name: 'Campus IT Help Desk',
        description: 'Password resets, software licensing, campus Wi-Fi, and hardware support.',
        duration: 12,
        priority: 'low',
        isOpen: false
      }
    ]

    // Default active tickets
    this.tickets = [
      {
        id: 'TICK-101',
        serviceId: 1,
        serviceName: 'Academic Advising',
        userName: 'Samuel Sabu',
        studentId: '1984203',
        notes: 'Need degree plan approval for COSC 4353.',
        position: 1,
        status: 'in_progress',
        estimatedWait: 0,
        createdAt: '10:00 AM'
      },
      {
        id: 'TICK-102',
        serviceId: 1,
        serviceName: 'Academic Advising',
        userName: 'Jordan Lee',
        studentId: '1849201',
        notes: 'Questions about elective prerequisites.',
        position: 2,
        status: 'waiting',
        estimatedWait: 15,
        createdAt: '10:15 AM'
      }
    ]

    // Default history
    this.history = [
      {
        id: 'TICK-098',
        serviceId: 3,
        serviceName: 'Registrar & Records',
        userName: 'Samuel Sabu',
        studentId: '1984203',
        notes: 'Official transcript copy pickup.',
        position: 0,
        status: 'completed',
        estimatedWait: 0,
        createdAt: 'Yesterday at 2:15 PM'
      }
    ]

    // Default notifications
    this.notifications = [
      {
        id: 'notif-1',
        message: 'Welcome to QueueSmart Backend API Server!',
        type: 'info',
        timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })
      }
    ]
  }
}

export const store = new MemoryStore()
