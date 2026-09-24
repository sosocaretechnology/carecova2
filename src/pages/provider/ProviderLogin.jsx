import { useEffect, useState } from 'react'
import { useNavigate, Link } from 'react-router-dom'
import Button from '../../components/Button'
import Input from '../../components/Input'
import { useProviderAuth } from '../../hooks/useProviderAuth'
import logo from '../../assets/logo.png'

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
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'center', gap: 10, marginBottom: 16 }}>
            <img src={logo} alt="CareCova" style={{ width: 36, height: 36, objectFit: 'contain' }} />
            <span style={{ fontFamily: 'var(--font-display)', fontWeight: 800, fontSize: '1.375rem', color: 'var(--color-primary-dark)', letterSpacing: '-0.02em' }}>
              CareCova
            </span>
          </div>
          <h1>Provider Portal</h1>
          <p>Sign in to manage your facility profile and patients</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && <div className="alert-box alert-error" style={{ marginBottom: 16 }}>{error}</div>}
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
