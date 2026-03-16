import { useMemo } from 'react'
import {
  asObject, asArray, asNumber, average, round, toNumberOrEmpty,
  formatCurrency, formatPercent, DECISION_META, SECTION_KEYS,
  resolveAccountFromSection,
} from './utils'

function deriveAnalysis(rawAnalysis, sections, form) {
  const output = { ...(rawAnalysis || {}) }
  const s = sections || {}

  const creditsHistory = asArray(asObject(asObject(s.credits?.data).data).history)
  const inflowsHistory = asArray(asObject(asObject(s.inflows?.data).data).history)
  const incomeRecords = asArray(asObject(s.incomeRecords?.data).data)
  const newestIncome = asObject(asObject(incomeRecords[0]).income)

  const series = creditsHistory.length > 0 ? creditsHistory : inflowsHistory
  const amounts = series
    .map((i) => asNumber(asObject(i).amount))
    .filter((v) => typeof v === 'number')
    .slice(0, 6)

  const monthlyFromRecord =
    asNumber(newestIncome.monthly_income) ??
    asNumber(newestIncome.aggregated_monthly_average) ??
    asNumber(newestIncome.aggregated_monthly_average_regular)

  if (output.averageMonthlyIncome === undefined)
    output.averageMonthlyIncome = round(amounts.length > 0 ? average(amounts) : monthlyFromRecord)
  if (output.incomeMinMonthly === undefined)
    output.incomeMinMonthly = amounts.length > 0 ? round(Math.min(...amounts)) : output.averageMonthlyIncome
  if (output.incomeMaxMonthly === undefined)
    output.incomeMaxMonthly = amounts.length > 0 ? round(Math.max(...amounts)) : output.averageMonthlyIncome

  const stabilities = asArray(newestIncome.income_streams)
    .map((i) => asNumber(asObject(i).stability))
    .filter((v) => typeof v === 'number')
  if (output.incomeStabilityScore === undefined && stabilities.length > 0)
    output.incomeStabilityScore = round(average(stabilities))
  if (!output.incomeStabilityLabel && typeof output.incomeStabilityScore === 'number') {
    if (output.incomeStabilityScore >= 0.8) output.incomeStabilityLabel = 'consistent'
    else if (output.incomeStabilityScore >= 0.6) output.incomeStabilityLabel = 'moderate'
    else output.incomeStabilityLabel = 'unstable'
  }

  const principal = toNumberOrEmpty(form?.principal)
  const term = toNumberOrEmpty(form?.term)
  const creditRoot = asObject(asObject(asObject(s.creditworthiness?.data).data).data)
  const creditDebt = asObject(creditRoot.debt)
  const totalExistingDebt = asNumber(creditDebt.total_debt) ?? asNumber(creditRoot.total_debt)
  if (output.totalExistingDebt === undefined && totalExistingDebt !== undefined)
    output.totalExistingDebt = round(totalExistingDebt)
  const existingDebt = output.existingDebtMonthly ?? asNumber(creditRoot.existing_monthly_debt) ?? 0
  output.existingDebtMonthly = round(existingDebt)

  if (output.proposedMonthlyRepayment === undefined && principal !== '' && term !== '' && term > 0)
    output.proposedMonthlyRepayment = round(principal / term)

  if (output.totalDebtObligationMonthly === undefined && typeof output.proposedMonthlyRepayment === 'number')
    output.totalDebtObligationMonthly = round((output.existingDebtMonthly || 0) + output.proposedMonthlyRepayment)

  if (output.newRepaymentToIncomeRatio === undefined && typeof output.proposedMonthlyRepayment === 'number' && typeof output.averageMonthlyIncome === 'number' && output.averageMonthlyIncome > 0)
    output.newRepaymentToIncomeRatio = round(output.proposedMonthlyRepayment / output.averageMonthlyIncome, 4)

  if (output.totalDebtToIncomeRatio === undefined && typeof output.totalDebtObligationMonthly === 'number' && typeof output.averageMonthlyIncome === 'number' && output.averageMonthlyIncome > 0)
    output.totalDebtToIncomeRatio = round(output.totalDebtObligationMonthly / output.averageMonthlyIncome, 4)

  const txItems = asArray(asObject(s.transactions?.data).data)
  const latestByMonth = {}
  txItems.forEach((item) => {
    const r = asObject(item)
    const balance = asNumber(r.balance)
    const dateRaw = r.date || r.created_at || r.transaction_date
    if (balance === undefined || !dateRaw) return
    const d = new Date(String(dateRaw))
    if (Number.isNaN(d.getTime())) return
    const month = `${d.getUTCFullYear()}-${String(d.getUTCMonth() + 1).padStart(2, '0')}`
    const existing = latestByMonth[month]
    if (!existing || d.getTime() > existing.time) latestByMonth[month] = { time: d.getTime(), balance }
  })
  if (output.averageMonthEndBalance === undefined) {
    const monthBalances = Object.values(latestByMonth).sort((a, b) => b.time - a.time).slice(0, 6).map((i) => i.balance)
    if (monthBalances.length > 0) output.averageMonthEndBalance = round(average(monthBalances))
    else {
      const resolvedAcc = resolveAccountFromSection(s.account)
      const accBal = asNumber(resolvedAcc.balance)
      if (accBal !== undefined) output.averageMonthEndBalance = round(accBal)
    }
  }

  if (output.liquidityBufferRequired === undefined && typeof output.averageMonthlyIncome === 'number')
    output.liquidityBufferRequired = round(0.1 * output.averageMonthlyIncome)
  if (output.netSurplusAfterRepayment === undefined && typeof output.averageMonthEndBalance === 'number' && typeof output.proposedMonthlyRepayment === 'number')
    output.netSurplusAfterRepayment = round(output.averageMonthEndBalance - output.proposedMonthlyRepayment)

  const maxRepayment = typeof output.averageMonthlyIncome === 'number' ? round(output.averageMonthlyIncome * 0.3) : undefined
  output.safeMaxRepayment = maxRepayment

  if (!output.summary && typeof output.averageMonthlyIncome === 'number') {
    output.summary = {
      income: `Average monthly income: ${formatCurrency(output.averageMonthlyIncome)} (${output.incomeStabilityLabel || 'unknown'} stability).`,
      affordability: `Proposed repayment: ${formatCurrency(output.proposedMonthlyRepayment)} (${formatPercent(output.newRepaymentToIncomeRatio)} of income). Safe max (30% rule): ${formatCurrency(maxRepayment)}.`,
      debt: `Total monthly debt obligation: ${formatCurrency(output.totalDebtObligationMonthly)} (${formatPercent(output.totalDebtToIncomeRatio)} DTI).`,
      liquidity: `Avg month-end balance: ${formatCurrency(output.averageMonthEndBalance)}. Buffer after repayment: ${formatCurrency(output.netSurplusAfterRepayment)}.`,
      decision: output.finalReason || 'Use these KPIs with rule checks for final decision.',
    }
  }

  return output
}

