import React from 'react'
import { Link } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import './AdminDashboard.css'

export const AdminDashboard: React.FC = () => {
  const { services, tickets, toggleServiceStatus } = useQueue()

  const openServices = services.filter((s) => s.isOpen).length
  const totalWaiting = tickets.filter((t) => t.status === 'waiting' || t.status === 'in_progress').length

  return (
    <div className="admin-dashboard">
      <div className="admin-header">
        <div>
          <h1>Admin Control Dashboard</h1>
          <p>Real-time campus queue oversight and service management.</p>
        </div>
        <div className="admin-actions-top">
          <Link to="/admin/services">
            <button className="btn-secondary">⚙️ Manage Services</button>
          </Link>
          <Link to="/admin/queue">
            <button className="btn-primary">📋 Manage Live Queues</button>
          </Link>
        </div>
      </div>

      {/* Overview Section */}
      <div className="overview">
        <h2>Overview Metrics</h2>

        <div className="overview-cards">
          <div className="stat-card">
            <h3>Active / Open Services</h3>
            <p className="stat-num">{openServices} / {services.length}</p>
          </div>

          <div className="stat-card">
            <h3>Total People Waiting</h3>
            <p className="stat-num">{totalWaiting}</p>
          </div>

          <div className="stat-card">
            <h3>Avg Wait Across Services</h3>
            <p className="stat-num">~14 min</p>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="services-section">
        <div className="services-header">
          <h2>Services & Queue Status</h2>
          <Link to="/admin/services">
            <button className="btn-link">Edit Services →</button>
          </Link>
        </div>

        <div className="services-list">
          {services.map((service) => {
            const queueLen = tickets.filter(
              (t) => t.serviceId === service.id && (t.status === 'waiting' || t.status === 'in_progress')
            ).length
            const estWait = queueLen * service.duration

            return (
              <div className="service-card" key={service.id}>
                <div className="service-card-header">
                  <h3>{service.name}</h3>
                  <span className={`status-tag ${service.isOpen ? 'tag-open' : 'tag-closed'}`}>
                    {service.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>

                <p className="service-desc-text">{service.description}</p>

                <div className="service-metrics-row">
                  <p>People Waiting: <strong>{queueLen}</strong></p>
                  <p>Estimated Wait: <strong>{estWait} min</strong></p>
                  <p>Priority: <strong>{service.priority.toUpperCase()}</strong></p>
                </div>

                <div className="service-card-controls">
                  <button
                    className={`toggle-btn ${service.isOpen ? 'toggle-close' : 'toggle-open'}`}
                    onClick={() => toggleServiceStatus(service.id)}
                  >
                    {service.isOpen ? 'Close Queue' : 'Open Queue'}
                  </button>
                  <Link to={`/admin/queue?service=${service.id}`}>
                    <button className="btn-manage-q">View Queue ({queueLen})</button>
                  </Link>
                </div>
              </div>
            )
          })}
        </div>
      </div>
    </div>
  )
}

export default AdminDashboard