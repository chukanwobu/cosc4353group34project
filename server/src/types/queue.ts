export type TicketStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled'

export interface Ticket {
  id: string
  serviceId: number
  serviceName: string
  userName: string
  studentId: string
  notes: string
  position: number
  status: TicketStatus
  estimatedWait: number // in minutes
  createdAt: string
  completedAt?: string
}

export interface JoinQueueDTO {
  serviceId: number
  userName: string
  studentId: string
  notes: string
}

export interface NotificationItem {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'alert'
  timestamp: string
  userId?: string
}
