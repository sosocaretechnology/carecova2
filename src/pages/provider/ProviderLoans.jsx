import { useEffect, useState } from 'react'
import { CreditCard, RefreshCw, AlertCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'
import StatusBadge from '../../components/StatusBadge'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

const STATUS_OPTIONS = [
  { value: '', label: 'All Statuses' },
  { value: 'pending', label: 'Pending' },
  { value: 'approved', label: 'Approved' },
  { value: 'disbursed', label: 'Disbursed' },
  { value: 'active', label: 'Active' },
  { value: 'completed', label: 'Completed' },
  { value: 'rejected', label: 'Rejected' },
]

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

  if (loading) return <FullScreenLoader label="Loading loan applications…" />

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Loan Applications</h1>
          <p>All loan applications linked to your facility</p>
        </div>
        <div className="flex gap-3 items-center">
          <select value={statusFilter} onChange={handleStatusChange} className="admin-select">
            {STATUS_OPTIONS.map((o) => (
              <option key={o.value} value={o.value}>{o.label}</option>
            ))}
          </select>
          <button onClick={() => load(statusFilter)} className="button button--secondary button--compact">
            <RefreshCw size={14} /> Refresh
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      <div className="admin-table-container">
        {loans.length === 0 ? (
          <div className="cc-empty-state">
            <CreditCard size={44} style={{ color: 'var(--color-border)', marginBottom: 12, display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No loan applications found.</p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table has-sticky-col">
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
                        <td className="font-medium">{patientName}</td>
                        <td className="font-medium">{formatCurrency(loan.requestedAmount ?? loan.amount)}</td>
                        <td className="font-medium">{formatCurrency(loan.approvedAmount)}</td>
                        <td className="text-sm text-muted">{loan.treatmentCategory || loan.purpose || '—'}</td>
                        <td><StatusBadge status={loan.status} /></td>
                        <td className="text-sm text-muted">{formatDate(loan.submittedAt || loan.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="cc-table-footer">
              {loans.length} application{loans.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
