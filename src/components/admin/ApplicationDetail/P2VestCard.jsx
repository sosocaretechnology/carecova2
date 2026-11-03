import { useState, useEffect } from 'react'
import { Send, RefreshCw, CheckCircle, XCircle, Clock, AlertCircle, Building2, Banknote } from 'lucide-react'
import { adminService } from '../../../services/adminService'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function DecisionBadge({ status }) {
  const map = {
    approved: { bg: '#f0fdf4', color: '#16a34a', border: '#bbf7d0', label: 'Approved', icon: <CheckCircle size={13} /> },
    declined: { bg: '#fef2f2', color: '#dc2626', border: '#fecaca', label: 'Declined', icon: <XCircle size={13} /> },
    manual_review: { bg: '#fffbeb', color: '#d97706', border: '#fde68a', label: 'Manual Review', icon: <AlertCircle size={13} /> },
  }
  const s = map[status] || { bg: '#f9fafb', color: '#6b7280', border: '#e5e7eb', label: status || 'Unknown', icon: <Clock size={13} /> }
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: '4px', padding: '3px 10px', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600, background: s.bg, color: s.color, border: `1px solid ${s.border}` }}>
      {s.icon} {s.label}
    </span>
  )
}

function DisbursementBadge({ status }) {
  if (!status) return null
  const map = {
    confirmed: { bg: '#f0fdf4', color: '#16a34a', label: 'Disbursed' },
    failed: { bg: '#fef2f2', color: '#dc2626', label: 'Disbursement Failed' },
    pending: { bg: '#eff6ff', color: '#2563eb', label: 'Pending Disbursement' },
  }
  const s = map[status] || { bg: '#f9fafb', color: '#6b7280', label: status }
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: '999px', fontSize: '0.8125rem', fontWeight: 600, background: s.bg, color: s.color }}>
      {s.label}
    </span>
  )
}

function InfoRow({ label, value }) {
  return (
    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
      <span style={{ fontSize: '0.8125rem', color: '#6b7280', minWidth: '160px' }}>{label}</span>
      <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', textAlign: 'right' }}>{value ?? '—'}</span>
    </div>
  )
}

function parseP2VestError(message) {
  const lower = String(message || '').toLowerCase()
  if (lower.includes('guarantor')) {
    return {
      title: 'Guarantor is required',
      suggestion: 'P2Vest requires a guarantor for this application. Enter the guarantor\'s full name, phone, email and 11-digit BVN below, then re-submit.',
    }
  }
  if (lower.includes('bvn') || lower.includes('customer.bvn')) {
    return {
      title: 'BVN is required',
      suggestion: 'Collect the patient\'s 11-digit BVN, then update it in the Informed Decision panel before re-submitting.',
    }
  }
  if (lower.includes('bank account details') || lower.includes('accountname') || lower.includes('accountnumber') || lower.includes('bankcode')) {
    return {
      title: 'Hospital bank details missing',
      suggestion: 'Update the linked hospital\'s bank account details (account name, account number, bank code) in Provider Management, then re-submit.',
    }
  }
  return null
}

