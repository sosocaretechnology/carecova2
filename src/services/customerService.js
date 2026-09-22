/**
 * customerService.js
 *
 * Builds Customer 360 profiles by aggregating CareCova loan applications.
 * Tries dedicated backend customer endpoints first; falls back to aggregating
 * from loan-application data so the page works today with zero backend changes.
 */

import { adminService } from './adminService'
import { auditService } from './auditService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''
const USE_BACKEND = !!API_BASE_URL
const ADMIN_STORAGE_KEY = 'carecova_admin_session'

function getStoredSession() {
  try {
    const s = localStorage.getItem(ADMIN_STORAGE_KEY)
    return s ? JSON.parse(s) : null
  } catch { return null }
}

async function adminRequest(path, options = {}) {
  const session = getStoredSession()
  const token = session?.accessToken
  if (!token) throw new Error('Not authenticated')
  const resp = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })
  if (!resp.ok) {
    const body = await resp.json().catch(() => ({}))
    throw new Error(body?.message || `Request failed (${resp.status})`)
  }
  return resp.json()
}

// ── helpers ──────────────────────────────────────────────────────────────────

function normalisePhone(raw) {
  if (!raw) return ''
  return String(raw).replace(/\D/g, '').replace(/^234/, '0').slice(-11)
}

function maskBvn(bvn) {
  if (!bvn) return '—'
  const s = String(bvn)
  return s.slice(0, 3) + '****' + s.slice(-4)
}

function maskNin(nin) {
  if (!nin) return '—'
  const s = String(nin)
  return s.slice(0, 2) + '******' + s.slice(-3)
}

function maskAccount(acct) {
  if (!acct) return '—'
  const s = String(acct)
  return s.slice(0, 3) + '****' + s.slice(-3)
}

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

/**
 * Derive a lightweight customer profile from a list of that customer's loans.
 * Uses the most recent loan for personal/financial data; aggregates all for history.
 */
function buildProfileFromLoans(loans) {
  if (!loans.length) return null

  const sorted = [...loans].sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  const latest = sorted[0]

  // ── identity ────────────────────────────────────────────────────────────
  const phone = normalisePhone(latest.phone)
  const fullName = latest.fullName || latest.patientName || '—'
  const email = latest.email || '—'

  // ── mono: pick from loan with most complete Mono data ───────────────────
  const monoLoan = sorted.find(l => l.monoAccountId) || latest
  const hasMonoConnection = sorted.some(l => l.monoConnectionStatus === 'linked' || l.monoAccountId)

  // ── identity verification ─────────────────────────────────────────────
  const identityVerified = sorted.some(l => l.verificationStatus?.identity === 'verified')
  const creditChecked = sorted.some(l => l.verificationStatus?.credit === 'verified')

  // ── financials: pick from the best source ─────────────────────────────
  const income = monoLoan.monoIncomeProfile?.estimatedMonthly
    || monoLoan.monoAssessmentSnapshot?.income?.estimatedMonthlyIncome
    || latest.monthlyIncome
    || 0

  const disposable = monoLoan.monoAssessmentSnapshot?.affordability?.estimatedDisposableIncome
    || monoLoan.geminiInsights?.preScreen?.disposableIncome
    || 0

  // ── credit exposure ────────────────────────────────────────────────────
  const activeLoans = loans.filter(l => ['active', 'approved'].includes(l.status))
  const outstandingBalance = activeLoans.reduce((s, l) => s + (l.outstandingBalance || 0), 0)
  const totalCreditLimit = activeLoans.reduce((s, l) => s + (l.approvedAmount || 0), 0)

  // ── last sync ──────────────────────────────────────────────────────────
  const lastMonoSync = monoLoan.monoLinkedAt || monoLoan.monoConnectEmailSentAt || null

  // ── KYC status ────────────────────────────────────────────────────────
  let kycStatus = 'not_started'
  const anyVerification = sorted.find(l => l.verificationStatus)
  if (anyVerification) {
    const vs = anyVerification.verificationStatus
    const allVerified = ['identity', 'credit', 'banking'].every(k => vs[k] === 'verified')
    const anyVerified = ['identity', 'credit', 'banking'].some(k => vs[k] === 'verified')
    if (allVerified) kycStatus = 'verified'
    else if (anyVerified) kycStatus = 'partial'
    else kycStatus = 'pending'
  }

  return {
    // identity
    id: phone,                   // used as URL param
    phone,
    fullName,
    email,
    dateOfBirth: latest.dateOfBirth || null,
    gender: latest.gender || null,
    bvn: latest.bvn || null,
    bvnMasked: maskBvn(latest.bvn),
    nin: latest.nin || null,
    ninMasked: maskNin(latest.nin),
    // location
    state: latest.state || null,
    lga: latest.lga || null,
    city: latest.city || null,
    homeAddress: latest.homeAddress || null,
    // employment
    employmentType: latest.employmentType || null,
    employmentSector: latest.employmentSector || null,
    employerName: latest.employerName || null,
    jobTitle: latest.jobTitle || null,
    employmentDuration: latest.employmentDuration || null,
    declaredMonthlyIncome: latest.monthlyIncome || null,
    declaredMonthlyExpenses: latest.monthlyExpenses || null,
    // verification
    kycStatus,
    identityVerified,
    creditChecked,
    verificationStatus: anyVerification?.verificationStatus || {},
    // mono / bank
    hasMonoConnection,
    monoAccountId: monoLoan.monoAccountId || null,
    monoConnectionStatus: monoLoan.monoConnectionStatus || 'not_started',
    monoLinkedAt: monoLoan.monoLinkedAt || null,
    monoIncomeProfile: monoLoan.monoIncomeProfile || null,
    monoAssessmentSnapshot: monoLoan.monoAssessmentSnapshot || null,
    monoCreditworthinessCache: monoLoan.monoCreditworthinessCache || null,
    monoCreditScore: monoLoan.monoCreditScore || null,
    // financial summary
    estimatedMonthlyIncome: income,
    estimatedDisposableIncome: disposable,
    // credit exposure
    activeLoansCount: activeLoans.length,
    outstandingBalance,
    totalCreditLimit,
    // metadata
    firstApplicationDate: sorted[sorted.length - 1]?.submittedAt || null,
    lastApplicationDate: latest.submittedAt || null,
    lastMonoSync,
    totalApplications: loans.length,
    // source data
    latestLoan: latest,
    loans: sorted,
  }
}

