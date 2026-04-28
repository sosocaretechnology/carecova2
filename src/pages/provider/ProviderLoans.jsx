import { useEffect, useState } from 'react'
import { CreditCard, RefreshCw, AlertCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

const STATUS_STYLE = {
  pending: { bg: '#fef3c7', color: '#92400e' },
  approved: { bg: '#ede9fe', color: '#5b21b6' },
  disbursed: { bg: '#dbeafe', color: '#1e40af' },
  active: { bg: '#d1fae5', color: '#065f46' },
  completed: { bg: '#f3f4f6', color: '#374151' },
  rejected: { bg: '#fee2e2', color: '#991b1b' },
}

function StatusBadge({ status }) {
  const s = STATUS_STYLE[status?.toLowerCase()] || { bg: '#f3f4f6', color: '#6b7280' }
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
      background: s.bg, color: s.color, textTransform: 'capitalize',
    }}>
      {status || '—'}
    </span>
  )
}

function formatCurrency(amount) {
  if (amount == null) return '—'
  return new Intl.NumberFormat('en-NG', { style: 'currency', currency: 'NGN', maximumFractionDigits: 0 }).format(amount)
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProviderLoans() {
  const onSessionExpired = useSessionExpired()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [statusFilter, setStatusFilter] = useState('')

  const load = (status = '') => {
    setLoading(true)
    setError('')
    providerAuthService.getLoans({ status })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.loans ?? data?.applications ?? data?.data ?? []
        setLoans(list)
      })
      .catch((err) => {
        if (err?.message?.includes('Session expired')) { onSessionExpired(); return }
        setError(err?.message || 'Failed to load loans')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleStatusChange = (e) => {
    const val = e.target.value
    setStatusFilter(val)
    load(val)
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>Loan Applications</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            All loan applications linked to your facility
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <select
            value={statusFilter}
            onChange={handleStatusChange}
            style={{
              padding: '8px 12px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
              fontSize: '0.875rem', background: '#fff', cursor: 'pointer', outline: 'none',
            }}
          >
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button
            onClick={() => load(statusFilter)}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
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

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading loan applications…</div>
        ) : loans.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <CreditCard size={44} color="#d1d5db" style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0, color: '#9ca3af', fontWeight: 500 }}>No loan applications found.</p>
          </div>
        ) : (
          <>
            <table className="admin-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Patient Name</th>
                  <th>Amount Requested</th>
                  <th>Amount Approved</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Applied On</th>
                </tr>
              </thead>
              <tbody>
                {loans.map((loan) => {
                  const id = loan.applicationId || loan.id || loan._id
                  const patientName = loan.patientName || loan.applicantName || '—'
                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: 600, color: '#111827' }}>{patientName}</td>
                      <td style={{ color: '#374151', fontWeight: 500 }}>
                        {formatCurrency(loan.requestedAmount ?? loan.amount)}
                      </td>
                      <td style={{ color: '#374151', fontWeight: 500 }}>
                        {formatCurrency(loan.approvedAmount)}
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                        {loan.treatmentCategory || loan.purpose || '—'}
                      </td>
                      <td><StatusBadge status={loan.status} /></td>
                      <td style={{ color: '#6b7280', fontSize: '0.8125rem' }}>{formatDate(loan.submittedAt || loan.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', fontSize: '0.8125rem', color: '#9ca3af' }}>
              {loans.length} application{loans.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
