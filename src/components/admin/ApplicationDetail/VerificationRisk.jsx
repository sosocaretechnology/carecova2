import { useState } from 'react'
import { useAuth } from '../../../hooks/useAuth'
import { adminService } from '../../../services/adminService'
import MonoConnectionCard from './MonoConnectionCard'

export default function VerificationRisk({
  loan,
  onInitiateMonoConnect,
  onRefreshMonoStatus,
  monoInitiating = false,
  monoRefreshing = false,
  monoFeedbackMessage = '',
  monoFeedbackError = '',
  onUpdated,
}) {
  const { session } = useAuth()
  const [bvnVerifying, setBvnVerifying] = useState(false)
  const [bvnError, setBvnError]         = useState('')
  const [ninVerifying, setNinVerifying] = useState(false)
  const [ninResultLocal, setNinResultLocal] = useState(null)
  const [ninError, setNinError]         = useState('')

  const { affordability } = loan
  const internalMetrics = loan.internalRiskMetrics || loan.affordability || {}
  const dtiPct = internalMetrics.affordabilityRatio
    ? Math.round(internalMetrics.affordabilityRatio * 100)
    : affordability?.installmentToIncomePct || 0
  const sector = loan.employmentSector || loan.employmentType
  const isGov = sector === 'government'
  const isPrivate = sector === 'private'

  // ── BVN result (persisted on loan) ──────────────────────────────────────
  const bvnResult     = loan.bvnVerification
  const bvnVerifiedAt = bvnResult?.verifiedAt
  const bvnData       = bvnResult?.data || {}
  const bvnFullName   = [bvnData.first_name, bvnData.middle_name, bvnData.last_name].filter(Boolean).join(' ') || null
  const bvnDob        = bvnData.date_of_birth || bvnData.dob || null
  const bvnPhone      = bvnData.phone_number || bvnData.phone || null

  // ── NIN result (persisted on loan OR from this session) ─────────────────
  const ninResult     = ninResultLocal || loan.ninVerification
  const ninVerifiedAt = ninResult?.verifiedAt
  const ninData       = ninResult?.data || {}
  const ninFullName   = [ninData.first_name, ninData.middle_name, ninData.last_name].filter(Boolean).join(' ') || null
  const ninDob        = ninData.date_of_birth || ninData.dob || null
  const ninPhone      = ninData.phone_number || ninData.phone || null

  const hasEither   = !!(loan.bvn || loan.nin)
  const anyVerified = !!(bvnResult || ninResult)
  const verifying   = bvnVerifying || ninVerifying

  // ── Fire BVN + NIN in parallel ──────────────────────────────────────────
  const handleVerifyIdentity = () => {
    if (loan.bvn) {
      setBvnVerifying(true)
      setBvnError('')
      adminService.verifyBvnForLoan(loan.id)
        .then(updated => { if (onUpdated) onUpdated(updated) })
        .catch(err => {
          const raw = err.message || ''
          setBvnError(
            /not available for your business|contact support/i.test(raw)
              ? 'BVN lookup is not yet enabled on your Mono account. Go to Mono dashboard → Services and activate "BVN Lookup".'
              : raw || 'BVN verification failed'
          )
        })
        .finally(() => setBvnVerifying(false))
    }
    if (loan.nin) {
      setNinVerifying(true)
      setNinError('')
      adminService.verifyNinForLoan(loan.id)
        .then(updated => {
          setNinResultLocal(updated?.ninVerification || null)
          if (onUpdated) onUpdated(updated)
        })
        .catch(err => setNinError(err.message || 'NIN verification failed'))
        .finally(() => setNinVerifying(false))
    }
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>

      {/* ── Identity Verification (BVN via Mono + NIN via Dojah — parallel) ── */}
      <div className="detail-card" style={{ borderLeft: '4px solid #6366f1' }}>
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: '12px' }}>
          <div>
            <h2 style={{ marginBottom: '4px' }}>Identity Verification</h2>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', display: 'flex', gap: '16px', flexWrap: 'wrap' }}>
              <span>BVN: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>{loan.bvn || '—'}</strong></span>
              <span>NIN: <strong style={{ color: '#111827', fontFamily: 'monospace' }}>{loan.nin || '—'}</strong></span>
            </div>
          </div>
          {anyVerified ? (
            <span style={{ background: '#dcfce7', color: '#166534', fontWeight: 700, padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              Verified
            </span>
          ) : (
            <span style={{ background: '#f1f5f9', color: '#64748b', fontWeight: 600, padding: '3px 10px', borderRadius: '12px', fontSize: '0.8rem', whiteSpace: 'nowrap' }}>
              Not verified
            </span>
          )}
        </div>

        {/* BVN result */}
        {bvnResult && (
          <div style={{ marginTop: '10px', padding: '12px', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.8125rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1 / -1', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: 2 }}>BVN — Mono</div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Full Name</div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{bvnFullName || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>BVN</div>
              <div style={{ fontFamily: 'monospace', color: '#111827' }}>{bvnData.bvn || loan.bvn || '—'}</div>
            </div>
            {bvnDob && (
              <div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Date of Birth</div>
                <div style={{ color: '#111827' }}>{bvnDob}</div>
              </div>
            )}
            {bvnPhone && (
              <div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Phone</div>
                <div style={{ color: '#111827' }}>{bvnPhone}</div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #bbf7d0', paddingTop: '8px', color: '#6b7280', fontSize: '0.75rem' }}>
              Verified at {bvnVerifiedAt ? new Date(bvnVerifiedAt).toLocaleString() : '—'}
            </div>
          </div>
        )}
        {bvnError && (
          <div className="alert-box alert-error" style={{ marginTop: '10px', fontSize: '0.8125rem' }}>
            <strong>BVN:</strong> {bvnError}
          </div>
        )}

        {/* NIN result */}
        {ninResult && (
          <div style={{ marginTop: '10px', padding: '12px', background: '#f0f9ff', borderRadius: '8px', fontSize: '0.8125rem', display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px' }}>
            <div style={{ gridColumn: '1 / -1', fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', color: '#6b7280', letterSpacing: '0.05em', marginBottom: 2 }}>NIN — Dojah</div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Full Name</div>
              <div style={{ fontWeight: 700, color: '#111827' }}>{ninFullName || '—'}</div>
            </div>
            <div>
              <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>NIN</div>
              <div style={{ fontFamily: 'monospace', color: '#111827' }}>{ninData.nin || loan.nin || '—'}</div>
            </div>
            {ninDob && (
              <div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Date of Birth</div>
                <div style={{ color: '#111827' }}>{ninDob}</div>
              </div>
            )}
            {ninPhone && (
              <div>
                <div style={{ fontSize: '0.7rem', color: '#6b7280', textTransform: 'uppercase', fontWeight: 600, marginBottom: '2px' }}>Phone</div>
                <div style={{ color: '#111827' }}>{ninPhone}</div>
              </div>
            )}
            <div style={{ gridColumn: '1 / -1', borderTop: '1px solid #bae6fd', paddingTop: '8px', color: '#6b7280', fontSize: '0.75rem' }}>
              Verified at {ninVerifiedAt ? new Date(ninVerifiedAt).toLocaleString() : '—'}
            </div>
          </div>
        )}
        {ninError && (
          <div className="alert-box alert-error" style={{ marginTop: '10px', fontSize: '0.8125rem' }}>
            <strong>NIN:</strong> {ninError}
          </div>
        )}

        <div style={{ marginTop: '12px' }}>
          <button
            onClick={handleVerifyIdentity}
            disabled={verifying || !hasEither}
            style={{
              padding: '7px 16px', borderRadius: '7px', border: '1.5px solid',
              borderColor: hasEither ? '#6366f1' : '#d1d5db',
              background: hasEither ? '#eef2ff' : '#f9fafb',
              color: hasEither ? '#4338ca' : '#9ca3af',
              fontWeight: 600, fontSize: '0.8125rem',
              cursor: (verifying || !hasEither) ? 'not-allowed' : 'pointer',
            }}
          >
            {verifying ? 'Verifying…' : anyVerified ? 'Re-verify Identity' : 'Verify Identity'}
            {hasEither && <span style={{ fontWeight: 400, marginLeft: '6px', color: '#9ca3af', fontSize: '0.75rem' }}>BVN + NIN</span>}
          </button>
          {!hasEither && (
            <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: '4px' }}>
              Add a BVN or NIN to the applicant identity card first
            </div>
          )}
        </div>
      </div>

      {/* ── Mono Connect (bank account — independent of BVN) ── */}
      {session?.role !== 'sales' && (
        <MonoConnectionCard
          loan={loan}
          initiating={monoInitiating}
          refreshing={monoRefreshing}
          onInitiate={onInitiateMonoConnect}
          onRefresh={onRefreshMonoStatus}
          feedbackMessage={monoFeedbackMessage}
          feedbackError={monoFeedbackError}
          onStatementFetched={onUpdated ? () => onUpdated(null) : undefined}
        />
      )}

      {/* ── Repayment Security ── */}
      <div className="detail-card">
        <h2>Repayment Security</h2>
        <div style={{ display: 'flex', gap: '16px', alignItems: 'center', margin: '10px 0', flexWrap: 'wrap' }}>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Sector</div>
            <div style={{ fontWeight: 700, textTransform: 'capitalize' }}>{sector || 'Unknown'}</div>
          </div>
          <div style={{ color: '#9ca3af' }}>→</div>
          <div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>Primary Route</div>
            <div style={{ fontWeight: 700, color: '#2563eb' }}>
              {isGov ? 'Salary Deduction' : isPrivate ? 'Bank Direct Debit' : 'Card / Direct Debit'}
            </div>
          </div>
        </div>
        <div style={{ background: '#f8fafc', padding: '8px 12px', borderRadius: '6px', fontSize: '0.8125rem', marginBottom: '10px' }}>
          {isGov
            ? 'Salary deduction is primary; no collateral required.'
            : isPrivate
              ? 'Bank debit is primary; co-borrower recommended for higher risk.'
              : 'Bank debit/card primary; collateral or guarantor strictly required.'}
        </div>
        <div style={{ fontSize: '0.8rem', color: '#6b7280' }}>
          Requested method: <span style={{ textTransform: 'capitalize', color: '#374151', fontWeight: 600 }}>{loan.repaymentMethod?.replace('_', ' ') || 'Unknown'}</span>
        </div>
        <div style={{ display: 'flex', gap: '8px', marginTop: '10px', flexWrap: 'wrap' }}>
          <span className={`badge ${loan.coBorrower ? 'badge-success' : 'badge-neutral'}`}>
            {loan.coBorrower ? '✓ Co-borrower' : 'No co-borrower'}
          </span>
          <span className="badge badge-neutral">No collateral</span>
        </div>
      </div>

      {/* ── Affordability Assessment ── */}
      <div className="detail-card">
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
          <h2>Affordability Assessment</h2>
          <span className={`affordability-tag ${internalMetrics.riskLevel === 'HIGH' ? 'tight' : internalMetrics.riskLevel === 'MEDIUM' ? 'fair' : 'comfortable'}`}>
            {internalMetrics.riskLevel || 'Unknown'}
          </span>
        </div>
        <div style={{ marginTop: '12px' }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
            <span>Installment to income (DTI)</span>
            <strong>{dtiPct}%</strong>
          </div>
          <div className="progress-bar">
            <div
              className={`progress-fill ${dtiPct > 35 ? 'danger' : dtiPct > 20 ? 'warning' : 'success'}`}
              style={{ width: `${Math.min(100, dtiPct)}%` }}
            />
          </div>
          <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
            Est. ₦{(internalMetrics.estimatedInstallment || 0).toLocaleString()}/mo vs ₦{(loan.monthlyIncome || 0).toLocaleString()} stated income
          </div>
        </div>

        {loan.monthlyIncome ? (
          <div style={{ marginTop: '12px' }}>
            <div style={{ display: 'flex', justifyContent: 'space-between', fontSize: '0.8125rem', marginBottom: '4px' }}>
              <span>Expense to income</span>
              <strong>{Math.round(((loan.monthlyExpenses || 0) / loan.monthlyIncome) * 100)}%</strong>
            </div>
            <div className="progress-bar">
              <div
                className={`progress-fill ${((loan.monthlyExpenses || 0) / loan.monthlyIncome) > 0.8 ? 'danger' : ((loan.monthlyExpenses || 0) / loan.monthlyIncome) > 0.6 ? 'warning' : 'success'}`}
                style={{ width: `${Math.min(100, ((loan.monthlyExpenses || 0) / loan.monthlyIncome) * 100)}%` }}
              />
            </div>
            <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '4px' }}>
              Stated expenses: ₦{(loan.monthlyExpenses || 0).toLocaleString()}
            </div>
          </div>
        ) : null}
      </div>

      {/* ── Internal Risk Flags ── */}
      <div className="detail-card">
        <h2>Internal Risk Flags</h2>
        {(!internalMetrics.riskReasons || internalMetrics.riskReasons.length === 0) ? (
          <div style={{ color: '#059669', fontWeight: 600, fontSize: '0.875rem', display: 'flex', gap: '6px', alignItems: 'center' }}>
            <span>✓</span> No internal risk flags triggered
          </div>
        ) : (
          <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
            {internalMetrics.riskReasons.map((flag, idx) => (
              <div key={idx} className={`alert-box alert-${internalMetrics.riskLevel === 'HIGH' ? 'error' : 'warning'}`}>
                {internalMetrics.riskLevel === 'HIGH' ? '⚠️' : 'ℹ️'} {flag}
              </div>
            ))}
          </div>
        )}
      </div>

    </div>
  )
}
