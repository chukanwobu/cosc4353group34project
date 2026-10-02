import { useState } from 'react'
import type { ChangeEvent, FocusEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css'

type Field = 'email' | 'password'
type Errors = Partial<Record<Field, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// fake accounts for A2 replace with an API call in A3 when backend is up
const MOCK_USERS = [
  { email: 'user@queuesmart.com', password: 'password123', role: 'user' },
  { email: 'admin@queuesmart.com', password: 'admin1234', role: 'admin' },
]

function validate(field: Field, value: string): string {
  if (field === 'email') {
    if (!value.trim()) return 'Enter your email address.'
    if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email, like name@example.com.'
  }
  if (field === 'password') {
    if (!value) return 'Enter your password.'
    if (value.length < 8) return 'Password must be at least 8 characters.'
  }
  return ''
}

function Login() {
  const navigate = useNavigate()
  const [values, setValues] = useState({ email: '', password: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [formError, setFormError] = useState('')

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const field = e.target.name as Field
    const value = e.target.value
    setValues((prev) => ({ ...prev, [field]: value }))
    setFormError('')
    // Re-validate live once the field has been visited
    if (touched[field]) {
      setErrors((prev) => ({ ...prev, [field]: validate(field, value) }))
    }
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const field = e.target.name as Field
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validate(field, values[field]) }))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const nextErrors: Errors = {
      email: validate('email', values.email),
      password: validate('password', values.password),
    }
    setErrors(nextErrors)
    setTouched({ email: true, password: true })
    if (nextErrors.email || nextErrors.password) return

    const match = MOCK_USERS.find(
      (u) => u.email === values.email.trim().toLowerCase() && u.password === values.password
    )
    if (!match) {
      setFormError('That email and password don’t match an account. Check them and try again.')
      return
    }

    // TODO: store the logged-in user in your auth context here
    navigate(match.role === 'admin' ? '/admin' : '/dashboard')
  }

  return (
    <main className="login">
      <section className="login__panel" aria-labelledby="login-title">
        <h1 id="login-title" className="login__title">Log in to QueueSmart</h1>
        <p className="login__intro">See where you are in line, or manage your queues.</p>

        {formError && (
          <p className="login__alert" role="alert">
            {formError}
          </p>
        )}

        <form onSubmit={handleSubmit} noValidate>
          <div className="login__field">
            <label htmlFor="email">Email</label>
            <input
              id="email"
              name="email"
              type="email"
              autoComplete="email"
              value={values.email}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.email}
              aria-describedby={errors.email ? 'email-error' : undefined}
            />
            {errors.email && (
              <span id="email-error" className="login__error">
                {errors.email}
              </span>
            )}
          </div>

          <div className="login__field">
            <label htmlFor="password">Password</label>
            <input
              id="password"
              name="password"
              type="password"
              autoComplete="current-password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.password}
              aria-describedby={errors.password ? 'password-error' : undefined}
            />
            {errors.password && (
              <span id="password-error" className="login__error">
                {errors.password}
              </span>
            )}
          </div>

          <button type="submit" className="login__submit">
            Log in
          </button>
        </form>

        <p className="login__switch">
          New to QueueSmart? <Link to="/register">Create an account</Link>
        </p>

        <p className="login__hint">
          Demo accounts: user@queuesmart.com / password123, admin@queuesmart.com / admin1234
        </p>
      </section>
    </main>
  )
}

export default Login
