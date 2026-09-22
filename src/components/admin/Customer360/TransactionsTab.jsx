import { useState, useMemo } from 'react'
import { Search, Filter, ChevronDown, ChevronUp, Eye, EyeOff, ArrowDownCircle, ArrowUpCircle, Info } from 'lucide-react'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function TransactionRow({ tx, isAdmin }) {
  const [expanded, setExpanded] = useState(false)
  const [showRaw, setShowRaw] = useState(false)

  const amount = tx.amount ?? tx.value ?? 0
  const isCredit = tx.type === 'credit' || (tx.debit === false) || amount > 0
  const isDebit  = tx.type === 'debit'  || (tx.debit === true)  || amount < 0
  const absAmount = Math.abs(amount)
  const date = tx.date || tx.created_at || tx.transaction_date

  return (
    <>
      <tr
        style={{ cursor: 'pointer', background: expanded ? '#f9fafb' : 'transparent' }}
        onClick={() => setExpanded(p => !p)}
      >
        <td style={{ width: 100 }}>{fmtDate(date)}</td>
        <td>
          <div style={{ fontWeight: 500, color: '#111827', maxWidth: 260, overflow: 'hidden', textOverflow: 'ellipsis', whiteSpace: 'nowrap' }}>
            {tx.narration || tx.description || tx.merchant || '—'}
          </div>
          {tx.category && (
            <span style={{ fontSize: '0.7rem', padding: '1px 7px', borderRadius: 999, background: '#eff6ff', color: '#3b82f6', fontWeight: 600 }}>{tx.category}</span>
          )}
        </td>
        <td style={{ textAlign: 'right', fontWeight: 700, color: isCredit ? '#16a34a' : (isDebit ? '#dc2626' : '#374151') }}>
          {isCredit ? '+' : isDebit ? '−' : ''}{fmt(absAmount)}
        </td>
        <td>
          {isCredit
            ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#16a34a', background: '#f0fdf4', padding: '2px 8px', borderRadius: 999 }}><ArrowDownCircle size={11} /> Credit</span>
            : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, color: '#dc2626', background: '#fef2f2', padding: '2px 8px', borderRadius: 999 }}><ArrowUpCircle size={11} /> Debit</span>
          }
        </td>
        <td style={{ textAlign: 'right', color: '#9ca3af', fontSize: '0.8125rem' }}>
          {tx.balance != null ? fmt(tx.balance) : '—'}
        </td>
        <td style={{ textAlign: 'center', color: '#d1d5db' }}>
          {expanded ? <ChevronUp size={14} /> : <ChevronDown size={14} />}
        </td>
      </tr>
      {expanded && (
        <tr style={{ background: '#f9fafb' }}>
          <td colSpan={6} style={{ padding: '12px 16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: 12, marginBottom: 10 }}>
              {[
                { label: 'Date',        value: fmtDate(date) },
                { label: 'Amount',      value: fmt(absAmount) },
                { label: 'Type',        value: isCredit ? 'Credit' : 'Debit' },
                { label: 'Category',    value: tx.category || '—' },
                { label: 'Balance',     value: tx.balance != null ? fmt(tx.balance) : '—' },
                { label: 'Reference',   value: tx.id || tx._id || tx.reference || '—' },
              ].map(r => (
                <div key={r.label}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
                  <div style={{ fontSize: '0.875rem', color: '#374151' }}>{r.value}</div>
                </div>
              ))}
            </div>
            {isAdmin && (
              <button
                onClick={e => { e.stopPropagation(); setShowRaw(p => !p) }}
                style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', padding: '4px 10px', border: '1px solid #e5e7eb', borderRadius: 5, background: '#fff', cursor: 'pointer', color: '#6b7280' }}
              >
                {showRaw ? <EyeOff size={12} /> : <Eye size={12} />}
                {showRaw ? 'Hide' : 'View'} Raw
              </button>
            )}
            {showRaw && (
              <pre style={{ marginTop: 8, background: '#1e1e2e', color: '#cdd6f4', padding: 12, borderRadius: 6, fontSize: '0.7rem', overflow: 'auto', maxHeight: 200 }}>
                {JSON.stringify(tx, null, 2)}
              </pre>
            )}
          </td>
        </tr>
      )}
    </>
  )
}

