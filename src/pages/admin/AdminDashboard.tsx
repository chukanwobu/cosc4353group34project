import { useState } from 'react'
import { Link } from 'react-router-dom'

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
    <div>
      <h1>Admin Dashboard</h1>

      <div>
        <h2>Overview</h2>

        <div>
          <h3>Open Services</h3>
          <p>{openServices}</p>
        </div>

        <Link to="/admin/services">
          <button>Manage Services</button>
        </Link>

        <div>
          <h3>People Waiting</h3>
          <p>{totalWaiting}</p>
        </div>
      </div>

      <h2>Services</h2>

      {services.map((service) => (
        <div key={service.id}>
          <h3>{service.name}</h3>

          <p>Queue Length: {service.queueLength}</p>
          <p>Estimated Wait: {service.waitTime} minutes</p>

          <p>
            Status: {service.isOpen ? 'Open' : 'Closed'}
          </p>

          <button onClick={() => toggleQueue(service.id)}>
            {service.isOpen ? 'Close Queue' : 'Open Queue'}
          </button>

          <hr />
        </div>
      ))}
    </div>
  )
}

export default AdminDashboard