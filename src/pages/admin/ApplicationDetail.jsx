import { useState, useEffect, useRef, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { auditService } from '../../services/auditService'
import { useAuth } from '../../hooks/useAuth'
import { computeAffordability, computeRiskFlags } from '../../utils/affordabilityEngine'
import StatusBadge from '../../components/StatusBadge'
import { getStageLabel } from '../../utils/statusModel'

import ApplicantSnapshot from '../../components/admin/ApplicationDetail/ApplicantSnapshot'
import VerificationRisk from '../../components/admin/ApplicationDetail/VerificationRisk'
import DecisionPanel from '../../components/admin/ApplicationDetail/DecisionPanel'
import SalesDataCollection from '../../components/admin/ApplicationDetail/SalesDataCollection'
import P2VestCard from '../../components/admin/ApplicationDetail/P2VestCard'
import AiPreScreenCard from '../../components/admin/ApplicationDetail/AiPreScreenCard'
import AiChatPanel from '../../components/admin/ApplicationDetail/AiChatPanel'
import TransactionAnalysisCard from '../../components/admin/ApplicationDetail/TransactionAnalysisCard'
import MonoAssessmentCard from '../../components/admin/ApplicationDetail/MonoAssessmentCard'
import ProviderSubmissionCard from '../../components/admin/ApplicationDetail/ProviderSubmissionCard'
import FirstCentralCard from '../../components/admin/ApplicationDetail/FirstCentralCard'
import ReviewSidebar, { getSectionStates } from '../../components/admin/ApplicationDetail/ReviewSidebar'
import InlineLoader from '../../components/ui/InlineLoader'
import Modal from '../../components/ui/Modal'
import RequestDocumentsModal from '../../components/admin/ApplicationDetail/RequestDocumentsModal'
import NotifyApplicantModal from '../../components/admin/ApplicationDetail/NotifyApplicantModal'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function SectionHeader({ id, title, subtitle, state }) {
    const stateColors = {
        complete:       { bg: '#f0fdf4', color: '#16a34a', label: 'Complete' },
        partial:        { bg: '#fffbeb', color: '#d97706', label: 'In Progress' },
        not_started:    { bg: '#f9fafb', color: '#9ca3af', label: 'Not Started' },
        not_applicable: { bg: '#f9fafb', color: '#d1d5db', label: 'N/A' },
    }
    const cfg = stateColors[state] || stateColors.not_started
    return (
        <div id={`section-${id}`} style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px', scrollMarginTop: '24px' }}>
            <div>
                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>{title}</h2>
                {subtitle && <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>{subtitle}</p>}
            </div>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: '999px', background: cfg.bg, color: cfg.color, whiteSpace: 'nowrap' }}>
                {cfg.label}
            </span>
        </div>
    )
}

