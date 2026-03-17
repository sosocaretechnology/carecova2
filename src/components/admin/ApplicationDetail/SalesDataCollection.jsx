import React, { useState } from 'react'
import MoneyInput from '../../MoneyInput'

export default function SalesDataCollection({ loan, onSave, onApproveStage1 }) {
    const affordability = loan.affordability || {}

    const formatCurrency = (val) => {
        if (val == null || Number.isNaN(Number(val))) return '—'
        return `₦${Number(val).toLocaleString()}`
    }

    const getInstallmentSeverity = () => {
        const pct = affordability.installmentToIncomePct
        if (pct == null) return 'success'
        if (pct <= 20) return 'success'
        if (pct <= 35) return 'warning'
        return 'danger'
    }

    const [medical, setMedical] = useState(loan.medicalInsights || {
        diagnosis: '',
        duration: '',
        urgency: 'medium',
        procedureType: '',
        hospitalContact: '',
        treatmentEstimate: 0
    })

    const [financial, setFinancial] = useState(loan.financialClarification || {
        salaryFrequency: 'monthly',
        additionalIncome: 0,
        expenses: '',
        dependents: 0
    })

    const [repayment, setRepayment] = useState(loan.repaymentStrategy || {
        source: '',
        confidence: 'high',
        notes: ''
    })

    const [bio, setBio] = useState(loan.applicantBio || {
        phone: loan.phone,
        email: loan.email,
        address: loan.homeAddress
    })

    const handleSave = () => {
        onSave({ medicalInsights: medical, financialClarification: financial, repaymentStrategy: repayment, applicantBio: bio })
    }

        return (
        <div className="sales-collection-panel">
            <div className="detail-card affordability-card">
                <div className="affordability-card-header">
                    <div>
                        <div className="affordability-card-title">Affordability Assessment (Stage 1)</div>
                        <div className="affordability-card-subtitle">
                            Income, obligations and repayment pressure to guide your Stage 1 recommendation.
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
                </div>

                <div className="affordability-grid">
                    <div>
                        <div className="affordability-metric-label">Monthly Income</div>
                        <div className="affordability-metric-value text-primary">
                            {formatCurrency(affordability.monthlyIncome ?? loan.monthlyIncome)}
                        </div>
                        <div className="affordability-metric-label" style={{ marginTop: 8 }}>Monthly Expenses</div>
                        <div className="affordability-metric-value">
                            {formatCurrency(affordability.monthlyExpenses ?? loan.monthlyExpenses)}
                        </div>
                        <div className="affordability-metric-label" style={{ marginTop: 8 }}>Disposable Income</div>
                        <div className={`affordability-metric-value ${affordability.disposableIncome <= 0 ? 'text-danger' : 'text-success'}`}>
                            {formatCurrency(affordability.disposableIncome)}
                        </div>
                    </div>

                    <div>
                        <div className="affordability-metric-label">Requested Amount</div>
                        <div className="affordability-metric-value">
                            {formatCurrency(loan.requestedAmount || loan.estimatedCost)}
                        </div>
                        <div className="affordability-metric-label" style={{ marginTop: 8 }}>Estimated Installment</div>
                        <div className="affordability-metric-value">
                            {formatCurrency(affordability.estimatedInstallment)}
                        </div>
                        <div className="affordability-metric-label" style={{ marginTop: 8 }}>Max Recommended Installment</div>
                        <div className="affordability-metric-value">
                            {formatCurrency(affordability.maxRecommendedInstallment)}
                        </div>
                        <div className="metric-bar">
                            <div
                                className={`metric-bar-fill metric-bar-fill--${getInstallmentSeverity()}`}
                                style={{
                                    width: `${Math.min(affordability.installmentToIncomePct || 0, 100)}%`,
                                }}
                            />
                        </div>
                        <div className="affordability-metric-muted">
                            Installment uses {affordability.installmentToIncomePct || 0}% of income (incl. existing loans).
                        </div>
                    </div>

                    <div>
                        <div className="affordability-metric-label">Loan to Income Ratio</div>
                        <div className="affordability-metric-value">
                            {affordability.loanToIncomeRatio != null ? `${affordability.loanToIncomeRatio}x` : '—'}
                        </div>
                        <div className="affordability-metric-label" style={{ marginTop: 8 }}>Expense Coverage</div>
                        <div className="affordability-metric-value">
                            {affordability.expenseCoverage != null ? `${Math.round(affordability.expenseCoverage * 100)}%` : '—'}
                        </div>
                        <div className="affordability-metric-label" style={{ marginTop: 8 }}>Documentation</div>
                        <div className="affordability-metric-muted">
                            Check ID, Estimate and Payslip cards on the left panel for missing items.
                        </div>
                    </div>
                </div>
            </div>

            <div className="detail-card">
                <h3>A. Applicant Bio (Update if needed)</h3>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="input-group">
                        <label className="input-label">Phone</label>
                        <input className="input" value={bio.phone} onChange={e => setBio({ ...bio, phone: e.target.value })} />
                    </div>
                    <div className="input-group">
                        <label className="input-label">Email</label>
                        <input className="input" value={bio.email} onChange={e => setBio({ ...bio, email: e.target.value })} />
                    </div>
                </div>
            </div>

            <div className="detail-card">
                <h3>B. Medical & Treatment Insights</h3>
                <div className="input-group mt-3">
                    <label className="input-label">Detailed Diagnosis</label>
                    <textarea className="input" value={medical.diagnosis} onChange={e => setMedical({ ...medical, diagnosis: e.target.value })} />
                </div>
                <div className="grid grid-cols-2 gap-3 mt-3">
                    <div className="input-group">
                        <label className="input-label">Urgency</label>
                        <select className="select" value={medical.urgency} onChange={e => setMedical({ ...medical, urgency: e.target.value })}>
                            <option value="low">Low</option>
                            <option value="medium">Medium</option>
                            <option value="high">High</option>
                        </select>
                    </div>
                    <MoneyInput label="Confirmed Treatment Estimate" value={medical.treatmentEstimate} onChange={v => setMedical({ ...medical, treatmentEstimate: v })} />
                </div>
            </div>

            <div className="detail-card">
                <h3>C. Financial & Repayment Strategy</h3>
                <div className="input-group mt-3">
                    <label className="input-label">Proposed Repayment Source</label>
                    <input className="input" value={repayment.source} onChange={e => setRepayment({ ...repayment, source: e.target.value })} />
                </div>
                <div className="input-group mt-3">
                    <label className="input-label">Risk Observation Notes</label>
                    <textarea className="input" value={repayment.notes} onChange={e => setRepayment({ ...repayment, notes: e.target.value })} />
                </div>
            </div>

            <div className="flex gap-3 mt-4">
                <button className="button button--secondary flex-1" onClick={handleSave}>Save Progress</button>
                <button className="button button--primary flex-1 bg-success border-success" onClick={() => onApproveStage1({ medicalInsights: medical, financialClarification: financial, repaymentStrategy: repayment, applicantBio: bio })}>
                    Approve Stage 1
                </button>
            </div>
        </div>
    )
}