// ── circuit-breaker: skip the /admin/customers endpoint once it's confirmed absent ──
let _customersEndpointAvailable = true

// ── exported service ─────────────────────────────────────────────────────────

export const customerService = {

  /**
   * Returns a list of unique customers derived from all loan applications.
   * Tries GET /admin/customers first; falls back to aggregating from loans.
   */
  async getCustomers() {
    // 1. Try dedicated backend endpoint (skipped after first 404/failure)
    if (_customersEndpointAvailable && USE_BACKEND && getStoredSession()?.accessToken) {
      try {
        const data = await adminRequest('/admin/customers')
        if (Array.isArray(data) && data.length > 0) return data
      } catch (_) {
        _customersEndpointAvailable = false
      }
    }

    // 2. Aggregate from loan applications
    const loans = await adminService.getAllLoans()
    const byPhone = new Map()
    for (const loan of loans) {
      const phone = normalisePhone(loan.phone)
      if (!phone) continue
      if (!byPhone.has(phone)) byPhone.set(phone, [])
      byPhone.get(phone).push(loan)
    }

    const customers = []
    for (const [, cLoans] of byPhone) {
      const profile = buildProfileFromLoans(cLoans)
      if (profile) customers.push(profile)
    }

    return customers.sort((a, b) => new Date(b.lastApplicationDate) - new Date(a.lastApplicationDate))
  },

  /**
   * Returns the full Customer 360 profile for a given phone-number ID.
   */
  async getCustomerById(phoneId) {
    const phone = normalisePhone(phoneId)

    // 1. Try dedicated backend endpoint (skipped after first 404/failure)
    if (_customersEndpointAvailable && USE_BACKEND && getStoredSession()?.accessToken) {
      try {
        const data = await adminRequest(`/admin/customers/${encodeURIComponent(phone)}`)
        if (data) {
          const loans = Array.isArray(data.loans) ? data.loans : await adminService.getAllLoans()
          const customerLoans = loans.filter(l => normalisePhone(l.phone) === phone)
          return { ...buildProfileFromLoans(customerLoans), ...data }
        }
      } catch (_) {
        _customersEndpointAvailable = false
      }
    }

    // 2. Aggregate from loan applications
    const allLoans = await adminService.getAllLoans()
    const customerLoans = allLoans.filter(l => normalisePhone(l.phone) === phone)
    if (!customerLoans.length) throw new Error('Customer not found')
    return buildProfileFromLoans(customerLoans)
  },

  /**
   * Returns all loans for a customer, sorted newest first.
   */
  async getCustomerLoans(phoneId) {
    const phone = normalisePhone(phoneId)
    const allLoans = await adminService.getAllLoans()
    return allLoans
      .filter(l => normalisePhone(l.phone) === phone)
      .sort((a, b) => new Date(b.submittedAt) - new Date(a.submittedAt))
  },

  /**
   * Returns all repayment schedule entries across a customer's loans.
   */
  async getCustomerRepayments(phoneId) {
    const loans = await customerService.getCustomerLoans(phoneId)
    const repayments = []
    for (const loan of loans) {
      if (!Array.isArray(loan.repaymentSchedule)) continue
      for (const r of loan.repaymentSchedule) {
        repayments.push({
          ...r,
          loanId: loan.id,
          patientName: loan.fullName || loan.patientName,
          hospital: loan.hospital || loan.hospitalName,
          loanStatus: loan.status,
          approvedAmount: loan.approvedAmount,
        })
      }
    }
    return repayments.sort((a, b) => new Date(b.dueDate || 0) - new Date(a.dueDate || 0))
  },

  /**
   * Returns Mono transactions from the most recent loan that has them.
   */
  async getCustomerTransactions(phoneId) {
    const loans = await customerService.getCustomerLoans(phoneId)
    for (const loan of loans) {
      const txs = loan.monoInformedDecisionCache?.sections?.transactions?.transactions
        || loan.transactions
      if (Array.isArray(txs) && txs.length > 0) {
        return { loanId: loan.id, transactions: txs, retrievedAt: loan.monoLinkedAt }
      }
    }
    return { loanId: null, transactions: [], retrievedAt: null }
  },

  /**
   * Returns financial analysis from the most recent loan that has Gemini data.
   */
  async getCustomerFinancialAnalysis(phoneId) {
    const loans = await customerService.getCustomerLoans(phoneId)
    for (const loan of loans) {
      if (loan.geminiInsights?.preScreen || loan.analysis?.geminiNarrative) {
        return {
          loanId: loan.id,
          preScreen: loan.geminiInsights?.preScreen || null,
          narrative: loan.analysis?.geminiNarrative || null,
          assessmentSnapshot: loan.monoAssessmentSnapshot || null,
          analyzedAt: loan.geminiInsights?.preScreenAt || loan.monoLinkedAt || null,
        }
      }
    }
    return null
  },

  /**
   * Returns identity/KYC verification data from the most recent loan.
   */
  async getCustomerIdentity(phoneId) {
    const loans = await customerService.getCustomerLoans(phoneId)
    const loan = loans[0]
    if (!loan) return null
    return {
      bvn: loan.bvn || null,
      bvnMasked: maskBvn(loan.bvn),
      nin: loan.nin || null,
      ninMasked: maskNin(loan.nin),
      dateOfBirth: loan.dateOfBirth || null,
      verificationStatus: loan.verificationStatus || {},
      firstCentralResult: loan.firstCentralResult || null,
      firstCentralCheckedAt: loan.firstCentralCheckedAt || null,
    }
  },

  /**
   * Returns Mono bank account data from the most recent linked loan.
   */
  async getCustomerBankAccounts(phoneId) {
    const loans = await customerService.getCustomerLoans(phoneId)
    const accounts = []
    const seen = new Set()
    for (const loan of loans) {
      if (!loan.monoAccountId) continue
      if (seen.has(loan.monoAccountId)) continue
      seen.add(loan.monoAccountId)
      const profile = loan.monoIncomeProfile || {}
      accounts.push({
        loanId: loan.id,
        monoAccountId: loan.monoAccountId,
        accountName: profile.accountName || loan.fullName || loan.patientName || '—',
        accountNumber: maskAccount(profile.accountNumber || profile.account_number),
        bankName: profile.institution?.name || profile.bankName || '—',
        currency: profile.currency || 'NGN',
        balance: profile.balance || null,
        connectionStatus: loan.monoConnectionStatus || 'linked',
        linkedAt: loan.monoLinkedAt || null,
        creditworthiness: loan.monoCreditworthinessCache || null,
        creditScore: loan.monoCreditScore || null,
        directDebit: loan.monoDirectDebit || null,
      })
    }
    return accounts
  },

  /**
   * Record a customer-profile view in the audit log.
   */
  recordView(phoneId, adminName) {
    auditService.record('customer_profile_viewed', {
      adminName,
      message: `Customer profile viewed: ${phoneId}`,
    })
  },

  // Expose helpers for use in UI
  maskBvn,
  maskNin,
  maskAccount,
  fmt,
  fmtDate,
  normalisePhone,
}
