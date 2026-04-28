import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, RefreshCw, AlertCircle, User, UserPlus } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'

function statusBadge(status) {
  const map = {
    active: { bg: '#d1fae5', color: '#065f46', label: 'Active Loan' },
    disbursed: { bg: '#dbeafe', color: '#1e40af', label: 'Disbursed' },
    approved: { bg: '#ede9fe', color: '#5b21b6', label: 'Approved' },
    pending: { bg: '#fef3c7', color: '#92400e', label: 'Pending' },
    completed: { bg: '#f3f4f6', color: '#374151', label: 'Completed' },
    rejected: { bg: '#fee2e2', color: '#991b1b', label: 'Rejected' },
    none: { bg: '#f3f4f6', color: '#6b7280', label: 'No Loan' },
  }
  const s = map[status?.toLowerCase()] || map.none
  return (
    <span style={{
      padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
      background: s.bg, color: s.color,
    }}>
      {s.label}
    </span>
  )
}

function formatDate(d) {
  if (!d) return '—'
  return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

export default function ProviderPatients() {
  const navigate = useNavigate()
  const onSessionExpired = useSessionExpired()
  const [patients, setPatients] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [search, setSearch] = useState('')
  const [searchInput, setSearchInput] = useState('')

  const load = (s = '') => {
    setLoading(true)
    setError('')
    providerAuthService.getPatients({ search: s })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.patients ?? data?.data ?? []
        setPatients(list)
      })
      .catch((err) => {
        if (err?.message?.includes('Session expired')) { onSessionExpired(); return }
        setError(err?.message || 'Failed to load patients')
      })
      .finally(() => setLoading(false))
  }

  useEffect(() => { load() }, [])

  const handleSearch = (e) => {
    e.preventDefault()
    setSearch(searchInput)
    load(searchInput)
  }

  return (
    <div>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>Patients</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Patients who applied for financing through your facility
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px', alignItems: 'center' }}>
          <form onSubmit={handleSearch} style={{ display: 'flex', gap: '8px' }}>
            <div style={{ position: 'relative' }}>
              <Search size={15} style={{ position: 'absolute', left: '10px', top: '50%', transform: 'translateY(-50%)', color: '#9ca3af' }} />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or phone…"
                style={{
                  paddingLeft: '32px', paddingRight: '12px', paddingTop: '8px', paddingBottom: '8px',
                  borderRadius: '8px', border: '1.5px solid #e2e8f0', fontSize: '0.875rem',
                  outline: 'none', width: '220px',
                }}
              />
            </div>
            <button type="submit" style={{
              padding: '8px 16px', borderRadius: '8px', border: 'none',
              background: '#2563eb', color: '#fff', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
            }}>
              Search
            </button>
          </form>
          <button
            onClick={() => { setSearchInput(''); setSearch(''); load('') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '8px 14px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button
            onClick={() => navigate('/provider/register-patient')}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '7px',
              padding: '8px 18px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
              boxShadow: '0 2px 8px rgba(37,99,235,0.3)',
            }}
          >
            <UserPlus size={15} /> Register Patient
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
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading patients…</div>
        ) : patients.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Users size={44} color="#d1d5db" style={{ marginBottom: '12px' }} />
            <p style={{ margin: 0, color: '#9ca3af', fontWeight: 500 }}>
              {search ? 'No patients match your search.' : 'No patients found yet.'}
            </p>
          </div>
        ) : (
          <>
            <table className="admin-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>Email</th>
                  <th>Loan Status</th>
                  <th>Date Registered</th>
                </tr>
              </thead>
              <tbody>
                {patients.map((p) => {
                  const id = p.applicationId || p.clientId || p.id || p._id
                  const fullName = p.fullName || p.name || `${p.firstName || ''} ${p.lastName || ''}`.trim() || '—'
                  return (
                    <tr key={id}>
                      <td>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '50%', background: '#eff6ff',
                            border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0,
                          }}>
                            <User size={15} color="#2563eb" />
                          </div>
                          <span style={{ fontWeight: 600, color: '#111827' }}>{fullName}</span>
                        </div>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{p.phone || '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{p.email || '—'}</td>
                      <td>{statusBadge(p.loanStatus || p.status)}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.8125rem' }}>{formatDate(p.submittedAt || p.createdAt)}</td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', fontSize: '0.8125rem', color: '#9ca3af' }}>
              {patients.length} patient{patients.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
