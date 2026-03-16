import { asObject, asArray, asNumber, formatCurrency, round, average } from './utils'

function InfoRow({ label, value }) {
  return (
    <div className="id-info-row">
      <span className="id-info-label">{label}</span>
      <span className="id-info-value">{value ?? '—'}</span>
    </div>
  )
}

export default function CashFlowTab({ sections, loadSection, sectionLoading }) {
  const txSection = sections?.transactions
  const inflowsSection = sections?.inflows
  const creditsSection = sections?.credits
  const debitsSection = sections?.debits

  const anyLoaded = txSection?.status === 'success' || inflowsSection?.status === 'success' || creditsSection?.status === 'success' || debitsSection?.status === 'success'

  const txData = asArray(asObject(txSection?.data).data)
  const inflowsData = asObject(asObject(inflowsSection?.data).data)
  const creditsData = asObject(asObject(creditsSection?.data).data)
  const debitsData = asObject(asObject(debitsSection?.data).data)

  const totalInflows = asNumber(inflowsData.total) ?? asNumber(creditsData.total)
  const totalOutflows = asNumber(debitsData.total)

  const inflowHistory = asArray(inflowsData.history).concat(asArray(creditsData.history))
  const debitHistory = asArray(debitsData.history)

  const avgInflow = round(average(inflowHistory.map((h) => asNumber(asObject(h).amount)).filter((v) => typeof v === 'number')))
  const avgOutflow = round(average(debitHistory.map((h) => asNumber(asObject(h).amount)).filter((v) => typeof v === 'number')))

  const balances = txData.map((tx) => asNumber(asObject(tx).balance)).filter((v) => typeof v === 'number')
  const avgBalance = balances.length > 0 ? round(average(balances)) : undefined
  const minBalance = balances.length > 0 ? round(Math.min(...balances)) : undefined
  const maxBalance = balances.length > 0 ? round(Math.max(...balances)) : undefined

  const disposable = typeof avgInflow === 'number' && typeof avgOutflow === 'number'
    ? round(avgInflow - avgOutflow)
    : undefined
  const liquidityRatio = typeof avgInflow === 'number' && typeof avgOutflow === 'number' && avgOutflow > 0
    ? round(avgInflow / avgOutflow, 2)
    : undefined

  const loadAll = () => {
    if (!txSection || txSection.status !== 'success') loadSection('transactions')
    if (!inflowsSection || inflowsSection.status !== 'success') loadSection('inflows')
    if (!creditsSection || creditsSection.status !== 'success') loadSection('credits')
    if (!debitsSection || debitsSection.status !== 'success') loadSection('debits')
  }

  const isLoading = sectionLoading?.transactions || sectionLoading?.inflows || sectionLoading?.credits || sectionLoading?.debits

  return (
    <div className="id-cashflow-tab">
      <div className="id-tab-header">
        <h3>Cash Flow Analysis</h3>
        <button className="button button--secondary button--sm" onClick={loadAll} disabled={isLoading}>
          {isLoading ? 'Loading...' : anyLoaded ? 'Refresh All' : 'Load Cash Flow Data'}
        </button>
      </div>
      <p className="text-muted text-sm mb-4">How money moves through the account — inflows vs outflows, balances, and liquidity.</p>

      {!anyLoaded ? (
        <div className="text-muted">Click "Load Cash Flow Data" to fetch transaction data.</div>
      ) : (
        <div className="id-info-grid">
          <div className="id-info-card">
            <h4>Inflows & Outflows</h4>
            <InfoRow label="Total Inflows" value={formatCurrency(totalInflows)} />
            <InfoRow label="Total Outflows" value={formatCurrency(totalOutflows)} />
            <InfoRow label="Avg Monthly Inflow" value={formatCurrency(avgInflow)} />
            <InfoRow label="Avg Monthly Outflow" value={formatCurrency(avgOutflow)} />
            <InfoRow label="Disposable Income" value={formatCurrency(disposable)} />
            <InfoRow label="Liquidity Ratio" value={typeof liquidityRatio === 'number' ? `${liquidityRatio}x` : '—'} />
          </div>
          <div className="id-info-card">
            <h4>Balance Analysis</h4>
            <InfoRow label="Average Balance" value={formatCurrency(avgBalance)} />
            <InfoRow label="Minimum Balance" value={formatCurrency(minBalance)} />
            <InfoRow label="Maximum Balance" value={formatCurrency(maxBalance)} />
            <InfoRow label="Transactions Count" value={txData.length || '—'} />
            <InfoRow label="Inflow Periods" value={inflowHistory.length || '—'} />
            <InfoRow label="Debit Periods" value={debitHistory.length || '—'} />
          </div>

          {typeof avgInflow === 'number' && typeof avgOutflow === 'number' && (
            <div className="id-info-card id-info-card--wide">
              <h4>Repayment Capacity</h4>
              <div className="id-capacity-bar">
                <div className="id-capacity-row">
                  <span>Income: {formatCurrency(avgInflow)}</span>
                  <span>Expenses: {formatCurrency(avgOutflow)}</span>
                  <span>Disposable: {formatCurrency(disposable)}</span>
                </div>
                {typeof disposable === 'number' && disposable <= 0 && (
                  <div className="alert-box alert-error mt-2">Repayment capacity is very weak — expenses meet or exceed income.</div>
                )}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
