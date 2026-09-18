import { useState } from 'react'
import { firstCentralService } from '../../../services/firstCentralService'

const SCORE_COLOR = (score) => {
  if (!score) return '#64748b'
  if (score >= 700) return '#10b981'
  if (score >= 580) return '#f59e0b'
  return '#ef4444'
}

const SCORE_LABEL = (score) => {
  if (!score) return '—'
  if (score >= 700) return 'Good'
  if (score >= 580) return 'Fair'
  return 'Poor'
}

function InfoRow({ label, value, highlight }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', padding: '7px 0', borderBottom: '1px solid #f1f5f9' }}>
      <span style={{ fontSize: '0.8rem', color: '#64748b', fontWeight: 500 }}>{label}</span>
      <span style={{ fontSize: '0.8rem', fontWeight: 700, color: highlight || '#1e293b' }}>{value}</span>
    </div>
  )
}

export default function FirstCentralCard({ loan, onUpdated }) {
  const stored = loan.firstCentralResult || null
  const [result, setResult] = useState(stored)
  const [checkedAt, setCheckedAt] = useState(loan.firstCentralCheckedAt || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const bvn = loan.bvn || loan.applicantBvn || ''

  const runCheck = async () => {
    if (!bvn) { setError('No BVN found on this application — cannot run bureau check.'); return }
    setLoading(true)
    setError('')
    try {
      const data = await firstCentralService.runCreditCheck(loan.id, bvn)
      firstCentralService.saveResultLocally(loan.id, data)
      setResult(data)
      setCheckedAt(new Date().toISOString())
      onUpdated?.()
    } catch (err) {
      setError(err.message || 'Bureau check failed — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (v) => v != null ? v.toLocaleString() : '—'
  const fmtDate = (v) => v ? new Date(v).toLocaleString('en-NG') : '—'

  return (
    <div className="detail-card" style={{ borderLeft: '4px solid #6366f1' }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', marginBottom: '16px' }}>
        <div>
          <h2 style={{ margin: 0 }}>FirstCentral Credit Bureau</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.8rem', color: '#64748b' }}>
            {result
              ? `Last checked: ${fmtDate(checkedAt)}${result._isMock ? ' · UAT mock data' : ''}`
              : 'Credit history, active loans, and iScore from FirstCentral.'}
          </p>
        </div>
        <button
          onClick={runCheck}
          disabled={loading || !bvn}
          style={{
            padding: '8px 18px',
            borderRadius: '8px',
            background: loading ? '#e0e7ff' : '#6366f1',
            color: loading ? '#6366f1' : '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: loading || !bvn ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
          }}
        >
          {loading ? 'Checking…' : result ? 'Re-run Check' : 'Run Credit Check'}
        </button>
      </div>

      {!bvn && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef9c3', color: '#a16207', fontSize: '0.8rem', fontWeight: 600 }}>
          BVN not found on this application. Ask the applicant to provide their BVN before running a bureau check.
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {/* iScore banner */}
          <div style={{ display: 'flex', alignItems: 'center', gap: '20px', background: '#f8faff', borderRadius: '10px', padding: '16px 20px', marginBottom: '16px', border: '1px solid #e0e7ff' }}>
            <div style={{ textAlign: 'center' }}>
              <div style={{ fontSize: '2.5rem', fontWeight: 900, color: SCORE_COLOR(result.iScore), lineHeight: 1 }}>
                {result.iScore ?? '—'}
              </div>
              <div style={{ fontSize: '0.7rem', fontWeight: 700, color: '#64748b', textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>iScore</div>
            </div>
            <div style={{ flex: 1 }}>
              <div style={{ fontWeight: 800, fontSize: '1rem', color: SCORE_COLOR(result.iScore) }}>
                {SCORE_LABEL(result.iScore)}
              </div>
              <div style={{ fontSize: '0.78rem', color: '#64748b', marginTop: '2px' }}>
                Risk Band: <strong>{result.riskBand || '—'}</strong>
              </div>
              <div style={{ marginTop: '8px', height: '6px', borderRadius: '99px', background: '#e2e8f0', overflow: 'hidden' }}>
                <div style={{ height: '100%', width: `${Math.min(((result.iScore || 0) / 850) * 100, 100)}%`, background: SCORE_COLOR(result.iScore), borderRadius: '99px', transition: 'width 0.6s ease' }} />
              </div>
              <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.65rem', color: '#94a3b8', marginTop: '2px' }}>
                <span>300</span><span>850</span>
              </div>
            </div>
          </div>

          {/* Credit summary */}
          <div>
            <InfoRow label="Total Facilities" value={fmt(result.totalFacilities)} />
            <InfoRow label="Performing" value={fmt(result.performingFacilities)} highlight="#10b981" />
            <InfoRow
              label="Non-Performing"
              value={fmt(result.nonPerformingFacilities)}
              highlight={result.nonPerformingFacilities > 0 ? '#ef4444' : undefined}
            />
            <InfoRow label="Total Outstanding" value={result.totalOutstanding != null ? `₦${fmt(result.totalOutstanding)}` : '—'} />
            <InfoRow
              label="Total Overdue"
              value={result.totalOverdue != null ? `₦${fmt(result.totalOverdue)}` : '—'}
              highlight={result.totalOverdue > 0 ? '#ef4444' : '#10b981'}
            />
            <InfoRow label="BVN Checked" value={result.bvn || '—'} />
            <InfoRow label="Consumer ID" value={result.consumerID || '—'} />
          </div>

          {result._isMock && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef9c3', borderRadius: '7px', fontSize: '0.72rem', color: '#a16207', fontWeight: 600 }}>
              ⚠ This is UAT mock data. Connect backend to fetch live bureau results.
            </div>
          )}
        </>
      )}

      {!result && !loading && !error && bvn && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          No bureau check run yet. Click <strong>Run Credit Check</strong> to query FirstCentral using the applicant's BVN.
        </div>
      )}
    </div>
  )
}
