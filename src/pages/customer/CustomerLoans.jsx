import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { loanService } from '../../services/loanService'
import { trackingService } from '../../services/trackingService'
import StatusBadge from '../../components/StatusBadge'

const formatNaira = (value) => `₦${Math.round(Number(value || 0)).toLocaleString()}`

const asNaira = (nairaValue, koboValue) => {
  if (typeof nairaValue === 'number' && Number.isFinite(nairaValue)) return nairaValue
  const fromKobo = Number(koboValue)
  return Number.isFinite(fromKobo) ? fromKobo / 100 : 0
}

export default function CustomerLoans() {
  const navigate = useNavigate()
  const { customer } = useCustomerAuth()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!customer?.id) return
      try {
        const list = await loanService.getLoansByCustomerId(customer.id, customer.phone)
        const enriched = list.map((item) => trackingService.enrichLoan(item))
        if (!cancelled) setLoans(enriched)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [customer?.id, customer?.phone])

  if (loading) {
    return <div className="customer-portal-loading">Loading your loans...</div>
  }

  return (
    <div className="customer-loans-page">
      <h1 className="customer-loans-title">My loans</h1>
      <p className="customer-loans-subtitle">View and manage your healthcare financing applications.</p>

      {loans.length === 0 ? (
        <div className="customer-loans-empty">
          <p>You do not have any applications yet.</p>
          <Link to="/apply" className="button button--primary">Apply for financing</Link>
        </div>
      ) : (
        <div className="customer-loans-list">
          {loans.map((loan) => {
            const schedule = Array.isArray(loan.repaymentSchedule)
              ? loan.repaymentSchedule.map((item) => {
                  const amount = asNaira(item.amount, item.amountKobo)
                  const paidAmount = asNaira(item.paidAmount, item.paidAmountKobo)
                  return {
                    ...item,
                    amount,
                    paidAmount,
                    paid: item.paid === true || String(item.status || '').toLowerCase() === 'paid',
                  }
                })
              : []
            const totalRepayment =
              schedule.reduce((sum, item) => sum + item.amount, 0) ||
              asNaira(loan.totalRepayment, loan.totalRepaymentKobo)
            const paidAmount =
              schedule.reduce((sum, item) => sum + (item.paidAmount || (item.paid ? item.amount : 0)), 0) ||
              asNaira(loan.totalPaid, loan.totalPaidKobo)
            const outstanding =
              asNaira(loan.outstandingBalance, loan.outstandingBalanceKobo) ||
              Math.max(totalRepayment - paidAmount, 0)
            const progress = totalRepayment > 0 ? Math.round((paidAmount / totalRepayment) * 100) : 0
            const nextPayment = schedule.find((item) => !item.paid)
            const dueDate = nextPayment?.dueDate ? new Date(nextPayment.dueDate) : null
            const dpd = Number(loan.dpd || 0)
            const canPay = (loan.status === 'active' || loan.status === 'overdue') && !!nextPayment && outstanding > 0

            return (
              <div
                key={loan.id}
                className="customer-loans-card"
                role="button"
                tabIndex={0}
                onClick={() => navigate(`/portal/loans/${loan.id}`)}
                onKeyDown={(e) => {
                  if (e.key === 'Enter' || e.key === ' ') {
                    e.preventDefault()
                    navigate(`/portal/loans/${loan.id}`)
                  }
                }}
              >
                <div className="customer-loans-card-header">
                  <div>
                    <span className="customer-loans-card-id">{loan.id}</span>
                    <div className="customer-loans-card-meta">
                      {loan.hospital || 'Hospital not set'} • {loan.treatmentCategory || 'Treatment'}
                    </div>
                  </div>
                  <StatusBadge status={loan.status} />
                </div>
                <div className="customer-loans-card-body">
                  <div className="customer-loans-card-row">
                    <span>Principal</span>
                    <strong>{formatNaira(loan.approvedAmount || loan.estimatedCost || loan.requestedAmount)}</strong>
                  </div>
                  <div className="customer-loans-card-row">
                    <span>Total repayable</span>
                    <strong>{formatNaira(totalRepayment)}</strong>
                  </div>
                  <div className="customer-loans-card-row">
                    <span>Outstanding</span>
                    <strong>{formatNaira(outstanding)}</strong>
                  </div>
                  {nextPayment && (
                    <div className="customer-loans-card-row">
                      <span>Next due</span>
                      <strong>
                        {formatNaira(nextPayment.amount)}{dueDate ? ` • ${dueDate.toLocaleDateString('en-GB')}` : ''}
                      </strong>
                    </div>
                  )}
                  {(loan.status === 'active' || loan.status === 'overdue' || loan.status === 'completed' || totalRepayment > 0) && (
                    <div className="customer-loans-card-progress">
                      <div className="customer-loans-card-progress-track">
                        <div className="customer-loans-card-progress-bar" style={{ width: `${progress}%` }} />
                      </div>
                      <span>{progress}% repaid{dpd > 0 ? ` • ${dpd} days past due` : ''}</span>
                    </div>
                  )}
                  <div className="customer-loans-card-actions">
                    {canPay ? (
                      <Link
                        to={`/make-payment?loanId=${loan.id}`}
                        className="button button--primary button--compact"
                        onClick={(e) => e.stopPropagation()}
                      >
                        Repay now
                      </Link>
                    ) : (
                      <button
                        type="button"
                        className="button button--secondary button--compact"
                        disabled
                        onClick={(e) => e.stopPropagation()}
                      >
                        Repay unavailable
                      </button>
                    )}
                    <Link
                      to={`/portal/loans/${loan.id}#payment-history`}
                      className="button button--secondary button--compact"
                      onClick={(e) => e.stopPropagation()}
                    >
                      View payments
                    </Link>
                    <a
                      href="mailto:support@carecova.com"
                      className="button button--ghost button--compact"
                      onClick={(e) => e.stopPropagation()}
                    >
                      Contact
                    </a>
                  </div>
                </div>
                <div className="customer-loans-card-footer">
                  <span>Submitted {loan.submittedAt ? new Date(loan.submittedAt).toLocaleDateString('en-GB') : '—'}</span>
                  <span className="customer-loans-card-view">View details →</span>
                </div>
              </div>
            )
          })}
        </div>
      )}
    </div>
  )
}
