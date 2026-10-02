import React, { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import './QueueStatus.css'

export const QueueStatus: React.FC = () => {
  const navigate = useNavigate()
  const { tickets, leaveQueue, advanceQueueState } = useQueue()

  const [showLeaveModal, setShowLeaveModal] = useState(false)

  // Find user's current ticket
  const userTicket = tickets.find(
    (t) => t.userName === 'Samuel Sabu' || t.status === 'waiting' || t.status === 'in_progress'
  )

  if (!userTicket) {
    return (
      <div className="queue-status-empty-container">
        <div className="empty-status-card">
          <div className="empty-icon">📍</div>
          <h2>No Active Queue Reservation</h2>
          <p>You are not currently waiting in any campus queue line.</p>
          <button className="btn-primary" onClick={() => navigate('/join-queue')}>
            Browse Services & Join Queue
          </button>
        </div>
      </div>
    )
  }

  const steps = [
    { label: 'Ticket Issued', status: 'completed' },
    {
      label: 'Waiting in Line',
      status: userTicket.status === 'waiting' || userTicket.status === 'in_progress' ? 'active' : 'pending',
    },
    {
      label: 'Next in Line',
      status: userTicket.position <= 2 && userTicket.status === 'waiting' ? 'active' : userTicket.status === 'in_progress' ? 'completed' : 'pending',
    },
    {
      label: 'Being Served',
      status: userTicket.status === 'in_progress' ? 'active' : 'pending',
    },
  ]

  return (
    <div className="queue-status-container">
      <header className="queue-status-header">
        <div>
          <h1>Live Queue Tracker</h1>
          <p>Real-time updates on your position and estimated wait time.</p>
        </div>
        <button className="demo-advance-btn" onClick={advanceQueueState}>
          ⚡ Demo: Advance Queue Position
        </button>
      </header>

      {/* Main Status Hero Card */}
      <section className="status-hero-card">
        <div className="hero-top-row">
          <div className="service-tag">
            <span className="live-pulse"></span> {userTicket.serviceName}
          </div>
          <span className="ticket-number">Ticket #{userTicket.id}</span>
        </div>

        <div className="hero-main-content">
          <div className="hero-position-box">
            <span className="pos-subtext">Your Current Position</span>
            <span className="pos-number">
              {userTicket.status === 'in_progress' ? 'NOW' : `#${userTicket.position}`}
            </span>
            <span className="pos-label">
              {userTicket.status === 'in_progress' ? 'Head to Counter 3' : 'In Line'}
            </span>
          </div>

          <div className="hero-wait-box">
            <span className="wait-subtext">Estimated Remaining Time</span>
            <span className="wait-time">
              {userTicket.status === 'in_progress' ? '0 min' : `~${userTicket.estimatedWait} min`}
            </span>
            <span className="wait-hint">Updated live in real-time</span>
          </div>
        </div>

        {/* Stepper Progress Bar */}
        <div className="stepper-container">
          {steps.map((step, idx) => (
            <div key={idx} className={`stepper-item stepper-item--${step.status}`}>
              <div className="stepper-node">{step.status === 'completed' ? '✓' : idx + 1}</div>
              <span className="stepper-label">{step.label}</span>
              {idx < steps.length - 1 && <div className="stepper-line"></div>}
            </div>
          ))}
        </div>
      </section>

      {/* Details & Actions Grid */}
      <section className="status-details-grid">
        {/* Ticket Details */}
        <div className="detail-card">
          <h2>Reservation Details</h2>
          <dl className="details-list">
            <div className="detail-item">
              <dt>Student Name:</dt>
              <dd>{userTicket.userName}</dd>
            </div>
            <div className="detail-item">
              <dt>Student ID:</dt>
              <dd>{userTicket.studentId}</dd>
            </div>
            <div className="detail-item">
              <dt>Visit Reason:</dt>
              <dd>{userTicket.notes}</dd>
            </div>
            <div className="detail-item">
              <dt>Joined Queue At:</dt>
              <dd>{userTicket.createdAt}</dd>
            </div>
          </dl>
        </div>

        {/* Location & Guidelines */}
        <div className="detail-card">
          <h2>Service Station Info</h2>
          <div className="station-info-box">
            <div className="station-row">
              <span className="s-icon">🏫</span>
              <div>
                <strong>Location:</strong>
                <p>Student Services Building (SSB), Floor 2, Counter 3</p>
              </div>
            </div>
            <div className="station-row">
              <span className="s-icon">🔔</span>
              <div>
                <strong>Notification Policy:</strong>
                <p>Please remain near the SSB lobby when your position reaches #1 or #2.</p>
              </div>
            </div>
          </div>

          <div className="action-buttons-wrapper">
            <button
              className="btn-danger-full"
              onClick={() => setShowLeaveModal(true)}
            >
              Cancel / Leave Queue Line
            </button>
          </div>
        </div>
      </section>

      {/* Leave Confirmation Modal */}
      {showLeaveModal && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Confirm Leaving Queue</h3>
            <p>
              Are you sure you want to cancel ticket <strong>#{userTicket.id}</strong>? You will lose your position (#{userTicket.position}) in line.
            </p>
            <div className="modal-actions">
              <button
                className="btn-modal-confirm"
                onClick={() => {
                  leaveQueue(userTicket.id)
                  setShowLeaveModal(false)
                  navigate('/dashboard')
                }}
              >
                Yes, Leave Line
              </button>
              <button
                className="btn-modal-cancel"
                onClick={() => setShowLeaveModal(false)}
              >
                No, Keep My Spot
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}

export default QueueStatus