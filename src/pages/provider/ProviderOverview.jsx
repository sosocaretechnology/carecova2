import { useEffect, useState } from 'react'
import { Users, CreditCard, DollarSign, TrendingUp, AlertCircle, Link2, Copy, CheckCheck } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useProviderAuth } from '../../hooks/useProviderAuth'
import { useSessionExpired } from '../../components/provider/ProviderLayout'

function StatCard({ icon, label, value, sub, color }) {
  return (
    <div style={{
      background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
      padding: '20px 24px', display: 'flex', alignItems: 'flex-start', gap: '16px',
      boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
    }}>
      <div style={{
        width: '44px', height: '44px', borderRadius: '10px', flexShrink: 0,
        background: color + '15', display: 'flex', alignItems: 'center', justifyContent: 'center',
      }}>
        {icon}
      </div>
      <div>
        <div style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500, marginBottom: '4px' }}>{label}</div>
        <div style={{ fontSize: '1.5rem', fontWeight: 700, color: '#111827', lineHeight: 1.2 }}>{value}</div>
        {sub && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '3px' }}>{sub}</div>}
      </div>
    </div>
  )
}

function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

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

  return (
    <div>
      <div className="admin-page-header">
        <h1 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>
          Welcome back, {facilityName}
        </h1>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
          Here's a summary of your facility's activity on CareCova
        </p>
      </div>

      {error && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '8px',
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {/* Patient Registration Link */}
      {registrationLink && (
        <div style={{
          marginBottom: '24px', padding: '16px 20px', borderRadius: '12px',
          background: '#eff6ff', border: '1px solid #bfdbfe',
          display: 'flex', alignItems: 'center', gap: '14px', flexWrap: 'wrap',
        }}>
          <div style={{
            width: '40px', height: '40px', borderRadius: '10px', flexShrink: 0,
            background: '#2563eb', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Link2 size={18} color="#fff" />
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <div style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#1d4ed8', marginBottom: '3px' }}>
              Your Patient Registration Link
            </div>
            <div style={{
              fontSize: '0.8125rem', color: '#3b82f6', fontFamily: 'monospace',
              whiteSpace: 'nowrap', overflow: 'hidden', textOverflow: 'ellipsis',
            }}>
              {registrationLink}
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '3px' }}>
              Share this link with patients — their applications will be automatically linked to your facility.
            </div>
          </div>
          <button
            onClick={handleCopyLink}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px', flexShrink: 0,
              padding: '8px 16px', borderRadius: '8px', border: 'none', cursor: 'pointer',
              background: copied ? '#059669' : '#2563eb', color: '#fff',
              fontWeight: 600, fontSize: '0.8125rem', transition: 'background 0.2s',
            }}
          >
            {copied ? <><CheckCheck size={14} /> Copied!</> : <><Copy size={14} /> Copy Link</>}
          </button>
        </div>
      )}

      {loading ? (
        <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
          Loading dashboard…
        </div>
      ) : (
        <>
          {/* Stats Grid */}
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))', gap: '16px', marginBottom: '28px' }}>
            <StatCard
              icon={<Users size={20} color="#2563eb" />}
              label="Total Patients"
              value={stats?.totalPatients ?? stats?.patientCount ?? '—'}
              sub="Registered at your facility"
              color="#2563eb"
            />
            <StatCard
              icon={<CreditCard size={20} color="#7c3aed" />}
              label="Loan Applications"
              value={stats?.totalLoans ?? stats?.loanCount ?? '—'}
              sub={`${stats?.activeLoans ?? 0} active`}
              color="#7c3aed"
            />
            <StatCard
              icon={<DollarSign size={20} color="#059669" />}
              label="Total Disbursed"
              value={formatCurrency(stats?.totalDisbursed ?? stats?.disbursedAmount)}
              sub="Across all patients"
              color="#059669"
            />
            <StatCard
              icon={<TrendingUp size={20} color="#d97706" />}
              label="Repayment Rate"
              value={stats?.repaymentRate != null ? `${stats.repaymentRate}%` : '—'}
              sub="On-time repayments"
              color="#d97706"
            />
          </div>

          {/* Quick breakdown */}
          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
            {/* Application Status Breakdown */}
            <div style={{
              background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
              padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
                Application Status
              </h3>
              {[
                { label: 'Pending Review', value: stats?.pendingLoans ?? 0, color: '#d97706', bg: '#fef3c7' },
                { label: 'Approved', value: stats?.approvedLoans ?? 0, color: '#059669', bg: '#d1fae5' },
                { label: 'Disbursed / Active', value: stats?.activeLoans ?? 0, color: '#2563eb', bg: '#dbeafe' },
                { label: 'Rejected', value: stats?.rejectedLoans ?? 0, color: '#dc2626', bg: '#fee2e2' },
              ].map((row) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #f3f4f6',
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{row.label}</span>
                  <span style={{
                    padding: '2px 10px', borderRadius: '12px', fontSize: '0.8125rem', fontWeight: 600,
                    background: row.bg, color: row.color,
                  }}>
                    {row.value}
                  </span>
                </div>
              ))}
            </div>

            {/* Repayment Summary */}
            <div style={{
              background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
              padding: '20px 24px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
            }}>
              <h3 style={{ margin: '0 0 16px', fontSize: '0.9375rem', fontWeight: 600, color: '#111827' }}>
                Repayment Summary
              </h3>
              {[
                { label: 'Total Collected', value: formatCurrency(stats?.totalRepaid) },
                { label: 'Outstanding Balance', value: formatCurrency(stats?.outstandingBalance) },
                { label: 'Pending Loans', value: stats?.pendingLoans ?? 0 },
                { label: 'Completed Loans', value: stats?.completedLoans ?? 0 },
              ].map((row) => (
                <div key={row.label} style={{
                  display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                  padding: '10px 0', borderBottom: '1px solid #f3f4f6',
                }}>
                  <span style={{ fontSize: '0.875rem', color: '#374151' }}>{row.label}</span>
                  <span style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>{row.value ?? '—'}</span>
                </div>
              ))}
            </div>
          </div>
        </>
      )}
    </div>
  )
}
