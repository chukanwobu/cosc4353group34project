/* ==========================================================================
   NOTIFICATION (TOAST CONTAINER)
   --------------------------------------------------------------------------
   Renders the list of active notifications from QueueContext as toast
   messages. Each toast shows an icon, a message, a timestamp, and a
   close button.

   Sections:
     1. Imports
     2. Component: state & early return
     3. Render: container
     4. Render: individual toast (icon, content, close button)
   ========================================================================== */


/* ==========================================================================
   1. IMPORTS
   ========================================================================== */

import React from 'react'
import { useQueue } from '../context/QueueContext'
import './Notification.css'


export const Notification: React.FC = () => {

  /* ========================================================================
     2. STATE & EARLY RETURN
     ======================================================================== */

  // Notification list and the action to dismiss one, from the shared QueueContext
  const { notifications, removeNotification } = useQueue()

  // Nothing to show: render nothing (no empty container in the DOM)
  if (notifications.length === 0) return null


  return (

    /* ======================================================================
       3. TOAST CONTAINER
       aria-live="polite": screen readers announce new toasts without
       interrupting what they're currently reading.
       aria-atomic="true": the whole container is read as one unit.
       ====================================================================== */
    <div className="notification-container" aria-live="polite" aria-atomic="true">

      {notifications.map((notif) => (

        /* ==================================================================
           4. INDIVIDUAL TOAST
           The modifier class (e.g., notification-toast--success) sets the
           color style based on the notification type.
           ================================================================== */
        <div
          key={notif.id}
          className={`notification-toast notification-toast--${notif.type}`}
        >

          {/* --- Icon: one symbol per notification type --- */}
          <div className="notification-toast__icon">
            {notif.type === 'success' && '✓'}
            {notif.type === 'warning' && '⚠️'}
            {notif.type === 'alert' && '🚨'}
            {notif.type === 'info' && 'ℹ️'}
          </div>

          {/* --- Message text and the time it was created --- */}
          <div className="notification-toast__content">
            <p className="notification-toast__message">{notif.message}</p>
            <span className="notification-toast__time">{notif.timestamp}</span>
          </div>

          {/* --- Close button: dismisses this toast (aria-label for screen readers) --- */}
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
