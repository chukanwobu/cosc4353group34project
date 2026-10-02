import { useState } from 'react'
import { Link } from 'react-router-dom'
import './AdminDashboard.css'

const initialServices = [
  {
    id: 1,
    name: 'Academic Advising',
    queueLength: 8,
    waitTime: 15,
    isOpen: true,
  },
  {
    id: 2,
    name: 'Financial Aid',
    queueLength: 6,
    waitTime: 20,
    isOpen: true,
  },
  {
    id: 3,
    name: 'Registration Help',
    queueLength: 4,
    waitTime: 10,
    isOpen: false,
  },
]

function AdminDashboard() {
  const [services, setServices] = useState(initialServices)
  const toggleQueue = (id: number) => {
    setServices(
      services.map((service) =>
        service.id === id
          ? { ...service, isOpen: !service.isOpen }
          : service
      )
    )
  }

  const totalWaiting = services.reduce(
    (total, service) => total + service.queueLength,
    0
  )

  const openServices = services.filter(
    (service) => service.isOpen
  ).length

  return (
    <div className="admin-dashboard">
      <h1>Admin Dashboard</h1>

      {/* Overview Section */}
      <div className="overview">
        <h2>Overview</h2>

        <div className="overview-cards">
          <div className="stat-card">
            <h3>Open Services</h3>
            <p>{openServices}</p>
          </div>

          <div className="stat-card">
            <h3>People Waiting</h3>
            <p>{totalWaiting}</p>
          </div>
        </div>
      </div>

      {/* Services Section */}
      <div className="services-section">
        <div className="services-header">
          <h2>Services</h2>

          <Link to="/admin/services">
            <button>Manage Services</button>
          </Link>
        </div>

        <div className="services-list">
          {services.map((service) => (
            <div className="service-card" key={service.id}>
              <h3>{service.name}</h3>

              <p>
                Queue Status:{' '}
                <strong>{service.isOpen ? 'Open' : 'Closed'}</strong>
              </p>

              <p>People Waiting: {service.queueLength}</p>

              <p>Estimated Wait: {service.waitTime} minutes</p>

              <button onClick={() => toggleQueue(service.id)}>
                {service.isOpen ? 'Close Queue' : 'Open Queue'}
              </button>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}
export default AdminDashboard