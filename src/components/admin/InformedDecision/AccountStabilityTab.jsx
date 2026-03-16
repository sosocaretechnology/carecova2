import { useMemo } from 'react'
import { asObject, asArray, asNumber, extractTransactions, formatCurrency, formatDateTime, round, average } from './utils'

function InfoRow({ label, value }) {
  return (
    <div className="id-info-row">
      <span className="id-info-label">{label}</span>
      <span className="id-info-value">{value ?? '—'}</span>
    </div>
  )
}

export default function AccountStabilityTab({ sections, loadSection, sectionLoading }) {
  const statementsSection = sections?.statements
  const assetsSection = sections?.assets
  const txSection = sections?.transactions

  const anyLoaded = statementsSection?.status === 'success' || assetsSection?.status === 'success' || txSection?.status === 'success'

  const stability = useMemo(() => {
    const txItems = extractTransactions(sections)
    const statements = asArray(asObject(statementsSection?.data).data)
    const assetsPayload = asObject(asObject(assetsSection?.data).data)
    const assets = asArray(assetsPayload.assets)

    const monthSet = new Set()
    const balancesByMonth = {}
    let overdraftCount = 0
    let largeDeposits = []

    txItems.forEach((item) => {
      const tx = asObject(item)
      const balance = asNumber(tx.balance)
      const amount = asNumber(tx.amount) ?? 0
      const dateRaw = tx.date || tx.created_at || tx.transaction_date
      if (!dateRaw) return
      const d = new Date(String(dateRaw))
      if (Number.isNaN(d.getTime())) return

      const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
      monthSet.add(month)

      if (typeof balance === 'number') {
        if (!balancesByMonth[month]) balancesByMonth[month] = []
        balancesByMonth[month].push(balance)
        if (balance < 0) overdraftCount++
      }

      if (amount > 0 && amount > 500000) {
        largeDeposits.push({ amount, date: dateRaw, narration: tx.narration || tx.description })
      }
    })

    const months = Object.keys(balancesByMonth).sort()
    const monthEndBalances = months.map((m) => {
      const bals = balancesByMonth[m]
      return bals[bals.length - 1]
    })

    const allBalances = Object.values(balancesByMonth).flat()
    const avgBalance = allBalances.length > 0 ? round(average(allBalances)) : undefined

    let trend = '—'
    if (monthEndBalances.length >= 3) {
      const first = average(monthEndBalances.slice(0, Math.ceil(monthEndBalances.length / 2)))
      const second = average(monthEndBalances.slice(Math.ceil(monthEndBalances.length / 2)))
      if (typeof first === 'number' && typeof second === 'number') {
        if (second > first * 1.1) trend = 'Growing'
        else if (second < first * 0.9) trend = 'Declining'
        else trend = 'Stable'
      }
    }

    const now = new Date()
    const last6 = Array.from({ length: 6 }, (_, i) => {
      const d = new Date(now.getFullYear(), now.getMonth() - i, 1)
      return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`
    })
    const inactiveMonths = last6.filter((m) => !monthSet.has(m)).length

    const totalAssetValue = assets.reduce((sum, item) => {
      const a = asObject(item)
      const details = asObject(a.details)
      return sum + (asNumber(a.return) ?? asNumber(a.cost) ?? asNumber(details.current_balance) ?? 0)
    }, 0)

    return {
      months: months.length,
      overdraftCount,
      largeDeposits: largeDeposits.slice(0, 10),
      trend,
      inactiveMonths,
      avgBalance,
      statementsCount: statements.length,
      assetsCount: assets.length,
      totalAssetValue: round(totalAssetValue),
      monthEndBalances,
      monthLabels: months,
    }
  }, [sections, statementsSection, assetsSection])

  const loadAll = () => {
    if (!txSection || txSection.status !== 'success') loadSection('transactions')
    if (!statementsSection || statementsSection.status !== 'success') loadSection('statements')
    if (!assetsSection || assetsSection.status !== 'success') loadSection('assets')
  }

  const isLoading = sectionLoading?.transactions || sectionLoading?.statements || sectionLoading?.assets

  return (
    <div className="id-stability-tab">
      <div className="id-tab-header">
        <h3>Account Stability</h3>
        <button className="button button--secondary button--sm" onClick={loadAll} disabled={isLoading}>
          {isLoading ? 'Loading...' : anyLoaded ? 'Refresh All' : 'Load Stability Data'}
        </button>
      </div>
      <p className="text-muted text-sm mb-4">Balance trends, overdrafts, sudden deposits, and account health — detects fake or inflated accounts.</p>

      {!anyLoaded ? (
        <div className="text-muted">Click "Load Stability Data" to analyze account stability.</div>
      ) : (
        <div className="id-info-grid">
          <div className="id-info-card">
            <h4>Account Health</h4>
            <InfoRow label="Months of Activity" value={stability.months} />
            <InfoRow label="Balance Trend" value={stability.trend} />
            <InfoRow label="Average Balance" value={formatCurrency(stability.avgBalance)} />
            <InfoRow label="Overdraft Occurrences" value={stability.overdraftCount} />
            <InfoRow label="Inactive Months (last 6)" value={stability.inactiveMonths} />
            <InfoRow label="Statements Available" value={stability.statementsCount} />
          </div>

          <div className="id-info-card">
            <h4>Assets</h4>
            <InfoRow label="Assets Count" value={stability.assetsCount} />
            <InfoRow label="Total Asset Value" value={formatCurrency(stability.totalAssetValue)} />
          </div>

          {stability.overdraftCount > 3 && (
            <div className="id-info-card">
              <div className="alert-box alert-warning">Frequent overdrafts detected ({stability.overdraftCount}) — may indicate financial stress.</div>
            </div>
          )}

          {stability.inactiveMonths >= 2 && (
            <div className="id-info-card">
              <div className="alert-box alert-warning">{stability.inactiveMonths} inactive month(s) in the last 6 months — possible dormant or secondary account.</div>
            </div>
          )}

          {stability.largeDeposits.length > 0 && (
            <div className="id-info-card id-info-card--wide">
              <h4>Sudden Large Deposits (&gt; ₦500k)</h4>
              <table className="id-table">
                <thead><tr><th>Date</th><th>Amount</th><th>Narration</th></tr></thead>
                <tbody>
                  {stability.largeDeposits.map((dep, i) => (
                    <tr key={i}>
                      <td>{formatDateTime(dep.date)}</td>
                      <td>{formatCurrency(dep.amount)}</td>
                      <td className="text-sm text-muted">{(dep.narration || '').slice(0, 60)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
              <p className="text-sm text-muted mt-2">Large deposits before a loan request may indicate "balance inflation."</p>
            </div>
          )}

          {stability.monthEndBalances.length > 0 && (
            <div className="id-info-card id-info-card--wide">
              <h4>Month-End Balance Trend</h4>
              <div className="id-balance-trend">
                {stability.monthLabels.map((label, i) => (
                  <div key={label} className="id-balance-point">
                    <span className="id-balance-month">{label}</span>
                    <span className="id-balance-value">{formatCurrency(stability.monthEndBalances[i])}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
