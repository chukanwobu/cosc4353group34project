import { useState } from 'react'
import { Link } from 'react-router-dom'
import './ServiceManagement.css'

type Service = {
  id: number
  name: string
  description: string
  duration: number
  priority: 'low' | 'medium' | 'high'
}

const initialServices: Service[] = [
  {
    id: 1,
    name: 'Academic Advising',
    description: 'Meet with an advisor for academic assistance.',
    duration: 15,
    priority: 'high',
  },
  {
    id: 2,
    name: 'Financial Aid',
    description: 'Get assistance with financial aid questions.',
    duration: 20,
    priority: 'medium',
  },
]

function ServiceManagement() {
  const [services, setServices] = useState<Service[]>(initialServices)

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [priority, setPriority] = useState<'low' | 'medium' | 'high'>('low')

  const [editingId, setEditingId] = useState<number | null>(null)

  const deleteService = (id: number) => {
  setServices(
    services.filter((service) => service.id !== id)
  )
}

  const editService = (service: Service) => {
    setEditingId(service.id)
    setName(service.name)
    setDescription(service.description)
    setDuration(service.duration.toString())
    setPriority(service.priority)
  }

  const cancelEdit = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setDuration('')
    setPriority('low')
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    if (editingId !== null) {
      setServices(
        services.map((service) =>
          service.id === editingId
            ? {
                ...service,
                name,
                description,
                duration: Number(duration),
                priority,
              }
            : service
        )
      )

      setEditingId(null)
    } else {
      const newService: Service = {
        id: Date.now(),
        name,
        description,
        duration: Number(duration),
        priority,
      }

      setServices([...services, newService])
    }

    setName('')
    setDescription('')
    setDuration('')
    setPriority('low')
  }

  return (
    <div className="service-management">
      <div className="service-management-header">
        <div>
          <h1>Service Management</h1>
          <p>Create, edit, and manage available services.</p>
        </div>

        <Link to="/admin">
          <button className="back-button">Back to Dashboard</button>
        </Link>
      </div>

      {/* Add / Edit Service Form */}
      <div className="service-form-card">
        <h2>
          {editingId !== null ? 'Edit Service' : 'Add New Service'}
        </h2>

        <form onSubmit={handleSubmit}>
          <div className="form-group">
            <label>Service Name</label>
            <input
              type="text"
              value={name}
              onChange={(event) => setName(event.target.value)}
              required
              maxLength={100}
            />
          </div>

          <div className="form-group">
            <label>Description</label>
            <textarea
              value={description}
              onChange={(event) => setDescription(event.target.value)}
              required
            />
          </div>

          <div className="form-row">
            <div className="form-group">
              <label>Expected Duration (minutes)</label>
              <input
                type="number"
                value={duration}
                onChange={(event) => setDuration(event.target.value)}
                required
                min="1"
              />
            </div>

            <div className="form-group">
              <label>Priority Level</label>
              <select
                value={priority}
                onChange={(event) =>
                  setPriority(
                    event.target.value as 'low' | 'medium' | 'high'
                  )
                }
              >
                <option value="low">Low</option>
                <option value="medium">Medium</option>
                <option value="high">High</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId !== null ? 'Update Service' : 'Create Service'}
            </button>

            {editingId !== null && (
              <button
                className="cancel-button"
                type="button"
                onClick={cancelEdit}
              >
                Cancel
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Services */}
      <div className="existing-services">
        <h2>Existing Services</h2>

        <div className="service-management-list">
          {services.map((service) => (
            <div className="management-service-card" key={service.id}>
              <div className="service-card-content">
                <h3>{service.name}</h3>

                <p>{service.description}</p>

                <div className="service-details">
                  <span>
                    <strong>Duration:</strong> {service.duration} minutes
                  </span>

                  <span>
                    <strong>Priority:</strong> {service.priority}
                  </span>
                </div>
              </div>

              <div className="service-actions">
                <button
                  className="edit-button"
                  onClick={() => editService(service)}
                >
                  Edit
                </button>

                <button
                  className="delete-button"
                  onClick={() => deleteService(service.id)}
                >
                  Delete
                </button>
              </div>
            </div>
          ))}
        </div>
      </div>
    </div>
  )
}

export default ServiceManagement