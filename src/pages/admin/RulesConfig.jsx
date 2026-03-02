import { useState, useEffect } from 'react'
import { getRiskConfig, saveRiskConfig } from '../../data/riskConfig'

export default function RulesConfig() {
    const [config, setConfig] = useState(null)
    const [saving, setSaving] = useState(false)

    useEffect(() => {
        setConfig(getRiskConfig())
    }, [])

    const handleChange = (key, value) => {
        setConfig(prev => ({
            ...prev,
            [key]: Number(value)
        }))
    }

    const handleSave = async () => {
        setSaving(true)
        // Simulate network delay
        await new Promise(r => setTimeout(r, 600))
        saveRiskConfig(config)
        setSaving(false)
        alert('Business rules updated successfully. They will apply immediately to the risk engine.')
    }

    if (!config) return <div className="admin-loading">Loading rules...</div>

    return (
        <div className="admin-page">
            <div className="admin-page-header flex-between align-center">
                <div>
                    <h1>Rules & Configuration</h1>
                    <p>Manage risk thresholds, underwriting parameters, and policy rules.</p>
                </div>
                <button
                    className="button button--primary"
                    onClick={handleSave}
                    disabled={saving}
                >
                    {saving ? 'Saving...' : 'Save Configuration'}
                </button>
            </div>

            <div className="grid grid-cols-2 gap-4 mt-4" style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '24px' }}>
                <div className="detail-card">
                    <h2>Commercial & Commissions</h2>
                    <p className="text-sm text-muted mb-4">Payouts and revenue share parameters.</p>

                    <div className="input-group mb-4">
                        <label className="input-label">Sales Commission (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={config.salesCommissionPct * 100}
                            onChange={e => handleChange('salesCommissionPct', e.target.value / 100)}
                        />
                        <div className="text-xs text-muted mt-1">Percentage earned by Sales officers on successful loan disbursements.</div>
                    </div>

                    <div className="input-group mb-4">
                        <label className="input-label">Base Interest Rate (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={config.interestRate * 100}
                            onChange={e => handleChange('interestRate', e.target.value / 100)}
                        />
                    </div>
                </div>

                <div className="detail-card">
                    <h2>Affordability & Risk Thresholds</h2>
                    <p className="text-sm text-muted mb-4">These values directly impact the Affordability Checker tags and internal risk badges.</p>

                    <div className="input-group mb-4">
                        <label className="input-label">Max Installment to Income Ratio (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={config.maxLoanToIncomeRatio * 100}
                            onChange={e => handleChange('maxLoanToIncomeRatio', e.target.value / 100)}
                        />
                        <div className="text-xs text-muted mt-1">If monthly repayment exceeds this % of income, application is flagged "Not Affordable".</div>
                    </div>

                    <div className="input-group mb-4">
                        <label className="input-label">Max Expense to Income Ratio (%)</label>
                        <input
                            type="number"
                            className="input"
                            value={config.maxExpenseRatio * 100}
                            onChange={e => handleChange('maxExpenseRatio', e.target.value / 100)}
                        />
                        <div className="text-xs text-muted mt-1">If stated expenses exceed this % of income, creates a high severity risk flag.</div>
                    </div>
                </div>

                <div className="detail-card">
                    <h2>Risk Badge Scoring</h2>
                    <p className="text-sm text-muted mb-4">Score ranges that determine the overall Low/Medium/High risk badge.</p>

                    <div className="input-group mb-4">
                        <label className="input-label">High Risk Cutoff (Score &gt; X)</label>
                        <input
                            type="number"
                            className="input"
                            value={config.highRiskCutoff}
                            onChange={e => handleChange('highRiskCutoff', e.target.value)}
                        />
                        <div className="text-xs text-muted mt-1">Applications scoring above this are marked High Risk.</div>
                    </div>

                    <div className="input-group mb-4">
                        <label className="input-label">Medium Risk Cutoff (Score &gt; X)</label>
                        <input
                            type="number"
                            className="input"
                            value={config.mediumRiskCutoff}
                            onChange={e => handleChange('mediumRiskCutoff', e.target.value)}
                        />
                        <div className="text-xs text-muted mt-1">Applications scoring above this (but below high cutoff) are marked Medium Risk.</div>
                    </div>
                </div>
            </div>
        </div>
    )
}
