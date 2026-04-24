import { loanService } from './loanService'
import { trackingService } from './trackingService'
import { auditService } from './auditService'
import { getRiskConfig } from '../data/riskConfig'
import { computeSchedule } from '../utils/lendingEngine'
import * as commissionService from './commissionService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''
const USE_BACKEND = !!API_BASE_URL
const BACKEND_ID_REGEX = /^[a-f0-9]{24}$/i

const ADMIN_STORAGE_KEY = 'carecova_admin_session'
const USERS_STORAGE_KEY = 'carecova_admin_users'
const TRANSACTIONS_STORAGE_KEY = 'carecova_transactions'
const WALLET_STORAGE_KEY = 'carecova_org_wallet'

function looksLikeBackendId(value) {
  if (typeof value !== 'string') return false
  const normalized = value.trim()
  return BACKEND_ID_REGEX.test(normalized)
}

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

/** Map Care Cova API roles to frontend role (sidebar, permissions). */
function mapBackendRole(backendRole) {
  const map = {
    super_admin: 'admin',
    credit_admin: 'credit_officer',
    reviewer: 'admin',
    sales: 'sales',
    customer_service: 'support',
    provider: 'provider',
  }
  return (backendRole && map[backendRole]) || backendRole || 'admin'
}

let refreshPromise = null
async function refreshAccessToken() {
  if (refreshPromise) return refreshPromise
  const session = getStoredSession()
  if (!session?.refreshToken) {
    clearSession()
    throw new Error('Session expired. Please sign in again.')
  }
  refreshPromise = (async () => {
    const response = await fetch(`${API_ROOT}/admins/auth/refresh`, {
      method: 'POST',
      headers: { 'Content-Type': 'application/json' },
      body: JSON.stringify({ refreshToken: session.refreshToken }),
    })
    const { isJson, body } = await parseResponseBody(response)
    if (!response.ok) {
      clearSession()
      throw new Error(getResponseMessage(body, isJson, 'Session expired. Please sign in again.'))
    }
    const next = {
      ...session,
      accessToken: body.accessToken,
      refreshToken: body.refreshToken || session.refreshToken,
      admin: body.admin || session.admin,
    }
    saveSession(next)
    return next.accessToken
  })()
  try {
    return await refreshPromise
  } finally {
    refreshPromise = null
  }
}

async function adminRequest(path, options = {}, retried = false) {
  const session = getStoredSession()
  let token = session?.accessToken
  if (!token) throw new Error('Not authenticated')

  let response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
  } catch (error) {
    if (error instanceof TypeError) {
      throw new Error(
        `Unable to reach backend at ${API_ROOT}. ` +
        'Please ensure the API server is running and the base URL is correct.',
      )
    }
    throw error
  }

  const { isJson, body } = await parseResponseBody(response)
  if (!response.ok) {
    if (response.status === 401 && !retried && session?.refreshToken) {
      try {
        token = await refreshAccessToken()
        return adminRequest(path, options, true)
      } catch (_) {
        throw new Error('Session expired. Please sign in again.')
      }
    }
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
  const source = loan.loan && typeof loan.loan === 'object' ? loan.loan : loan
  const toNaira = (nairaValue, koboValue) => {
    if (typeof nairaValue === 'number' && Number.isFinite(nairaValue)) return nairaValue
    const fromKobo = Number(koboValue)
    return Number.isFinite(fromKobo) ? fromKobo / 100 : undefined
  }
  const normalizedSchedule = Array.isArray(source.repaymentSchedule)
    ? source.repaymentSchedule.map((item, index) => {
        const amount = toNaira(item?.amount, item?.amountKobo) ?? 0
        const paidAmount = toNaira(item?.paidAmount, item?.paidAmountKobo) ?? 0
        const normalizedStatus = String(item?.status || '').toLowerCase()
        const isPaid = item?.paid === true || normalizedStatus === 'paid'
        return {
          ...item,
          month: item?.month ?? index + 1,
          amount,
          amountKobo: Number(item?.amountKobo) || Math.round(amount * 100),
          paidAmount,
          paidAmountKobo: Number(item?.paidAmountKobo) || Math.round(paidAmount * 100),
          paid: isPaid || paidAmount >= amount,
          paymentDate: item?.paymentDate || item?.paidAt || item?.paidOn || null,
          paidOn: item?.paidOn || item?.paymentDate || item?.paidAt || null,
          paymentMethod: item?.paymentMethod || item?.paymentChannel || null,
          txReference: item?.txReference || item?.paymentReference || null,
        }
      })
    : undefined
  const approvedAmount = source.approvedAmount ?? source.approved_amount ?? source.estimatedCost ?? source.requestedAmount ?? 0
  const rawStatus = source.status ?? source.applicationStatus ?? source.stage ?? null
  let status = rawStatus
  if (!status && (source.disbursedAt || source.disbursementConfirmedAt)) status = 'active'
  if (status === 'disbursed') status = 'active'
  if (status === 'ready_to_disburse') status = 'approved'
  return {
    ...source,
    id: source.id || source._id,
    status,
    patientName: source.patientName || source.fullName,
    fullName: source.fullName || source.patientName,
    hospital: source.hospital || source.hospitalName || '—',
    estimatedCost: source.estimatedCost ?? source.requestedAmount ?? 0,
    approvedAmount: typeof approvedAmount === 'number' ? approvedAmount : Number(approvedAmount) || 0,
    submittedAt: source.submittedAt || source.createdAt,
    disbursedAt: source.disbursedAt ?? source.disbursementConfirmedAt,
    totalPaid: toNaira(source.totalPaid, source.totalPaidKobo) ?? (source.totalPaid || 0),
    outstandingBalance:
      toNaira(source.outstandingBalance, source.outstandingBalanceKobo) ??
      (source.outstandingBalance || 0),
    totalRepayment: toNaira(source.totalRepayment, source.totalRepaymentKobo) ?? source.totalRepayment,
    totalInterest: toNaira(source.totalInterest, source.totalInterestKobo) ?? source.totalInterest,
    repaymentSchedule: normalizedSchedule ?? source.repaymentSchedule,
  }
}

