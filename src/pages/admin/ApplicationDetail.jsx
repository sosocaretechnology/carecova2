import { useState, useEffect, useCallback } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { auditService } from '../../services/auditService'
import { useAuth } from '../../hooks/useAuth'
import { computeAffordability, computeRiskFlags } from '../../utils/affordabilityEngine'
import StatusBadge from '../../components/StatusBadge'
import { getStageLabel } from '../../utils/statusModel'
import { customerService } from '../../services/customerService'

import ApplicantSnapshot from '../../components/admin/ApplicationDetail/ApplicantSnapshot'
import VerificationRisk from '../../components/admin/ApplicationDetail/VerificationRisk'
import DecisionPanel from '../../components/admin/ApplicationDetail/DecisionPanel'
import SalesDataCollection from '../../components/admin/ApplicationDetail/SalesDataCollection'
import P2VestCard from '../../components/admin/ApplicationDetail/P2VestCard'
import AiPreScreenCard from '../../components/admin/ApplicationDetail/AiPreScreenCard'
import AiChatPanel from '../../components/admin/ApplicationDetail/AiChatPanel'
import TransactionAnalysisCard from '../../components/admin/ApplicationDetail/TransactionAnalysisCard'
import TransactionExplorer from '../../components/admin/ApplicationDetail/TransactionExplorer'
import MonoAssessmentCard from '../../components/admin/ApplicationDetail/MonoAssessmentCard'
import ProviderSubmissionCard from '../../components/admin/ApplicationDetail/ProviderSubmissionCard'
import FirstCentralTab from '../../components/admin/ApplicationDetail/FirstCentralTab'
import { getSectionStates } from '../../components/admin/ApplicationDetail/ReviewSidebar'
import InlineLoader from '../../components/ui/InlineLoader'
import Modal from '../../components/ui/Modal'
import RequestDocumentsModal from '../../components/admin/ApplicationDetail/RequestDocumentsModal'
import NotifyApplicantModal from '../../components/admin/ApplicationDetail/NotifyApplicantModal'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'