export default function P2VestCard({ loan, onUpdated }) {
  const [submitting, setSubmitting] = useState(false)
  const [accepting, setAccepting] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [providers, setProviders] = useState([])
  const [selectedProvider, setSelectedProvider] = useState('')
  const [assigning, setAssigning] = useState(false)
  const [bvnInput, setBvnInput] = useState('')
  const [customerEmailOverride, setCustomerEmailOverride] = useState('')
  const [guarantorInput, setGuarantorInput] = useState({
    fullName: loan?.guarantor?.fullName || loan?.guarantorName || loan?.coBorrower?.name || '',
    phone:    loan?.guarantor?.phone    || loan?.guarantorPhone || loan?.coBorrower?.phone || '',
    email:    loan?.guarantor?.email    || loan?.guarantorEmail || loan?.coBorrower?.email || '',
    bvn:      loan?.guarantor?.bvn      || loan?.guarantorBvn   || loan?.coBorrower?.bvn   || '',
  })

  const decision = loan?.p2vestDecision
  const hasDecision = !!decision?.decisionStatus
  const hasRequestId = !!loan?.p2vestRequestId
  const isApproved = decision?.decisionStatus === 'approved'
  const isAccepted = !!loan?.p2vestLoanId
  const disbursementStatus = loan?.disbursementStatus
  const linkedProvider = loan?.providerName || loan?.provider?.name
  const hasVirtualAccount = !!loan?.p2vestVirtualAccountNumber

  useEffect(() => {
    adminService.getProviders().then(setProviders).catch(() => {})
  }, [])

  const handleSubmit = async () => {
    setError('')
    setSuccess('')
    setSubmitting(true)
    try {
      await adminService.submitP2VestReview(loan.id, bvnInput || undefined, guarantorInput, customerEmailOverride || undefined)
      setSuccess('Application submitted to P2Vest. The credit decision will appear here shortly.')
      setBvnInput('')
      setGuarantorInput({ fullName: '', phone: '', email: '', bvn: '' })
      onUpdated?.()
    } catch (err) {
      setError(err.message || 'Failed to submit to P2Vest')
    } finally {
      setSubmitting(false)
    }
  }

  const handleAccept = async () => {
    setError('')
    setSuccess('')
    setAccepting(true)
    try {
      await adminService.acceptP2VestLoanOffer(loan.id)
      setSuccess('Loan offer accepted. P2Vest will disburse funds to the hospital.')
      onUpdated?.()
    } catch (err) {
      setError(err.message || 'Failed to accept loan offer')
    } finally {
      setAccepting(false)
    }
  }

  const handleAssignProvider = async () => {
    if (!selectedProvider) return
    setAssigning(true)
    setError('')
    try {
      await adminService.assignProviderToLoan(loan.id, selectedProvider)
      setSuccess('Hospital linked successfully.')
      setSelectedProvider('')
      onUpdated?.()
    } catch (err) {
      setError(err.message || 'Failed to link hospital')
    } finally {
      setAssigning(false)
    }
  }

  return (
    <div className="detail-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '16px' }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>P2Vest Credit Review</h3>
          <p style={{ margin: '2px 0 0', fontSize: '0.8rem', color: '#9ca3af' }}>Powered by P2Vest credit decisioning</p>
        </div>
        {hasDecision && <DecisionBadge status={decision.decisionStatus} />}
      </div>

      {/* Hospital link section */}
      <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f8fafc', border: '1px solid #e2e8f0', marginBottom: '16px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '8px' }}>
          <Building2 size={14} color="#6b7280" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Linked Hospital</span>
        </div>
        {linkedProvider ? (
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#111827', fontWeight: 500 }}>{linkedProvider}</p>
        ) : (
          <div style={{ display: 'flex', gap: '8px', alignItems: 'center' }}>
            <select
              value={selectedProvider}
              onChange={(e) => setSelectedProvider(e.target.value)}
              style={{ flex: 1, padding: '7px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff' }}
            >
              <option value="">Select hospital to link…</option>
              {providers.map((p) => (
                <option key={p.id || p._id} value={p.id || p._id}>
                  {p.name}{p.accountNumber ? ' ✓ bank details' : ' ⚠ no bank details'}
                </option>
              ))}
            </select>
            <button
              onClick={handleAssignProvider}
              disabled={!selectedProvider || assigning}
              style={{ padding: '7px 14px', borderRadius: '7px', border: 'none', background: '#2563eb', color: '#fff', fontSize: '0.8125rem', fontWeight: 600, cursor: selectedProvider ? 'pointer' : 'not-allowed', opacity: !selectedProvider ? 0.5 : 1, whiteSpace: 'nowrap' }}
            >
              {assigning ? 'Linking…' : 'Link'}
            </button>
          </div>
        )}
        {!linkedProvider && (
          <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#d97706' }}>
            ⚠ The hospital must be linked and must have bank account details configured before submitting to P2Vest.
          </p>
        )}
      </div>

      {/* Submission status */}
      {!hasRequestId && (
        <div style={{ padding: '14px', borderRadius: '8px', background: '#f9fafb', border: '1px dashed #d1d5db', textAlign: 'center', marginBottom: '16px' }}>
          <Clock size={22} color="#9ca3af" style={{ marginBottom: '6px' }} />
          <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>Not yet submitted</p>
          <p style={{ margin: 0, fontSize: '0.8125rem', color: '#9ca3af' }}>Submit this application to P2Vest to receive a credit decision.</p>
        </div>
      )}

      {hasRequestId && !hasDecision && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          <Clock size={16} color="#2563eb" />
          <div>
            <p style={{ margin: 0, fontSize: '0.875rem', fontWeight: 600, color: '#1d4ed8' }}>Submitted — awaiting decision</p>
            <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#3b82f6' }}>Request ID: {loan.p2vestRequestId}</p>
          </div>
        </div>
      )}

      {/* Decision details */}
      {hasDecision && (
        <div style={{ marginBottom: '16px' }}>
          <InfoRow label="Decision Status" value={<DecisionBadge status={decision.decisionStatus} />} />
          <InfoRow label="Credit Score" value={decision.creditScore ?? '—'} />
          <InfoRow label="Risk Rating" value={decision.riskRating ?? '—'} />
          <InfoRow label="Recommended Amount" value={fmt(decision.recommendedLoanAmount)} />
          <InfoRow label="Recommended Tenure" value={decision.recommendedTenure ? `${decision.recommendedTenure} months` : '—'} />
          <InfoRow label="Affordability Score" value={decision.affordabilityScore != null ? `${(decision.affordabilityScore * 100).toFixed(0)}%` : '—'} />
          <InfoRow label="Confidence Score" value={decision.confidenceScore != null ? `${(decision.confidenceScore * 100).toFixed(0)}%` : '—'} />
          <InfoRow label="Verification" value={decision.verificationStatus ?? '—'} />
          <InfoRow label="P2Vest User ID" value={loan.p2vestUserId ?? '—'} />
          <InfoRow label="Decided At" value={fmtDate(decision.decidedAt)} />
          {decision.declineReasons?.length > 0 && (
            <div style={{ padding: '10px 14px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', marginTop: '8px' }}>
              <p style={{ margin: '0 0 6px', fontSize: '0.8125rem', fontWeight: 600, color: '#991b1b' }}>Decline Reasons</p>
              <ul style={{ margin: 0, paddingLeft: '16px' }}>
                {decision.declineReasons.map((r, i) => (
                  <li key={i} style={{ fontSize: '0.8125rem', color: '#dc2626', marginBottom: '2px' }}>{r}</li>
                ))}
              </ul>
            </div>
          )}
        </div>
      )}

      {/* Accept loan offer — shown when approved but not yet accepted */}
      {isApproved && !isAccepted && (
        <div style={{ padding: '14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
          <p style={{ margin: '0 0 4px', fontSize: '0.875rem', fontWeight: 600, color: '#15803d' }}>Ready to proceed</p>
          <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: '#166534' }}>
            P2Vest has approved this application. Accept the loan offer to instruct P2Vest to disburse funds directly to the hospital.
          </p>
          <button
            onClick={handleAccept}
            disabled={accepting}
            style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', borderRadius: '8px', border: 'none', background: accepting ? '#86efac' : 'linear-gradient(135deg,#16a34a,#15803d)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: accepting ? 'wait' : 'pointer' }}
          >
            {accepting ? <RefreshCw size={15} className="spin" /> : <CheckCircle size={15} />}
            {accepting ? 'Accepting…' : 'Accept Loan Offer & Trigger Disbursement'}
          </button>
        </div>
      )}

      {/* Accepted — show loan ID and virtual account */}
      {isAccepted && (
        <div style={{ padding: '12px 14px', borderRadius: '8px', background: '#f0fdf4', border: '1px solid #bbf7d0', marginBottom: '16px' }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '6px', marginBottom: '10px' }}>
            <CheckCircle size={15} color="#16a34a" />
            <span style={{ fontSize: '0.8125rem', fontWeight: 700, color: '#15803d' }}>Loan Offer Accepted</span>
          </div>
          <InfoRow label="P2Vest Loan ID" value={loan.p2vestLoanId} />
          {loan.p2vestAcceptedAt && <InfoRow label="Accepted At" value={fmtDate(loan.p2vestAcceptedAt)} />}

          {/* Virtual repayment account */}
          {hasVirtualAccount && (
            <div style={{ marginTop: '10px', padding: '10px 12px', borderRadius: '7px', background: '#eff6ff', border: '1px solid #bfdbfe' }}>
              <div style={{ display: 'flex', alignItems: 'center', gap: '5px', marginBottom: '6px' }}>
                <Banknote size={13} color="#2563eb" />
                <span style={{ fontSize: '0.75rem', fontWeight: 700, color: '#1d4ed8', textTransform: 'uppercase', letterSpacing: '0.5px' }}>Patient Repayment Account</span>
              </div>
              <p style={{ margin: '0 0 2px', fontSize: '0.875rem', fontWeight: 700, color: '#111827', letterSpacing: '1px' }}>{loan.p2vestVirtualAccountNumber}</p>
              <p style={{ margin: 0, fontSize: '0.8125rem', color: '#374151' }}>{loan.p2vestVirtualAccountName} · {loan.p2vestVirtualAccountBank}</p>
              <p style={{ margin: '6px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Share this account with the patient for loan repayments.</p>
            </div>
          )}
        </div>
      )}

      {/* Disbursement status from P2Vest lifecycle webhook */}
      {disbursementStatus && (
        <div style={{ padding: '10px 14px', borderRadius: '8px', background: disbursementStatus === 'confirmed' ? '#f0fdf4' : '#fef2f2', border: `1px solid ${disbursementStatus === 'confirmed' ? '#bbf7d0' : '#fecaca'}`, marginBottom: '16px', display: 'flex', alignItems: 'center', gap: '8px' }}>
          {disbursementStatus === 'confirmed' ? <CheckCircle size={16} color="#16a34a" /> : <XCircle size={16} color="#dc2626" />}
          <div>
            <DisbursementBadge status={disbursementStatus} />
            {loan.disbursementConfirmedAt && <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Confirmed: {fmtDate(loan.disbursementConfirmedAt)}</p>}
            {loan.disbursementFailedAt && <p style={{ margin: '2px 0 0', fontSize: '0.75rem', color: '#6b7280' }}>Failed: {fmtDate(loan.disbursementFailedAt)}</p>}
          </div>
        </div>
      )}

      {error && (() => {
        const parsed = parseP2VestError(error)
        const isBvnError = parsed?.title === 'BVN is required'
        return (
          <div style={{ padding: '10px 12px', borderRadius: '7px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.8125rem', color: '#dc2626', marginBottom: '12px' }}>
            {parsed ? (
              <>
                <p style={{ margin: '0 0 4px', fontWeight: 600 }}>{parsed.title}</p>
                <p style={{ margin: 0 }}>{error}</p>
                {isBvnError && (
                  <div style={{ marginTop: '10px' }}>
                    <p style={{ margin: '0 0 6px', fontSize: '0.75rem', color: '#991b1b', fontWeight: 600 }}>Enter the patient's BVN to re-submit:</p>
                    <div style={{ display: 'flex', gap: '6px' }}>
                      <input
                        type="text"
                        inputMode="numeric"
                        maxLength={11}
                        placeholder="11-digit BVN"
                        value={bvnInput}
                        onChange={(e) => setBvnInput(e.target.value.replace(/\D/g, ''))}
                        style={{ flex: 1, padding: '7px 10px', borderRadius: '7px', border: '1.5px solid #fecaca', fontSize: '0.8125rem', background: '#fff', color: '#111827', outline: 'none' }}
                      />
                    </div>
                    <p style={{ margin: '4px 0 0', fontSize: '0.7rem', color: '#991b1b' }}>
                      Enter BVN above, then click Re-submit below.
                    </p>
                  </div>
                )}
                {!isBvnError && <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#991b1b' }}>{parsed.suggestion}</p>}
              </>
            ) : (
              error
            )}
          </div>
        )
      })()}
      {success && <div style={{ padding: '10px 12px', borderRadius: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', fontSize: '0.8125rem', color: '#16a34a', marginBottom: '12px' }}>{success}</div>}

      {/* BVN override — shown proactively if no BVN is on record yet */}
      {!error && !loan?.customer?.bvn && !loan?.bvn && (
        <div style={{ marginBottom: '12px' }}>
          <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
            Patient BVN <span style={{ color: '#9ca3af' }}>(required by P2Vest — enter if not already on record)</span>
          </label>
          <input
            type="text"
            inputMode="numeric"
            maxLength={11}
            placeholder="11-digit BVN"
            value={bvnInput}
            onChange={(e) => setBvnInput(e.target.value.replace(/\D/g, ''))}
            style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff', color: '#111827', outline: 'none' }}
          />
        </div>
      )}

      {/* Applicant email override — shown when the stored email differs from what P2Vest expects */}
      <div style={{ marginBottom: '12px' }}>
        <label style={{ display: 'block', fontSize: '0.75rem', color: '#6b7280', marginBottom: '4px' }}>
          Applicant email for P2Vest <span style={{ color: '#9ca3af' }}>(override — use if P2Vest rejects because of email conflict)</span>
        </label>
        <input
          type="email"
          placeholder={`Currently: ${loan?.email || 'not set'}`}
          value={customerEmailOverride}
          onChange={(e) => setCustomerEmailOverride(e.target.value)}
          style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff', color: '#111827', outline: 'none' }}
        />
      </div>

      {/* Guarantor — always editable so details can be corrected before re-submit */}
      <div style={{ marginBottom: '12px', padding: '10px 12px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a' }}>
        <p style={{ margin: '0 0 8px', fontSize: '0.75rem', color: '#92400e', fontWeight: 600 }}>
          Guarantor details (required by P2Vest — correct if needed before submitting):
        </p>
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
          <input
            type="text"
            placeholder="Full name"
            value={guarantorInput.fullName}
            onChange={(e) => setGuarantorInput((g) => ({ ...g, fullName: e.target.value }))}
            style={{ boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff', color: '#111827', outline: 'none' }}
          />
          <input
            type="tel"
            placeholder="Phone"
            value={guarantorInput.phone}
            onChange={(e) => setGuarantorInput((g) => ({ ...g, phone: e.target.value }))}
            style={{ boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff', color: '#111827', outline: 'none' }}
          />
          <input
            type="email"
            placeholder="Email (must differ from applicant's)"
            value={guarantorInput.email}
            onChange={(e) => setGuarantorInput((g) => ({ ...g, email: e.target.value }))}
            style={{ boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff', color: '#111827', outline: 'none' }}
          />
          <input
            type="text"
            inputMode="numeric"
            maxLength={11}
            placeholder="11-digit BVN"
            value={guarantorInput.bvn}
            onChange={(e) => setGuarantorInput((g) => ({ ...g, bvn: e.target.value.replace(/\D/g, '') }))}
            style={{ boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #e2e8f0', fontSize: '0.8125rem', background: '#fff', color: '#111827', outline: 'none' }}
          />
        </div>
      </div>

      {/* Submit / re-submit button */}
      <button
        onClick={handleSubmit}
        disabled={submitting || !loan?.id}
        style={{ width: '100%', display: 'flex', alignItems: 'center', justifyContent: 'center', gap: '7px', padding: '10px', borderRadius: '8px', border: 'none', background: submitting ? '#93c5fd' : 'linear-gradient(135deg,#2563eb,#1d4ed8)', color: '#fff', fontSize: '0.875rem', fontWeight: 600, cursor: submitting ? 'wait' : 'pointer' }}
      >
        {submitting ? <RefreshCw size={15} className="spin" /> : <Send size={15} />}
        {hasRequestId ? 'Re-submit to P2Vest' : 'Submit to P2Vest'}
      </button>

      {hasRequestId && (
        <p style={{ margin: '8px 0 0', fontSize: '0.75rem', color: '#9ca3af', textAlign: 'center' }}>
          Request ID: {loan.p2vestRequestId}
        </p>
      )}
    </div>
  )
}
