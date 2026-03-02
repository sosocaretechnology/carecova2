/**
 * Risk engine configuration — admin-editable thresholds.
 * Stored and retrieved from localStorage so admins can tune via Rules & Config.
 */

const RISK_CONFIG_KEY = 'carecova_risk_config'

export const DEFAULT_RISK_CONFIG = {
    // Affordability thresholds
    maxLoanToIncomeRatio: 5,          // loan amount / monthly income
    maxExpenseRatio: 0.8,             // expenses / income
    maxInstallmentToIncomePct: 35,    // max % of income for monthly installment
    warnInstallmentToIncomePct: 20,   // warning threshold

    // Risk scoring weights
    emergencyWeight: 20,
    activeLoansWeight: 15,
    unemployedWeight: 15,
    selfEmployedWeight: 5,
    largeAmountThreshold: 2000000,
    largeAmountWeight: 10,
    mediumAmountThreshold: 1000000,
    mediumAmountWeight: 5,
    incompleteLocationWeight: 15,
    highBurdenThreshold: 0.5,
    highBurdenWeight: 25,
    moderateBurdenThreshold: 0.35,
    moderateBurdenWeight: 15,
    guarantorReduction: 10,

    // Risk tier thresholds
    tierAMax: 35,     // 0–35 = Tier A (Low risk)
    tierBMax: 70,     // 36–70 = Tier B (Medium risk)
    // 71–100 = Tier C (High risk)

    // Interest rate
    interestRate: 0.025,   // per month

    // Repayment method priority by sector
    repaymentPriority: {
        government: ['payroll', 'direct_debit', 'bank_transfer', 'card'],
        private: ['direct_debit', 'bank_transfer', 'card'],
        'self-employed': ['bank_transfer', 'card'],
        default: ['bank_transfer', 'card'],
    },

    // Required documents per sector
    requiredDocsBySector: {
        government: ['treatment_estimate', 'id_document', 'payslip'],
        private: ['treatment_estimate', 'id_document', 'payslip'],
        'self-employed': ['treatment_estimate', 'id_document'],
        default: ['treatment_estimate', 'id_document'],
    },

    // Tenor options (months)
    tenorBuckets: [
        { label: '1–3 months', min: 1, max: 3 },
        { label: '3–6 months', min: 3, max: 6 },
        { label: '6–12 months', min: 6, max: 12 },
    ],

    // Commissions
    salesCommissionPct: 0.02,   // 2% for sales
}

export function getRiskConfig() {
    try {
        const stored = localStorage.getItem(RISK_CONFIG_KEY)
        if (stored) {
            return { ...DEFAULT_RISK_CONFIG, ...JSON.parse(stored) }
        }
    } catch (e) {
        console.error('Error reading risk config:', e)
    }
    return { ...DEFAULT_RISK_CONFIG }
}

export function saveRiskConfig(config) {
    try {
        localStorage.setItem(RISK_CONFIG_KEY, JSON.stringify(config))
    } catch (e) {
        console.error('Error saving risk config:', e)
    }
}

export function resetRiskConfig() {
    localStorage.removeItem(RISK_CONFIG_KEY)
    return { ...DEFAULT_RISK_CONFIG }
}
