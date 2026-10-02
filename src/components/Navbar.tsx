import React from 'react'
import { Link, useLocation, useNavigate } from 'react-router-dom'
import { useQueue } from '../context/QueueContext'
import './Navbar.css'

export const Navbar: React.FC = () => {
  const location = useLocation()
  const navigate = useNavigate()
  const { currentRole, setCurrentRole, advanceQueueState } = useQueue()

  const isAuthPage = location.pathname === '/' || location.pathname === '/login' || location.pathname === '/register'

  if (isAuthPage) return null

  const handleRoleToggle = (role: 'user' | 'admin') => {
    setCurrentRole(role)
    if (role === 'admin') {
      navigate('/admin')
    } else {
      navigate('/dashboard')
    }
  }

  return (
    <header className="navbar">
      <div className="navbar__container">
        <div className="navbar__brand">
          <Link to={currentRole === 'admin' ? '/admin' : '/dashboard'} className="navbar__logo">
            <span className="navbar__logo-icon">⚡</span>
            <span className="navbar__logo-text">QueueSmart</span>
          </Link>
          <span className="navbar__badge">COSC 4353</span>
        </div>

        <nav className="navbar__nav">
          {currentRole === 'user' ? (
            <>
              <Link
                to="/dashboard"
                className={`navbar__link ${location.pathname === '/dashboard' ? 'navbar__link--active' : ''}`}
              >
                Dashboard
              </Link>
              <Link
                to="/join-queue"
                className={`navbar__link ${location.pathname === '/join-queue' ? 'navbar__link--active' : ''}`}
              >
                Join Queue
              </Link>
              <Link
                to="/queue-status"
                className={`navbar__link ${location.pathname === '/queue-status' ? 'navbar__link--active' : ''}`}
              >
                Queue Status
              </Link>
              <Link
                to="/history"
                className={`navbar__link ${location.pathname === '/history' ? 'navbar__link--active' : ''}`}
              >
                History
              </Link>
            </>
          ) : (
            <>
              <Link
                to="/admin"
                className={`navbar__link ${location.pathname === '/admin' ? 'navbar__link--active' : ''}`}
              >
                Overview
              </Link>
              <Link
                to="/admin/services"
                className={`navbar__link ${location.pathname === '/admin/services' ? 'navbar__link--active' : ''}`}
              >
                Services
              </Link>
              <Link
                to="/admin/queue"
                className={`navbar__link ${location.pathname === '/admin/queue' ? 'navbar__link--active' : ''}`}
              >
                Queue Management
              </Link>
            </>
          )}
        </nav>

        <div className="navbar__actions">
          {/* Quick Simulation Trigger for TA Presentation */}
          <button
            className="navbar__sim-btn"
            onClick={advanceQueueState}
            title="Simulate Queue Advancement / Serve Next User"
          >
            ⏩ Demo Advance Queue
          </button>

          {/* User vs Admin Role Switcher */}
          <div className="navbar__role-switcher">
            <button
              className={`role-btn ${currentRole === 'user' ? 'role-btn--active' : ''}`}
              onClick={() => handleRoleToggle('user')}
            >
              User View
            </button>
            <button
              className={`role-btn ${currentRole === 'admin' ? 'role-btn--active' : ''}`}
              onClick={() => handleRoleToggle('admin')}
            >
              Admin View
            </button>
          </div>

          <button className="navbar__logout" onClick={() => navigate('/login')}>
            Log Out
          </button>
        </div>
      </div>
    </header>
  )
}

export default Navbar
