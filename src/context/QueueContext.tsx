import React, { createContext, useContext, useState } from 'react'

export type Priority = 'low' | 'medium' | 'high'

export type Service = {
  id: number
  name: string
  description: string
  duration: number // in minutes
  priority: Priority
  isOpen: boolean
}

export type TicketStatus = 'waiting' | 'in_progress' | 'completed' | 'cancelled'

export type Ticket = {
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
}

export type NotificationItem = {
  id: string
  message: string
  type: 'info' | 'success' | 'warning' | 'alert'
  timestamp: string
}

type UserRole = 'user' | 'admin'

interface QueueContextType {
  services: Service[]
  tickets: Ticket[]
  history: Ticket[]
  notifications: NotificationItem[]
  currentRole: UserRole
  setCurrentRole: (role: UserRole) => void
  addNotification: (message: string, type?: NotificationItem['type']) => void
  removeNotification: (id: string) => void
  toggleServiceStatus: (id: number) => void
  addService: (service: Omit<Service, 'id' | 'isOpen'>) => void
  updateService: (id: number, service: Omit<Service, 'id' | 'isOpen'>) => void
  deleteService: (id: number) => void
  joinQueue: (serviceId: number, userName: string, studentId: string, notes: string) => Ticket | null
  leaveQueue: (ticketId: string) => void
  serveNextUser: (serviceId: number) => Ticket | null
  reorderQueue: (serviceId: number, ticketId: string, direction: 'up' | 'down') => void
  removeUserFromQueue: (ticketId: string, reason: string) => void
  advanceQueueState: () => void
}

const initialServices: Service[] = [
  {
    id: 1,
    name: 'Academic Advising',
    description: 'Degree planning, course registration overrides, and graduation checks.',
    duration: 15,
    priority: 'high',
    isOpen: true,
  },
  {
    id: 2,
    name: 'Financial Aid & Scholarships',
    description: 'FAFSA counseling, grant inquiries, and tuition payment plan support.',
    duration: 20,
    priority: 'medium',
    isOpen: true,
  },
  {
    id: 3,
    name: 'Registrar & Records',
    description: 'Transcript requests, diploma processing, and enrollment verification.',
    duration: 10,
    priority: 'medium',
    isOpen: true,
  },
  {
    id: 4,
    name: 'Campus IT Help Desk',
    description: 'Password resets, software licensing, campus Wi-Fi, and hardware support.',
    duration: 12,
    priority: 'low',
    isOpen: false,
  },
]

