/**
 * Payment Service
 * Handles customer repayments (backend via Paystack) and demo simulation fallback.
 */
import { customerAuthService } from './customerAuthService'

const PAYMENT_STORAGE_KEY = 'carecova_payments'
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''
const USE_BACKEND = !!API_BASE_URL

const generateTransactionId = () => {
  return `TXN-${Date.now()}-${Math.random().toString(36).substr(2, 9).toUpperCase()}`
}

const getPayments = () => {
  try {
    const stored = localStorage.getItem(PAYMENT_STORAGE_KEY)
    return stored ? JSON.parse(stored) : []
  } catch (error) {
    console.error('Error reading payments from localStorage:', error)
    return []
  }
}

const savePayment = (payment) => {
  try {
    const payments = getPayments()
    payments.push(payment)
    localStorage.setItem(PAYMENT_STORAGE_KEY, JSON.stringify(payments))
  } catch (error) {
    console.error('Error saving payment to localStorage:', error)
  }
}

async function request(path, options = {}) {
  const response = await fetch(`${API_ROOT}${path}`, {
    headers: {
      'Content-Type': 'application/json',
      ...(options.headers || {}),
    },
    ...options,
  })

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()

  if (!response.ok) {
    const message =
      (isJson && (Array.isArray(body?.message) ? body.message.join(', ') : body?.message)) ||
      (typeof body === 'string' ? body : 'Request failed')
    throw new Error(message)
  }

  return body
}

function resolvePhoneLast4(explicitPhoneLast4) {
  const supplied = String(explicitPhoneLast4 || '').replace(/\D/g, '')
  if (supplied.length === 4) return supplied

  const session = customerAuthService.getSession()
  const digits = String(session?.phone || '').replace(/\D/g, '')
  if (digits.length < 4) {
    throw new Error('Unable to verify phone number for repayment. Please sign in again.')
  }
  return digits.slice(-4)
}

export const paymentService = {
  createRepaymentLink: async ({
    loanId,
    amount,
    email,
    phoneLast4,
  }) => {
    if (!USE_BACKEND) {
      throw new Error('Repayment link generation requires backend API')
    }
    const payload = {
      loanApplicationId: String(loanId || '').trim(),
      phoneLast4: resolvePhoneLast4(phoneLast4),
      ...(amount != null ? { amount: Number(amount) } : {}),
      ...(email ? { email: String(email).trim().toLowerCase() } : {}),
    }
    return request('/payments/customer/repayment-link', {
      method: 'POST',
      body: JSON.stringify(payload),
    })
  },

  getLoanRepayments: async ({
    loanId,
    page = 1,
    limit = 50,
    phoneLast4,
  }) => {
    if (!USE_BACKEND) return []
    const params = new URLSearchParams({
      loanApplicationId: String(loanId || '').trim(),
      phoneLast4: resolvePhoneLast4(phoneLast4),
      page: String(page),
      limit: String(limit),
    })
    const response = await request(`/payments/customer/repayments?${params.toString()}`)
    return Array.isArray(response) ? response : (response?.items || [])
  },

  getTransactionByReference: async (reference, phoneLast4) => {
    if (!USE_BACKEND) {
      throw new Error('Payment transaction lookup requires backend API')
    }
    const ref = String(reference || '').trim()
    if (!ref) throw new Error('Payment reference is required')
    const params = new URLSearchParams({
      phoneLast4: resolvePhoneLast4(phoneLast4),
    })
    return request(`/payments/customer/transaction/${encodeURIComponent(ref)}?${params.toString()}`)
  },

  /**
   * Process a payment
   * @param {Object} paymentData - Payment details
   * @param {string} paymentData.loanId - Loan ID
   * @param {number} paymentData.amount - Payment amount
   * @param {string} paymentData.method - Payment method
   * @returns {Promise<Object>} Payment result
   */
  processPayment: async ({ loanId, amount, method }) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        try {
          const transactionId = generateTransactionId()
          const numericAmount = Number(amount || 0)
          if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
            throw new Error('Payment amount must be greater than zero')
          }
          const processedAt = new Date().toISOString()

          const payment = {
            id: transactionId,
            loanId,
            amount: numericAmount,
            method,
            status: 'completed',
            processedAt,
            receiptUrl: `/receipts/${transactionId}`,
          }

          savePayment(payment)

          // Update loan repayment schedule (simulated)
          // In real implementation, this would be handled by backend
          const loans = JSON.parse(localStorage.getItem('carecova_loans') || '[]')
          const loan = loans.find((l) => l.id === loanId)

          if (loan && loan.repaymentSchedule) {
            const nextUnpaid = loan.repaymentSchedule.find((p) => !p.paid)
            if (nextUnpaid) {
              const currentPaid = Number(nextUnpaid.paidAmount || 0)
              const due = Number(nextUnpaid.amount || 0)
              const updatedPaid = currentPaid + numericAmount
              const isFullyPaid = updatedPaid >= due

              nextUnpaid.paidAmount = updatedPaid
              nextUnpaid.paid = isFullyPaid
              nextUnpaid.status = isFullyPaid ? 'PAID' : 'PARTIAL'
              nextUnpaid.paidDate = processedAt
              nextUnpaid.paymentDate = processedAt
              nextUnpaid.paidOn = processedAt
              nextUnpaid.paymentMethod = method || 'Simulated Payment'
              nextUnpaid.txReference = transactionId

              const totalPaid = (loan.repaymentSchedule || []).reduce(
                (sum, item) => sum + (Number(item.paidAmount || 0) || (item.paid ? Number(item.amount || 0) : 0)),
                0,
              )
              const totalRepayment = (loan.repaymentSchedule || []).reduce(
                (sum, item) => sum + Number(item.amount || 0),
                0,
              )
              loan.totalPaid = totalPaid
              loan.outstandingBalance = Math.max(totalRepayment - totalPaid, 0)
              if (loan.outstandingBalance <= 0) {
                loan.status = 'completed'
                loan.completedAt = processedAt
              }
              localStorage.setItem('carecova_loans', JSON.stringify(loans))
            }
          }

          resolve(payment)
        } catch (error) {
          reject(error)
        }
      }, 1500)
    })
  },

  /**
   * Get payment history for a loan
   * @param {string} loanId - Loan ID
   * @returns {Promise<Array>} Array of payments
   */
  getPaymentHistory: async (loanId) => {
    if (USE_BACKEND) {
      return paymentService.getLoanRepayments({ loanId, limit: 100 })
    }
    return new Promise((resolve) => {
      setTimeout(() => {
        const payments = getPayments()
        const loanPayments = payments.filter((p) => p.loanId === loanId)
        resolve(loanPayments)
      }, 300)
    })
  },

  /**
   * Get payment receipt
   * @param {string} transactionId - Transaction ID
   * @returns {Promise<Object>} Payment receipt
   */
  getReceipt: async (transactionId) => {
    return new Promise((resolve, reject) => {
      setTimeout(() => {
        const payments = getPayments()
        const payment = payments.find((p) => p.id === transactionId)
        if (payment) {
          resolve(payment)
        } else {
          reject(new Error('Receipt not found'))
        }
      }, 300)
    })
  },
}
