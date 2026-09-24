import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { useFinancierAuth } from '../../hooks/useFinancierAuth'
import { financierService } from '../../services/financierService'
import StatusBadge from '../../components/StatusBadge'
import FullScreenLoader from '../../components/ui/FullScreenLoader'
import { Search, ArrowLeft, Eye, FileText, Banknote, Clock } from 'lucide-react'
import { FINANCING_STATUS } from '../../utils/statusModel'

export default function FinancingQueue() {
    const navigate = useNavigate()
    const { session } = useFinancierAuth()
    const [loading, setLoading] = useState(true)
    const [loans, setLoans] = useState([])
    const [view, setView] = useState('available') // available | my_reviews | my_reservations | financed
    const [searchTerm, setSearchTerm] = useState('')
    const [actionLoanId, setActionLoanId] = useState(null)
    const [actionType, setActionType] = useState(null) // 'start_review' | 'reserve' | null
    const [notes, setNotes] = useState('')
    const [loadingAction, setLoadingAction] = useState(false)
    const [message, setMessage] = useState(null)

    const isFinancier = session?.role === 'financier'
    const financierId = session?.username || session?.role

    const loadLoans = async () => {
        try {
            setLoading(true)
            let data = []
            if (view === 'available') {
                data = await financierService.getAvailableForFinancing()
            } else if (view === 'my_reviews') {
                data = await financierService.getAvailableForFinancing()
                data = data.filter(
                    (l) =>
                        l.financing_status === FINANCING_STATUS.UNDER_FINANCIER_REVIEW &&
                        l.lastReviewedByFinancier === session?.financierName
                )
            } else if (view === 'my_reservations') {
                data = await financierService.getMyReservations(financierId)
            } else {
                data = await financierService.getAvailableForFinancing()
                data = data.filter((l) => l.financing_status === FINANCING_STATUS.FINANCED)
            }
            data.sort((a, b) => new Date(b.submittedAt || b.createdAt) - new Date(a.submittedAt || a.createdAt))
            setLoans(data)
        } catch (err) {
            console.error('Error loading financing queue:', err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        if (isFinancier) loadLoans()
    }, [view, isFinancier])

    const filtered = loans.filter((loan) => {
        if (!searchTerm) return true
        const term = searchTerm.toLowerCase()
        return (
            loan.fullName?.toLowerCase().includes(term) ||
            loan.patientName?.toLowerCase().includes(term) ||
            loan.id?.toLowerCase().includes(term) ||
            loan.phone?.includes(term)
        )
    })

    const openReviewModal = (loanId) => {
        setActionType('start_review')
        setActionLoanId(loanId)
        setNotes('')
        setMessage(null)
    }

    const openReserveModal = (loanId) => {
        setActionType('reserve')
        setActionLoanId(loanId)
        setNotes('')
        setMessage(null)
    }

    const handleConfirmAction = async () => {
        if (!actionLoanId || !actionType) return
        try {
            setLoadingAction(true)
            if (actionType === 'start_review') {
                await financierService.startFinancierReview(actionLoanId, notes)
                setMessage({ type: 'success', text: 'Review started' })
            } else if (actionType === 'reserve') {
                await financierService.reserveForFinancing(actionLoanId, notes)
                setMessage({ type: 'success', text: 'Application reserved for financing' })
            }
            setActionLoanId(null)
            setActionType(null)
            setNotes('')
            loadLoans()
        } catch (err) {
            setMessage({ type: 'error', text: err.message || 'Action failed' })
        } finally {
            setLoadingAction(false)
        }
    }

    const getFinancingStatusBadge = (loan) => {
        const fs = loan.financing_status
        if (fs === FINANCING_STATUS.AVAILABLE_FOR_FINANCING) return { label: 'Available for Financing', className: 'status--financing-available' }
        if (fs === FINANCING_STATUS.UNDER_FINANCIER_REVIEW) return { label: 'Under Review', className: 'status--financing-review' }
        if (fs === FINANCING_STATUS.RESERVED_FOR_FINANCING) return { label: 'Reserved', className: 'status--financing-reserved' }
        if (fs === FINANCING_STATUS.FINANCED) return { label: 'Financed', className: 'status--financing-financed' }
        return { label: 'Declined', className: 'status--financing-declined' }
    }

    const isReservedByMe = (loan) => {
        return (
            loan.financing_status === FINANCING_STATUS.RESERVED_FOR_FINANCING &&
            loan.reserved_by_financier_id === financierId
        )
    }

    if (!isFinancier) {
        return (
            <div className="admin-page">
                <div className="alert-box alert-error">Access denied. Financier role required.</div>
            </div>
        )
    }

    if (loading) {
        return <FullScreenLoader label="Loading financing queue…" />
    }

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div className="flex items-center gap-3">
                    <button
                        className="back-link bg-transparent border-none cursor-pointer"
                        onClick={() => navigate('/admin/dashboard')}
                    >
                        <ArrowLeft size={20} />
                    </button>
                    <div>
                        <h1>Financing Queue</h1>
                        <p>Review, reserve, and finance loan applications</p>
                    </div>
                </div>
            </div>

            {message && (
                <div className={`alert-box ${message.type === 'success' ? 'alert-success' : 'alert-error'} mb-4`}>
                    {message.text}
                    <button
                        className="alert-close bg-transparent border-none cursor-pointer float-right"
                        onClick={() => setMessage(null)}
                    >
                        ×
                    </button>
                </div>
            )}

            <div className="admin-toolbar mb-4">
                <div className="admin-filters flex-wrap">
                    <button
                        className={`button ${view === 'available' ? 'button--primary' : 'button--secondary'}`}
                        onClick={() => setView('available')}
                    >
                        <Eye size={16} /> Available for Financing
                    </button>
                    <button
                        className={`button ${view === 'my_reviews' ? 'button--primary' : 'button--secondary'}`}
                        onClick={() => setView('my_reviews')}
                    >
                        <FileText size={16} /> My Reviews
                    </button>
                    <button
                        className={`button ${view === 'my_reservations' ? 'button--primary' : 'button--secondary'}`}
                        onClick={() => setView('my_reservations')}
                    >
                        <Clock size={16} /> My Reservations
                    </button>
                    <button
                        className={`button ${view === 'financed' ? 'button--primary' : 'button--secondary'}`}
                        onClick={() => setView('financed')}
                    >
                        <Banknote size={16} /> Financed
                    </button>
                </div>
                <div className="admin-search-wrapper">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search by name, ID, phone..."
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                        className="admin-search-input"
                    />
                </div>
            </div>

            {actionLoanId && (
                <div className="modal-overlay" onClick={() => { setActionLoanId(null); setActionType(null); setNotes('') }}>
                    <div className="modal-content modal-content--sm" onClick={(e) => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>{actionType === 'start_review' ? 'Start Review' : 'Reserve for Financing'}</h2>
                            <button
                                type="button"
                                className="modal-close"
                                onClick={() => { setActionLoanId(null); setActionType(null); setNotes('') }}
                            >
                                ×
                            </button>
                        </div>
                        <div className="modal-body">
                            <div className="input-group">
                                <label className="input-label">Notes (optional)</label>
                                <textarea
                                    className="input"
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes..."
                                />
                            </div>
                        </div>
                        <div className="modal-footer">
                            <button
                                type="button"
                                className="button button--secondary"
                                onClick={() => { setActionLoanId(null); setActionType(null); setNotes('') }}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className="button button--primary"
                                disabled={loadingAction}
                                onClick={handleConfirmAction}
                            >
                                {loadingAction ? 'Processing…' : 'Confirm'}
                            </button>
                        </div>
                    </div>
                </div>
            )}

            {filtered.length === 0 ? (
                <div className="empty-state p-8 text-center">
                    <p className="text-muted">No applications matched your filters.</p>
                </div>
            ) : (
                <div className="admin-table-container">
                  <div className="admin-table-wrapper">
                    <table className="admin-table has-sticky-col">
                        <thead>
                            <tr>
                                <th>ID & Applicant</th>
                                <th>Requested (₦)</th>
                                <th>Financing Status</th>
                                <th>Reserved By</th>
                                <th>Reserved On</th>
                                <th>Actions</th>
                            </tr>
                        </thead>
                        <tbody>
                            {filtered.map((loan) => {
                                const fBadge = getFinancingStatusBadge(loan)
                                const reserved = isReservedByMe(loan)
                                const canAct = reserved
                                const isUnderReview = loan.financing_status === FINANCING_STATUS.UNDER_FINANCIER_REVIEW
                                const canReview = loan.financing_status === FINANCING_STATUS.AVAILABLE_FOR_FINANCING || isUnderReview

                                return (
                                    <tr key={loan.id} className="clickable-row">
                                        <td>
                                            <div className="font-medium">{loan.fullName || loan.patientName}</div>
                                            <div className="text-xs font-mono text-muted">{loan.id}</div>
                                            <div className="text-xs text-muted">{loan.phone}</div>
                                        </td>
                                        <td className="font-medium">
                                            ₦{(loan.approvedAmount || loan.estimatedCost || 0)?.toLocaleString()}
                                        </td>
                                        <td>
                                            <span className={`${fBadge.className} status-badge`}>{fBadge.label}</span>
                                            {loan.financier_notes && (
                                                <div className="text-xs text-muted mt-1 italic">"{loan.financier_notes}"</div>
                                            )}
                                        </td>
                                        <td>
                                            {loan.reserved_by_financier_id ? (
                                                <span className="text-sm font-medium">
                                                    {loan.reserved_by_financier_id === financierId ? 'Me' : loan.reserved_by_financier_id}
                                                </span>
                                            ) : (
                                                <span className="text-muted text-xs italic">—</span>
                                            )}
                                        </td>
                                        <td>
                                            {loan.reserved_at ? (
                                                new Date(loan.reserved_at).toLocaleDateString()
                                            ) : (
                                                <span className="text-muted text-xs italic">—</span>
                                            )}
                                        </td>
                                        <td>
                                            <div className="flex gap-2 flex-wrap">
                                                <button
                                                    type="button"
                                                    className="button button--ghost button--compact"
                                                    onClick={() => navigate(`/admin/financing/${loan.id}`)}
                                                >
                                                    View Details
                                                </button>

                                                {canReview && !canAct && (
                                                    <button
                                                        type="button"
                                                        className="button button--secondary button--compact"
                                                        onClick={() => openReviewModal(loan.id)}
                                                    >
                                                        <Eye size={14} /> Start Review
                                                    </button>
                                                )}

                                                {canReview && !canAct && !isUnderReview && (
                                                    <button
                                                        type="button"
                                                        className="button button--primary button--compact"
                                                        onClick={() => openReserveModal(loan.id)}
                                                    >
                                                        <Banknote size={14} /> Reserve for Financing
                                                    </button>
                                                )}

                                                {canAct && (
                                                    <span className="text-xs text-success font-medium self-center">
                                                        You can approve or decline
                                                    </span>
                                                )}
                                            </div>
                                        </td>
                                    </tr>
                                )
                            })}
                        </tbody>
                    </table>
                  </div>
                    <div className="table-footer">
                        Showing {filtered.length} of {loans.length} applications
                    </div>
                </div>
            )}
        </div>
    )
}