export default function TransactionsTab({ transactions, retrievedAt, isAdmin }) {
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [page, setPage] = useState(1)
  const PAGE_SIZE = 30

  const filtered = useMemo(() => {
    let list = transactions || []
    if (typeFilter === 'credit') list = list.filter(t => t.type === 'credit' || (!t.type && (t.amount > 0)))
    if (typeFilter === 'debit')  list = list.filter(t => t.type === 'debit'  || (!t.type && (t.amount < 0)))
    if (search.trim()) {
      const q = search.trim().toLowerCase()
      list = list.filter(t =>
        (t.narration || t.description || '').toLowerCase().includes(q) ||
        (t.category || '').toLowerCase().includes(q) ||
        (t.merchant || '').toLowerCase().includes(q)
      )
    }
    return list
  }, [transactions, search, typeFilter])

  const totalPages = Math.ceil(filtered.length / PAGE_SIZE)
  const paged = filtered.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)

  const totalCredit = filtered.filter(t => t.type === 'credit' || t.amount > 0).reduce((s, t) => s + Math.abs(t.amount ?? t.value ?? 0), 0)
  const totalDebit  = filtered.filter(t => t.type === 'debit'  || t.amount < 0).reduce((s, t) => s + Math.abs(t.amount ?? t.value ?? 0), 0)

  if (!transactions?.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <Info size={36} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
        <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No transaction data</div>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Link the patient's bank account via Mono and fetch a bank statement to see transactions here.</div>
      </div>
    )
  }

  return (
    <div>
      {/* Summary */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 12, marginBottom: 16 }}>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Transactions</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#111827' }}>{filtered.length}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Credits</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#16a34a' }}>{fmt(totalCredit)}</div>
        </div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 8, padding: '12px 16px' }}>
          <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>Total Debits</div>
          <div style={{ fontWeight: 800, fontSize: '1.25rem', color: '#dc2626' }}>{fmt(totalDebit)}</div>
        </div>
      </div>

      {retrievedAt && (
        <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginBottom: 12 }}>
          Data retrieved: {fmtDate(retrievedAt)}
        </div>
      )}

      {/* Filters */}
      <div className="admin-toolbar flex-between mb-5" style={{ marginBottom: 12 }}>
        <div className="admin-search-wrapper flex-1" style={{ marginRight: 12 }}>
          <Search className="search-icon" size={16} />
          <input
            type="text"
            placeholder="Search description, category, merchant…"
            className="admin-search-input"
            value={search}
            onChange={e => { setSearch(e.target.value); setPage(1) }}
          />
        </div>
        <select className="admin-select" value={typeFilter} onChange={e => { setTypeFilter(e.target.value); setPage(1) }}>
          <option value="all">All Types</option>
          <option value="credit">Credits Only</option>
          <option value="debit">Debits Only</option>
        </select>
      </div>

      {/* Table */}
      <div className="admin-table-container">
        <table className="admin-table">
          <thead>
            <tr>
              <th>Date</th>
              <th>Description / Category</th>
              <th style={{ textAlign: 'right' }}>Amount</th>
              <th>Type</th>
              <th style={{ textAlign: 'right' }}>Balance</th>
              <th></th>
            </tr>
          </thead>
          <tbody>
            {paged.map((tx, i) => (
              <TransactionRow key={tx.id || tx._id || i} tx={tx} isAdmin={isAdmin} />
            ))}
          </tbody>
        </table>
      </div>

      {totalPages > 1 && (
        <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginTop: 12 }}>
          <button
            disabled={page <= 1}
            onClick={() => setPage(p => p - 1)}
            style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 6, background: page <= 1 ? '#f9fafb' : '#fff', cursor: page <= 1 ? 'not-allowed' : 'pointer', color: '#374151' }}
          >
            Previous
          </button>
          <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>Page {page} of {totalPages} · {filtered.length} transactions</span>
          <button
            disabled={page >= totalPages}
            onClick={() => setPage(p => p + 1)}
            style={{ padding: '6px 14px', border: '1px solid #e5e7eb', borderRadius: 6, background: page >= totalPages ? '#f9fafb' : '#fff', cursor: page >= totalPages ? 'not-allowed' : 'pointer', color: '#374151' }}
          >
            Next
          </button>
        </div>
      )}
    </div>
  )
}
