/* ==========================================================================
   QUEUE MANAGEMENT (ADMIN VIEW)
   --------------------------------------------------------------------------
   Lets an admin pick a service/department, serve the next student,
   reorder the waiting list, and remove tickets with a reason.

   Sections:
     1. Imports
     2. Component: state & derived data
     3. Component: event handlers
     4. Render: header
     5. Render: service tabs
     6. Render: queue control card (header, serving banner, queue table)
     7. Render: remove-user modal
   ========================================================================== */


/* ==========================================================================
   1. IMPORTS
   ========================================================================== */

import React, { useState } from 'react'
import { Link, useSearchParams } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import './QueueManagement.css'


export const QueueManagement: React.FC = () => {

  /* ========================================================================
     2. STATE & DERIVED DATA
     ======================================================================== */

  // Read the optional ?service=<id> query param from the URL
  const [searchParams] = useSearchParams()

  // Queue data and actions from the shared QueueContext
  const {
    services,
    tickets,
    serveNextUser,
    reorderQueue,
    removeUserFromQueue,
  } = useQueue()

  // Default tab: the service in the URL, else the first service, else 1
  const initialServiceId =
    Number(searchParams.get('service')) || (services[0] ? services[0].id : 1)

  // Which service tab is currently selected
  const [selectedServiceId, setSelectedServiceId] = useState<number>(initialServiceId)

  // --- Remove Modal State ---
  // ID of the ticket being removed (null = modal is closed)
  const [removeTicketId, setRemoveTicketId] = useState<string | null>(null)
  // Reason chosen in the modal's dropdown
  const [removeReason, setRemoveReason] = useState('No Show / Did not respond when called')

  // The full service object for the selected tab (falls back to the first service)
  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0]

  // Active tickets (waiting or being served) for the selected service, in queue order
  const serviceTickets = tickets
    .filter(
      (t) =>
        t.serviceId === selectedServiceId &&
        (t.status === 'waiting' || t.status === 'in_progress')
    )
    .sort((a, b) => a.position - b.position)

  // The ticket currently at the counter (if any)
  const currentServing = serviceTickets.find((t) => t.status === 'in_progress')

  // Tickets still waiting to be called
  const waitingList = serviceTickets.filter((t) => t.status === 'waiting')


  /* ========================================================================
     3. EVENT HANDLERS
     ======================================================================== */

  // Confirm the removal: remove the ticket with the chosen reason, then close the modal
  const handleRemoveSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    if (removeTicketId) {
      removeUserFromQueue(removeTicketId, removeReason)
      setRemoveTicketId(null)
    }
  }


  return (
    <div className="queue-management">

      {/* ====================================================================
          4. HEADER
          ==================================================================== */}
      <div className="queue-management-header">
        <div>
          <h1>Administrative Queue Control</h1>
          <p>Serve next students, reorder queue positions, or remove tickets with reasons.</p>
        </div>

        <Link to="/admin">
          <button className="back-button">← Back to Overview</button>
        </Link>
      </div>


      {/* ====================================================================
          5. DEPARTMENT TABS
          One tab per service, with a badge showing its active ticket count
          ==================================================================== */}
      <div className="service-tabs">
        {services.map((service) => {
          // Number of active (waiting or in-progress) tickets for this service
          const queueCount = tickets.filter(
            (t) =>
              t.serviceId === service.id &&
              (t.status === 'waiting' || t.status === 'in_progress')
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


      {/* ====================================================================
          6. MAIN QUEUE CONTROL PANEL
          ==================================================================== */}
      <div className="queue-control-card">

        {/* --- Card header: service info + "Serve Next" button --- */}
        <div className="control-card-header">
          <div>
            <h2>{selectedService ? selectedService.name : 'Queue Management'}</h2>
            <p className="service-subtext">
              Status:{' '}
              <strong>{selectedService?.isOpen ? '🟢 Queue Open' : '🔴 Queue Closed'}</strong>
              {' '}| Avg Duration: {selectedService?.duration} mins
            </p>
          </div>

          {/* Disabled when the queue is empty or the service is closed */}
          <button
            className="btn-serve-next"
            disabled={serviceTickets.length === 0 || !selectedService?.isOpen}
            onClick={() => serveNextUser(selectedServiceId)}
          >
            🔔 Serve Next Student
          </button>
        </div>


        {/* --- Currently serving banner (only shown when someone is at the counter) --- */}
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

            {/* Finishes the current student and calls the next one */}
            <button
              className="btn-complete-service"
              onClick={() => serveNextUser(selectedServiceId)}
            >
              ✓ Complete & Next
            </button>
          </div>
        )}


        {/* --- Queue table (or empty-state message) --- */}
        {waitingList.length === 0 ? (

          // Empty state: nobody waiting
          <div className="empty-queue-msg">
            <p>No students currently waiting in this service queue.</p>
          </div>

        ) : (

          <div className="queue-table-wrapper">
            <table className="admin-queue-table">

              {/* Column headers */}
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

              {/* One row per waiting ticket */}
              <tbody>
                {waitingList.map((ticket, idx) => (
                  <tr key={ticket.id}>

                    {/* Position in line */}
                    <td className="pos-cell">
                      <span className="pos-badge">#{ticket.position}</span>
                    </td>

                    {/* Ticket number */}
                    <td className="ticket-cell">
                      <strong>#{ticket.id}</strong>
                    </td>

                    {/* Student details */}
                    <td className="name-cell">{ticket.userName}</td>
                    <td className="id-cell">{ticket.studentId}</td>
                    <td className="notes-cell">{ticket.notes}</td>

                    {/* Estimated wait time */}
                    <td className="wait-cell">~{ticket.estimatedWait} min</td>

                    {/* Reorder buttons: first row can't go up, last row can't go down */}
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

                    {/* Opens the remove modal for this ticket */}
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


      {/* ====================================================================
          7. REMOVE USER MODAL
          Only rendered while a ticket is selected for removal
          ==================================================================== */}
      {removeTicketId && (
        <div className="modal-overlay">
          <div className="modal-content">
            <h3>Remove Student from Queue</h3>
            <p>Select a removal reason for ticket <strong>#{removeTicketId}</strong>:</p>

            <form onSubmit={handleRemoveSubmit}>

              {/* Reason dropdown (option values are what get passed to removeUserFromQueue) */}
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

              {/* Confirm submits the form; Cancel just closes the modal */}
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