export default function ApplicationDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [loan, setLoan] = useState(null)
    const [error, setError] = useState(null)
    const [activeSection, setActiveSection] = useState('applicant')
    const [monoInitiating, setMonoInitiating] = useState(false)
    const [monoRefreshing, setMonoRefreshing] = useState(false)
    const [monoFeedbackMessage, setMonoFeedbackMessage] = useState('')
    const [monoFeedbackError, setMonoFeedbackError] = useState('')
    const [feedbackModal, setFeedbackModal] = useState({ open: false, title: '', message: '' })
    const [showRequestDocs, setShowRequestDocs] = useState(false)
    const [providers, setProviders] = useState([])
    const [selectedProviderId, setSelectedProviderId] = useState('')
    const [assigningProvider, setAssigningProvider] = useState(false)
    const [assignProviderError, setAssignProviderError] = useState('')
    const [pdfDownloading, setPdfDownloading] = useState(false)
    const [pdfError, setPdfError] = useState('')
    const [showDeleteConfirm, setShowDeleteConfirm] = useState(false)
    const [deleting, setDeleting] = useState(false)
    const [deleteResult, setDeleteResult] = useState(null)
    const [showNotifyModal, setShowNotifyModal] = useState(false)

    const isSuperAdmin = session?.role === 'super_admin'

    const handleDelete = useCallback(async () => {
        setDeleting(true)
        try {
            const result = await adminService.deleteApplication(loan.id)
            setDeleteResult(result)
            setShowDeleteConfirm(false)
        } catch (err) {
            setDeleteResult({ error: err.message || 'Delete failed' })
            setShowDeleteConfirm(false)
        } finally {
            setDeleting(false)
        }
    }, [loan?.id])

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
        const timer = setTimeout(() => { loadLoanDetails() }, 300)
        return () => clearTimeout(timer)
    }, [id])

    useEffect(() => {
        if (session?.role === 'admin') {
            adminService.getProviders().then(setProviders).catch(() => {})
        }
    }, [session?.role])

    // Scrollspy — update active section as user scrolls
    useEffect(() => {
        const sectionIds = ['applicant', 'verification', 'credit', 'ai', 'provider', 'documents']
        const observer = new IntersectionObserver(
            (entries) => {
                for (const entry of entries) {
                    if (entry.isIntersecting) {
                        const sectionId = entry.target.id.replace('section-', '')
                        setActiveSection(sectionId)
                    }
                }
            },
            { rootMargin: '-20% 0px -60% 0px', threshold: 0 },
        )
        sectionIds.forEach((sid) => {
            const el = document.getElementById(`section-${sid}`)
            if (el) observer.observe(el)
        })
        return () => observer.disconnect()
    }, [loan])

    const handleAssignProvider = async () => {
        if (!selectedProviderId) return
        setAssigningProvider(true)
        setAssignProviderError('')
        try {
            await adminService.assignProviderToLoan(loan.id, selectedProviderId)
            await loadLoanDetails({ silent: true })
            openFeedback('Provider Assigned', 'The provider has been linked to this application.')
            setSelectedProviderId('')
        } catch (err) {
            setAssignProviderError(err.message || 'Failed to assign provider')
        } finally {
            setAssigningProvider(false)
        }
    }

    const openFeedback = (title, message) => setFeedbackModal({ open: true, title, message })

    const handleApproveStage1 = async (data) => {
        try {
            const updated = await adminService.approveStage1(loan.id, data)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            openFeedback('Stage 1 Approved', 'Application has been moved to credit review.')
        } catch (err) {
            openFeedback('Stage 1 Approval Failed', err.message || 'Error approving Stage 1')
        }
    }

    const handleApprove = async (terms) => {
        try {
            const updated = await adminService.approveLoan(loan.id, terms)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            openFeedback('Application Approved', 'The loan has been approved successfully.')
        } catch (err) {
            openFeedback('Approval Failed', err.message || 'Error approving loan')
        }
    }

    const handleReject = async (reason) => {
        try {
            const updated = await adminService.rejectLoan(loan.id, reason)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            openFeedback('Application Rejected', 'The application has been rejected.')
        } catch (err) {
            openFeedback('Rejection Failed', err.message || 'Error rejecting loan')
        }
    }

    const handleRequestInfo = async (message) => {
        try {
            const updated = await adminService.requestMoreInfo(loan.id, message)
            setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
            openFeedback('Request Sent', 'Information request sent successfully to the applicant.')
        } catch (err) {
            openFeedback('Request Failed', err.message || 'Error requesting information')
        }
    }

    const handleInitiateMonoConnect = async () => {
        if (!loan?.id) return
        try {
            setMonoInitiating(true)
            setMonoFeedbackMessage('')
            setMonoFeedbackError('')
            const isReconnect = loan.monoConnectionStatus === 'linked'
            const response = await adminService.initiateMonoConnectForLoan(loan.id, {
                redirectUrl: import.meta.env.VITE_MONO_REDIRECT_URL || `${window.location.origin}/track`,
                ...(isReconnect ? { force: true } : {}),
            })
            setMonoFeedbackMessage(response?.message || 'Mono connect link has been sent to the user email')
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

    if (loading) {
        return (
            <div className="admin-page flex items-center justify-center" style={{ minHeight: '100vh' }}>
                <InlineLoader label={`Loading application ${id}…`} subtitle="Fetching loan details, affordability metrics and Mono status" />
            </div>
        )
    }
    if (error) return (
        <div className="admin-page">
            <div className="alert-box alert-error">{error}</div>
            <button className="button button--secondary mt-4" onClick={() => navigate('/admin/applications')}>← Back to Applications</button>
        </div>
    )
    if (!loan) return (
        <div className="admin-page">
            <div className="alert-box alert-error">Application not found</div>
            <button className="button button--secondary mt-4" onClick={() => navigate('/admin/applications')}>← Back to Applications</button>
        </div>
    )

    const salesCanDoStage1 = session?.role === 'sales' && loan.assignedTo === session.username && !(loan.stage1ApprovedBy || loan.stage1ApprovedAt)
    const isSalesOwnedEarly = session?.role === 'sales' && loan.assignedTo === session.username && (loan.status === 'pending' || loan.status === 'incomplete')
    const sectionStates = getSectionStates(loan)

    const updatedWithPreserved = (updated) => updated
        ? { ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags }
        : null

    return (
        <>
        <div className="admin-page">

            {/* ── Page header ── */}
            <div style={{ marginBottom: '24px' }}>
                <button
                    style={{ background: 'none', border: 'none', cursor: 'pointer', fontSize: '0.875rem', color: '#2563eb', fontWeight: 600, padding: '0', marginBottom: '12px', display: 'inline-block' }}
                    onClick={() => navigate('/admin/applications')}
                >
                    ← Back to Applications
                </button>

                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '16px', flexWrap: 'wrap' }}>
                    <div>
                        <h1 style={{ margin: '0 0 6px', fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>
                            {loan.fullName || loan.patientName || 'Applicant'}
                        </h1>
                        <div style={{ display: 'flex', flexWrap: 'wrap', gap: '8px', alignItems: 'center', fontSize: '0.8125rem', color: '#6b7280' }}>
                            {loan.applicationCode && <span style={{ fontWeight: 700, color: '#1d4ed8' }}>{loan.applicationCode}</span>}
                            <span>ID: {loan.id}</span>
                            <span>·</span>
                            <span>Submitted {new Date(loan.submittedAt).toLocaleDateString()} at {new Date(loan.submittedAt).toLocaleTimeString()}</span>
                            {loan.assignedTo && (
                                <>
                                    <span>·</span>
                                    <span>Assigned to <strong style={{ color: '#374151' }}>{loan.assignedTo === session?.username ? 'Me' : loan.assignedTo}</strong></span>
                                </>
                            )}
                        </div>
                    </div>
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0, flexWrap: 'wrap' }}>
                        <StatusBadge status={loan.status} financingStatus={loan.financing_status} />
                        <span className="stage-pill">{getStageLabel(loan)}</span>
                        {isSuperAdmin && !loan.deletedAt && (
                            <button
                                className="button button--danger button--compact"
                                style={{ marginLeft: '8px' }}
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                🗑 Delete
                            </button>
                        )}
                    </div>
                </div>

                {loan.financing_status && (
                    <div style={{ marginTop: '12px', padding: '10px 16px', background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: '8px', display: 'flex', flexWrap: 'wrap', gap: '20px', fontSize: '0.8125rem' }}>
                        <span style={{ color: '#6b7280' }}>Financing:</span>
                        <StatusBadge status={loan.status} financingStatus={loan.financing_status} />
                        {loan.reserved_by_financier_id && <span><span style={{ color: '#6b7280' }}>Reserved by</span> {loan.reserved_by_financier_id}</span>}
                        {loan.financing_amount && <span><span style={{ color: '#6b7280' }}>Amount</span> ₦{loan.financing_amount.toLocaleString()}</span>}
                        {loan.financed_at && <span><span style={{ color: '#6b7280' }}>Financed</span> {new Date(loan.financed_at).toLocaleDateString()}</span>}
                    </div>
                )}
            </div>

            {/* ── Sales early view ── */}
            {isSalesOwnedEarly ? (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr', gap: '20px', maxWidth: '720px' }}>
                    <ApplicantSnapshot loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                    {salesCanDoStage1 && (
                        <SalesDataCollection loan={loan} onSave={() => {}} onApproveStage1={handleApproveStage1} />
                    )}
                </div>
            ) : (
                /* ── 3-column toolkit layout ── */
                <div className="detail-toolkit-grid">

                    {/* Left sidebar */}
                    <ReviewSidebar states={sectionStates} activeSection={activeSection} />

                    {/* Main content — all sections */}
                    <div style={{ display: 'flex', flexDirection: 'column', gap: '32px', minWidth: 0 }}>

                        {/* §1 Applicant Info */}
                        <section>
                            <SectionHeader id="applicant" title="Applicant Info" state={sectionStates.applicant} />
                            <ApplicantSnapshot loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                        </section>

                        {/* §2 Verification & Bank */}
                        <section>
                            <SectionHeader
                                id="verification"
                                title="Verification & Bank Statement"
                                subtitle="BVN verification · Mono Connect · affordability"
                                state={sectionStates.verification}
                            />
                            <VerificationRisk
                                loan={loan}
                                onInitiateMonoConnect={handleInitiateMonoConnect}
                                onRefreshMonoStatus={handleRefreshMonoStatus}
                                monoInitiating={monoInitiating}
                                monoRefreshing={monoRefreshing}
                                monoFeedbackMessage={monoFeedbackMessage}
                                monoFeedbackError={monoFeedbackError}
                                onUpdated={(updated) => {
                                    const merged = updatedWithPreserved(updated)
                                    if (merged) setLoan(merged)
                                    else loadLoanDetails({ silent: true })
                                }}
                            />
                        </section>

                        {/* §3 Credit Analysis */}
                        <section>
                            <SectionHeader
                                id="credit"
                                title="Credit Analysis"
                                subtitle="Bank statement analysis · Mono income & creditworthiness · FirstCentral bureau"
                                state={sectionStates.credit}
                            />
                            <div className="detail-credit-grid">
                                <MonoAssessmentCard
                                    loan={loan}
                                    onUpdated={(updated) => {
                                        const merged = updatedWithPreserved(updated)
                                        if (merged) setLoan(merged)
                                        else loadLoanDetails({ silent: true })
                                    }}
                                />
                                <TransactionAnalysisCard
                                    loan={loan}
                                    onUpdated={(updated) => {
                                        const merged = updatedWithPreserved(updated)
                                        if (merged) setLoan(merged)
                                        else loadLoanDetails({ silent: true })
                                    }}
                                />
                            </div>
                            <div style={{ marginTop: '20px' }}>
                                <FirstCentralCard
                                    loan={loan}
                                    onUpdated={() => loadLoanDetails({ silent: true })}
                                />
                            </div>
                        </section>

                        {/* §4 AI Analysis */}
                        <section>
                            <SectionHeader
                                id="ai"
                                title="AI Analysis"
                                subtitle="Pre-screen, consistency check, and AI underwriter chat"
                                state={sectionStates.ai}
                            />
                            <AiPreScreenCard
                                loan={loan}
                                onUpdated={(updated) => {
                                    const merged = updatedWithPreserved(updated)
                                    if (merged) setLoan(merged)
                                }}
                            />
                            <div style={{ marginTop: '20px' }}>
                                <AiChatPanel loan={loan} />
                            </div>
                        </section>

                        {/* §5 Provider Submission */}
                        <section>
                            <SectionHeader
                                id="provider"
                                title="Provider Submission"
                                subtitle="P2Vest credit review · multi-provider framework"
                                state={sectionStates.provider}
                            />
                            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '20px', alignItems: 'start' }}>
                                <P2VestCard loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                                <ProviderSubmissionCard loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                            </div>
                        </section>

                        {/* §6 Documents */}
                        <section>
                            <SectionHeader
                                id="documents"
                                title="Documents"
                                subtitle="Uploaded files and document requests"
                                state={sectionStates.documents}
                            />
                            <div className="detail-card">

                                {/* ── Submission documents ── */}
                                <p style={{ margin: '0 0 10px', fontWeight: 700, fontSize: '0.8125rem', color: '#374151' }}>Submitted with application</p>
                                {[
                                    { key: 'id_document', label: 'Government-issued ID' },
                                    { key: 'treatment_estimate', label: 'Treatment Estimate' },
                                    { key: 'payslip', label: 'Pay Slip' },
                                ].map(({ key, label }) => {
                                    const doc = loan.documents?.[key]
                                    const hasUrl = !!doc?.url
                                    return (
                                        <div key={key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' }}>
                                            <span style={{ fontSize: '1rem' }}>{hasUrl ? '✅' : '⬜'}</span>
                                            <div style={{ flex: 1 }}>
                                                <span style={{ fontWeight: 600 }}>{label}</span>
                                                {doc?.fileName && <span style={{ color: '#6b7280', marginLeft: '6px' }}>— {doc.fileName}</span>}
                                                {!hasUrl && <span style={{ color: '#9ca3af', marginLeft: '6px', fontStyle: 'italic' }}>not uploaded</span>}
                                            </div>
                                            {hasUrl && (
                                                <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer"
                                                        style={{ color: '#2563eb', fontSize: '0.75rem', textDecoration: 'underline' }}>View</a>
                                                    <a href={doc.url} download={doc.fileName}
                                                        style={{ color: '#059669', fontSize: '0.75rem', textDecoration: 'underline' }}>Download</a>
                                                    <button
                                                        onClick={() => { navigator.clipboard.writeText(doc.url) }}
                                                        style={{ fontSize: '0.75rem', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                                                        Share link
                                                    </button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}

                                {/* ── Requested documents ── */}
                                <p style={{ margin: '16px 0 10px', fontWeight: 700, fontSize: '0.8125rem', color: '#374151' }}>Requested documents</p>
                                {loan.documentRequests?.length > 0 ? (
                                    <div style={{ marginBottom: '12px' }}>
                                        {loan.documentRequests.map((doc) => (
                                            <div key={doc.key} style={{ display: 'flex', alignItems: 'center', gap: '8px', padding: '8px 0', borderBottom: '1px solid #f3f4f6', fontSize: '0.8125rem' }}>
                                                <span style={{ fontSize: '1rem' }}>{doc.status === 'uploaded' ? '✅' : '⏳'}</span>
                                                <div style={{ flex: 1 }}>
                                                    <span style={{ fontWeight: 600 }}>{doc.label}</span>
                                                    {doc.note && <span style={{ color: '#6b7280', marginLeft: '6px' }}>— {doc.note}</span>}
                                                </div>
                                                {doc.status === 'uploaded' && doc.fileUrl && (
                                                    <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
                                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer"
                                                            style={{ color: '#2563eb', fontSize: '0.75rem', textDecoration: 'underline' }}>View</a>
                                                        <a href={doc.fileUrl} download={doc.fileName}
                                                            style={{ color: '#059669', fontSize: '0.75rem', textDecoration: 'underline' }}>Download</a>
                                                        <button
                                                            onClick={() => { navigator.clipboard.writeText(doc.fileUrl) }}
                                                            style={{ fontSize: '0.75rem', color: '#7c3aed', background: 'none', border: 'none', cursor: 'pointer', textDecoration: 'underline', padding: 0 }}>
                                                            Share link
                                                        </button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: '0 0 14px', color: '#9ca3af', fontSize: '0.8125rem' }}>No documents requested yet.</p>
                                )}
                                <button
                                    onClick={() => setShowRequestDocs(true)}
                                    style={{ background: '#eff6ff', border: '1.5px solid #bfdbfe', borderRadius: '7px', padding: '8px 14px', color: '#1d4ed8', fontWeight: 600, fontSize: '0.8125rem', cursor: 'pointer', width: '100%', marginTop: '4px' }}
                                >
                                    Request Documents from Applicant
                                </button>
                            </div>
                        </section>

                        {/* Audit trail at the bottom of main */}
                        <section style={{ paddingBottom: '48px' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
                                <h2 style={{ margin: 0, fontSize: '1rem', fontWeight: 700, color: '#111827' }}>Audit Trail</h2>
                            </div>
                            <div className="detail-card">
                                <AuditTimeline loanId={loan.id} />
                            </div>
                        </section>
                    </div>

                    {/* Right panel (sticky) */}
                    <div className="detail-right-panel">

                        {/* Loan summary */}
                        <div className="detail-card" style={{ borderLeft: '4px solid #2563eb' }}>
                            <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#2563eb', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Loan Summary</span>
                                <span className="stage-pill" style={{ fontSize: '0.7rem' }}>{getStageLabel(loan)}</span>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                                {[
                                    { label: 'Requested', value: fmt(loan.requestedAmount) },
                                    { label: 'Duration', value: loan.preferredDuration ? `${loan.preferredDuration} months` : '—' },
                                    { label: 'Purpose', value: loan.procedureOrService || loan.treatmentCategory || loan.loanPurpose || '—' },
                                    { label: 'Hospital', value: loan.hospitalName || loan.provider?.name || '—' },
                                    { label: 'Employment', value: loan.employmentType || '—' },
                                    ...(loan.approvedAmount ? [{ label: 'Approved', value: fmt(loan.approvedAmount) }] : []),
                                    ...(loan.monthlyInstallment ? [{ label: 'Monthly', value: fmt(loan.monthlyInstallment) }] : []),
                                ].map(({ label, value }) => (
                                    <div key={label} style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem' }}>
                                        <span style={{ color: '#6b7280' }}>{label}</span>
                                        <span style={{ fontWeight: 600, color: '#111827', textAlign: 'right', maxWidth: '60%' }}>{value}</span>
                                    </div>
                                ))}
                            </div>
                        </div>

                        {/* Financier Report Download */}
                        <div className="detail-card" style={{ borderLeft: '4px solid #0f766e' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#0f766e', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Financier Report</span>
                                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                                    Structured credit report for lenders — includes KYC, bank analysis, credit decision.
                                </p>
                            </div>
                            <div style={{ display: 'flex', flexDirection: 'column', gap: '6px' }}>
                                <button
                                    onClick={async () => {
                                        setPdfDownloading(true)
                                        setPdfError('')
                                        try {
                                            await adminService.downloadFinancierReportPdf(loan.id || loan._id)
                                        } catch (err) {
                                            setPdfError(err.message || 'Failed to download PDF')
                                        } finally {
                                            setPdfDownloading(false)
                                        }
                                    }}
                                    disabled={pdfDownloading}
                                    style={{
                                        width: '100%', padding: '9px 14px', borderRadius: '8px',
                                        border: 'none', background: pdfDownloading ? '#e5e7eb' : '#0f766e',
                                        color: pdfDownloading ? '#9ca3af' : '#fff',
                                        fontWeight: 700, fontSize: '0.8125rem',
                                        cursor: pdfDownloading ? 'not-allowed' : 'pointer',
                                        display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                    }}
                                >
                                    {pdfDownloading ? 'Generating PDF…' : '⬇ Download PDF Report'}
                                </button>
                                <button
                                    onClick={async () => {
                                        try {
                                            const report = await adminService.getFinancierReport(loan.id || loan._id)
                                            const blob = new Blob([JSON.stringify(report, null, 2)], { type: 'application/json' })
                                            const url = URL.createObjectURL(blob)
                                            const a = document.createElement('a')
                                            a.href = url
                                            a.download = `carecova-report-${loan.applicationCode || (loan.id || loan._id).slice(-8)}.json`
                                            document.body.appendChild(a)
                                            a.click()
                                            document.body.removeChild(a)
                                            URL.revokeObjectURL(url)
                                        } catch (err) {
                                            setPdfError(err.message || 'Failed to download JSON')
                                        }
                                    }}
                                    style={{
                                        width: '100%', padding: '7px 14px', borderRadius: '8px',
                                        border: '1.5px solid #ccfbf1', background: '#f0fdfa',
                                        color: '#0f766e', fontWeight: 600, fontSize: '0.8rem',
                                        cursor: 'pointer',
                                    }}
                                >
                                    {'{ }'} Download JSON Report
                                </button>
                            </div>
                            {pdfError && <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: '#dc2626' }}>{pdfError}</p>}
                        </div>

                        {/* Assign hospital provider */}
                        {session?.role === 'admin' && (
                            <div className="detail-card">
                                <h3 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 600 }}>Linked Hospital</h3>
                                {loan.providerName || loan.provider?.name ? (
                                    <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: '#111827', fontWeight: 600 }}>
                                        {loan.providerName || loan.provider?.name}
                                    </p>
                                ) : (
                                    <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: '#9ca3af' }}>No hospital linked.</p>
                                )}
                                <div style={{ display: 'flex', gap: '8px' }}>
                                    <select
                                        value={selectedProviderId}
                                        onChange={(e) => { setSelectedProviderId(e.target.value); setAssignProviderError('') }}
                                        style={{ flex: 1, padding: '7px 8px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff' }}
                                    >
                                        <option value="">Change hospital…</option>
                                        {providers.map((p) => (
                                            <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.facilityName || p.email}</option>
                                        ))}
                                    </select>
                                    <button
                                        onClick={handleAssignProvider}
                                        disabled={!selectedProviderId || assigningProvider}
                                        style={{ padding: '7px 12px', borderRadius: '7px', border: 'none', background: selectedProviderId ? '#2563eb' : '#e5e7eb', color: selectedProviderId ? '#fff' : '#9ca3af', fontWeight: 600, fontSize: '0.8125rem', cursor: selectedProviderId ? 'pointer' : 'not-allowed', whiteSpace: 'nowrap' }}
                                    >
                                        {assigningProvider ? '…' : 'Link'}
                                    </button>
                                </div>
                                {assignProviderError && <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: '#dc2626' }}>{assignProviderError}</p>}
                            </div>
                        )}

                        {/* Notify Applicant */}
                        <div className="detail-card" style={{ borderLeft: '4px solid #7c3aed' }}>
                            <div style={{ marginBottom: '8px' }}>
                                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#7c3aed', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Applicant Notification</span>
                                <p style={{ margin: '4px 0 0', fontSize: '0.78rem', color: '#6b7280' }}>
                                    Send a status update email directly to the applicant.
                                </p>
                            </div>
                            <button
                                onClick={() => setShowNotifyModal(true)}
                                style={{
                                    width: '100%', padding: '9px 14px', borderRadius: '8px',
                                    border: 'none', background: '#7c3aed', color: '#fff',
                                    fontWeight: 700, fontSize: '0.8125rem', cursor: 'pointer',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '6px',
                                }}
                            >
                                ✉ Notify Applicant
                            </button>
                        </div>

                        {/* Decision panel */}
                        <DecisionPanel
                            loan={loan}
                            session={session}
                            onApprove={handleApprove}
                            onReject={handleReject}
                            onRequestInfo={handleRequestInfo}
                        />
                    </div>
                </div>
            )}
        </div>

        <Modal
            isOpen={feedbackModal.open}
            onClose={() => setFeedbackModal(prev => ({ ...prev, open: false }))}
            title={feedbackModal.title}
            size="sm"
            footer={
                <button type="button" className="button button--primary w-full" onClick={() => setFeedbackModal(prev => ({ ...prev, open: false }))}>
                    OK
                </button>
            }
        >
            <p className="text-sm text-muted">{feedbackModal.message}</p>
        </Modal>

        {showNotifyModal && (
            <NotifyApplicantModal
                loan={loan}
                onClose={() => setShowNotifyModal(false)}
            />
        )}

        {showRequestDocs && (
            <RequestDocumentsModal
                loanId={loan.id}
                applicantEmail={loan.email}
                onClose={() => setShowRequestDocs(false)}
                onSuccess={(updated) => {
                    setLoan({ ...updated, affordability: loan.affordability, riskFlags: loan.riskFlags })
                    setShowRequestDocs(false)
                    openFeedback('Documents Requested', loan.email ? `Upload link sent to ${loan.email}` : 'Upload link generated — no email on file.')
                }}
            />
        )}

        {/* Delete confirmation modal */}
        <Modal
            isOpen={showDeleteConfirm}
            onClose={() => setShowDeleteConfirm(false)}
            title="Delete Application"
            size="sm"
            footer={
                <div style={{ display: 'flex', gap: '8px', justifyContent: 'flex-end' }}>
                    <button className="button button--secondary" onClick={() => setShowDeleteConfirm(false)}>Cancel</button>
                    <button className="button button--danger" onClick={handleDelete} disabled={deleting}>
                        {deleting ? 'Deleting…' : 'Yes, delete'}
                    </button>
                </div>
            }
        >
            <p className="text-sm" style={{ marginBottom: '8px' }}>
                This will move <strong>{loan?.fullName || loan?.patientName || 'this application'}</strong> to the trash.
            </p>
            <p className="text-sm text-muted">
                The record will be permanently deleted in <strong>7 days</strong>. You can restore it before then from the Trash tab on the Applications page.
            </p>
        </Modal>

        {/* Delete result banner */}
        {deleteResult && (
            <div
                style={{
                    position: 'fixed', bottom: '24px', right: '24px', zIndex: 9999,
                    padding: '14px 18px', borderRadius: '10px', maxWidth: '360px',
                    background: deleteResult.error ? '#fef2f2' : '#f0fdf4',
                    border: `1px solid ${deleteResult.error ? '#fecaca' : '#bbf7d0'}`,
                    color: deleteResult.error ? '#dc2626' : '#15803d',
                    boxShadow: '0 4px 20px rgba(0,0,0,0.1)',
                }}
            >
                <div style={{ fontWeight: 600, marginBottom: '4px' }}>
                    {deleteResult.error ? 'Delete failed' : 'Application queued for deletion'}
                </div>
                <div style={{ fontSize: '0.8125rem' }}>
                    {deleteResult.error || deleteResult.message}
                </div>
                <div style={{ display: 'flex', gap: '8px', marginTop: '10px' }}>
                    {!deleteResult.error && (
                        <button
                            className="button button--secondary button--compact"
                            onClick={async () => {
                                await adminService.restoreApplication(loan.id)
                                setDeleteResult(null)
                                loadLoanDetails({ silent: true })
                            }}
                        >
                            Undo
                        </button>
                    )}
                    <button
                        className="button button--ghost button--compact"
                        onClick={() => {
                            setDeleteResult(null)
                            if (!deleteResult.error) navigate('/admin/applications')
                        }}
                    >
                        {deleteResult.error ? 'Dismiss' : 'Back to list'}
                    </button>
                </div>
            </div>
        )}
        </>
    )
}

function AuditTimeline({ loanId }) {
    const logs = auditService.getForLoan(loanId)

    if (logs.length === 0) return (
        <div style={{ padding: '24px', textAlign: 'center', color: '#9ca3af', fontSize: '0.875rem' }}>
            No recorded activity for this application.
        </div>
    )

    return (
        <div>
            {logs.map((log) => (
                <div key={log.id} style={{ borderLeft: '2px solid #e5e7eb', paddingLeft: '20px', marginBottom: '20px', position: 'relative' }}>
                    <div style={{ position: 'absolute', left: '-5px', top: '2px', width: '8px', height: '8px', borderRadius: '50%', background: '#6366f1' }} />
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '4px' }}>
                        <span style={{ fontWeight: 700, fontSize: '0.875rem', textTransform: 'capitalize' }}>{log.action?.replace('_', ' ') || 'Action'}</span>
                        <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>by {log.adminName || 'Admin'}</span>
                    </div>
                    <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', color: '#374151', fontStyle: 'italic', borderLeft: '3px solid #6366f1', paddingLeft: '10px' }}>
                        "{log.details || 'No details available'}"
                    </p>
                    <span style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{new Date(log.timestamp).toLocaleString()}</span>
                </div>
            ))}
        </div>
    )
}
