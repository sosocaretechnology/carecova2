import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { loanService } from '../../services/loanService'
import StatusBadge from '../../components/StatusBadge'
import logo from '../../assets/logo.png'
import { ArrowRight, CreditCard, Clock, AlertCircle, CheckCircle } from 'lucide-react'

const asNaira = (nairaValue, koboValue) => {
  if (typeof nairaValue === 'number' && Number.isFinite(nairaValue)) return nairaValue
  const fromKobo = Number(koboValue)
  return Number.isFinite(fromKobo) ? fromKobo / 100 : 0
}

const formatNaira = (value) => `₦${Math.round(Number(value || 0)).toLocaleString()}`

const PENDING_STATUSES = ['pending', 'submitted', 'incomplete', 'pending_admin_review', 'credit_review', 'under_review']
const ACTIVE_STATUSES = ['active', 'overdue', 'approved', 'approved_for_disbursement', 'disbursed']

export default function CustomerOverview() {
  const { customer } = useCustomerAuth()
  const [loans, setLoans] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    let cancelled = false
    async function load() {
      if (!customer?.phone) {
        if (!cancelled) setLoading(false)
        return
      }
      try {
        const list = await loanService.getLoansByCustomerId(null, customer.phone)
        if (!cancelled) setLoans(list)
      } finally {
        if (!cancelled) setLoading(false)
      }
    }
    load()
    return () => { cancelled = true }
  }, [customer?.phone])

  const activeLoans = loans.filter(l => ACTIVE_STATUSES.includes(l.status))
  const pendingLoans = loans.filter(l => PENDING_STATUSES.includes(l.status))

  const nextPayment = activeLoans
    .flatMap(l =>
      (l.repaymentSchedule || [])
        .map(p => ({ ...p, amount: asNaira(p.amount, p.amountKobo) }))
        .filter(p => !p.paid)
        .map(p => ({ loan: l, ...p }))
    )
    .sort((a, b) => new Date(a.dueDate) - new Date(b.dueDate))[0]

  const totalOutstanding = activeLoans.reduce((sum, l) => {
    const balance = l.outstandingBalance ?? asNaira(l.outstandingBalanceNaira, l.outstandingBalanceKobo)
    return sum + (balance || 0)
  }, 0)

  if (loading) {
    return (
      <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'center', justifyContent: 'center', padding: '80px 24px', gap: 12 }}>
        <img src={logo} alt="CareCova" style={{ width: 40, height: 40, objectFit: 'contain', animation: 'pulse 1.4s ease-in-out infinite' }} />
        <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-body-sm)', margin: 0 }}>Loading your overview…</p>
      </div>
    )
  }

  const firstName = customer?.fullName ? customer.fullName.split(' ')[0] : ''

  return (
    <div className="customer-overview">
      {/* Welcome header */}
      <div style={{ marginBottom: 28 }}>
        <h1 style={{ fontFamily: 'var(--font-display)', fontSize: 'clamp(1.375rem, 3vw, 1.75rem)', fontWeight: 700, color: 'var(--color-text)', margin: '0 0 4px' }}>
          Welcome back{firstName ? `, ${firstName}` : ''}
        </h1>
        <p style={{ color: 'var(--color-text-muted)', margin: 0, fontSize: 'var(--text-body-sm)' }}>
          Here's a summary of your CareCova healthcare financing.
        </p>
      </div>

      {/* Summary cards */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 14, marginBottom: 32 }}>
        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', borderLeft: '4px solid var(--color-primary)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Total Applications</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>{loans.length}</div>
        </div>

        <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', borderLeft: '4px solid var(--color-success)' }}>
          <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>Active Credits</div>
          <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>{activeLoans.length}</div>
        </div>

        {pendingLoans.length > 0 && (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', borderLeft: '4px solid var(--color-warning)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 6 }}>In Review</div>
            <div style={{ fontSize: '1.875rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>{pendingLoans.length}</div>
          </div>
        )}

        {nextPayment && (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', padding: '18px 20px', borderLeft: '4px solid var(--color-info)' }}>
            <div style={{ fontSize: 'var(--text-xs)', fontWeight: 700, color: 'var(--color-text-muted)', textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>Next Payment</div>
            <div style={{ fontSize: '1.375rem', fontWeight: 700, color: 'var(--color-text)', lineHeight: 1.1, fontFamily: 'var(--font-display)' }}>{formatNaira(nextPayment.amount)}</div>
            <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 4 }}>
              Due {new Date(nextPayment.dueDate).toLocaleDateString('en-GB', { month: 'short', day: 'numeric', year: 'numeric' })}
            </div>
          </div>
        )}
      </div>

      {/* Pending applications status tracker */}
      {pendingLoans.length > 0 && (
        <section style={{ marginBottom: 28 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', marginBottom: 12 }}>
            Applications under review
          </h2>
          <div style={{ display: 'flex', flexDirection: 'column', gap: 10 }}>
            {pendingLoans.map(loan => (
              <Link
                key={loan.id}
                to={`/portal/loans/${loan.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  background: '#fff',
                  border: '1px solid var(--color-border)',
                  borderRadius: 'var(--radius-lg)',
                  textDecoration: 'none',
                  gap: 12,
                  transition: 'box-shadow 0.15s',
                }}
              >
                <div style={{ display: 'flex', alignItems: 'center', gap: 12, minWidth: 0 }}>
                  <Clock size={18} style={{ color: 'var(--color-warning)', flexShrink: 0 }} />
                  <div style={{ minWidth: 0 }}>
                    <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-body-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                      {loan.treatmentCategory || loan.hospital || 'Healthcare application'}
                    </div>
                    <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 1 }}>
                      {loan.applicationCode || loan.id}
                    </div>
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <StatusBadge status={loan.status} context="customer" />
                  <ArrowRight size={14} style={{ color: 'var(--color-text-label)' }} />
                </div>
              </Link>
            ))}
          </div>
        </section>
      )}

      {/* All applications list */}
      <section>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 12 }}>
          <h2 style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)', margin: 0 }}>
            Your applications
          </h2>
          {loans.length > 5 && (
            <Link to="/portal/loans" style={{ fontSize: 'var(--text-caption)', color: 'var(--color-primary)', fontWeight: 500, textDecoration: 'none' }}>
              View all →
            </Link>
          )}
        </div>

        {loans.length === 0 ? (
          <div style={{ textAlign: 'center', padding: '48px 24px', background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)' }}>
            <CreditCard size={36} style={{ color: 'var(--color-text-label)', margin: '0 auto 12px', opacity: 0.4 }} />
            <p style={{ color: 'var(--color-text-secondary)', fontWeight: 500, marginBottom: 8 }}>No applications yet</p>
            <p style={{ color: 'var(--color-text-muted)', fontSize: 'var(--text-body-sm)', margin: '0 0 16px' }}>
              Apply for healthcare financing to get started.
            </p>
            <Link
              to="/apply"
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, padding: '9px 18px', background: 'var(--color-primary)', color: '#fff', borderRadius: 'var(--radius-md)', fontWeight: 600, fontSize: 'var(--text-body-sm)', textDecoration: 'none' }}
            >
              Apply for healthcare financing <ArrowRight size={15} />
            </Link>
          </div>
        ) : (
          <div style={{ background: '#fff', border: '1px solid var(--color-border)', borderRadius: 'var(--radius-lg)', overflow: 'hidden' }}>
            {loans.slice(0, 6).map((loan, idx) => (
              <Link
                key={loan.id}
                to={`/portal/loans/${loan.id}`}
                style={{
                  display: 'flex',
                  alignItems: 'center',
                  justifyContent: 'space-between',
                  padding: '14px 16px',
                  textDecoration: 'none',
                  borderBottom: idx < Math.min(loans.length, 6) - 1 ? '1px solid var(--color-border-light)' : 'none',
                  gap: 12,
                }}
              >
                <div style={{ minWidth: 0, flex: 1 }}>
                  <div style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-body-sm)', overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
                    {loan.treatmentCategory || loan.hospital || 'Healthcare application'}
                  </div>
                  <div style={{ fontSize: 'var(--text-xs)', color: 'var(--color-text-muted)', marginTop: 2 }}>
                    {loan.submittedAt || loan.createdAt
                      ? new Date(loan.submittedAt || loan.createdAt).toLocaleDateString('en-GB', { day: 'numeric', month: 'short', year: 'numeric' })
                      : '—'}
                  </div>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 10, flexShrink: 0 }}>
                  <span style={{ fontWeight: 600, color: 'var(--color-text)', fontSize: 'var(--text-body-sm)' }}>
                    {formatNaira(loan.approvedAmount || loan.estimatedCost || loan.requestedAmount)}
                  </span>
                  <StatusBadge status={loan.status} context="customer" />
                  <ArrowRight size={14} style={{ color: 'var(--color-text-label)' }} />
                </div>
              </Link>
            ))}
          </div>
        )}
      </section>
    </div>
  )
}
