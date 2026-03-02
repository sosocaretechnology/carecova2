import { useState } from 'react'
import MoneyInput from '../../MoneyInput'
import { parseMoney } from '../../../utils/currencyUtils'

export default function DecisionPanel({ loan, session, onApprove, onReject, onRequestInfo }) {
    const [amount, setAmount] = useState(loan.approvedAmount || loan.requestedAmount || loan.estimatedCost || 0)
    const [tenor, setTenor] = useState(loan.duration || loan.preferredDuration || loan.preferredTenor?.replace(/[^0-9]/g, '').split('-')[1] || 6)
    const [notes, setNotes] = useState(loan.decisionNotes || '')
    const [actioning, setActioning] = useState(false)
    const [activeTab, setActiveTab] = useState('decision') // decision | info

    const role = session?.role || 'admin'
    const status = loan.status

    // Handle string inputs from MoneyInput
    const parsedAmount = typeof amount === 'string' ? parseMoney(amount) || 0 : amount;
    const parsedTenor = Number(tenor) || 1;

    // Use mock service fee (flat % for MVP) as discussed
    const serviceFeePct = 0.05;
    const serviceFeeAmount = parsedAmount * serviceFeePct;

    const interestRate = 0.025; // per month
    const totalRepayment = parsedAmount + serviceFeeAmount + (parsedAmount * interestRate * parsedTenor);
    const monthly = totalRepayment / parsedTenor;

    const handleApprove = async () => {
        if (!notes) return alert('Decision notes required')
        setActioning(true)
        await onApprove({ approvedAmount: parsedAmount, duration: parsedTenor, notes, serviceFee: serviceFeeAmount, totalRepayable: totalRepayment })
        setActioning(false)
    }

    const handleReject = async () => {
        if (!notes) return alert('Decision notes required')
        setActioning(true)
        await onReject(notes)
        setActioning(false)
    }

    const handleRequestInfo = async () => {
        if (!notes) return alert('Message to applicant required')
        setActioning(true)
        await onRequestInfo(notes)
        setActioning(false)
    }

    const riskLevel = loan.internalRiskMetrics?.riskLevel || 'LOW';
    const recommendation = riskLevel === 'HIGH' || loan.affordability?.affordabilityTag === 'Not Affordable'
        ? { text: 'Recommend Reject', class: 'danger' }
        : riskLevel === 'MEDIUM' || loan.affordability?.affordabilityTag === 'Tight'
            ? { text: 'Manual Review Required', class: 'warning' }
            : { text: 'Recommend Approve', class: 'success' }

    // Logic for what to show
    const isApproved = status === 'approved' || status === 'ready_to_disburse' || status === 'disbursed'
    const isRejected = status === 'rejected'
    const isStage2Review = status === 'stage_2_review'
    const isPending = status === 'pending'

    if (isApproved || isRejected) {
        return (
            <div className="detail-column column-decision sticky-panel">
                <div className="detail-card">
                    <h2>Decision {isApproved ? 'Approved' : 'Rejected'}</h2>
                    <div className="mt-2 text-sm">
                        Final Status: <strong className="capitalize">{status.replace('_', ' ')}</strong>
                    </div>
                    <div className="mt-2 text-sm" style={{ marginBottom: '10px' }}>
                        Actioned by: {loan.approvedBy || loan.rejectedBy || 'System'}
                    </div>
                    <div style={{ background: '#f1f5f9', padding: '10px', borderRadius: '4px', fontSize: '0.85rem' }}>
                        <strong>Notes:</strong>
                        <p style={{ margin: '5px 0 0 0', fontStyle: 'italic' }}>"{loan.decisionNotes || 'N/A'}"</p>
                    </div>
                    {isApproved && (
                        <div className="mt-4 p-3 bg-sage-light border-radius-sm text-sm">
                            <div className="flex-between"><span>Approved:</span><strong>₦{loan.approvedAmount?.toLocaleString()}</strong></div>
                            <div className="flex-between"><span>Tenor:</span><strong>{loan.duration} mos</strong></div>
                        </div>
                    )}
                </div>
            </div>
        )
    }

    // Sales sees nothing here if they are in pending (they use SalesDataCollection)
    if (role === 'sales' && isPending) {
        return null
    }

    // Admin sees notice if still in Stage 1
    if (role === 'admin' && isPending) {
        return (
            <div className="detail-column column-decision sticky-panel">
                <div className="detail-card highlight-border-warning">
                    <h3>Stage 1 Review Pending</h3>
                    <p className="text-sm text-muted">Awaiting sales officer to complete medical and financial data collection.</p>
                </div>
            </div>
        )
    }

    return (
        <div className="detail-column column-decision sticky-panel">
            <div className={`recommendation-header bg-${recommendation.class}-subtle border-${recommendation.class}`}>
                <div className={`text-${recommendation.class} font-bold text-lg`}>{recommendation.text}</div>
                <div className="text-xs text-muted mt-1">Based on AI Risk Engine</div>
            </div>

            <div className="decision-tabs mt-4">
                <button className={`tab-btn ${activeTab === 'decision' ? 'active' : ''}`} onClick={() => setActiveTab('decision')}>Final Decision</button>
                <button className={`tab-btn ${activeTab === 'info' ? 'active' : ''}`} onClick={() => setActiveTab('info')}>Request Info</button>
            </div>

            {activeTab === 'decision' ? (
                <div className="detail-card mt-0 border-top-none border-top-radius-none">
                    {role === 'admin' ? (
                        <>
                            <h3>Credit Decision Builder</h3>
                            <div className="mt-3">
                                <MoneyInput label="Approved Amount" value={amount} onChange={v => setAmount(v)} />
                            </div>
                            <div className="input-group mt-3">
                                <label className="input-label">Tenor (Months)</label>
                                <select className="select" value={tenor} onChange={e => setTenor(e.target.value)}>
                                    {[1, 3, 6, 9, 12, 18, 24].map(m => <option key={m} value={m}>{m} Months</option>)}
                                </select>
                            </div>
                            <div className="offer-preview mt-4 bg-sage-light p-3 border-radius-sm text-sm" style={{ borderLeft: '3px solid #10b981' }}>
                                <div className="flex-between mb-1"><span>Principal:</span><strong>₦{parsedAmount.toLocaleString()}</strong></div>
                                <div className="flex-between mb-1"><span>Interest (2.5%):</span><strong>₦{(parsedAmount * 0.025 * parsedTenor).toLocaleString()}</strong></div>
                                <div className="flex-between text-primary font-bold mt-2 pt-2 border-top">
                                    <span>Monthly:</span>
                                    <span>₦{monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                        </>
                    ) : (
                        <div className="alert-box alert-warning text-xs">Only Super Admins can finalize loan terms.</div>
                    )}

                    <div className="input-group mt-4">
                        <label className="input-label">Decision Notes (Required)</label>
                        <textarea
                            className="input min-h-24"
                            placeholder="Justification..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        ></textarea>
                    </div>

                    <div className="action-buttons mt-4 flex gap-2">
                        <button
                            className="button button--primary flex-1 bg-success border-success"
                            onClick={handleApprove}
                            disabled={actioning || !notes || role !== 'admin'}
                        >
                            ✓ Approve
                        </button>
                        <button
                            className="button button--primary flex-1 bg-error border-error"
                            onClick={handleReject}
                            disabled={actioning || !notes}
                        >
                            ✕ Reject
                        </button>
                    </div>
                </div>
            ) : (
                <div className="detail-card mt-0 border-top-none border-top-radius-none">
                    <h3>Request More Information</h3>
                    <div className="input-group mt-2">
                        <label className="input-label">Message to Applicant</label>
                        <textarea
                            className="input min-h-24"
                            placeholder="E.g. Please upload a clearer copy of your ID card..."
                            value={notes}
                            onChange={e => setNotes(e.target.value)}
                        ></textarea>
                    </div>
                    <button
                        className="button button--secondary w-full mt-4"
                        onClick={handleRequestInfo}
                        disabled={actioning || !notes}
                    >
                        Send Request
                    </button>
                </div>
            )}
        </div>
    )
}
