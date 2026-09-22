import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { adminService } from '../../services/adminService'
import { customerService } from '../../services/customerService'
import { computeAffordability, computeRiskFlags } from '../../utils/affordabilityEngine'
import StatusBadge from '../../components/StatusBadge'
import { APPLICATION_STATUS, getStageLabel } from '../../utils/statusModel'
import { Search } from 'lucide-react'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

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
            // Portfolio / Assignment Filter
            if (session?.role === 'sales') {
                if (filters.assignment === 'my_portfolio' && loan.assignedTo !== session.username) return false
                if (filters.assignment === 'unassigned' && loan.assignedTo != null) return false
            }

            // Search
            const searchStr = `${loan.fullName} ${loan.patientName} ${loan.id} ${loan.email} ${loan.phone}`.toLowerCase()
            if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false

            // Status filter
            if (filters.status !== 'all') {
                if (filters.status === 'pending_admin_review') {
                    if (loan.status !== APPLICATION_STATUS.PENDING_ADMIN_REVIEW) return false
                } else if (loan.status !== filters.status) {
                    return false
                }
            }

            // ... (rest of filtering logic remains same)

            if (filters.sector !== 'all') {
                if (filters.sector === 'government' && loan.employmentSector !== 'government') return false
                if (filters.sector === 'private' && loan.employmentSector !== 'private') return false
                if (filters.sector === 'self-employed' && loan.employmentType !== 'self-employed' && loan.employmentType !== 'business-owner') return false
            }

            if (filters.risk !== 'all') {
                // High risk implies score > 35 or has high severity flags
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
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1>Applications Workbench</h1>
                    <p>Review, filter, and manage loan applications</p>
                </div>
                {isSuperAdmin && (
                    <button
                        className={`button ${showTrash ? 'button--danger' : 'button--secondary'} button--compact`}
                        onClick={handleToggleTrash}
                    >
                        🗑 {showTrash ? 'Hide Trash' : `Trash${trash.length > 0 ? ` (${trash.length})` : ''}`}
                    </button>
                )}
            </div>

            {showTrash && (
                <div className="admin-table-container mb-6">
                    <div className="p-4 border-bottom" style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                            <h2 className="text-sm font-bold m-0">Trash — Pending Deletion</h2>
                            <p className="text-xs text-muted mt-1">Applications are permanently deleted 7 days after removal. Restore before then to recover.</p>
                        </div>
                        <button className="button button--ghost button--compact" onClick={loadTrash}>↻ Refresh</button>
                    </div>
                    {trashLoading ? (
                        <div className="p-6 text-center text-muted text-sm">Loading…</div>
                    ) : trash.length === 0 ? (
                        <div className="p-6 text-center text-muted text-sm">Trash is empty.</div>
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
                                                <div className="font-medium">{loan.fullName || loan.patientName || '—'}</div>
                                                <div className="text-xs text-muted">{loan.id}</div>
                                            </td>
                                            <td><StatusBadge status={loan.status} /></td>
                                            <td className="text-sm">{loan.deletedBy || '—'}</td>
                                            <td>
                                                <span style={{ color: daysLeft <= 2 ? '#ef4444' : '#f97316', fontWeight: 600, fontSize: '0.8125rem' }}>
                                                    {daysLeft <= 0 ? 'Today' : `${daysLeft} day${daysLeft !== 1 ? 's' : ''}`}
                                                </span>
                                                <div className="text-xs text-muted">
                                                    {loan.deleteScheduledFor ? new Date(loan.deleteScheduledFor).toLocaleDateString() : ''}
                                                </div>
                                            </td>
                                            <td>
                                                <button
                                                    className="button button--secondary button--compact"
                                                    onClick={() => handleRestore(loan.id)}
                                                    disabled={restoringId === loan.id}
                                                >
                                                    {restoringId === loan.id ? 'Restoring…' : '↩ Restore'}
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

            <div className="admin-toolbar">
                <div className="admin-search-wrapper flex-1">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                    />
                </div>

                <div className="admin-filters">
                    {session?.role === 'sales' && (
                        <select
                            value={filters.assignment}
                            onChange={(e) => handleFilterChange('assignment', e.target.value)}
                            className="admin-select highlight"
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
                    >
                        <option value="all">All Statuses</option>
                        {(session?.role === 'admin' || session?.role === 'super_admin') && (
                            <option value="pending_admin_review">Pending Admin Review</option>
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
                    >
                        <option value="all">All Sectors</option>
                        <option value="government">Government</option>
                        <option value="private">Private</option>
                        <option value="self-employed">Self-employed/Business</option>
                    </select>

                    <select
                        value={filters.risk}
                        onChange={(e) => handleFilterChange('risk', e.target.value)}
                        className="admin-select"
                    >
                        <option value="all">All Risk Levels</option>
                        <option value="high">High Risk</option>
                        <option value="medium">Medium Risk</option>
                        <option value="low">Low Risk</option>
                    </select>

                    <select
                        value={filters.dateRange}
                        onChange={(e) => handleFilterChange('dateRange', e.target.value)}
                        className="admin-select"
                    >
                        <option value="all">All Time</option>
                        <option value="today">Today</option>
                        <option value="week">Past 7 Days</option>
                        <option value="month">Past 30 Days</option>
                    </select>

                    <button type="button" className="button button--secondary" onClick={exportCSV}>
                        📥 Export CSV
                    </button>
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>ID & Applicant</th>
                            <th>Sector</th>
                            <th>Requested (₦)</th>
                            <th>Finances (₦)</th>
                            <th>Affordability</th>
                            <th>Risk Assessment</th>
                            <th>Stage</th>
                            <th>Assigned</th>
                            <th>Date</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLoans.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="empty-table">No applications matched your filters.</td>
                            </tr>
                        ) : (
                            filteredLoans.map(loan => (
                                <tr
                                    key={loan.id}
                                    onClick={(e) => {
                                        if (e.target.closest('button')) return
                                        navigate(`/admin/applications/${loan.id}`)
                                    }}
                                    className="clickable-row"
                                >
                                    <td>
                                            <div className="font-medium">{loan.fullName || loan.patientName}</div>
                                            <div className="text-muted text-xs font-mono">
                                              {loan.applicationCode ? <span style={{ color: '#1d4ed8', fontWeight: 600 }}>{loan.applicationCode}</span> : loan.id}
                                            </div>
                                    </td>
                                    <td>
                                        <div className="capitalize">{loan.employmentSector || loan.employmentType || '—'}</div>
                                    </td>
                                    <td className="font-medium">
                                        {(loan.requestedAmount || loan.estimatedCost)?.toLocaleString()}
                                    </td>
                                    <td>
                                        <div className="text-xs">Inc: {loan.affordability.monthlyIncome?.toLocaleString() || '—'}</div>
                                        <div className="text-xs text-muted">Exp: {loan.affordability.monthlyExpenses?.toLocaleString() || '—'}</div>
                                    </td>
                                    <td>
                                        <span className={`affordability-tag ${loan.affordability.affordabilityTag.toLowerCase().replace(' ', '-')}`}>
                                            {loan.affordability.affordabilityTag}
                                        </span>
                                    </td>
                                    <td>
                                        {loan.riskFlags.some(f => f.severity === 'high') ? (
                                            <span className="risk-badge risk-badge-high">High</span>
                                        ) : loan.riskFlags.some(f => f.severity === 'medium') ? (
                                            <span className="risk-badge risk-badge-medium">Medium</span>
                                        ) : (
                                            <span className="risk-badge risk-badge-low">Low</span>
                                        )}
                                    </td>
                                    <td>
                                        <div className="stage-cell">
                                            <StatusBadge status={loan.status} financingStatus={loan.financing_status} />
                                            <span className="stage-pill">{getStageLabel(loan)}</span>
                                        </div>
                                    </td>
                                    <td>
                                        {loan.assignedTo ? (
                                            <span className="text-sm font-medium">{loan.assignedTo === session.username ? 'Me' : loan.assignedTo}</span>
                                        ) : (
                                            session?.role === 'sales' ? (
                                                <button
                                                    type="button"
                                                    className="button button--secondary button--compact"
                                                    disabled={claimingId === loan.id}
                                                    data-action="claim"
                                                    onClick={async (e) => {
                                                        e.stopPropagation()
                                                        e.preventDefault()
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
                                                <span className="text-muted text-xs italic">Unassigned</span>
                                            )
                                        )}
                                    </td>
                                    <td className="text-muted text-sm">
                                        {new Date(loan.submittedAt).toLocaleDateString()}
                                    </td>
                                    <td>
                                        {loan.phone && (
                                            <button
                                                title="View Patient 360"
                                                onClick={e => { e.stopPropagation(); navigate(`/admin/customers/${encodeURIComponent(customerService.normalisePhone(loan.phone))}`) }}
                                                style={{ fontSize: '0.7rem', fontWeight: 700, padding: '3px 8px', borderRadius: 5, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: 'pointer', whiteSpace: 'nowrap' }}
                                            >
                                                360
                                            </button>
                                        )}
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>

                <div className="table-footer">
                    Showing {filteredLoans.length} of {loans.length} total applications
                </div>
            </div>
        </div>
    )
}
