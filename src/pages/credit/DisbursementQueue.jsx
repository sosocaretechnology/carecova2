import { useState, useEffect } from 'react'
import { useNavigate, useLocation } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/StatusBadge'
import { Search, Filter, Clock, ArrowRight } from 'lucide-react'

function timeInQueue(submittedAt) {
    if (!submittedAt) return '—'
    const ms = Date.now() - new Date(submittedAt).getTime()
    const hours = Math.floor(ms / (1000 * 60 * 60))
    if (hours < 1) return '< 1h'
    if (hours < 24) return `${hours}h`
    return `${Math.floor(hours / 24)}d`
}

export default function DisbursementQueue() {
    const [loans, setLoans] = useState([])
    const [loading, setLoading] = useState(true)
    const [search, setSearch] = useState('')
    const [methodFilter, setMethodFilter] = useState('all')
    const navigate = useNavigate()
    const location = useLocation()
    const basePath = location.pathname.startsWith('/admin') ? '/admin/disbursements' : '/credit/disbursements'

    useEffect(() => {
        adminService.getDisbursementQueue().then(q => {
            setLoans(q)
            setLoading(false)
        })
    }, [])

    const filtered = loans.filter(l => {
        const name = (l.fullName || l.patientName || '').toLowerCase()
        const hospital = (l.disbursementIntent?.hospitalName || '').toLowerCase()
        const term = search.toLowerCase()
        const matchSearch = name.includes(term) || hospital.includes(term) || l.id.toLowerCase().includes(term)
        const matchMethod = methodFilter === 'all' || l.disbursementIntent?.payoutMethod === methodFilter
        return matchSearch && matchMethod
    })

    if (loading) return <div className="admin-loading">Loading disbursement queue...</div>

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1>Disbursement Queue</h1>
                    <p>Review and execute payouts for approved applications</p>
                </div>
                <div className="flex items-center gap-3">
                    <span className="text-sm text-muted">{filtered.length} case{filtered.length !== 1 ? 's' : ''}</span>
                </div>
            </div>

            <div className="admin-toolbar flex gap-3 mb-5">
                <div className="admin-search-wrapper flex-1">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, hospital, or loan ID..."
                        className="admin-search-input"
                        value={search}
                        onChange={e => setSearch(e.target.value)}
                    />
                </div>
                <div className="flex items-center gap-2">
                    <Filter size={16} className="text-muted" />
                    <select
                        className="admin-select"
                        value={methodFilter}
                        onChange={e => setMethodFilter(e.target.value)}
                    >
                        <option value="all">All Methods</option>
                        <option value="bank_transfer">Bank Transfer</option>
                        <option value="remita">Remita</option>
                        <option value="manual">Manual</option>
                    </select>
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Applicant</th>
                            <th>Amount (₦)</th>
                            <th>Hospital</th>
                            <th>Method</th>
                            <th>Time in Queue</th>
                            <th>Status</th>
                            <th>Action</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filtered.length === 0 ? (
                            <tr><td colSpan="7" className="empty-table">No disbursements in queue.</td></tr>
                        ) : (
                            filtered.map(loan => (
                                <tr key={loan.id}>
                                    <td>
                                        <div className="font-medium">{loan.fullName || loan.patientName}</div>
                                        <div className="text-xs text-muted font-mono">{loan.id}</div>
                                    </td>
                                    <td className="font-bold">
                                        {(loan.approvedAmount || 0).toLocaleString()}
                                    </td>
                                    <td className="text-sm">
                                        {loan.disbursementIntent?.hospitalName || <span className="text-muted italic">Not entered</span>}
                                    </td>
                                    <td className="text-sm capitalize">
                                        {loan.disbursementIntent?.payoutMethod?.replace('_', ' ') || <span className="text-muted">—</span>}
                                    </td>
                                    <td>
                                        <span className="flex items-center gap-1 text-xs">
                                            <Clock size={12} />
                                            {timeInQueue(loan.approvedAt || loan.submittedAt)}
                                        </span>
                                    </td>
                                    <td><StatusBadge status={loan.status} /></td>
                                    <td>
                                        <button
                                            type="button"
                                            className="button button--primary button--compact flex items-center gap-1"
                                            onClick={() => navigate(`${basePath}/${loan.id}`)}
                                        >
                                            Open <ArrowRight size={12} />
                                        </button>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
