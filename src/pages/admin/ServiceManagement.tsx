import React, { useState } from 'react'
import { Link } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import type { Priority, Service } from '../../context/QueueContext'
import './ServiceManagement.css'

export const ServiceManagement: React.FC = () => {
  const { services, addService, updateService, deleteService } = useQueue()

  const [name, setName] = useState('')
  const [description, setDescription] = useState('')
  const [duration, setDuration] = useState('')
  const [priority, setPriority] = useState<Priority>('low')
  const [editingId, setEditingId] = useState<number | null>(null)

  const [errors, setErrors] = useState<{ name?: string; description?: string; duration?: string }>({})

  const MAX_NAME_LEN = 100

  const handleNameChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    const val = e.target.value
    if (val.length <= MAX_NAME_LEN) {
      setName(val)
      if (errors.name) setErrors((prev) => ({ ...prev, name: undefined }))
    }
  }

  const editService = (service: Service) => {
    setEditingId(service.id)
    setName(service.name)
    setDescription(service.description)
    setDuration(service.duration.toString())
    setPriority(service.priority)
    setErrors({})
  }

  const cancelEdit = () => {
    setEditingId(null)
    setName('')
    setDescription('')
    setDuration('')
    setPriority('low')
    setErrors({})
  }

  const handleSubmit = (event: React.FormEvent<HTMLFormElement>) => {
    event.preventDefault()

    const newErrors: typeof errors = {}
    if (!name.trim()) newErrors.name = 'Service name is required.'
    else if (name.length > MAX_NAME_LEN) newErrors.name = `Service name cannot exceed ${MAX_NAME_LEN} characters.`

    if (!description.trim()) newErrors.description = 'Service description is required.'

    const numDuration = Number(duration)
    if (!duration || isNaN(numDuration) || numDuration < 1) {
      newErrors.duration = 'Expected duration must be a positive number (minimum 1 minute).'
    }

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    if (editingId !== null) {
      updateService(editingId, {
        name: name.trim(),
        description: description.trim(),
        duration: numDuration,
        priority,
      })
      setEditingId(null)
    } else {
      addService({
        name: name.trim(),
        description: description.trim(),
        duration: numDuration,
        priority,
      })
    }

    setName('')
    setDescription('')
    setDuration('')
    setPriority('low')
    setErrors({})
  }

  return (
    <div className="service-management">
      <div className="service-management-header">
        <div>
          <h1>Service Management</h1>
          <p>Create, edit, and configure available campus services and estimated wait parameters.</p>
        </div>

        <Link to="/admin">
          <button className="back-button">← Back to Admin Dashboard</button>
        </Link>
      </div>

      {/* Add / Edit Service Form */}
      <div className="service-form-card">
        <h2>{editingId !== null ? '✏️ Edit Existing Service' : '➕ Create New Campus Service'}</h2>

        <form onSubmit={handleSubmit} noValidate>
          <div className="form-group">
            <div className="label-row">
              <label htmlFor="service-name">Service Name *</label>
              <span className={`char-counter ${name.length >= MAX_NAME_LEN ? 'char-counter--limit' : ''}`}>
                {name.length} / {MAX_NAME_LEN} chars
              </span>
            </div>
            <input
              id="service-name"
              type="text"
              value={name}
              onChange={handleNameChange}
              maxLength={MAX_NAME_LEN}
              placeholder="E.g., International Student Services"
              className={errors.name ? 'input-error' : ''}
            />
            {errors.name && <span className="error-text">{errors.name}</span>}
          </div>

          <div className="form-group">
            <label htmlFor="service-desc">Description *</label>
            <textarea
              id="service-desc"
              rows={3}
              value={description}
              onChange={(event) => {
                setDescription(event.target.value)
                if (errors.description) setErrors((prev) => ({ ...prev, description: undefined }))
              }}
              placeholder="Describe the service purpose and required documentation..."
              className={errors.description ? 'input-error' : ''}
            />
            {errors.description && <span className="error-text">{errors.description}</span>}
          </div>

          <div className="form-row">
            <div className="form-group">
              <label htmlFor="service-duration">Expected Duration (minutes) *</label>
              <input
                id="service-duration"
                type="number"
                value={duration}
                onChange={(event) => {
                  setDuration(event.target.value)
                  if (errors.duration) setErrors((prev) => ({ ...prev, duration: undefined }))
                }}
                min="1"
                placeholder="15"
                className={errors.duration ? 'input-error' : ''}
              />
              {errors.duration && <span className="error-text">{errors.duration}</span>}
            </div>

            <div className="form-group">
              <label htmlFor="service-priority">Priority Level</label>
              <select
                id="service-priority"
                value={priority}
                onChange={(event) => setPriority(event.target.value as Priority)}
              >
                <option value="low">Low Priority</option>
                <option value="medium">Medium Priority</option>
                <option value="high">High Priority</option>
              </select>
            </div>
          </div>

          <div className="form-actions">
            <button className="primary-button" type="submit">
              {editingId !== null ? 'Update Service' : 'Save New Service'}
            </button>

            {editingId !== null && (
              <button className="cancel-button" type="button" onClick={cancelEdit}>
                Cancel Edit
              </button>
            )}
          </div>
        </form>
      </div>

      {/* Existing Services */}
      <div className="existing-services">
        <h2>Active Services Catalog ({services.length})</h2>

        <div className="service-management-list">
          {services.map((service) => (
            <div className="management-service-card" key={service.id}>
              <div className="service-card-content">
                <div className="card-title-line">
                  <h3>{service.name}</h3>
                  <span className={`priority-badge priority-${service.priority}`}>
                    {service.priority.toUpperCase()}
                  </span>
                </div>

                <p>{service.description}</p>

                <div className="service-details">
                  <span>
                    <strong>Duration:</strong> {service.duration} mins / student
                  </span>
                  <span>
                    <strong>Status:</strong> {service.isOpen ? 'Open' : 'Closed'}
                  </span>
                </div>
              </div>

              <div className="service-actions">
                <button className="edit-button" onClick={() => editService(service)}>
                  Edit
                </button>
                <button className="delete-button" onClick={() => deleteService(service.id)}>
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