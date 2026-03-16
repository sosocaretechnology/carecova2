import { asObject, asArray, asNumber, formatCurrency, formatPercent, round, average } from './utils'

function InfoRow({ label, value }) {
  return (
    <div className="id-info-row">
      <span className="id-info-label">{label}</span>
      <span className="id-info-value">{value ?? '—'}</span>
    </div>
  )
}

export default function IncomeTab({ sections, loadSection, sectionLoading }) {
  const section = sections?.incomeRecords
  const loaded = section?.status === 'success'
  const records = asArray(asObject(section?.data).data)
  const newest = asObject(records[0])
  const income = asObject(newest.income)

  const monthlyIncome =
    asNumber(income.monthly_income) ??
    asNumber(income.aggregated_monthly_average) ??
    asNumber(income.aggregated_monthly_average_regular)

  const streams = asArray(income.income_streams)
  const stabilities = streams.map((s) => asNumber(asObject(s).stability)).filter((v) => typeof v === 'number')
  const avgStability = stabilities.length > 0 ? round(average(stabilities)) : undefined

  let stabilityLabel = '—'
  if (typeof avgStability === 'number') {
    if (avgStability >= 0.8) stabilityLabel = 'Consistent'
    else if (avgStability >= 0.6) stabilityLabel = 'Moderate'
    else stabilityLabel = 'Unstable'
  }

  const employer = income.employer || income.employer_name || newest.employer
  const frequency = income.salary_frequency || income.payment_frequency || income.frequency

  return (
    <div className="id-income-tab">
      <div className="id-tab-header">
        <h3>Income Data</h3>
        <button
          className="button button--secondary button--sm"
          onClick={() => loadSection('incomeRecords')}
          disabled={sectionLoading?.incomeRecords}
        >
          {sectionLoading?.incomeRecords ? 'Loading...' : loaded ? 'Refresh' : 'Load Income Data'}
        </button>
      </div>
      <p className="text-muted text-sm mb-4">Salary inflows, employer, and income stability — the first thing lenders analyze.</p>

      {!loaded ? (
        <div className="text-muted">Click "Load Income Data" to fetch income information.</div>
      ) : (
        <div className="id-info-grid">
          <div className="id-info-card">
            <h4>Income Overview</h4>
            <InfoRow label="Average Monthly Income" value={formatCurrency(monthlyIncome)} />
            <InfoRow label="Income Streams" value={asNumber(income.number_of_income_streams) ?? streams.length} />
            <InfoRow label="Period" value={income.period} />
            <InfoRow label="Employer" value={employer} />
            <InfoRow label="Salary Frequency" value={frequency} />
            <InfoRow label="Last Salary Date" value={income.last_salary_date || newest.last_income_date || '—'} />
          </div>
          <div className="id-info-card">
            <h4>Stability Metrics</h4>
            <InfoRow label="Average Stability Score" value={typeof avgStability === 'number' ? formatPercent(avgStability) : '—'} />
            <InfoRow label="Stability Rating" value={stabilityLabel} />
            <InfoRow label="Income Records" value={records.length} />
            <InfoRow label="Regular Income" value={formatCurrency(asNumber(income.aggregated_monthly_average_regular))} />
            <InfoRow label="Irregular Income" value={formatCurrency(asNumber(income.aggregated_monthly_average_irregular))} />
          </div>

          {streams.length > 0 && (
            <div className="id-info-card id-info-card--wide">
              <h4>Income Streams</h4>
              <table className="id-table">
                <thead>
                  <tr>
                    <th>Source</th>
                    <th>Amount</th>
                    <th>Frequency</th>
                    <th>Stability</th>
                  </tr>
                </thead>
                <tbody>
                  {streams.map((stream, i) => {
                    const s = asObject(stream)
                    return (
                      <tr key={i}>
                        <td>{s.name || s.source || `Stream ${i + 1}`}</td>
                        <td>{formatCurrency(asNumber(s.amount) ?? asNumber(s.average_amount))}</td>
                        <td>{s.frequency || '—'}</td>
                        <td>{typeof asNumber(s.stability) === 'number' ? formatPercent(asNumber(s.stability)) : '—'}</td>
                      </tr>
                    )
                  })}
                </tbody>
              </table>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
