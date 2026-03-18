import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { trackingService } from '../../services/trackingService'
import StatusBadge from '../../components/StatusBadge'
import { AlertCircle, CheckCircle, Clock, ChevronRight } from 'lucide-react'
import { useAuth } from '../../hooks/useAuth'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

export default function ActiveLoans() {
    const [loans, setLoans] = useState([])
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')
    const navigate = useNavigate()
    const { session } = useAuth()

    useEffect(() => {
        async function fetchActiveLoans() {
            try {
                setError('')
                // Backend Active Portfolio: status=approved,approved_for_disbursement,active,completed
                const all = await adminService.getAllLoans({
                    requireBackend: true,
                    status: 'approved,approved_for_disbursement,active,completed',
                })
                // Enrich for display (DPD, nextPayment, overdue derivation from repaymentSchedule)
                setLoans(all.map((l) => trackingService.enrichLoan(l)))
            } catch (err) {
                console.error(err)
                setLoans([])
                setError(err?.message || 'Unable to load active loans')
            } finally {
                setLoading(false)
            }
        }
        fetchActiveLoans()
    }, [])

    const getHealthIndicator = (loan) => {
        if (loan.status === 'completed') return <CheckCircle size={16} className="text-success" />
        if (loan.dpd > 30) return <AlertCircle size={16} className="text-error" />
        if (loan.dpd > 0) return <Clock size={16} className="text-warning" />
        return <CheckCircle size={16} className="text-success" />
    }

    if (loading) return <FullScreenLoader label="Loading active loans…" />

    return (
        <div className="admin-page">
            {error ? (
                <div className="alert-box alert-error mb-4">
                    {error}
                </div>
            ) : null}
            <div className="admin-page-header">
                <div>
                    <h1>Active Portfolio</h1>
                    <p>Monitor disbursed loans and repayment health</p>
                </div>
                <div className="active-loans-header-stats">
                    <div className="active-loans-stat">
                        <span className="text-xs text-muted block">Total Portfolio</span>
                        <span className="font-bold">₦{loans.reduce((s, l) => s + (l.approvedAmount || 0), 0).toLocaleString()}</span>
                    </div>
                    <div className="active-loans-stat">
                        <span className="text-xs text-muted block">At Risk (DPD {'>'} 0)</span>
                        <span className="font-bold text-error">{loans.filter(l => (l.dpd || 0) > 0).length}</span>
                    </div>
                </div>
            </div>

            <div className="admin-table-container mt-4">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Health</th>
                            <th>Borrower</th>
                            <th>Principal (₦)</th>
                            <th>Outstanding (₦)</th>
                            <th>Next Payment</th>
                            <th>DPD</th>
                            <th>Status</th>
                            <th></th>
                        </tr>
                    </thead>
                    <tbody>
                        {loans.length === 0 ? (
                            <tr><td colSpan="7" className="empty-table">No matching loans found.</td></tr>
                        ) : (
                            loans.map(loan => (
                            <tr key={loan.id} className="clickable-row" style={{ cursor: 'pointer' }}
                                onClick={() => {
                                    const base = session?.role === 'credit_officer' ? '/credit/loans' : '/admin/loans'
                                    navigate(`${base}/${loan.id}`)
                                }}>
                                    <td className="text-center">{getHealthIndicator(loan)}</td>
                                    <td>
                                        <div className="font-medium">{loan.fullName || loan.patientName}</div>
                                        <div className="text-xs text-muted font-mono">{loan.id}</div>
                                    </td>
                                    <td className="font-medium">{(loan.approvedAmount || 0).toLocaleString()}</td>
                                    <td className="font-bold">{(loan.outstandingBalance || 0).toLocaleString()}</td>
                                    <td>
                                        {loan.nextPayment ? (
                                            <div>
                                                <div className="text-sm font-medium">₦{loan.nextPayment.amount.toLocaleString()}</div>
                                                <div className="text-xs text-muted">{new Date(loan.nextPayment.dueDate).toLocaleDateString()}</div>
                                            </div>
                                        ) : (
                                            <span className="text-xs text-muted">Settled</span>
                                        )}
                                    </td>
                                    <td>
                                        <span className={`risk-badge ${loan.dpd > 0 ? 'risk-badge-high' : 'risk-badge-low'}`}>
                                            {loan.dpd || 0} days
                                        </span>
                                    </td>
                                    <td><StatusBadge status={loan.status} /></td>
                                    <td><ChevronRight size={16} className="text-muted" /></td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
