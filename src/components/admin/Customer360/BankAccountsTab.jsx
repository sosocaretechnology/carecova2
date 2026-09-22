import { useState } from 'react'
import { Wifi, WifiOff, Clock, RefreshCw, Eye, EyeOff, Building2, AlertTriangle } from 'lucide-react'
import { adminService } from '../../../services/adminService'
import { freshnessService, DATA_TYPES } from '../../../services/freshnessService'
import FreshnessBadge from './FreshnessBadge'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'
const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'

function ConnectionStatusBadge({ status }) {
  const map = {
    linked:      { label: 'Active',    bg: '#f0fdf4', color: '#16a34a', Icon: Wifi },
    pending:     { label: 'Pending',   bg: '#fffbeb', color: '#d97706', Icon: Clock },
    not_started: { label: 'Not Linked',bg: '#f9fafb', color: '#9ca3af', Icon: WifiOff },
  }
  const cfg = map[status] || map['not_started']
  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8125rem', fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: cfg.bg, color: cfg.color }}>
      <cfg.Icon size={13} />
      {cfg.label}
    </span>
  )
}

function AccountCard({ account, isAdmin }) {
  const [showRaw, setShowRaw] = useState(false)
  const creditScore = account.creditScore
  const directDebit = account.directDebit

  const rows = [
    { label: 'Account Name',     value: account.accountName },
    { label: 'Account Number',   value: account.accountNumber },
    { label: 'Bank',             value: account.bankName },
    { label: 'Currency',         value: account.currency || 'NGN' },
    { label: 'Mono Account ID',  value: account.monoAccountId, mono: true },
    { label: 'Balance',          value: fmt(account.balance) },
    { label: 'Linked',           value: fmtDateTime(account.linkedAt) },
    { label: 'Credit Score',     value: creditScore ?? '—' },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 12 }}>
          <div style={{ width: 44, height: 44, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Building2 size={22} color="#3b82f6" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>{account.bankName}</div>
            <div style={{ fontFamily: 'monospace', fontSize: '0.875rem', color: '#6b7280' }}>{account.accountNumber}</div>
          </div>
        </div>
        <ConnectionStatusBadge status={account.connectionStatus} />
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: '10px 24px' }}>
        {rows.map(r => (
          <div key={r.label}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: r.mono ? '#7c3aed' : '#111827', fontFamily: r.mono ? 'monospace' : 'inherit', wordBreak: 'break-all' }}>
              {String(r.value ?? '—')}
            </div>
          </div>
        ))}
      </div>

      {directDebit?.mandate && (
        <div style={{ marginTop: 16, padding: '12px 14px', background: '#f9fafb', borderRadius: 8 }}>
          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#374151', marginBottom: 8 }}>Direct Debit Mandate</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: 8 }}>
            {[
              { label: 'Mandate ID',  value: directDebit.mandate.id },
              { label: 'Status',      value: directDebit.mandate.status },
              { label: 'Reference',   value: directDebit.mandate.reference },
            ].map(r => (
              <div key={r.label}>
                <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase' }}>{r.label}</div>
                <div style={{ fontSize: '0.875rem', color: '#111827' }}>{r.value || '—'}</div>
              </div>
            ))}
          </div>
        </div>
      )}

      {isAdmin && (
        <div style={{ marginTop: 14, display: 'flex', gap: 8 }}>
          <button
            onClick={() => setShowRaw(p => !p)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.8rem', padding: '5px 12px', border: '1px solid #e5e7eb', borderRadius: 6, background: '#f9fafb', cursor: 'pointer', color: '#6b7280' }}
          >
            {showRaw ? <EyeOff size={13} /> : <Eye size={13} />}
            {showRaw ? 'Hide' : 'View'} Raw Data
          </button>
        </div>
      )}

      {showRaw && (
        <pre style={{ marginTop: 12, background: '#1e1e2e', color: '#cdd6f4', padding: 16, borderRadius: 8, fontSize: '0.75rem', overflow: 'auto', maxHeight: 320 }}>
          {JSON.stringify({
            monoAccountId: account.monoAccountId,
            connectionStatus: account.connectionStatus,
            linkedAt: account.linkedAt,
            creditworthiness: account.creditworthiness,
            directDebit: account.directDebit,
          }, null, 2)}
        </pre>
      )}
    </div>
  )
}

