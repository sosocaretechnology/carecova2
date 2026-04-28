import { useEffect, useState } from 'react'
import { DollarSign, RefreshCw, AlertCircle, CheckCircle, Clock, XCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'

function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function PaymentStatusBadge({ status }) {
  const map = {
    paid: { bg: '#d1fae5', color: '#065f46', icon: <CheckCircle size={12} />, label: 'Paid' },
    success: { bg: '#d1fae5', color: '#065f46', icon: <CheckCircle size={12} />, label: 'Paid' },
    pending: { bg: '#fef3c7', color: '#92400e', icon: <Clock size={12} />, label: 'Pending' },
    overdue: { bg: '#fee2e2', color: '#991b1b', icon: <XCircle size={12} />, label: 'Overdue' },
    failed: { bg: '#fee2e2', color: '#991b1b', icon: <XCircle size={12} />, label: 'Failed' },
  }
  const s = map[status?.toLowerCase()] || { bg: '#f3f4f6', color: '#6b7280', icon: null, label: status || '—' }
  return (
    <span style={{
      display: 'inline-flex', alignItems: 'center', gap: '4px',
      padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.icon} {s.label}
    </span>
  )
}

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

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>Repayments</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Track patient loan repayments linked to your facility
          </p>
        </div>
        <button
          onClick={load}
          style={{
            display: 'inline-flex', alignItems: 'center', gap: '6px',
            padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
            background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
          }}
        >
          <RefreshCw size={14} /> Refresh
        </button>
      </div>

      {/* Summary Cards */}
      {!loading && !error && repayments.length > 0 && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '14px', marginBottom: '24px' }}>
          {[
            { label: 'Total Collected', value: formatCurrency(totalCollected), color: '#059669', bg: '#d1fae5' },
            { label: 'Pending Payments', value: formatCurrency(totalPending), color: '#d97706', bg: '#fef3c7' },
            { label: 'Total Transactions', value: repayments.length, color: '#2563eb', bg: '#dbeafe' },
          ].map((c) => (
            <div key={c.label} style={{
              background: '#fff', borderRadius: '10px', border: '1px solid #e5e7eb',
              padding: '16px 20px', boxShadow: '0 1px 3px rgba(0,0,0,0.05)',
            }}>
              <div style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500, marginBottom: '6px' }}>{c.label}</div>
              <div style={{ fontSize: '1.25rem', fontWeight: 700, color: c.color }}>{c.value}</div>
            </div>
          ))}
        </div>
      )}

      {error && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '8px',
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading repayments…</div>
        ) : repayments.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <DollarSign size={44} color="#d1d5db" style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0, color: '#9ca3af', fontWeight: 500 }}>No repayment records yet.</p>
          </div>
        ) : (
          <>
            <table className="admin-table" style={{ margin: 0 }}>
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
                      <td style={{ fontWeight: 600, color: '#111827' }}>{patientName}</td>
                      <td style={{ fontWeight: 500, color: '#374151' }}>
                        {formatCurrency(amountNaira)}
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        {formatDate(r.paidAt || r.paidDate)}
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem', textTransform: 'capitalize' }}>
                        {r.paymentChannel || r.paymentMethod || '—'}
                      </td>
                      <td><PaymentStatusBadge status={r.status} /></td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', fontSize: '0.8125rem', color: '#9ca3af' }}>
              {repayments.length} record{repayments.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
