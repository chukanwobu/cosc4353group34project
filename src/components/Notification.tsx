import React from 'react'
import { useQueue } from '../context/QueueContext'
import './Notification.css'

export const Notification: React.FC = () => {
  const { notifications, removeNotification } = useQueue()

  if (notifications.length === 0) return null

  return (
    <div className="notification-container" aria-live="polite" aria-atomic="true">
      {notifications.map((notif) => (
        <div key={notif.id} className={`notification-toast notification-toast--${notif.type}`}>
          <div className="notification-toast__icon">
            {notif.type === 'success' && '✓'}
            {notif.type === 'warning' && '⚠️'}
            {notif.type === 'alert' && '🚨'}
            {notif.type === 'info' && 'ℹ️'}
          </div>
          <div className="notification-toast__content">
            <p className="notification-toast__message">{notif.message}</p>
            <span className="notification-toast__time">{notif.timestamp}</span>
          </div>
          <button
            className="notification-toast__close"
            onClick={() => removeNotification(notif.id)}
            aria-label="Close notification"
          >
            ×
          </button>
        </div>
      ))}
    </div>
  )
}

export default Notification