export default function BankAccountsTab({ customer, isAdmin, onDataRefreshed }) {
  const accounts = customer._bankAccounts || []
  const [refreshing, setRefreshing] = useState(false)
  const [refreshMsg, setRefreshMsg] = useState('')
  const [refreshErr, setRefreshErr] = useState('')

  // Use latest linked loan for refresh operations
  const latestLinkedLoan = (customer.loans || []).find(l => l.monoAccountId)
  const freshness = freshnessService.deriveFromCustomer(customer)
  const monoFreshness = freshness[DATA_TYPES.MONO_ACCOUNT]
  const needsRefresh = freshnessService.needsRefresh(monoFreshness?.timestamp)

  const handleRefresh = async () => {
    if (!latestLinkedLoan?.id) {
      setRefreshErr('No linked loan found to refresh Mono data.')
      return
    }
    setRefreshing(true)
    setRefreshMsg('')
    setRefreshErr('')
    try {
      await adminService.fetchMonoStatementForLoan(latestLinkedLoan.id)
      try { await adminService.fetchMonoCreditworthiness(latestLinkedLoan.id) } catch (_) {}
      freshnessService.markRefreshed(customer.phone, DATA_TYPES.MONO_ACCOUNT)
      freshnessService.markRefreshed(customer.phone, DATA_TYPES.TRANSACTIONS)
      freshnessService.markRefreshed(customer.phone, DATA_TYPES.INCOME)
      freshnessService.markRefreshed(customer.phone, DATA_TYPES.STATEMENT)
      setRefreshMsg('Mono data refreshed successfully.')
      if (onDataRefreshed) onDataRefreshed()
    } catch (err) {
      setRefreshErr(err.message || 'Refresh failed')
    } finally {
      setRefreshing(false)
    }
  }

  if (!accounts.length) {
    return (
      <div>
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
          <WifiOff size={40} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
          <div style={{ fontWeight: 600, color: '#374151', marginBottom: 4 }}>No bank account connected</div>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af' }}>Initiate Mono Connect from any credit application to link this patient's bank account.</div>
        </div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>
            Connected Bank Account{accounts.length !== 1 ? 's' : ''} ({accounts.length})
          </h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
            Accounts verified via Mono Connect.{' '}
            <FreshnessBadge timestamp={monoFreshness?.timestamp} label="Last sync" />
          </p>
        </div>
        {isAdmin && latestLinkedLoan && (
          <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
            {needsRefresh && (
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#d97706', fontWeight: 600 }}>
                <AlertTriangle size={12} /> Data refresh recommended
              </span>
            )}
            <button
              onClick={handleRefresh}
              disabled={refreshing}
              style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600, padding: '7px 14px', borderRadius: 7, border: '1px solid #bfdbfe', background: '#eff6ff', color: '#2563eb', cursor: refreshing ? 'not-allowed' : 'pointer', opacity: refreshing ? 0.7 : 1 }}
            >
              <RefreshCw size={13} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
              {refreshing ? 'Refreshing…' : 'Refresh Mono Data'}
            </button>
          </div>
        )}
      </div>

      {refreshMsg && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, color: '#16a34a', fontSize: '0.875rem', marginBottom: 12 }}>{refreshMsg}</div>}
      {refreshErr && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, color: '#dc2626', fontSize: '0.875rem', marginBottom: 12 }}>{refreshErr}</div>}

      {accounts.map((account, i) => (
        <AccountCard key={account.monoAccountId || i} account={account} isAdmin={isAdmin} />
      ))}
    </div>
  )
}
