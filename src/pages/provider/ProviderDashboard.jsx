import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import Button from '../../components/Button'
import { providerAuthService } from '../../services/providerAuthService'
import { useProviderAuth } from '../../hooks/useProviderAuth'

export default function ProviderDashboard() {
  const navigate = useNavigate()
  const { session, logout } = useProviderAuth()
  const [profile, setProfile] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    const loadProfile = async () => {
      try {
        const data = await providerAuthService.getProfile()
        if (!cancelled) setProfile(data)
      } catch (err) {
        if (!cancelled) setError(err?.message || 'Unable to load provider profile')
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    loadProfile()
    return () => { cancelled = true }
  }, [])

  return (
    <div style={{ padding: 24, maxWidth: 960, margin: '0 auto' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', gap: 12, marginBottom: 18 }}>
        <h1 style={{ margin: 0 }}>Provider Dashboard</h1>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            logout()
            navigate('/provider/login')
          }}
        >
          Sign out
        </Button>
      </div>

      {loading ? <div className="loading">Loading provider profile...</div> : null}
      {!loading && error ? <div className="error-message">{error}</div> : null}

      {!loading && !error ? (
        <div className="card" style={{ padding: 16 }}>
          <h3 style={{ marginTop: 0 }}>Facility Profile</h3>
          <p><strong>Name:</strong> {profile?.name || profile?.facilityName || session?.provider?.name || '—'}</p>
          <p><strong>Email:</strong> {profile?.email || session?.email || '—'}</p>
          <p><strong>Type:</strong> {profile?.type || session?.provider?.type || '—'}</p>
          <p><strong>Phone:</strong> {profile?.phone || session?.provider?.phone || '—'}</p>
          <p><strong>Status:</strong> {profile?.status || (profile?.isActive ? 'active' : 'unknown')}</p>
        </div>
      ) : null}
    </div>
  )
}
