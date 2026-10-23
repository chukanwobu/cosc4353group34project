export type Priority = 'low' | 'medium' | 'high'

export interface Service {
  id: number
  name: string
  description: string
  duration: number // in minutes
  priority: Priority
  isOpen: boolean
  createdAt?: string
}

export interface CreateServiceDTO {
  name: string
  description: string
  duration: number
  priority: Priority
}

export interface UpdateServiceDTO {
  name?: string
  description?: string
  duration?: number
  priority?: Priority
  isOpen?: boolean
}
