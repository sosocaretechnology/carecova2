import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { adminService } from '../../services/adminService'
import { customerService } from '../../services/customerService'
import { computeAffordability, computeRiskFlags } from '../../utils/affordabilityEngine'
import StatusBadge from '../../components/StatusBadge'
import { APPLICATION_STATUS, getStageLabel } from '../../utils/statusModel'
import { Search, Download, RotateCcw, Trash2, ChevronRight, AlertTriangle } from 'lucide-react'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

function relativeDate(dateStr) {
    if (!dateStr) return '—'
    const d = new Date(dateStr)
    const now = new Date()
    const diffMs = now - d
    const diffDays = Math.floor(diffMs / 86400000)
    if (diffDays === 0) return 'Today'
    if (diffDays === 1) return 'Yesterday'
    if (diffDays < 7) return `${diffDays}d ago`
    if (diffDays < 30) return `${Math.floor(diffDays / 7)}w ago`
    return d.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
}

function getRiskLevel(loan) {
    if (loan.riskFlags.some(f => f.severity === 'high')) return 'high'
    if (loan.riskFlags.some(f => f.severity === 'medium')) return 'medium'
    return 'low'
}

function RiskBadge({ level }) {
    const labels = { high: 'High', medium: 'Medium', low: 'Low' }
    return (
        <span className={`risk-badge risk-badge-${level}`}>{labels[level]}</span>
    )
}

