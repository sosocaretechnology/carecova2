import { Fragment, useEffect, useMemo, useState } from 'react'
import {
  AlertCircle,
  ArrowDownRight,
  ArrowUpRight,
  BarChart3,
  ChevronLeft,
  ChevronRight,
  Download,
  RefreshCw,
  Search,
  Wallet,
} from 'lucide-react'
import { adminService } from '../../../services/adminService'
import './TransactionExplorer.css'

const PAGE_SIZE = 30
const MONTH_OPTIONS = [3, 6, 12]

function addMonths(date, amount) {
  const result = new Date(date)
  result.setMonth(result.getMonth() + amount)
  return result
}

function transactionDate(transaction) {
  const date = new Date(transaction.date || transaction.createdAt || '')
  return Number.isNaN(date.getTime()) ? null : date
}

function transactionType(transaction) {
  const value = String(transaction.type || '').toLowerCase()
  if (value.includes('credit')) return 'credit'
  if (value.includes('debit')) return 'debit'
  return Number(transaction.amountMinor ?? 0) < 0 ? 'debit' : 'credit'
}

function transactionAmount(transaction) {
  const value = Number(transaction.amountMajor)
  return Number.isFinite(value) ? Math.abs(value) : 0
}

function formatMoney(value, currency = 'NGN', compact = false) {
  if (!Number.isFinite(Number(value))) return '—'
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency: currency || 'NGN',
    maximumFractionDigits: 0,
    notation: compact ? 'compact' : 'standard',
  }).format(Number(value))
}

function formatDate(value, options = {}) {
  if (value == null || value === '') return '—'
  const date = value instanceof Date ? value : new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return new Intl.DateTimeFormat('en-NG', options).format(date)
}

function monthKey(date) {
  return `${date.getFullYear()}-${String(date.getMonth() + 1).padStart(2, '0')}`
}

function isInRange(transaction, start, end) {
  const date = transactionDate(transaction)
  return date && date >= start && date <= end
}

function summarize(transactions, monthCount) {
  const summary = transactions.reduce((result, transaction) => {
    const amount = transactionAmount(transaction)
    if (transactionType(transaction) === 'credit') result.credits += amount
    else result.debits += amount
    return result
  }, { credits: 0, debits: 0 })
  return {
    ...summary,
    net: summary.credits - summary.debits,
    count: transactions.length,
    averageCredits: monthCount > 0 ? summary.credits / monthCount : 0,
  }
}

function StatCard({ label, value, hint, tone = 'neutral', icon: Icon }) {
  return (
    <div className={`tx-stat tx-stat--${tone}`}>
      <div className="tx-stat-top">
        <span>{label}</span>
        {Icon && <Icon size={17} aria-hidden="true" />}
      </div>
      <strong>{value}</strong>
      {hint && <small>{hint}</small>}
    </div>
  )
}

function CashFlowChart({ rows, currency }) {
  const maxValue = Math.max(1, ...rows.flatMap((row) => [row.credits, row.debits]))
  if (!rows.length) return <div className="tx-chart-empty">No monthly activity in this period.</div>

  return (
    <div className="tx-cash-chart-scroll">
      <svg className="tx-cash-chart" viewBox={`0 0 ${Math.max(680, rows.length * 76)} 250`} role="img" aria-label="Monthly credits and debits">
        {[0, 1, 2, 3].map((tick) => {
          const y = 22 + tick * 49
          const amount = maxValue * (1 - tick / 3)
          return (
            <g key={tick}>
              <line x1="68" y1={y} x2={Math.max(660, rows.length * 76)} y2={y} className="tx-gridline" />
              <text x="60" y={y + 4} textAnchor="end" className="tx-chart-axis">{formatMoney(amount, currency, true)}</text>
            </g>
          )
        })}
        {rows.map((row, index) => {
          const x = 88 + index * 76
          const creditHeight = (row.credits / maxValue) * 147
          const debitHeight = (row.debits / maxValue) * 147
          return (
            <g key={row.key}>
              <rect x={x} y={192 - creditHeight} width="22" height={creditHeight} rx="4" className="tx-bar-credit">
                <title>{`${row.label}: credits ${formatMoney(row.credits, currency)}`}</title>
              </rect>
              <rect x={x + 26} y={192 - debitHeight} width="22" height={debitHeight} rx="4" className="tx-bar-debit">
                <title>{`${row.label}: debits ${formatMoney(row.debits, currency)}`}</title>
              </rect>
              <text x={x + 24} y="218" textAnchor="middle" className="tx-chart-month">{row.label}</text>
            </g>
          )
        })}
      </svg>
      <div className="tx-chart-legend">
        <span><i className="tx-legend-credit" /> Credits</span>
        <span><i className="tx-legend-debit" /> Debits</span>
      </div>
    </div>
  )
}