function looksLikeMissingRouteError(error) {
  const msg = String(error?.message || '')
  return /not found|cannot (post|get|put|patch|delete)|404/i.test(msg)
}

function requireBackendFeature(featureName) {
  if (!USE_BACKEND) {
    throw new Error(`${featureName} requires a configured backend API`)
  }
}

function assertBackendLoanId(loanId, featureName) {
  const trimmed = loanId?.trim()
  if (!trimmed || trimmed === 'undefined') {
    throw new Error('Application not found')
  }
  if (!looksLikeBackendId(trimmed)) {
    throw new Error(`${featureName} requires a backend application id`)
  }
  return trimmed
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
        const role = mapBackendRole(admin.role)
        const name = admin.displayName || admin.name || admin.username || username
        const session = {
          loggedIn: true,
          loginTime: new Date().toISOString(),
          accessToken: body.accessToken,
          refreshToken: body.refreshToken,
          admin: { ...admin, role, displayName: admin.displayName || name },
          username: admin.username || username,
          role,
          name,
        }
        saveSession(session)
        auditService.record('login', { adminName: name, role })
        return { username: session.username, role, name, loggedIn: true, loginTime: session.loginTime }
      } catch (err) {
        throw err
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
    return {
      username: s.admin?.username ?? s.username,
      role: mapBackendRole(s.admin?.role ?? s.role),
      name: s.admin?.displayName ?? s.admin?.name ?? s.admin?.username ?? s.name ?? 'Admin',
      loggedIn: s.loggedIn ?? true,
      loginTime: s.loginTime,
      accessToken: s.accessToken,
      refreshToken: s.refreshToken,
    }
  },

  isAuthenticated: () => adminService.getSession() !== null,

  debitWallet: async () => {
    throw new Error('Wallet API not configured for local mode')
  },

  getAllLoans: async (options = {}) => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      const params = new URLSearchParams()
      if (options.status != null && options.status !== '') {
        params.set('status', String(options.status))
      }
      if (options.search != null && String(options.search).trim() !== '') {
        params.set('search', String(options.search).trim())
      }
      if (options.assignedTo === 'me' || options.assignedTo === 'unassigned') {
        params.set('assignedTo', options.assignedTo)
      }
      const query = params.toString()
      const path = query ? `/admin/loan-applications?${query}` : '/admin/loan-applications'
      const list = await adminRequest(path)
      const loans = (Array.isArray(list) ? list : list?.content ?? list?.data ?? list?.items ?? []).map(normalizeLoanFromApi)
      return loans
    }
    if (options.requireBackend) {
      requireBackendFeature('Loans')
      throw new Error('Not authenticated')
    }
    return loanService.getAllApplications()
  },

  getSalesDashboard: async () => {
    const session = getStoredSession()
    if (!USE_BACKEND || !session?.accessToken) return null
    const data = await adminRequest('/admin/sales/dashboard')
    const needsReview = (data?.queues?.needsReview ?? []).map(normalizeLoanFromApi)
    return {
      kpis: data?.kpis ?? {},
      queues: { ...(data?.queues ?? {}), needsReview },
    }
  },

  getLoanById: async (loanId) => {
    const trimmed = loanId?.trim()
    if (!trimmed || trimmed === 'undefined') throw new Error('Application not found')

    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      if (!looksLikeBackendId(trimmed)) throw new Error('Application not found')
      const loan = await adminRequest(`/admin/loan-applications/${trimmed}`)
      return normalizeLoanFromApi(loan)
    }
    return loanService.getApplication(trimmed)
  },

  initiateMonoConnectForLoan: async (loanId, payload = {}) => {
    requireBackendFeature('Mono connect')
    const trimmed = assertBackendLoanId(loanId, 'Mono connect')
    return adminRequest(`/admin/loan-applications/${trimmed}/mono/connect/initiate`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },

  getMonoInformedDecisionForLoan: async (loanId, payload = {}) => {
    requireBackendFeature('Mono informed decision')
    const trimmed = assertBackendLoanId(loanId, 'Mono informed decision')
    return adminRequest(`/admin/loan-applications/${trimmed}/mono/informed-decision`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },

  createMonoDirectDebitCustomerForLoan: async (loanId, payload = {}) => {
    if (USE_BACKEND) {
      const trimmed = assertBackendLoanId(loanId, 'Mono direct debit customer')
      return adminRequest(`/admin/loan-applications/${trimmed}/mono/direct-debit/customer`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      })
    }

    const loans = await cloneLoans()
    const loan = loans.find((item) => item.id === loanId)
    if (!loan) throw new Error('Loan not found')

    const existingCustomerId = loan.monoDirectDebit?.customer?.id
    if (existingCustomerId && payload.forceCreate !== true) {
      return {
        applicationId: loan.id,
        customerId: existingCustomerId,
        status: 'successful',
        message: 'Direct debit customer already exists for this application',
        data: loan.monoDirectDebit.customer,
      }
    }

    const { firstName, lastName } = resolveDirectDebitNames(
      payload.firstName,
      payload.lastName,
      loan.fullName || loan.patientName,
    )
    const customer = {
      id: `cus_${Date.now().toString(36)}`,
      identity: payload.identity || null,
      firstName,
      lastName,
      email: payload.email || loan.email || '',
      phone: payload.phone || loan.phone || '',
      address: payload.address || loan.homeAddress || '',
      status: 'created',
      createdAt: new Date().toISOString(),
    }

    loan.monoDirectDebit = {
      ...(loan.monoDirectDebit || {}),
      customer,
      status: 'customer_created',
      updatedAt: new Date().toISOString(),
    }
    saveToStorage(loans)

    return {
      applicationId: loan.id,
      customerId: customer.id,
      status: 'successful',
      message: 'Created customer successfully',
      data: customer,
    }
  },

  initiateMonoDirectDebitMandateForLoan: async (loanId, payload = {}) => {
    if (USE_BACKEND) {
      const trimmed = assertBackendLoanId(loanId, 'Mono direct debit mandate')
      return adminRequest(`/admin/loan-applications/${trimmed}/mono/direct-debit/mandate`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      })
    }

    const loans = await cloneLoans()
    const loan = loans.find((item) => item.id === loanId)
    if (!loan) throw new Error('Loan not found')
    const customerId = payload.customerId || loan.monoDirectDebit?.customer?.id
    if (!customerId) throw new Error('Create a direct debit customer before initiating a mandate')

    const mandateId = `mmc_${Date.now().toString(36)}`
    const reference = payload.reference || `CC-DD-MANDATE-${loan.id}-${Date.now()}`
    const nextDueDate = loan.repaymentSchedule?.find((item) => !item.paid)?.dueDate
    const lastDueDate = loan.repaymentSchedule?.[loan.repaymentSchedule.length - 1]?.dueDate
    const amountKobo = Math.round(Number(payload.amount || Math.max(loan.outstandingBalance || loan.totalRepayment || loan.requestedAmount || 0, 0)) * 100)

    loan.repaymentMethod = 'direct_debit'
    loan.monoDirectDebit = {
      ...(loan.monoDirectDebit || {}),
      mandate: {
        id: mandateId,
        customerId,
        reference,
        monoUrl: `https://authorise.mono.co/${mandateId.toUpperCase()}`,
        amountKobo,
        amountNaira: amountKobo / 100,
        description: payload.description || `Loan repayment mandate for ${loan.email || loan.fullName}`,
        mandateType: payload.mandateType || 'emandate',
        debitType: payload.debitType || 'variable',
        startDate: payload.startDate || nextDueDate || new Date().toISOString().slice(0, 10),
        endDate: payload.endDate || lastDueDate || new Date().toISOString().slice(0, 10),
        status: 'ready_to_debit',
        readyToDebit: true,
        createdAt: new Date().toISOString(),
      },
      status: 'ready_to_debit',
      updatedAt: new Date().toISOString(),
    }
    saveToStorage(loans)

    return {
      applicationId: loan.id,
      mandateId,
      reference,
      monoUrl: loan.monoDirectDebit.mandate.monoUrl,
      status: 'successful',
      message: 'Payment Initiated Successfully',
      data: loan.monoDirectDebit.mandate,
    }
  },

  inquireMonoDirectDebitBalanceForLoan: async (loanId, payload = {}) => {
    if (USE_BACKEND) {
      const trimmed = assertBackendLoanId(loanId, 'Mono direct debit balance inquiry')
      return adminRequest(`/admin/loan-applications/${trimmed}/mono/direct-debit/balance-inquiry`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      })
    }

    const loans = await cloneLoans()
    const loan = loans.find((item) => item.id === loanId)
    if (!loan) throw new Error('Loan not found')
    const mandateId = payload.mandateId || loan.monoDirectDebit?.mandate?.id
    if (!mandateId) throw new Error('Direct debit mandate has not been created for this application')

    const sandboxBalanceKobo = 1000000
    const inquiryType = payload.amount ? 'sufficiency_check' : 'balance_fetch'
    const data = payload.amount
      ? {
          id: mandateId,
          has_sufficient_balance: Number(payload.amount) <= sandboxBalanceKobo,
          account_details: {
            bank_code: '999',
            account_name: loan.fullName || loan.patientName,
            account_number: loan.repaymentAccountNumber || '0000000000',
            bank_name: loan.repaymentBankName || 'Sandbox Bank',
          },
        }
      : {
          id: mandateId,
          account_balance: sandboxBalanceKobo / 100,
          account_details: {
            bank_code: '999',
            account_name: loan.fullName || loan.patientName,
            account_number: loan.repaymentAccountNumber || '0000000000',
            bank_name: loan.repaymentBankName || 'Sandbox Bank',
          },
        }

    loan.monoDirectDebit = {
      ...(loan.monoDirectDebit || {}),
      balanceInquiry: {
        inquiryType,
        amountKobo: payload.amount ? Number(payload.amount) : undefined,
        checkedAt: new Date().toISOString(),
        raw: data,
      },
      updatedAt: new Date().toISOString(),
    }
    saveToStorage(loans)

    return {
      applicationId: loan.id,
      mandateId,
      status: 'successful',
      message: payload.amount ? 'Successfully enquired balance.' : 'Sufficient balance available',
      inquiryType,
      data,
    }
  },

  debitMonoDirectDebitMandateForLoan: async (loanId, payload = {}) => {
    if (USE_BACKEND) {
      const trimmed = assertBackendLoanId(loanId, 'Mono direct debit debit')
      return adminRequest(`/admin/loan-applications/${trimmed}/mono/direct-debit/debit`, {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      })
    }

    const loans = await cloneLoans()
    const loan = loans.find((item) => item.id === loanId)
    if (!loan) throw new Error('Loan not found')

    const mandateId = payload.mandateId || loan.monoDirectDebit?.mandate?.id
    if (!mandateId) throw new Error('Direct debit mandate has not been created for this application')
    if (loan.monoDirectDebit?.mandate?.readyToDebit === false) {
      throw new Error('Mandate is not ready to debit yet')
    }

    const nextInstallmentIndex = loan.repaymentSchedule?.findIndex((item) => !item.paid) ?? -1
    if (nextInstallmentIndex < 0) throw new Error('All installments have already been paid')

    const amountKobo = payload.amount != null
      ? Math.round(Number(payload.amount))
      : Math.round(Number(loan.repaymentSchedule[nextInstallmentIndex]?.amount || 0) * 100)
    const debitAmountNaira = Number((amountKobo / 100).toFixed(2))
    const reference = payload.reference || `CC-DD-${loan.id}-${Date.now()}`

    await adminService.recordPayment(loanId, nextInstallmentIndex, {
      amount: debitAmountNaira,
      method: 'Direct Debit',
      reference,
    })

    const freshLoans = await cloneLoans()
    const freshLoan = freshLoans.find((item) => item.id === loanId)
    if (!freshLoan) throw new Error('Loan not found')

    freshLoan.monoDirectDebit = {
      ...(freshLoan.monoDirectDebit || {}),
      status: 'debit_successful',
      lastDebit: {
        reference,
        status: 'debit_successful',
        amountKobo,
        amountNaira: debitAmountNaira,
        processedAt: new Date().toISOString(),
      },
      updatedAt: new Date().toISOString(),
    }
    saveToStorage(freshLoans)

    return {
      applicationId: freshLoan.id,
      reference,
      status: 'successful',
      message: 'Account debited successfully.',
      responseCode: '00',
      transactionStatus: 'success',
      data: {
        success: true,
        status: 'successful',
        event: 'successful',
        amount: amountKobo,
        mandate: mandateId,
        reference_number: reference,
        date: new Date().toISOString(),
        fee_bearer: payload.feeBearer || 'business',
        narration: payload.narration || `Loan repayment for ${freshLoan.fullName || freshLoan.patientName}`,
      },
    }
  },

  // --- Organization Wallets (Backend only; no mock) ---
  getWallets: async (filters = {}) => {
    requireBackendFeature('Wallets')
    const query = new URLSearchParams(
      Object.entries(filters || {}).reduce((acc, [k, v]) => {
        if (v === undefined || v === null || v === '') return acc
        acc[k] = String(v)
        return acc
      }, {})
    ).toString()
    const path = query ? `/admin/wallets?${query}` : '/admin/wallets'
    return adminRequest(path)
  },

  getWalletOverview: async (filters = {}) => {
    requireBackendFeature('Wallet overview')
    return adminRequest('/admin/wallets/overview', {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    })
  },

  getOrganizationEssentialWallets: async (filters = {}) => {
    requireBackendFeature('Essential wallets')
    return adminRequest('/admin/wallets/essential', {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    })
  },

  getWalletTransactions: async (filters = {}) => {
    requireBackendFeature('Wallet transactions')
    return adminRequest('/admin/wallets/transactions', {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    })
  },

  getWalletStatement: async (walletId, filters = {}) => {
    requireBackendFeature('Wallet statement')
    const trimmed = String(walletId || '').trim()
    if (!trimmed) throw new Error('Wallet id is required')
    return adminRequest(`/admin/wallets/${encodeURIComponent(trimmed)}/statement`, {
      method: 'POST',
      body: JSON.stringify(filters || {}),
    })
  },

  fundWallet: async (walletId, payload = {}) => {
    requireBackendFeature('Wallet funding')
    const trimmed = String(walletId || '').trim()
    if (!trimmed) throw new Error('Wallet id is required')
    return adminRequest(`/admin/wallets/${encodeURIComponent(trimmed)}/fund`, {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },

  fundOrganizationWallet: async (payload = {}) => {
    requireBackendFeature('Organization wallet funding')
    return adminRequest('/admin/wallets/organization/fund', {
      method: 'POST',
      body: JSON.stringify(payload || {}),
    })
  },

  getWalletBalance: async (filters = {}) => {
    const overview = await adminService.getWalletOverview(filters)
    return (
      overview?.totalBalance ??
      overview?.balance ??
      overview?.availableBalance ??
      0
    )
  },

  getMonoInformedDecisionSectionForLoan: async (loanId, section, payload = {}) => {
    requireBackendFeature('Mono informed decision section')
    const trimmed = assertBackendLoanId(loanId, 'Mono informed decision section')
    const normalizedSection = String(section || '').trim()
    if (!normalizedSection) {
      throw new Error('Mono informed decision section is required')
    }
    return adminRequest(
      `/admin/loan-applications/${trimmed}/mono/informed-decision/sections/${encodeURIComponent(normalizedSection)}`,
      {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      },
    )
  },

  // Dashboard KPIs
  getKPIs: async () => {
    const session = adminService.getSession()
    if (!session) return null

    const loans = await adminService.getAllLoans({ requireBackend: true })

    // Filter by portfolio for sales
    const scopedLoans = session.role === 'sales'
      ? loans.filter(l => l.assignedTo === session.username)
      : loans

    const now = new Date()
    const oneDayAgo = new Date(now - 24 * 60 * 60 * 1000)
    const sevenDaysAgo = new Date(now - 7 * 24 * 60 * 60 * 1000)

    const newToday = scopedLoans.filter(l => new Date(l.submittedAt) >= oneDayAgo).length
    const newWeek = scopedLoans.filter(l => new Date(l.submittedAt) >= sevenDaysAgo).length

    // KPI counts aligned to backend status model
    const newApplications = scopedLoans.filter(
      l => ['submitted', 'pending', 'pending_stage1'].includes(l.status) && new Date(l.submittedAt) >= oneDayAgo
    ).length
    const pendingReview = scopedLoans.filter(
      l => ['submitted', 'pending', 'pending_stage1', 'pending_admin_review'].includes(l.status)
    ).length
    const awaitingDocuments = scopedLoans.filter(l => ['incomplete'].includes(l.status)).length
    const readyToDisburse = scopedLoans.filter(
      l => ['approved', 'approved_for_disbursement'].includes(l.status) && (l.disbursementStatus || 'pending') === 'pending'
    ).length
    const activeLoansCount = scopedLoans.filter(l => l.status === 'active').length

    const stage1Approved = scopedLoans.filter(l => l.status === 'pending_admin_review').length
    const disbursed = scopedLoans.filter(l => ['active', 'completed'].includes(l.status)).length
    const totalDisbursedAmount = scopedLoans
      .filter(l => ['active', 'completed'].includes(l.status))
      .reduce((sum, l) => sum + (l.approvedAmount || 0), 0)

    // Disbursement KPIs (for credit_officer role)
    const pendingDisbursements = scopedLoans.filter(
      l => ['approved', 'approved_for_disbursement'].includes(l.status) && (l.disbursementStatus || 'pending') === 'pending'
    )
    const pendingDisbursementCount = pendingDisbursements.length
    const pendingDisbursementAmount = pendingDisbursements.reduce((s, l) => s + (l.approvedAmount || 0), 0)
    const disbursedToday = scopedLoans.filter(l => l.status === 'active' && l.disbursedAt && new Date(l.disbursedAt) >= oneDayAgo)
    const disbursedTodayCount = disbursedToday.length
    const disbursedTodayAmount = disbursedToday.reduce((s, l) => s + (l.approvedAmount || 0), 0)
    const failedDisbursements = scopedLoans.filter(l => String(l.disbursementStatus || '').toLowerCase() === 'failed').length

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
    scopedLoans.filter(l => l.status === 'active' && l.repaymentSchedule).forEach(l => {
      const overdue = l.repaymentSchedule.filter(p => !p.paid && new Date(p.dueDate) < now)
      if (overdue.length > 0) {
        overdueCount++
        overdueValue += overdue.reduce((s, p) => s + p.amount, 0)
      }
    })

    const repaymentRate = DisbursementAndRepaymentRate(scopedLoans)

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
      total: scopedLoans.length,
    }
  },

  // Dashboard queues
  getQueues: async () => {
    const session = getStoredSession()
    let loans = []
    if (USE_BACKEND && session?.accessToken) {
      try {
        loans = await adminService.getAllLoans({ requireBackend: true })
      } catch (_) {
        loans = await loanService.getAllApplications()
      }
    } else {
      loans = await loanService.getAllApplications()
    }
    const now = new Date()
    const fortyEightHoursAgo = new Date(now - 48 * 60 * 60 * 1000)

    const needsReview = loans
      .filter(l => l.status === 'pending_admin_review')
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .slice(0, 10)

    const highRisk = loans
      .filter(l =>
        ['submitted', 'pending', 'pending_stage1', 'pending_admin_review', 'approved', 'approved_for_disbursement'].includes(l.status) &&
        (l.riskScore ?? l.internalRiskMetrics?.riskScore ?? 0) > 35
      )
      .sort((a, b) => (b.riskScore ?? 0) - (a.riskScore ?? 0))
      .slice(0, 10)

    const stuck = loans
      .filter(l =>
        ['submitted', 'pending', 'pending_stage1', 'pending_admin_review'].includes(l.status) &&
        new Date(l.submittedAt) < fortyEightHoursAgo
      )
      .sort((a, b) => new Date(a.submittedAt) - new Date(b.submittedAt))
      .slice(0, 10)

    return { needsReview, highRisk, stuck }
  },

  // Dashboard insights
  getInsights: async () => {
    const session = adminService.getSession()
    let loans
    try {
      loans = await adminService.getAllLoans({ requireBackend: true })
    } catch (_) {
      return { avgDecisionTimeHours: 0, approvalRate: 0, topRejections: [], decidedCount: 0, approvedCount: 0, trends: { applications: [], disbursement: [], repayment: [] } }
    }

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
    const decidedCount = loans.filter(l => ['approved', 'approved_for_disbursement', 'active', 'completed', 'admin_rejected', 'sales_rejected', 'rejected'].includes(l.status)).length
    const approvedCount = loans.filter(l => ['approved', 'approved_for_disbursement', 'active', 'completed'].includes(l.status)).length
    const approvalRate = decidedCount > 0 ? Math.round((approvedCount / decidedCount) * 100) : 0

    // Top rejection reasons
    const rejectionReasons = {}
    loans.filter(l => ['rejected', 'admin_rejected', 'sales_rejected'].includes(l.status) && (l.rejectionReason || l.reason)).forEach(l => {
      const reason = l.rejectionReason || l.reason
      rejectionReasons[reason] = (rejectionReasons[reason] || 0) + 1
    })
    const topRejections = Object.entries(rejectionReasons)
      .sort((a, b) => b[1] - a[1])
      .slice(0, 5)
      .map(([reason, count]) => ({ reason, count }))

    // Last 7 days trends derived from live backend loan data
    const days = Array.from({ length: 7 }).map((_, i) => {
      const d = new Date()
      d.setHours(0, 0, 0, 0)
      d.setDate(d.getDate() - (6 - i))
      return d
    })
    const keyOf = (dateValue) => {
      const d = new Date(dateValue)
      if (Number.isNaN(d.getTime())) return null
      d.setHours(0, 0, 0, 0)
      return d.toISOString().slice(0, 10)
    }
    const dayKeys = days.map(d => d.toISOString().slice(0, 10))
    const appMap = Object.fromEntries(dayKeys.map(k => [k, 0]))
    const disbMap = Object.fromEntries(dayKeys.map(k => [k, 0]))
    const repayMap = Object.fromEntries(dayKeys.map(k => [k, 0]))

    loans.forEach((loan) => {
      const submittedKey = keyOf(loan.submittedAt)
      if (submittedKey && appMap[submittedKey] != null) appMap[submittedKey] += 1

      const disbursedKey = keyOf(loan.disbursedAt || loan.disbursementConfirmedAt)
      if (disbursedKey && disbMap[disbursedKey] != null) disbMap[disbursedKey] += Number(loan.approvedAmount || 0)

      if (Array.isArray(loan.repaymentSchedule)) {
        loan.repaymentSchedule.forEach((p) => {
          const paidKey = keyOf(p.paidOn || p.paymentDate)
          if (paidKey && repayMap[paidKey] != null) repayMap[paidKey] += Number(p.paidAmount || (p.paid ? p.amount : 0) || 0)
        })
      }
    })

    const trends = {
      applications: dayKeys.map(k => appMap[k]),
      disbursement: dayKeys.map(k => disbMap[k]),
      repayment: dayKeys.map(k => repayMap[k]),
    }

    return { avgDecisionTimeHours, approvalRate, topRejections, decidedCount, approvedCount, trends }
  },

  approveStage1: async (loanId, data) => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Stage 1 approval')
      const payload = {
        medicalInsights: data.medicalInsights,
        financialClarification: data.financialClarification,
        repaymentStrategy: data.repaymentStrategy,
        applicantBio: data.applicantBio,
      }
      const updated = await adminRequest(`/admin/loan-applications/${trimmed}/approve-stage1`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return normalizeLoanFromApi(updated)
    }

    return new Promise(async (resolve, reject) => {
      try {
        const sessionSafe = adminService.getSession()
        const loans = await cloneLoans()
        const loanIndex = loans.findIndex((l) => l.id === loanId)

        if (loanIndex === -1) {
          reject(new Error('Loan not found'))
          return
        }

        const loan = loans[loanIndex]
        loan.status = 'stage_2_review'
        loan.stage1ApprovedAt = new Date().toISOString()
        loan.stage1ApprovedBy = sessionSafe?.username || 'sales'
        loan.medicalInsights = data.medicalInsights
        loan.financialClarification = data.financialClarification
        loan.repaymentStrategy = data.repaymentStrategy
        loan.applicantBio = data.applicantBio // Editable bio info

        saveToStorage(loans)
        auditService.record('stage_1_approval', {
          loanId,
          adminName: sessionSafe?.name || 'Sales',
          message: `Stage 1 Approved by ${sessionSafe?.name || 'Sales'}`,
        })
        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  approveLoan: async (loanId, terms) => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Approve loan')
      const payload = {
        approvedAmount: terms.approvedAmount,
        durationMonths: terms.duration,
        notes: terms.notes,
        totalRepayable: terms.totalRepayable,
        totalInterest: terms.totalInterest,
        commissionOverrides: terms.commissionOverrides,
      }
      const updated = await adminRequest(`/admin/loan-applications/${trimmed}/approve`, {
        method: 'POST',
        body: JSON.stringify(payload),
      })
      return normalizeLoanFromApi(updated)
    }

    return new Promise(async (resolve, reject) => {
      try {
        const sessionSafe = adminService.getSession()
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
        loan.owner = sessionSafe?.username || 'admin'
        loan.decisionNotes = terms.notes || ''
        loan.decisionTags = terms.tags || []
        if (terms.commissionOverrides) {
          loan.commissionOverrides = { ...(loan.commissionOverrides || {}), ...terms.commissionOverrides }
        }

        saveToStorage(loans)
        commissionService.createApprovalCommission(loan)

        auditService.record('approve', {
          loanId,
          adminName: sessionSafe?.name || 'Admin',
          message: `Approved ₦${approvedAmount.toLocaleString()} for ${duration} months. ${terms.notes || ''}`,
        })

        resolve(loan)
      } catch (error) {
        reject(error)
      }
    })
  },

  rejectLoan: async (loanId, reason) => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Reject loan')
      const updated = await adminRequest(`/admin/loan-applications/${trimmed}/reject`, {
        method: 'POST',
        body: JSON.stringify({ reason: reason || 'Application rejected' }),
      })
      return normalizeLoanFromApi(updated)
    }

    return new Promise(async (resolve, reject) => {
      try {
        const loans = await cloneLoans()
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

        saveToStorage(loans)

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
    const session = adminService.getSession()
    if (!session || session.role !== 'sales') {
      throw new Error('Only sales can assign applicants')
    }
    if (USE_BACKEND && session.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Assign to me')
      const url = `${API_ROOT}/admin/loan-applications/${trimmed}/assign-to-me`
      console.log('[Claim] Sending POST to backend:', url)
      const updated = await adminRequest(`/admin/loan-applications/${trimmed}/assign-to-me`, {
        method: 'POST',
        body: JSON.stringify({}),
      })
      console.log('[Claim] Backend responded OK, loan updated:', updated?.id ?? updated?._id)
      return normalizeLoanFromApi(updated)
    }
    console.warn(
      '[Claim] Skipping backend claim. Details:',
      {
        viteApiBaseUrl: import.meta.env.VITE_API_BASE_URL,
        USE_BACKEND,
        hasAccessToken: !!session?.accessToken,
      },
      'Assigning locally only — no network request.',
    )
    return new Promise(async (resolve, reject) => {
      try {
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

  recordRepayment: async (payload = {}) => {
    const session = getStoredSession()
    if (USE_BACKEND && !session?.accessToken) {
      throw new Error('Not authenticated')
    }
    if (USE_BACKEND && session?.accessToken) {
      return adminRequest('/admin/repayments', {
        method: 'POST',
        body: JSON.stringify(payload || {}),
      })
    }

    const loanId = payload.loanId
    const amountNaira =
      typeof payload.amountNaira === 'number'
        ? payload.amountNaira
        : Number(payload.amountKobo || 0) / 100
    const method = payload.paymentChannel || payload.method || 'Unknown'
    const reference = payload.paymentReference || payload.reference
    const scheduleIndex = Number(payload.installmentIndex)

    return adminService.recordPayment(
      loanId,
      Number.isFinite(scheduleIndex) ? scheduleIndex : 0,
      {
        amount: Number.isFinite(amountNaira) ? amountNaira : 0,
        method,
        reference,
      },
    )
  },

  getRepaymentsByLoan: async (loanId, filters = {}) => {
    const session = getStoredSession()
    if (USE_BACKEND && !session?.accessToken) {
      throw new Error('Not authenticated')
    }
    if (USE_BACKEND && session?.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Repayments')
      const query = new URLSearchParams(
        Object.entries({ loanId: trimmed, ...(filters || {}) }).reduce((acc, [k, v]) => {
          if (v === undefined || v === null || v === '') return acc
          acc[k] = String(v)
          return acc
        }, {}),
      ).toString()
      const response = await adminRequest(`/admin/repayments${query ? `?${query}` : ''}`)
      const normalizeItem = (item) => {
        const amountKobo = Number(item?.amountKobo)
        const amountNairaRaw = item?.amountNaira
        const amountNaira = typeof amountNairaRaw === 'number'
          ? amountNairaRaw
          : (Number.isFinite(amountKobo) ? amountKobo / 100 : Number(item?.amount) || 0)
        return {
          ...item,
          amountKobo: Number.isFinite(amountKobo) ? amountKobo : Math.round(amountNaira * 100),
          amountNaira,
          amount: amountNaira,
          paymentChannel: item?.paymentChannel || item?.method || 'unknown',
          paymentReference: item?.paymentReference || item?.reference || item?.id,
          paidAt: item?.paidAt || item?.createdAt || item?.date,
        }
      }
      const items = Array.isArray(response)
        ? response.map(normalizeItem)
        : (Array.isArray(response?.items) ? response.items.map(normalizeItem) : null)
      if (Array.isArray(response)) return items
      if (items) return { ...response, items }
      return response
    }

    const txs = getTransactions().filter((tx) => tx.loanId === loanId && String(tx.type || '').toLowerCase() === 'repayment')
    return txs.map((tx) => ({
      id: tx.id,
      loanId: tx.loanId,
      amountNaira: Number(tx.amount) || 0,
      amountKobo: Math.round((Number(tx.amount) || 0) * 100),
      paymentChannel: tx.method || 'unknown',
      paymentReference: tx.id,
      paidAt: tx.date,
      status: String(tx.status || '').toLowerCase() === 'successful' ? 'paid' : String(tx.status || '').toLowerCase(),
      applicantName: tx.applicantName,
    }))
  },

  recordPayment: async (loanId, installmentIndex, paymentData) => {
    const session = getStoredSession()
    if (USE_BACKEND && !session?.accessToken) {
      throw new Error('Not authenticated')
    }
    if (USE_BACKEND && session?.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Repayment')
      const amountNaira = Number(paymentData?.amount || 0)
      if (!Number.isFinite(amountNaira) || amountNaira <= 0) {
        throw new Error('Payment amount must be greater than zero')
      }
      const paidAt = paymentData?.paidAt || new Date().toISOString()
      return adminService.recordRepayment({
        loanId: trimmed,
        installmentIndex,
        amountKobo: Math.round(amountNaira * 100),
        amountNaira,
        paymentChannel: paymentData?.method || 'manual',
        paymentReference: paymentData?.reference || `PMT-${Date.now()}`,
        paidAt,
      })
    }

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

  // Wallet local helpers removed: backend is source of truth.

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
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      // Only applications that are credit-approved and awaiting disbursement
      const all = await adminService.getAllLoans({
        requireBackend: true,
        status: 'approved,approved_for_disbursement',
      })
      return all.filter((l) => (l.disbursementStatus || 'pending') === 'pending')
    }
    const loans = await loanService.getAllApplications()
    return loans.filter((l) => ['pending_disbursement', 'approved', 'disbursement_processing', 'need_more_info'].includes(l.status))
  },

  confirmDisbursement: async (loanId, payoutData, simulateResult = 'success') => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Confirm disbursement')
      const payload = {
        ...payoutData,
        simulateResult, // ignored by production backend; useful for sandbox
      }

      const candidatePaths = [
        `/admin/loan-applications/${trimmed}/disburse`,
        `/admin/loan-applications/${trimmed}/confirm-disbursement`,
        `/admin/loan-applications/${trimmed}/disbursement/confirm`,
      ]

      let lastErr = null
      for (const path of candidatePaths) {
        try {
          const updated = await adminRequest(path, {
            method: 'POST',
            body: JSON.stringify(payload || {}),
          })
          // Some backends return { loan: {...} }
          const loan = updated?.loan ?? updated?.data ?? updated
          return normalizeLoanFromApi(loan)
        } catch (err) {
          lastErr = err
          if (!looksLikeMissingRouteError(err)) break
        }
      }
      throw lastErr || new Error('Unable to confirm disbursement')
    }

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
              const intent = freshLoan.disbursementIntent || {
                ...payoutData,
                providerPayout: payoutData?.payoutAmount ?? 0,
                status: 'PROCESSING',
                createdAt: new Date().toISOString(),
                updatedAt: new Date().toISOString(),
              }
              freshLoan.disbursementIntent = intent
              const payout = intent.providerPayout ?? payoutData?.payoutAmount ?? 0

              intent.status = 'SUCCESS'
              intent.providerReference = `REF-${Date.now()}`
              intent.updatedAt = new Date().toISOString()
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

  // --- Provider Management ---

  getProviders: async () => {
    const session = getStoredSession()
    if (!USE_BACKEND || !session?.accessToken) return []
    const data = await adminRequest('/admin/providers')
    return Array.isArray(data) ? data : data?.providers ?? data?.data ?? data?.items ?? []
  },

  createProvider: async (payload) => {
    requireBackendFeature('Provider management')
    return adminRequest('/admin/providers', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  updateProviderStatus: async (providerId, status) => {
    requireBackendFeature('Provider management')
    const trimmed = String(providerId || '').trim()
    if (!trimmed) throw new Error('Provider ID is required')
    return adminRequest(`/admin/providers/${encodeURIComponent(trimmed)}/status`, {
      method: 'PATCH',
      body: JSON.stringify({ status }),
    })
  },

  requestDisbursementCorrection: async (loanId, notes) => {
    const session = getStoredSession()
    if (USE_BACKEND && session?.accessToken) {
      const trimmed = assertBackendLoanId(loanId, 'Request disbursement correction')
      const payload = { notes: notes || '' }
      const candidatePaths = [
        `/admin/loan-applications/${trimmed}/disbursement/request-correction`,
        `/admin/loan-applications/${trimmed}/request-disbursement-correction`,
        `/admin/loan-applications/${trimmed}/needs-clarification`,
      ]
      let lastErr = null
      for (const path of candidatePaths) {
        try {
          const updated = await adminRequest(path, {
            method: 'POST',
            body: JSON.stringify(payload),
          })
          const loan = updated?.loan ?? updated?.data ?? updated
          return normalizeLoanFromApi(loan)
        } catch (err) {
          lastErr = err
          if (!looksLikeMissingRouteError(err)) break
        }
      }
      throw lastErr || new Error('Unable to request correction')
    }

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

function resolveDirectDebitNames(firstName, lastName, fallbackFullName) {
  const normalizedFirst = String(firstName || '').trim()
  const normalizedLast = String(lastName || '').trim()
  if (normalizedFirst && normalizedLast) {
    return { firstName: normalizedFirst, lastName: normalizedLast }
  }

  const parts = String(fallbackFullName || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: normalizedFirst || parts[0] || 'Customer',
    lastName: normalizedLast || parts.slice(1).join(' ') || parts[0] || 'Customer',
  }
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
