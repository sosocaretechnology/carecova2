import { useState } from 'react'
import MoneyInput from '../../MoneyInput'
import { parseMoney } from '../../../utils/currencyUtils'
import { computeSchedule } from '../../../utils/lendingEngine'
import { getRiskConfig } from '../../../data/riskConfig'

export default function DecisionPanel({ loan, session, onApprove, onReject, onRequestInfo }) {
    const [amount, setAmount] = useState(loan.approvedAmount || loan.requestedAmount || loan.estimatedCost || 0)
    const [tenor, setTenor] = useState(loan.duration || loan.preferredDuration || loan.preferredTenor?.replace(/[^0-9]/g, '').split('-')[1] || 6)
    const [notes, setNotes] = useState(loan.decisionNotes || '')
    const [actioning, setActioning] = useState(false)
    const [activeTab, setActiveTab] = useState('decision')

    const role = session?.role || 'admin'
    const status = loan.status
    const config = getRiskConfig()
    const parsedAmount = typeof amount === 'string' ? parseMoney(amount) || 0 : amount
    const parsedTenor = Number(tenor) || 1
    const rate = config.lendingInterestRatePerMonth ?? config.interestRate ?? 0.05
    const scheduleResult = parsedAmount > 0 && parsedTenor >= 1 ? computeSchedule(parsedAmount, parsedTenor) : { totalAmount: 0, totalInterest: 0, monthlyPayment: 0 }
    const totalRepayment = scheduleResult.totalAmount
    const totalInterest = scheduleResult.totalInterest
    const monthly = scheduleResult.monthlyPayment

    const defaultApprovalPct = (config.salesApprovalCommissionPct ?? 0.02) * 100
    const defaultInterestPct = (config.salesInterestCommissionPct ?? 0.07) * 100
    const defaultBonusPct = (config.salesRepaymentBonusPct ?? 0.05) * 100
    const [approvalPct, setApprovalPct] = useState((loan.commissionOverrides?.salesApprovalCommissionPct ?? config.salesApprovalCommissionPct ?? 0.02) * 100)
    const [interestPct, setInterestPct] = useState((loan.commissionOverrides?.salesInterestCommissionPct ?? config.salesInterestCommissionPct ?? 0.07) * 100)
    const [bonusPct, setBonusPct] = useState((loan.commissionOverrides?.salesRepaymentBonusPct ?? config.salesRepaymentBonusPct ?? 0.05) * 100)

    const approvalCommissionAmount = Math.round(parsedAmount * (approvalPct / 100))
    const interestCommissionAmount = Math.round(totalInterest * (interestPct / 100))
    const repaymentBonusAmount = Math.round(totalInterest * (bonusPct / 100))

    const handleApprove = async () => {
        if (!notes) return alert('Decision notes required')
        setActioning(true)
        await onApprove({
            approvedAmount: parsedAmount,
            duration: parsedTenor,
            notes,
            totalRepayable: totalRepayment,
            totalInterest,
            commissionOverrides: { salesApprovalCommissionPct: approvalPct / 100, salesInterestCommissionPct: interestPct / 100, salesRepaymentBonusPct: bonusPct / 100 },
        })
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
    const isPending = status === 'pending' || status === 'pending_stage1'
    const isInStage2Status = ['stage_2_review', 'pending_admin_review', 'pending_credit_review'].includes(status)
    const isStage1Completed = Boolean(loan.stage1ApprovedBy || loan.stage1ApprovedAt) || isInStage2Status

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

    // Sales never finalize loan terms in this panel – they use SalesDataCollection instead
    if (role === 'sales') {
        return null
    }

    // Admin sees notice (and cannot approve) if Stage 1 is not completed yet
    if (role === 'admin' && !isStage1Completed) {
        return (
            <div className="detail-column column-decision sticky-panel">
                <div className="detail-card highlight-border-warning">
                    <h3>Stage 1 Review Pending</h3>
                    <p className="text-sm text-muted">
                        Awaiting sales officer to complete medical and financial data collection and approve Stage 1.
                        Admin review will unlock automatically after Stage 1 is approved.
                    </p>
                </div>
            </div>
        )
    }

    const affordability = loan.internalRiskMetrics || loan.affordability || {}
    const dtiPct = affordability.affordabilityRatio ? Math.round(affordability.affordabilityRatio * 100) : (affordability.installmentToIncomePct || 0)
    const docsScore = loan.completenessScore || 0

    const dtiSeverity = dtiPct <= 20 ? 'success' : dtiPct <= 35 ? 'warning' : 'danger'

    return (
        <div className="detail-column column-decision sticky-panel">
            <div className={`recommendation-header bg-${recommendation.class}-subtle border-${recommendation.class}`}>
                <div className={`text-${recommendation.class} font-bold text-lg`}>{recommendation.text}</div>
                <div className="text-xs text-muted mt-1">Based on AI Risk Engine</div>
            </div>

            <div className="affordability-card mt-3">
                <div className="affordability-card-header">
                    <div>
                        <div className="affordability-card-title">Decision Snapshot</div>
                        <div className="affordability-card-subtitle">
                            Affordability, documentation and risk at a glance before you lock final terms.
                        </div>
                    </div>
                    <div className="affordability-chip-row">
                        {affordability.affordabilityTag && (
                            <span
                                className={`affordability-chip ${
                                    affordability.affordabilityTag === 'Not Affordable'
                                        ? 'affordability-chip--danger'
                                        : affordability.affordabilityTag === 'Tight'
                                            ? 'affordability-chip--warning'
                                            : 'affordability-chip--success'
                                }`}
                            >
                                {affordability.affordabilityTag}
                            </span>
                        )}
                    </div>
                </div>

                <div className="affordability-grid">
                    <div>
                        <div className="affordability-metric-label">DTI (Installment / Income)</div>
                        <div className="affordability-metric-value">
                            {dtiPct ? `${dtiPct}%` : '—'}
                        </div>
                        <div className="metric-bar">
                            <div
                                className={`metric-bar-fill metric-bar-fill--${dtiSeverity}`}
                                style={{ width: `${Math.min(dtiPct || 0, 100)}%` }}
                            />
                        </div>
                        <div className="affordability-metric-muted">
                            Target &lt; 35% for comfortable repayment.
                        </div>
                    </div>
                    <div>
                        <div className="affordability-metric-label">Docs Completeness</div>
                        <div className="affordability-metric-value">
                            {docsScore ? `${docsScore}%` : '—'}
                        </div>
                        <div className="metric-bar">
                            <div
                                className="metric-bar-fill metric-bar-fill--success"
                                style={{ width: `${Math.min(docsScore || 0, 100)}%` }}
                            />
                        </div>
                        <div className="affordability-metric-muted">
                            Review missing docs in the Case File panel.
                        </div>
                    </div>
                    <div>
                        <div className="affordability-metric-label">Risk Level</div>
                        <div className="affordability-metric-value">
                            {riskLevel || 'LOW'}
                        </div>
                        <div className="affordability-metric-muted">
                            Use this together with Mono & internal checkers for final judgement.
                        </div>
                    </div>
                </div>
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
                                <div className="flex-between mb-1"><span>Interest ({(rate * 100).toFixed(0)}% monthly):</span><strong>₦{totalInterest.toLocaleString()}</strong></div>
                                <div className="flex-between mb-1"><span>Total repayable:</span><strong>₦{totalRepayment.toLocaleString()}</strong></div>
                                <div className="flex-between text-primary font-bold mt-2 pt-2 border-top">
                                    <span>Monthly:</span>
                                    <span>₦{monthly.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
                                </div>
                            </div>
                            <div className="offer-preview mt-3 p-3 border-radius-sm text-sm" style={{ background: '#f9fafb', borderLeft: '3px solid #0ea5e9' }}>
                                <div className="mb-2 font-semibold text-xs text-muted">Commission Impact (Sales)</div>
                                <div className="flex-between mb-1"><span>Approval ({approvalPct.toFixed(1)}%)</span><strong>₦{approvalCommissionAmount.toLocaleString()}</strong></div>
                                <div className="flex-between mb-1"><span>Interest ({interestPct.toFixed(1)}%)</span><strong>₦{interestCommissionAmount.toLocaleString()}</strong></div>
                                <div className="flex-between mb-1"><span>Repayment bonus ({bonusPct.toFixed(1)}%)</span><strong>₦{repaymentBonusAmount.toLocaleString()}</strong></div>
                                <div className="input-group mt-3">
                                    <label className="input-label text-xs">Override % (Risk Officer)</label>
                                    <div className="flex gap-2 text-xs">
                                        <div style={{ flex: 1 }}><input type="number" className="input" value={approvalPct} onChange={e => setApprovalPct(Number(e.target.value) || 0)} placeholder="Approval %" /></div>
                                        <div style={{ flex: 1 }}><input type="number" className="input" value={interestPct} onChange={e => setInterestPct(Number(e.target.value) || 0)} placeholder="Interest %" /></div>
                                        <div style={{ flex: 1 }}><input type="number" className="input" value={bonusPct} onChange={e => setBonusPct(Number(e.target.value) || 0)} placeholder="Bonus %" /></div>
                                    </div>
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
