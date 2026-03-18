import { useState, useEffect } from 'react'
import { useParams, useNavigate, useLocation } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import StatusBadge from '../../components/StatusBadge'
import { getRiskConfig } from '../../data/riskConfig'
import {
    CheckCircle, AlertTriangle, XCircle, ArrowLeft, Loader, Beaker
} from 'lucide-react'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const USE_BACKEND = !!API_BASE_URL

const BANKS = [
    'Access Bank', 'GTBank', 'First Bank', 'Zenith Bank', 'UBA',
    'Kuda Bank', 'Opay', 'Palmpay', 'Sterling Bank', 'Wema Bank'
]

export default function DisbursementCaseFile() {
    const { id } = useParams()
    const navigate = useNavigate()
    const location = useLocation()
    const queuePath = location.pathname.startsWith('/admin') ? '/admin/disbursements' : '/credit/disbursements'
    const [loan, setLoan] = useState(null)
    const [loading, setLoading] = useState(true)
    const [submitting, setSubmitting] = useState(false)
    const [simulateResult, setSimulateResult] = useState('success')
    const [notes, setNotes] = useState('')
    const [correctionNotes, setCorrectionNotes] = useState('')
    const [accountConfirmed, setAccountConfirmed] = useState(false)

    const [payout, setPayout] = useState({
        hospitalName: '',
        hospitalAccountName: '',
        hospitalBankName: '',
        hospitalAccountNumber: '',
        hospitalContactPhone: '',
        invoiceAmount: '',
        invoiceDate: '',
        payoutAmount: '',
        payoutMethod: 'bank_transfer',
    })

    useEffect(() => {
        async function load() {
            setLoading(true)
            try {
                const found = await adminService.getLoanById(id)
                if (found) {
                    setLoan(found)
                    const config = getRiskConfig()
                    const providerPct = config.providerCommissionPct ?? 0.07
                    const approved = found.approvedAmount ?? found.estimatedCost ?? found.requestedAmount ?? 0
                    const approvedNum = typeof approved === 'number' ? approved : Number(approved) || 0
                    const providerPayout = Math.round(approvedNum * (1 - providerPct))
                    if (found.disbursementIntent) {
                        const existing = found.disbursementIntent
                        const payoutAmt = existing.payoutAmount ?? existing.providerPayout ?? providerPayout
                        setPayout(prev => ({ ...prev, ...existing, payoutAmount: payoutAmt > 0 ? payoutAmt : providerPayout }))
                    } else {
                        setPayout(prev => ({ ...prev, payoutAmount: providerPayout > 0 ? providerPayout : approvedNum }))
                    }
                }
            } finally {
                setLoading(false)
            }
        }
        load()
    }, [id])

    const handlePayoutChange = (field, value) => {
        setPayout(prev => ({ ...prev, [field]: value }))
    }

    const config = getRiskConfig()
    const providerPct = config.providerCommissionPct ?? 0.07
    const approvedAmount = loan ? (loan.approvedAmount ?? loan.estimatedCost ?? loan.requestedAmount ?? 0) : 0
    const approvedAmountNum = typeof approvedAmount === 'number' ? approvedAmount : Number(approvedAmount) || 0
    const providerPayoutComputed = Math.round(approvedAmountNum * (1 - providerPct))
    const platformCommissionAmount = Math.round(approvedAmountNum * providerPct)
    const amount = Number(payout.payoutAmount)

    const validationErrors = {
        hospitalName: !payout.hospitalName.trim() ? 'Hospital name is required' : null,
        hospitalAccountName: !payout.hospitalAccountName.trim() ? 'Account name is required' : null,
        hospitalBankName: !payout.hospitalBankName ? 'Select a bank' : null,
        hospitalAccountNumber: String(payout.hospitalAccountNumber).length < 10 ? `Account number must be 10 digits (${String(payout.hospitalAccountNumber).length}/10)` : null,
        payoutAmount: amount <= 0 ? 'Enter a payout amount greater than 0' : null,
    }

    const isFormValid = () => Object.values(validationErrors).every(e => e === null)

    const handleConfirm = async () => {
        if (!isFormValid()) return alert('Please fill all required hospital details and confirm the account name.')
        setSubmitting(true)
        try {
            const result = await adminService.confirmDisbursement(id, { ...payout, notes }, simulateResult)
            setLoan(result)
            // Always refresh from backend after confirm to pick up status/wallet/schedule side-effects.
            try {
                const fresh = await adminService.getLoanById(id)
                if (fresh) setLoan(fresh)
            } catch (_) {}
        } catch (err) {
            alert(err.message)
        } finally {
            setSubmitting(false)
        }
    }

    const handleRequestCorrection = async () => {
        if (!correctionNotes.trim()) return alert('Please enter correction notes.')
        await adminService.requestDisbursementCorrection(id, correctionNotes)
        navigate(queuePath)
    }

    if (loading) return <div className="admin-loading">Loading case file...</div>
    if (!loan) return <div className="admin-page"><p>Case not found.</p></div>

    const isDone = ['disbursement_processing', 'active'].includes(loan.status)
    const isFailed = loan.disbursementIntent?.status === 'FAILED'

    return (
        <div className="admin-page">
            <div className="admin-page-header mb-5">
                <div>
                    <button className="back-link mb-2 text-sm text-primary font-bold bg-transparent border-none cursor-pointer"
                        onClick={() => navigate(queuePath)}>
                        ← Back to Queue
                    </button>
                    <div className="flex items-center gap-3">
                        <h1 className="mb-0">Case: {loan.id}</h1>
                        <StatusBadge status={loan.status} />
                    </div>
                    <p className="text-xs text-muted mt-1">
                        Approved ₦{approvedAmountNum.toLocaleString()} for {loan.approvedDuration ?? loan.duration} months
                    </p>
                </div>
            </div>

            {/* Success / Processing Banner */}
            {loan.status === 'active' && (
                <div className="mb-4 p-4 rounded-lg flex items-center gap-3"
                    style={{ background: '#d1fae5', border: '1px solid #6ee7b7' }}>
                    <CheckCircle className="text-success" size={22} />
                    <div>
                        <div className="font-bold text-success">Disbursement Successful</div>
                        <div className="text-sm">Ref: {loan.disbursementIntent?.providerReference} · Loan is now Active</div>
                    </div>
                </div>
            )}
            {loan.status === 'disbursement_processing' && (
                <div className="mb-4 p-4 rounded-lg flex items-center gap-3"
                    style={{ background: '#dbeafe', border: '1px solid #93c5fd' }}>
                    <Loader className="animate-spin" size={22} />
                    <div className="font-bold">Payout processing... (simulating transfer)</div>
                </div>
            )}
            {isFailed && (
                <div className="mb-4 p-4 rounded-lg flex items-center gap-3"
                    style={{ background: '#fee2e2', border: '1px solid #fca5a5' }}>
                    <XCircle className="text-error" size={22} />
                    <div>
                        <div className="font-bold text-error">Disbursement Failed</div>
                        <div className="text-sm">{loan.disbursementIntent?.failureReason}</div>
                    </div>
                </div>
            )}

            {/* 3-Column Layout */}
            <div className="detail-layout-3col">
                {/* LEFT — Read-only Summary */}
                <div className="detail-column">
                    <div className="detail-card">
                        <h3 className="detail-card-title">Applicant Summary</h3>
                        <div className="detail-field-row">
                            <span className="detail-label">Full Name</span>
                            <span className="detail-value font-medium">{loan.fullName || loan.patientName}</span>
                        </div>
                        <div className="detail-field-row">
                            <span className="detail-label">Employment</span>
                            <span className="detail-value capitalize">{loan.employmentSector || loan.employmentType || '—'}</span>
                        </div>
                        <div className="detail-field-row">
                            <span className="detail-label">Phone</span>
                            <span className="detail-value">{loan.phone || '—'}</span>
                        </div>
                        <div className="detail-field-row">
                            <span className="detail-label">Employer</span>
                            <span className="detail-value">{loan.employerName || '—'}</span>
                        </div>
                    </div>

                    <div className="detail-card mt-4">
                        <h3 className="detail-card-title">Offer Terms</h3>
                        <div className="detail-field-row">
                            <span className="detail-label">Approved Amount</span>
                            <span className="detail-value font-bold">₦{approvedAmountNum.toLocaleString()}</span>
                        </div>
                        <div className="detail-field-row">
                            <span className="detail-label">Duration</span>
                            <span className="detail-value">{loan.approvedDuration} months</span>
                        </div>
                        <div className="detail-field-row">
                            <span className="detail-label">Monthly Installment</span>
                            <span className="detail-value">₦{(loan.monthlyInstallment || 0).toLocaleString()}</span>
                        </div>
                        <div className="detail-field-row">
                            <span className="detail-label">Total Repayment</span>
                            <span className="detail-value">₦{(loan.totalRepayment || 0).toLocaleString()}</span>
                        </div>
                    </div>

                    {(loan.medicalInsights || loan.medicalDetails || loan.repaymentStrategy) && (
                        <div className="detail-card mt-4">
                            <h3 className="detail-card-title">RM Notes</h3>
                            {(loan.medicalInsights || loan.medicalDetails) && (
                                <div className="mb-3">
                                    <span className="detail-label block mb-1">Medical Insights</span>
                                    {typeof (loan.medicalInsights || loan.medicalDetails) === 'object' ? (
                                        <dl className="text-sm" style={{ display: 'grid', gridTemplateColumns: 'auto 1fr', gap: '2px 12px' }}>
                                            {Object.entries(loan.medicalInsights || loan.medicalDetails).map(([k, v]) => (
                                                <><dt className="text-muted capitalize" key={k + 'dt'}>{k.replace(/([A-Z])/g, ' $1')}</dt><dd className="font-medium" key={k + 'dd'}>{String(v)}</dd></>
                                            ))}
                                        </dl>
                                    ) : (
                                        <p className="text-sm text-gray-700 italic">{String(loan.medicalInsights || loan.medicalDetails)}</p>
                                    )}
                                </div>
                            )}
                            {loan.repaymentStrategy && (
                                <div>
                                    <span className="detail-label block mb-1">Repayment Strategy</span>
                                    <p className="text-sm text-gray-700 italic">
                                        {typeof loan.repaymentStrategy === 'object' ? JSON.stringify(loan.repaymentStrategy, null, 2) : loan.repaymentStrategy}
                                    </p>
                                </div>
                            )}
                        </div>
                    )}
                </div>

                {/* MIDDLE — Hospital & Payout Verification */}
                <div className="detail-column">
                    <div className="detail-card">
                        <h3 className="detail-card-title">Hospital & Payout Verification</h3>
                        <p className="text-xs text-muted mb-4">Fill all fields before confirming disbursement.</p>

                        <div className="form-group">
                            <label className="form-label">Hospital Legal Name *</label>
                            <input className="input" value={payout.hospitalName} disabled={isDone}
                                onChange={e => handlePayoutChange('hospitalName', e.target.value)}
                                placeholder="e.g. Lagos Island General Hospital"
                                style={validationErrors.hospitalName && payout.hospitalName !== undefined ? { borderColor: '#ef4444' } : {}}
                            />
                            {validationErrors.hospitalName && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 3 }}>⚠ {validationErrors.hospitalName}</p>}
                        </div>

                        <div className="form-group">
                            <label className="form-label">Hospital Account Name *</label>
                            <input className="input" value={payout.hospitalAccountName} disabled={isDone}
                                onChange={e => handlePayoutChange('hospitalAccountName', e.target.value)}
                                placeholder="Exact name on bank account"
                                style={validationErrors.hospitalAccountName && payout.hospitalAccountName !== undefined ? { borderColor: '#ef4444' } : {}}
                            />
                            {validationErrors.hospitalAccountName && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 3 }}>⚠ {validationErrors.hospitalAccountName}</p>}
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Bank Name *</label>
                                <select className="input" value={payout.hospitalBankName} disabled={isDone}
                                    onChange={e => handlePayoutChange('hospitalBankName', e.target.value)}>
                                    <option value="">Select bank</option>
                                    {BANKS.map(b => <option key={b} value={b}>{b}</option>)}
                                </select>
                            </div>
                            <div className="form-group">
                                <label className="form-label">Account Number *</label>
                                <input className="input" value={payout.hospitalAccountNumber} disabled={isDone}
                                    maxLength={10}
                                    onChange={e => handlePayoutChange('hospitalAccountNumber', e.target.value.replace(/\D/g, ''))}
                                    placeholder="10-digit NUBAN"
                                    style={validationErrors.hospitalAccountNumber ? { borderColor: '#ef4444' } : {}}
                                />
                                {validationErrors.hospitalAccountNumber && <p style={{ color: '#ef4444', fontSize: '0.72rem', marginTop: 3 }}>⚠ {validationErrors.hospitalAccountNumber}</p>}
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Hospital Contact Phone</label>
                            <input className="input" value={payout.hospitalContactPhone} disabled={isDone}
                                onChange={e => handlePayoutChange('hospitalContactPhone', e.target.value)}
                                placeholder="+234..." />
                        </div>

                        <div className="form-row" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '12px' }}>
                            <div className="form-group">
                                <label className="form-label">Invoice Amount (₦)</label>
                                <input type="number" className="input" value={payout.invoiceAmount} disabled={isDone}
                                    onChange={e => handlePayoutChange('invoiceAmount', e.target.value)}
                                    placeholder="0" />
                            </div>
                            <div className="form-group">
                                <label className="form-label">Invoice Date</label>
                                <input type="date" className="input" value={payout.invoiceDate} disabled={isDone}
                                    onChange={e => handlePayoutChange('invoiceDate', e.target.value)} />
                            </div>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Payout breakdown</label>
                            <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 text-sm">
                                <div className="flex justify-between"><span>Approved (loan amount)</span><span className="font-medium">₦{approvedAmountNum.toLocaleString()}</span></div>
                                <div className="flex justify-between"><span>Provider commission ({(providerPct * 100).toFixed(0)}%)</span><span className="font-medium">− ₦{platformCommissionAmount.toLocaleString()}</span></div>
                                <div className="flex justify-between pt-2 border-t border-gray-200 font-bold"><span>Amount to provider</span><span>₦{providerPayoutComputed.toLocaleString()}</span></div>
                            </div>
                        </div>
                        <div className="form-group">
                            <label className="form-label">Payout Amount (₦) — to provider</label>
                            <input type="number" className="input" value={payout.payoutAmount} readOnly style={{ backgroundColor: '#f1f5f9', cursor: 'not-allowed' }} />
                            <p className="text-xs text-muted mt-1">Computed from approved amount minus provider commission.</p>
                        </div>

                        <div className="form-group">
                            <label className="form-label">Disbursement Method *</label>
                            <select className="input" value={payout.payoutMethod} disabled={isDone}
                                onChange={e => handlePayoutChange('payoutMethod', e.target.value)}>
                                <option value="bank_transfer">Bank Transfer</option>
                                <option value="remita">Remita</option>
                                <option value="manual">Manual (Testing only)</option>
                            </select>
                        </div>

                        {!isDone && (
                            <div
                                onClick={() => setAccountConfirmed(v => !v)}
                                style={{
                                    marginTop: '16px',
                                    padding: '12px 14px',
                                    borderRadius: '8px',
                                    border: `2px solid ${accountConfirmed ? '#22c55e' : '#e5e7eb'}`,
                                    background: accountConfirmed ? '#f0fdf4' : '#f9fafb',
                                    cursor: 'pointer',
                                    display: 'flex',
                                    alignItems: 'center',
                                    gap: '10px',
                                    transition: 'all 0.15s',
                                }}
                            >
                                <div style={{
                                    width: 20, height: 20, borderRadius: '50%', flexShrink: 0,
                                    border: `2px solid ${accountConfirmed ? '#22c55e' : '#d1d5db'}`,
                                    background: accountConfirmed ? '#22c55e' : 'white',
                                    display: 'flex', alignItems: 'center', justifyContent: 'center',
                                }}>
                                    {accountConfirmed && <span style={{ color: 'white', fontSize: 12, fontWeight: 'bold' }}>✓</span>}
                                </div>
                                <span style={{ fontSize: '0.825rem', fontWeight: 500, color: accountConfirmed ? '#15803d' : '#374151' }}>
                                    I confirm the account name matches the hospital name on the invoice
                                </span>
                            </div>
                        )}
                    </div>

                    <div className="form-group mt-4">
                        <label className="form-label">Internal Note (optional)</label>
                        <textarea className="input" rows={3} value={notes} disabled={isDone}
                            onChange={e => setNotes(e.target.value)}
                            placeholder="e.g. Invoice reviewed, account verified by credit team" />
                    </div>
                </div>

                {/* RIGHT — Decision Panel */}
                <div className="detail-column">
                    <div className="detail-card" style={{ position: 'sticky', top: '20px' }}>
                        <h3 className="detail-card-title">Decision Panel</h3>

                        {!isDone && !isFailed ? (
                            <>
                                {/* Dev Simulate Tool (local mode only) */}
                                {!USE_BACKEND && (
                                    <div className="p-3 mb-4 rounded-lg border border-dashed border-gray-300"
                                        style={{ background: '#f9fafb' }}>
                                        <div className="flex items-center gap-2 mb-2 text-xs font-bold text-muted uppercase">
                                            <Beaker size={14} />
                                            Simulate Payout (Dev Tool)
                                        </div>
                                        <select className="input text-xs" value={simulateResult}
                                            onChange={e => setSimulateResult(e.target.value)}>
                                            <option value="success">✅ Simulate Success (3s)</option>
                                            <option value="fail">❌ Simulate Failure</option>
                                        </select>
                                    </div>
                                )}

                                <button
                                    className="button button--primary w-100 mb-3"
                                    disabled={submitting || !isFormValid()}
                                    title={!isFormValid() ? 'Fill all required fields (*)' : ''}
                                    onClick={handleConfirm}
                                >
                                    {submitting ? (
                                        <span className="flex items-center gap-2 justify-center">
                                            <Loader size={16} className="animate-spin" /> Processing...
                                        </span>
                                    ) : accountConfirmed ? '✅ Confirm Disbursement' : '🔒 Confirm Disbursement'}
                                </button>

                                {/* Validation Checklist */}
                                {!isFormValid() && (
                                    <div style={{ background: '#fef9f0', border: '1px solid #fde68a', borderRadius: 8, padding: '10px 12px', marginBottom: 12 }}>
                                        <p style={{ fontSize: '0.72rem', fontWeight: 700, color: '#92400e', marginBottom: 6 }}>Complete these to proceed:</p>
                                        {Object.entries(validationErrors).filter(([, v]) => v !== null).map(([k, msg]) => (
                                            <p key={k} style={{ fontSize: '0.7rem', color: '#b45309', margin: '2px 0' }}>✗ {msg}</p>
                                        ))}
                                        {!accountConfirmed && <p style={{ fontSize: '0.7rem', color: '#b45309', margin: '2px 0' }}>✗ Tick the account confirmation below the form</p>}
                                    </div>
                                )}
                                {!accountConfirmed && isFormValid() && (
                                    <p style={{ fontSize: '0.75rem', color: '#b45309', textAlign: 'center', marginBottom: 12 }}>
                                        ☝ Tick the account confirmation above to proceed
                                    </p>
                                )}

                                <div className="form-group">
                                    <label className="form-label text-xs">Correction Notes (for RM)</label>
                                    <textarea className="input text-sm" rows={2}
                                        value={correctionNotes}
                                        onChange={e => setCorrectionNotes(e.target.value)}
                                        placeholder="What needs to be fixed?" />
                                </div>

                                <button
                                    className="button button--secondary w-100 mb-2"
                                    onClick={handleRequestCorrection}
                                >
                                    🟠 Needs Clarification
                                </button>
                            </>
                        ) : (
                            <div>
                                {loan.status === 'active' && (
                                    <div className="text-center p-4">
                                        <CheckCircle size={40} className="text-success mx-auto mb-3" />
                                        <div className="font-bold">Disbursement Complete</div>
                                        <div className="text-sm text-muted mt-1">Loan is now Active</div>
                                        <div className="text-xs font-mono mt-2">{loan.disbursementIntent?.providerReference}</div>
                                    </div>
                                )}
                                {loan.status === 'disbursement_processing' && (
                                    <div className="text-center p-4">
                                        <Loader size={40} className="animate-spin text-primary mx-auto mb-3" />
                                        <div className="font-bold">Processing...</div>
                                        <div className="text-sm text-muted mt-1">Payout in progress. Refresh in a moment.</div>
                                        <button className="button button--secondary mt-3 text-sm"
                                            onClick={() => window.location.reload()}>Refresh</button>
                                    </div>
                                )}
                                {isFailed && (
                                    <div className="text-center p-4">
                                        <XCircle size={40} className="text-error mx-auto mb-3" />
                                        <div className="font-bold text-error">Payout Failed</div>
                                        <div className="text-sm text-muted mt-1">{loan.disbursementIntent?.failureReason}</div>
                                        <button className="button button--primary mt-3 text-sm"
                                            onClick={() => window.location.reload()}>Retry</button>
                                    </div>
                                )}
                            </div>
                        )}
                    </div>
                </div>
            </div>
        </div>
    )
}
