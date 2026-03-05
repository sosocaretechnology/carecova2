import { useEffect, useMemo, useState } from 'react'
import { adminService } from '../../../services/adminService'

const SECTION_KEYS = [
  'account',
  'incomeRecords',
  'transactions',
  'assets',
  'inflows',
  'credits',
  'debits',
  'statements',
  'creditworthiness',
]

const SECTION_LABELS = {
  account: 'Account',
  incomeRecords: 'Income Records',
  transactions: 'Transactions',
  assets: 'Assets',
  inflows: 'Inflows',
  credits: 'Credits',
  debits: 'Debits',
  statements: 'Statements',
  creditworthiness: 'Creditworthiness',
}

const STATUS_COLORS = {
  success: '#16a34a',
  error: '#dc2626',
  skipped: '#64748b',
}

const toNumberOrEmpty = (value) => {
  if (value === undefined || value === null || value === '') return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ''
}

const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₦${value.toLocaleString()}`
}

const formatPercent = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${Math.round(value * 100)}%`
}

const DECISION_META = {
  approved: { label: 'APPROVED', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'REJECTED', color: '#b91c1c', bg: '#fee2e2' },
  manual_review: { label: 'MANUAL REVIEW', color: '#92400e', bg: '#fef3c7' },
}

const compactJson = (value) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return 'Unable to display response payload'
  }
}

const asObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

const asArray = (value) => (Array.isArray(value) ? value : [])

const asNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

const deriveSectionKpis = (sectionKey, section) => {
  if (!section || section.status !== 'success') return {}

  const payload = asObject(section.data)
  const data = asObject(payload.data)

  if (sectionKey === 'account') {
    const account = Object.keys(data).length > 0 ? data : asObject(payload.account)
    const institution = asObject(account.institution)
    const balance = asNumber(account.balance) ?? asNumber(asObject(account.account).balance)
    return {
      accountName: account.name || account.account_name,
      accountNumber: account.accountNumber || account.account_number,
      institution: institution.name,
      currency: account.currency,
      balance,
    }
  }

  if (sectionKey === 'incomeRecords') {
    const records = asArray(payload.data)
    const newest = asObject(records[0])
    const income = asObject(newest.income)
    return {
      recordsCount: records.length,
      monthlyIncome:
        asNumber(income.monthly_income) ??
        asNumber(income.aggregated_monthly_average) ??
        asNumber(income.aggregated_monthly_average_regular),
      incomeStreamsCount: asNumber(income.number_of_income_streams),
      incomePeriod: income.period,
    }
  }

  if (sectionKey === 'transactions') {
    const transactions = asArray(payload.data)
    return {
      transactionCount: transactions.length,
    }
  }

  if (sectionKey === 'assets') {
    const assets = asArray(data.assets)
    const totalAssetValue = assets.reduce((sum, item) => {
      const asset = asObject(item)
      const details = asObject(asset.details)
      return (
        sum +
        (asNumber(asset.return) ??
          asNumber(asset.cost) ??
          asNumber(details.current_balance) ??
          0)
      )
    }, 0)
    return {
      assetsCount: assets.length,
      totalAssetValue,
    }
  }

  if (
    sectionKey === 'inflows' ||
    sectionKey === 'credits' ||
    sectionKey === 'debits'
  ) {
    const history = asArray(data.history)
    return {
      total: asNumber(data.total),
      historyCount: history.length,
      latestPeriod: asObject(history[0]).period,
    }
  }

  if (sectionKey === 'statements') {
    const statements = asArray(payload.data)
    return {
      statementsCount: statements.length,
    }
  }

  if (sectionKey === 'creditworthiness') {
    const root = asObject(payload.data)
    const summary = asObject(root.summary)
    const nestedData = asObject(root.data)
    const source = Object.keys(nestedData).length > 0 ? nestedData : root
    return {
      score:
        asNumber(source.score) ??
        asNumber(source.credit_score) ??
        asNumber(source.risk_score),
      recommendation:
        source.recommendation || source.decision || source.status,
      existingDebt:
        asNumber(source.existing_monthly_debt) ??
        asNumber(summary.existing_monthly_debt),
    }
  }

  return {}
}

