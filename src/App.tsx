import { Routes, Route } from 'react-router-dom'

import Login from './pages/auth/Login'
import Register from './pages/auth/Register'

import UserDashboard from './pages/user/UserDashboard'
import JoinQueue from './pages/user/JoinQueue'
import QueueStatus from './pages/user/QueueStatus'
import History from './pages/user/History'

import AdminDashboard from './pages/admin/AdminDashboard'
import ServiceManagement from './pages/admin/ServiceManagement'
import QueueManagement from './pages/admin/QueueManagement'

function App() {
  return (
    <Routes>
      <Route path="/" element={<Login />} />
      <Route path="/register" element={<Register />} />

      <Route path="/dashboard" element={<UserDashboard />} />
      <Route path="/join-queue" element={<JoinQueue />} />
      <Route path="/queue-status" element={<QueueStatus />} />
      <Route path="/history" element={<History />} />

      <Route path="/admin" element={<AdminDashboard />} />
      <Route path="/admin/services" element={<ServiceManagement />} />
      <Route path="/admin/queue" element={<QueueManagement />} />
    </Routes>
  )
}

export default App