import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../components/Button'
import Input from '../components/Input'
import { useAuth } from '../hooks/useAuth'
import { adminService } from '../services/adminService'
import logo from '../assets/logo.png'

export default function AdminLogin() {
  const navigate = useNavigate()
  const { isAuthenticated, login, logout } = useAuth()
  const [username, setUsername] = useState('')
  const [password, setPassword] = useState('')
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(false)
  const [checkingSession, setCheckingSession] = useState(true)

  useEffect(() => {
    let cancelled = false
    const verifyExistingSession = async () => {
      if (!isAuthenticated) {
        if (!cancelled) setCheckingSession(false)
        return
      }

      try {
        await adminService.getKPIs()
        if (!cancelled) navigate('/admin/dashboard')
      } catch (err) {
        const message = String(err?.message || '')
        if (/unable to reach backend/i.test(message)) {
          await logout()
          if (!cancelled) {
            setError('Backend is unreachable. Please start the API server, then sign in again.')
          }
        } else if (/session expired|not authenticated|401/i.test(message)) {
          await logout()
          if (!cancelled) setError('Your session expired. Please sign in again.')
        } else if (!cancelled) {
          navigate('/admin/dashboard')
        }
      } finally {
        if (!cancelled) setCheckingSession(false)
      }
    }
    verifyExistingSession()
    return () => { cancelled = true }
  }, [isAuthenticated, navigate, logout])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)

    const result = await login(username, password)

    if (result.success) {
      navigate('/admin/dashboard')
    } else {
      setError(result.error || 'Invalid credentials')
    }

    setLoading(false)
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
          <h1>Admin Portal</h1>
          <p>Sign in to manage credit applications</p>
        </div>
        <form onSubmit={handleSubmit} className="login-form">
          {error && (
            <div className="alert-box alert-error" style={{ marginBottom: 16 }}>{error}</div>
          )}
          <Input
            label="Username or email"
            type="text"
            value={username}
            onChange={(e) => setUsername(e.target.value)}
            placeholder="Enter your username or email"
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
          <Button type="submit" variant="primary" className="full-width" disabled={loading || checkingSession}>
            {checkingSession ? 'Checking session…' : loading ? 'Signing in…' : 'Sign In'}
          </Button>
        </form>
        <div className="login-note">
          <p>Contact your administrator if you have trouble signing in.</p>
        </div>
      </div>
    </div>
  )
}