const initialTickets: Ticket[] = [
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
    createdAt: new Date(Date.now() - 25 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
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
    createdAt: new Date(Date.now() - 15 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'TICK-103',
    serviceId: 1,
    serviceName: 'Academic Advising',
    userName: 'Luis Rodriguez',
    studentId: '2049182',
    notes: 'Minor audit check.',
    position: 3,
    status: 'waiting',
    estimatedWait: 30,
    createdAt: new Date(Date.now() - 5 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
  {
    id: 'TICK-104',
    serviceId: 2,
    serviceName: 'Financial Aid & Scholarships',
    userName: 'Chuka Nwobu',
    studentId: '1938204',
    notes: 'Work-study authorization check.',
    position: 1,
    status: 'waiting',
    estimatedWait: 20,
    createdAt: new Date(Date.now() - 10 * 60 * 1000).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
  },
]

const initialHistory: Ticket[] = [
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
    createdAt: 'Yesterday at 2:15 PM',
  },
  {
    id: 'TICK-089',
    serviceId: 1,
    serviceName: 'Academic Advising',
    userName: 'Samuel Sabu',
    studentId: '1984203',
    notes: 'Drop course request.',
    position: 0,
    status: 'cancelled',
    estimatedWait: 0,
    createdAt: 'Oct 01, 2026',
  },
]

const QueueContext = createContext<QueueContextType | undefined>(undefined)

export const QueueProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [services, setServices] = useState<Service[]>(initialServices)
  const [tickets, setTickets] = useState<Ticket[]>(initialTickets)
  const [history, setHistory] = useState<Ticket[]>(initialHistory)
  const [notifications, setNotifications] = useState<NotificationItem[]>([
    {
      id: 'n-1',
      message: 'Welcome to QueueSmart! You can switch between User and Admin modes anytime using the top bar.',
      type: 'info',
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    },
  ])
  const [currentRole, setCurrentRole] = useState<UserRole>('user')

  const addNotification = (message: string, type: NotificationItem['type'] = 'info') => {
    const newNotif: NotificationItem = {
      id: `notif-${Date.now()}-${Math.random().toString(36).substr(2, 4)}`,
      message,
      type,
      timestamp: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }
    setNotifications((prev) => [newNotif, ...prev.slice(0, 4)])
  }

  const removeNotification = (id: string) => {
    setNotifications((prev) => prev.filter((n) => n.id !== id))
  }

  const toggleServiceStatus = (id: number) => {
    setServices((prev) =>
      prev.map((s) => {
        if (s.id === id) {
          const nextStatus = !s.isOpen
          addNotification(
            `Service "${s.name}" is now ${nextStatus ? 'OPEN' : 'CLOSED'}.`,
            nextStatus ? 'success' : 'warning'
          )
          return { ...s, isOpen: nextStatus }
        }
        return s
      })
    )
  }

  const addService = (data: Omit<Service, 'id' | 'isOpen'>) => {
    const newService: Service = {
      ...data,
      id: Date.now(),
      isOpen: true,
    }
    setServices((prev) => [...prev, newService])
    addNotification(`New service "${data.name}" added successfully.`, 'success')
  }

  const updateService = (id: number, data: Omit<Service, 'id' | 'isOpen'>) => {
    setServices((prev) =>
      prev.map((s) => (s.id === id ? { ...s, ...data } : s))
    )
    addNotification(`Service "${data.name}" updated.`, 'info')
  }

  const deleteService = (id: number) => {
    const target = services.find((s) => s.id === id)
    setServices((prev) => prev.filter((s) => s.id !== id))
    if (target) addNotification(`Service "${target.name}" removed.`, 'warning')
  }

  const joinQueue = (serviceId: number, userName: string, studentId: string, notes: string): Ticket | null => {
    const targetService = services.find((s) => s.id === serviceId)
    if (!targetService || !targetService.isOpen) {
      addNotification('Cannot join: Service is currently closed.', 'alert')
      return null
    }

    const serviceQueue = tickets.filter((t) => t.serviceId === serviceId && t.status !== 'completed' && t.status !== 'cancelled')
    const position = serviceQueue.length + 1
    const estimatedWait = (position - 1) * targetService.duration

    const newTicket: Ticket = {
      id: `TICK-${Math.floor(100 + Math.random() * 900)}`,
      serviceId,
      serviceName: targetService.name,
      userName,
      studentId,
      notes,
      position,
      status: 'waiting',
      estimatedWait,
      createdAt: new Date().toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' }),
    }

    setTickets((prev) => [...prev, newTicket])
    addNotification(
      `Successfully joined queue for ${targetService.name}! Ticket #${newTicket.id} (Position ${position}).`,
      'success'
    )
    return newTicket
  }

  const leaveQueue = (ticketId: string) => {
    const target = tickets.find((t) => t.id === ticketId)
    if (!target) return

    const cancelledTicket: Ticket = { ...target, status: 'cancelled' }
    setTickets((prev) => prev.filter((t) => t.id !== ticketId))
    setHistory((prev) => [cancelledTicket, ...prev])

    // Update positions of remaining tickets in same service
    setTickets((prev) =>
      prev.map((t) => {
        if (t.serviceId === target.serviceId && t.position > target.position) {
          const newPos = t.position - 1
          const serviceObj = services.find((s) => s.id === t.serviceId)
          const duration = serviceObj ? serviceObj.duration : 15
          return {
            ...t,
            position: newPos,
            estimatedWait: Math.max(0, (newPos - 1) * duration),
          }
        }
        return t
      })
    )

    addNotification(`Left queue for ticket #${ticketId}.`, 'info')
  }

  const serveNextUser = (serviceId: number): Ticket | null => {
    const serviceQueue = tickets
      .filter((t) => t.serviceId === serviceId && (t.status === 'waiting' || t.status === 'in_progress'))
      .sort((a, b) => a.position - b.position)

    if (serviceQueue.length === 0) {
      addNotification('No users currently waiting in this queue.', 'info')
      return null
    }

    const currentInProgress = serviceQueue.find((t) => t.status === 'in_progress')
    if (currentInProgress) {
      // Mark current in_progress as completed
      const completed: Ticket = { ...currentInProgress, status: 'completed' }
      setHistory((prev) => [completed, ...prev])
      setTickets((prev) => prev.filter((t) => t.id !== currentInProgress.id))
      addNotification(`Served and completed ticket #${currentInProgress.id} (${currentInProgress.userName}).`, 'success')
    }

    // Now set next waiting user to in_progress
    const remainingWaiting = tickets.filter((t) => t.serviceId === serviceId && t.id !== currentInProgress?.id && t.status === 'waiting')
    if (remainingWaiting.length > 0) {
      const nextUser = remainingWaiting[0]
      setTickets((prev) =>
        prev.map((t) => {
          if (t.id === nextUser.id) {
            return { ...t, status: 'in_progress', position: 1, estimatedWait: 0 }
          }
          if (t.serviceId === serviceId && t.position > nextUser.position) {
            const newPos = t.position - 1
            const serviceObj = services.find((s) => s.id === t.serviceId)
            const duration = serviceObj ? serviceObj.duration : 15
            return { ...t, position: newPos, estimatedWait: (newPos - 1) * duration }
          }
          return t
        })
      )
      addNotification(`Now serving ${nextUser.userName} (Ticket #${nextUser.id})!`, 'success')
      return nextUser
    }

    return null
  }

  const reorderQueue = (serviceId: number, ticketId: string, direction: 'up' | 'down') => {
    const serviceTickets = tickets
      .filter((t) => t.serviceId === serviceId && t.status === 'waiting')
      .sort((a, b) => a.position - b.position)

    const index = serviceTickets.findIndex((t) => t.id === ticketId)
    if (index === -1) return
    if (direction === 'up' && index === 0) return
    if (direction === 'down' && index === serviceTickets.length - 1) return

    const targetIndex = direction === 'up' ? index - 1 : index + 1
    const currentTicket = serviceTickets[index]
    const swapTicket = serviceTickets[targetIndex]

    const serviceObj = services.find((s) => s.id === serviceId)
    const duration = serviceObj ? serviceObj.duration : 15

    setTickets((prev) =>
      prev.map((t) => {
        if (t.id === currentTicket.id) {
          const newPos = swapTicket.position
          return { ...t, position: newPos, estimatedWait: (newPos - 1) * duration }
        }
        if (t.id === swapTicket.id) {
          const newPos = currentTicket.position
          return { ...t, position: newPos, estimatedWait: (newPos - 1) * duration }
        }
        return t
      })
    )

    addNotification(`Reordered queue position for Ticket #${ticketId}.`, 'info')
  }

  const removeUserFromQueue = (ticketId: string, reason: string) => {
    const target = tickets.find((t) => t.id === ticketId)
    if (!target) return

    const cancelled: Ticket = { ...target, status: 'cancelled', notes: `${target.notes} [Removed by Admin: ${reason}]` }
    setTickets((prev) => prev.filter((t) => t.id !== ticketId))
    setHistory((prev) => [cancelled, ...prev])

    // Update positions
    setTickets((prev) =>
      prev.map((t) => {
        if (t.serviceId === target.serviceId && t.position > target.position) {
          const newPos = t.position - 1
          const serviceObj = services.find((s) => s.id === t.serviceId)
          const duration = serviceObj ? serviceObj.duration : 15
          return { ...t, position: newPos, estimatedWait: Math.max(0, (newPos - 1) * duration) }
        }
        return t
      })
    )

    addNotification(`Removed ticket #${ticketId} (${target.userName}) from queue (${reason}).`, 'warning')
  }

  const advanceQueueState = () => {
    // Helper to simulate status advancement for demonstration
    if (tickets.length === 0) return
    const waitingTickets = tickets.filter((t) => t.status === 'waiting')
    if (waitingTickets.length > 0) {
      const target = waitingTickets[0]
      serveNextUser(target.serviceId)
    } else {
      addNotification('All active tickets processed!', 'info')
    }
  }

  return (
    <QueueContext.Provider
      value={{
        services,
        tickets,
        history,
        notifications,
        currentRole,
        setCurrentRole,
        addNotification,
        removeNotification,
        toggleServiceStatus,
        addService,
        updateService,
        deleteService,
        joinQueue,
        leaveQueue,
        serveNextUser,
        reorderQueue,
        removeUserFromQueue,
        advanceQueueState,
      }}
    >
      {children}
    </QueueContext.Provider>
  )
}

export const useQueue = () => {
  const context = useContext(QueueContext)
  if (!context) {
    throw new Error('useQueue must be used within a QueueProvider')
  }
  return context
}
