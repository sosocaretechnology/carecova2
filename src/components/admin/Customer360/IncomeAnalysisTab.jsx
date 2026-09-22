import { useState } from 'react'
import { TrendingUp, RefreshCw, Info, Sparkles, AlertTriangle } from 'lucide-react'
import { adminService } from '../../../services/adminService'
import { freshnessService, DATA_TYPES } from '../../../services/freshnessService'
import FreshnessBadge from './FreshnessBadge'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function GeminiInsightCard({ analysis }) {
  const ps = analysis?.preScreen
  if (!ps) return null

  const riskColors = { low: '#16a34a', medium: '#d97706', high: '#dc2626' }
  const riskBgs    = { low: '#f0fdf4', medium: '#fffbeb', high: '#fef2f2' }
  const risk = String(ps.initialRisk || 'medium').toLowerCase()

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <Sparkles size={18} color="#7c3aed" />
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>AI Pre-Screen Analysis</h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: riskBgs[risk] || '#f9fafb', color: riskColors[risk] || '#9ca3af' }}>
          {String(ps.initialRisk || '—').toUpperCase()} RISK
        </span>
      </div>

      {ps.summary && (
        <p style={{ margin: '0 0 16px', fontSize: '0.9rem', color: '#374151', lineHeight: 1.6, padding: '12px 16px', background: '#f9fafb', borderRadius: 8 }}>
          {ps.summary}
        </p>
      )}

      {ps.riskExplanation && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#374151', marginBottom: 6 }}>Risk Explanation</div>
          <p style={{ margin: 0, fontSize: '0.875rem', color: '#6b7280', lineHeight: 1.6 }}>{ps.riskExplanation}</p>
        </div>
      )}

      {Array.isArray(ps.flags) && ps.flags.length > 0 && (
        <div style={{ marginBottom: 16 }}>
          <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#374151', marginBottom: 8 }}>Flags</div>
          {ps.flags.map((f, i) => {
            const sevColors = { high: '#dc2626', medium: '#d97706', low: '#3b82f6' }
            const sev = String(f.severity || 'low').toLowerCase()
            return (
              <div key={i} style={{ display: 'flex', gap: 10, padding: '8px 0', borderBottom: '1px solid #f3f4f6' }}>
                <span style={{ fontSize: '0.7rem', fontWeight: 700, padding: '2px 7px', borderRadius: 999, background: `${sevColors[sev]}18`, color: sevColors[sev], alignSelf: 'flex-start', marginTop: 2 }}>
                  {String(f.severity || 'LOW').toUpperCase()}
                </span>
                <div>
                  {f.field && <span style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#374151', marginRight: 6 }}>{f.field}:</span>}
                  <span style={{ fontSize: '0.875rem', color: '#6b7280' }}>{f.issue || JSON.stringify(f)}</span>
                </div>
              </div>
            )
          })}
        </div>
      )}

      {ps.recommendation && (
        <div style={{ padding: '12px 14px', background: '#eff6ff', borderRadius: 8, fontSize: '0.875rem', color: '#1d4ed8' }}>
          <strong>Recommendation:</strong> {ps.recommendation}
        </div>
      )}
    </div>
  )
}

