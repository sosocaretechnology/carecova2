import { loanService } from './loanService'

const DISBURSE_ELIGIBLE = ['approved', 'pending_disbursement', 'disbursement_processing', 'active', 'overdue', 'completed']

const calculateRepaymentSchedule = (loanAmount, duration, interestRate = 0.025) => {
  const monthlyInterest = interestRate
  const totalAmount = loanAmount * (1 + monthlyInterest * duration)
  const monthlyPayment = totalAmount / duration

  const schedule = []
  let remainingBalance = totalAmount

  for (let i = 1; i <= duration; i++) {
    const dueDate = new Date()
    dueDate.setMonth(dueDate.getMonth() + i)
    const payment = i === duration ? remainingBalance : monthlyPayment
    remainingBalance -= payment

    schedule.push({
      month: i,
      amount: Math.round(payment),
      dueDate: dueDate.toISOString().split('T')[0],
      paid: false,
    })
  }

  return {
    schedule,
    totalAmount: Math.round(totalAmount),
    monthlyPayment: Math.round(monthlyPayment),
  }
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
  trackLoan: async (loanId) => {
    try {
      const loan = await loanService.getApplication(loanId)

      // Generate repayment schedule for any post-approval status that doesn't have one
      if (DISBURSE_ELIGIBLE.includes(loan.status) && !loan.repaymentSchedule) {
        const repayment = calculateRepaymentSchedule(
          loan.approvedAmount || loan.estimatedCost,
          loan.approvedDuration || loan.preferredDuration
        )
        loan.repaymentSchedule = repayment.schedule
        loan.totalRepayment = repayment.totalAmount
        loan.monthlyInstallment = repayment.monthlyPayment
      }

      // Calculate outstanding balance and DPD
      if (loan.repaymentSchedule) {
        const now = new Date()
        const paidAmount = loan.repaymentSchedule
          .filter((p) => p.paid)
          .reduce((sum, p) => sum + p.amount, 0)
        const totalAmount = loan.repaymentSchedule.reduce(
          (sum, p) => sum + p.amount,
          0
        )
        loan.outstandingBalance = totalAmount - paidAmount
        loan.totalPaid = paidAmount

        // Calculate DPD (Days Past Due) — only meaningful once loan is active
        let maxDpd = 0
        if (loan.status === 'active' || loan.status === 'overdue') {
          loan.repaymentSchedule.forEach(p => {
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
        loan.dpd = maxDpd

        // Status transitions
        const allPaid = loan.repaymentSchedule.every(p => p.paid)
        if (allPaid && loan.status !== 'completed') {
          loan.status = 'completed'
        } else if (maxDpd > 0 && loan.status === 'active') {
          loan.status = 'overdue'
        } else if (maxDpd === 0 && loan.status === 'overdue') {
          loan.status = 'active'
        }

        // Find next payment
        const nextPayment = loan.repaymentSchedule.find((p) => !p.paid)
        loan.nextPayment = nextPayment
          ? {
            amount: nextPayment.amount,
            dueDate: nextPayment.dueDate,
            overdue: nextPayment.overdue || false,
            dpd: nextPayment.dpd || 0
          }
          : null
      }

      // Enrich with display label
      loan.statusLabel = STATUS_LABELS[loan.status] || loan.status

      return loan
    } catch (error) {
      throw error
    }
  },

  calculateRepaymentSchedule,
}
