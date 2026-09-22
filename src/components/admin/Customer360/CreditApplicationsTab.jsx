import { useNavigate } from 'react-router-dom'
import { ExternalLink, CheckCircle, Clock, XCircle, AlertCircle } from 'lucide-react'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const STATUS_CFG = {
  pending:    { label: 'Pending',    bg: '#fffbeb', color: '#d97706', Icon: Clock },
  approved:   { label: 'Approved',   bg: '#eff6ff', color: '#2563eb', Icon: CheckCircle },
  active:     { label: 'Active',     bg: '#f0fdf4', color: '#16a34a', Icon: CheckCircle },
  completed:  { label: 'Completed',  bg: '#f3f4f6', color: '#6b7280', Icon: CheckCircle },
  declined:   { label: 'Declined',   bg: '#fef2f2', color: '#dc2626', Icon: XCircle },
  cancelled:  { label: 'Cancelled',  bg: '#f9fafb', color: '#9ca3af', Icon: XCircle },
}

function StatusBadge({ status }) {
  const cfg = STATUS_CFG[status] || STATUS_CFG['pending']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
      <cfg.Icon size={12} />
      {cfg.label}
    </span>
  )
}

function SnapshotSection({ loan }) {
  const snap = loan.monoAssessmentSnapshot || {}
  const income = snap.income || {}
  const expenses = snap.expenses || {}
  const obligations = snap.obligations || {}
  const affordability = snap.affordability || {}
  const p2vest = loan.p2vestDecision || {}

  const hasSnap = snap.income || p2vest.decisionStatus || loan.geminiInsights?.preScreen

  if (!hasSnap) return (
    <div style={{ padding: '10px 14px', background: '#f9fafb', borderRadius: 7, fontSize: '0.8125rem', color: '#9ca3af' }}>
      No financial snapshot available for this application.
    </div>
  )

  const snapItems = [
    { label: 'Income Used',              value: fmt(income.estimatedMonthlyIncome || loan.monthlyIncome) },
    { label: 'Monthly Expenses',         value: fmt(expenses.estimatedMonthlyExpenses || loan.monthlyExpenses) },
    { label: 'Existing Obligations',     value: fmt(obligations.estimatedMonthlyRepayments) },
    { label: 'Est. Disposable Income',   value: fmt(affordability.estimatedDisposableIncome) },
    { label: 'Identity Status',          value: loan.verificationStatus?.identity || '—' },
    { label: 'Bank Data',                value: loan.monoLinkedAt ? `Linked ${fmtDate(loan.monoLinkedAt)}` : '—' },
    { label: 'P2Vest Score',             value: p2vest.creditScore ?? '—' },
    { label: 'P2Vest Decision',          value: p2vest.decisionStatus || '—' },
    { label: 'Affordability Score',      value: p2vest.affordabilityScore ? `${p2vest.affordabilityScore}%` : '—' },
    { label: 'Gemini Risk',              value: loan.geminiInsights?.preScreen?.initialRisk || '—' },
  ]

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 16px', marginTop: 12 }}>
      {snapItems.map(r => (
        <div key={r.label} style={{ padding: '6px 0', borderBottom: '1px solid #f3f4f6' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
          <div style={{ fontSize: '0.875rem', fontWeight: 500, color: '#374151' }}>{r.value}</div>
        </div>
      ))}
    </div>
  )
}

function ApplicationCard({ loan, navigate }) {
  const repaid = loan.totalPaid || 0
  const outstanding = loan.outstandingBalance || 0
  const approved = loan.approvedAmount || loan.estimatedCost || 0
  const pct = approved > 0 ? Math.min(100, Math.round(repaid / approved * 100)) : 0

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div>
          <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
            {loan.treatmentCategory || loan.procedureOrService || 'Healthcare Credit'}
          </div>
          <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: 2 }}>
            {loan.hospital || loan.hospitalName || '—'} · Applied {fmtDate(loan.submittedAt)}
          </div>
          <div style={{ fontFamily: 'monospace', fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{loan.id}</div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <StatusBadge status={loan.status} />
          <button
            onClick={() => navigate(`/admin/applications/${loan.id}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            Open Application <ExternalLink size={11} />
          </button>
        </div>
      </div>

      {/* Amounts */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 10, marginBottom: 14 }}>
        {[
          { label: 'Requested',   value: fmt(loan.estimatedCost || loan.requestedAmount) },
          { label: 'Approved',    value: fmt(loan.approvedAmount) },
          { label: 'Repaid',      value: fmt(repaid) },
          { label: 'Outstanding', value: fmt(outstanding), danger: outstanding > 0 },
          { label: 'Tenor',       value: loan.preferredDuration ? `${loan.preferredDuration} months` : '—' },
          { label: 'Disbursed',   value: fmtDate(loan.disbursedAt) },
        ].map(r => (
          <div key={r.label} style={{ background: '#f9fafb', borderRadius: 7, padding: '8px 12px' }}>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: r.danger ? '#dc2626' : '#111827' }}>{r.value}</div>
          </div>
        ))}
      </div>

      {/* Repayment progress */}
      {approved > 0 && (
        <div style={{ marginBottom: 14 }}>
          <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 4, fontSize: '0.8125rem' }}>
            <span style={{ color: '#6b7280' }}>Repayment Progress</span>
            <span style={{ fontWeight: 600, color: '#111827' }}>{pct}%</span>
          </div>
          <div style={{ height: 6, background: '#f3f4f6', borderRadius: 999 }}>
            <div style={{ height: 6, width: `${pct}%`, background: pct >= 100 ? '#16a34a' : '#3b82f6', borderRadius: 999 }} />
          </div>
        </div>
      )}

      {/* Financial snapshot */}
      <div>
        <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#374151', marginBottom: 4 }}>Financial Snapshot Used</div>
        <SnapshotSection loan={loan} />
      </div>
    </div>
  )
}

export default function CreditApplicationsTab({ customer }) {
  const navigate = useNavigate()
  const loans = customer.loans || []

  if (!loans.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <AlertCircle size={40} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
        <div style={{ fontWeight: 600, color: '#374151' }}>No credit applications</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 16 }}>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
          {loans.length} Credit Application{loans.length !== 1 ? 's' : ''}
        </h3>
        <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
          Each application includes a financial snapshot showing the data used at time of assessment.
        </p>
      </div>
      {loans.map(loan => (
        <ApplicationCard key={loan.id} loan={loan} navigate={navigate} />
      ))}
    </div>
  )
}
