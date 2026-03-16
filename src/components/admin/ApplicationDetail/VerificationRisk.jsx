import { useState, useEffect } from 'react'
import MonoConnectionCard from './MonoConnectionCard'

export default function VerificationRisk({
    loan,
    onInitiateMonoConnect,
    onRefreshMonoStatus,
    monoInitiating = false,
    monoRefreshing = false,
    monoFeedbackMessage = '',
    monoFeedbackError = '',
}) {
    // Add feature flag for Mock/Simulation mode
    const [isDevMode, setIsDevMode] = useState(true);

    // Mock external verification states local to this UI for demo
    const [extStatus, setExtStatus] = useState({
        identity: loan.verificationStatus?.identity || 'Pending',
        credit: loan.verificationStatus?.credit || 'Pending',
        banking: loan.verificationStatus?.banking || 'Pending',
        payroll: loan.verificationStatus?.payroll || 'Not run'
    })

    // Set default payroll to not run if not applicable
    useEffect(() => {
        const sector = loan.employmentSector || loan.employmentType;
        if (sector !== 'government' && extStatus.payroll === 'Pending') {
            setExtStatus(s => ({ ...s, payroll: 'N/A' }))
        }
    }, [loan])

    const handleSimulate = (key, value) => {
        if (!isDevMode) return;
        setExtStatus(prev => ({ ...prev, [key]: value }))
    }

    const { affordability, riskFlags } = loan

    // Helper for Repayment Security layer logic
    const sector = loan.employmentSector || loan.employmentType;
    const isGov = sector === 'government';
    const isPrivate = sector === 'private';

    // Safely extract risk metrics
    const internalMetrics = loan.internalRiskMetrics || loan.affordability || {};
    const dtiPct = internalMetrics.affordabilityRatio ? Math.round(internalMetrics.affordabilityRatio * 100) : (affordability?.installmentToIncomePct || 0);

    return (
        <div className="detail-column column-verification bg-sage-light">
            <MonoConnectionCard
                loan={loan}
                initiating={monoInitiating}
                refreshing={monoRefreshing}
                onInitiate={onInitiateMonoConnect}
                onRefresh={onRefreshMonoStatus}
                feedbackMessage={monoFeedbackMessage}
                feedbackError={monoFeedbackError}
            />

            <div className="detail-section-title">Internal Checkers (System Computed)</div>

            <div className="detail-card border-left-primary">
                <h2>Repayment Security & Route</h2>
                <div className="route-path" style={{ marginBottom: '10px' }}>
                    <div className="route-step">
                        <div className="route-label">Sector</div>
                        <div className="route-value capitalize font-bold">{sector || 'Unknown'}</div>
                    </div>
                    <div className="route-arrow">→</div>
                    <div className="route-step">
                        <div className="route-label">Primary Route</div>
                        <div className="route-value font-bold text-primary">
                            {isGov ? 'Salary Deduction' : isPrivate ? 'Bank Direct Debit' : 'Card / Direct Debit'}
                        </div>
                    </div>
                </div>

                <div style={{ background: '#f8fafc', padding: '10px', borderRadius: '4px', fontSize: '0.85rem' }}>
                    <strong>Security Policy:</strong>
                    {isGov ? (
                        <p style={{ margin: '4px 0 0 0' }}>Salary deduction is primary; no collateral required.</p>
                    ) : isPrivate ? (
                        <p style={{ margin: '4px 0 0 0' }}>Bank debit is primary; co-borrower recommended for higher risk.</p>
                    ) : (
                        <p style={{ margin: '4px 0 0 0' }}>Bank debit/card primary; collateral or guarantor strictly required.</p>
                    )}
                </div>

                <div className="text-xs text-muted mt-3">
                    <strong>User requested method:</strong> <span className="capitalize">{loan.repaymentMethod?.replace('_', ' ') || 'Unknown'}</span>
                </div>

                <div className="security-placeholders" style={{ marginTop: '15px', borderTop: '1px solid #e2e8f0', paddingTop: '10px' }}>
                    <h4 style={{ fontSize: '0.8rem', margin: '0 0 5px 0', textTransform: 'uppercase', color: '#64748b' }}>Secondary Security</h4>
                    <div style={{ display: 'flex', gap: '8px', fontSize: '0.8rem' }}>
                        <span className={`badge ${loan.coBorrower ? 'badge-success' : 'badge-neutral'}`}>
                            {loan.coBorrower ? '✓ Co-Borrower Present' : 'No Co-Borrower'}
                        </span>
                        <span className="badge badge-neutral">No Collateral</span>
                        <span className="badge badge-neutral">No Verifiable Income Evidence</span>
                    </div>
                </div>
            </div>

            <div className="detail-card border-left-indicator">
                <div className="flex-between">
                    <h2>Affordability Assessment</h2>
                    <span className={`affordability-tag ${internalMetrics.riskLevel === 'HIGH' ? 'tight' : internalMetrics.riskLevel === 'MEDIUM' ? 'fair' : 'comfortable'}`}>
                        {internalMetrics.riskLevel || 'Unknown'}
                    </span>
                </div>

                <div className="metrics-list mt-3">
                    <div className="metric-row">
                        <div className="metric-labels">
                            <span>Installment to Income (DTI)</span>
                            <span className="font-bold">{dtiPct}%</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className={`progress-fill ${dtiPct > 35 ? 'danger' : dtiPct > 20 ? 'warning' : 'success'}`}
                                style={{ width: `${Math.min(100, dtiPct)}%` }}
                            />
                        </div>
                        <div className="text-xs text-muted mt-1">Est. ₦{(internalMetrics.estimatedInstallment || 0).toLocaleString()}/mo vs ₦{((loan.monthlyIncome || 0)).toLocaleString()} income</div>
                    </div>

                    <div className="metric-row mt-3">
                        <div className="metric-labels">
                            <span>Expense to Income</span>
                            <span className="font-bold">{loan.monthlyIncome ? Math.round(((loan.monthlyExpenses || 0) / loan.monthlyIncome) * 100) : 0}%</span>
                        </div>
                        <div className="progress-bar">
                            <div
                                className={`progress-fill ${((loan.monthlyExpenses || 0) / (loan.monthlyIncome || 1)) > 0.8 ? 'danger' : ((loan.monthlyExpenses || 0) / (loan.monthlyIncome || 1)) > 0.6 ? 'warning' : 'success'}`}
                                style={{ width: `${Math.min(100, ((loan.monthlyExpenses || 0) / (loan.monthlyIncome || 1)) * 100)}%` }}
                            />
                        </div>
                        <div className="text-xs text-muted mt-1">Stated expenses: ₦{(loan.monthlyExpenses || 0).toLocaleString()}</div>
                    </div>
                </div>
            </div>

            <div className="detail-card">
                <h2>Internal Risk Flags</h2>
                {(!internalMetrics.riskReasons || internalMetrics.riskReasons.length === 0) ? (
                    <div className="text-success font-medium text-sm flex items-center gap-2">
                        <span>✓</span> No internal risk flags triggered
                    </div>
                ) : (
                    <div className="flags-list">
                        {internalMetrics.riskReasons.map((flag, idx) => (
                            <div key={idx} className={`alert-box alert-${internalMetrics.riskLevel === 'HIGH' ? 'error' : 'warning'}`}>
                                {internalMetrics.riskLevel === 'HIGH' ? '⚠️' : 'ℹ️'} {flag}
                            </div>
                        ))}
                    </div>
                )}
            </div>

            {/* EXTERNAL API SIMULATORS */}
            <div className="detail-section-title mt-6 flex-between">
                <span>External Verification (Mock APIs)</span>
                <label style={{ fontSize: '0.7rem', display: 'flex', alignItems: 'center', gap: '5px', cursor: 'pointer' }}>
                    <input type="checkbox" checked={isDevMode} onChange={e => setIsDevMode(e.target.checked)} />
                    Dev Toggle
                </label>
            </div>

            <div className={`detail-card external-checkers ${!isDevMode ? 'opacity-70' : ''}`}>
                <div className="mock-checker-row">
                    <div className="checker-info">
                        <div className="checker-name">Dojah KYC</div>
                        <div className="checker-desc">Identity & BVN match</div>
                    </div>
                    <select
                        className={`checker-select status-${extStatus.identity.toLowerCase()}`}
                        value={extStatus.identity}
                        onChange={(e) => handleSimulate('identity', e.target.value)}
                        disabled={!isDevMode}
                    >
                        <option value="Pending">Pending</option>
                        <option value="Passed">Passed</option>
                        <option value="Failed">Failed</option>
                    </select>
                </div>

                <div className="mock-checker-row">
                    <div className="checker-info">
                        <div className="checker-name">FirstCentral</div>
                        <div className="checker-desc">Credit bureau check</div>
                    </div>
                    <select
                        className={`checker-select status-${extStatus.credit.toLowerCase()}`}
                        value={extStatus.credit}
                        onChange={(e) => handleSimulate('credit', e.target.value)}
                        disabled={!isDevMode}
                    >
                        <option value="Pending">Pending</option>
                        <option value="Good">Good Standing</option>
                        <option value="Poor">Poor History</option>
                        <option value="No History">No History</option>
                    </select>
                </div>

                <div className="mock-checker-row">
                    <div className="checker-info">
                        <div className="checker-name">Mono</div>
                        <div className="checker-desc">Bank statement analysis</div>
                    </div>
                    <select
                        className={`checker-select status-${extStatus.banking.toLowerCase()}`}
                        value={extStatus.banking}
                        onChange={(e) => handleSimulate('banking', e.target.value)}
                        disabled={!isDevMode}
                    >
                        <option value="Pending">Pending</option>
                        <option value="Consistent">Income Matched</option>
                        <option value="Inconsistent">Inconsistent</option>
                        <option value="Failed">Failed connect</option>
                    </select>
                </div>

                <div className="mock-checker-row">
                    <div className="checker-info">
                        <div className="checker-name">Remita</div>
                        <div className="checker-desc">Federal payroll check</div>
                    </div>
                    <select
                        className={`checker-select status-${extStatus.payroll.toLowerCase().replace(' ', '-')}`}
                        value={extStatus.payroll}
                        onChange={(e) => handleSimulate('payroll', e.target.value)}
                        disabled={!isDevMode || (!isGov && loan.employmentType !== 'salaried')}
                    >
                        <option value="Not run">Not run</option>
                        <option value="N/A">N/A</option>
                        <option value="Pending">Pending</option>
                        <option value="Verified">Verified</option>
                        <option value="Not Found">Not Found</option>
                    </select>
                </div>
            </div>
        </div>
    )
}
