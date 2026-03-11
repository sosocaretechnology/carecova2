import { useState, useEffect, useMemo } from 'react'
import { useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { adminService } from '../../services/adminService'
import { computeAffordability, computeRiskFlags } from '../../utils/affordabilityEngine'
import StatusBadge from '../../components/StatusBadge'
import { Search } from 'lucide-react'

export default function Applications() {
    const navigate = useNavigate()
    const { session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [loans, setLoans] = useState([])
    const [searchTerm, setSearchTerm] = useState('')
    const [filters, setFilters] = useState({
        status: 'all',
        sector: 'all',
        risk: 'all',
        dateRange: 'all',
        assignment: session?.role === 'sales' ? 'my_portfolio' : 'all',
    })

    useEffect(() => {
        async function loadLoans() {
            try {
                setLoading(true)
                const data = await adminService.getAllLoans()
                // Compute affordability and risk flags for each loan for table display
                const enriched = data.map(loan => ({
                    ...loan,
                    affordability: computeAffordability(loan),
                    riskFlags: computeRiskFlags(loan),
                }))
                // Sort newest first
                enriched.sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
                setLoans(enriched)
            } catch (error) {
                console.error('Error loading loans:', error)
            } finally {
                setLoading(false)
            }
        }
        loadLoans()
    }, [])

    const filteredLoans = useMemo(() => {
        return loans.filter(loan => {
            // Portfolio / Assignment Filter
            if (session?.role === 'sales') {
                if (filters.assignment === 'my_portfolio' && loan.assignedTo !== session.username) return false
                if (filters.assignment === 'unassigned' && loan.assignedTo !== null) return false
            }

            // Search
            const searchStr = `${loan.fullName} ${loan.patientName} ${loan.id} ${loan.email} ${loan.phone}`.toLowerCase()
            if (searchTerm && !searchStr.includes(searchTerm.toLowerCase())) return false

            // Filters
            if (filters.status !== 'all' && loan.status !== filters.status) return false

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

    if (loading) return <div className="admin-loading">Loading applications...</div>

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1>Applications Workbench</h1>
                <p>Review, filter, and manage loan applications</p>
            </div>

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
                        <option value="pending">Pending</option>
                        <option value="approved">Approved</option>
                        <option value="active">Active</option>
                        <option value="rejected">Rejected</option>
                        <option value="completed">Completed</option>
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
                            <th>Date</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLoans.length === 0 ? (
                            <tr>
                                <td colSpan="9" className="empty-table">No applications matched your filters.</td>
                            </tr>
                        ) : (
                            filteredLoans.map(loan => (
                                <tr key={loan.id} onClick={() => navigate(`/admin/applications/${loan.id}`)} className="clickable-row">
                                    <td>
                                        <div className="font-medium">{loan.fullName || loan.patientName}</div>
                                        <div className="text-muted text-xs font-mono">{loan.id}</div>
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
                                        <StatusBadge status={loan.status} />
                                    </td>
                                    <td>
                                        {loan.assignedTo ? (
                                            <span className="text-sm font-medium">{loan.assignedTo === session.username ? 'Me' : loan.assignedTo}</span>
                                        ) : (
                                            session?.role === 'sales' ? (
                                                <button
                                                    type="button"
                                                    className="button button--secondary button--compact"
                                                    onClick={(e) => {
                                                        e.stopPropagation()
                                                        adminService.assignToMe(loan.id).then(() => window.location.reload())
                                                    }}
                                                >
                                                    Claim
                                                </button>
                                            ) : (
                                                <span className="text-muted text-xs italic">Unassigned</span>
                                            )
                                        )}
                                    </td>
                                    <td className="text-muted text-sm">
                                        {new Date(loan.submittedAt).toLocaleDateString()}
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
