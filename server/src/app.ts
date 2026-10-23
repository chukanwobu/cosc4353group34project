import express from 'express'
import cors from 'cors'
import authRoutes from './routes/authRoutes'
import serviceRoutes from './routes/serviceRoutes'
import queueRoutes from './routes/queueRoutes'
import historyRoutes from './routes/historyRoutes'
import notifRoutes from './routes/notifRoutes'

export const app = express()

// Middleware
app.use(cors())
app.use(express.json())

// Health check endpoint
app.get('/api/health', (_req, res) => {
  res.status(200).json({ status: 'ok', service: 'QueueSmart API' })
})

// Domain Module Routes
app.use('/api/auth', authRoutes)          // Samuel Sabu: Authentication & Role Management
app.use('/api/services', serviceRoutes)  // Chuka: Service Management CRUD
app.use('/api/queue', queueRoutes)        // Jordan: Queue Management & Wait-Time Estimation
app.use('/api/history', historyRoutes)    // Luis: History Tracking
app.use('/api/notifications', notifRoutes)// Luis: Notification Trigger Module

export default app
