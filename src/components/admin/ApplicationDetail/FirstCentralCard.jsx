import { useEffect, useState } from 'react'
import { firstCentralService } from '../../../services/firstCentralService'

const SCORE_COLOR = (score) => {
  if (score == null) return '#64748b'
  if (score >= 700) return '#10b981'
  if (score >= 580) return '#f59e0b'
  return '#ef4444'
}

const SCORE_LABEL = (score) => {
  if (score == null) return '—'
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

export default function FirstCentralCard({ loan, onUpdated, storedResult, storedCheckedAt }) {
  const stored = storedResult || loan.firstCentralResult || null
  const [result, setResult] = useState(stored)
  const [checkedAt, setCheckedAt] = useState(storedCheckedAt || loan.firstCentralCheckedAt || null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [lookupType, setLookupType] = useState(() =>
    loan.bvn || loan.applicantBvn ? 'bvn' : 'phone',
  )

  const bvn = loan.bvn || loan.applicantBvn || ''
  const phone = loan.phone || loan.applicantPhone || ''
  const hasSelectedIdentifier = lookupType === 'phone' ? Boolean(phone) : Boolean(bvn)

  useEffect(() => {
    setResult(storedResult || loan.firstCentralResult || null)
    setCheckedAt(storedCheckedAt || loan.firstCentralCheckedAt || null)
  }, [loan.firstCentralCheckedAt, loan.firstCentralResult, storedCheckedAt, storedResult])

  const runCheck = async () => {
    if (!hasSelectedIdentifier) {
      setError(`No ${lookupType === 'phone' ? 'phone number' : 'BVN'} found on this application — cannot run bureau check.`)
      return
    }
    setLoading(true)
    setError('')
    try {
      const data = await firstCentralService.runCreditCheck(loan.id, bvn, lookupType, phone)
      setResult(data)
      setCheckedAt(data.enquiryDate || new Date().toISOString())
      onUpdated?.()
    } catch (err) {
      setError(err.message || 'Bureau check failed — please try again.')
    } finally {
      setLoading(false)
    }
  }

  const fmt = (v) => v != null ? v.toLocaleString() : '—'
  const fmtDate = (v) => v ? new Date(v).toLocaleString('en-NG') : '—'
  const rating = result?.riskBand
  const displayRating = rating != null && Number.isNaN(Number(rating)) ? rating : '—'

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
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexWrap: 'wrap', justifyContent: 'flex-end' }}>
          <label htmlFor={`first-central-lookup-${loan.id}`} style={{ fontSize: '0.75rem', color: '#64748b', fontWeight: 600 }}>
            Search using
          </label>
          <select
            id={`first-central-lookup-${loan.id}`}
            value={lookupType}
            onChange={(event) => setLookupType(event.target.value)}
            disabled={loading}
            style={{ padding: '8px 10px', border: '1px solid #cbd5e1', borderRadius: '8px', background: '#fff', color: '#334155', fontWeight: 600 }}
          >
            <option value="bvn" disabled={!bvn}>BVN</option>
            <option value="phone" disabled={!phone}>Phone number</option>
          </select>
          <button
            onClick={runCheck}
            disabled={loading || !hasSelectedIdentifier}
            style={{
            padding: '8px 18px',
            borderRadius: '8px',
            background: loading ? '#e0e7ff' : '#6366f1',
            color: loading ? '#6366f1' : '#fff',
            border: 'none',
            fontWeight: 700,
            fontSize: '0.8rem',
            cursor: loading || !hasSelectedIdentifier ? 'not-allowed' : 'pointer',
            whiteSpace: 'nowrap',
            }}
          >
            {loading ? 'Checking…' : result ? 'Re-run Check' : 'Run Credit Check'}
          </button>
        </div>
      </div>

      {lookupType === 'phone' && phone && (
        <p style={{ margin: '-6px 0 12px', color: '#64748b', fontSize: '0.75rem' }}>
          BVN is the more unique search. Phone lookup will stop if FirstCentral returns multiple consumers.
        </p>
      )}

      {lookupType === 'bvn' && !bvn && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef9c3', color: '#a16207', fontSize: '0.8rem', fontWeight: 600 }}>
          BVN not found on this application. Ask the applicant to provide their BVN before running a bureau check.
        </div>
      )}

      {lookupType === 'phone' && !phone && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef9c3', color: '#a16207', fontSize: '0.8rem', fontWeight: 600 }}>
          Phone number not found on this application. Add the applicant’s phone number before running a phone match.
        </div>
      )}

      {error && (
        <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fef2f2', color: '#dc2626', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
          {error}
        </div>
      )}

      {result && (
        <>
          {result.reportStatus === 'no_facilities' && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#eff6ff', color: '#1d4ed8', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
              FirstCentral returned a report, but it lists no credit facilities. This is different from a report with active credit history.
            </div>
          )}
          {result.reportStatus === 'unrecognized' && (
            <div style={{ padding: '10px 12px', borderRadius: '8px', background: '#fff7ed', color: '#c2410c', fontSize: '0.8rem', fontWeight: 600, marginBottom: '12px' }}>
              The consumer match succeeded, but the report contained no fields this app recognizes. Treat this as an incomplete bureau response, not a confirmed clean credit file.
            </div>
          )}

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
                Repayment rating: <strong>{displayRating}</strong>
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
            <InfoRow label="Lookup Method" value={result.lookupType === 'phone' ? 'Phone number' : 'BVN'} />
            <InfoRow label="Consumer ID" value={result.consumerID || '—'} />
          </div>

          {result._isMock && (
            <div style={{ marginTop: '12px', padding: '8px 12px', background: '#fef9c3', borderRadius: '7px', fontSize: '0.72rem', color: '#a16207', fontWeight: 600 }}>
              ⚠ This is UAT mock data. Connect backend to fetch live bureau results.
            </div>
          )}
        </>
      )}

      {!result && !loading && !error && hasSelectedIdentifier && (
        <div style={{ textAlign: 'center', padding: '20px 0', color: '#94a3b8', fontSize: '0.85rem' }}>
          No bureau check run yet. Select BVN or phone number and click <strong>Run Credit Check</strong> to query FirstCentral.
        </div>
      )}
    </div>
  )
}
