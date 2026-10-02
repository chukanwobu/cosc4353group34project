import React from 'react'
import { Link } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import './History.css'

export const History: React.FC = () => {
  const { history } = useQueue()

  return (
    <div className="history-container">
      <header className="history-header">
        <div>
          <h1>Queue Visit History</h1>
          <p>Review your past queue check-ins, service completions, and cancellations.</p>
        </div>
        <Link to="/join-queue">
          <button className="btn-primary">Join New Queue</button>
        </Link>
      </header>

      {history.length === 0 ? (
        <div className="history-empty">
          <p>No past queue records found.</p>
        </div>
      ) : (
        <div className="history-card">
          <table className="history-table">
            <thead>
              <tr>
                <th>Ticket ID</th>
                <th>Service Name</th>
                <th>Notes / Reason</th>
                <th>Date / Time</th>
                <th>Status</th>
              </tr>
            </thead>
            <tbody>
              {history.map((ticket) => (
                <tr key={ticket.id}>
                  <td className="ticket-cell">
                    <strong>#{ticket.id}</strong>
                  </td>
                  <td>{ticket.serviceName}</td>
                  <td className="notes-cell">{ticket.notes}</td>
                  <td className="date-cell">{ticket.createdAt}</td>
                  <td>
                    <span className={`status-pill status-pill--${ticket.status}`}>
                      {ticket.status === 'completed' ? 'Completed' : 'Cancelled'}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  )
}

export default History