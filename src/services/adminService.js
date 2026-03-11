import { loanService } from './loanService'
import { trackingService } from './trackingService'
import { auditService } from './auditService'
import { getRiskConfig } from '../data/riskConfig'
import { computeSchedule } from '../utils/lendingEngine'
import * as commissionService from './commissionService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''
const USE_BACKEND = !!API_BASE_URL

const ADMIN_STORAGE_KEY = 'carecova_admin_session'
const USERS_STORAGE_KEY = 'carecova_admin_users'
const TRANSACTIONS_STORAGE_KEY = 'carecova_transactions'
const WALLET_STORAGE_KEY = 'carecova_org_wallet'

const INITIAL_USERS = {
  'admin': { username: 'admin', password: 'admin123', role: 'admin', name: 'Super Admin', status: 'active' },
  'sales1': { username: 'sales1', password: 'sales123', role: 'sales', name: 'John Sales', status: 'active' },
  'sales2': { username: 'sales2', password: 'sales2123', role: 'sales', name: 'Jane Sales', status: 'active' },
  'support': { username: 'support', password: 'support123', role: 'support', name: 'CS Support', status: 'active' },
  'credit1': { username: 'credit1', password: 'credit123', role: 'credit_officer', name: 'Credit Officer 1', status: 'active' },
}

function getUsers() {
  try {
    const stored = localStorage.getItem(USERS_STORAGE_KEY)
    const base = stored ? JSON.parse(stored) : {}
    // Ensure all initial demo users always exist (non-destructive merge)
    Object.keys(INITIAL_USERS).forEach((key) => {
      if (!base[key]) {
        base[key] = INITIAL_USERS[key]
      }
    })
    return base
  } catch {
    return INITIAL_USERS
  }
}

function saveUsers(users) {
  localStorage.setItem(USERS_STORAGE_KEY, JSON.stringify(users))
}

function getTransactions() {
  try {
    const stored = localStorage.getItem(TRANSACTIONS_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch {
    return []
  }
}

function saveTransactions(txs) {
  localStorage.setItem(TRANSACTIONS_STORAGE_KEY, JSON.stringify(txs))
}

function getWallet() {
  try {
    const stored = localStorage.getItem(WALLET_STORAGE_KEY)
    return stored ? JSON.parse(stored) : { balance: 0, currency: 'NGN' }
  } catch {
    return { balance: 0, currency: 'NGN' }
  }
}

function saveWallet(wallet) {
  localStorage.setItem(WALLET_STORAGE_KEY, JSON.stringify(wallet))
}

function getStoredSession() {
  try {
    const stored = localStorage.getItem(ADMIN_STORAGE_KEY)
    return stored ? JSON.parse(stored) : null
  } catch {
    return null
  }
}

function saveSession(session) {
  if (session) localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session))
}

function clearSession() {
  localStorage.removeItem(ADMIN_STORAGE_KEY)
}

async function parseResponseBody(response) {
  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()
  return { isJson, body }
}

function getResponseMessage(body, isJson, fallback = 'Request failed') {
  return (isJson && (Array.isArray(body?.message) ? body.message.join(', ') : body?.message)) || (typeof body === 'string' ? body : fallback)
}