function BalanceChart({ transactions, currency }) {
  const pointsByDay = new Map()
  transactions.forEach((transaction) => {
    const date = transactionDate(transaction)
    const balance = Number(transaction.balanceMajor)
    if (!date || !Number.isFinite(balance)) return
    const key = `${date.getFullYear()}-${date.getMonth()}-${date.getDate()}`
    const previous = pointsByDay.get(key)
    if (!previous || date > previous.date) pointsByDay.set(key, { date, balance })
  })
  const points = [...pointsByDay.values()].sort((a, b) => a.date - b.date).slice(-90)
  if (points.length < 2) return <div className="tx-chart-empty">Not enough balance history to draw a trend.</div>

  const values = points.map((point) => point.balance)
  const min = Math.min(...values)
  const max = Math.max(...values)
  const spread = Math.max(max - min, 1)
  const chartWidth = 720
  const chartHeight = 190
  const coordinates = points.map((point, index) => ({
    x: 8 + (index / (points.length - 1)) * (chartWidth - 16),
    y: 12 + ((max - point.balance) / spread) * (chartHeight - 24),
    ...point,
  }))
  const path = coordinates.map((point, index) => `${index === 0 ? 'M' : 'L'} ${point.x} ${point.y}`).join(' ')

  return (
    <div className="tx-balance-chart-wrap">
      <div className="tx-chart-range"><span>{formatMoney(min, currency)}</span><span>{formatMoney(max, currency)}</span></div>
      <svg className="tx-balance-chart" viewBox={`0 0 ${chartWidth} ${chartHeight}`} role="img" aria-label="Daily closing balance trend">
        {[0, 1, 2, 3].map((tick) => <line key={tick} x1="0" y1={12 + tick * 55} x2={chartWidth} y2={12 + tick * 55} className="tx-gridline" />)}
        <path d={path} className="tx-balance-path" />
        {coordinates.filter((_, index) => index === 0 || index === coordinates.length - 1 || index % 15 === 0).map((point) => (
          <circle key={point.date.toISOString()} cx={point.x} cy={point.y} r="4" className="tx-balance-dot">
            <title>{`${formatDate(point.date)} · ${formatMoney(point.balance, currency)}`}</title>
          </circle>
        ))}
      </svg>
      <div className="tx-chart-range"><span>{formatDate(points[0].date, { day: 'numeric', month: 'short' })}</span><span>{formatDate(points.at(-1).date, { day: 'numeric', month: 'short' })}</span></div>
    </div>
  )
}

function CategoryChart({ transactions, currency }) {
  const categories = new Map()
  transactions.forEach((transaction) => {
    if (transactionType(transaction) !== 'debit') return
    const category = String(transaction.monoCategory || transaction.category || 'Uncategorised')
    categories.set(category, (categories.get(category) || 0) + transactionAmount(transaction))
  })
  const rows = [...categories.entries()].sort((a, b) => b[1] - a[1]).slice(0, 8)
  const largest = Math.max(1, ...rows.map(([, amount]) => amount))
  if (!rows.length) return <div className="tx-chart-empty">No debit categories in this period.</div>

  return (
    <div className="tx-category-chart">
      {rows.map(([category, amount]) => (
        <div className="tx-category-row" key={category}>
          <div className="tx-category-label"><span>{category.replaceAll('_', ' ')}</span><strong>{formatMoney(amount, currency)}</strong></div>
          <div className="tx-category-track"><span style={{ width: `${Math.max(2, (amount / largest) * 100)}%` }} /></div>
        </div>
      ))}
    </div>
  )
}