const formatKpiValue = (kpiKey, kpiValue) => {
  if (kpiValue === undefined || kpiValue === null || kpiValue === '') return '—'
  if (typeof kpiValue !== 'number') return String(kpiValue)

  const normalized = kpiKey.toLowerCase()
  if (normalized.includes('ratio') || normalized.includes('stability')) {
    return formatPercent(kpiValue <= 1 ? kpiValue : kpiValue / 100)
  }
  if (
    normalized.includes('count') ||
    normalized.includes('score') ||
    normalized.includes('months')
  ) {
    return kpiValue.toLocaleString()
  }
  return formatCurrency(kpiValue)
}

const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return undefined
  const total = values.reduce((sum, value) => sum + value, 0)
  return total / values.length
}

const round = (value, digits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  const power = 10 ** digits
  return Math.round(value * power) / power
}

const deriveAnalysisFallback = (analysis, sections, form) => {
  const output = { ...(analysis || {}) }
  const resolvedSections = sections || {}

  const creditsHistory = asArray(
    asObject(asObject(resolvedSections.credits?.data).data).history,
  )
  const inflowsHistory = asArray(
    asObject(asObject(resolvedSections.inflows?.data).data).history,
  )
  const incomeRecords = asArray(asObject(resolvedSections.incomeRecords?.data).data)
  const newestIncome = asObject(asObject(incomeRecords[0]).income)

  const series =
    creditsHistory.length > 0
      ? creditsHistory
      : inflowsHistory
  const amounts = series
    .map((item) => asNumber(asObject(item).amount))
    .filter((value) => typeof value === 'number')
    .slice(0, 6)

  const monthlyIncomeFromRecord =
    asNumber(newestIncome.monthly_income) ??
    asNumber(newestIncome.aggregated_monthly_average) ??
    asNumber(newestIncome.aggregated_monthly_average_regular)

  if (output.averageMonthlyIncome === undefined) {
    output.averageMonthlyIncome = round(
      amounts.length > 0 ? average(amounts) : monthlyIncomeFromRecord,
    )
  }
  if (output.incomeMinMonthly === undefined) {
    output.incomeMinMonthly =
      amounts.length > 0
        ? round(Math.min(...amounts))
        : output.averageMonthlyIncome
  }
  if (output.incomeMaxMonthly === undefined) {
    output.incomeMaxMonthly =
      amounts.length > 0
        ? round(Math.max(...amounts))
        : output.averageMonthlyIncome
  }

  const streamStabilities = asArray(newestIncome.income_streams)
    .map((item) => asNumber(asObject(item).stability))
    .filter((value) => typeof value === 'number')
  if (output.incomeStabilityScore === undefined && streamStabilities.length > 0) {
    output.incomeStabilityScore = round(average(streamStabilities))
  }
  if (!output.incomeStabilityLabel && typeof output.incomeStabilityScore === 'number') {
    if (output.incomeStabilityScore >= 0.8) output.incomeStabilityLabel = 'consistent'
    else if (output.incomeStabilityScore >= 0.6) output.incomeStabilityLabel = 'moderate'
    else output.incomeStabilityLabel = 'unstable'
  }

  const principal = toNumberOrEmpty(form?.principal)
  const term = toNumberOrEmpty(form?.term)
  const existingDebtFromCredit = asNumber(
    asObject(asObject(asObject(resolvedSections.creditworthiness?.data).data).data)
      .existing_monthly_debt,
  )
  const existingDebt =
    output.existingDebtMonthly ??
    existingDebtFromCredit ??
    0
  output.existingDebtMonthly = round(existingDebt)

  if (
    output.proposedMonthlyRepayment === undefined &&
    principal !== '' &&
    term !== '' &&
    term > 0
  ) {
    output.proposedMonthlyRepayment = round(principal / term)
  }

  if (
    output.totalDebtObligationMonthly === undefined &&
    typeof output.proposedMonthlyRepayment === 'number'
  ) {
    output.totalDebtObligationMonthly = round(
      (output.existingDebtMonthly || 0) + output.proposedMonthlyRepayment,
    )
  }

  if (
    output.newRepaymentToIncomeRatio === undefined &&
    typeof output.proposedMonthlyRepayment === 'number' &&
    typeof output.averageMonthlyIncome === 'number' &&
    output.averageMonthlyIncome > 0
  ) {
    output.newRepaymentToIncomeRatio = round(
      output.proposedMonthlyRepayment / output.averageMonthlyIncome,
      4,
    )
  }

  if (
    output.totalDebtToIncomeRatio === undefined &&
    typeof output.totalDebtObligationMonthly === 'number' &&
    typeof output.averageMonthlyIncome === 'number' &&
    output.averageMonthlyIncome > 0
  ) {
    output.totalDebtToIncomeRatio = round(
      output.totalDebtObligationMonthly / output.averageMonthlyIncome,
      4,
    )
  }

  const txItems = asArray(asObject(resolvedSections.transactions?.data).data)
  const latestByMonth = {}
  txItems.forEach((item) => {
    const record = asObject(item)
    const balance = asNumber(record.balance)
    const dateRaw = record.date || record.created_at || record.transaction_date
    if (balance === undefined || !dateRaw) return
    const date = new Date(String(dateRaw))
    if (Number.isNaN(date.getTime())) return
    const month = `${date.getUTCFullYear()}-${String(date.getUTCMonth() + 1).padStart(2, '0')}`
    const existing = latestByMonth[month]
    if (!existing || date.getTime() > existing.time) {
      latestByMonth[month] = { time: date.getTime(), balance }
    }
  })
  if (output.averageMonthEndBalance === undefined) {
    const monthBalances = Object.values(latestByMonth)
      .sort((a, b) => b.time - a.time)
      .slice(0, 6)
      .map((item) => item.balance)
    if (monthBalances.length > 0) {
      output.averageMonthEndBalance = round(average(monthBalances))
    } else {
      const accountNode = asObject(asObject(asObject(resolvedSections.account?.data).data).account)
      const accountBalance = asNumber(accountNode.balance)
      if (accountBalance !== undefined) output.averageMonthEndBalance = round(accountBalance)
    }
  }

  if (
    output.liquidityBufferRequired === undefined &&
    typeof output.averageMonthlyIncome === 'number'
  ) {
    output.liquidityBufferRequired = round(0.1 * output.averageMonthlyIncome)
  }
  if (
    output.netSurplusAfterRepayment === undefined &&
    typeof output.averageMonthEndBalance === 'number' &&
    typeof output.proposedMonthlyRepayment === 'number'
  ) {
    output.netSurplusAfterRepayment = round(
      output.averageMonthEndBalance - output.proposedMonthlyRepayment,
    )
  }

  if (!output.summary && typeof output.averageMonthlyIncome === 'number') {
    output.summary = {
      income: `Average monthly income is ${formatCurrency(output.averageMonthlyIncome)} with ${output.incomeStabilityLabel || 'unknown'} stability.`,
      affordability: `Proposed repayment is ${formatCurrency(output.proposedMonthlyRepayment)} (${formatPercent(output.newRepaymentToIncomeRatio)} of income).`,
      debt: `Total monthly debt obligation is ${formatCurrency(output.totalDebtObligationMonthly)} (${formatPercent(output.totalDebtToIncomeRatio)} DTI).`,
      liquidity: `Average month-end balance is ${formatCurrency(output.averageMonthEndBalance)} and buffer after repayment is ${formatCurrency(output.netSurplusAfterRepayment)}.`,
      decision:
        output.finalReason ||
        'Use these KPIs with rule checks for final super-admin decision.',
    }
  }

  return output
}

