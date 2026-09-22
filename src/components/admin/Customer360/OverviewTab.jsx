import { useNavigate } from 'react-router-dom'
import { CheckCircle, Clock, AlertCircle, XCircle, Wifi, WifiOff, Activity, TrendingUp, CreditCard, AlertTriangle } from 'lucide-react'
import { freshnessService } from '../../../services/freshnessService'
import DataFreshnessPanel from './DataFreshnessPanel'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'

function StatusIndicator({ status, labels = {} }) {
  const map = {
    verified:    { color: '#16a34a', bg: '#f0fdf4', Icon: CheckCircle,  label: 'Verified' },
    partial:     { color: '#d97706', bg: '#fffbeb', Icon: AlertCircle,  label: 'Partial' },
    pending:     { color: '#3b82f6', bg: '#eff6ff', Icon: Clock,        label: 'Pending' },
    linked:      { color: '#16a34a', bg: '#f0fdf4', Icon: Wifi,         label: 'Linked' },
    not_linked:  { color: '#9ca3af', bg: '#f9fafb', Icon: WifiOff,      label: 'Not Linked' },
    not_started: { color: '#9ca3af', bg: '#f9fafb', Icon: XCircle,      label: 'Not Started' },
    active:      { color: '#16a34a', bg: '#f0fdf4', Icon: Activity,     label: 'Active' },
    good:        { color: '#16a34a', bg: '#f0fdf4', Icon: TrendingUp,   label: 'Good' },
    caution:     { color: '#d97706', bg: '#fffbeb', Icon: AlertTriangle,label: 'Caution' },
  }
  const cfg = map[status] || map['not_started']
  const label = labels[status] || cfg.label
  return (
    <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
      <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
        <cfg.Icon size={17} color={cfg.color} />
      </div>
      <span style={{ fontWeight: 600, color: cfg.color, fontSize: '0.875rem' }}>{label}</span>
    </div>
  )
}

export default function OverviewTab({ customer }) {
  const navigate = useNavigate()
  const freshness = freshnessService.deriveFromCustomer(customer)

  const kycStatus = customer.kycStatus || 'not_started'
  const monoStatus = customer.hasMonoConnection ? 'linked' : (customer.monoConnectionStatus === 'pending' ? 'pending' : 'not_linked')
  const incomeStr = customer.estimatedMonthlyIncome ? fmt(customer.estimatedMonthlyIncome) : '—'
  const affordabilityStr = customer.estimatedDisposableIncome ? fmt(customer.estimatedDisposableIncome) : '—'
  const creditStr = fmt(customer.totalCreditLimit)
  const outstandingStr = fmt(customer.outstandingBalance)

  const latestLoan = customer.latestLoan
  const latestAppStatus = latestLoan?.status || '—'
  const statusColors = { pending: '#d97706', approved: '#2563eb', active: '#16a34a', completed: '#6b7280', declined: '#dc2626' }

  const summaryCards = [
    { label: 'KYC STATUS',         value: kycStatus,                         type: 'status', statusMap: { verified: 'verified', partial: 'partial', pending: 'pending', not_started: 'not_started' } },
    { label: 'BANK CONNECTION',     value: monoStatus,                        type: 'status' },
    { label: 'EST. MONTHLY INCOME', value: incomeStr,                         type: 'money' },
    { label: 'AFFORDABILITY',       value: affordabilityStr,                  type: 'money' },
    { label: 'CURRENT CREDIT',      value: creditStr,                         type: 'money', sub: `${customer.activeLoansCount} active loan${customer.activeLoansCount !== 1 ? 's' : ''}` },
    { label: 'OUTSTANDING',         value: outstandingStr,                    type: 'money', danger: customer.outstandingBalance > 0 },
    { label: 'LAST FINANCIAL SYNC', value: fmtDateTime(customer.lastMonoSync),type: 'date' },
  ]

  return (
    <div>
      {/* Summary strip */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 28 }}>
        {summaryCards.map(card => (
          <div key={card.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 16px', boxShadow: '0 1px 3px rgba(0,0,0,0.04)' }}>
            <div style={{ fontSize: '0.6875rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 6 }}>{card.label}</div>
            {card.type === 'status' ? (
              <StatusIndicator status={card.value} labels={card.statusMap} />
            ) : (
              <div style={{ fontWeight: 700, fontSize: '1.125rem', color: card.danger ? '#dc2626' : '#111827' }}>
                {card.value}
                {card.sub && <div style={{ fontWeight: 400, fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>{card.sub}</div>}
              </div>
            )}
          </div>
        ))}
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 20 }}>

        {/* Application timeline */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Credit Application History</h3>
          {customer.loans.length === 0 ? (
            <p style={{ color: '#9ca3af', fontSize: '0.875rem' }}>No applications yet.</p>
          ) : (
            <div>
              {customer.loans.slice(0, 5).map((loan, i) => (
                <div
                  key={loan.id}
                  style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '10px 0', borderBottom: i < Math.min(customer.loans.length, 5) - 1 ? '1px solid #f3f4f6' : 'none', cursor: 'pointer' }}
                  onClick={() => navigate(`/admin/applications/${loan.id}`)}
                >
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>
                      {loan.treatmentCategory || loan.procedureOrService || 'Healthcare Credit'}
                    </div>
                    <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 2 }}>
                      {fmtDate(loan.submittedAt)} · {loan.hospital || '—'}
                    </div>
                  </div>
                  <div style={{ textAlign: 'right' }}>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{fmt(loan.approvedAmount || loan.estimatedCost)}</div>
                    <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '1px 8px', borderRadius: 999, background: `${statusColors[loan.status] || '#9ca3af'}18`, color: statusColors[loan.status] || '#9ca3af' }}>
                      {loan.status}
                    </span>
                  </div>
                </div>
              ))}
              {customer.loans.length > 5 && (
                <div style={{ marginTop: 10, fontSize: '0.8125rem', color: '#2563eb', cursor: 'pointer' }} onClick={() => {}}>
                  View all {customer.loans.length} applications →
                </div>
              )}
            </div>
          )}
        </div>

        {/* Key details */}
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px' }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Patient Snapshot</h3>
          {[
            { label: 'Full Name',         value: customer.fullName },
            { label: 'Phone',             value: customer.phone },
            { label: 'Email',             value: customer.email },
            { label: 'Date of Birth',     value: fmtDate(customer.dateOfBirth) },
            { label: 'Gender',            value: customer.gender || '—' },
            { label: 'State',             value: customer.state || '—' },
            { label: 'Employment',        value: customer.employmentType ? `${customer.employmentType}${customer.employerName ? ` · ${customer.employerName}` : ''}` : '—' },
            { label: 'Declared Income',   value: fmt(customer.declaredMonthlyIncome) },
            { label: 'Member Since',      value: fmtDate(customer.firstApplicationDate) },
          ].map(row => (
            <div key={row.label} style={{ display: 'flex', justifyContent: 'space-between', padding: '7px 0', borderBottom: '1px solid #f9fafb' }}>
              <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{row.label}</span>
              <span style={{ fontSize: '0.875rem', fontWeight: 500, color: '#111827', maxWidth: '60%', textAlign: 'right' }}>{row.value || '—'}</span>
            </div>
          ))}
        </div>
      </div>

      <DataFreshnessPanel freshness={freshness} />
    </div>
  )
}
