import React, { useState } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import { useQueue } from '../../context/QueueContext'
import './JoinQueue.css'

export const JoinQueue: React.FC = () => {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const { services, tickets, joinQueue } = useQueue()

  const preselectedServiceId = Number(searchParams.get('service')) || (services[0] ? services[0].id : 1)

  const [selectedServiceId, setSelectedServiceId] = useState<number>(preselectedServiceId)
  const [userName, setUserName] = useState('Samuel Sabu')
  const [studentId, setStudentId] = useState('1984203')
  const [notes, setNotes] = useState('')
  const [errors, setErrors] = useState<{ userName?: string; studentId?: string; notes?: string }>({})

  const selectedService = services.find((s) => s.id === selectedServiceId) || services[0]

  // Calculate live queue stats for the selected service
  const serviceQueue = tickets.filter(
    (t) => t.serviceId === selectedServiceId && (t.status === 'waiting' || t.status === 'in_progress')
  )
  const currentQueueLength = serviceQueue.length
  const estimatedWaitTime = currentQueueLength * (selectedService ? selectedService.duration : 15)

  const MAX_NOTES_LEN = 200

  const handleNotesChange = (e: React.ChangeEvent<HTMLTextAreaElement>) => {
    const val = e.target.value
    if (val.length <= MAX_NOTES_LEN) {
      setNotes(val)
      if (errors.notes) setErrors((prev) => ({ ...prev, notes: undefined }))
    }
  }

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault()

    const newErrors: typeof errors = {}
    if (!userName.trim()) newErrors.userName = 'Please enter your full name.'
    if (!studentId.trim()) newErrors.studentId = 'Please enter your Student ID.'
    if (!notes.trim()) newErrors.notes = 'Please provide a brief reason for your visit.'
    else if (notes.length > MAX_NOTES_LEN) newErrors.notes = `Notes cannot exceed ${MAX_NOTES_LEN} characters.`

    if (Object.keys(newErrors).length > 0) {
      setErrors(newErrors)
      return
    }

    const createdTicket = joinQueue(selectedServiceId, userName, studentId, notes)
    if (createdTicket) {
      navigate('/queue-status')
    }
  }

  return (
    <div className="join-queue-container">
      <header className="join-queue-header">
        <h1>Join a Service Queue</h1>
        <p>Select a department, review estimated wait times, and reserve your place in line.</p>
      </header>

      <div className="join-queue-layout">
        {/* Left Side: Department & Service Selection */}
        <section className="service-picker-section">
          <h2>1. Select Campus Service</h2>
          <div className="service-options-list">
            {services.map((service) => {
              const queueCount = tickets.filter(
                (t) => t.serviceId === service.id && (t.status === 'waiting' || t.status === 'in_progress')
              ).length
              const wait = queueCount * service.duration

              const isSelected = service.id === selectedServiceId

              return (
                <div
                  key={service.id}
                  className={`service-option-card ${isSelected ? 'service-option-card--selected' : ''} ${
                    !service.isOpen ? 'service-option-card--disabled' : ''
                  }`}
                  onClick={() => service.isOpen && setSelectedServiceId(service.id)}
                >
                  <div className="option-radio">
                    <input
                      type="radio"
                      name="serviceSelect"
                      checked={isSelected}
                      disabled={!service.isOpen}
                      onChange={() => setSelectedServiceId(service.id)}
                    />
                  </div>

                  <div className="option-content">
                    <div className="option-title-row">
                      <h3>{service.name}</h3>
                      <span className={`badge ${service.isOpen ? 'badge-open' : 'badge-closed'}`}>
                        {service.isOpen ? 'Available' : 'Closed'}
                      </span>
                    </div>

                    <p>{service.description}</p>

                    <div className="option-meta-row">
                      <span>👥 {queueCount} in line</span>
                      <span>⏱️ ~{wait} min estimated wait</span>
                      <span>🏷️ Priority: {service.priority.toUpperCase()}</span>
                    </div>
                  </div>
                </div>
              )
            })}
          </div>
        </section>

        {/* Right Side: Form & Summary */}
        <section className="queue-form-section">
          <div className="form-card">
            <h2>2. Queue Entry Details</h2>

            {/* Service Summary Callout */}
            {selectedService && (
              <div className="selected-service-banner">
                <div className="banner-title">Selected Department</div>
                <div className="banner-name">{selectedService.name}</div>
                <div className="banner-stats">
                  <div className="b-stat">
                    <span>Current Queue:</span>
                    <strong>{currentQueueLength} people</strong>
                  </div>
                  <div className="b-stat">
                    <span>Est. Wait Time:</span>
                    <strong>~{estimatedWaitTime} mins</strong>
                  </div>
                </div>
              </div>
            )}

            <form onSubmit={handleSubmit} noValidate>
              <div className="form-field">
                <label htmlFor="userName">Full Name *</label>
                <input
                  id="userName"
                  type="text"
                  value={userName}
                  onChange={(e) => {
                    setUserName(e.target.value)
                    if (errors.userName) setErrors((prev) => ({ ...prev, userName: undefined }))
                  }}
                  className={errors.userName ? 'input-error' : ''}
                />
                {errors.userName && <span className="field-error-msg">{errors.userName}</span>}
              </div>

              <div className="form-field">
                <label htmlFor="studentId">Student ID Number *</label>
                <input
                  id="studentId"
                  type="text"
                  value={studentId}
                  onChange={(e) => {
                    setStudentId(e.target.value)
                    if (errors.studentId) setErrors((prev) => ({ ...prev, studentId: undefined }))
                  }}
                  className={errors.studentId ? 'input-error' : ''}
                />
                {errors.studentId && <span className="field-error-msg">{errors.studentId}</span>}
              </div>

              <div className="form-field">
                <div className="label-with-counter">
                  <label htmlFor="notes">Reason for Visit / Special Notes *</label>
                  <span className={`char-counter ${notes.length >= MAX_NOTES_LEN ? 'char-counter--limit' : ''}`}>
                    {notes.length} / {MAX_NOTES_LEN} chars
                  </span>
                </div>
                <textarea
                  id="notes"
                  rows={3}
                  placeholder="E.g., Need degree audit check for graduation clearance."
                  value={notes}
                  onChange={handleNotesChange}
                  className={errors.notes ? 'input-error' : ''}
                ></textarea>
                {errors.notes && <span className="field-error-msg">{errors.notes}</span>}
              </div>

              <div className="form-actions">
                <button
                  type="submit"
                  className="btn-submit-queue"
                  disabled={!selectedService || !selectedService.isOpen}
                >
                  🚀 Confirm & Join Queue
                </button>
                <button
                  type="button"
                  className="btn-cancel"
                  onClick={() => navigate('/dashboard')}
                >
                  Cancel
                </button>
              </div>
            </form>
          </div>
        </section>
      </div>
    </div>
  )
}

export default JoinQueue