function SummaryCard({ label, value, tone = 'neutral', badge }) {
  const toneClass =
    tone === 'good'
      ? 'risk-card--good'
      : tone === 'warning'
        ? 'risk-card--warning'
        : tone === 'bad'
          ? 'risk-card--bad'
          : 'risk-card--neutral'
  return (
    <div className={`mono-summary-card ${toneClass}`}>
      <div className="mono-summary-label">
        {label}
        {badge && <span className="mono-summary-badge">{badge}</span>}
      </div>
      <div className="mono-summary-value">{value}</div>
    </div>
  )
}

export default function DecisionSupportTab({ report, sections, form }) {
  const analysis = useMemo(
    () => deriveAnalysis(report?.analysis || {}, sections, form),
    [report, sections, form],
  )

  const sectionEntries = useMemo(() => {
    const s = report?.sections || {}
    return SECTION_KEYS.map((key) => [key, s[key] || { status: 'skipped' }])
  }, [report])

  const successCount = sectionEntries.filter(([, s]) => s?.status === 'success').length
  const errorCount = sectionEntries.filter(([, s]) => s?.status === 'error').length
  const decision = analysis?.finalDecision || 'manual_review'
  const decisionMeta = DECISION_META[decision] || DECISION_META.manual_review
  const summaryEntries = analysis?.summary && typeof analysis.summary === 'object'
    ? Object.entries(analysis.summary).filter(([, v]) => typeof v === 'string' && v.trim() !== '')
    : []

  const income = analysis.averageMonthlyIncome || 0
  const repayment = analysis.proposedMonthlyRepayment || 0
  const safeMax = analysis.safeMaxRepayment || (income ? income * 0.3 : 0)
  const newRepayRatio = analysis.newRepaymentToIncomeRatio || (income ? repayment / income : 0)
  const totalDtiRatio = analysis.totalDebtToIncomeRatio || 0

  const ratioToPercent = (r) => (typeof r === 'number' ? r : 0)

  const responseTone =
    report?.status === 'successful'
      ? 'good'
      : report?.status === 'partial_success'
        ? 'warning'
        : 'bad'

  const sourceTone =
    report?.source === 'live'
      ? 'good'
      : report?.source === 'cache'
        ? 'warning'
        : 'bad'

  const sectionsOkTone =
    successCount > 0 && errorCount === 0
      ? 'good'
      : successCount > 0 && errorCount > 0
        ? 'warning'
        : 'bad'

  const sectionsFailedTone =
    errorCount === 0 ? 'good' : errorCount <= 2 ? 'warning' : 'bad'

  const incomeVsRepaymentTone =
    income && repayment
      ? repayment / income > 0.3
        ? 'bad'
        : repayment / income > 0.2
          ? 'warning'
          : 'good'
      : 'neutral'

  const incomeRangeSpread =
    analysis.incomeMinMonthly && analysis.incomeMaxMonthly && income
      ? (analysis.incomeMaxMonthly - analysis.incomeMinMonthly) / income
      : 0
  const incomeRangeTone =
    incomeRangeSpread <= 0.2 ? 'good' : incomeRangeSpread <= 0.4 ? 'warning' : 'bad'

  const incomeStabilityTone =
    typeof analysis.incomeStabilityScore === 'number'
      ? analysis.incomeStabilityScore >= 0.8
        ? 'good'
        : analysis.incomeStabilityScore >= 0.6
          ? 'warning'
          : 'bad'
      : 'neutral'

  const safeMaxTone =
    income && repayment && safeMax
      ? repayment > safeMax
        ? 'bad'
        : repayment > safeMax * 0.8
          ? 'warning'
          : 'good'
      : 'neutral'

  const existingDebtRatio =
    income && typeof analysis.existingDebtMonthly === 'number'
      ? analysis.existingDebtMonthly / income
      : 0
  const existingDebtTone =
    existingDebtRatio === 0
      ? 'good'
      : existingDebtRatio < 0.2
        ? 'good'
        : existingDebtRatio < 0.35
          ? 'warning'
          : 'bad'

  const totalDtiTone =
    totalDtiRatio <= 0.4
      ? 'good'
      : totalDtiRatio <= 0.6
        ? 'warning'
        : 'bad'

  const avgBalanceTone =
    income && analysis.averageMonthEndBalance
      ? analysis.averageMonthEndBalance >= income
        ? 'good'
        : analysis.averageMonthEndBalance >= income * 0.5
          ? 'warning'
          : 'bad'
      : 'neutral'

  const liquidityTone =
    typeof analysis.netSurplusAfterRepayment === 'number' &&
    typeof analysis.liquidityBufferRequired === 'number'
      ? analysis.netSurplusAfterRepayment >= analysis.liquidityBufferRequired * 1.5
        ? 'good'
        : analysis.netSurplusAfterRepayment >= analysis.liquidityBufferRequired
          ? 'warning'
          : 'bad'
      : 'neutral'

  const creditScoreTone =
    typeof analysis.creditScore === 'number'
      ? analysis.creditScore >= 700
        ? 'good'
        : analysis.creditScore >= 550
          ? 'warning'
          : 'bad'
      : 'neutral'

  if (!report) return <div className="text-muted">No data loaded yet.</div>

  return (
    <div className="id-decision-tab">
      <div className="mono-summary-grid">
        <SummaryCard
          label="Response Status"
          value={report.status}
          tone={responseTone}
          badge={responseTone === 'bad' ? 'API Issue' : responseTone === 'warning' ? 'Partial' : 'Healthy'}
        />
        <SummaryCard
          label="Source"
          value={report.source || 'cache'}
          tone={sourceTone}
          badge={sourceTone === 'good' ? 'Live' : sourceTone === 'warning' ? 'Cached' : 'Unknown'}
        />
        <SummaryCard
          label="Sections OK"
          value={successCount}
          tone={sectionsOkTone}
        />
        <SummaryCard
          label="Sections Failed"
          value={errorCount}
          tone={sectionsFailedTone}
        />
        <SummaryCard
          label="Avg Monthly Income"
          value={formatCurrency(analysis.averageMonthlyIncome)}
          tone={incomeVsRepaymentTone}
        />
        <SummaryCard
          label="Income Range"
          value={`${formatCurrency(analysis.incomeMinMonthly)} – ${formatCurrency(analysis.incomeMaxMonthly)}`}
          tone={incomeRangeTone}
        />
        <SummaryCard
          label="Income Stability"
          value={`${formatPercent(analysis.incomeStabilityScore)} ${analysis.incomeStabilityLabel ? `(${analysis.incomeStabilityLabel})` : ''}`}
          tone={incomeStabilityTone}
        />
        <SummaryCard
          label="Proposed Repayment"
          value={formatCurrency(analysis.proposedMonthlyRepayment)}
          tone={incomeVsRepaymentTone}
        />
        <SummaryCard
          label="Safe Max (30%)"
          value={formatCurrency(analysis.safeMaxRepayment)}
          tone={safeMaxTone}
        />
        <SummaryCard
          label="Existing Debt (monthly)"
          value={formatCurrency(analysis.existingDebtMonthly)}
          tone={existingDebtTone}
        />
        <SummaryCard
          label="Total Existing Debt"
          value={formatCurrency(analysis.totalExistingDebt)}
          tone={existingDebtTone}
        />
        <SummaryCard
          label="Total Obligation"
          value={formatCurrency(analysis.totalDebtObligationMonthly)}
          tone={totalDtiTone}
        />
        <SummaryCard
          label="New Repayment Ratio"
          value={formatPercent(analysis.newRepaymentToIncomeRatio)}
          tone={
            ratioToPercent(newRepayRatio) > 0.4
              ? 'bad'
              : ratioToPercent(newRepayRatio) > 0.3
                ? 'warning'
                : 'good'
          }
        />
        <SummaryCard
          label="Total DTI Ratio"
          value={formatPercent(analysis.totalDebtToIncomeRatio)}
          tone={totalDtiTone}
        />
        <SummaryCard
          label="Avg Month-End Balance"
          value={formatCurrency(analysis.averageMonthEndBalance)}
          tone={avgBalanceTone}
        />
        <SummaryCard
          label="Liquidity Buffer"
          value={formatCurrency(analysis.netSurplusAfterRepayment)}
          tone={liquidityTone}
        />
        <SummaryCard
          label="Required Buffer"
          value={formatCurrency(analysis.liquidityBufferRequired)}
          tone={liquidityTone}
        />
        <SummaryCard
          label="Credit Score"
          value={typeof analysis.creditScore === 'number' ? analysis.creditScore.toLocaleString() : '—'}
          tone={creditScoreTone}
        />
        <SummaryCard
          label="Care Cova Score"
          value={
            typeof analysis.careCovaScore === 'number'
              ? `${analysis.careCovaScore}/100`
              : '—'
          }
        />
        <SummaryCard label="Total Credits" value={formatCurrency(analysis.totalCredits)} />
        <SummaryCard label="Total Debits" value={formatCurrency(analysis.totalDebits)} />
        <SummaryCard label="Net Cash Flow" value={formatCurrency(analysis.netCashFlow)} />
        <SummaryCard label="Total Assets" value={formatCurrency(analysis.totalAssetValue)} />
      </div>

      {typeof analysis.careCovaScore === 'number' && analysis.careCovaBreakdown && (
        <div className="id-info-card id-info-card--wide" style={{ marginTop: '1rem' }}>
          <h4>Care Cova Credit Score</h4>
          <div className="id-info-row">
            <span className="id-info-label">Score</span>
            <span className="id-info-value">
              {analysis.careCovaScore}/100
              {analysis.careCovaDecision && (
                <span
                  style={{
                    marginLeft: 8,
                    padding: '2px 8px',
                    borderRadius: 999,
                    fontSize: 11,
                    textTransform: 'uppercase',
                    background:
                      analysis.careCovaColour === 'green'
                        ? '#dcfce7'
                        : analysis.careCovaColour === 'blue'
                          ? '#dbeafe'
                          : analysis.careCovaColour === 'black'
                            ? '#e5e7eb'
                            : '#fee2e2',
                    color:
                      analysis.careCovaColour === 'green'
                        ? '#166534'
                        : analysis.careCovaColour === 'blue'
                          ? '#1d4ed8'
                          : analysis.careCovaColour === 'black'
                            ? '#111827'
                            : '#b91c1c',
                  }}
                >
                  {analysis.careCovaDecision === 'review_for_approval'
                    ? 'REVIEW FOR APPROVAL'
                    : analysis.careCovaDecision === 'double_review'
                      ? 'DOUBLE REVIEW (SMALLER LOAN)'
                      : analysis.careCovaDecision === 'manual_review'
                        ? 'MANUAL REVIEW – CALL CLIENT'
                        : 'REJECT'}
                </span>
              )}
            </span>
          </div>
          <div className="id-score-bars">
            <div className="id-score-bar">
              <div className="id-score-bar-label">Income Strength</div>
              <div className="id-score-bar-track">
                <div
                  className="id-score-bar-fill"
                  style={{ width: `${(analysis.careCovaBreakdown.incomeStrength / 36) * 100}%` }}
                />
              </div>
              <div className="id-score-bar-value">
                {analysis.careCovaBreakdown.incomeStrength}/36
              </div>
            </div>
            <div className="id-score-bar">
              <div className="id-score-bar-label">Employment Stability</div>
              <div className="id-score-bar-track">
                <div
                  className="id-score-bar-fill"
                  style={{ width: `${(analysis.careCovaBreakdown.employmentStability / 15) * 100}%` }}
                />
              </div>
              <div className="id-score-bar-value">
                {analysis.careCovaBreakdown.employmentStability}/15
              </div>
            </div>
            <div className="id-score-bar">
              <div className="id-score-bar-label">Bank Account History</div>
              <div className="id-score-bar-track">
                <div
                  className="id-score-bar-fill"
                  style={{ width: `${(analysis.careCovaBreakdown.bankHistory / 15) * 100}%` }}
                />
              </div>
              <div className="id-score-bar-value">
                {analysis.careCovaBreakdown.bankHistory}/15
              </div>
            </div>
            <div className="id-score-bar">
              <div className="id-score-bar-label">Existing Debt Check</div>
              <div className="id-score-bar-track">
                <div
                  className="id-score-bar-fill"
                  style={{ width: `${(analysis.careCovaBreakdown.existingDebt / 15) * 100}%` }}
                />
              </div>
              <div className="id-score-bar-value">
                {analysis.careCovaBreakdown.existingDebt}/15
              </div>
            </div>
            <div className="id-score-bar">
              <div className="id-score-bar-label">Income Stability</div>
              <div className="id-score-bar-track">
                <div
                  className="id-score-bar-fill"
                  style={{ width: `${(analysis.careCovaBreakdown.incomeStability / 7) * 100}%` }}
                />
              </div>
              <div className="id-score-bar-value">
                {analysis.careCovaBreakdown.incomeStability}/7
              </div>
            </div>
            <div className="id-score-bar">
              <div className="id-score-bar-label">Identity Verification</div>
              <div className="id-score-bar-track">
                <div
                  className="id-score-bar-fill"
                  style={{ width: `${(analysis.careCovaBreakdown.identityVerification / 12) * 100}%` }}
                />
              </div>
              <div className="id-score-bar-value">
                {analysis.careCovaBreakdown.identityVerification}/12
              </div>
            </div>
          </div>
          {analysis.salaryPattern && (
            <div className="id-info-row">
              <span className="id-info-label">Salary Pattern</span>
              <span className="id-info-value">{analysis.salaryPattern.replace(/_/g, ' ')}</span>
            </div>
          )}
          {Array.isArray(analysis.extraRiskFlags) && analysis.extraRiskFlags.length > 0 && (
            <div className="id-info-row">
              <span className="id-info-label">Extra Risk Flags</span>
              <span className="id-info-value">
                {analysis.extraRiskFlags.map((flag) => flag.replace(/_/g, ' ')).join(', ')}
              </span>
            </div>
          )}
        </div>
      )}

      <div className="mono-decision-card">
        <div className="mono-decision-header">
          <h3>Analysis Decision</h3>
          <span className="mono-decision-badge" style={{ color: decisionMeta.color, background: decisionMeta.bg }}>
            {decisionMeta.label}
          </span>
        </div>
        <p className="mono-decision-reason">{analysis.finalReason || '—'}</p>
        {analysis.recommendation && (
          <p className="mono-decision-reco">Recommendation: {analysis.recommendation}</p>
        )}
      </div>

      {Array.isArray(analysis.ruleChecks) && analysis.ruleChecks.length > 0 && (
        <div className="mono-rules-grid">
          {analysis.ruleChecks.map((rule) => (
            <div key={rule.code} className="mono-rule-card">
              <div className="mono-rule-top">
                <strong>{rule.title}</strong>
                <span className={`mono-rule-pill ${rule.passed ? 'pass' : 'fail'}`}>
                  {rule.passed ? 'PASS' : 'FAIL'}
                </span>
              </div>
              <div className="mono-rule-message">{rule.message}</div>
              <div className="mono-rule-meta">
                <span>Threshold: {formatCurrency(rule.thresholdValue)}</span>
                <span>Actual: {formatCurrency(rule.actualValue)}</span>
                <span>Ratio: {formatPercent(rule.ratio)}</span>
              </div>
            </div>
          ))}
        </div>
      )}

      {summaryEntries.length > 0 && (
        <div className="id-summary-section">
          <h3>Summary</h3>
          {summaryEntries.map(([key, value]) => (
            <div key={key} className="mono-analysis-row">
              <span className="mono-analysis-key">{key}</span>
              <span className="mono-analysis-value">{value}</span>
            </div>
          ))}
        </div>
      )}

      {Array.isArray(analysis.insights) && analysis.insights.length > 0 && (
        <div className="mono-insights">
          <h3>Insights</h3>
          <ul>{analysis.insights.map((insight, i) => <li key={i}>{insight}</li>)}</ul>
        </div>
      )}

      {Array.isArray(report.warnings) && report.warnings.length > 0 && (
        <div className="alert-box alert-warning">{report.warnings.join(' | ')}</div>
      )}
    </div>
  )
}
