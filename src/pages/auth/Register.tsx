import { useState } from 'react'
import type { ChangeEvent, FocusEvent, FormEvent } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import './Login.css' // shares the Login styles so both screens look the same

type Field = 'email' | 'password' | 'confirmPassword'
type Values = Record<Field, string>
type Errors = Partial<Record<Field, string>>

const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/

// Emails that already "exist" in the mock data. Replace with an API check in A3.
const TAKEN_EMAILS = ['user@queuesmart.com', 'admin@queuesmart.com']

function validate(field: Field, value: string, all: Values): string {
  if (field === 'email') {
    if (!value.trim()) return 'Enter your email address.'
    if (!EMAIL_PATTERN.test(value)) return 'Enter a valid email, like name@example.com.'
    if (TAKEN_EMAILS.includes(value.trim().toLowerCase()))
      return 'An account with this email already exists. Try logging in instead.'
  }
  if (field === 'password') {
    if (!value) return 'Create a password.'
    if (value.length < 8) return 'Password must be at least 8 characters.'
    if (!/[A-Za-z]/.test(value) || !/[0-9]/.test(value))
      return 'Password must include at least one letter and one number.'
  }
  if (field === 'confirmPassword') {
    if (!value) return 'Re-enter your password.'
    if (value !== all.password) return 'Passwords don’t match.'
  }
  return ''
}

function Register() {
  const navigate = useNavigate()
  const [values, setValues] = useState<Values>({ email: '', password: '', confirmPassword: '' })
  const [errors, setErrors] = useState<Errors>({})
  const [touched, setTouched] = useState<Partial<Record<Field, boolean>>>({})
  const [success, setSuccess] = useState(false)

  function handleChange(e: ChangeEvent<HTMLInputElement>) {
    const field = e.target.name as Field
    const next = { ...values, [field]: e.target.value }
    setValues(next)

    // Re-validate visited fields live. Changing the password also affects the confirm field.
    setErrors((prev) => {
      const updated = { ...prev }
      if (touched[field]) updated[field] = validate(field, next[field], next)
      if (field === 'password' && touched.confirmPassword)
        updated.confirmPassword = validate('confirmPassword', next.confirmPassword, next)
      return updated
    })
  }

  function handleBlur(e: FocusEvent<HTMLInputElement>) {
    const field = e.target.name as Field
    setTouched((prev) => ({ ...prev, [field]: true }))
    setErrors((prev) => ({ ...prev, [field]: validate(field, values[field], values) }))
  }

  function handleSubmit(e: FormEvent<HTMLFormElement>) {
    e.preventDefault()

    const nextErrors: Errors = {
      email: validate('email', values.email, values),
      password: validate('password', values.password, values),
      confirmPassword: validate('confirmPassword', values.confirmPassword, values),
    }
    setErrors(nextErrors)
    setTouched({ email: true, password: true, confirmPassword: true })
    if (nextErrors.email || nextErrors.password || nextErrors.confirmPassword) return

    // TODO: save the new user in your auth context / mock data here
    setSuccess(true)
    setTimeout(() => navigate('/login'), 1500)
  }

  return (
    <main className="login">
      <section className="login__panel" aria-labelledby="register-title">
        <h1 id="register-title" className="login__title">Create your account</h1>
        <p className="login__intro">Join queues from anywhere and track your place in line.</p>

        {success && (
          <p className="login__alert login__alert--success" role="status">
            Account created. Taking you to the login page…
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
              autoComplete="new-password"
              value={values.password}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.password}
              aria-describedby="password-help"
            />
            <span
              id="password-help"
              className={errors.password ? 'login__error' : 'login__help'}
            >
              {errors.password || 'At least 8 characters, with a letter and a number.'}
            </span>
          </div>

          <div className="login__field">
            <label htmlFor="confirmPassword">Confirm password</label>
            <input
              id="confirmPassword"
              name="confirmPassword"
              type="password"
              autoComplete="new-password"
              value={values.confirmPassword}
              onChange={handleChange}
              onBlur={handleBlur}
              aria-invalid={!!errors.confirmPassword}
              aria-describedby={errors.confirmPassword ? 'confirm-error' : undefined}
            />
            {errors.confirmPassword && (
              <span id="confirm-error" className="login__error">
                {errors.confirmPassword}
              </span>
            )}
          </div>

          <button type="submit" className="login__submit" disabled={success}>
            Create account
          </button>
        </form>

        <p className="login__switch">
          Already have an account? <Link to="/login">Log in</Link>
        </p>
      </section>
    </main>
  )
}

export default Register
