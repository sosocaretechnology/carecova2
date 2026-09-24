import { useEffect, useState } from 'react'
import { DollarSign, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

const STATUS_MAP = {
  paid: { bg: 'var(--color-success-bg)', color: 'var(--color-success-text)', icon: CheckCircle, label: 'Paid' },
  success: { bg: 'var(--color-success-bg)', color: 'var(--color-success-text)', icon: CheckCircle, label: 'Paid' },
  pending: { bg: 'var(--color-warning-bg)', color: 'var(--color-warning-text)', icon: Clock, label: 'Pending' },
  overdue: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', icon: XCircle, label: 'Overdue' },
  failed: { bg: 'var(--color-danger-bg)', color: 'var(--color-danger-text)', icon: XCircle, label: 'Failed' },
}

function PaymentStatusBadge({ status }) {
  const key = status?.toLowerCase()
  const s = STATUS_MAP[key] || { bg: 'var(--color-bg-warm)', color: 'var(--color-text-muted)', icon: null, label: status || '—' }
  const Icon = s.icon
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: 4,
      padding: '3px 10px', borderRadius: 12, fontSize: 'var(--text-xs)', fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {Icon && <Icon size={12} />} {s.label}
    </span>
  )
}

const SUMMARY_CARDS = (totalCollected, totalPending, total) => [
  { label: 'Total Collected', value: formatCurrency(totalCollected), variant: 'success' },
  { label: 'Pending Payments', value: formatCurrency(totalPending), variant: 'warning' },
  { label: 'Total Transactions', value: total, variant: '' },
]

export default function ProviderRepayments() {
  const onSessionExpired = useSessionExpired()
  const [repayments, setRepayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const load = () => {
    setLoading(true)
    setError('')
    providerAuthService.getRepayments()
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.repayments ?? data?.payments ?? data?.data ?? []
        setRepayments(list)
      })
      .catch((err) => {
        if (err?.message?.includes('Session expired')) { onSessionExpired(); return }
        setError(err?.message || 'Failed to load repayments')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const toNaira = (r) => (r.amountKobo != null ? r.amountKobo / 100 : (r.amount || 0))

  const totalCollected = repayments
    .filter((r) => ['paid', 'success'].includes(r.status?.toLowerCase()))
    .reduce((sum, r) => sum + toNaira(r), 0)

  const totalPending = repayments
    .filter((r) => r.status?.toLowerCase() === 'pending')
    .reduce((sum, r) => sum + toNaira(r), 0)

  if (loading) return <FullScreenLoader label="Loading repayments…" />

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Repayments</h1>
          <p>Track patient loan repayments linked to your facility</p>
        </div>
        <button onClick={load} className="button button--secondary button--compact">
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      {!error && repayments.length > 0 && (
        <div className="admin-kpi-grid" style={{ marginBottom: 24 }}>
          {SUMMARY_CARDS(totalCollected, totalPending, repayments.length).map((c) => (
            <div key={c.label} className={`admin-kpi-card ${c.variant}`}>
              <div className="kpi-title">{c.label}</div>
              <div className="kpi-value">{c.value}</div>
            </div>
          ))}
        </div>
      )}

      <div className="admin-table-container">
        {repayments.length === 0 ? (
          <div className="cc-empty-state">
            <DollarSign size={44} style={{ color: 'var(--color-border)', marginBottom: 12, display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No repayment records yet.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table has-sticky-col">
                <thead>
                  <tr>
                    <th>Patient</th>
                    <th>Amount</th>
                    <th>Paid Date</th>
                    <th>Channel</th>
                    <th>Status</th>
                  </tr>
                </thead>
                <tbody>
                  {repayments.map((r) => {
                    const id = r.repaymentId || r.id || r._id
                    const patientName = r.patientName || r.customerName || '—'
                    const amountNaira = r.amountKobo != null ? r.amountKobo / 100 : (r.amount || null)
                    return (
                      <tr key={id}>
                        <td className="font-medium">{patientName}</td>
                        <td className="font-medium">{formatCurrency(amountNaira)}</td>
                        <td className="text-sm text-muted">{formatDate(r.paidAt || r.paidDate)}</td>
                        <td className="text-sm text-muted" style={{ textTransform: 'capitalize' }}>
                          {r.paymentChannel || r.paymentMethod || '—'}
                        </td>
                        <td><PaymentStatusBadge status={r.status} /></td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="cc-table-footer">
              {repayments.length} record{repayments.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
