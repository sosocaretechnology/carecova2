import { useState } from 'react'
import { adminService } from '../../../services/adminService'

const STATUS_META = {
  not_started: {
    label: 'Not linked',
    color: '#64748b',
    description: 'No bank account linked yet. Send the connect link to the applicant.',
  },
  pending: {
    label: 'Awaiting applicant',
    color: '#f59e0b',
    description: 'Connect link sent. Waiting for the applicant to complete bank linking.',
  },
  linked: {
    label: 'Linked',
    color: '#10b981',
    description: 'Bank account is linked. You can now fetch the statement.',
  },
}

const fmt = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  return Number.isNaN(d.getTime()) ? '—' : d.toLocaleString()
}

export default function MonoConnectionCard({
  loan,
  initiating = false,
  refreshing = false,
  onInitiate,
  onRefresh,
  feedbackMessage = '',
  feedbackError = '',
  onStatementFetched,
}) {
  const [fetching, setFetching] = useState(false)
  const [fetchResult, setFetchResult] = useState(null)
  const [fetchError, setFetchError] = useState('')
  const [statementPeriod, setStatementPeriod] = useState('last6months')
  const [downloading, setDownloading] = useState('')
  const [downloadError, setDownloadError] = useState('')

  const statusKey = loan.monoConnectionStatus || 'not_started'
  const meta = STATUS_META[statusKey] || STATUS_META.not_started
  const hasEmail = Boolean(loan.email)

  const transactionCache = loan.monoInformedDecisionCache?.sections?.transactions
  const alreadyFetched = Boolean(transactionCache)
  const txCount = transactionCache?.count ?? null

  const handleFetchStatement = async () => {
    setFetching(true)
    setFetchError('')
    setFetchResult(null)
    try {
      const res = await adminService.fetchMonoStatementForLoan(loan.id)
      setFetchResult(res)
      if (onStatementFetched) onStatementFetched()
    } catch (err) {
      setFetchError(err.message || 'Failed to fetch bank statement')
    } finally {
      setFetching(false)
    }
  }

  const handleDownload = async (format) => {
    setDownloading(format)
    setDownloadError('')
    try {
      const file = format === 'pdf'
        ? await adminService.downloadMonoStatementPdf(loan.id, statementPeriod)
        : await adminService.downloadMonoTransactionsCsv(loan.id)
      const objectUrl = window.URL.createObjectURL(file.blob)
      const link = document.createElement('a')
      link.href = objectUrl
      link.download = file.filename || `carecova-mono-statement.${format}`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      setDownloadError(err.message || `Failed to download ${format.toUpperCase()} statement`)
    } finally {
      setDownloading('')
    }
  }

  return (
    <div className="detail-card" style={{ borderLeft: `4px solid ${meta.color}` }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
        <div>
          <h2 style={{ marginBottom: '4px' }}>Bank Account Link</h2>
          <div style={{ color: '#475569', fontSize: '0.86rem' }}>{meta.description}</div>
        </div>
        <span style={{
          background: `${meta.color}22`, color: meta.color,
          fontWeight: 700, padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', whiteSpace: 'nowrap',
        }}>
          {meta.label}
        </span>
      </div>

      {!hasEmail && (
        <div className="alert-box alert-warning mt-3">
          User email is missing — add an email before sending the connect link.
        </div>
      )}
      {feedbackMessage && <div className="alert-box alert-success mt-3">{feedbackMessage}</div>}
      {feedbackError && <div className="alert-box alert-error mt-3">{feedbackError}</div>}

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
          <div className="info-label">Link Sent</div>
          <div className="info-value">{fmt(loan.monoConnectEmailSentAt)}</div>
        </div>
        <div className="info-group">
          <div className="info-label">Linked At</div>
          <div className="info-value">{fmt(loan.monoLinkedAt)}</div>
        </div>
      </div>

      {/* Linked account details */}
      {statusKey === 'linked' && loan.monoIncomeProfile && (
        <div style={{ marginTop: '12px', borderTop: '1px solid #e2e8f0', paddingTop: '12px' }}>
          <div className="info-grid">
            <div className="info-group">
              <div className="info-label">Account Name</div>
              <div className="info-value">{loan.monoIncomeProfile.accountName || '—'}</div>
            </div>
            <div className="info-group">
              <div className="info-label">Account Number</div>
              <div className="info-value">{loan.monoIncomeProfile.accountNumber || '—'}</div>
            </div>
          </div>
        </div>
      )}

      {/* Action buttons */}
      <div style={{ display: 'flex', gap: '8px', flexWrap: 'wrap', marginTop: '16px' }}>
        <button
          className="button button--primary"
          onClick={onInitiate}
          disabled={!hasEmail || initiating}
        >
          {initiating
            ? 'Sending…'
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
          {refreshing ? 'Refreshing…' : 'Refresh Status'}
        </button>
      </div>

      {/* Fetch Bank Statement — always visible, disabled until linked */}
      <div style={{ marginTop: '16px', paddingTop: '16px', borderTop: '1px solid #e2e8f0', opacity: statusKey !== 'linked' ? 0.5 : 1 }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '8px' }}>
          <div>
            <div style={{ fontSize: '0.875rem', fontWeight: 600, color: '#111827' }}>Bank Statement</div>
            {statusKey !== 'linked' ? (
              <div style={{ fontSize: '0.8rem', color: '#9ca3af', marginTop: '2px' }}>
                Send Connect Link first, wait for applicant to link their bank
              </div>
            ) : alreadyFetched && txCount !== null ? (
              <div style={{ fontSize: '0.8rem', color: '#10b981', marginTop: '2px' }}>
                Fetched — {txCount} transactions
              </div>
            ) : alreadyFetched ? (
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                Previously fetched
              </div>
            ) : (
              <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                Ready to fetch — account is linked
              </div>
            )}
          </div>
          {(() => {
            const isLinked = statusKey === 'linked'
            return (
            <button
              onClick={handleFetchStatement}
              disabled={fetching || !isLinked}
              style={{
                padding: '7px 14px', borderRadius: '7px', border: '1.5px solid',
                borderColor: !isLinked ? '#e5e7eb' : alreadyFetched ? '#d1d5db' : '#2563eb',
                background: alreadyFetched ? '#f9fafb' : '#eff6ff',
                color: alreadyFetched ? '#6b7280' : '#1d4ed8',
                fontWeight: 600, fontSize: '0.8125rem',
                cursor: fetching ? 'not-allowed' : 'pointer',
              }}
            >
              {fetching ? 'Fetching…' : alreadyFetched ? 'Re-fetch Statement' : 'Fetch Bank Statement'}
            </button>
            )
          })()}
        </div>
        {fetchResult && (
          <div className="alert-box alert-success" style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
            Statement fetched — {fetchResult.count ?? '?'} transactions retrieved
          </div>
        )}
        {fetchError && (
          <div className="alert-box alert-error" style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
            {fetchError}
          </div>
        )}
        {statusKey === 'linked' && (
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', marginTop: '10px' }}>
            <label htmlFor={`mono-statement-period-${loan.id}`} style={{ fontSize: '0.8125rem', color: '#475569' }}>
              PDF period
            </label>
            <select
              id={`mono-statement-period-${loan.id}`}
              value={statementPeriod}
              onChange={(event) => setStatementPeriod(event.target.value)}
              disabled={Boolean(downloading)}
              style={{ padding: '7px 9px', border: '1px solid #cbd5e1', borderRadius: '7px', background: '#fff' }}
            >
              <option value="last1month">Last month</option>
              <option value="last3months">Last 3 months</option>
              <option value="last6months">Last 6 months</option>
              <option value="last12months">Last 12 months</option>
            </select>
            <button
              className="button button--secondary"
              onClick={() => handleDownload('pdf')}
              disabled={Boolean(downloading)}
            >
              {downloading === 'pdf' ? 'Preparing PDF…' : 'Download Mono PDF'}
            </button>
            <button
              className="button button--secondary"
              onClick={() => handleDownload('csv')}
              disabled={Boolean(downloading)}
            >
              {downloading === 'csv' ? 'Preparing CSV…' : 'Export transactions CSV'}
            </button>
          </div>
        )}
        {downloadError && (
          <div className="alert-box alert-error" style={{ marginTop: '8px', fontSize: '0.8125rem' }}>
            {downloadError}
          </div>
        )}
      </div>

    </div>
  )
}
