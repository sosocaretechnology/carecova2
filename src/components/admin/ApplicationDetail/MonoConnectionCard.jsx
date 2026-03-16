import { useNavigate } from 'react-router-dom'

const MONO_STATUS_META = {
    not_started: {
        label: 'Not started',
        color: '#64748b',
        description: 'Mono authentication has not been initiated for this applicant.',
    },
    pending: {
        label: 'Pending user action',
        color: '#f59e0b',
        description: 'Connect link was sent. Waiting for the applicant to complete linking.',
    },
    linked: {
        label: 'Linked',
        color: '#10b981',
        description: 'User account is linked and ready for Mono data requests.',
    },
}

const formatDateTime = (value) => {
    if (!value) return '—'
    const date = new Date(value)
    if (Number.isNaN(date.getTime())) return '—'
    return date.toLocaleString()
}

export default function MonoConnectionCard({
    loan,
    initiating = false,
    refreshing = false,
    onInitiate,
    onRefresh,
    feedbackMessage = '',
    feedbackError = '',
}) {
    const navigate = useNavigate()
    const statusKey = loan.monoConnectionStatus || 'not_started'
    const statusMeta = MONO_STATUS_META[statusKey] || MONO_STATUS_META.not_started
    const hasUserEmail = Boolean(loan.email)
    const incomeProfile = loan.monoIncomeProfile || {}

    return (
        <div className="detail-card" style={{ borderLeft: `4px solid ${statusMeta.color}` }}>
            <div className="flex-between" style={{ gap: 12, alignItems: 'center' }}>
                <div>
                    <h2 style={{ marginBottom: 4 }}>Mono Account Link</h2>
                    <div style={{ color: '#475569', fontSize: '0.86rem' }}>{statusMeta.description}</div>
                </div>
                <span
                    className="badge"
                    style={{
                        background: `${statusMeta.color}22`,
                        color: statusMeta.color,
                        fontWeight: 700,
                    }}
                >
                    {statusMeta.label}
                </span>
            </div>

            {!hasUserEmail ? (
                <div className="alert-box alert-warning mt-3">
                    User email is missing. Add an email before sending Mono connect link.
                </div>
            ) : null}

            {feedbackMessage ? (
                <div className="alert-box alert-success mt-3">{feedbackMessage}</div>
            ) : null}
            {feedbackError ? (
                <div className="alert-box alert-error mt-3">{feedbackError}</div>
            ) : null}

            <div className="info-grid mt-3">
                <div className="info-group">
                    <div className="info-label">Account ID</div>
                    <div className="info-value font-mono">{loan.monoAccountId || '—'}</div>
                </div>
                <div className="info-group">
                    <div className="info-label">Reference</div>
                    <div className="info-value font-mono">{loan.monoConnectReference || '—'}</div>
                </div>
                <div className="info-group">
                    <div className="info-label">Initiated At</div>
                    <div className="info-value">{formatDateTime(loan.monoConnectInitiatedAt)}</div>
                </div>
                <div className="info-group">
                    <div className="info-label">Email Sent At</div>
                    <div className="info-value">{formatDateTime(loan.monoConnectEmailSentAt)}</div>
                </div>
                <div className="info-group">
                    <div className="info-label">Linked At</div>
                    <div className="info-value">{formatDateTime(loan.monoLinkedAt)}</div>
                </div>
            </div>

            <div className="mt-3" style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
                <button
                    className="button button--primary"
                    onClick={onInitiate}
                    disabled={!hasUserEmail || initiating}
                >
                    {initiating
                        ? 'Sending link...'
                        : statusKey === 'pending'
                            ? 'Resend Connect Link'
                            : statusKey === 'linked'
                                ? 'Send Reconnect Link'
                                : 'Send Connect Link'}
                </button>
                <button
                    className="button button--secondary"
                    onClick={onRefresh}
                    disabled={refreshing}
                >
                    {refreshing ? 'Refreshing...' : 'Refresh Status'}
                </button>
                <button
                    className="button button--secondary"
                    onClick={() => navigate(`/admin/applications/${loan.id || loan._id}/informed-decision`)}
                    disabled={!loan.monoAccountId}
                >
                    Informed Decision
                </button>
            </div>

            {statusKey === 'linked' ? (
                <div className="mt-4" style={{ borderTop: '1px solid #e2e8f0', paddingTop: 12 }}>
                    <h3 style={{ margin: '0 0 8px 0' }}>Linked Account Details</h3>
                    <div className="info-grid">
                        <div className="info-group">
                            <div className="info-label">Account Name</div>
                            <div className="info-value">{incomeProfile.accountName || '—'}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">Account Number</div>
                            <div className="info-value">{incomeProfile.accountNumber || '—'}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">Employer</div>
                            <div className="info-value">{incomeProfile.employer || '—'}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">Monthly Income</div>
                            <div className="info-value">
                                {typeof incomeProfile.monthlyIncome === 'number'
                                    ? `₦${incomeProfile.monthlyIncome.toLocaleString()}`
                                    : '—'}
                            </div>
                        </div>
                    </div>
                </div>
            ) : null}
        </div>
    )
}
