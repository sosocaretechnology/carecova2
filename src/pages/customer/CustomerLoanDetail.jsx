import { useState, useEffect } from 'react'
import { useParams, Link } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { loanService } from '../../services/loanService'
import { trackingService } from '../../services/trackingService'
import { paymentService } from '../../services/paymentService'
import RepaymentDashboard from '../../components/RepaymentDashboard'
import StatusBadge from '../../components/StatusBadge'

const asNaira = (nairaValue, koboValue) => {
  if (typeof nairaValue === 'number' && Number.isFinite(nairaValue)) return nairaValue
  const fromKobo = Number(koboValue)
  return Number.isFinite(fromKobo) ? fromKobo / 100 : 0
}

const formatNaira = (value) => `₦${Math.round(Number(value || 0)).toLocaleString()}`

const formatDateTime = (value) => {
  if (!value) return '—'
  const d = new Date(value)
  if (Number.isNaN(d.getTime())) return '—'
  return d.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

export default function CustomerLoanDetail() {
  const { id } = useParams()
  const { customer } = useCustomerAuth()
  const [loan, setLoan] = useState(null)
  const [repayments, setRepayments] = useState([])
  const [loading, setLoading] = useState(true)
  const [forbidden, setForbidden] = useState(false)
  const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
  const USE_BACKEND = !!API_BASE_URL

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!id || !customer?.id) return
      try {
        const myLoans = await loanService.getLoansByCustomerId(customer.id, customer.phone)
        const found = myLoans.find((l) => l.id === id)
        if (!cancelled) {
          setLoan(found ? trackingService.enrichLoan(found) : null)
          setForbidden(!found && myLoans.length > 0)
        }
      } catch (e) {
        if (!cancelled) setLoan(null)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [id, customer?.id, customer?.phone])

  useEffect(() => {
    let cancelled = false
    async function loadRepayments() {
      if (!USE_BACKEND || !loan?.id) {
        setRepayments([])
        return
      }
      try {
        const list = await paymentService.getLoanRepayments({
          loanId: loan.id,
          limit: 100,
        })
        if (!cancelled) setRepayments(Array.isArray(list) ? list : [])
      } catch (_) {
        if (!cancelled) setRepayments([])
      }
    }
    loadRepayments()
    return () => { cancelled = true }
  }, [USE_BACKEND, loan?.id])

  if (loading) {
    return <div className="customer-portal-loading">Loading loan details...</div>
  }

  if (forbidden || !loan) {
    return (
      <div className="customer-portal-error">
        <h2>Loan not found</h2>
        <p>This loan doesn’t belong to your account or doesn’t exist.</p>
        <Link to="/portal/loans">Back to my loans</Link>
      </div>
    )
  }

  const isApproved = loan.status === 'approved' && !loan.offerAcceptedAt
  const isActiveOrCompleted = loan.status === 'active' || loan.status === 'overdue' || loan.status === 'completed'
  const schedule = Array.isArray(loan.repaymentSchedule)
    ? loan.repaymentSchedule.map((item, index) => {
        const amount = asNaira(item.amount, item.amountKobo)
        const paidAmount = asNaira(item.paidAmount, item.paidAmountKobo)
        const normalizedStatus = String(item.status || '').toLowerCase()
        const paid = item.paid === true || normalizedStatus === 'paid' || paidAmount >= amount
        return {
          ...item,
          month: item.month || index + 1,
          amount,
          paidAmount,
          paymentReference: item.paymentReference || item.txReference || item.lastPaymentReference,
          paymentChannel: item.paymentChannel || item.paymentMethod || item.lastPaymentChannel,
          paymentDate: item.paymentDate || item.paidOn || item.paidAt,
          status: normalizedStatus || (paid ? 'paid' : 'scheduled'),
          paid,
        }
      })
    : []
  const totalRepayment =
    schedule.reduce((sum, item) => sum + item.amount, 0) ||
    asNaira(loan.totalRepayment, loan.totalRepaymentKobo)
  const totalPaid =
    schedule.reduce((sum, item) => sum + (item.paidAmount || (item.paid ? item.amount : 0)), 0) ||
    asNaira(loan.totalPaid, loan.totalPaidKobo)
  const outstanding =
    asNaira(loan.outstandingBalance, loan.outstandingBalanceKobo) ||
    Math.max(totalRepayment - totalPaid, 0)
  const nextPayment = schedule.find((item) => !item.paid)
  const fallbackNextDue = loan.nextDueDate
    ? {
        amount: asNaira(loan.monthlyInstallment, loan.monthlyInstallmentKobo) || 0,
        dueDate: loan.nextDueDate,
      }
    : null
  const nextDue = nextPayment || fallbackNextDue
  const repaymentRows = repayments.map((item) => ({
    id: item.id,
    amount: Number(item.amountNaira ?? (Number(item.amountKobo || 0) / 100) ?? 0),
    channel: item.paymentChannel || '—',
    reference: item.paymentReference || item.id,
    status: item.status || 'paid',
    paidAt: item.paidAt || item.createdAt || null,
  }))
  const lifecycle = [
    { label: 'Submitted', value: loan.submittedAt || loan.createdAt, type: 'base' },
    { label: 'Offer approved', value: loan.approvedAt || loan.decidedAt, type: 'success' },
    { label: 'Offer accepted', value: loan.offerAcceptedAt, type: 'success' },
    { label: 'Disbursed', value: loan.disbursedAt || loan.disbursementConfirmedAt, type: 'success' },
    { label: 'Completed', value: loan.completedAt, type: 'success' },
    { label: 'Rejected', value: loan.rejectedAt, type: 'danger' },
  ].filter((item) => item.value)
  const canPay = (loan.status === 'active' || loan.status === 'overdue') && nextDue && outstanding > 0
  const hospitalPhone = loan.hospitalPhone || loan.facilityPhone || loan.providerPhone || ''
  const hospitalEmail = loan.hospitalEmail || loan.facilityEmail || loan.providerEmail || ''

  return (
    <div className="customer-loan-detail">
      <div className="customer-loan-detail-header">
        <Link to="/portal/loans" className="customer-loan-detail-back">← My loans</Link>
        <h1 className="customer-loan-detail-title">Application {loan.id}</h1>
        <StatusBadge status={loan.status} />
      </div>

      {isApproved && (
        <div className="customer-loan-detail-cta">
          <p>Your application has been approved. Review and accept your offer to proceed.</p>
          <Link to={`/offer/${loan.id}`} className="button button--primary">View and accept offer</Link>
        </div>
      )}

      <div className="customer-loan-detail-summary-grid">
        <div className="customer-loan-detail-summary-card">
          <div className="customer-loan-detail-summary-label">Principal</div>
          <div className="customer-loan-detail-summary-value">{formatNaira(loan.approvedAmount || loan.estimatedCost || loan.requestedAmount)}</div>
        </div>
        <div className="customer-loan-detail-summary-card">
          <div className="customer-loan-detail-summary-label">Total repayable</div>
          <div className="customer-loan-detail-summary-value">{formatNaira(totalRepayment)}</div>
        </div>
        <div className="customer-loan-detail-summary-card">
          <div className="customer-loan-detail-summary-label">Total paid</div>
          <div className="customer-loan-detail-summary-value">{formatNaira(totalPaid)}</div>
        </div>
        <div className="customer-loan-detail-summary-card">
          <div className="customer-loan-detail-summary-label">Outstanding</div>
          <div className="customer-loan-detail-summary-value">{formatNaira(outstanding)}</div>
        </div>
        <div className="customer-loan-detail-summary-card">
          <div className="customer-loan-detail-summary-label">Next due</div>
          <div className="customer-loan-detail-summary-value">
            {nextDue ? `${formatNaira(nextDue.amount)} • ${new Date(nextDue.dueDate).toLocaleDateString('en-GB')}` : '—'}
          </div>
        </div>
        <div className="customer-loan-detail-summary-card">
          <div className="customer-loan-detail-summary-label">Days past due</div>
          <div className="customer-loan-detail-summary-value">{Number(loan.dpd || 0)}</div>
        </div>
      </div>

      <div className="customer-loan-detail-actions">
        {canPay ? (
          <Link to={`/make-payment?loanId=${loan.id}`} className="button button--primary">
            Make repayment
          </Link>
        ) : (
          <button type="button" className="button button--secondary" disabled title="Repayment opens once loan is active with due installment">
            Repayment unavailable
          </button>
        )}
        <a href="#payment-history" className="button button--secondary">
          Verify past payments
        </a>
        {hospitalPhone ? (
          <a href={`tel:${hospitalPhone}`} className="button button--ghost">
            Contact facility
          </a>
        ) : hospitalEmail ? (
          <a href={`mailto:${hospitalEmail}`} className="button button--ghost">
            Contact facility
          </a>
        ) : (
          <a href="mailto:support@carecova.com" className="button button--ghost">
            Contact support
          </a>
        )}
      </div>

      <div className="customer-loan-detail-info">
        <h2>Lifecycle timeline</h2>
        {lifecycle.length === 0 ? (
          <p className="customer-loan-detail-status-note">No lifecycle events yet.</p>
        ) : (
          <ul className="customer-loan-detail-timeline">
            {lifecycle.map((event) => (
              <li key={`${event.label}-${event.value}`} className={`customer-loan-detail-timeline-item ${event.type}`}>
                <span className="customer-loan-detail-timeline-label">{event.label}</span>
                <span className="customer-loan-detail-timeline-date">{formatDateTime(event.value)}</span>
              </li>
            ))}
          </ul>
        )}
        {(loan.rejectionReason || loan.infoRequest || loan.decisionNotes) && (
          <div className="customer-loan-detail-note-stack">
            {loan.rejectionReason ? (
              <div className="customer-loan-detail-note customer-loan-detail-note--danger">
                <strong>Rejection reason:</strong> {loan.rejectionReason}
              </div>
            ) : null}
            {loan.infoRequest ? (
              <div className="customer-loan-detail-note customer-loan-detail-note--warning">
                <strong>Information requested:</strong> {loan.infoRequest}
              </div>
            ) : null}
            {loan.decisionNotes ? (
              <div className="customer-loan-detail-note">
                <strong>Decision notes:</strong> {loan.decisionNotes}
              </div>
            ) : null}
          </div>
        )}
      </div>

      {isActiveOrCompleted && loan.repaymentSchedule && (
        <>
          <RepaymentDashboard loan={{ ...loan, repaymentSchedule: schedule }} />
          <div id="payment-history" className="customer-loan-detail-info">
            <h2>Repayment details</h2>
            {schedule.length === 0 ? (
              <p className="customer-loan-detail-status-note">Repayment schedule is not available yet.</p>
            ) : (
              <div className="customer-repayment-table-wrap">
                <table className="customer-repayment-table">
                  <thead>
                    <tr>
                      <th>Month</th>
                      <th>Due date</th>
                      <th>Amount</th>
                      <th>Paid amount</th>
                      <th>Status</th>
                      <th>Payment date</th>
                      <th>Reference</th>
                      <th>Channel</th>
                    </tr>
                  </thead>
                  <tbody>
                    {schedule.map((item) => (
                      <tr key={`${item.month}-${item.dueDate}`}>
                        <td>{item.month}</td>
                        <td>{item.dueDate ? new Date(item.dueDate).toLocaleDateString('en-GB') : '—'}</td>
                        <td>{formatNaira(item.amount)}</td>
                        <td>{formatNaira(item.paidAmount)}</td>
                        <td className="capitalize">{item.status || (item.paid ? 'paid' : 'scheduled')}</td>
                        <td>{item.paymentDate ? formatDateTime(item.paymentDate) : '—'}</td>
                        <td>{item.paymentReference || '—'}</td>
                        <td>{item.paymentChannel || '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
            {USE_BACKEND && (
              <div className="customer-repayment-table-wrap" style={{ marginTop: 16 }}>
                <h3 style={{ marginBottom: 8 }}>Repayment transactions</h3>
                <table className="customer-repayment-table">
                  <thead>
                    <tr>
                      <th>Reference</th>
                      <th>Amount</th>
                      <th>Channel</th>
                      <th>Status</th>
                      <th>Paid at</th>
                    </tr>
                  </thead>
                  <tbody>
                    {repaymentRows.length === 0 ? (
                      <tr>
                        <td colSpan="5">No repayments recorded yet.</td>
                      </tr>
                    ) : repaymentRows.map((row) => (
                      <tr key={row.id}>
                        <td>{row.reference}</td>
                        <td>{formatNaira(row.amount)}</td>
                        <td>{row.channel}</td>
                        <td className="capitalize">{String(row.status).toLowerCase()}</td>
                        <td>{row.paidAt ? formatDateTime(row.paidAt) : '—'}</td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            )}
          </div>
        </>
      )}

      {!isApproved && !isActiveOrCompleted && (
        <div className="customer-loan-detail-info">
          <h2>Application details</h2>
          <dl className="customer-loan-detail-dl">
            <dt>Patient</dt>
            <dd>{loan.fullName || loan.patientName}</dd>
            <dt>Hospital</dt>
            <dd>{loan.hospital || '—'}</dd>
            <dt>Treatment</dt>
            <dd>{loan.treatmentCategory || '—'}</dd>
            <dt>Amount requested</dt>
            <dd>{formatNaira(loan.estimatedCost || loan.requestedAmount)}</dd>
            <dt>Submitted</dt>
            <dd>{new Date(loan.submittedAt).toLocaleDateString()}</dd>
          </dl>
          <p className="customer-loan-detail-status-note">We’ll review your application and get in touch. You can track status here or via the link we sent you.</p>
        </div>
      )}
    </div>
  )
}
