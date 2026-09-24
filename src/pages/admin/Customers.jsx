import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerService } from '../../services/customerService'
import { Search, Users, CheckCircle, Clock, Wifi, WifiOff, ChevronRight, AlertTriangle, RefreshCw } from 'lucide-react'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

const KYC_BADGE = {
  verified:    { label: 'Verified',     bg: 'var(--color-success-bg)',  color: 'var(--color-success-text)' },
  partial:     { label: 'Partial KYC',  bg: 'var(--color-warning-bg)',  color: 'var(--color-warning-text)' },
  pending:     { label: 'Pending',      bg: 'var(--color-info-bg)',     color: 'var(--color-info-text)' },
  not_started: { label: 'Not Started',  bg: 'var(--color-border-light)', color: 'var(--color-text-muted)' },
}

const MONO_BADGE = {
  linked:      { label: 'Linked',    bg: 'var(--color-success-bg)',   color: 'var(--color-success-text)', Icon: Wifi },
  pending:     { label: 'Pending',   bg: 'var(--color-warning-bg)',   color: 'var(--color-warning-text)', Icon: Clock },
  not_started: { label: 'Not Linked',bg: 'var(--color-border-light)', color: 'var(--color-text-muted)',   Icon: WifiOff },
}

function Badge({ map, value }) {
  const cfg = map[value] || map['not_started']
  return (
    <span style={{
      fontSize: 'var(--text-xs)',
      fontWeight: 600,
      padding: '2px 10px',
      borderRadius: 'var(--radius-full)',
      background: cfg.bg,
      color: cfg.color,
      whiteSpace: 'nowrap',
      display: 'inline-flex',
      alignItems: 'center',
      gap: 4,
    }}>
      {cfg.Icon && <cfg.Icon size={11} />}
      {cfg.label}
    </span>
  )
}

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