async function adminRequest(path, options = {}) {
  const session = getStoredSession()
  const token = session?.accessToken
  if (!token) throw new Error('Not authenticated')

  const response = await fetch(`${API_ROOT}${path}`, {
    ...options,
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${token}`,
      ...(options.headers || {}),
    },
  })

  const { isJson, body } = await parseResponseBody(response)
  if (!response.ok) {
    if (response.status === 401) {
      clearSession()
      throw new Error('Session expired. Please sign in again.')
    }
    throw new Error(getResponseMessage(body, isJson))
  }
  return body
}

function normalizeLoanFromApi(loan) {
  if (!loan) return loan
  return {
    ...loan,
    id: loan.id || loan._id,
    patientName: loan.patientName || loan.fullName,
    fullName: loan.fullName || loan.patientName,
    hospital: loan.hospital || loan.hospitalName || '—',
    estimatedCost: loan.estimatedCost ?? loan.requestedAmount ?? 0,
    submittedAt: loan.submittedAt || loan.createdAt,
  }
}

export const adminService = {
  login: async (username, password) => {
    if (USE_BACKEND) {
      try {
        const response = await fetch(`${API_ROOT}/admins/auth/login`, {
          method: 'POST',
          headers: { 'Content-Type': 'application/json' },
          body: JSON.stringify({ usernameOrEmail: username, password }),
        })
        const { isJson, body } = await parseResponseBody(response)
        if (!response.ok) throw new Error(getResponseMessage(body, isJson, 'Invalid credentials'))

        const admin = body.admin || {}
        const session = {
          loggedIn: true,
          loginTime: new Date().toISOString(),
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
          admin,
          username: admin.username || username,
          role: admin.role || 'admin',
          name: admin.name || admin.username || username,
        }
        saveSession(session)
        auditService.record('login', { adminName: session.name, role: session.role })
        return { username: session.username, role: session.role, name: session.name, loggedIn: true, loginTime: session.loginTime }
      } catch (err) {
        if (err.message?.includes('credentials') || err.message?.includes('401') || err.message?.includes('Failed to fetch')) {
          throw err
        }
      }
    }

    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const users = getUsers()
        const user = users[username]
        if (user && user.password === password) {
          if (user.status === 'suspended') {
            reject(new Error('Account suspended'))
            return
          }
          const session = {
            username: user.username,
            role: user.role,
            name: user.name,
            loggedIn: true,
            loginTime: new Date().toISOString(),
          }
          localStorage.setItem(ADMIN_STORAGE_KEY, JSON.stringify(session))
          auditService.record('login', { adminName: user.name, role: user.role })
          resolve(session)
        } else {
          reject(new Error('Invalid credentials'))
        }
      }, 500)
    })
  },

  logout: async () => {
    const session = getStoredSession()
    auditService.record('logout', { adminName: session?.name || session?.admin?.username || 'admin' })
    if (USE_BACKEND && session?.accessToken) {
      try {
        await fetch(`${API_ROOT}/admins/auth/logout`, {
          method: 'POST',
          headers: {
            'Content-Type': 'application/json',
            Authorization: `Bearer ${session.accessToken}`,
          },
          body: JSON.stringify({ refreshToken: session.refreshToken }),
        })
      } catch (_) {}
    }
    clearSession()
  },

  getSession: () => {
    const s = getStoredSession()
    if (!s) return null
    if (s.username !== undefined) return s
    return {
      username: s.admin?.username ?? s.username,
      role: s.admin?.role ?? 'admin',
      name: s.admin?.name ?? s.admin?.username ?? 'Admin',
      loggedIn: s.loggedIn,
      loginTime: s.loginTime,
    }
  },

  isAuthenticated: () => adminService.getSession() !== null,

  debitWallet: async () => {
    throw new Error('Wallet API not configured for local mode')
  },

  getAllLoans: async () => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      try {
        const list = await adminRequest('/admin/loan-applications')
        const loans = (Array.isArray(list) ? list : list?.content ?? list?.data ?? []).map(normalizeLoanFromApi)
        const local = await loanService.getAllApplications()
        const merged = loans.map((b) => {
          const loc = local.find((l) => l.id === b.id)
          return loc ? { ...b, ...loc } : b
        })
        const localOnly = local.filter((l) => !loans.some((b) => b.id === l.id))
        return [...merged, ...localOnly]
      } catch (_) {}
    }
    return loanService.getAllApplications()
  },

  getLoanById: async (loanId) => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      try {
        const loan = await adminRequest(`/admin/loan-applications/${loanId}`)
        const normalized = normalizeLoanFromApi(loan)
        const local = await loanService.getApplication(loanId).catch(() => null)
        return local ? { ...normalized, ...local } : normalized
      } catch (_) {}
    }
    return loanService.getApplication(loanId)
  },

  initiateMonoConnectForLoan: async () => {
    throw new Error('Mono connect not configured for local mode')
  },

  getMonoInformedDecisionForLoan: async () => {
    throw new Error('Mono informed decision not configured for local mode')
  },

  getWallets: async () => [],
  getWalletOverview: async () => ({ totalBalance: 0, currency: 'NGN' }),
  getWalletTransactions: async () => [],
  getWalletStatement: async () => ({ entries: [] }),
  fundWallet: async () => {},
  fundOrganizationWallet: async () => {},

  getMonoInformedDecisionSectionForLoan: async () => {
    throw new Error('Mono informed decision section not configured for local mode')
  },

  // Dashboard KPIs
  getKPIs: async () => {
    const session = adminService.getSession()
    if (!session) return null

    let loans = await loanService.getAllApplications()

    // Filter by portfolio for sales
    if (session.role === 'sales') {
      loans = loans.filter(l => l.assignedTo === session.username)
    }

    const now = new Date()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const newToday = loans.filter(l => new Date(l.submittedAt) >= oneDayAgo).length
    const newWeek = loans.filter(l => new Date(l.submittedAt) >= sevenDaysAgo).length

    // Detailed KPI counts — support both old and new status strings
    const newApplications = loans.filter(l => ['pending', 'pending_stage1'].includes(l.status) && new Date(l.submittedAt) >= oneDayAgo).length
    const pendingReview = loans.filter(l => ['pending', 'pending_stage1'].includes(l.status)).length
    const awaitingDocuments = loans.filter(l => ['incomplete', 'need_more_info'].includes(l.status)).length
    const readyToDisburse = loans.filter(l => ['approved', 'pending_disbursement'].includes(l.status)).length
    const activeLoansCount = loans.filter(l => l.status === 'active').length

    const stage1Approved = loans.filter(l => ['stage_2_review', 'pending_credit_review'].includes(l.status)).length
    const disbursed = loans.filter(l => ['active', 'completed'].includes(l.status)).length
    const totalDisbursedAmount = loans
      .filter(l => ['active', 'completed'].includes(l.status))
      .reduce((sum, l) => sum + (l.approvedAmount || 0), 0)

    // Disbursement KPIs (for credit_officer role)
    const pendingDisbursements = loans.filter(l => ['pending_disbursement', 'approved'].includes(l.status))
    const pendingDisbursementCount = pendingDisbursements.length
    const pendingDisbursementAmount = pendingDisbursements.reduce((s, l) => s + (l.approvedAmount || 0), 0)
    const disbursedToday = loans.filter(l => l.status === 'active' && l.disbursedAt && new Date(l.disbursedAt) >= oneDayAgo)
    const disbursedTodayCount = disbursedToday.length
    const disbursedTodayAmount = disbursedToday.reduce((s, l) => s + (l.approvedAmount || 0), 0)
    const failedDisbursements = loans.filter(l => l.disbursementIntent?.status === 'FAILED').length

    const config = getRiskConfig()
    let commissionEarned = 0
    let commissionPending = 0
    let commissionLocked = 0
    let commissionAvailable = 0
    let commissionWithdrawn = 0
    let commissionTotalEarned = 0
    if (session.role === 'sales') {
      const wallet = commissionService.getWalletAggregates(session.username)
      commissionTotalEarned = wallet.totalEarned
      commissionLocked = wallet.locked
      commissionAvailable = wallet.available
      commissionWithdrawn = wallet.withdrawn
      commissionEarned = wallet.available + wallet.withdrawn
      commissionPending = wallet.locked
    }

    // Overdue logic
    let overdueCount = 0
    let overdueValue = 0
    loans.filter(l => l.status === 'active' && l.repaymentSchedule).forEach(l => {
      const overdue = l.repaymentSchedule.filter(p => !p.paid && new Date(p.dueDate) < now)
      if (overdue.length > 0) {
        overdueCount++
        overdueValue += overdue.reduce((s, p) => s + p.amount, 0)
      }
    })

    const repaymentRate = DisbursementAndRepaymentRate(loans)

    return {
      newToday, newWeek, pending: pendingReview, stage1Approved, disbursed,
      totalDisbursedAmount, commissionEarned, commissionPending,
      commissionTotalEarned, commissionLocked, commissionAvailable, commissionWithdrawn,
      overdueCount, overdueValue, repaymentRate,
      newApplications, pendingReview, awaitingDocuments,
      readyToDisburse, activeLoansCount,
      // Disbursement KPIs
      pendingDisbursementCount, pendingDisbursementAmount,
      disbursedTodayCount, disbursedTodayAmount, failedDisbursements,
      total: loans.length,
    }
  },

  // Dashboard queues
  getQueues: async () => {
    const loans = await loanService.getAllApplications()
    const now = new Date()
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000)

    const needsReview = loans
      .filter(l => l.status === 'pending')
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .slice(0, 10)

    const highRisk = loans
      .filter(l => l.status === 'pending' && (l.riskScore ?? 0) > 35)
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, 10)

    const stuck = loans
      .filter(l => l.status === 'pending' && new Date(l.submittedAt) < fortyEightHoursAgo)
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .slice(0, 10)

    return { needsReview, highRisk, stuck }
  },

  // Dashboard insights
  getInsights: async () => {
    const session = adminService.getSession()
    let loans = await loanService.getAllApplications()

    if (session && session.role === 'sales') {
      loans = loans.filter(l => l.assignedTo === session.username)
    }

    // Average decision time
    const decided = loans.filter(l => l.decidedAt && l.submittedAt)
    let avgDecisionTimeHours = 0
    if (decided.length > 0) {
      const totalMs = decided.reduce((s, l) => s + (new Date(l.decidedAt) - new Date(l.submittedAt)), 0)
      avgDecisionTimeHours = Math.round(totalMs / decided.length / (1000 * 60 * 60))
    }

    // Approval rate
    const decidedCount = loans.filter(l => ['approved', 'rejected', 'active', 'completed', 'stage_2_review'].includes(l.status)).length
    const approvedCount = loans.filter(l => ['approved', 'active', 'completed', 'stage_2_review'].includes(l.status)).length
    const approvalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0

    // Top rejection reasons
    const rejectionReasons = {}
    loans.filter(l => l.status === 'rejected' && l.rejectionReason).forEach(l => {
      rejectionReasons[l.rejectionReason] = (rejectionReasons[l.rejectionReason] || 0) + 1
    })
    const topRejections = Object.entries(rejectionReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))

    // Trends (Mocked for dashboard)
    const trends = {
      applications: [12, 19, 3, 5, 2, 3, 10],
      disbursement: [500000, 1200000, 800000, 1500000, 2000000, 1800000, 2500000],
      repayment: [400000, 1000000, 750000, 1300000, 1800000, 1700000, 2200000]
    }

    return { avgDecisionTimeHours, approvalRate, topRejections, decidedCount, approvedCount, trends }
  },

  approveStage1: async (loanId, data) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex((l) => l.id === loanId)

        if (loanIndex === -1) {
          reject(new Error('Loan not found'))
          return
        }

        const loan = loans[loanIndex]
        loan.status = 'stage_2_review'
        loan.stage1ApprovedAt = new Date().toISOString()
        loan.stage1ApprovedBy = session.username
        loan.medicalInsights = data.medicalInsights
        loan.financialClarification = data.financialClarification
        loan.repaymentStrategy = data.repaymentStrategy
        loan.applicantBio = data.applicantBio // Editable bio info

        saveToStorage(loans)
        auditService.record('stage_1_approval', {
          loanId,
          adminName: session.name,
          message: `Stage 1 Approved by ${session.name}`,
        })
        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  approveLoan: async (loanId, terms) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex((l) => l.id === loanId)

        if (loanIndex === -1) {
          reject(new Error('Loan not found'))
          return
        }

        const loan = loans[loanIndex]
        const approvedAmount = terms.approvedAmount || loan.estimatedCost
        const duration = terms.duration || loan.preferredDuration

        const repayment = computeSchedule(approvedAmount, duration)

        loan.status = 'approved'
        const now = new Date().toISOString()
        loan.approvedAt = now
        loan.decidedAt = now
        loan.approvedAmount = approvedAmount
        loan.approvedDuration = duration
        loan.repaymentSchedule = repayment.schedule
        loan.totalRepayment = repayment.totalAmount
        loan.totalInterest = repayment.totalInterest
        loan.monthlyInstallment = repayment.monthlyPayment
        loan.outstandingBalance = repayment.totalAmount
        loan.owner = session.username
        loan.decisionNotes = terms.notes || ''
        loan.decisionTags = terms.tags || []
        if (terms.commissionOverrides) {
          loan.commissionOverrides = { ...(loan.commissionOverrides || {}), ...terms.commissionOverrides }
        }

        saveToStorage(loans)
        commissionService.createApprovalCommission(loan)

        auditService.record('approve', {
          loanId,
          adminName: session.name,
          message: `Approved ₦${approvedAmount.toLocaleString()} for ${duration} months. ${terms.notes || ''}`,
        })

        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  rejectLoan: async (loanId, reason) => {
    return new Promise(async (resolve, reject) => {
      try {
        const loans = await loanService.getAllApplications()
        const loanIndex = loans.findIndex((l) => l.id === loanId)

        if (loanIndex === -1) {
          reject(new Error('Loan not found'))
          return
        }

        const loan = loans[loanIndex]
        const now = new Date().toISOString()
        loan.status = 'rejected'
        loan.rejectionReason = reason || 'Application rejected'
        loan.rejectedAt = now
        loan.decidedAt = now
        loan.owner = 'admin'

        const STORAGE_KEY = 'carecova_loans'
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))

        auditService.record('reject', {
          loanId,
          adminName: 'admin',
          reason: reason || 'Application rejected',
        })

        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  modifyOffer: async (loanId, terms) => {
    return new Promise(async (resolve, reject) => {
      try {
        const loans = await loanService.getAllApplications()
        const loanIndex = loans.findIndex((l) => l.id === loanId)

        if (loanIndex === -1) {
          reject(new Error('Loan not found'))
          return
        }

        const loan = loans[loanIndex]
        if (loan.status !== 'approved') {
          reject(new Error('Only approved offers can be modified'))
          return
        }

        const approvedAmount = terms.approvedAmount ?? loan.approvedAmount
        const duration = terms.duration ?? loan.approvedDuration ?? loan.preferredDuration
        const repayment = computeSchedule(approvedAmount, duration)
        const now = new Date().toISOString()

        loan.approvedAmount = approvedAmount
        loan.approvedDuration = duration
        loan.repaymentSchedule = repayment.schedule
        loan.totalRepayment = repayment.totalAmount
        loan.totalInterest = repayment.totalInterest
        loan.monthlyInstallment = repayment.monthlyPayment
        loan.outstandingBalance = repayment.totalAmount
        loan.modifiedAt = now
        loan.modifyReason = terms.reason ?? null

        const STORAGE_KEY = 'carecova_loans'
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))

        auditService.record('modify_offer', {
          loanId,
          adminName: 'admin',
          message: `Modified to ₦${approvedAmount.toLocaleString()} for ${duration} months. ${terms.reason || ''}`,
        })

        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  requestMoreInfo: async (loanId, message) => {
    return new Promise(async (resolve, reject) => {
      try {
        const loans = await loanService.getAllApplications()
        const loanIndex = loans.findIndex((l) => l.id === loanId)

        if (loanIndex === -1) {
          reject(new Error('Loan not found'))
          return
        }

        const loan = loans[loanIndex]
        loan.status = 'incomplete'
        loan.infoRequest = message
        loan.infoRequestedAt = new Date().toISOString()
        loan.owner = 'admin'

        const STORAGE_KEY = 'carecova_loans'
        localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))

        auditService.record('request_info', {
          loanId,
          adminName: 'admin',
          message,
        })

        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  assignToMe: async (loanId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        if (!session || session.role !== 'sales') {
          reject(new Error('Only sales can assign applicants'))
          return
        }

        const loans = await cloneLoans()
        const loanIndex = loans.findIndex((l) => l.id === loanId)
        if (loanIndex === -1) {
          reject(new Error('Loan not found'))
          return
        }

        const loan = loans[loanIndex]
        if (loan.assignedTo) {
          reject(new Error('Already assigned'))
          return
        }

        loan.assignedTo = session.username
        loan.assignedDate = new Date().toISOString()

        saveToStorage(loans)
        auditService.record('assign', { loanId, adminName: session.name })
        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  // User Management
  getUsersList: async () => {
    return Object.values(getUsers())
  },

  addUser: async (userData) => {
    const users = getUsers()
    if (users[userData.username]) throw new Error('Username already exists')

    users[userData.username] = {
      ...userData,
      status: 'active'
    }
    saveUsers(users)
    auditService.record('add_user', { adminName: 'admin', message: `Added user ${userData.username} (${userData.role})` })
    return users[userData.username]
  },

  updateUserStatus: async (username, status) => {
    const users = getUsers()
    if (!users[username]) throw new Error('User not found')
    if (username === 'admin') throw new Error('Cannot change super admin status')

    users[username].status = status
    saveUsers(users)
    auditService.record('update_user_status', { adminName: 'admin', message: `Set user ${username} status to ${status}` })
    return users[username]
  },

  // Repayment & Wallet
  disburseLoan: async (loanId) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex(l => l.id === loanId)
        if (loanIndex === -1) throw new Error('Loan not found')

        const loan = loans[loanIndex]
        if (loan.status !== 'approved') throw new Error('Only approved loans can be disbursed')

        loan.status = 'active'
        loan.disbursedAt = new Date().toISOString()
        loan.disbursedBy = session.username
        loan.totalPaid = 0

        saveToStorage(loans)
        auditService.record('disbursement', { loanId, adminName: session.name })
        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  recordPayment: async (loanId, installmentIndex, paymentData) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex(l => l.id === loanId)
        if (loanIndex === -1) throw new Error('Loan not found')

        const loan = loans[loanIndex]
        if (!loan.repaymentSchedule || !loan.repaymentSchedule[installmentIndex]) {
          throw new Error('Invalid installment')
        }

        const installment = loan.repaymentSchedule[installmentIndex]
        const amount = paymentData.amount || installment.amount
        const isFullPayment = amount >= installment.amount

        // Update Installment
        installment.paid = isFullPayment
        installment.paidAmount = (installment.paidAmount || 0) + amount
        installment.status = isFullPayment ? 'PAID' : 'PARTIAL'
        const paidAt = new Date().toISOString()
        installment.paymentDate = paidAt
        installment.paidOn = paidAt
        installment.paymentMethod = paymentData.method || 'Unknown'
        installment.txReference = paymentData.reference || `TXN-${Date.now()}`

        // Update Loan
        loan.totalPaid = (loan.totalPaid || 0) + amount
        loan.outstandingBalance = (loan.outstandingBalance || 0) - amount

        if (loan.outstandingBalance <= 0) {
          loan.status = 'completed'
          loan.completedAt = new Date().toISOString()
        }

        saveToStorage(loans)

        // Wallet Accounting
        const wallet = getWallet()
        wallet.balance += amount
        saveWallet(wallet)

        // Transaction Log
        const txs = getTransactions()
        const newTx = {
          id: installment.txReference,
          loanId,
          applicantName: loan.fullName || loan.patientName,
          amount,
          date: new Date().toISOString(),
          status: 'Successful',
          method: installment.paymentMethod,
          type: 'Repayment'
        }
        txs.unshift(newTx)
        saveTransactions(txs)

        const totalProjectedInterest = loan.totalInterest ?? (loan.totalRepayment || 0) - (loan.approvedAmount || 0)
        commissionService.unlockInterestProportional(
          loan,
          amount,
          (loan.totalPaid || 0) - (loan.approvedAmount || 0),
          totalProjectedInterest
        )
        if (loan.status === 'completed') {
          commissionService.unlockRepaymentBonus(loan)
        }

        auditService.record('payment', {
          loanId,
          adminName: session.name,
          message: `Recorded payment of ₦${amount.toLocaleString()} via ${installment.paymentMethod}`
        })

        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  getWalletBalance: () => {
    return getWallet().balance
  },

  getWalletTransactions: () => {
    return getTransactions()
  },

  withdrawMyCommission: async (amount) => {
    const session = adminService.getSession()
    if (!session) throw new Error('Not authenticated')
    return commissionService.withdrawCommission(session.username, amount)
  },

  addRecoveryNote: async (loanId, note) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex(l => l.id === loanId)
        if (loanIndex === -1) throw new Error('Loan not found')

        const loan = loans[loanIndex]
        const newNote = {
          id: `REC-${Date.now()}`,
          date: new Date().toISOString(),
          adminName: session.name,
          note
        }

        loan.recoveryHistory = loan.recoveryHistory || []
        loan.recoveryHistory.unshift(newNote)

        saveToStorage(loans)
        auditService.record('recovery_note', { loanId, adminName: session.name, message: `Added recovery note: ${note}` })
        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  // --- Disbursement Methods (Credit Officer) ---

  getDisbursementQueue: async () => {
    const loans = await loanService.getAllApplications()
    return loans.filter(l => ['pending_disbursement', 'approved', 'disbursement_processing', 'need_more_info'].includes(l.status))
  },

  confirmDisbursement: async (loanId, payoutData, simulateResult = 'success') => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex(l => l.id === loanId)
        if (loanIndex === -1) throw new Error('Loan not found')

        const loan = loans[loanIndex]
        const config = getRiskConfig()
        const approvedAmount = loan.approvedAmount || 0
        const providerCommissionPct = config.providerCommissionPct ?? 0.07
        const providerPayout = Math.round(approvedAmount * (1 - providerCommissionPct))
        const platformCommission = Math.round(approvedAmount * providerCommissionPct)

        const now = new Date().toISOString()

        loan.disbursementIntent = {
          ...payoutData,
          payoutAmount: providerPayout,
          loanAmount: approvedAmount,
          providerPayout,
          platformCommission,
          providerCommissionPct,
          status: 'PROCESSING',
          createdBy: session.username,
          updatedBy: session.username,
          createdAt: now,
          updatedAt: now,
          providerReference: null,
          failureReason: null,
        }
        loan.status = 'disbursement_processing'
        saveToStorage(loans)

        auditService.record('disbursement_initiated', {
          loanId,
          adminName: session.name,
          message: `Disbursement initiated via ${payoutData.payoutMethod}: ₦${providerPayout.toLocaleString()} to provider (7% commission retained)`,
        })

        // Simulate async payout (3s delay)
        setTimeout(async () => {
          try {
            const freshLoans = await cloneLoans()
            const idx = freshLoans.findIndex(l => l.id === loanId)
            if (idx === -1) return

            const freshLoan = freshLoans[idx]

            if (simulateResult === 'success') {
              const payout = freshLoan.disbursementIntent.providerPayout ?? payoutData.payoutAmount ?? 0

              freshLoan.disbursementIntent.status = 'SUCCESS'
              freshLoan.disbursementIntent.providerReference = `REF-${Date.now()}`
              freshLoan.disbursementIntent.updatedAt = new Date().toISOString()
              freshLoan.status = 'active'
              freshLoan.disbursedAt = new Date().toISOString()
              freshLoan.disbursedBy = session.username
              freshLoan.totalPaid = 0

              const wallet = getWallet()
              wallet.balance -= payout
              saveWallet(wallet)

              const txs = getTransactions()
              txs.unshift({
                id: `DIS-${Date.now()}`,
                loanId,
                applicantName: freshLoan.fullName || freshLoan.patientName,
                amount: payout,
                date: new Date().toISOString(),
                status: 'Successful',
                method: payoutData.payoutMethod,
                type: 'Disbursement',
              })
              saveTransactions(txs)

              commissionService.createInterestCommission(freshLoan)

              auditService.record('disbursement_success', {
                loanId,
                adminName: session.name,
                message: `Disbursement SUCCEEDED. Ref: ${freshLoan.disbursementIntent.providerReference}`,
              })
            } else {
              const reason = simulateResult === 'fail' ? 'Bank declined transfer' : String(simulateResult)
              freshLoan.disbursementIntent.status = 'FAILED'
              freshLoan.disbursementIntent.failureReason = reason
              freshLoan.disbursementIntent.updatedAt = new Date().toISOString()
              freshLoan.status = 'pending_disbursement'

              auditService.record('disbursement_failed', {
                loanId,
                adminName: session.name,
                message: `Disbursement FAILED: ${reason}`,
              })
            }

            saveToStorage(freshLoans)
            resolve(freshLoans[idx])
          } catch (err) {
            reject(err)
          }
        }, 3000)
      } catch (error) {
        reject(error)
      }
    })
  },

  requestDisbursementCorrection: async (loanId, notes) => {
    return new Promise(async (resolve, reject) => {
      try {
        const session = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex(l => l.id === loanId)
        if (loanIndex === -1) throw new Error('Loan not found')

        const loan = loans[loanIndex]
        loan.status = 'need_more_info'
        loan.correctionNotes = notes
        loan.correctionRequestedAt = new Date().toISOString()
        loan.correctionRequestedBy = session.username

        saveToStorage(loans)
        auditService.record('disbursement_correction_requested', {
          loanId,
          adminName: session.name,
          message: `Correction requested: ${notes}`,
        })
        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },
}

// Helpers to reduce repetition
async function cloneLoans() {
  return await adminService.getAllLoans()
}

function saveToStorage(loans) {
  const STORAGE_KEY = 'carecova_loans'
  localStorage.setItem(STORAGE_KEY, JSON.stringify(loans))
}

function DisbursementAndRepaymentRate(loans) {
  const activeLoans = loans.filter(l => l.status === 'active' || l.status === 'completed')
  if (activeLoans.length === 0) return 100

  let totalDue = 0
  let totalPaid = 0

  activeLoans.forEach(l => {
    if (l.repaymentSchedule) {
      l.repaymentSchedule.forEach(p => {
        if (new Date(p.dueDate) < new Date()) {
          totalDue += p.amount
          if (p.paid) totalPaid += p.amount
        }
      })
    }
  })

  return totalDue > 0 ? Math.round((totalPaid / totalDue) * 100) : 100
}