export default function Applications() {
    const navigate = useNavigate()
    const { session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [loans, setLoans] = useState([])
    const [claimingId, setClaimingId] = useState(null)
    const [searchTerm, setSearchTerm] = useState('')
    const [showTrash, setShowTrash] = useState(false)
    const [trash, setTrash] = useState([])
    const [trashLoading, setTrashLoading] = useState(false)
    const [restoringId, setRestoringId] = useState(null)
    const isSuperAdmin = session?.role === 'super_admin'
    const [filters, setFilters] = useState({
        status: (session?.role === 'admin' || session?.role === 'super_admin') ? 'pending_admin_review' : 'all',
        sector: 'all',
        risk: 'all',
        dateRange: 'all',
        assignment: session?.role === 'sales' ? 'my_portfolio' : 'all',
    })

    const loadLoans = async () => {
        try {
            setLoading(true)
            const data = await adminService.getAllLoans()
            const enriched = data.map(loan => ({
                ...loan,
                affordability: computeAffordability(loan),
                riskFlags: computeRiskFlags(loan),
            }))
            enriched.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
            setLoans(enriched)
        } catch (error) {
            console.error('Error loading loans:', error)
        } finally {
            setLoading(false)
        }
    }

    const loadTrash = async () => {
        setTrashLoading(true)
        try {
            const data = await adminService.getTrashApplications()
            setTrash(Array.isArray(data) ? data : [])
        } catch (err) {
            console.error('Error loading trash:', err)
        } finally {
            setTrashLoading(false)
        }
    }

    useEffect(() => {
        loadLoans()
    }, [])

    const handleToggleTrash = () => {
        const next = !showTrash
        setShowTrash(next)
        if (next && trash.length === 0) loadTrash()
    }

    const handleRestore = async (loanId) => {
        setRestoringId(loanId)
        try {
            await adminService.restoreApplication(loanId)
            setTrash(prev => prev.filter(l => l.id !== loanId))
            loadLoans()
        } catch (err) {
            console.error('Restore failed:', err)
        } finally {
            setRestoringId(null)
        }
    }

    const filteredLoans = useMemo(() => {
        return loans.filter(loan => {
            if (session?.role === 'sales') {
                if (filters.assignment === 'my_portfolio' && loan.assignedTo !== session.username) return false
                if (filters.assignment === 'unassigned' && loan.assignedTo != null) return false
            }

            const searchStr = `${loan.fullName} ${loan.patientName} ${loan.id} ${loan.email} ${loan.phone}`.toLowerCase()
            if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false

            if (filters.status !== 'all') {
                if (filters.status === 'pending_admin_review') {
                    if (loan.status !== APPLICATION_STATUS.PENDING_ADMIN_REVIEW) return false
                } else if (loan.status !== filters.status) {
                    return false
                }
            }

            if (filters.sector !== 'all') {
                if (filters.sector === 'government' && loan.employmentSector !== 'government') return false
                if (filters.sector === 'private' && loan.employmentSector !== 'private') return false
                if (filters.sector === 'self-employed' && loan.employmentType !== 'self-employed' && loan.employmentType !== 'business-owner') return false
            }

            if (filters.risk !== 'all') {
                const hasHighRisk = loan.riskScore > 35 || loan.riskFlags.some(f => f.severity === 'high')
                const hasMediumRisk = !hasHighRisk && (loan.riskScore > 15 || loan.riskFlags.some(f => f.severity === 'medium'))
                if (filters.risk === 'high' && !hasHighRisk) return false
                if (filters.risk === 'medium' && !hasMediumRisk) return false
                if (filters.risk === 'low' && (hasHighRisk || hasMediumRisk)) return false
            }

            if (filters.dateRange !== 'all') {
                const now = new Date()
                const submitted = new Date(loan.submittedAt)
                const daysAgo = (now - submitted) / (1000 * 60 * 60 * 24)
                if (filters.dateRange === 'today' && daysAgo > 1) return false
                if (filters.dateRange === 'week' && daysAgo > 7) return false
                if (filters.dateRange === 'month' && daysAgo > 30) return false
            }

            return true
        })
    }, [loans, searchTerm, filters])

    const handleFilterChange = (key, value) => {
        setFilters(prev => ({ ...prev, [key]: value }))
    }

    const exportCSV = () => {
        const headers = ['ID', 'Name', 'Phone', 'Sector', 'Amount', 'Income', 'Status', 'Submitted At']
        const csvData = filteredLoans.map(l => [
            l.id, l.fullName || l.patientName, l.phone,
            l.employmentSector || l.employmentType,
            l.requestedAmount, l.monthlyIncome, l.status,
            new Date(l.submittedAt).toLocaleDateString()
        ].join(','))
        const csvContent = "data:text/csv;charset=utf-8," + [headers.join(','), ...csvData].join("\n")
        const encodedUri = encodeURI(csvContent)
        const link = document.createElement("a")
        link.setAttribute("href", encodedUri)
        link.setAttribute("download", "carecova_applications.csv")
        document.body.appendChild(link)
        link.click()
        document.body.removeChild(link)
    }

    if (loading) return <FullScreenLoader label="Loading applications…" />

    return (
        <div className="admin-page applications-page">
            <div className="admin-page-header" style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: 16, flexWrap: 'wrap' }}>
                <div>
                    <h1>Applications</h1>
                    <p>Review, filter, and manage all credit applications</p>
                </div>
                <div style={{ display: 'flex', gap: 8, flexShrink: 0 }}>
                    {isSuperAdmin && (
                        <button
                            className={`button button--sm ${showTrash ? 'button--danger' : 'button--ghost'}`}
                            onClick={handleToggleTrash}
                            title="View deleted applications"
                        >
                            <Trash2 size={15} />
                            {showTrash ? 'Hide Trash' : `Trash${trash.length > 0 ? ` (${trash.length})` : ''}`}
                        </button>
                    )}
                    <button type="button" className="button button--sm button--secondary" onClick={exportCSV}>
                        <Download size={15} />
                        Export CSV
                    </button>
                </div>
            </div>

            {/* ── Trash panel ── */}
            {showTrash && (
                <div className="admin-table-container" style={{ marginBottom: 24 }}>
                    <div style={{ padding: '14px 16px', borderBottom: '1px solid var(--color-border)', display: 'flex', justifyContent: 'space-between', alignItems: 'center', background: '#fef2f2' }}>
                        <div>
                            <div style={{ fontWeight: 700, fontSize: 'var(--text-body-sm)', color: 'var(--color-danger)' }}>
                                Trash — Pending Deletion
                            </div>
                            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                                Applications are permanently deleted 7 days after removal.
                            </div>
                        </div>
                        <button className="button button--ghost button--sm" onClick={loadTrash}>
                            <RotateCcw size={14} /> Refresh
                        </button>
                    </div>
                    {trashLoading ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-body-sm)' }}>Loading…</div>
                    ) : trash.length === 0 ? (
                        <div style={{ padding: '24px', textAlign: 'center', color: 'var(--color-text-muted)', fontSize: 'var(--text-body-sm)' }}>Trash is empty.</div>
                    ) : (
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Applicant</th>
                                    <th>Status</th>
                                    <th>Deleted by</th>
                                    <th>Permanent deletion</th>
                                    <th></th>
                                </tr>
                            </thead>
                            <tbody>
                                {trash.map(loan => {
                                    const daysLeft = loan.deleteScheduledFor
                                        ? Math.ceil((new Date(loan.deleteScheduledFor) - Date.now()) / 86400000)
                                        : 7
                                    return (
                                        <tr key={loan.id} style={{ opacity: 0.8 }}>
                                            <td>
                                                <div style={{ fontWeight: 600 }}>{loan.fullName || loan.patientName || '—'}</div>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>{loan.id}</div>
                                            </td>
                                            <td><StatusBadge status={loan.status} /></td>
                                            <td style={{ fontSize: 'var(--text-body-sm)' }}>{loan.deletedBy || '—'}</td>
                                            <td>
                                                <span style={{ color: daysLeft <= 2 ? 'var(--color-danger)' : 'var(--color-warning)', fontWeight: 600, fontSize: 'var(--text-label)' }}>
                                                    {daysLeft <= 0 ? 'Today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                                                </span>
                                            </td>
                                            <td>
                                                <button
                                                    className="button button--secondary button--sm"
                                                    onClick={() => handleRestore(loan.id)}
                                                    disabled={restoringId === loan.id}
                                                >
                                                    <RotateCcw size={13} />
                                                    {restoringId === loan.id ? 'Restoring…' : 'Restore'}
                                                </button>
                                            </td>
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    )}
                </div>
            )}

            {/* ── Toolbar ── */}
            <div className="admin-toolbar">
                <div className="admin-search-wrapper" style={{ flex: 1, minWidth: 200 }}>
                    <Search className="search-icon" size={16} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, phone…"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                        aria-label="Search applications"
                    />
                </div>

                <div className="admin-filters">
                    {session?.role === 'sales' && (
                        <select
                            value={filters.assignment}
                            onChange={(e) => handleFilterChange('assignment', e.target.value)}
                            className="admin-select"
                            aria-label="Assignment filter"
                        >
                            <option value="my_portfolio">My Portfolio</option>
                            <option value="unassigned">Open Requests</option>
                            <option value="all">All Applications</option>
                        </select>
                    )}

                    <select
                        value={filters.status}
                        onChange={(e) => handleFilterChange('status', e.target.value)}
                        className="admin-select"
                        aria-label="Status filter"
                    >
                        <option value="all">All Statuses</option>
                        {(session?.role === 'admin' || session?.role === 'super_admin') && (
                            <option value="pending_admin_review">Pending Review</option>
                        )}
                        <option value={APPLICATION_STATUS.PENDING}>Pending</option>
                        <option value={APPLICATION_STATUS.SUBMITTED}>Submitted</option>
                        <option value={APPLICATION_STATUS.INCOMPLETE}>Incomplete</option>
                        <option value={APPLICATION_STATUS.APPROVED}>Approved</option>
                        <option value={APPLICATION_STATUS.APPROVED_FOR_DISBURSEMENT}>Approved for Disbursement</option>
                        <option value={APPLICATION_STATUS.ACTIVE}>Active</option>
                        <option value={APPLICATION_STATUS.REJECTED}>Rejected</option>
                        <option value={APPLICATION_STATUS.COMPLETED}>Completed</option>
                    </select>

                    <select
                        value={filters.sector}
                        onChange={(e) => handleFilterChange('sector', e.target.value)}
                        className="admin-select"
                        aria-label="Sector filter"
                    >
                        <option value="all">All Sectors</option>
                        <option value="government">Government</option>
                        <option value="private">Private</option>
                        <option value="self-employed">Self-employed / Business</option>
                    </select>

                    <select
                        value={filters.risk}
                        onChange={(e) => handleFilterChange('risk', e.target.value)}
                        className="admin-select"
                        aria-label="Risk filter"
                    >
                        <option value="all">All Risk</option>
                        <option value="high">High Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="low">Low Risk</option>
                    </select>

                    <select
                        value={filters.dateRange}
                        onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                        className="admin-select"
                        aria-label="Date range filter"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Past 7 Days</option>
                        <option value="month">Past 30 Days</option>
                    </select>
                </div>
            </div>

            {/* ── Desktop table (hidden on mobile) ── */}
            <div className="admin-table-container">
                <div className="admin-table-wrapper">
                    <table className="admin-table has-sticky-col">
                        <thead>
                            <tr>
                                <th>Applicant</th>
                                <th>Sector</th>
                                <th>Amount (₦)</th>
                                <th>Finances (₦)</th>
                                <th>Affordability</th>
                                <th>Risk</th>
                                <th>Status</th>
                                <th>Assigned</th>
                                <th>Date</th>
                                <th></th>
                            </tr>
                        </thead>
                        <tbody>
                            {filteredLoans.length === 0 ? (
                                <tr>
                                    <td colSpan="10" style={{ padding: '48px 24px', textAlign: 'center', color: 'var(--color-text-muted)' }}>
                                        <AlertTriangle size={32} style={{ margin: '0 auto 10px', opacity: 0.3 }} />
                                        <div style={{ fontWeight: 600 }}>No applications matched your filters</div>
                                        <div style={{ fontSize: 'var(--text-xs)', marginTop: 4 }}>Try adjusting your search or filter criteria</div>
                                    </td>
                                </tr>
                            ) : (
                                filteredLoans.map(loan => {
                                    const riskLevel = getRiskLevel(loan)
                                    return (
                                        <tr
                                            key={loan.id}
                                            style={{ cursor: 'pointer' }}
                                            onClick={(e) => {
                                                if (e.target.closest('button')) return
                                                navigate(`/admin/applications/${loan.id}`)
                                            }}
                                        >
                                            <td style={{ minWidth: 180 }}>
                                                <div style={{ fontWeight: 600, color: 'var(--color-text)', lineHeight: 1.3 }}>
                                                    {loan.fullName || loan.patientName}
                                                </div>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', fontFamily: 'var(--font-mono)', marginTop: 2 }}>
                                                    {loan.applicationCode
                                                        ? <span style={{ color: 'var(--color-info)' }}>{loan.applicationCode}</span>
                                                        : loan.id
                                                    }
                                                </div>
                                            </td>
                                            <td className="capitalize" style={{ fontSize: 'var(--text-body-sm)' }}>
                                                {loan.employmentSector || loan.employmentType || '—'}
                                            </td>
                                            <td style={{ fontWeight: 600, color: 'var(--color-text)' }}>
                                                {(loan.requestedAmount || loan.estimatedCost)?.toLocaleString() || '—'}
                                            </td>
                                            <td>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-secondary)' }}>
                                                    Inc: {loan.affordability.monthlyIncome?.toLocaleString() || '—'}
                                                </div>
                                                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)' }}>
                                                    Exp: {loan.affordability.monthlyExpenses?.toLocaleString() || '—'}
                                                </div>
                                            </td>
                                            <td>
                                                <span className={`affordability-tag affordability-tag--${loan.affordability.affordabilityTag?.toLowerCase().replace(/\s/g, '_')}`}>
                                                    {loan.affordability.affordabilityTag}
                                                </span>
                                            </td>
                                            <td><RiskBadge level={riskLevel} /></td>
                                            <td>
                                                <StatusBadge status={loan.status} financingStatus={loan.financing_status} />
                                            </td>
                                            <td style={{ fontSize: 'var(--text-body-sm)' }}>
                                                {loan.assignedTo ? (
                                                    <span style={{ fontWeight: 500 }}>
                                                        {loan.assignedTo === session?.username ? 'Me' : loan.assignedTo}
                                                    </span>
                                                ) : (
                                                    session?.role === 'sales' ? (
                                                        <button
                                                            type="button"
                                                            className="button button--secondary button--sm"
                                                            disabled={claimingId === loan.id}
                                                            onClick={async (e) => {
                                                                e.stopPropagation()
                                                                setClaimingId(loan.id)
                                                                try {
                                                                    await adminService.assignToMe(loan.id)
                                                                    await loadLoans()
                                                                } catch (err) {
                                                                    alert(err.message || 'Could not claim application')
                                                                } finally {
                                                                    setClaimingId(null)
                                                                }
                                                            }}
                                                        >
                                                            {claimingId === loan.id ? 'Claiming…' : 'Claim'}
                                                        </button>
                                                    ) : (
                                                        <span style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-label)', fontStyle: 'italic' }}>
                                                            Unassigned
                                                        </span>
                                                    )
                                                )}
                                            </td>
                                            <td style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', whiteSpace: 'nowrap' }}>
                                                <span title={new Date(loan.submittedAt).toLocaleString()}>
                                                    {relativeDate(loan.submittedAt)}
                                                </span>
                                            </td>
                                            <td>
                                                {loan.phone && (
                                                    <button
                                                        aria-label="View Customer 360 profile"
                                                        className="cc-btn-360"
                                                        onClick={e => {
                                                            e.stopPropagation()
                                                            navigate(`/admin/customers/${encodeURIComponent(customerService.normalisePhone(loan.phone))}`)
                                                        }}
                                                    >
                                                        360
                                                    </button>
                                                )}
                                            </td>
                                        </tr>
                                    )
                                })
                            )}
                        </tbody>
                    </table>
                </div>

                <div className="admin-table-footer">
                    <span>Showing {filteredLoans.length} of {loans.length} applications</span>
                </div>
            </div>

            {/* ── Mobile cards (shown ≤768px via CSS) ── */}
            <div className="cc-app-cards">
                {filteredLoans.length === 0 ? (
                    <div className="cc-empty-state">
                        <AlertTriangle size={36} className="cc-empty-state-icon" />
                        <div className="cc-empty-state-title">No applications found</div>
                        <div className="cc-empty-state-desc">Try adjusting your search or filter criteria</div>
                    </div>
                ) : (
                    filteredLoans.map(loan => {
                        const riskLevel = getRiskLevel(loan)
                        return (
                            <div
                                key={loan.id}
                                className="cc-app-card"
                                onClick={() => navigate(`/admin/applications/${loan.id}`)}
                                role="button"
                                tabIndex={0}
                                onKeyDown={e => e.key === 'Enter' && navigate(`/admin/applications/${loan.id}`)}
                                aria-label={`Open application for ${loan.fullName || loan.patientName}`}
                            >
                                <div className="cc-app-card-header">
                                    <div>
                                        <div className="cc-app-card-name">{loan.fullName || loan.patientName}</div>
                                        <div className="cc-app-card-id">
                                            {loan.applicationCode || loan.id}
                                        </div>
                                    </div>
                                    <div className="cc-app-card-badges">
                                        <RiskBadge level={riskLevel} />
                                        <StatusBadge status={loan.status} />
                                    </div>
                                </div>

                                <div className="cc-app-card-body">
                                    <div className="cc-app-card-field">
                                        <div className="cc-app-card-field-label">Amount</div>
                                        <div className="cc-app-card-field-value">
                                            ₦{(loan.requestedAmount || loan.estimatedCost)?.toLocaleString() || '—'}
                                        </div>
                                    </div>
                                    <div className="cc-app-card-field">
                                        <div className="cc-app-card-field-label">Affordability</div>
                                        <div className="cc-app-card-field-value">
                                            <span className={`affordability-tag affordability-tag--${loan.affordability.affordabilityTag?.toLowerCase().replace(/\s/g, '_')}`}>
                                                {loan.affordability.affordabilityTag}
                                            </span>
                                        </div>
                                    </div>
                                    <div className="cc-app-card-field">
                                        <div className="cc-app-card-field-label">Sector</div>
                                        <div className="cc-app-card-field-value capitalize">
                                            {loan.employmentSector || loan.employmentType || '—'}
                                        </div>
                                    </div>
                                    <div className="cc-app-card-field">
                                        <div className="cc-app-card-field-label">Submitted</div>
                                        <div className="cc-app-card-field-value">{relativeDate(loan.submittedAt)}</div>
                                    </div>
                                </div>

                                <div className="cc-app-card-footer">
                                    <span className="cc-app-card-assigned">
                                        {loan.assignedTo
                                            ? `Assigned: ${loan.assignedTo === session?.username ? 'Me' : loan.assignedTo}`
                                            : 'Unassigned'
                                        }
                                    </span>
                                    <ChevronRight size={16} style={{ color: 'var(--color-text-label)' }} />
                                </div>
                            </div>
                        )
                    })
                )}
                <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', textAlign: 'center', padding: '8px 0' }}>
                    Showing {filteredLoans.length} of {loans.length} applications
                </div>
            </div>
        </div>
    )
}
