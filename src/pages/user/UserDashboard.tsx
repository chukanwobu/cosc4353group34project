import React from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import './UserDashboard.css'

export const UserDashboard: React.FC = () => {
  const navigate = useNavigate()
  const { services, tickets, leaveQueue } = useQueue()

  // Find user's active ticket (e.g. Samuel Sabu's ticket or the latest waiting ticket)
  const activeTicket = tickets.find(
    (t) => t.userName === 'Samuel Sabu' || t.status === 'waiting' || t.status === 'in_progress'
  )

  const openServices = services.filter((s) => s.isOpen)

  return (
    <div className="user-dashboard-container">
      {/* Header Banner */}
      <header className="user-dashboard-header">
        <div>
          <h1 className="user-dashboard-title">Welcome back, Samuel!</h1>
          <p className="user-dashboard-subtitle">
            Manage your campus queue reservations, check live wait times, or join a service queue.
          </p>
        </div>
        <div className="header-quick-stats">
          <div className="stat-pill">
            <span className="stat-label">Open Services:</span>
            <span className="stat-value">{openServices.length} / {services.length}</span>
          </div>
        </div>
      </header>

      {/* Active Ticket Banner / Card */}
      {activeTicket ? (
        <section className="active-ticket-card" aria-label="Active Queue Status">
          <div className="active-ticket-header">
            <div className="active-ticket-tag">
              <span className="pulsing-dot"></span> Active Queue Reservation
            </div>
            <span className="ticket-id">#{activeTicket.id}</span>
          </div>

          <div className="active-ticket-body">
            <div className="ticket-info">
              <h2>{activeTicket.serviceName}</h2>
              <p className="ticket-notes">
                <strong>Reason:</strong> {activeTicket.notes}
              </p>
              <div className="ticket-timestamps">
                <span>Joined at {activeTicket.createdAt}</span>
              </div>
            </div>

            <div className="ticket-metrics">
              <div className="metric-box metric-box--highlight">
                <span className="metric-title">Position in Line</span>
                <span className="metric-number">#{activeTicket.position}</span>
              </div>

              <div className="metric-box">
                <span className="metric-title">Estimated Wait</span>
                <span className="metric-number">
                  {activeTicket.status === 'in_progress' ? 'NOW' : `${activeTicket.estimatedWait} min`}
                </span>
              </div>

              <div className="metric-box">
                <span className="metric-title">Status</span>
                <span className={`status-badge status-badge--${activeTicket.status}`}>
                  {activeTicket.status === 'in_progress' ? 'Being Served' : 'Waiting in Line'}
                </span>
              </div>
            </div>
          </div>

          <div className="active-ticket-actions">
            <button
              className="btn-primary"
              onClick={() => navigate('/queue-status')}
            >
              View Live Tracker & Details
            </button>
            <button
              className="btn-danger-outline"
              onClick={() => leaveQueue(activeTicket.id)}
            >
              Leave Line
            </button>
          </div>
        </section>
      ) : (
        <section className="no-active-ticket-card">
          <div className="no-ticket-icon">⏱️</div>
          <div className="no-ticket-content">
            <h3>You are not currently in any queue</h3>
            <p>Select a campus service below to estimate your wait time and join the line.</p>
          </div>
          <button className="btn-primary" onClick={() => navigate('/join-queue')}>
            Join a Queue Now
          </button>
        </section>
      )}

      {/* Quick Action Grid */}
      <section className="dashboard-grid">
        {/* Available Services */}
        <div className="dashboard-card main-services-card">
          <div className="card-header">
            <h2>Available Services & Current Queues</h2>
            <Link to="/join-queue" className="view-all-link">
              View All & Join →
            </Link>
          </div>

          <div className="services-grid">
            {services.map((service) => {
              const queueLength = tickets.filter(
                (t) => t.serviceId === service.id && (t.status === 'waiting' || t.status === 'in_progress')
              ).length
              const estWait = queueLength * service.duration

              return (
                <div key={service.id} className={`service-item-card ${!service.isOpen ? 'service-item--closed' : ''}`}>
                  <div className="service-item-header">
                    <h3>{service.name}</h3>
                    <span className={`service-badge ${service.isOpen ? 'badge-open' : 'badge-closed'}`}>
                      {service.isOpen ? 'Open' : 'Closed'}
                    </span>
                  </div>

                  <p className="service-desc">{service.description}</p>

                  <div className="service-stats-row">
                    <div>
                      <span className="stat-sublabel">People Waiting:</span>
                      <strong>{queueLength}</strong>
                    </div>
                    <div>
                      <span className="stat-sublabel">Est. Wait:</span>
                      <strong>~{estWait} min</strong>
                    </div>
                    <div>
                      <span className="stat-sublabel">Avg Duration:</span>
                      <strong>{service.duration} min</strong>
                    </div>
                  </div>

                  <button
                    className="btn-secondary service-join-btn"
                    disabled={!service.isOpen}
                    onClick={() => navigate(`/join-queue?service=${service.id}`)}
                  >
                    {service.isOpen ? 'Join Queue' : 'Queue Closed'}
                  </button>
                </div>
              )
            })}
          </div>
        </div>

        {/* User Sidebar Cards */}
        <aside className="dashboard-sidebar">
          {/* Quick Shortcuts */}
          <div className="dashboard-card shortcuts-card">
            <h3>Quick Actions</h3>
            <ul className="quick-links-list">
              <li>
                <Link to="/join-queue" className="quick-link-item">
                  <span className="quick-icon">➕</span>
                  <div>
                    <strong>Join Queue</strong>
                    <small>Select service & reserve spot</small>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/queue-status" className="quick-link-item">
                  <span className="quick-icon">📍</span>
                  <div>
                    <strong>Queue Tracker</strong>
                    <small>Check live line position</small>
                  </div>
                </Link>
              </li>
              <li>
                <Link to="/history" className="quick-link-item">
                  <span className="quick-icon">📜</span>
                  <div>
                    <strong>Visit History</strong>
                    <small>Review past tickets</small>
                  </div>
                </Link>
              </li>
            </ul>
          </div>

          {/* System Notifications Box */}
          <div className="dashboard-card info-card">
            <h3>📢 Campus Announcements</h3>
            <div className="info-content">
              <p>
                <strong>Academic Advising Peak Hours:</strong> Advising wait times increase during mid-term registration. Please join early.
              </p>
              <p>
                <strong>Virtual Check-in:</strong> You will receive real-time notifications on your screen as your turn approaches.
              </p>
            </div>
          </div>
        </aside>
      </section>
    </div>
  )
}

export default UserDashboard