export default function Customers() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(true)
  const [customers, setCustomers] = useState([])
  const [error, setError] = useState(null)
  const [search, setSearch] = useState('')
  const [filterKyc, setFilterKyc] = useState('all')
  const [filterMono, setFilterMono] = useState('all')

  const load = async () => {
    let cancelled = false
    setLoading(true)
    setError(null)
    try {
      const data = await customerService.getCustomers()
      if (!cancelled) setCustomers(data)
    } catch (err) {
      if (!cancelled) setError(err.message || 'Failed to load customers')
    } finally {
      if (!cancelled) setLoading(false)
    }
    return () => { cancelled = true }
  }

  useEffect(() => {
    const cancel = load()
    return cancel
  }, [])

  const filtered = useMemo(() => {
    let list = customers
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(c =>
        c.fullName?.toLowerCase().includes(q) ||
        c.phone?.includes(q) ||
        c.email?.toLowerCase().includes(q)
      )
    }
    if (filterKyc !== 'all') list = list.filter(c => c.kycStatus === filterKyc)
    if (filterMono !== 'all') list = list.filter(c => c.monoConnectionStatus === filterMono)
    return list
  }, [customers, search, filterKyc, filterMono])

  const stats = useMemo(() => ({
    total: customers.length,
    kycVerified: customers.filter(c => c.kycStatus === 'verified').length,
    monoLinked: customers.filter(c => c.hasMonoConnection).length,
    activeCredit: customers.filter(c => c.activeLoansCount > 0).length,
  }), [customers])

  if (loading) return <FullScreenLoader label="Loading customers…" />

  if (error) return (
    <div className="admin-page">
      <div className="admin-page-header"><h1>Customers</h1></div>
      <div className="cc-error-state">
        <AlertTriangle size={36} className="cc-error-state-icon" />
        <div className="cc-error-state-title">Could not load customers</div>
        <div className="cc-error-state-desc">{error}</div>
        <button className="button button--secondary button--sm" onClick={load}>
          <RefreshCw size={14} /> Try again
        </button>
      </div>
    </div>
  )

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Customers</h1>
        <p>View every CareCova patient's 360 profile — KYC, bank connections, financial data, and healthcare credit history.</p>
      </div>

      {/* KPI strip */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="admin-kpi-card primary">
          <div className="kpi-title">Total Customers</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="kpi-subtext">Unique patients on record</div>
        </div>
        <div className="admin-kpi-card success">
          <div className="kpi-title">KYC Verified</div>
          <div className="kpi-value">{stats.kycVerified}</div>
          <div className="kpi-subtext">{stats.total ? Math.round(stats.kycVerified / stats.total * 100) : 0}% of total</div>
        </div>
        <div className="admin-kpi-card info">
          <div className="kpi-title">Bank Connected</div>
          <div className="kpi-value">{stats.monoLinked}</div>
          <div className="kpi-subtext">Mono accounts linked</div>
        </div>
        <div className="admin-kpi-card warning">
          <div className="kpi-title">Active Credit</div>
          <div className="kpi-value">{stats.activeCredit}</div>
          <div className="kpi-subtext">Currently financed</div>
        </div>
      </div>

      {/* Toolbar */}
      <div className="admin-toolbar">
        <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 200 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search by name, phone or email…"
            className="admin-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
            aria-label="Search customers"
          />
        </div>
        <div className="admin-filters">
          <select className="admin-select" value={filterKyc} onChange={e => setFilterKyc(e.target.value)} aria-label="KYC status filter">
            <option value="all">All KYC</option>
            <option value="verified">Verified</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="not_started">Not Started</option>
          </select>
          <select className="admin-select" value={filterMono} onChange={e => setFilterMono(e.target.value)} aria-label="Bank connection filter">
            <option value="all">All Bank</option>
            <option value="linked">Linked</option>
            <option value="pending">Pending</option>
            <option value="not_started">Not Linked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <div className="admin-table-wrapper">
          {filtered.length === 0 ? (
            <div className="cc-empty-state">
              <Users size={36} className="cc-empty-state-icon" />
              <div className="cc-empty-state-title">No customers found</div>
              <div className="cc-empty-state-desc">Try adjusting your search or filters</div>
            </div>
          ) : (
            <table className="admin-table has-sticky-col">
              <thead>
                <tr>
                  <th>Patient</th>
                  <th>Phone</th>
                  <th>KYC Status</th>
                  <th>Bank Connection</th>
                  <th>Applications</th>
                  <th>Outstanding</th>
                  <th>Last Activity</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {filtered.map(c => (
                  <tr
                    key={c.id}
                    style={{ cursor: 'pointer' }}
                    onClick={() => navigate(`/admin/customers/${encodeURIComponent(c.phone)}`)}
                  >
                    <td>
                      <div style={{ fontWeight: 600, color: 'var(--color-text)' }}>{c.fullName}</div>
                      <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{c.email}</div>
                    </td>
                    <td style={{ fontFamily: 'var(--font-mono)', fontSize: 'var(--text-caption)' }}>{c.phone}</td>
                    <td><Badge map={KYC_BADGE} value={c.kycStatus} /></td>
                    <td><Badge map={MONO_BADGE} value={c.monoConnectionStatus} /></td>
                    <td>
                      <span style={{ fontWeight: 600 }}>{c.totalApplications}</span>
                      {c.activeLoansCount > 0 && (
                        <span style={{ marginLeft: 6, fontSize: 'var(--text-xs)', color: 'var(--color-info)', background: 'var(--color-info-bg)', padding: '1px 7px', borderRadius: 'var(--radius-full)' }}>
                          {c.activeLoansCount} active
                        </span>
                      )}
                    </td>
                    <td style={{ fontWeight: c.outstandingBalance > 0 ? 600 : 400, color: c.outstandingBalance > 0 ? 'var(--color-danger)' : 'var(--color-text-secondary)' }}>
                      {fmt(c.outstandingBalance)}
                    </td>
                    <td style={{ fontSize: 'var(--text-caption)', color: 'var(--color-text-muted)' }}>
                      {fmtDate(c.lastApplicationDate)}
                    </td>
                    <td>
                      <ChevronRight size={16} style={{ color: 'var(--color-text-label)' }} />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          )}
        </div>

        <div className="admin-table-footer">
          Showing {filtered.length} of {customers.length} customers
        </div>
      </div>
    </div>
  )
}
