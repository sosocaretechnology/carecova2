import { TrendingUp, TrendingDown, AlertTriangle, CheckCircle, Info } from 'lucide-react'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function MetricCard({ label, value, sub, color = '#2563eb', trend }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '16px 20px' }}>
      <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: '#9ca3af', marginBottom: 6 }}>{label}</div>
      <div style={{ fontWeight: 800, fontSize: '1.5rem', color, marginBottom: 2 }}>{value}</div>
      {sub && <div style={{ fontSize: '0.75rem', color: '#6b7280' }}>{sub}</div>}
      {trend && (
        <div style={{ display: 'flex', alignItems: 'center', gap: 4, marginTop: 4, fontSize: '0.75rem', color: trend > 0 ? '#16a34a' : '#dc2626' }}>
          {trend > 0 ? <TrendingUp size={12} /> : <TrendingDown size={12} />}
          {Math.abs(trend)}% vs. declared
        </div>
      )}
    </div>
  )
}

function ProgressBar({ label, value, max, color = '#3b82f6', formatFn = fmt }) {
  const pct = max > 0 ? Math.min(100, Math.round(value / max * 100)) : 0
  return (
    <div style={{ marginBottom: 14 }}>
      <div style={{ display: 'flex', justifyContent: 'space-between', marginBottom: 5, fontSize: '0.8125rem' }}>
        <span style={{ fontWeight: 500, color: '#374151' }}>{label}</span>
        <span style={{ fontWeight: 700, color: '#111827' }}>{formatFn(value)}</span>
      </div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 999 }}>
        <div style={{ height: 8, width: `${pct}%`, background: color, borderRadius: 999, transition: 'width 0.4s' }} />
      </div>
      <div style={{ textAlign: 'right', fontSize: '0.7rem', color: '#9ca3af', marginTop: 2 }}>{pct}% of income</div>
    </div>
  )
}

function SignalPill({ text, severity = 'info' }) {
  const colors = {
    info:    { bg: '#eff6ff', color: '#3b82f6' },
    warning: { bg: '#fffbeb', color: '#d97706' },
    danger:  { bg: '#fef2f2', color: '#dc2626' },
    success: { bg: '#f0fdf4', color: '#16a34a' },
  }
  const c = colors[severity] || colors.info
  return (
    <span style={{ display: 'inline-block', padding: '3px 10px', borderRadius: 999, fontSize: '0.8rem', fontWeight: 600, background: c.bg, color: c.color, margin: '3px 4px 3px 0' }}>
      {text}
    </span>
  )
}

export default function FinancialProfileTab({ customer }) {
  const loan = customer.latestLoan || {}
  const snap = customer.monoAssessmentSnapshot || {}
  const income = snap.income || {}
  const expenses = snap.expenses || {}
  const obligations = snap.obligations || {}
  const affordability = snap.affordability || {}
  const signals = snap.signals || []

  const declaredIncome = customer.declaredMonthlyIncome || 0
  const observedIncome = income.estimatedMonthlyIncome || customer.estimatedMonthlyIncome || 0
  const monthlyExpenses = expenses.estimatedMonthlyExpenses || customer.declaredMonthlyExpenses || 0
  const monthlyObligations = obligations.estimatedMonthlyRepayments || 0
  const disposableIncome = affordability.estimatedDisposableIncome || customer.estimatedDisposableIncome || 0
  const incomeConfidence = typeof income.confidence === 'number' ? `${Math.round(income.confidence * 100)}%` : '—'
  const regularity = income.regularity || '—'
  const employerMatch = snap.employment?.match ? 'Matched' : (snap.employment ? 'Not Matched' : '—')

  const incomeDiff = declaredIncome && observedIncome ? Math.round((observedIncome - declaredIncome) / declaredIncome * 100) : null

  const hasData = observedIncome > 0 || monthlyExpenses > 0

  return (
    <div>
      {!hasData && (
        <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Info size={15} color="#d97706" />
          <span style={{ fontSize: '0.8125rem', color: '#92400e' }}>
            Financial profile is built from Mono bank data and Gemini analysis. Link the patient's bank account to populate this section.
          </span>
        </div>
      )}

      {/* Income metrics */}
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(160px, 1fr))', gap: 12, marginBottom: 20 }}>
        <MetricCard label="Declared Income"     value={fmt(declaredIncome)}     sub="Customer provided"   color="#6b7280" />
        <MetricCard label="Observed Income"     value={fmt(observedIncome)}     sub="Mono-derived"        color="#2563eb" trend={incomeDiff} />
        <MetricCard label="Income Confidence"   value={incomeConfidence}         sub="Analysis confidence" color="#7c3aed" />
        <MetricCard label="Income Regularity"   value={regularity}              sub="Pattern type"        color="#059669" />
        <MetricCard label="Employer Match"      value={employerMatch}           sub="Declared vs. observed" color={snap.employment?.match ? '#059669' : '#d97706'} />
        <MetricCard label="Disposable Income"   value={fmt(disposableIncome)}   sub="Est. after obligations" color="#16a34a" />
      </div>

      {/* Income vs expenses breakdown */}
      {hasData && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <h3 style={{ margin: '0 0 16px', fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Monthly Breakdown</h3>
          <ProgressBar label="Monthly Expenses"     value={monthlyExpenses}     max={observedIncome} color="#f59e0b" />
          <ProgressBar label="Existing Obligations" value={monthlyObligations}  max={observedIncome} color="#ef4444" />
          <ProgressBar label="Est. Disposable"      value={disposableIncome}    max={observedIncome} color="#22c55e" />
          {observedIncome > 0 && (
            <div style={{ marginTop: 12, padding: '10px 14px', background: '#f9fafb', borderRadius: 8, fontSize: '0.8125rem', color: '#374151' }}>
              <strong>Debt-to-Income Ratio:</strong>{' '}
              {monthlyObligations > 0
                ? `${Math.round(monthlyObligations / observedIncome * 100)}% (obligations / observed income)`
                : 'No existing obligations detected'}
            </div>
          )}
        </div>
      )}

      {/* Risk signals */}
      {signals.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <AlertTriangle size={17} color="#d97706" />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Financial Risk Signals</h3>
          </div>
          <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: '#6b7280' }}>
            Signals derived from transaction analysis. These are indicators, not absolute conclusions.
          </p>
          <div>
            {signals.map((s, i) => (
              <SignalPill key={i} text={typeof s === 'string' ? s : s.label || JSON.stringify(s)} severity={s.severity || 'warning'} />
            ))}
          </div>
        </div>
      )}

      {/* Data source + freshness */}
      <div style={{ background: '#f9fafb', border: '1px solid #e5e7eb', borderRadius: 10, padding: '14px 20px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 6, marginBottom: 6 }}>
          <CheckCircle size={14} color="#059669" />
          <span style={{ fontSize: '0.8125rem', fontWeight: 600, color: '#374151' }}>Data Sources</span>
        </div>
        <div style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.8 }}>
          <div><strong>Income & Expenses:</strong> Mono Financial Data + CareCova Transaction Analysis</div>
          <div><strong>Employer Match:</strong> Declared employer vs. observed payroll credits</div>
          <div><strong>Last Analysis:</strong> {fmtDate(customer.lastMonoSync)}</div>
          {snap.analysisDate && <div><strong>Snapshot Date:</strong> {fmtDate(snap.analysisDate)}</div>}
        </div>
      </div>
    </div>
  )
}