export default function ApplicationDetail() {
    const { id } = useParams()
    const navigate = useNavigate()
    const { session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [loan, setLoan] = useState(null)
    const [error, setError] = useState(null)
    const [activeTab, setActiveTab] = useState('applicant')
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
    const canViewBankAnalysis = ['super_admin', 'admin', 'credit_admin', 'credit_officer', 'reviewer'].includes(session?.role)

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
        loadLoanDetails()
    }, [id])

    useEffect(() => {
        if (session?.role === 'admin') {
            adminService.getProviders().then(setProviders).catch(() => {})
        }
    }, [session?.role])


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
            <div className="cc-app-header">
                <div className="cc-app-header-nav">
                    <button
                        className="cc-back-link"
                        onClick={() => navigate('/admin/applications')}
                    >
                        ← Back to Applications
                    </button>
                    {loan.phone && (
                        <button
                            className="cc-view-patient-btn"
                            onClick={() => navigate(`/admin/customers/${encodeURIComponent(customerService.normalisePhone(loan.phone))}`)}
                            title="Open Customer 360 profile"
                        >
                            <svg width="13" height="13" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round"><circle cx="12" cy="8" r="4"/><path d="M4 20c0-4 3.6-7 8-7s8 3 8 7"/></svg>
                            View Patient 360
                        </button>
                    )}
                </div>

                <div className="cc-app-header-main">
                    <div>
                        <h1 className="cc-app-title">
                            {loan.fullName || loan.patientName || 'Applicant'}
                        </h1>
                        <div className="cc-app-header-meta">
                            {loan.applicationCode && <span className="cc-app-code">{loan.applicationCode}</span>}
                            <span>ID: {loan.id}</span>
                            <span>·</span>
                            <span>Submitted {new Date(loan.submittedAt).toLocaleDateString()} at {new Date(loan.submittedAt).toLocaleTimeString()}</span>
                            {loan.assignedTo && (
                                <>
                                    <span>·</span>
                                    <span>Assigned to <strong className="cc-app-assigned">{loan.assignedTo === session?.username ? 'Me' : loan.assignedTo}</strong></span>
                                </>
                            )}
                        </div>
                    </div>
                    <div className="cc-app-header-actions">
                        <StatusBadge status={loan.status} financingStatus={loan.financing_status} />
                        <span className="stage-pill">{getStageLabel(loan)}</span>
                        {isSuperAdmin && !loan.deletedAt && (
                            <button
                                className="button button--danger button--compact"
                                onClick={() => setShowDeleteConfirm(true)}
                            >
                                🗑 Delete
                            </button>
                        )}
                    </div>
                </div>

                {loan.financing_status && (
                    <div className="cc-financing-bar">
                        <span>Financing:</span>
                        <StatusBadge status={loan.status} financingStatus={loan.financing_status} />
                        {loan.reserved_by_financier_id && <span>Reserved by {loan.reserved_by_financier_id}</span>}
                        {loan.financing_amount && <span>Amount ₦{loan.financing_amount.toLocaleString()}</span>}
                        {loan.financed_at && <span>Financed {new Date(loan.financed_at).toLocaleDateString()}</span>}
                    </div>
                )}
            </div>

            {/* ── Sales early view ── */}
            {isSalesOwnedEarly ? (
                <div className="cc-sales-early-view">
                    <ApplicantSnapshot loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                    {salesCanDoStage1 && (
                        <SalesDataCollection loan={loan} onSave={() => {}} onApproveStage1={handleApproveStage1} />
                    )}
                </div>
            ) : (
                /* ── Tabbed layout ── */
                <div className="cc-app-tabs">
                    <div className="cc-tab-bar" role="tablist">
                        {[
                            { key: 'applicant',    label: 'Applicant',    state: sectionStates.applicant },
                            { key: 'verification', label: 'Verification', state: sectionStates.verification },
                            { key: 'credit',       label: 'Credit',       state: sectionStates.credit },
                            ...(canViewBankAnalysis ? [{ key: 'first-central', label: 'FirstCentral', state: sectionStates.credit }] : []),
                            ...(canViewBankAnalysis ? [{ key: 'bank-analysis', label: 'Bank Analysis', state: null }] : []),
                            { key: 'ai',           label: 'AI Analysis',  state: sectionStates.ai },
                            { key: 'provider',     label: 'Provider',     state: sectionStates.provider },
                            { key: 'documents',    label: 'Documents',    state: sectionStates.documents },
                            { key: 'actions',      label: 'Actions',      state: null },
                        ].map(tab => (
                            <button
                                key={tab.key}
                                role="tab"
                                aria-selected={activeTab === tab.key}
                                className={`cc-tab${activeTab === tab.key ? ' is-active' : ''}`}
                                onClick={() => setActiveTab(tab.key)}
                            >
                                {tab.state && <span className={`cc-tab-dot cc-tab-dot--${tab.state}`} />}
                                {tab.label}
                            </button>
                        ))}
                    </div>

                    <div className="cc-tab-content">
                        {activeTab === 'applicant' && (
                            <ApplicantSnapshot loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                        )}

                        {activeTab === 'verification' && (
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
                        )}

                        {activeTab === 'credit' && (
                            <div className="cc-main-sections">
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
                            </div>
                        )}

                        {activeTab === 'first-central' && canViewBankAnalysis && (
                            <FirstCentralTab
                                loan={loan}
                                onUpdated={() => loadLoanDetails({ silent: true })}
                            />
                        )}

                        {activeTab === 'bank-analysis' && canViewBankAnalysis && (
                            <TransactionExplorer loan={loan} />
                        )}

                        {activeTab === 'ai' && (
                            <div className="cc-main-sections">
                                <AiPreScreenCard
                                    loan={loan}
                                    onUpdated={(updated) => {
                                        const merged = updatedWithPreserved(updated)
                                        if (merged) setLoan(merged)
                                    }}
                                />
                                <AiChatPanel loan={loan} />
                            </div>
                        )}

                        {activeTab === 'provider' && (
                            <div className="cc-provider-submission-grid">
                                <P2VestCard loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                                <ProviderSubmissionCard loan={loan} onUpdated={() => loadLoanDetails({ silent: true })} />
                            </div>
                        )}

                        {activeTab === 'documents' && (
                            <div className="detail-card">
                                <p className="cc-doc-heading">Submitted with application</p>
                                {[
                                    { key: 'id_document', label: 'Government-issued ID' },
                                    { key: 'treatment_estimate', label: 'Treatment Estimate' },
                                    { key: 'payslip', label: 'Pay Slip' },
                                ].map(({ key, label }) => {
                                    const doc = loan.documents?.[key]
                                    const hasUrl = !!doc?.url
                                    return (
                                        <div key={key} className="cc-doc-row">
                                            <span style={{ fontSize: '1rem' }}>{hasUrl ? '✅' : '⬜'}</span>
                                            <div className="cc-doc-row-info">
                                                <span className="cc-doc-name">{label}</span>
                                                {doc?.fileName && <span className="cc-doc-filename">— {doc.fileName}</span>}
                                                {!hasUrl && <span className="cc-doc-missing">not uploaded</span>}
                                            </div>
                                            {hasUrl && (
                                                <div className="cc-doc-actions">
                                                    <a href={doc.url} target="_blank" rel="noopener noreferrer" className="cc-doc-link-view">View</a>
                                                    <a href={doc.url} download={doc.fileName} className="cc-doc-link-download">Download</a>
                                                    <button onClick={() => navigator.clipboard.writeText(doc.url)} className="cc-doc-link-share">Share link</button>
                                                </div>
                                            )}
                                        </div>
                                    )
                                })}
                                <p className="cc-doc-heading" style={{ marginTop: '16px' }}>Requested documents</p>
                                {loan.documentRequests?.length > 0 ? (
                                    <div style={{ marginBottom: '12px' }}>
                                        {loan.documentRequests.map((doc) => (
                                            <div key={doc.key} className="cc-doc-row">
                                                <span style={{ fontSize: '1rem' }}>{doc.status === 'uploaded' ? '✅' : '⏳'}</span>
                                                <div className="cc-doc-row-info">
                                                    <span className="cc-doc-name">{doc.label}</span>
                                                    {doc.note && <span className="cc-doc-filename">— {doc.note}</span>}
                                                </div>
                                                {doc.status === 'uploaded' && doc.fileUrl && (
                                                    <div className="cc-doc-actions">
                                                        <a href={doc.fileUrl} target="_blank" rel="noopener noreferrer" className="cc-doc-link-view">View</a>
                                                        <a href={doc.fileUrl} download={doc.fileName} className="cc-doc-link-download">Download</a>
                                                        <button onClick={() => navigator.clipboard.writeText(doc.fileUrl)} className="cc-doc-link-share">Share link</button>
                                                    </div>
                                                )}
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <p style={{ margin: '0 0 14px', color: 'var(--color-text-label)', fontSize: '0.8125rem' }}>No documents requested yet.</p>
                                )}
                                <button onClick={() => setShowRequestDocs(true)} className="cc-request-docs-btn">
                                    Request Documents from Applicant
                                </button>
                            </div>
                        )}

                        {activeTab === 'actions' && (
                            <div className="cc-actions-tab">
                                <div className="cc-main-sections">
                                    <DecisionPanel
                                        loan={loan}
                                        session={session}
                                        onApprove={handleApprove}
                                        onReject={handleReject}
                                        onRequestInfo={handleRequestInfo}
                                    />
                                    <div>
                                        <div className="cc-audit-section-header">
                                            <h2>Audit Trail</h2>
                                        </div>
                                        <div className="detail-card">
                                            <AuditTimeline loanId={loan.id} />
                                        </div>
                                    </div>
                                </div>

                                <div className="cc-main-sections">
                                    <div className="detail-card cc-accent-card--blue">
                                        <div className="cc-summary-header">
                                            <span className="cc-card-eyebrow cc-card-eyebrow--blue">Loan Summary</span>
                                            <span className="stage-pill" style={{ fontSize: '0.7rem' }}>{getStageLabel(loan)}</span>
                                        </div>
                                        <div className="cc-summary-rows">
                                            {[
                                                { label: 'Requested', value: fmt(loan.requestedAmount) },
                                                { label: 'Duration', value: loan.preferredDuration ? `${loan.preferredDuration} months` : '—' },
                                                { label: 'Purpose', value: loan.procedureOrService || loan.treatmentCategory || loan.loanPurpose || '—' },
                                                { label: 'Hospital', value: loan.hospitalName || loan.provider?.name || '—' },
                                                { label: 'Employment', value: loan.employmentType || '—' },
                                                ...(loan.approvedAmount ? [{ label: 'Approved', value: fmt(loan.approvedAmount) }] : []),
                                                ...(loan.monthlyInstallment ? [{ label: 'Monthly', value: fmt(loan.monthlyInstallment) }] : []),
                                            ].map(({ label, value }) => (
                                                <div key={label} className="cc-summary-row">
                                                    <span className="cc-summary-label">{label}</span>
                                                    <span className="cc-summary-value">{value}</span>
                                                </div>
                                            ))}
                                        </div>
                                    </div>

                                    <div className="detail-card cc-accent-card--teal">
                                        <div style={{ marginBottom: '8px' }}>
                                            <span className="cc-card-eyebrow cc-card-eyebrow--teal">Financier Report</span>
                                            <p className="cc-card-desc">Structured credit report for lenders — includes KYC, bank analysis, credit decision.</p>
                                        </div>
                                        <div className="cc-report-btns">
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
                                                className="cc-btn-teal"
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
                                                className="cc-btn-teal-outline"
                                            >
                                                {'{ }'} Download JSON Report
                                            </button>
                                        </div>
                                        {pdfError && <p className="cc-field-error">{pdfError}</p>}
                                    </div>

                                    {session?.role === 'admin' && (
                                        <div className="detail-card">
                                            <h3 style={{ margin: '0 0 10px', fontSize: '0.875rem', fontWeight: 600 }}>Linked Hospital</h3>
                                            {loan.providerName || loan.provider?.name ? (
                                                <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', fontWeight: 600 }}>{loan.providerName || loan.provider?.name}</p>
                                            ) : (
                                                <p style={{ margin: '0 0 8px', fontSize: '0.8125rem', color: 'var(--color-text-label)' }}>No hospital linked.</p>
                                            )}
                                            <div className="cc-provider-select-row">
                                                <select
                                                    value={selectedProviderId}
                                                    onChange={(e) => { setSelectedProviderId(e.target.value); setAssignProviderError('') }}
                                                    className="cc-provider-select"
                                                >
                                                    <option value="">Change hospital…</option>
                                                    {providers.map((p) => (
                                                        <option key={p.id || p._id} value={p.id || p._id}>{p.name || p.facilityName || p.email}</option>
                                                    ))}
                                                </select>
                                                <button
                                                    onClick={handleAssignProvider}
                                                    disabled={!selectedProviderId || assigningProvider}
                                                    className="cc-provider-link-btn"
                                                >
                                                    {assigningProvider ? '…' : 'Link'}
                                                </button>
                                            </div>
                                            {assignProviderError && <p className="cc-field-error">{assignProviderError}</p>}
                                        </div>
                                    )}

                                    <div className="detail-card cc-accent-card--purple">
                                        <div style={{ marginBottom: '8px' }}>
                                            <span className="cc-card-eyebrow cc-card-eyebrow--purple">Applicant Notification</span>
                                            <p className="cc-card-desc">Send a status update email directly to the applicant.</p>
                                        </div>
                                        <button onClick={() => setShowNotifyModal(true)} className="cc-btn-purple">
                                            ✉ Notify Applicant
                                        </button>
                                    </div>
                                </div>
                            </div>
                        )}
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

        {/* Delete result toast */}
        {deleteResult && (
            <div className={`cc-toast${deleteResult.error ? ' cc-toast--error' : ' cc-toast--success'}`}>
                <div className="cc-toast-title">
                    {deleteResult.error ? 'Delete failed' : 'Application queued for deletion'}
                </div>
                <div className="cc-toast-body">
                    {deleteResult.error || deleteResult.message}
                </div>
                <div className="cc-toast-actions">
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
        <div className="cc-audit-empty">No recorded activity for this application.</div>
    )

    return (
        <div>
            {logs.map((log) => (
                <div key={log.id} className="cc-audit-item">
                    <div className="cc-audit-dot" />
                    <div className="cc-audit-row">
                        <span className="cc-audit-action">{log.action?.replace('_', ' ') || 'Action'}</span>
                        <span className="cc-audit-actor">by {log.adminName || 'Admin'}</span>
                    </div>
                    <p className="cc-audit-detail">"{log.details || 'No details available'}"</p>
                    <span className="cc-audit-time">{new Date(log.timestamp).toLocaleString()}</span>
                </div>
            ))}
        </div>
    )
}
