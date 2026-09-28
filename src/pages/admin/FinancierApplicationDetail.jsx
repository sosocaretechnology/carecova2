import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useFinancierAuth } from '../../hooks/useFinancierAuth'
import { financierService } from '../../services/financierService'
import { FINANCING_STATUS } from '../../utils/statusModel'
import { computeAffordability, computeRiskFlags } from '../../utils/affordabilityEngine'
import { getStatusBadgeConfig } from '../../utils/statusModel'
import StatusBadge from '../../components/StatusBadge'
import FullScreenLoader from '../../components/ui/FullScreenLoader'
import Modal from '../../components/ui/Modal'
import { ArrowLeft, Eye, FileText, Banknote, CheckCircle, XCircle, Clock, AlertTriangle } from 'lucide-react'

export default function FinancierApplicationDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { session } = useFinancierAuth()

    const [loading, setLoading] = useState(true)
    const [loan, setLoan] = useState(null)
    const [error, setError] = useState(null)
    const [actionModal, setActionModal] = useState(null) // 'start_review' | 'reserve' | 'approve' | 'decline' | null
    const [notes, setNotes] = useState('')
    const [financingAmount, setFinancingAmount] = useState('')
    const [processing, setProcessing] = useState(false)
    const [feedback, setFeedback] = useState(null) // { type, text } | null
    const [activityLog, setActivityLog] = useState([])
    const [loadingLog, setLoadingLog] = useState(true)

    const isFinancier = session?.role === 'financier'
    const financierId = session?.username || session?.role
    const userId = session?.userId || session?.username
    const isReservingFinancier = loan?.reserved_by_financier_id === financierId
    const isReservedBySomeoneElse =
        loan?.financing_status === FINANCING_STATUS.RESERVED_FOR_FINANCING &&
        loan?.reserved_by_financier_id &&
        loan?.reserved_by_financier_id !== financierId

    const loadLoanDetails = async () => {
        try {
            setLoading(true)
            const match = await financierService.getLoan(id)
            if (!match) {
                setError('Application not found')
            } else {
                setLoan({
                    ...match,
                    affordability: computeAffordability(match),
                    riskFlags: computeRiskFlags(match),
                })
                setError(null)
            }
        } catch (err) {
            setError(err.message || 'Failed to load application')
        } finally {
            setLoading(false)
        }
    }

    const loadActivityLog = async () => {
        try {
            setLoadingLog(true)
            const log = await financierService.getActivityLog(id)
            setActivityLog(log)
        } catch {
            setActivityLog([])
        } finally {
            setLoadingLog(false)
        }
    }

    useEffect(() => {
        if (isFinancier) {
            loadLoanDetails()
            loadActivityLog()
        }
    }, [id, isFinancier])

    const openModal = (type) => {
        setActionModal(type)
        setNotes('')
        setFinancingAmount(loan?.financing_amount?.toString() || loan?.approvedAmount?.toString() || '')
        setFeedback(null)
    }

    const closeModal = () => {
        setActionModal(null)
        setNotes('')
        setFinancingAmount('')
        setFeedback(null)
    }

    const handleStartReview = async () => {
        if (!id) return
        try {
            setProcessing(true)
            await financierService.startFinancierReview(id, notes)
            setFeedback({ type: 'success', text: 'Review started' })
            loadLoanDetails()
            loadActivityLog()
            setTimeout(closeModal, 1200)
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || 'Failed to start review' })
        } finally {
            setProcessing(false)
        }
    }

    const handleReserve = async () => {
        if (!id) return
        try {
            setProcessing(true)
            await financierService.reserveForFinancing(id, notes)
            setFeedback({ type: 'success', text: 'Application reserved for financing' })
            loadLoanDetails()
            loadActivityLog()
            setTimeout(closeModal, 1200)
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || 'Failed to reserve' })
        } finally {
            setProcessing(false)
        }
    }

    const handleApprove = async () => {
        if (!id) return
        const amount = parseFloat(financingAmount || 0)
        if (!amount || amount <= 0) {
            setFeedback({ type: 'error', text: 'Please enter a valid financing amount' })
            return
        }
        try {
            setProcessing(true)
            await financierService.approveFinancing(id, amount, notes)
            setFeedback({ type: 'success', text: `Financing approved for ₦${amount.toLocaleString()}` })
            loadLoanDetails()
            loadActivityLog()
            setTimeout(closeModal, 1500)
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || 'Failed to approve financing' })
        } finally {
            setProcessing(false)
        }
    }

    const handleDecline = async () => {
        if (!id) return
        try {
            setProcessing(true)
            await financierService.declineFinancing(id, notes)
            setFeedback({ type: 'success', text: 'Financing declined. Application returned to pool.' })
            loadLoanDetails()
            loadActivityLog()
            setTimeout(closeModal, 1500)
        } catch (err) {
            setFeedback({ type: 'error', text: err.message || 'Failed to decline financing' })
        } finally {
            setProcessing(false)
        }
    }

    const getBadge = (status) => {
        const config = getStatusBadgeConfig(status, loan?.financing_status)
        return <span className={`${config.className} status-badge`}>{config.label}</span>
    }

    if (!isFinancier) {
        return (
            <div className="admin-page">
                <div className="alert-box alert-error">Access denied. Financier role required.</div>
            </div>
        )
    }

    if (loading) {
        return <FullScreenLoader label={`Loading application ${id}…`} />
    }

    if (error || !loan) {
        return (
            <div className="admin-page">
                <div className="alert-box alert-error mb-4">{error || 'Application not found'}</div>
                <button className="button button--secondary" onClick={() => navigate('/admin/financing')}>
                    <ArrowLeft size={16} /> Back to Financing Queue
                </button>
            </div>
        )
    }

    const canStartReview =
        loan.financing_status === FINANCING_STATUS.AVAILABLE_FOR_FINANCING ||
        (loan.financing_status === FINANCING_STATUS.UNDER_FINANCIER_REVIEW && !isReservingFinancier && !isReservedBySomeoneElse)

    const canReserve =
        loan.financing_status === FINANCING_STATUS.AVAILABLE_FOR_FINANCING &&
        !isReservedBySomeoneElse &&
        !isReservingFinancier

    const canApproveOrDecline = isReservingFinancier

    return (
        <div className="admin-page">
            <div className="admin-page-header flex-between align-center">
                <div>
                    <button
                        className="cc-back-link"
                        style={{ marginBottom: 8 }}
                        onClick={() => navigate('/admin/financing')}
                    >
                        <ArrowLeft size={16} /> Back to Financing Queue
                    </button>
                    <h1 className="flex items-center gap-3 flex-wrap">
                        {loan.fullName || loan.patientName}
                        {getBadge(loan.status)}
                    </h1>
                    <p className="text-xs text-muted mt-1">Application ID: {loan.id}</p>
                    <p className="text-xs text-muted">
                        Submitted on {new Date(loan.submittedAt).toLocaleDateString()} at{' '}
                        {new Date(loan.submittedAt).toLocaleTimeString()}
                    </p>
                </div>
            </div>

            {loan.financing_status && (
                <div className="detail-card mb-4">
                    <h3>Financing Information</h3>
                    <div className="cc-auto-grid--sm">
                        <div>
                            <span className="text-xs text-muted">Current Status</span>
                            {getBadge(loan.financing_status)}
                        </div>
                        {loan.reserved_by_financier_id && (
                            <div>
                                <span className="text-xs text-muted">Reserved By</span>
                                <div className="font-medium">
                                    {loan.reserved_by_financier_id === financierId ? 'Me' : loan.reserved_by_financier_id}
                                </div>
                            </div>
                        )}
                        {loan.reserved_at && (
                            <div>
                                <span className="text-xs text-muted">Reserved On</span>
                                <div className="font-medium">{new Date(loan.reserved_at).toLocaleDateString()}</div>
                            </div>
                        )}
                        {loan.lastReviewedByFinancier && (
                            <div>
                                <span className="text-xs text-muted">Current Reviewer</span>
                                <div className="font-medium">{loan.lastReviewedByFinancier}</div>
                            </div>
                        )}
                        {loan.lastReviewStartedAt && (
                            <div>
                                <span className="text-xs text-muted">Review Started</span>
                                <div className="font-medium">
                                    {new Date(loan.lastReviewStartedAt).toLocaleString()}
                                </div>
                            </div>
                        )}
                        {loan.financing_amount && (
                            <div>
                                <span className="text-xs text-muted">Financing Amount</span>
                                <div className="font-medium">₦{loan.financing_amount.toLocaleString()}</div>
                            </div>
                        )}
                    </div>
                </div>
            )}

            {isReservedBySomeoneElse && (
                <div className="alert-box alert-warning mb-3">
                    <AlertTriangle size={16} /> This application has been reserved for financing by:{' '}
                    <strong>{loan.reserved_by_financier_id}</strong> on{' '}
                    {new Date(loan.reserved_at).toLocaleDateString()}. You can view the application but
                    cannot update financing status.
                </div>
            )}

            <div className="cc-auto-grid">
                <div className="detail-card">
                    <h3>Applicant Information</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div className="text-sm">
                            <span className="text-muted">Full Name:</span>{' '}
                            <span className="font-medium">{loan.fullName || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Phone:</span>{' '}
                            <span className="font-medium">{loan.phone || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Email:</span>{' '}
                            <span className="font-medium">{loan.email || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Location:</span>{' '}
                            <span className="font-medium">
                                {loan.state && loan.lga ? `${loan.lga}, ${loan.state}` : '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="detail-card">
                    <h3>Financial Details</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div className="text-sm">
                            <span className="text-muted">Estimated Cost:</span>{' '}
                            <span className="font-medium">₦{(loan.estimatedCost || 0)?.toLocaleString()}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Approved Amount:</span>{' '}
                            <span className="font-medium">₦{(loan.approvedAmount || 0)?.toLocaleString()}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Monthly Income:</span>{' '}
                            <span className="font-medium">
                                ₦{loan.affordability?.monthlyIncome?.toLocaleString() || '—'}
                            </span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Monthly Expenses:</span>{' '}
                            <span className="font-medium">
                                ₦{loan.affordability?.monthlyExpenses?.toLocaleString() || '—'}
                            </span>
                        </div>
                    </div>
                </div>

                <div className="detail-card">
                    <h3>Treatment Details</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div className="text-sm">
                            <span className="text-muted">Treatment:</span>{' '}
                            <span className="font-medium">{loan.treatmentCategory || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Procedure:</span>{' '}
                            <span className="font-medium">{loan.procedureOrService || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Urgency:</span>{' '}
                            <span className="font-medium">{loan.urgency || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Hospital:</span>{' '}
                            <span className="font-medium">{loan.hospital || '—'}</span>
                        </div>
                    </div>
                </div>

                <div className="detail-card">
                    <h3>Employment Details</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div className="text-sm">
                            <span className="text-muted">Employment:</span>{' '}
                            <span className="font-medium capitalize">{loan.employmentType || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Sector:</span>{' '}
                            <span className="font-medium capitalize">{loan.employmentSector || loan.employmentType || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Employer:</span>{' '}
                            <span className="font-medium">{loan.employerName || '—'}</span>
                        </div>
                    </div>
                </div>

                <div className="detail-card">
                    <h3>Risk Assessment</h3>
                    <div style={{ display: 'grid', gap: '8px' }}>
                        <div className="text-sm">
                            <span className="text-muted">Risk Score:</span>{' '}
                            <span className="font-medium">{loan.riskScore || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Risk Tier:</span>{' '}
                            <span className="font-medium">{loan.riskTier || '—'}</span>
                        </div>
                        <div className="text-sm">
                            <span className="text-muted">Recommendation:</span>{' '}
                            <span className="font-medium">{loan.riskRecommendation || '—'}</span>
                        </div>
                    </div>
                </div>
            </div>

            {loan.riskReasons && loan.riskReasons.length > 0 && (
                <div className="detail-card mt-4">
                    <h3>Risk Factors</h3>
                    <ul style={{ margin: 0, paddingLeft: '20px' }}>
                        {loan.riskReasons.map((reason, idx) => (
                            <li key={idx}>{reason}</li>
                        ))}
                    </ul>
                </div>
            )}

            <div className="detail-card mt-4">
                <h3>Financing Actions</h3>
                <div className="flex gap-2 flex-wrap mt-2">
                    {canStartReview && (
                        <button className="button button--secondary" onClick={() => openModal('start_review')}>
                            <Eye size={16} /> Start Review
                        </button>
                    )}
                    {canReserve && (
                        <button className="button button--primary" onClick={() => openModal('reserve')}>
                            <Banknote size={16} /> Reserve for Financing
                        </button>
                    )}
                    {canApproveOrDecline && (
                        <>
                            <button className="button button--primary" onClick={() => openModal('approve')}>
                                <CheckCircle size={16} /> Approve Financing
                            </button>
                            <button className="button button--danger" onClick={() => openModal('decline')}>
                                <XCircle size={16} /> Decline Financing
                            </button>
                        </>
                    )}
                    {loan.financing_status && !canStartReview && !canReserve && !canApproveOrDecline && (
                        <p className="text-xs text-muted">No financing actions available for this application.</p>
                    )}
                </div>
            </div>

            <div className="detail-card mt-4 full-width">
                <h3>Financing Activity Log</h3>
                {loadingLog ? (
                    <FullScreenLoader label="Loading activity…" />
                ) : activityLog.length === 0 ? (
                    <p className="text-xs text-muted">No financing activity recorded yet.</p>
                ) : (
                    <div style={{ marginTop: 16 }}>
                        {activityLog.map((entry) => {
                            const dotMod = entry.action === 'APPROVE_FINANCING' ? '--approve'
                                : entry.action === 'DECLINE_FINANCING' ? '--decline'
                                : entry.action === 'RESERVE_FOR_FINANCING' ? '--reserve' : ''
                            return (
                                <div key={entry.id} className="cc-fin-timeline-item">
                                    <div className={`cc-fin-timeline-dot${dotMod}`} />
                                    <div className="cc-audit-row">
                                        <span className="cc-audit-action">
                                            {entry.action?.toLowerCase().replace(/_/g, ' ')}
                                        </span>
                                        <span className="cc-audit-actor">by {entry.userId || 'Financier'}</span>
                                    </div>
                                    <p className="cc-audit-detail">{entry.notes || '—'}</p>
                                    <span className="cc-audit-time">{new Date(entry.createdAt).toLocaleString()}</span>
                                </div>
                            )
                        })}
                    </div>
                )}
            </div>

            {actionModal && (
                <Modal
                    isOpen={Boolean(actionModal)}
                    onClose={closeModal}
                    title={
                        actionModal === 'start_review'
                            ? 'Start Review'
                            : actionModal === 'reserve'
                                ? 'Reserve for Financing'
                                : actionModal === 'approve'
                                    ? 'Approve Financing'
                                    : 'Decline Financing'
                    }
                    size="sm"
                    footer={
                        <div className="flex gap-2">
                            <button
                                type="button"
                                className="button button--secondary"
                                onClick={closeModal}
                                disabled={processing}
                            >
                                Cancel
                            </button>
                            <button
                                type="button"
                                className={`button ${actionModal === 'approve' || actionModal === 'reserve' ? 'button--primary' : actionModal === 'decline' ? 'button--danger' : 'button--secondary'}`}
                                disabled={processing}
                                onClick={
                                    actionModal === 'start_review'
                                        ? handleStartReview
                                        : actionModal === 'reserve'
                                            ? handleReserve
                                            : actionModal === 'approve'
                                                ? handleApprove
                                                : handleDecline
                                }
                            >
                                {processing ? 'Processing…' : 'Confirm'}
                            </button>
                        </div>
                    }
                >
                    {feedback && (
                        <div className={`alert-box mb-3 ${feedback.type === 'success' ? 'alert-success' : 'alert-error'}`}>
                            {feedback.text}
                        </div>
                    )}

                    {(actionModal === 'approve' || actionModal === 'reserve') && (
                        <div className="input-group">
                            <label className="input-label">
                                {actionModal === 'approve' ? 'Financing Amount (₦)' : 'Notes (optional)'}
                            </label>
                            {actionModal === 'approve' ? (
                                <input
                                    type="number"
                                    className="input"
                                    value={financingAmount}
                                    onChange={(e) => setFinancingAmount(e.target.value)}
                                    placeholder="Enter amount"
                                />
                            ) : (
                                <textarea
                                    className="input"
                                    rows={2}
                                    value={notes}
                                    onChange={(e) => setNotes(e.target.value)}
                                    placeholder="Add any notes..."
                                />
                            )}
                        </div>
                    )}

                    {(actionModal === 'start_review' || actionModal === 'decline') && (
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
                    )}
                </Modal>
            )}
        </div>
    )
}