export default function MonoInformedDecisionModal({ open, onClose, loan }) {
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [sectionLoading, setSectionLoading] = useState({})
  const [error, setError] = useState('')
  const [report, setReport] = useState(null)
  const [sectionKpis, setSectionKpis] = useState({})
  const [form, setForm] = useState({
    bvn: '',
    principal: '',
    interestRate: 5,
    term: '',
    runCreditCheck: true,
  })

  const canRun = Boolean(loan?.id && loan?.monoAccountId)
  const sectionEntries = useMemo(() => {
    const sections = report?.sections || {}
    return SECTION_KEYS.map((key) => {
      const section = sections[key] || {
        status: 'skipped',
        endpoint: 'Not loaded',
        durationMs: 0,
        message: 'Section has not been loaded yet',
      }
      return [key, section]
    })
  }, [report])

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayload = () => {
    const payload = {}
    const bvn = String(form.bvn || '').trim()
    if (bvn) payload.bvn = bvn

    const principal = toNumberOrEmpty(form.principal)
    if (principal !== '') payload.principal = principal

    const interestRate = toNumberOrEmpty(form.interestRate)
    if (interestRate !== '') payload.interestRate = interestRate

    const term = toNumberOrEmpty(form.term)
    if (term !== '') payload.term = term

    payload.runCreditCheck = Boolean(form.runCreditCheck)
    payload.forceRefresh = false
    return payload
  }

  const loadOverview = async (forceRefresh = false) => {
    if (!canRun) return

    try {
      setLoadingOverview(true)
      setError('')
      const payload = buildPayload()
      const data = await adminService.getMonoInformedDecisionForLoan(
        loan.id,
        { ...payload, forceRefresh },
      )
      setReport(data)
      const derived = {}
      SECTION_KEYS.forEach((sectionKey) => {
        derived[sectionKey] = deriveSectionKpis(
          sectionKey,
          data?.sections?.[sectionKey],
        )
      })
      setSectionKpis(derived)
    } catch (err) {
      setError(err.message || 'Unable to fetch Mono informed decision data')
    } finally {
      setLoadingOverview(false)
    }
  }

  const loadSection = async (sectionKey) => {
    if (!canRun) return

    try {
      setSectionLoading((prev) => ({ ...prev, [sectionKey]: true }))
      setError('')

      const payload = buildPayload()
      const sectionResponse = await adminService.getMonoInformedDecisionSectionForLoan(
        loan.id,
        sectionKey,
        payload,
      )

      setSectionKpis((prev) => ({
        ...prev,
        [sectionKey]: sectionResponse.kpis || {},
      }))

      setReport((prev) => {
        const next = prev || {
          status: 'partial_success',
          source: sectionResponse.source || 'cache',
          generatedAt: sectionResponse.generatedAt,
          analysis: { insights: [] },
          warnings: [],
          sections: {},
        }

        return {
          ...next,
          source: sectionResponse.source || next.source,
          generatedAt: sectionResponse.generatedAt || next.generatedAt,
          sections: {
            ...(next.sections || {}),
            [sectionKey]: sectionResponse.result,
          },
        }
      })

      const refreshedOverview = await adminService.getMonoInformedDecisionForLoan(
        loan.id,
        { ...payload, forceRefresh: false },
      )
      setReport(refreshedOverview)
    } catch (err) {
      setError(err.message || `Unable to fetch ${SECTION_LABELS[sectionKey]} data`)
    } finally {
      setSectionLoading((prev) => ({ ...prev, [sectionKey]: false }))
    }
  }

  useEffect(() => {
    if (!open || !loan) return

    setForm({
      bvn: '',
      principal: loan.requestedAmount || '',
      interestRate: 5,
      term: loan.preferredDuration || '',
      runCreditCheck: true,
    })
    setReport(null)
    setSectionKpis({})
    setSectionLoading({})
    setError('')
  }, [open, loan])

  if (!open) return null

  const analysis = deriveAnalysisFallback(report?.analysis || {}, report?.sections || {}, form)
  const successCount = sectionEntries.filter(
    ([, section]) => section?.status === 'success',
  ).length
  const errorCount = sectionEntries.filter(
    ([, section]) => section?.status === 'error',
  ).length
  const decision = analysis?.finalDecision || 'manual_review'
  const decisionMeta = DECISION_META[decision] || DECISION_META.manual_review
  const summaryEntries = analysis?.summary && typeof analysis.summary === 'object'
    ? Object.entries(analysis.summary).filter(
        ([, value]) => typeof value === 'string' && value.trim() !== '',
      )
    : []

  return (
    <div className="mono-modal-backdrop" onClick={onClose}>
      <div className="mono-modal" onClick={(event) => event.stopPropagation()}>
        <div className="mono-modal-header">
          <div>
            <h2 className="mono-modal-title">Mono Informed Decision</h2>
            <p className="mono-modal-subtitle">
              Load from backend cache by default. Turn on refresh only when you need a fresh Mono pull.
            </p>
          </div>
          <button className="button button--secondary" onClick={onClose}>
            Close
          </button>
        </div>

        {!canRun ? (
          <div className="alert-box alert-warning">
            This applicant does not have a linked Mono account yet.
          </div>
        ) : null}

        <div className="mono-modal-form">
          <label>
            BVN
            <input
              type="text"
              value={form.bvn}
              onChange={(event) => updateForm('bvn', event.target.value)}
              placeholder="12345678901"
              maxLength={11}
            />
          </label>
          <label>
            Principal (NGN)
            <input
              type="number"
              value={form.principal}
              onChange={(event) => updateForm('principal', event.target.value)}
              min="1"
            />
          </label>
          <label>
            Interest Rate (%)
            <input
              type="number"
              value={form.interestRate}
              onChange={(event) => updateForm('interestRate', event.target.value)}
              min="0"
              step="0.1"
            />
          </label>
          <label>
            Term (months)
            <input
              type="number"
              value={form.term}
              onChange={(event) => updateForm('term', event.target.value)}
              min="1"
            />
          </label>
          <label className="mono-checkbox">
            <input
              type="checkbox"
              checked={form.runCreditCheck}
              onChange={(event) =>
                updateForm('runCreditCheck', event.target.checked)
              }
            />
            Run credit check
          </label>
          <button
            className="button button--primary"
            onClick={() => loadOverview(false)}
            disabled={loadingOverview || !canRun}
          >
            {loadingOverview ? 'Loading...' : 'Load Cached Overview'}
          </button>
          <button
            className="button button--secondary"
            onClick={() => loadOverview(true)}
            disabled={loadingOverview || !canRun}
          >
            {loadingOverview ? 'Loading...' : 'Update From Mono'}
          </button>
        </div>

        {error ? <div className="alert-box alert-error mt-3">{error}</div> : null}

        {report ? (
          <div className="mono-modal-content">
            <div className="mono-summary-grid">
              <div className="mono-summary-card">
                <div className="mono-summary-label">Response Status</div>
                <div className="mono-summary-value">{report.status}</div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Source</div>
                <div className="mono-summary-value">{report.source || 'cache'}</div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Sections Success</div>
                <div className="mono-summary-value">{successCount}</div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Sections Failed</div>
                <div className="mono-summary-value">{errorCount}</div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Avg Monthly Income</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.averageMonthlyIncome)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Income Range</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.incomeMinMonthly)} - {formatCurrency(analysis.incomeMaxMonthly)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Income Stability</div>
                <div className="mono-summary-value">
                  {formatPercent(analysis.incomeStabilityScore)} {analysis.incomeStabilityLabel ? `(${analysis.incomeStabilityLabel})` : ''}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Proposed Repayment</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.proposedMonthlyRepayment)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Estimated Repayment</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.estimatedMonthlyRepayment)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Existing Debt</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.existingDebtMonthly)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Total Obligation</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.totalDebtObligationMonthly)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">New Repayment Ratio</div>
                <div className="mono-summary-value">
                  {formatPercent(analysis.newRepaymentToIncomeRatio)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Total DTI Ratio</div>
                <div className="mono-summary-value">
                  {formatPercent(analysis.totalDebtToIncomeRatio)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Avg Month-End Balance</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.averageMonthEndBalance)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Total Credits</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.totalCredits)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Total Debits</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.totalDebits)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Net Cash Flow</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.netCashFlow)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Total Assets</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.totalAssetValue)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Liquidity Buffer</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.netSurplusAfterRepayment)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Required Buffer</div>
                <div className="mono-summary-value">
                  {formatCurrency(analysis.liquidityBufferRequired)}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Credit Score</div>
                <div className="mono-summary-value">
                  {typeof analysis.creditScore === 'number' ? analysis.creditScore.toLocaleString() : '—'}
                </div>
              </div>
              <div className="mono-summary-card">
                <div className="mono-summary-label">Credit Recommendation</div>
                <div className="mono-summary-value">
                  {analysis.creditRecommendation || '—'}
                </div>
              </div>
            </div>

            <div className="mono-decision-card">
              <div className="mono-decision-header">
                <h3>Analysis Decision</h3>
                <span
                  className="mono-decision-badge"
                  style={{
                    color: decisionMeta.color,
                    background: decisionMeta.bg,
                  }}
                >
                  {decisionMeta.label}
                </span>
              </div>
              <p className="mono-decision-reason">{analysis.finalReason || '—'}</p>
              {analysis.recommendation ? (
                <p className="mono-decision-reco">
                  Recommendation: {analysis.recommendation}
                </p>
              ) : null}
            </div>

            {Array.isArray(analysis.ruleChecks) && analysis.ruleChecks.length > 0 ? (
              <div className="mono-rules-grid">
                {analysis.ruleChecks.map((rule) => (
                  <div key={rule.code} className="mono-rule-card">
                    <div className="mono-rule-top">
                      <strong>{rule.title}</strong>
                      <span
                        className={`mono-rule-pill ${rule.passed ? 'pass' : 'fail'}`}
                      >
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
            ) : null}

            {Array.isArray(analysis.analysisSummary) &&
            analysis.analysisSummary.length > 0 ? (
              <div className="mono-insights">
                <h3>Analysis Summary</h3>
                <ul>
                  {analysis.analysisSummary.map((summary, index) => (
                    <li key={`${summary}-${index}`}>{summary}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {summaryEntries.length > 0 ? (
              <div className="mono-analysis-summary">
                <h3>Summary Section</h3>
                {summaryEntries.map(([key, value]) => (
                  <div key={key} className="mono-analysis-row">
                    <span className="mono-analysis-key">{key}</span>
                    <span className="mono-analysis-value">{value}</span>
                  </div>
                ))}
              </div>
            ) : null}

            {Array.isArray(analysis.insights) && analysis.insights.length > 0 ? (
              <div className="mono-insights">
                <h3>Insights</h3>
                <ul>
                  {analysis.insights.map((insight, index) => (
                    <li key={`${insight}-${index}`}>{insight}</li>
                  ))}
                </ul>
              </div>
            ) : null}

            {Array.isArray(report.warnings) && report.warnings.length > 0 ? (
              <div className="mono-warnings alert-box alert-warning">
                {report.warnings.join(' | ')}
              </div>
            ) : null}

            <div className="mono-sections">
              {sectionEntries.map(([key, section]) => {
                const statusColor = STATUS_COLORS[section.status] || '#334155'
                const cachedKpis = sectionKpis[key]
                const kpis =
                  cachedKpis && Object.keys(cachedKpis).length > 0
                    ? cachedKpis
                    : deriveSectionKpis(key, section)
                return (
                  <div key={key} className="mono-section-card">
                    <div className="mono-section-header">
                      <div>
                        <div className="mono-section-title">
                          {SECTION_LABELS[key] || key}
                        </div>
                        <div className="mono-section-endpoint">{section.endpoint}</div>
                      </div>
                      <span
                        className="mono-section-badge"
                        style={{
                          background: `${statusColor}1a`,
                          color: statusColor,
                          borderColor: `${statusColor}66`,
                        }}
                      >
                        {section.status}
                      </span>
                    </div>
                    <div className="mono-section-actions">
                      <button
                        className="button button--secondary"
                        onClick={() => loadSection(key)}
                        disabled={Boolean(sectionLoading[key]) || !canRun}
                      >
                        {sectionLoading[key] ? 'Loading...' : `Load ${SECTION_LABELS[key]}`}
                      </button>
                    </div>
                    {section.error ? (
                      <div className="mono-section-error">{section.error}</div>
                    ) : null}
                    {section.message ? (
                      <div className="mono-section-message">{section.message}</div>
                    ) : null}
                    {kpis && Object.keys(kpis).length > 0 ? (
                      <div className="mono-section-kpis">
                        <strong>KPIs</strong>
                        {Object.entries(kpis).map(([kpiKey, kpiValue]) => (
                          <div key={`${key}-${kpiKey}`} className="mono-kpi-row">
                            <span>{kpiKey}</span>
                            <span>{formatKpiValue(kpiKey, kpiValue)}</span>
                          </div>
                        ))}
                      </div>
                    ) : null}
                    <details>
                      <summary>View payload</summary>
                      <pre>{compactJson(section.data || {})}</pre>
                    </details>
                  </div>
                )
              })}
            </div>
          </div>
        ) : null}
      </div>
    </div>
  )
}
