import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { trackingService } from '../../services/trackingService'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/StatusBadge'
import {
    CheckCircle, Clock, AlertCircle, ChevronLeft,
    TrendingDown, DollarSign, Activity, X
} from 'lucide-react'

function pct(paid, total) {
    if (!total) return 0
    return Math.min(100, Math.round((paid / total) * 100))
}

export default function LoanDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const [loan, setLoan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [transactions, setTransactions] = useState([])
    const [transactionDetail, setTransactionDetail] = useState(null)

    useEffect(() => {
        trackingService.trackLoan(id).then(l => {
            setLoan(l)
            setLoading(false)
        }).catch(() => setLoading(false))
    }, [id])

    useEffect(() => {
        if (!loan?.id) return
        const txs = adminService.getWalletTransactions().filter((t) => t.loanId === loan.id)
        setTransactions(txs)
    }, [loan?.id])

    if (loading) return <div className="admin-loading">Loading loan details...</div>
    if (!loan) return <div className="admin-page"><p>Loan not found.</p></div>

    const schedule = loan.repaymentSchedule || []
    const totalRepayment = schedule.reduce((s, p) => s + p.amount, 0)
    const totalPaid = schedule.filter(p => p.paid).reduce((s, p) => s + p.amount, 0)
    const progress = pct(totalPaid, totalRepayment)
    const paidCount = schedule.filter(p => p.paid).length
    const overdueCount = schedule.filter(p => p.overdue && !p.paid).length
    const remainingCount = schedule.filter(p => !p.paid).length

    // Duration since disbursement
    const disbursedDate = loan.disbursedAt ? new Date(loan.disbursedAt) : null
    const monthsActive = disbursedDate
        ? Math.floor((Date.now() - disbursedDate.getTime()) / (1000 * 60 * 60 * 24 * 30))
        : null

    const loanEndDate = schedule.length > 0
        ? new Date(schedule[schedule.length - 1].dueDate).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
        : '—'

    return (
        <div className="admin-page">
            {/* Header */}
            <div className="admin-page-header mb-5">
                <div>
                    <button
                        onClick={() => {
                            // If opened from credit portal, go back there; otherwise admin route
                            const fromCredit = window.location.pathname.startsWith('/credit/')
                            navigate(fromCredit ? '/credit/loans' : '/admin/loans')
                        }}
                        style={{ background: 'none', border: 'none', cursor: 'pointer', display: 'flex', alignItems: 'center', gap: 6, color: 'var(--color-primary)', fontWeight: 600, fontSize: '0.85rem', marginBottom: 8 }}
                    >
                        <ChevronLeft size={16} /> Back to Active Portfolio
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 style={{ margin: 0 }}>{loan.fullName || loan.patientName}</h1>
                        <StatusBadge status={loan.status} />
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 4 }}>
                        {loan.id} · Disbursed{disbursedDate ? ` ${disbursedDate.toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })}` : ''} · Ends {loanEndDate}
                    </div>
                </div>
            </div>

            {/* KPI Cards */}
            <div className="admin-kpi-grid mb-6">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#eff6ff' }}>
                        <DollarSign size={20} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Loan Principal</p>
                        <h2 className="kpi-value">₦{(loan.approvedAmount || 0).toLocaleString()}</h2>
                        <p className="kpi-sub">{loan.approvedDuration} month term</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#f0fdf4' }}>
                        <CheckCircle size={20} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Total Paid</p>
                        <h2 className="kpi-value">₦{totalPaid.toLocaleString()}</h2>
                        <p className="kpi-sub">{paidCount} of {schedule.length} instalments</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#fef2f2' }}>
                        <TrendingDown size={20} style={{ color: '#ef4444' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Outstanding</p>
                        <h2 className="kpi-value">₦{(loan.outstandingBalance || 0).toLocaleString()}</h2>
                        <p className="kpi-sub">{remainingCount} payments left</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: loan.dpd > 0 ? '#fef9c3' : '#f0fdf4' }}>
                        <Activity size={20} style={{ color: loan.dpd > 0 ? '#ca8a04' : '#22c55e' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Days Past Due</p>
                        <h2 className="kpi-value" style={{ color: loan.dpd > 0 ? '#ef4444' : 'inherit' }}>{loan.dpd || 0}</h2>
                        <p className="kpi-sub">{overdueCount > 0 ? `${overdueCount} overdue instalment${overdueCount > 1 ? 's' : ''}` : 'All current'}</p>
                    </div>
                </div>
            </div>

            {/* Progress Bar */}
            <div className="detail-card mb-6">
                <div className="flex-between mb-2">
                    <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>Repayment Progress</h3>
                    <span style={{ fontSize: '0.875rem', fontWeight: 700, color: '#22c55e' }}>{progress}%</span>
                </div>
                <div style={{ height: 10, background: '#e5e7eb', borderRadius: 99, overflow: 'hidden', marginBottom: 8 }}>
                    <div style={{
                        height: '100%',
                        width: `${progress}%`,
                        background: progress === 100 ? '#22c55e' : 'var(--color-primary)',
                        borderRadius: 99,
                        transition: 'width 0.3s ease',
                    }} />
                </div>
                <div className="flex-between text-xs text-muted">
                    <span>₦{totalPaid.toLocaleString()} paid</span>
                    {monthsActive !== null && <span>{monthsActive} month{monthsActive !== 1 ? 's' : ''} active</span>}
                    <span>₦{totalRepayment.toLocaleString()} total</span>
                </div>
            </div>

            {/* Repayment Schedule Table */}
            <div className="detail-card">
                <h3 style={{ margin: '0 0 16px', fontSize: '0.95rem', fontWeight: 700 }}>Repayment Schedule</h3>
                {schedule.length === 0 ? (
                    <p className="text-sm text-muted italic">Repayment schedule not available.</p>
                ) : (
                    <div className="admin-table-container" style={{ margin: 0 }}>
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>#</th>
                                    <th>Due Date</th>
                                    <th>Amount (₦)</th>
                                    <th>Status</th>
                                    <th>DPD</th>
                                    <th>Paid On</th>
                                    {schedule.some(p => p.paid) && <th></th>}
                                </tr>
                            </thead>
                            <tbody>
                                {schedule.map((installment, i) => {
                                    const isOverdue = installment.overdue && !installment.paid
                                    const isCurrent = !installment.paid && !isOverdue && i === schedule.findIndex(p => !p.paid)
                                    const paidAt = installment.paidOn || installment.paymentDate
                                    const tx = installment.txReference
                                        ? transactions.find((t) => t.id === installment.txReference)
                                        : null
                                    const openDetail = () => {
                                        if (!installment.paid) return
                                        setTransactionDetail({
                                            installment,
                                            tx: tx || {
                                                id: installment.txReference || '—',
                                                amount: installment.paidAmount ?? installment.amount,
                                                date: paidAt,
                                                method: installment.paymentMethod || '—',
                                                status: 'Successful',
                                                type: 'Repayment',
                                            },
                                        })
                                    }
                                    return (
                                        <tr
                                            key={i}
                                            style={{
                                                background: installment.paid ? '#f0fdf4' : isOverdue ? '#fef2f2' : isCurrent ? '#eff6ff' : 'white',
                                                cursor: installment.paid ? 'pointer' : undefined,
                                            }}
                                            onClick={installment.paid ? openDetail : undefined}
                                            role={installment.paid ? 'button' : undefined}
                                            tabIndex={installment.paid ? 0 : undefined}
                                            onKeyDown={(e) => installment.paid && (e.key === 'Enter' || e.key === ' ') && (e.preventDefault(), openDetail())}
                                        >
                                            <td style={{ fontWeight: 600, color: '#6b7280', fontSize: '0.8rem' }}>
                                                {installment.month || (i + 1)}
                                            </td>
                                            <td style={{ fontSize: '0.875rem' }}>
                                                {new Date(installment.dueDate).toLocaleDateString('en-GB', {
                                                    day: 'numeric', month: 'short', year: 'numeric'
                                                })}
                                                {isCurrent && (
                                                    <span style={{ marginLeft: 6, fontSize: '0.65rem', background: '#dbeafe', color: '#1d4ed8', padding: '1px 6px', borderRadius: 99, fontWeight: 700 }}>
                                                        NEXT
                                                    </span>
                                                )}
                                            </td>
                                            <td style={{ fontWeight: 600 }}>
                                                {installment.amount.toLocaleString()}
                                            </td>
                                            <td>
                                                {installment.paid ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#15803d', fontSize: '0.8rem', fontWeight: 600 }}>
                                                        <CheckCircle size={13} /> Paid
                                                    </span>
                                                ) : isOverdue ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#ef4444', fontSize: '0.8rem', fontWeight: 600 }}>
                                                        <AlertCircle size={13} /> Overdue
                                                    </span>
                                                ) : isCurrent ? (
                                                    <span style={{ display: 'flex', alignItems: 'center', gap: 4, color: '#3b82f6', fontSize: '0.8rem', fontWeight: 600 }}>
                                                        <Clock size={13} /> Due
                                                    </span>
                                                ) : (
                                                    <span style={{ color: '#9ca3af', fontSize: '0.8rem' }}>Upcoming</span>
                                                )}
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: isOverdue ? '#ef4444' : '#6b7280', fontWeight: isOverdue ? 700 : 400 }}>
                                                {installment.dpd ? `${installment.dpd}d` : '—'}
                                            </td>
                                            <td style={{ fontSize: '0.8rem', color: '#6b7280' }}>
                                                {paidAt
                                                    ? new Date(paidAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                                                    : '—'}
                                            </td>
                                            {schedule.some(p => p.paid) && (
                                                <td style={{ fontSize: '0.8rem' }}>
                                                    {installment.paid && (
                                                        <span className="button button--ghost button--compact" style={{ cursor: 'pointer' }} onClick={(e) => { e.stopPropagation(); openDetail(); }}>
                                                            View
                                                        </span>
                                                    )}
                                                </td>
                                            )}
                                        </tr>
                                    )
                                })}
                            </tbody>
                        </table>
                    </div>
                )}
            </div>

            {/* Borrower Info Strip */}
            <div className="detail-card mt-4" style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: '16px' }}>
                {[
                    ['Employer', loan.employerName || '—'],
                    ['Employment', loan.employmentSector || loan.employmentType || '—'],
                    ['Phone', loan.phone || '—'],
                    ['Disbursed By', loan.disbursedBy || '—'],
                ].map(([label, val]) => (
                    <div key={label}>
                        <div style={{ fontSize: '0.7rem', color: '#9ca3af', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 2 }}>{label}</div>
                        <div style={{ fontSize: '0.875rem', fontWeight: 600 }}>{val}</div>
                    </div>
                ))}
            </div>

            {transactionDetail && (
                <div className="modal-overlay" onClick={() => setTransactionDetail(null)}>
                    <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Repayment transaction</h2>
                            <button type="button" className="modal-close" onClick={() => setTransactionDetail(null)} aria-label="Close">
                                <X size={20} />
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="detail-grid" style={{ gridTemplateColumns: '1fr', gap: 12 }}>
                                <div>
                                    <strong style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)' }}>Reference</strong>
                                    <p style={{ margin: '4px 0 0', fontWeight: 600, fontFamily: 'monospace' }}>{transactionDetail.tx.id}</p>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)' }}>Amount</strong>
                                    <p style={{ margin: '4px 0 0', fontWeight: 600 }}>₦{Number(transactionDetail.tx.amount).toLocaleString()}</p>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)' }}>Date</strong>
                                    <p style={{ margin: '4px 0 0', fontWeight: 600 }}>
                                        {transactionDetail.tx.date
                                            ? new Date(transactionDetail.tx.date).toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
                                            : '—'}
                                    </p>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)' }}>Method</strong>
                                    <p style={{ margin: '4px 0 0', fontWeight: 600 }}>{transactionDetail.tx.method || '—'}</p>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)' }}>Status</strong>
                                    <p style={{ margin: '4px 0 0', fontWeight: 600, color: 'var(--color-success)' }}>{transactionDetail.tx.status || 'Successful'}</p>
                                </div>
                                <div>
                                    <strong style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-caption)' }}>Installment</strong>
                                    <p style={{ margin: '4px 0 0', fontWeight: 600 }}>Month {transactionDetail.installment.month ?? '-'}</p>
                                </div>
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button type="button" className="button button--secondary" onClick={() => setTransactionDetail(null)}>Close</button>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
