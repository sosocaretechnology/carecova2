import { useMemo } from 'react'
import { asObject, asNumber, extractTransactions, classifyTransaction, formatCurrency, round } from './utils'

export default function LoanSignalsTab({ sections, loadSection, sectionLoading }) {
  const txLoaded = sections?.transactions?.status === 'success'

  const signals = useMemo(() => {
    const txItems = extractTransactions(sections)
    const loanTx = []
    const appCounts = {}

    txItems.forEach((item) => {
      const tx = asObject(item)
      const narration = tx.narration || tx.description || ''
      const cls = classifyTransaction(narration)
      if (cls.type !== 'loan') return
      loanTx.push({
        ...tx,
        app: cls.app,
        amount: asNumber(tx.amount) ?? 0,
        date: tx.date || tx.created_at || tx.transaction_date,
        type: tx.type,
      })
      appCounts[cls.app] = (appCounts[cls.app] || 0) + 1
    })

    const apps = Object.entries(appCounts)
      .sort((a, b) => b[1] - a[1])
      .map(([app, count]) => ({ app, count }))

    const totalLoanPayments = loanTx.reduce((sum, tx) => sum + Math.abs(tx.amount), 0)
    const monthlyEstimate = loanTx.length > 0 ? round(totalLoanPayments / Math.max(1, new Set(loanTx.map((tx) => {
      const d = new Date(String(tx.date))
      return Number.isNaN(d.getTime()) ? 'unknown' : `${d.getUTCFullYear()}-${d.getUTCMonth()}`
    })).size)) : 0

    return { loanTx, apps, totalLoanPayments: round(totalLoanPayments), monthlyEstimate, activeApps: apps.length }
  }, [sections])

  return (
    <div className="id-loans-tab">
      <div className="id-tab-header">
        <h3>Existing Loan Signals</h3>
        <button
          className="button button--secondary button--sm"
          onClick={() => loadSection('transactions')}
          disabled={sectionLoading?.transactions}
        >
          {sectionLoading?.transactions ? 'Loading...' : txLoaded ? 'Refresh' : 'Load Transaction Data'}
        </button>
      </div>
      <p className="text-muted text-sm mb-4">Detects transfers to loan apps and microfinance banks — critical for assessing existing debt obligations.</p>

      {!txLoaded ? (
        <div className="text-muted">Click "Load Transaction Data" to scan for loan signals.</div>
      ) : signals.loanTx.length === 0 ? (
        <div className="id-info-card">
          <div className="id-empty-state">No loan app transactions detected in the transaction history.</div>
        </div>
      ) : (
        <div className="id-info-grid">
          <div className="id-info-card">
            <h4>Loan App Summary</h4>
            <div className="id-info-row"><span className="id-info-label">Loan Apps Detected</span><span className="id-info-value">{signals.activeApps}</span></div>
            <div className="id-info-row"><span className="id-info-label">Total Loan Transactions</span><span className="id-info-value">{signals.loanTx.length}</span></div>
            <div className="id-info-row"><span className="id-info-label">Total Loan Payments</span><span className="id-info-value">{formatCurrency(signals.totalLoanPayments)}</span></div>
            <div className="id-info-row"><span className="id-info-label">Est. Monthly Obligations</span><span className="id-info-value">{formatCurrency(signals.monthlyEstimate)}</span></div>
            {signals.activeApps >= 3 && (
              <div className="alert-box alert-warning mt-2">Multiple active loan apps detected — high financial pressure risk.</div>
            )}
          </div>

          <div className="id-info-card">
            <h4>Detected Loan Apps</h4>
            {signals.apps.map(({ app, count }) => (
              <div key={app} className="id-info-row">
                <span className="id-info-label" style={{ textTransform: 'capitalize' }}>{app}</span>
                <span className="id-info-value">{count} transaction{count > 1 ? 's' : ''}</span>
              </div>
            ))}
          </div>

          <div className="id-info-card id-info-card--wide">
            <h4>Recent Loan Transactions</h4>
            <table className="id-table">
              <thead>
                <tr><th>Date</th><th>App</th><th>Amount</th><th>Type</th><th>Narration</th></tr>
              </thead>
              <tbody>
                {signals.loanTx.slice(0, 20).map((tx, i) => (
                  <tr key={i}>
                    <td>{tx.date ? new Date(tx.date).toLocaleDateString() : '—'}</td>
                    <td style={{ textTransform: 'capitalize' }}>{tx.app}</td>
                    <td>{formatCurrency(Math.abs(tx.amount))}</td>
                    <td>{tx.type || '—'}</td>
                    <td className="text-sm text-muted">{(tx.narration || tx.description || '').slice(0, 60)}</td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>
      )}
    </div>
  )
}
