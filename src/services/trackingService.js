import { loanService } from './loanService'
import { computeSchedule, applyCompounding } from '../utils/lendingEngine'

const DISBURSE_ELIGIBLE = ['approved', 'pending_disbursement', 'disbursement_processing', 'active', 'overdue', 'completed']
const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const USE_BACKEND = !!API_BASE_URL

function calculateRepaymentSchedule(loanAmount, duration, interestRate) {
  const result = computeSchedule(loanAmount, duration, interestRate != null ? { interestRate, lendingInterestRatePerMonth: interestRate } : undefined)
  return { schedule: result.schedule, totalAmount: result.totalAmount, monthlyPayment: result.monthlyPayment }
}

// Human-readable labels for status badges in tracking/email
export const STATUS_LABELS = {
  pending: 'Under Review',
  pending_stage1: 'Under Review',
  incomplete: 'Awaiting Documents',
  need_more_info: 'More Information Needed',
  stage_2_review: 'Credit Review',
  pending_credit_review: 'Credit Review',
  approved_credit: 'Credit Approved',
  pending_disbursement: 'Awaiting Disbursement',
  disbursement_processing: 'Disbursement Processing',
  approved: 'Approved',
  active: 'Active',
  overdue: 'Overdue',
  completed: 'Completed',
  defaulted: 'Defaulted',
  rejected: 'Rejected',
}

export const trackingService = {
  enrichLoan: (loan) => {
    const enriched = { ...(loan || {}) }

    // Generate repayment schedule for any post-approval status that doesn't have one
    if (!USE_BACKEND && DISBURSE_ELIGIBLE.includes(enriched.status) && !enriched.repaymentSchedule) {
        const repayment = computeSchedule(
          enriched.approvedAmount || enriched.estimatedCost,
          enriched.approvedDuration || enriched.preferredDuration
        )
        enriched.repaymentSchedule = repayment.schedule
        enriched.totalRepayment = repayment.totalAmount
        enriched.totalInterest = repayment.totalInterest
        enriched.monthlyInstallment = repayment.monthlyPayment
      }

      // Calculate outstanding balance and DPD
      if (enriched.repaymentSchedule) {
        const now = new Date()
        const paidAmount = enriched.repaymentSchedule
          .reduce((sum, p) => {
            const explicitPaid = Number(p.paidAmount ?? (p.paidAmountKobo != null ? Number(p.paidAmountKobo) / 100 : 0))
            if (Number.isFinite(explicitPaid) && explicitPaid > 0) return sum + explicitPaid
            return sum + (p.paid ? Number(p.amount || 0) : 0)
          }, 0)
        const totalAmount = enriched.repaymentSchedule.reduce(
          (sum, p) => sum + p.amount,
          0
        )
        enriched.outstandingBalance = totalAmount - paidAmount
        enriched.totalPaid = paidAmount
        if (!USE_BACKEND) {
          applyCompounding(enriched, now)
        }

        // Calculate DPD (Days Past Due) — only meaningful once loan is active
        let maxDpd = 0
        if (enriched.status === 'active' || enriched.status === 'overdue') {
          enriched.repaymentSchedule.forEach(p => {
            if (!p.paid) {
              const dueDate = new Date(p.dueDate)
              if (dueDate < now) {
                const diffTime = Math.abs(now - dueDate)
                const diffDays = Math.ceil(diffTime / (1000 * 60 * 60 * 24))
                if (diffDays > maxDpd) maxDpd = diffDays
                p.overdue = true
                p.dpd = diffDays
              }
            }
          })
        }
        enriched.dpd = maxDpd

        // Status transitions
        const allPaid = enriched.repaymentSchedule.every(p => p.paid)
        if (allPaid && enriched.status !== 'completed') {
          enriched.status = 'completed'
        } else if (maxDpd > 0 && enriched.status === 'active') {
          enriched.status = 'overdue'
        } else if (maxDpd === 0 && enriched.status === 'overdue') {
          enriched.status = 'active'
        }

        // Find next payment
        const nextPayment = enriched.repaymentSchedule.find((p) => !p.paid)
        enriched.nextPayment = nextPayment
          ? {
            amount: nextPayment.amount,
            dueDate: nextPayment.dueDate,
            overdue: nextPayment.overdue || false,
            dpd: nextPayment.dpd || 0
          }
          : null
      }

      // Enrich with display label
      enriched.statusLabel = STATUS_LABELS[enriched.status] || enriched.status

    return enriched
  },

  trackLoan: async (loanId) => {
    const loan = await loanService.getApplication(loanId)
    return trackingService.enrichLoan(loan)
  },

  calculateRepaymentSchedule,
  computeSchedule,
}
