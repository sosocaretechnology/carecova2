/**
 * Client-side risk scoring for MVP.
 * Backend will replace this in production.
 * Returns: riskScore (0-100), riskTier (A/B/C), riskReasons, riskRecommendation.
 */

import { getRiskConfig } from '../data/riskConfig'

function getMonthlyRepayment(requestedAmount, tenorMonths) {
  const config = getRiskConfig()
  const rate = config.lendingInterestRatePerMonth ?? config.interestRate ?? 0.05
  const total = requestedAmount * (1 + rate * tenorMonths)
  return total / tenorMonths
}

function tenorToMonths(tenor) {
  if (typeof tenor === 'number') return tenor
  const map = { '1': 1, '2': 2, '3-4': 4, '6': 6, '12': 12 }
  return map[tenor] || 6
}

function incomeToNumber(income) {
  if (typeof income === 'number' && income > 0) return income
  if (typeof income === 'string') {
    const num = parseFloat(income.replace(/[^0-9.]/g, ''))
    if (!isNaN(num)) return num
  }
  // Income range: e.g. "100000-500000" or "100-500k"
  if (typeof income === 'string' && income.includes('-')) {
    const parts = income.split('-').map((s) => parseFloat(s.replace(/[^0-9.]/g, '')))
    const valid = parts.filter((n) => !isNaN(n))
    if (valid.length) return Math.max(...valid) * 0.6
  }
  return 0
}

/**
 * @param {Object} app - Submitted application (flat or nested)
 * @returns {{ riskScore: number, riskTier: string, riskReasons: string[], riskRecommendation: string }}
 */
export function computeRiskScore(app) {
  const reasons = []
  let score = 0

  const state = app.state || app.locationState || ''
  const lga = app.lga || ''
  const city = app.city || app.cityTown || ''
  const address = app.homeAddress || app.address || ''
  const urgency = (app.urgency || '').toLowerCase()
  const employmentType = (app.employmentType || '').toLowerCase()
  const hasActiveLoans = app.hasActiveLoans === true || app.hasActiveLoans === 'yes'
  const activeLoansRepayment = parseFloat(app.activeLoansMonthlyRepayment) || 0
  const addGuarantor = app.addGuarantor === true || app.addGuarantor === 'yes'
  const requestedAmount = parseFloat(app.requestedAmount || app.estimatedCost) || 0
  const tenor = tenorToMonths(app.preferredTenor || app.preferredDuration)
  const monthlyIncome = incomeToNumber(app.monthlyIncome || app.monthlyIncomeRange)

  // Location completeness (0–15): missing = risk
  if (!state || !lga || !city || !address) {
    score += 15
    reasons.push('Incomplete location (State/LGA/City/Address)')
  }

  // Urgency (0–20): emergency = higher risk
  if (urgency === 'emergency') {
    score += 20
    reasons.push('Emergency request')
  } else if (urgency.includes('week')) {
    score += 10
    reasons.push('Short-term urgency')
  }

  // Repayment burden (0–25): DTI-like
  const monthlyRepayment = getMonthlyRepayment(requestedAmount, tenor)
  const totalObligation = monthlyRepayment + (hasActiveLoans ? activeLoansRepayment : 0)
  if (monthlyIncome > 0) {
    const ratio = totalObligation / monthlyIncome
    if (ratio > 0.5) {
      score += 25
      reasons.push('High repayment burden')
    } else if (ratio > 0.35) {
      score += 15
      reasons.push('Moderate repayment burden')
    }
  } else {
    score += 10
    reasons.push('Income not provided')
  }

  // Active loans (0–15)
  if (hasActiveLoans) {
    score += 15
    reasons.push('Active loans: Yes')
  }

  // Employment stability (0–15)
  if (employmentType === 'unemployed' || employmentType === 'student') {
    score += 15
    reasons.push('Unemployed or student')
  } else if (employmentType === 'self-employed') {
    score += 5
  }

  // Guarantor (reduces risk: -10)
  if (addGuarantor) {
    score = Math.max(0, score - 10)
    if (!reasons.includes('Guarantor provided')) reasons.push('Guarantor provided')
  }

  // Amount size (0–10): larger = more risk
  if (requestedAmount > 2000000) {
    score += 10
    reasons.push('Large loan amount')
  } else if (requestedAmount > 1000000) {
    score += 5
  }

  score = Math.min(100, Math.round(score))

  // Tier: 0–35 A, 36–70 B, 71–100 C
  let tier = 'A'
  if (score > 70) tier = 'C'
  else if (score > 35) tier = 'B'

  // Before final recommendation: if ID document not provided, request documents first
  const hasIdDocument = app.documents && app.documents.id_document && (app.documents.id_document.fileName || app.documents.id_document)
  let recommendation = 'Approve'
  if (!hasIdDocument) {
    recommendation = 'Request documents'
    if (!reasons.includes('ID document not provided')) reasons.push('ID document not provided')
  } else if (tier === 'B') {
    recommendation = 'Request documents'
  } else if (tier === 'C') {
    recommendation = 'Manual review'
  }

  return {
    riskScore: score,
    riskTier: tier,
    riskReasons: reasons.slice(0, 5),
    riskRecommendation: recommendation,
  }
}
