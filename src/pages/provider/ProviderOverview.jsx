import { useEffect, useState } from 'react'
import { Users, CreditCard, AlertCircle, Link2, Copy, CheckCheck } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useProviderAuth } from '../../hooks/useProviderAuth'
import { useSessionExpired } from '../../components/provider/ProviderLayout'
import IconBadge from '../../components/IconBadge'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

const STATUS_ROWS = [
  { key: 'pendingLoans', label: 'Pending Review', color: 'var(--color-warning)', bg: 'var(--color-warning-bg)' },
  { key: 'approvedLoans', label: 'Approved', color: 'var(--color-success-text)', bg: 'var(--color-success-bg)' },
  { key: 'activeLoans', label: 'Disbursed / Active', color: 'var(--color-info)', bg: 'var(--color-info-bg)' },
  { key: 'rejectedLoans', label: 'Rejected', color: 'var(--color-danger-text)', bg: 'var(--color-danger-bg)' },
]

export default function ProviderOverview() {
  const { session } = useProviderAuth()
  const onSessionExpired = useSessionExpired()
  const [stats, setStats] = useState(null)
  const [error, setError] = useState('')
  const [loading, setLoading] = useState(true)
  const [copied, setCopied] = useState(false)

  useEffect(() => {
    let cancelled = false
    providerAuthService.getStats()
      .then((data) => { if (!cancelled) setStats(data) })
      .catch((err) => {
        if (cancelled) return
        if (err?.message?.includes('Session expired')) { onSessionExpired(); return }
        setError(err?.message || 'Failed to load stats')
      })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const facilityName = session?.provider?.name || 'Your Facility'
  const providerId = session?.provider?.id || session?.provider?._id || ''
  const registrationLink = providerId
    ? `${window.location.origin}/apply?providerId=${providerId}`
    : ''

  const handleCopyLink = () => {
    if (!registrationLink) return
    navigator.clipboard.writeText(registrationLink).then(() => {
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    })
  }

  if (loading) return <FullScreenLoader label="Loading dashboard…" />

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Welcome back, {facilityName}</h1>
          <p>Here's a summary of your facility's activity on CareCova</p>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {registrationLink && (
        <div className="cc-reg-link-banner">
          <div className="cc-reg-link-icon">
            <Link2 size={18} />
          </div>
          <div className="cc-reg-link-body">
            <div className="cc-reg-link-title">Your Patient Registration Link</div>
            <div className="cc-reg-link-url">{registrationLink}</div>
            <div className="cc-reg-link-hint">
              Share this link with patients — their applications will be automatically linked to your facility.
            </div>
          </div>
          <button onClick={handleCopyLink} className={`cc-reg-link-copy ${copied ? 'copied' : ''}`}>
            {copied ? <><CheckCheck size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
          </button>
        </div>
      )}

      <div className="admin-kpi-grid" style={{ marginBottom: 28 }}>
        <div className="admin-kpi-card">
          <IconBadge color="blue" size="md"><Users size={20} /></IconBadge>
          <div className="kpi-title" style={{ marginTop: 12 }}>Total Patients</div>
          <div className="kpi-value">{stats?.totalPatients ?? stats?.patientCount ?? '—'}</div>
          <div className="kpi-subtext">Registered at your facility</div>
        </div>
        <div className="admin-kpi-card">
          <IconBadge color="violet" size="md"><CreditCard size={20} /></IconBadge>
          <div className="kpi-title" style={{ marginTop: 12 }}>Loan Applications</div>
          <div className="kpi-value">{stats?.totalLoans ?? stats?.loanCount ?? '—'}</div>
          <div className="kpi-subtext">{stats?.activeLoans ?? 0} active</div>
        </div>
      </div>

      <div className="cc-breakdown-card">
        <h3>Application Status</h3>
        {STATUS_ROWS.map((row) => (
          <div key={row.key} className="cc-breakdown-row">
            <span className="cc-breakdown-label">{row.label}</span>
            <span style={{
              padding: '2px 10px', borderRadius: 12, fontSize: 'var(--text-xs)', fontWeight: 600,
              background: row.bg, color: row.color,
            }}>
              {stats?.[row.key] ?? 0}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}
