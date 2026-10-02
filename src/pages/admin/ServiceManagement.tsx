import { useState } from 'react'
import { Link } from 'react-router-dom'

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
    <div>
      <h1>Service Management</h1>

      <Link to="/admin">
        <button>Back to Dashboard</button>
      </Link>

      <h2>Add New Service</h2>

      <form onSubmit={handleSubmit}>
        <div>
          <label>Service Name</label>
          <br />

          <input
            type="text"
            value={name}
            onChange={(event) => setName(event.target.value)}
            required
            maxLength={100}
          />
        </div>

        <div>
          <label>Description</label>
          <br />

          <textarea
            value={description}
            onChange={(event) => setDescription(event.target.value)}
            required
          />
        </div>

        <div>
          <label>Expected Duration (minutes)</label>
          <br />

          <input
            type="number"
            value={duration}
            onChange={(event) => setDuration(event.target.value)}
            required
            min="1"
          />
        </div>

        <div>
          <label>Priority Level</label>
          <br />

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

        <br />

        <button type="submit">
          {editingId !== null ? 'Update Service' : 'Create Service'}
        </button>

        {editingId !== null && (
          <button type="button" onClick={cancelEdit}>
            Cancel
          </button>
        )}

      </form>

      <hr />

      <h2>Existing Services</h2>

      {services.map((service) => (
        <div key={service.id}>
          <h3>{service.name}</h3>

          <p>{service.description}</p>
          <p>Expected Duration: {service.duration} minutes</p>
          <p>Priority: {service.priority}</p>

          <button onClick={() => editService(service)}>Edit</button>

          <button onClick={() => deleteService(service.id)}>
            Delete
          </button>

          <hr />
        </div>
      ))}
    </div>
  )
}

export default ServiceManagement