import { CheckCircle, Clock, AlertCircle, DollarSign } from 'lucide-react'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

const STATUS_CFG = {
  paid:    { label: 'Paid',    bg: '#f0fdf4', color: '#16a34a', Icon: CheckCircle },
  partial: { label: 'Partial', bg: '#fffbeb', color: '#d97706', Icon: AlertCircle },
  pending: { label: 'Due',     bg: '#f9fafb', color: '#6b7280', Icon: Clock },
  overdue: { label: 'Overdue', bg: '#fef2f2', color: '#dc2626', Icon: AlertCircle },
}

function RepaymentRow({ r }) {
  const now = new Date()
  const due = r.dueDate ? new Date(r.dueDate) : null
  const isOverdue = !r.paid && due && due < now

  const statusKey = r.paid ? 'paid'
    : (r.paidAmount > 0 && r.paidAmount < r.amount) ? 'partial'
    : isOverdue ? 'overdue'
    : 'pending'

  const cfg = STATUS_CFG[statusKey]
  const paidPct = r.amount > 0 ? Math.min(100, Math.round((r.paidAmount || 0) / r.amount * 100)) : 0

  return (
    <tr>
      <td style={{ width: 30, color: '#9ca3af', fontWeight: 700, fontSize: '0.875rem' }}>{r.month}</td>
      <td style={{ width: 110 }}>{fmtDate(r.dueDate)}</td>
      <td style={{ fontWeight: 600 }}>{fmt(r.amount)}</td>
      <td style={{ color: r.paidAmount ? '#16a34a' : '#9ca3af' }}>{fmt(r.paidAmount || 0)}</td>
      <td>
        <div style={{ height: 5, width: 80, background: '#f3f4f6', borderRadius: 999 }}>
          <div style={{ height: 5, width: `${paidPct}%`, background: statusKey === 'paid' ? '#16a34a' : statusKey === 'overdue' ? '#dc2626' : '#3b82f6', borderRadius: 999 }} />
        </div>
      </td>
      <td>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, padding: '2px 8px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
          <cfg.Icon size={11} />
          {cfg.label}
        </span>
      </td>
      <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{fmtDate(r.paymentDate || r.paidAt)}</td>
      <td style={{ fontSize: '0.75rem', color: '#9ca3af' }}>{r.paymentMethod || '—'}</td>
    </tr>
  )
}

export default function RepaymentsTab({ repayments }) {
  if (!repayments?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <DollarSign size={40} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
        <div style={{ fontWeight: 600, color: '#374151' }}>No repayment records</div>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: 4 }}>Repayment data will appear once a loan is active and installments are due.</div>
      </div>
    )
  }

  const totalDue      = repayments.reduce((s, r) => s + (r.amount || 0), 0)
  const totalPaid     = repayments.reduce((s, r) => s + (r.paidAmount || 0), 0)
  const totalOutstanding = totalDue - totalPaid
  const paidCount     = repayments.filter(r => r.paid).length
  const overdueCount  = repayments.filter(r => {
    if (r.paid) return false
    const due = r.dueDate ? new Date(r.dueDate) : null
    return due && due < new Date()
  }).length

  // Group by loan
  const byLoan = {}
  for (const r of repayments) {
    if (!byLoan[r.loanId]) byLoan[r.loanId] = { loanId: r.loanId, patientName: r.patientName, hospital: r.hospital, approvedAmount: r.approvedAmount, items: [] }
    byLoan[r.loanId].items.push(r)
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 20 }}>
        {[
          { label: 'Total Scheduled',   value: fmt(totalDue),          color: '#111827' },
          { label: 'Total Paid',        value: fmt(totalPaid),         color: '#16a34a' },
          { label: 'Outstanding',       value: fmt(totalOutstanding),  color: totalOutstanding > 0 ? '#dc2626' : '#16a34a' },
          { label: 'Installments Paid', value: `${paidCount} / ${repayments.length}`, color: '#111827' },
          { label: 'Overdue',           value: String(overdueCount),   color: overdueCount > 0 ? '#dc2626' : '#16a34a' },
        ].map(c => (
          <div key={c.label} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{c.label}</div>
            <div style={{ fontWeight: 800, fontSize: '1.25rem', color: c.color }}>{c.value}</div>
          </div>
        ))}
      </div>

      {/* Per-loan schedule */}
      {Object.values(byLoan).map(loanGroup => (
        <div key={loanGroup.loanId} style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 14 }}>
          <div style={{ marginBottom: 14 }}>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>
              {loanGroup.hospital || 'Healthcare Credit'} — {fmt(loanGroup.approvedAmount)}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#9ca3af', fontFamily: 'monospace' }}>{loanGroup.loanId}</div>
          </div>
          <div className="admin-table-container">
            <table className="admin-table">
              <thead>
                <tr>
                  <th>#</th>
                  <th>Due Date</th>
                  <th>Amount Due</th>
                  <th>Amount Paid</th>
                  <th>Progress</th>
                  <th>Status</th>
                  <th>Paid On</th>
                  <th>Method</th>
                </tr>
              </thead>
              <tbody>
                {loanGroup.items.map((r, i) => (
                  <RepaymentRow key={i} r={r} />
                ))}
              </tbody>
            </table>
          </div>
        </div>
      ))}
    </div>
  )
}