function MonoIncomeCard({ profile, snapshot }) {
  if (!profile && !snapshot) return null
  const income = snapshot?.income || {}
  const employment = snapshot?.employment || {}

  const rows = [
    { label: 'Account Name',      value: profile?.accountName || '—' },
    { label: 'Account Number',    value: profile?.accountNumber || '—' },
    { label: 'Institution',       value: profile?.institution?.name || '—' },
    { label: 'Est. Monthly Income', value: fmt(income.estimatedMonthlyIncome) },
    { label: 'Income Regularity', value: income.regularity || '—' },
    { label: 'Confidence',        value: income.confidence != null ? `${Math.round(income.confidence * 100)}%` : '—' },
    { label: 'Employer (Declared)', value: employment.declaredEmployer || '—' },
    { label: 'Employer (Detected)', value: employment.detectedEmployer || '—' },
    { label: 'Employer Match',    value: employment.match ? 'Yes' : (employment.match === false ? 'No' : '—') },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 16 }}>
        <TrendingUp size={18} color="#059669" />
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Mono Income Profile</h3>
        <span style={{ marginLeft: 'auto', fontSize: '0.75rem', padding: '2px 8px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a', fontWeight: 600 }}>Mono Verified</span>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))', gap: '8px 24px' }}>
        {rows.map(r => (
          <div key={r.label} style={{ padding: '6px 0' }}>
            <div style={{ fontSize: '0.7rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em', color: '#9ca3af', marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#111827' }}>{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

function NarrativeCard({ narrative, analyzedAt }) {
  if (!narrative) return null
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
        <Sparkles size={18} color="#2563eb" />
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Transaction Analysis Narrative</h3>
        {analyzedAt && <span style={{ marginLeft: 'auto', fontSize: '0.75rem', color: '#9ca3af' }}>Analyzed {fmtDate(analyzedAt)}</span>}
      </div>
      <p style={{ margin: 0, fontSize: '0.9rem', color: '#374151', lineHeight: 1.7, whiteSpace: 'pre-wrap' }}>{narrative}</p>
    </div>
  )
}

export default function IncomeAnalysisTab({ customer, onDataRefreshed }) {
  const geminiAnalysis = customer._geminiAnalysis
  const profile = customer.monoIncomeProfile
  const snapshot = customer.monoAssessmentSnapshot

  const [running, setRunning] = useState(false)
  const [runMsg, setRunMsg] = useState('')
  const [runErr, setRunErr] = useState('')

  const latestLinkedLoan = (customer.loans || []).find(l => l.monoAccountId)
  const freshness = freshnessService.deriveFromCustomer(customer)
  const aiFreshness = freshness[DATA_TYPES.GEMINI_ANALYSIS]

  const hasData = geminiAnalysis || profile || snapshot

  const handleRunAnalysis = async () => {
    if (!latestLinkedLoan?.id) {
      setRunErr('No linked loan found. Link a bank account first.')
      return
    }
    setRunning(true)
    setRunMsg('')
    setRunErr('')
    try {
      await adminService.runAiPreScreen(latestLinkedLoan.id)
      try { await adminService.runTransactionAnalysis(latestLinkedLoan.id) } catch (_) {}
      freshnessService.markRefreshed(customer.phone, DATA_TYPES.GEMINI_ANALYSIS)
      setRunMsg('AI analysis completed. Reload the page to see updated results.')
      if (onDataRefreshed) onDataRefreshed()
    } catch (err) {
      setRunErr(err.message || 'Analysis failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div>
      {/* Controls */}
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: 16, flexWrap: 'wrap', gap: 10 }}>
        <div>
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Income &amp; Financial Analysis</h3>
          <p style={{ margin: '4px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
            AI pre-screen + Mono income profile.{' '}
            <FreshnessBadge timestamp={aiFreshness?.timestamp} label="Last analysis" />
          </p>
        </div>
        <button
          onClick={handleRunAnalysis}
          disabled={running || !latestLinkedLoan}
          title={!latestLinkedLoan ? 'Link a bank account first' : 'Run a new AI pre-screen and transaction analysis'}
          style={{ display: 'inline-flex', alignItems: 'center', gap: 6, fontSize: '0.8125rem', fontWeight: 600, padding: '7px 14px', borderRadius: 7, border: '1px solid #e9d5ff', background: '#f5f3ff', color: '#7c3aed', cursor: (running || !latestLinkedLoan) ? 'not-allowed' : 'pointer', opacity: (running || !latestLinkedLoan) ? 0.6 : 1 }}
        >
          <Sparkles size={13} />
          {running ? 'Running Analysis…' : 'Run New Analysis'}
        </button>
      </div>

      {runMsg && <div style={{ padding: '10px 14px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: 7, color: '#16a34a', fontSize: '0.875rem', marginBottom: 12 }}>{runMsg}</div>}
      {runErr && <div style={{ padding: '10px 14px', background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 7, color: '#dc2626', fontSize: '0.875rem', marginBottom: 12 }}>{runErr}</div>}

      {!hasData && (
        <div style={{ padding: '14px 18px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8, marginBottom: 20, display: 'flex', gap: 8, alignItems: 'center' }}>
          <Info size={15} color="#d97706" />
          <span style={{ fontSize: '0.8125rem', color: '#92400e' }}>
            Income analysis requires the patient's bank account to be linked via Mono Connect, and an AI pre-screen or transaction analysis to have been run.
          </span>
        </div>
      )}

      <MonoIncomeCard profile={profile} snapshot={snapshot} />
      <GeminiInsightCard analysis={geminiAnalysis} />
      <NarrativeCard narrative={geminiAnalysis?.narrative} analyzedAt={geminiAnalysis?.analyzedAt} />
    </div>
  )
}
