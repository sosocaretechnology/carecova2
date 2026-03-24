import { Link } from 'react-router-dom'
import Button from './Button'
import ProgressBar from './ProgressBar'
import RepaymentSchedule from './RepaymentSchedule'
import StatusBadge from './StatusBadge'

const asNaira = (nairaValue, koboValue) => {
  if (typeof nairaValue === 'number' && Number.isFinite(nairaValue)) return nairaValue
  const fromKobo = Number(koboValue)
  return Number.isFinite(fromKobo) ? fromKobo / 100 : 0
}

const formatNaira = (value) => `₦${Math.round(Number(value || 0)).toLocaleString()}`

export default function RepaymentDashboard({ loan }) {
  if (!loan || !loan.repaymentSchedule) {
    return null
  }

  const schedule = loan.repaymentSchedule.map((item) => {
    const amount = asNaira(item.amount, item.amountKobo)
    const paidAmount = asNaira(item.paidAmount, item.paidAmountKobo)
    const paid = item.paid === true || String(item.status || '').toLowerCase() === 'paid'
    return {
      ...item,
      amount,
      paidAmount,
      paid,
    }
  })

  const totalAmount = schedule.reduce((sum, p) => sum + p.amount, 0)
  const paidAmount = schedule
    .reduce((sum, p) => sum + (p.paidAmount || (p.paid ? p.amount : 0)), 0)
  const outstandingBalance = totalAmount - paidAmount
  const progressPercentage = totalAmount > 0 ? (paidAmount / totalAmount) * 100 : 0

  const nextPayment = schedule.find((p) => !p.paid)

  return (
    <div className="repayment-dashboard">
      <div className="repayment-dashboard-header">
        <h2>Repayment Dashboard</h2>
        <StatusBadge status={loan.status} />
      </div>

      <div className="repayment-summary-cards">
        <div className="repayment-summary-card repayment-summary-card--primary">
          <div className="repayment-summary-label">Total Loan Amount</div>
          <div className="repayment-summary-value">
            {formatNaira(totalAmount)}
          </div>
        </div>

        <div className="repayment-summary-card">
          <div className="repayment-summary-label">Amount Paid</div>
          <div className="repayment-summary-value repayment-summary-value--success">
            {formatNaira(paidAmount)}
          </div>
        </div>

        <div className="repayment-summary-card">
          <div className="repayment-summary-label">Outstanding Balance</div>
          <div className="repayment-summary-value repayment-summary-value--warning">
            {formatNaira(outstandingBalance)}
          </div>
        </div>

        {nextPayment && (
          <div className="repayment-summary-card repayment-summary-card--highlight">
            <div className="repayment-summary-label">Next Payment Due</div>
            <div className="repayment-summary-value">
              {formatNaira(nextPayment.amount)}
            </div>
            <div className="repayment-summary-date">
              {new Date(nextPayment.dueDate).toLocaleDateString('en-US', {
                month: 'long',
                day: 'numeric',
                year: 'numeric',
              })}
            </div>
          </div>
        )}
      </div>

      <div className="repayment-progress-section">
        <ProgressBar
          value={paidAmount}
          max={totalAmount}
          label="Repayment Progress"
          showPercentage={true}
        />
      </div>

      {nextPayment && (
        <div className="repayment-action-section">
          <Link to={`/make-payment?loanId=${loan.id}`}>
            <Button variant="primary" className="full-width">
              Make Payment Now
            </Button>
          </Link>
        </div>
      )}

      <div className="repayment-schedule-section">
        <h3>Payment History & Schedule</h3>
        <RepaymentSchedule schedule={schedule} />
      </div>
    </div>
  )
}
