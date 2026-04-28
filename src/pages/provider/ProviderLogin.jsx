import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Button from '../../components/Button'
import Input from '../../components/Input'
import { useProviderAuth } from '../../hooks/useProviderAuth'

export default function ProviderLogin() {
  const navigate = useNavigate()
  const { isAuthenticated, login } = useProviderAuth()
  const [email, setEmail] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)

  useEffect(() => {
    if (isAuthenticated) navigate('/provider')
  }, [isAuthenticated, navigate])

  const handleSubmit = async (event) => {
    event.preventDefault()
    setError('')
    setLoading(true)
    const result = await login(email, password)
    setLoading(false)
    if (result.success) {
      navigate('/provider')
    } else {
      setError(result.error || 'Invalid credentials')
    }
  }

  return (
    <div className="admin-login-page">
      <div className="login-container">
        <div className="login-header">
          <h1>Provider Portal</h1>
          <p>Sign in to manage your facility profile and patients</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error ? <div className="error-message">{error}</div> : null}
          <Input
            label="Email"
            type="email"
            value={email}
            onChange={(e) => setEmail(e.target.value)}
            placeholder="clinic@example.com"
            required
            autoFocus
          />
          <Input
            label="Password"
            type="password"
            value={password}
            onChange={(e) => setPassword(e.target.value)}
            required
          />
          <Button type="submit" variant="primary" className="full-width" disabled={loading}>
            {loading ? 'Signing in...' : 'Sign In'}
          </Button>
        </form>
        <div className="login-note">
          <p>
            Credentials are created by admin/backend.
            {' '}
            <Link to="/">Back to home</Link>
          </p>
        </div>
      </div>
    </div>
  )
}
