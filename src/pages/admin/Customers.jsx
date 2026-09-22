import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { customerService } from '../../services/customerService'
import { Search, Users, CheckCircle, AlertCircle, Clock, Wifi, WifiOff, ChevronRight } from 'lucide-react'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

const KYC_BADGE = {
  verified:    { label: 'Verified',     bg: '#f0fdf4', color: '#16a34a' },
  partial:     { label: 'Partial KYC',  bg: '#fffbeb', color: '#d97706' },
  pending:     { label: 'Pending',      bg: '#eff6ff', color: '#3b82f6' },
  not_started: { label: 'Not Started',  bg: '#f9fafb', color: '#9ca3af' },
}

const MONO_BADGE = {
  linked:      { label: 'Linked',       bg: '#f0fdf4', color: '#16a34a', Icon: Wifi },
  pending:     { label: 'Pending',      bg: '#fffbeb', color: '#d97706', Icon: Clock },
  not_started: { label: 'Not Linked',   bg: '#f9fafb', color: '#9ca3af', Icon: WifiOff },
}

function Badge({ map, value }) {
  const cfg = map[value] || map['not_started']
  return (
    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap', display: 'inline-flex', alignItems: 'center', gap: 4 }}>
      {cfg.Icon && <cfg.Icon size={12} />}
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

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const data = await customerService.getCustomers()
        if (!cancelled) setCustomers(data)
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load customers')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
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

  // summary stats
  const stats = useMemo(() => ({
    total: customers.length,
    kycVerified: customers.filter(c => c.kycStatus === 'verified').length,
    monoLinked: customers.filter(c => c.hasMonoConnection).length,
    activeCredit: customers.filter(c => c.activeLoansCount > 0).length,
  }), [customers])

  if (loading) return <FullScreenLoader label="Loading customers…" />

  if (error) return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Customers</h1>
      </div>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626' }}>
        {error}
      </div>
    </div>
  )

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <h1>Customers</h1>
        <p>View every CareCova patient's 360 profile — KYC, bank connections, financial data, and healthcare credit history.</p>
      </div>

      {/* Summary cards */}
      <div className="admin-kpi-grid" style={{ gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))' }}>
        <div className="admin-kpi-card primary">
          <div className="kpi-title">Total Customers</div>
          <div className="kpi-value">{stats.total}</div>
          <div className="admin-kpi-card kpi-subtext">Unique patients on record</div>
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
      <div className="admin-toolbar flex-between mb-5">
        <div className="admin-search-wrapper flex-1" style={{ marginRight: 12 }}>
          <Search className="search-icon" size={18} />
          <input
            type="text"
            placeholder="Search by name, phone or email…"
            className="admin-search-input"
            value={search}
            onChange={e => setSearch(e.target.value)}
          />
        </div>
        <div className="admin-filters flex items-center gap-3">
          <select className="admin-select" value={filterKyc} onChange={e => setFilterKyc(e.target.value)}>
            <option value="all">All KYC</option>
            <option value="verified">Verified</option>
            <option value="partial">Partial</option>
            <option value="pending">Pending</option>
            <option value="not_started">Not Started</option>
          </select>
          <select className="admin-select" value={filterMono} onChange={e => setFilterMono(e.target.value)}>
            <option value="all">All Bank</option>
            <option value="linked">Linked</option>
            <option value="pending">Pending</option>
            <option value="not_started">Not Linked</option>
          </select>
        </div>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        {filtered.length === 0 ? (
          <div style={{ padding: '48px 24px', textAlign: 'center', color: '#6b7280' }}>
            <Users size={40} style={{ margin: '0 auto 12px', opacity: 0.3 }} />
            <p style={{ margin: 0, fontWeight: 500 }}>No customers found</p>
            <p style={{ margin: '4px 0 0', fontSize: '0.875rem' }}>Try adjusting your search or filters</p>
          </div>
        ) : (
          <table className="admin-table">
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
                    <div style={{ fontWeight: 600, color: '#111827' }}>{c.fullName}</div>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{c.email}</div>
                  </td>
                  <td style={{ fontFamily: 'monospace', fontSize: '0.875rem' }}>{c.phone}</td>
                  <td><Badge map={KYC_BADGE} value={c.kycStatus} /></td>
                  <td><Badge map={MONO_BADGE} value={c.monoConnectionStatus} /></td>
                  <td>
                    <span style={{ fontWeight: 600 }}>{c.totalApplications}</span>
                    {c.activeLoansCount > 0 && (
                      <span style={{ marginLeft: 6, fontSize: '0.75rem', color: '#2563eb', background: '#eff6ff', padding: '1px 7px', borderRadius: 999 }}>
                        {c.activeLoansCount} active
                      </span>
                    )}
                  </td>
                  <td style={{ fontWeight: c.outstandingBalance > 0 ? 600 : 400, color: c.outstandingBalance > 0 ? '#dc2626' : '#374151' }}>
                    {fmt(c.outstandingBalance)}
                  </td>
                  <td style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{fmtDate(c.lastApplicationDate)}</td>
                  <td>
                    <ChevronRight size={16} style={{ color: '#d1d5db' }} />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        )}
      </div>

      <div style={{ marginTop: 12, fontSize: '0.8125rem', color: '#9ca3af', textAlign: 'right' }}>
        Showing {filtered.length} of {customers.length} customers
      </div>
    </div>
  )
}
