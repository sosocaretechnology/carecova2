import { useEffect, useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { Users, Search, RefreshCw, AlertCircle, User, UserPlus } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'
import FullScreenLoader from '../../components/ui/FullScreenLoader'
import StatusBadge from '../../components/StatusBadge'

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

  if (loading) return <FullScreenLoader label="Loading patients…" />

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Patients</h1>
          <p>Patients who applied for financing through your facility</p>
        </div>
        <div className="flex gap-3">
          <form onSubmit={handleSearch} className="admin-toolbar" style={{ marginBottom: 0 }}>
            <div className="admin-search-wrapper">
              <Search className="search-icon" size={15} />
              <input
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by name or phone…"
                className="admin-search-input"
                style={{ width: 220 }}
              />
            </div>
            <button type="submit" className="button button--primary button--compact">Search</button>
          </form>
          <button
            onClick={() => { setSearchInput(''); setSearch(''); load('') }}
            className="button button--secondary button--compact"
          >
            <RefreshCw size={14} /> Refresh
          </button>
          <button onClick={() => navigate('/provider/register-patient')} className="button button--primary">
            <UserPlus size={15} /> Register Patient
          </button>
        </div>
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}

      <div className="admin-table-container">
        {patients.length === 0 ? (
          <div className="cc-empty-state">
            <Users size={44} style={{ color: 'var(--color-border)', marginBottom: 12, display: 'block' }} />
            <p style={{ margin: 0, fontWeight: 500 }}>
              {search ? 'No patients match your search.' : 'No patients found yet.'}
            </p>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table has-sticky-col">
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
                          <div className="flex items-center gap-2">
                            <div className="cc-patient-icon">
                              <User size={15} />
                            </div>
                            <span className="font-medium">{fullName}</span>
                          </div>
                        </td>
                        <td className="text-sm text-muted">{p.phone || '—'}</td>
                        <td className="text-sm text-muted">{p.email || '—'}</td>
                        <td><StatusBadge status={p.loanStatus || p.status} /></td>
                        <td className="text-sm text-muted">{formatDate(p.submittedAt || p.createdAt)}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
            <div className="cc-table-footer">
              {patients.length} patient{patients.length !== 1 ? 's' : ''}
            </div>
          </>
        )}
      </div>
    </div>
  )
}
