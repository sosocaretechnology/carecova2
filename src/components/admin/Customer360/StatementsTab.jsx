import { useState } from 'react'
import { FileText, Eye, EyeOff, Info, Download } from 'lucide-react'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function StatementPeriodCard({ loan, isAdmin }) {
  const [showRaw, setShowRaw] = useState(false)

  const txs = loan.monoInformedDecisionCache?.sections?.transactions?.transactions
    || loan.transactions
    || []

  const count = txs.length

  // Derive period from transactions
  let periodStart = null
  let periodEnd = null
  if (count > 0) {
    const dates = txs.map(t => new Date(t.date || t.created_at)).filter(d => !isNaN(d))
    if (dates.length) {
      periodStart = new Date(Math.min(...dates))
      periodEnd   = new Date(Math.max(...dates))
    }
  }

  const totalCredits = txs.filter(t => t.type === 'credit' || t.amount > 0).reduce((s, t) => s + Math.abs(t.amount || 0), 0)
  const totalDebits  = txs.filter(t => t.type === 'debit'  || t.amount < 0).reduce((s, t) => s + Math.abs(t.amount || 0), 0)

  const hasCache = !!loan.monoInformedDecisionCache || count > 0

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 12 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 38, height: 38, borderRadius: 8, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <FileText size={18} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#111827' }}>
              {loan.monoIncomeProfile?.institution?.name || loan.monoIncomeProfile?.bankName || 'Bank Statement'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              Application {loan.id?.slice(-6)} · {fmtDate(loan.submittedAt)}
            </div>
          </div>
        </div>
        <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: hasCache ? '#f0fdf4' : '#f9fafb', color: hasCache ? '#16a34a' : '#9ca3af' }}>
          {hasCache ? 'Available' : 'Not Fetched'}
        </span>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginBottom: 12 }}>
        {[
          { label: 'Period Start',      value: fmtDate(periodStart) },
          { label: 'Period End',        value: fmtDate(periodEnd) },
          { label: 'Transactions',      value: String(count) },
          { label: 'Total Credits',     value: fmt(totalCredits) },
          { label: 'Total Debits',      value: fmt(totalDebits) },
          { label: 'Last Fetched',      value: fmtDate(loan.monoLinkedAt) },
        ].map(r => (
          <div key={r.label} style={{ background: '#f9fafb', borderRadius: 7, padding: '10px 12px' }}>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{r.label}</div>
            <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{r.value}</div>
          </div>
        ))}
      </div>

      {isAdmin && hasCache && (
        <div style={{ display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowRaw(p => !p)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', color: '#6b7280' }}
          >
            {showRaw ? <EyeOff size={13} /> : <Eye size={13} />}
            {showRaw ? 'Hide' : 'View'} Raw Statement Data
          </button>
        </div>
      )}

      {showRaw && (
        <pre style={{ marginTop: 12, background: '#1e1e2e', color: '#cdd6f4', padding: 16, borderRadius: 8, fontSize: '0.7rem', overflow: 'auto', maxHeight: 400 }}>
          {JSON.stringify(loan.monoInformedDecisionCache, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function StatementsTab({ customer, isAdmin }) {
  const loansWithData = (customer.loans || []).filter(
    l => l.monoAccountId || l.monoInformedDecisionCache || l.transactions
  )

  if (!loansWithData.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <FileText size={40} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No bank statements on record</div>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Fetch a bank statement from an application's Mono panel to populate this section.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ padding: '10px 14px', background: '#eff6ff', border: '1px solid #bfdbfe', borderRadius: 8, marginBottom: 18, display: 'flex', gap: 8, alignItems: 'center' }}>
        <Info size={14} color="#3b82f6" />
        <span style={{ fontSize: '0.8125rem', color: '#1d4ed8' }}>
          Statements are organized by credit application. Each entry shows the bank data fetched during that application's assessment.
        </span>
      </div>
      {loansWithData.map(loan => (
        <StatementPeriodCard key={loan.id} loan={loan} isAdmin={isAdmin} />
      ))}
    </div>
  )
}
