import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { loanService } from '../../services/loanService'
import StatusBadge from '../../components/StatusBadge'

const asNaira = (nairaValue, koboValue) => {
  if (typeof nairaValue === 'number' && Number.isFinite(nairaValue)) return nairaValue
  const fromKobo = Number(koboValue)
  return Number.isFinite(fromKobo) ? fromKobo / 100 : 0
}

const formatNaira = (value) => `₦${Math.round(Number(value || 0)).toLocaleString()}`

export default function CustomerOverview() {
  const { customer } = useCustomerAuth()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!customer?.id) return
      try {
        const list = await loanService.getLoansByCustomerId(customer.id, customer.phone)
        if (!cancelled) setLoans(list)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [customer?.id, customer?.phone])

  const activeLoans = loans.filter((l) => l.status === 'active' || l.status === 'overdue')
  const pendingOrApproved = loans.filter((l) => ['pending', 'approved', 'pending_disbursement'].includes(l.status))
  const nextPayment = activeLoans
    .flatMap((l) =>
      (l.repaymentSchedule || [])
        .map((p) => ({
          ...p,
          amount: asNaira(p.amount, p.amountKobo),
        }))
        .filter((p) => !p.paid)
        .map((p) => ({ loan: l, ...p })),
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]

  if (loading) {
    return <div className="customer-portal-loading">Loading your overview...</div>
  }

  return (
    <div className="customer-overview">
      <h1 className="customer-overview-title">Welcome back{customer?.fullName ? `, ${customer.fullName.split(' ')[0]}` : ''}</h1>
      <p className="customer-overview-subtitle">Here’s a quick summary of your healthcare financing.</p>

      <div className="customer-overview-cards">
        <div className="customer-overview-card">
          <div className="customer-overview-card-value">{loans.length}</div>
          <div className="customer-overview-card-label">Total applications</div>
        </div>
        <div className="customer-overview-card highlight">
          <div className="customer-overview-card-value">{activeLoans.length}</div>
          <div className="customer-overview-card-label">Active loans</div>
        </div>
        {nextPayment && (
          <div className="customer-overview-card">
            <div className="customer-overview-card-value">{formatNaira(nextPayment.amount)}</div>
            <div className="customer-overview-card-label">Next payment due</div>
            <div className="customer-overview-card-meta">{new Date(nextPayment.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}</div>
          </div>
        )}
      </div>

      <section className="customer-overview-section">
        <h2>Your applications</h2>
        {loans.length === 0 ? (
          <p className="customer-overview-empty">You don’t have any applications yet. <Link to="/apply">Apply for healthcare financing</Link>.</p>
        ) : (
          <ul className="customer-overview-list">
            {loans.slice(0, 5).map((loan) => (
              <li key={loan.id}>
                <Link to={`/portal/loans/${loan.id}`} className="customer-overview-list-item">
                  <span className="customer-overview-list-id">{loan.id}</span>
                  <span className="customer-overview-list-amount">{formatNaira(loan.approvedAmount || loan.estimatedCost || loan.requestedAmount)}</span>
                  <StatusBadge status={loan.status} />
                </Link>
              </li>
            ))}
          </ul>
        )}
        {loans.length > 0 && (
          <Link to="/portal/loans" className="customer-overview-link">View all loans →</Link>
        )}
      </section>
    </div>
  )
}
