import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { loanService } from '../../services/loanService'
import { auditService } from '../../services/auditService'
import { useAuth } from '../../hooks/useAuth'
import { computeAffordability, computeRiskFlags } from '../../utils/affordabilityEngine'
import StatusBadge from '../../components/StatusBadge'

import ApplicantSnapshot from '../../components/admin/ApplicationDetail/ApplicantSnapshot'
import VerificationRisk from '../../components/admin/ApplicationDetail/VerificationRisk'
import DecisionPanel from '../../components/admin/ApplicationDetail/DecisionPanel'
import SalesDataCollection from '../../components/admin/ApplicationDetail/SalesDataCollection'
import MonoInformedDecisionModal from '../../components/admin/ApplicationDetail/MonoInformedDecisionModal'

export default function ApplicationDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [loan, setLoan] = useState(null)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('review') // review | history
    const [showMonoInformedDecision, setShowMonoInformedDecision] = useState(false)
    const [monoInitiating, setMonoInitiating] = useState(false)
    const [monoRefreshing, setMonoRefreshing] = useState(false)
    const [monoFeedbackMessage, setMonoFeedbackMessage] = useState('')
    const [monoFeedbackError, setMonoFeedbackError] = useState('')

    const loadLoanDetails = async ({ silent = false } = {}) => {
        try {
            if (!silent) setLoading(true)
            const found = await adminService.getLoanById(id)
            setLoan({
                ...found,
                affordability: computeAffordability(found),
                riskFlags: computeRiskFlags(found),
            })
            setError(null)
        } catch (err) {
            console.error('Error loading application:', err)
            setError('Failed to load application details')
        } finally {
            if (!silent) setLoading(false)
        }
    }

    useEffect(() => {
        // Slight delay to simulate network
        const timer = setTimeout(() => {
            loadLoanDetails()
        }, 300)
        return () => clearTimeout(timer)
    }, [id])

    // Handlers
    const handleApproveStage1 = async (data) => {
        try {
            const updated = await adminService.approveStage1(loan.id, data)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            alert('Stage 1 Approved. Application moved to credit review.')
        } catch (err) {
            alert(err.message || 'Error approving Stage 1')
        }
    }

    const handleApprove = async (terms) => {
        try {
            const updated = await adminService.approveLoan(loan.id, terms)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            alert('Application approved successfully')
        } catch (err) {
            alert(err.message || 'Error approving loan')
        }
    }

    const handleReject = async (reason) => {
        try {
            const updated = await adminService.rejectLoan(loan.id, reason)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            alert('Application rejected successfully')
        } catch (err) {
            alert(err.message || 'Error rejecting loan')
        }
    }

    const handleRequestInfo = async (message) => {
        try {
            const updated = await adminService.requestMoreInfo(loan.id, message)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            alert('Information request sent successfully')
        } catch (err) {
            alert(err.message || 'Error requesting information')
        }
    }

    const handleInitiateMonoConnect = async () => {
        if (!loan?.id) return

        try {
            setMonoInitiating(true)
            setMonoFeedbackMessage('')
            setMonoFeedbackError('')

            const response = await adminService.initiateMonoConnectForLoan(loan.id, {
                redirectUrl:
                    import.meta.env.VITE_MONO_REDIRECT_URL ||
                    `${window.location.origin}/track`,
            })

            setMonoFeedbackMessage(
                response?.message || 'Mono connect link has been sent to the user email',
            )
            await loadLoanDetails({ silent: true })
        } catch (err) {
            setMonoFeedbackError(err.message || 'Failed to initiate Mono connect')
        } finally {
            setMonoInitiating(false)
        }
    }

    const handleRefreshMonoStatus = async () => {
        try {
            setMonoRefreshing(true)
            await loadLoanDetails({ silent: true })
        } finally {
            setMonoRefreshing(false)
        }
    }

    const handleOpenInformedDecision = () => {
        setShowMonoInformedDecision(true)
    }

    const handleCloseInformedDecision = () => {
        setShowMonoInformedDecision(false)
    }

    if (loading) return <div className="admin-loading">Loading application {id}...</div>
    if (error) return <div className="admin-page"><div className="alert-box alert-error">{error}</div><button className="button button--secondary mt-4" onClick={() => navigate('/admin/applications')}>← Back to Applications</button></div>
    if (!loan) return null

    return (
        <div className="admin-page">
            <div className="admin-page-header flex-between align-center mb-5">
                <div>
                    <button className="back-link mb-2 text-sm text-primary font-bold bg-transparent border-none cursor-pointer" onClick={() => navigate('/admin/applications')}>
                        ← Back to List
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="mb-0">Application {loan.id}</h1>
                        <StatusBadge status={loan.status} />
                    </div>
                    {loan.assignedTo && <p className="text-sm mt-1">Assigned to: <strong>{loan.assignedTo === session?.username ? 'Me' : loan.assignedTo}</strong></p>}
                    <p className="mt-1 text-xs text-muted">Submitted on {new Date(loan.submittedAt).toLocaleDateString()} at {new Date(loan.submittedAt).toLocaleTimeString()}</p>
                </div>

                <div className="flex gap-2">
                    <button className={`tab-btn ${activeTab === 'review' ? 'active' : ''}`} onClick={() => setActiveTab('review')}>Review Details</button>
                    <button className={`tab-btn ${activeTab === 'history' ? 'active' : ''}`} onClick={() => setActiveTab('history')}>Audit History</button>
                </div>
            </div>

            {activeTab === 'review' ? (
                <div className="detail-layout-3col">
                    <ApplicantSnapshot loan={loan} />

                    <div className="detail-column">
                        {session?.role === 'sales' && loan.assignedTo === session.username && (loan.status === 'pending' || loan.status === 'incomplete') ? (
                            <SalesDataCollection
                                loan={loan}
                                onSave={() => {}}
                                onApproveStage1={handleApproveStage1}
                            />
                        ) : (
                            <VerificationRisk
                                loan={loan}
                                onInitiateMonoConnect={handleInitiateMonoConnect}
                                onRefreshMonoStatus={handleRefreshMonoStatus}
                                onOpenInformedDecision={handleOpenInformedDecision}
                                monoInitiating={monoInitiating}
                                monoRefreshing={monoRefreshing}
                                monoFeedbackMessage={monoFeedbackMessage}
                                monoFeedbackError={monoFeedbackError}
                            />
                        )}
                    </div>

                    <DecisionPanel
                        loan={loan}
                        session={session}
                        onApprove={handleApprove}
                        onReject={handleReject}
                        onRequestInfo={handleRequestInfo}
                    />
                </div>
            ) : (
                <div className="detail-card full-width">
                    <h3>Application Audit Trail</h3>
                    <div className="audit-timeline mt-4">
                        <AuditTimeline loanId={loan.id} />
                    </div>
                </div>
            )}

            <MonoInformedDecisionModal
                open={showMonoInformedDecision}
                onClose={handleCloseInformedDecision}
                loan={loan}
            />
        </div>
    )
}

function AuditTimeline({ loanId }) {
    const logs = auditService.getForLoan(loanId)

    if (logs.length === 0) return <div className="empty-state p-8 text-center bg-gray-50 border-radius-sm">No recorded activity for this loan ID.</div>

    return (
        <div className="timeline-items p-4">
            {logs.map(log => (
                <div key={log.id} className="timeline-item flex gap-4 mb-6" style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: '1.5rem', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-6px', top: '0', width: '10px', height: '10px', borderRadius: '50%', background: '#6366f1' }}></div>
                    <div className="timeline-content">
                        <div className="flex items-center gap-2 mb-1">
                            <span className="font-bold text-sm capitalize">{log.action?.replace('_', ' ') || 'Action'}</span>
                            <span className="text-xs text-muted">by {log.adminName || 'Admin'}</span>
                        </div>
                        <p className="text-sm text-gray-700 italic border-left-large pl-3 py-1" style={{ borderLeft: '3px solid #6366f1' }}>"{log.details || 'No details available'}"</p>
                        <span className="text-xs text-muted block mt-1">{new Date(log.timestamp).toLocaleString()}</span>
                    </div>
                </div>
            ))}
        </div>
    )
}
