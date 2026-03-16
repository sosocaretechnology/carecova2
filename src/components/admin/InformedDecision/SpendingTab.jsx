import { useMemo } from 'react'
import { asObject, asNumber, extractTransactions, classifyTransaction, formatCurrency, formatPercent, round } from './utils'

export default function SpendingTab({ sections, loadSection, sectionLoading }) {
  const txLoaded = sections?.transactions?.status === 'success'

  const spending = useMemo(() => {
    const txItems = extractTransactions(sections)
    const categories = { gambling: [], pos: [], utility: [], rent: [], loan: [], other: [] }
    let totalSpend = 0

    txItems.forEach((item) => {
      const tx = asObject(item)
      const amount = Math.abs(asNumber(tx.amount) ?? 0)
      if (amount === 0) return
      const txType = (tx.type || '').toLowerCase()
      if (txType === 'credit') return

      const narration = tx.narration || tx.description || ''
      const cls = classifyTransaction(narration)
      totalSpend += amount
      const entry = { narration, amount, date: tx.date || tx.created_at, type: txType }

      if (cls.type === 'gambling') categories.gambling.push(entry)
      else if (cls.type === 'pos') categories.pos.push(entry)
      else if (cls.type === 'utility') categories.utility.push(entry)
      else if (cls.type === 'rent') categories.rent.push(entry)
      else if (cls.type === 'loan') categories.loan.push(entry)
      else categories.other.push(entry)
    })

    const summary = Object.entries(categories).map(([cat, items]) => {
      const total = items.reduce((sum, i) => sum + i.amount, 0)
      return {
        category: cat,
        count: items.length,
        total: round(total),
        percentage: totalSpend > 0 ? round(total / totalSpend, 4) : 0,
      }
    }).filter((s) => s.count > 0).sort((a, b) => b.total - a.total)

    const gamblingPct = totalSpend > 0
      ? round(categories.gambling.reduce((s, i) => s + i.amount, 0) / totalSpend, 4)
      : 0

    return { categories, summary, totalSpend: round(totalSpend), gamblingPct, gamblingTx: categories.gambling }
  }, [sections])

  const CATEGORY_LABELS = {
    gambling: 'Gambling / Betting',
    pos: 'POS Withdrawals',
    utility: 'Utilities & Bills',
    rent: 'Rent',
    loan: 'Loan Repayments',
    other: 'Other',
  }

  return (
    <div className="id-spending-tab">
      <div className="id-tab-header">
        <h3>Spending Behavior</h3>
        <button
          className="button button--secondary button--sm"
          onClick={() => loadSection('transactions')}
          disabled={sectionLoading?.transactions}
        >
          {sectionLoading?.transactions ? 'Loading...' : txLoaded ? 'Refresh' : 'Load Transaction Data'}
        </button>
      </div>
      <p className="text-muted text-sm mb-4">Lifestyle risk — gambling, POS, utilities, rent, and spending category breakdown.</p>

      {!txLoaded ? (
        <div className="text-muted">Click "Load Transaction Data" to analyze spending behavior.</div>
      ) : (
        <div className="id-info-grid">
          <div className="id-info-card id-info-card--wide">
            <h4>Spending Breakdown</h4>
            <table className="id-table">
              <thead>
                <tr><th>Category</th><th>Transactions</th><th>Total</th><th>% of Spend</th></tr>
              </thead>
              <tbody>
                {spending.summary.map(({ category, count, total, percentage }) => (
                  <tr key={category} className={category === 'gambling' && percentage > 0.2 ? 'id-row-warning' : ''}>
                    <td>{CATEGORY_LABELS[category] || category}</td>
                    <td>{count}</td>
                    <td>{formatCurrency(total)}</td>
                    <td>{formatPercent(percentage)}</td>
                  </tr>
                ))}
                <tr className="id-row-total">
                  <td><strong>Total</strong></td>
                  <td>{spending.summary.reduce((s, i) => s + i.count, 0)}</td>
                  <td><strong>{formatCurrency(spending.totalSpend)}</strong></td>
                  <td>100%</td>
                </tr>
              </tbody>
            </table>
          </div>

          {spending.gamblingPct > 0 && (
            <div className="id-info-card">
              <h4>Gambling Risk</h4>
              <div className="id-info-row">
                <span className="id-info-label">Gambling % of Total Spend</span>
                <span className="id-info-value">{formatPercent(spending.gamblingPct)}</span>
              </div>
              <div className="id-info-row">
                <span className="id-info-label">Gambling Transactions</span>
                <span className="id-info-value">{spending.gamblingTx.length}</span>
              </div>
              {spending.gamblingPct >= 0.3 && (
                <div className="alert-box alert-error mt-2">Major risk: 30%+ of income goes to gambling/betting.</div>
              )}
              {spending.gamblingPct >= 0.1 && spending.gamblingPct < 0.3 && (
                <div className="alert-box alert-warning mt-2">Moderate risk: gambling spending detected at {formatPercent(spending.gamblingPct)} of total.</div>
              )}
            </div>
          )}
        </div>
      )}
    </div>
  )
}