function ComparisonCard({ label, current, previous, currency, inverse = false }) {
  const delta = current - previous
  const percent = previous === 0 ? null : (delta / Math.abs(previous)) * 100
  const isPositive = inverse ? delta < 0 : delta > 0
  return (
    <div className="tx-comparison-card">
      <span>{label}</span>
      <div className="tx-comparison-values">
        <strong>{formatMoney(current, currency)}</strong>
        <small>Previous: {formatMoney(previous, currency)}</small>
      </div>
      <em className={delta === 0 ? 'is-flat' : isPositive ? 'is-good' : 'is-bad'}>
        {percent == null ? (delta === 0 ? 'No change' : 'No prior period') : `${delta > 0 ? '+' : ''}${percent.toFixed(1)}%`}
      </em>
    </div>
  )
}

export default function TransactionExplorer({ loan }) {
  const [dataset, setDataset] = useState(null)
  const [loading, setLoading] = useState(true)
  const [refreshing, setRefreshing] = useState(false)
  const [error, setError] = useState('')
  const [periodMonths, setPeriodMonths] = useState(6)
  const [search, setSearch] = useState('')
  const [typeFilter, setTypeFilter] = useState('all')
  const [categoryFilter, setCategoryFilter] = useState('all')
  const [sortBy, setSortBy] = useState('newest')
  const [page, setPage] = useState(1)
  const [expandedRow, setExpandedRow] = useState('')
  const [fetchingMono, setFetchingMono] = useState(false)
  const [exporting, setExporting] = useState(false)

  const loadData = async ({ quiet = false } = {}) => {
    if (quiet) setRefreshing(true)
    else setLoading(true)
    setError('')
    try {
      const result = await adminService.getMonoTransactionAnalysis(loan.id)
      setDataset(result)
    } catch (err) {
      setError(err.message || 'Could not load Mono transaction data')
    } finally {
      setLoading(false)
      setRefreshing(false)
    }
  }

  useEffect(() => {
    let active = true
    setLoading(true)
    setError('')
    adminService.getMonoTransactionAnalysis(loan.id)
      .then((result) => { if (active) setDataset(result) })
      .catch((err) => { if (active) setError(err.message || 'Could not load Mono transaction data') })
      .finally(() => { if (active) setLoading(false) })
    return () => { active = false }
  }, [loan.id])

  const transactions = Array.isArray(dataset?.transactions) ? dataset.transactions : []
  const currency = dataset?.metadata?.currency || transactions[0]?.currency || 'NGN'
  const now = new Date()
  const start = periodMonths === 'all'
    ? new Date(Math.min(...transactions.map(transactionDate).filter(Boolean).map((date) => date.getTime()), now.getTime()))
    : addMonths(now, -Number(periodMonths))
  const previousStart = periodMonths === 'all' ? start : addMonths(start, -Number(periodMonths))
  const previousEnd = new Date(start.getTime() - 1)
  const currentTransactions = transactions.filter((transaction) => isInRange(transaction, start, now))
  const previousTransactions = periodMonths === 'all'
    ? []
    : transactions.filter((transaction) => isInRange(transaction, previousStart, previousEnd))
  const rangeMonthCount = periodMonths === 'all'
    ? Math.max(1, Math.ceil((now - start) / (30 * 24 * 60 * 60 * 1000)))
    : Number(periodMonths)

  const summary = useMemo(() => summarize(currentTransactions, rangeMonthCount), [currentTransactions, rangeMonthCount])
  const previousSummary = useMemo(() => summarize(previousTransactions, rangeMonthCount), [previousTransactions, rangeMonthCount])
  const categorySignals = useMemo(() => {
    let salaryCredits = 0
    let loanRepayments = 0
    const salaryMonths = new Set()
    currentTransactions.forEach((transaction) => {
      const category = String(transaction.monoCategory || transaction.category || '').toLowerCase()
      const type = transactionType(transaction)
      const amount = transactionAmount(transaction)
      if (category === 'salary' && type === 'credit') {
        salaryCredits += amount
        const date = transactionDate(transaction)
        if (date) salaryMonths.add(monthKey(date))
      }
      if (category === 'loan_repayment' && type === 'debit') loanRepayments += amount
    })
    return {
      salaryCredits,
      loanRepayments,
      salaryMonths: salaryMonths.size,
      salaryToRepaymentPercent: salaryCredits > 0 ? (loanRepayments / salaryCredits) * 100 : null,
    }
  }, [currentTransactions])

  const monthlyRows = useMemo(() => {
    const map = new Map()
    const firstMonth = new Date(start.getFullYear(), start.getMonth(), 1)
    const monthLimit = periodMonths === 'all' ? Math.min(rangeMonthCount, 36) : Number(periodMonths)
    for (let index = 0; index < monthLimit; index += 1) {
      const date = new Date(firstMonth.getFullYear(), firstMonth.getMonth() + index, 1)
      map.set(monthKey(date), {
        key: monthKey(date),
        label: formatDate(date, { month: 'short', year: monthLimit > 12 ? '2-digit' : undefined }),
        credits: 0,
        debits: 0,
      })
    }
    currentTransactions.forEach((transaction) => {
      const date = transactionDate(transaction)
      if (!date) return
      const key = monthKey(date)
      if (!map.has(key)) map.set(key, { key, label: formatDate(date, { month: 'short' }), credits: 0, debits: 0 })
      const row = map.get(key)
      if (transactionType(transaction) === 'credit') row.credits += transactionAmount(transaction)
      else row.debits += transactionAmount(transaction)
    })
    return [...map.values()].sort((a, b) => a.key.localeCompare(b.key)).slice(-36)
  }, [currentTransactions, periodMonths, rangeMonthCount, start])

  const categories = useMemo(() => [...new Set(currentTransactions.map((transaction) => transaction.monoCategory || transaction.category || 'Uncategorised'))].sort(), [currentTransactions])

  const filteredTransactions = useMemo(() => {
    const query = search.trim().toLowerCase()
    return currentTransactions.filter((transaction) => {
      if (typeFilter !== 'all' && transactionType(transaction) !== typeFilter) return false
      if (categoryFilter !== 'all' && (transaction.monoCategory || transaction.category || 'Uncategorised') !== categoryFilter) return false
      if (query && ![transaction.narration, transaction.description, transaction.reference, transaction.id, transaction.category]
        .some((value) => String(value || '').toLowerCase().includes(query))) return false
      return true
    }).sort((a, b) => {
      if (sortBy === 'oldest') return (transactionDate(a)?.getTime() || 0) - (transactionDate(b)?.getTime() || 0)
      if (sortBy === 'largest') return transactionAmount(b) - transactionAmount(a)
      return (transactionDate(b)?.getTime() || 0) - (transactionDate(a)?.getTime() || 0)
    })
  }, [currentTransactions, search, typeFilter, categoryFilter, sortBy])

  const pageCount = Math.max(1, Math.ceil(filteredTransactions.length / PAGE_SIZE))
  const visibleRows = filteredTransactions.slice((page - 1) * PAGE_SIZE, page * PAGE_SIZE)
  const coverage = dataset?.metadata || {}
  const hasTransactions = transactions.length > 0

  const handleFetch = async () => {
    setFetchingMono(true)
    setError('')
    try {
      await adminService.fetchMonoStatementForLoan(loan.id)
      await loadData({ quiet: true })
    } catch (err) {
      setError(err.message || 'Could not fetch transactions from Mono')
    } finally {
      setFetchingMono(false)
    }
  }

  const handleExport = () => {
    setExporting(true)
    setError('')
    try {
      const csvCell = (value) => {
        let text = value == null ? '' : String(value)
        if (/^[\s]*[=+@-]/.test(text)) text = `'${text}`
        return `"${text.replaceAll('"', '""')}"`
      }
      const header = ['Date', 'Description', 'Type', 'Amount', 'Balance', 'Currency', 'Mono category', 'Reference']
      const rows = filteredTransactions.map((transaction) => [
        transaction.date,
        transaction.narration || transaction.description,
        transactionType(transaction),
        transactionAmount(transaction).toFixed(2),
        transaction.balanceMajor == null ? '' : Number(transaction.balanceMajor).toFixed(2),
        transaction.currency || currency,
        transaction.monoCategory || transaction.category,
        transaction.reference || transaction.id,
      ].map(csvCell).join(','))
      const blob = new Blob([`\uFEFF${[header.map(csvCell).join(','), ...rows].join('\r\n')}`], { type: 'text/csv;charset=utf-8' })
      const objectUrl = window.URL.createObjectURL(blob)
      const link = document.createElement('a')
      link.href = objectUrl
      const periodLabel = periodMonths === 'all' ? 'all' : `${periodMonths}m`
      const safeCode = String(loan.applicationCode || loan.id).replace(/[^a-zA-Z0-9_-]/g, '-')
      link.download = `carecova-transactions-${safeCode}-${periodLabel}-filtered.csv`
      document.body.appendChild(link)
      link.click()
      link.remove()
      window.setTimeout(() => window.URL.revokeObjectURL(objectUrl), 1000)
    } catch (err) {
      setError(err.message || 'Could not export the transaction spreadsheet')
    } finally {
      setExporting(false)
    }
  }

  if (loading) return <div className="tx-loading"><span className="tx-spinner" />Loading bank transactions…</div>

  if (error && !dataset) {
    return (
      <section className="tx-explorer">
        <div className="tx-error"><AlertCircle size={18} />{error}<button onClick={() => loadData()}>Try again</button></div>
      </section>
    )
  }

  return (
    <section className="tx-explorer">
      <header className="tx-explorer-header">
        <div>
          <div className="tx-eyebrow"><BarChart3 size={14} /> Bank data workspace</div>
          <h2>Transaction Analysis</h2>
          <p>Explore statement activity, compare periods, and review cash flow from the linked account.</p>
        </div>
        <div className="tx-header-actions">
          <button className="tx-button tx-button--quiet" onClick={() => loadData({ quiet: true })} disabled={refreshing}>
            <RefreshCw size={15} className={refreshing ? 'tx-spin' : ''} />{refreshing ? 'Refreshing' : 'Refresh'}
          </button>
          <button className="tx-button tx-button--primary" onClick={handleExport} disabled={!filteredTransactions.length || exporting}>
            <Download size={15} />{exporting ? 'Preparing…' : 'Export filtered CSV'}
          </button>
        </div>
      </header>

      {error && <div className="tx-inline-error"><AlertCircle size={16} />{error}</div>}

      <div className={`tx-coverage ${coverage.complete !== true && hasTransactions ? 'tx-coverage--partial' : ''}`}>
        <Wallet size={17} />
        <div>
          <strong>{coverage.complete === false
            ? 'Statement data may be incomplete'
            : hasTransactions && coverage.complete !== true
              ? 'Statement coverage not verified'
              : hasTransactions
                ? 'Statement data available'
                : coverage.fetchedAt
                  ? 'Mono returned no transaction rows'
                  : 'No transactions fetched yet'}</strong>
          <span>
            {hasTransactions
              ? `${coverage.rowCount ?? transactions.length} saved transactions${coverage.totalCount && coverage.totalCount !== coverage.rowCount ? ` of ${coverage.totalCount} reported by Mono` : ''}${coverage.periodStart ? ` · ${formatDate(coverage.periodStart, { dateStyle: 'medium' })} to ${formatDate(coverage.periodEnd, { dateStyle: 'medium' })}` : ''} · ${coverage.fetchedAt ? `Fetched ${formatDate(coverage.fetchedAt, { dateStyle: 'medium', timeStyle: 'short' })}` : 'Fetch date unavailable'}`
              : coverage.fetchedAt
                ? `Last fetch ${formatDate(coverage.fetchedAt, { dateStyle: 'medium', timeStyle: 'short' })} · Fetch again or check Mono account access.`
                : 'Fetch the linked account transactions to build this analysis.'}
          </span>
        </div>
        {!hasTransactions && loan.monoConnectionStatus === 'linked' && (
          <button className="tx-button tx-button--primary" onClick={handleFetch} disabled={fetchingMono}>
            <RefreshCw size={15} className={fetchingMono ? 'tx-spin' : ''} />{fetchingMono ? 'Fetching from Mono…' : 'Fetch transactions'}
          </button>
        )}
      </div>

      {!hasTransactions ? (
        <div className="tx-empty-state">
          <Wallet size={28} />
          <h3>{loan.monoConnectionStatus === 'linked' ? 'Ready to analyse the statement' : 'Link a bank account first'}</h3>
          <p>{loan.monoConnectionStatus === 'linked' ? 'Fetch the transactions once. The explorer will use the saved data and won’t call Mono every time you open this page.' : 'Connect the applicant’s bank through Mono, then fetch the transaction history.'}</p>
        </div>
      ) : (
        <>
          <div className="tx-toolbar">
            <div className="tx-period-control" role="group" aria-label="Statement time period">
              {[...MONTH_OPTIONS, 'all'].map((months) => (
                <button key={months} className={String(periodMonths) === String(months) ? 'is-active' : ''} onClick={() => { setPeriodMonths(months); setPage(1) }}>
                  {months === 'all' ? 'All data' : `${months} months`}
                </button>
              ))}
            </div>
            <span className="tx-date-range">{formatDate(start, { day: 'numeric', month: 'short', year: 'numeric' })} – {formatDate(now, { day: 'numeric', month: 'short', year: 'numeric' })}</span>
          </div>

          <div className="tx-stats-grid">
            <StatCard label="Credits" value={formatMoney(summary.credits, currency)} hint={`${summary.count} transactions in period`} tone="positive" icon={ArrowDownRight} />
            <StatCard label="Debits" value={formatMoney(summary.debits, currency)} hint="Outgoing transactions" tone="negative" icon={ArrowUpRight} />
            <StatCard label="Net cash flow" value={formatMoney(summary.net, currency)} hint="Credits minus debits" tone={summary.net >= 0 ? 'positive' : 'negative'} icon={BarChart3} />
            <StatCard label="Average monthly credits" value={formatMoney(summary.averageCredits, currency)} hint={`Across ${rangeMonthCount} months`} tone="neutral" icon={Wallet} />
            <StatCard label="Salary-labeled credits" value={formatMoney(categorySignals.salaryCredits, currency)} hint={categorySignals.salaryCredits > 0 ? `Mono marked salary in ${categorySignals.salaryMonths} month${categorySignals.salaryMonths === 1 ? '' : 's'}` : 'Mono salary category may be unavailable'} tone="positive" icon={ArrowDownRight} />
            <StatCard label="Loan repayment-labeled debits" value={formatMoney(categorySignals.loanRepayments, currency)} hint={categorySignals.salaryToRepaymentPercent == null ? 'Compared with Mono salary labels' : `${categorySignals.salaryToRepaymentPercent.toFixed(1)}% of salary-labeled credits`} tone="negative" icon={ArrowUpRight} />
          </div>

          {periodMonths !== 'all' && (
            <div className="tx-comparison-section">
              <div className="tx-section-heading">
                <div><h3>Period comparison</h3><p>Selected period compared with the previous {periodMonths} months.</p></div>
                <span>{formatDate(previousStart, { month: 'short', year: 'numeric' })} – {formatDate(start, { month: 'short', year: 'numeric' })}</span>
              </div>
              <div className="tx-comparison-grid">
                <ComparisonCard label="Credits" current={summary.credits} previous={previousSummary.credits} currency={currency} />
                <ComparisonCard label="Debits" current={summary.debits} previous={previousSummary.debits} currency={currency} inverse />
                <ComparisonCard label="Net cash flow" current={summary.net} previous={previousSummary.net} currency={currency} />
              </div>
            </div>
          )}

          <div className="tx-chart-grid">
            <section className="tx-panel tx-panel--wide">
              <div className="tx-section-heading"><div><h3>Monthly cash flow</h3><p>Credits and debits grouped by transaction date.</p></div></div>
              <CashFlowChart rows={monthlyRows} currency={currency} />
            </section>
            <section className="tx-panel">
              <div className="tx-section-heading"><div><h3>Debit categories</h3><p>Largest categories in the selected period.</p></div></div>
              <CategoryChart transactions={currentTransactions} currency={currency} />
            </section>
            <section className="tx-panel tx-panel--wide">
              <div className="tx-section-heading"><div><h3>Balance trend</h3><p>Latest available transaction balance for each day.</p></div></div>
              <BalanceChart transactions={currentTransactions} currency={currency} />
            </section>
          </div>

          <section className="tx-panel tx-table-panel">
            <div className="tx-section-heading tx-table-heading">
              <div><h3>Transactions</h3><p>{filteredTransactions.length.toLocaleString()} matching rows · select a row to inspect the original narration.</p></div>
            </div>
            <div className="tx-filter-row">
              <label className="tx-search"><Search size={16} /><input value={search} onChange={(event) => { setSearch(event.target.value); setPage(1) }} placeholder="Search descriptions or references" /></label>
              <select value={typeFilter} onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }} aria-label="Filter by transaction type">
                <option value="all">All types</option><option value="credit">Credits</option><option value="debit">Debits</option>
              </select>
              <select value={categoryFilter} onChange={(event) => { setCategoryFilter(event.target.value); setPage(1) }} aria-label="Filter by category">
                <option value="all">All categories</option>{categories.map((category) => <option key={category} value={category}>{category.replaceAll('_', ' ')}</option>)}
              </select>
              <select value={sortBy} onChange={(event) => { setSortBy(event.target.value); setPage(1) }} aria-label="Sort transactions">
                <option value="newest">Newest first</option><option value="oldest">Oldest first</option><option value="largest">Largest amount</option>
              </select>
            </div>
            <div className="tx-table-scroll">
              <table className="tx-table">
                <thead><tr><th>Date</th><th>Description</th><th>Category</th><th>Type</th><th className="is-number">Amount</th><th className="is-number">Balance</th><th>Details</th></tr></thead>
                <tbody>
                  {visibleRows.map((transaction, index) => {
                    const type = transactionType(transaction)
                    const date = transactionDate(transaction)
                    const rowKey = transaction.id || transaction.reference || `${date?.toISOString()}-${index}`
                    const expanded = expandedRow === rowKey
                    return (
                      <Fragment key={rowKey}>
                      <tr>
                        <td className="tx-date-cell">{formatDate(date, { day: 'numeric', month: 'short', year: 'numeric' })}</td>
                        <td className="tx-description-cell" title={transaction.narration || transaction.description || ''}>{transaction.narration || transaction.description || '—'}<small>{transaction.reference || transaction.id || ''}</small></td>
                        <td><span className="tx-category-chip">{String(transaction.monoCategory || transaction.category || 'Uncategorised').replaceAll('_', ' ')}</span></td>
                        <td><span className={`tx-type-chip tx-type-chip--${type}`}>{type}</span></td>
                        <td className={`is-number tx-amount tx-amount--${type}`}>{type === 'credit' ? '+' : '−'}{formatMoney(transactionAmount(transaction), currency)}</td>
                        <td className="is-number tx-balance-cell">{transaction.balanceMajor == null ? '—' : formatMoney(Number(transaction.balanceMajor), currency)}</td>
                        <td><button className="tx-row-details" aria-expanded={expanded} onClick={() => setExpandedRow(expanded ? '' : rowKey)}>{expanded ? 'Hide' : 'Study'}</button></td>
                      </tr>
                      {expanded && <tr key={`${rowKey}-details`} className="tx-expanded-row"><td colSpan="7"><div className="tx-expanded-grid">
                        <div><span>Mono transaction ID</span><strong>{transaction.id || '—'}</strong></div>
                        <div><span>Reference</span><strong>{transaction.reference || '—'}</strong></div>
                        <div><span>Original amount</span><strong>{transaction.amountMinor ?? '—'} {currency} minor units</strong></div>
                        <div><span>Normalized amount</span><strong>{formatMoney(transactionAmount(transaction), currency)}</strong></div>
                        <div><span>Original balance</span><strong>{transaction.balanceMinor ?? '—'} {currency} minor units</strong></div>
                        <div><span>Mono category</span><strong>{transaction.monoCategory || 'Uncategorised'}</strong></div>
                        <div className="tx-expanded-narration"><span>Full narration</span><strong>{transaction.narration || transaction.description || '—'}</strong></div>
                      </div></td></tr>}
                      </Fragment>
                    )
                  })}
                  {visibleRows.length === 0 && <tr><td className="tx-no-results" colSpan="7">No transactions match these filters.</td></tr>}
                </tbody>
              </table>
            </div>
            <div className="tx-pagination">
              <span>Page {Math.min(page, pageCount)} of {pageCount}</span>
              <div><button onClick={() => setPage((value) => Math.max(1, value - 1))} disabled={page <= 1} aria-label="Previous page"><ChevronLeft size={16} /></button><button onClick={() => setPage((value) => Math.min(pageCount, value + 1))} disabled={page >= pageCount} aria-label="Next page"><ChevronRight size={16} /></button></div>
            </div>
          </section>
        </>
      )}
    </section>
  )
}
