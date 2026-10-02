import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import './QueueManagement.css'

export const QueueManagement: React.FC = () => {
  const [searchParams] = useSearchParams()
  const { services, tickets, serveNextUser, reorderQueue, removeUserFromQueue } = useQueue()

  const initialServiceId = Number(searchParams.get('service')) || (services[0] ? services[0].id : 1)
  const [selectedServiceId, setSelectedServiceId] = useState<number>(initialServiceId)

  // Remove Modal State
  const [removeTicketId, setRemoveTicketId] = useState<string | null>(null)
  const [removeReason, setRemoveReason] = useState('No Show / Did not respond when called')

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0]

  // Filter queue for selected service
  const serviceTickets = tickets
    .filter((t) => t.serviceId === selectedServiceId && (t.status === 'waiting' || t.status === 'in_progress'))
    .sort((a, b) => a.position - b.position)

  const currentServing = serviceTickets.find((t) => t.status === 'in_progress')
  const waitingList = serviceTickets.filter((t) => t.status === 'waiting')

  const handleRemoveSubmit = (e: React.FormEvent) => {
    e.preventDefault()
    if (removeTicketId) {
      removeUserFromQueue(removeTicketId, removeReason)
      setRemoveTicketId(null)
    }
  }

  return (
    <div className="queue-management">
      <div className="queue-management-header">
        <div>
          <h1>Administrative Queue Control</h1>
          <p>Serve next students, reorder queue positions, or remove tickets with reasons.</p>
        </div>
        <Link to="/admin">
          <button className="back-button">← Back to Overview</button>
        </Link>
      </div>

      {/* Department Tabs */}
      <div className="service-tabs">
        {services.map((service) => {
          const queueCount = tickets.filter(
            (t) => t.serviceId === service.id && (t.status === 'waiting' || t.status === 'in_progress')
          ).length

          return (
            <button
              key={service.id}
              className={`tab-btn ${service.id === selectedServiceId ? 'tab-btn--active' : ''}`}
              onClick={() => setSelectedServiceId(service.id)}
            >
              <span className="tab-name">{service.name}</span>
              <span className="tab-badge">{queueCount}</span>
            </button>
          )
        })}
      </div>

      {/* Main Queue Control Panel */}
      <div className="queue-control-card">
        <div className="control-card-header">
          <div>
            <h2>{selectedService ? selectedService.name : 'Queue Management'}</h2>
            <p className="service-subtext">
              Status: <strong>{selectedService?.isOpen ? '🟢 Queue Open' : '🔴 Queue Closed'}</strong> | Avg Duration: {selectedService?.duration} mins
            </p>
          </div>

          <button
            className="btn-serve-next"
            disabled={serviceTickets.length === 0 || !selectedService?.isOpen}
            onClick={() => serveNextUser(selectedServiceId)}
          >
            🔔 Serve Next Student
          </button>
        </div>

        {/* Current Serving Banner */}
        {currentServing && (
          <div className="currently-serving-banner">
            <div className="serving-tag">Currently Serving at Counter</div>
            <div className="serving-details">
              <div className="serving-main">
                <span className="serving-id">Ticket #{currentServing.id}</span>
                <span className="serving-name">{currentServing.userName}</span>
                <span className="serving-idnum">ID: {currentServing.studentId}</span>
              </div>
              <p className="serving-notes">
                <strong>Reason:</strong> {currentServing.notes}
              </p>
            </div>
            <button
              className="btn-complete-service"
              onClick={() => serveNextUser(selectedServiceId)}
            >
              ✓ Complete & Next
            </button>
          </div>
        )}

        {/* Queue Table */}
        {waitingList.length === 0 ? (
          <div className="empty-queue-msg">
            <p>No students currently waiting in this service queue.</p>
          </div>
        ) : (
          <div className="queue-table-wrapper">
            <table className="admin-queue-table">
              <thead>
                <tr>
                  <th>Pos #</th>
                  <th>Ticket</th>
                  <th>Student Name</th>
                  <th>Student ID</th>
                  <th>Reason / Notes</th>
                  <th>Est. Wait</th>
                  <th>Reorder</th>
                  <th>Actions</th>
                </tr>
              </thead>
              <tbody>
                {waitingList.map((ticket, idx) => (
                  <tr key={ticket.id}>
                    <td className="pos-cell">
                      <span className="pos-badge">#{ticket.position}</span>
                    </td>
                    <td className="ticket-cell">
                      <strong>#{ticket.id}</strong>
                    </td>
                    <td className="name-cell">{ticket.userName}</td>
                    <td className="id-cell">{ticket.studentId}</td>
                    <td className="notes-cell">{ticket.notes}</td>
                    <td className="wait-cell">~{ticket.estimatedWait} min</td>
                    <td className="reorder-cell">
                      <button
                        className="btn-reorder"
                        disabled={idx === 0}
                        onClick={() => reorderQueue(selectedServiceId, ticket.id, 'up')}
                        title="Move Up in Queue"
                      >
                        ▲
                      </button>
                      <button
                        className="btn-reorder"
                        disabled={idx === waitingList.length - 1}
                        onClick={() => reorderQueue(selectedServiceId, ticket.id, 'down')}
                        title="Move Down in Queue"
                      >
                        ▼
                      </button>
                    </td>
                    <td className="actions-cell">
                      <button
                        className="btn-remove-user"
                        onClick={() => setRemoveTicketId(ticket.id)}
                      >
                        Remove
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Remove User Modal */}
      {removeTicketId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Remove Student from Queue</h3>
            <p>Select a removal reason for ticket <strong>#{removeTicketId}</strong>:</p>

            <form onSubmit={handleRemoveSubmit}>
              <div className="form-group">
                <label>Removal Reason</label>
                <select
                  value={removeReason}
                  onChange={(e) => setRemoveReason(e.target.value)}
                >
                  <option value="No Show / Did not respond when called">No Show / Did not respond</option>
                  <option value="Cancelled by request">Student requested cancellation</option>
                  <option value="Issue resolved out of line">Issue resolved out of line</option>
                  <option value="Incorrect department selection">Redirected to different department</option>
                </select>
              </div>

              <div className="modal-actions">
                <button type="submit" className="btn-modal-confirm">
                  Confirm Removal
                </button>
                <button
                  type="button"
                  className="btn-modal-cancel"
                  onClick={() => setRemoveTicketId(null)}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

export default QueueManagement