import { CheckCircle, XCircle, AlertCircle, Clock, Info, TrendingUp, TrendingDown, Shield, Wifi, DollarSign, Activity } from 'lucide-react'
import { freshnessService } from '../../../services/freshnessService'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'
const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const pct = (n) => n != null ? `${Math.round(n)}%` : '—'

// ── Signal indicator ─────────────────────────────────────────────────────────

function Signal({ label, status, value, detail, weight = 1 }) {
  const map = {
    pass:    { Icon: CheckCircle,  color: '#16a34a', bg: '#f0fdf4', text: 'Pass' },
    warn:    { Icon: AlertCircle,  color: '#d97706', bg: '#fffbeb', text: 'Caution' },
    fail:    { Icon: XCircle,      color: '#dc2626', bg: '#fef2f2', text: 'Fail' },
    pending: { Icon: Clock,        color: '#9ca3af', bg: '#f9fafb', text: 'Pending' },
  }
  const cfg = map[status] || map.pending
  return (
    <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', padding: '11px 16px', borderRadius: 8, background: cfg.bg, marginBottom: 8 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
        <cfg.Icon size={17} color={cfg.color} />
        <div>
          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827' }}>{label}</div>
          {detail && <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: 1 }}>{detail}</div>}
        </div>
      </div>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8 }}>
        {value != null && <span style={{ fontWeight: 700, fontSize: '0.9375rem', color: cfg.color }}>{value}</span>}
        <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '2px 8px', borderRadius: 999, background: 'white', color: cfg.color, border: `1px solid ${cfg.color}30` }}>
          {cfg.text}
        </span>
      </div>
    </div>
  )
}

// ── Section card ─────────────────────────────────────────────────────────────

function Section({ title, icon: Icon, color, children }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <div style={{ width: 32, height: 32, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={16} color={color} />
        </div>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>{title}</h3>
      </div>
      {children}
    </div>
  )
}

// ── Score gauge ──────────────────────────────────────────────────────────────

function ScoreGauge({ label, score, max = 100, thresholds = [40, 70], colors = ['#dc2626', '#d97706', '#16a34a'] }) {
  const ratio = max > 0 ? Math.min(1, score / max) : 0
  const pctVal = Math.round(ratio * 100)
  const colorIdx = pctVal < thresholds[0] ? 0 : pctVal < thresholds[1] ? 1 : 2
  const color = colors[colorIdx]
  return (
    <div style={{ textAlign: 'center', padding: '16px 20px' }}>
      <div style={{ fontWeight: 800, fontSize: '2.5rem', color }}>{pctVal < 1 ? '—' : pctVal}</div>
      <div style={{ height: 8, background: '#f3f4f6', borderRadius: 999, margin: '8px 0 6px' }}>
        <div style={{ height: 8, width: `${pctVal}%`, background: color, borderRadius: 999, transition: 'width 0.5s' }} />
      </div>
      <div style={{ fontSize: '0.8125rem', color: '#6b7280', fontWeight: 500 }}>{label}</div>
    </div>
  )
}

// ── Repayment track record ───────────────────────────────────────────────────

function computeRepaymentTrack(loans) {
  let totalInstallments = 0
  let paidOnTime = 0
  let paidLate = 0
  let overdue = 0
  const now = new Date()

  for (const loan of loans) {
    if (!Array.isArray(loan.repaymentSchedule)) continue
    for (const r of loan.repaymentSchedule) {
      totalInstallments++
      if (r.paid || r.status === 'paid') {
        const dueDate = r.dueDate ? new Date(r.dueDate) : null
        const payDate = r.paymentDate || r.paidAt ? new Date(r.paymentDate || r.paidAt) : null
        if (dueDate && payDate && payDate <= dueDate) paidOnTime++
        else paidLate++
      } else {
        const dueDate = r.dueDate ? new Date(r.dueDate) : null
        if (dueDate && dueDate < now) overdue++
      }
    }
  }

  return { totalInstallments, paidOnTime, paidLate, overdue }
}

// ── Main component ───────────────────────────────────────────────────────────

export default function CreditDecisionTab({ customer }) {
  const loans = customer.loans || []
  const latest = customer.latestLoan || {}
  const freshness = freshnessService.deriveFromCustomer(customer)

  // ── Identity signals ─────────────────────────────────────────────────────
  const vs = customer.verificationStatus || {}
  const identitySignal = vs.identity === 'verified' ? 'pass' : (vs.identity ? 'warn' : 'pending')
  const creditBureauSignal = vs.credit === 'verified' ? 'pass' : (vs.credit ? 'warn' : 'pending')
  const bankSignal = customer.hasMonoConnection ? 'pass' : 'pending'

  // ── Income signals ───────────────────────────────────────────────────────
  const snap = customer.monoAssessmentSnapshot || {}
  const income = snap.income || {}
  const expenses = snap.expenses || {}
  const obligations = snap.obligations || {}
  const affordability = snap.affordability || {}
  const employment = snap.employment || {}

  const observedIncome = income.estimatedMonthlyIncome || customer.estimatedMonthlyIncome || 0
  const declaredIncome = customer.declaredMonthlyIncome || 0
  const incomeDiff = declaredIncome > 0 && observedIncome > 0
    ? Math.abs(observedIncome - declaredIncome) / declaredIncome
    : null

  const incomeSignal = !observedIncome ? 'pending'
    : (income.confidence >= 0.7 && income.regularity !== 'irregular') ? 'pass'
    : 'warn'

  const employerSignal = !employment.declaredEmployer ? 'pending'
    : employment.match ? 'pass' : 'warn'

  const incomeConsistencySignal = incomeDiff === null ? 'pending'
    : incomeDiff < 0.15 ? 'pass'
    : incomeDiff < 0.30 ? 'warn'
    : 'fail'

  // ── Affordability signals ─────────────────────────────────────────────────
  const monthlyObligations = obligations.estimatedMonthlyRepayments || 0
  const disposable = affordability.estimatedDisposableIncome || customer.estimatedDisposableIncome || 0
  const dtiRatio = observedIncome > 0 && monthlyObligations > 0
    ? monthlyObligations / observedIncome
    : null

  const dtiSignal = dtiRatio === null ? 'pending'
    : dtiRatio < 0.35 ? 'pass'
    : dtiRatio < 0.50 ? 'warn'
    : 'fail'

  const disposableSignal = !disposable ? 'pending'
    : disposable > 50000 ? 'pass'
    : disposable > 20000 ? 'warn'
    : 'fail'

  // ── Repayment history ─────────────────────────────────────────────────────
  const track = computeRepaymentTrack(loans)
  const repaymentSignal = track.totalInstallments === 0 ? 'pending'
    : track.overdue === 0 && track.paidLate === 0 ? 'pass'
    : track.overdue === 0 ? 'warn'
    : 'fail'

  const onTimeRate = track.totalInstallments > 0
    ? Math.round((track.paidOnTime / track.totalInstallments) * 100)
    : null

  // ── P2Vest / provider signals ─────────────────────────────────────────────
  const p2vest = latest.p2vestDecision || {}
  const p2vestSignal = !p2vest.decisionStatus ? 'pending'
    : p2vest.decisionStatus === 'approved' ? 'pass'
    : p2vest.decisionStatus === 'manual_review' ? 'warn'
    : 'fail'

  const firstCentral = latest.firstCentralResult || {}
  const fcScore = firstCentral.iScore ?? firstCentral.creditScore
  const fcSignal = !fcScore ? 'pending'
    : fcScore >= 600 ? 'pass'
    : fcScore >= 400 ? 'warn'
    : 'fail'

  // ── Gemini AI signal ──────────────────────────────────────────────────────
  const aiRisk = customer._geminiAnalysis?.preScreen?.initialRisk
  const aiSignal = !aiRisk ? 'pending'
    : aiRisk === 'low' ? 'pass'
    : aiRisk === 'medium' ? 'warn'
    : 'fail'

  // ── Data freshness gate ───────────────────────────────────────────────────
  const anyStaleRequired = [
    freshness.mono_account,
    freshness.identity,
  ].some(f => f?.level === 'stale')

  // ── Overall readiness score (simple weighted sum) ─────────────────────────
  const signals = [
    { s: identitySignal,           w: 2 },
    { s: bankSignal,               w: 2 },
    { s: incomeSignal,             w: 3 },
    { s: employerSignal,           w: 1 },
    { s: incomeConsistencySignal,  w: 1 },
    { s: dtiSignal,                w: 2 },
    { s: disposableSignal,         w: 2 },
    { s: repaymentSignal,          w: 3 },
    { s: p2vestSignal,             w: 2 },
    { s: fcSignal,                 w: 1 },
    { s: aiSignal,                 w: 1 },
  ]
  const totalWeight = signals.reduce((s, x) => s + x.w, 0)
  const passWeight  = signals.filter(x => x.s === 'pass').reduce((s, x) => s + x.w, 0)
  const failWeight  = signals.filter(x => x.s === 'fail').reduce((s, x) => s + x.w, 0)
  const pendingCount = signals.filter(x => x.s === 'pending').length
  const readinessScore = Math.round((passWeight / totalWeight) * 100)

  const overallStatus = failWeight > 4 ? 'fail'
    : pendingCount > 5 ? 'pending'
    : readinessScore >= 70 ? 'pass'
    : readinessScore >= 50 ? 'warn'
    : 'fail'

  const overallMap = {
    pass:    { label: 'Assessment Ready',   color: '#16a34a', bg: '#f0fdf4', desc: 'All key signals are positive. This patient appears eligible for credit assessment.' },
    warn:    { label: 'Review Required',    color: '#d97706', bg: '#fffbeb', desc: 'Some signals need attention. Manual review is recommended before proceeding.' },
    fail:    { label: 'Not Eligible',       color: '#dc2626', bg: '#fef2f2', desc: 'Critical signals failed. Address the issues below before submitting a credit application.' },
    pending: { label: 'Incomplete Profile', color: '#6b7280', bg: '#f9fafb', desc: 'Key verification steps are incomplete. Complete KYC and bank linking to enable assessment.' },
  }
  const overall = overallMap[overallStatus]

  return (
    <div>
      {/* Overall readiness */}
      <div style={{ background: overall.bg, border: `1px solid ${overall.color}30`, borderRadius: 12, padding: '24px 28px', marginBottom: 20 }}>
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', flexWrap: 'wrap', gap: 16 }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.06em', color: overall.color, marginBottom: 4 }}>Credit Assessment Readiness</div>
            <div style={{ fontWeight: 800, fontSize: '1.5rem', color: overall.color, marginBottom: 4 }}>{overall.label}</div>
            <div style={{ fontSize: '0.875rem', color: '#374151', maxWidth: 480 }}>{overall.desc}</div>
          </div>
          <div style={{ display: 'flex', gap: 16 }}>
            <ScoreGauge label="Readiness Score" score={readinessScore} />
          </div>
        </div>

        {anyStaleRequired && (
          <div style={{ marginTop: 14, display: 'flex', gap: 8, alignItems: 'center', padding: '10px 14px', background: '#fffbeb', borderRadius: 7, border: '1px solid #fde68a' }}>
            <AlertCircle size={14} color="#d97706" />
            <span style={{ fontSize: '0.8125rem', color: '#92400e', fontWeight: 500 }}>
              Some financial data is stale (&gt;30 days). Refresh Mono data before creating a new assessment.
            </span>
          </div>
        )}
      </div>

      {/* Signal groups */}
      <Section title="Identity &amp; KYC" icon={Shield} color="#2563eb">
        <Signal label="Identity Verification" status={identitySignal} detail="BVN / NIN verified by identity provider" value={vs.identity || 'Not run'} />
        <Signal label="Credit Bureau Check" status={creditBureauSignal} detail="FirstCentral iScore" value={fcScore ?? 'Not run'} />
        <Signal label="Bank Account Linked" status={bankSignal} detail="Mono Connect bank account" value={customer.hasMonoConnection ? 'Linked' : 'Not linked'} />
        <Signal label="AI Risk Flag" status={aiSignal} detail="Gemini pre-screen initial risk level" value={aiRisk || 'Not run'} />
      </Section>

      <Section title="Income &amp; Employment" icon={TrendingUp} color="#059669">
        <Signal label="Income Verified" status={incomeSignal} detail={`Observed: ${fmt(observedIncome)} · Confidence: ${income.confidence != null ? pct(income.confidence * 100) : '—'}`} value={income.regularity || '—'} />
        <Signal label="Employer Match" status={employerSignal} detail={`Declared: ${employment.declaredEmployer || '—'} · Detected: ${employment.detectedEmployer || '—'}`} />
        <Signal label="Income vs. Declared" status={incomeConsistencySignal}
          detail={`Declared: ${fmt(declaredIncome)} · Observed: ${fmt(observedIncome)} · Variance: ${incomeDiff != null ? pct(incomeDiff * 100) : '—'}`}
          value={incomeDiff != null ? pct(incomeDiff * 100) + ' variance' : '—'} />
      </Section>

      <Section title="Affordability &amp; Obligations" icon={DollarSign} color="#7c3aed">
        <Signal label="Debt-to-Income Ratio" status={dtiSignal}
          detail={`Monthly obligations: ${fmt(monthlyObligations)} on ${fmt(observedIncome)} income`}
          value={dtiRatio != null ? pct(dtiRatio * 100) : '—'} />
        <Signal label="Estimated Disposable Income" status={disposableSignal}
          detail="After existing obligations and estimated expenses"
          value={fmt(disposable)} />
        {p2vest.affordabilityScore != null && (
          <Signal label="P2Vest Affordability Score" status={p2vestSignal}
            detail="Score computed by financing provider"
            value={`${p2vest.affordabilityScore}%`} />
        )}
      </Section>

      <Section title="Repayment History" icon={Activity} color="#0891b2">
        {track.totalInstallments === 0 ? (
          <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: '0.875rem' }}>No previous CareCova credit history.</div>
        ) : (
          <>
            <Signal label="On-time Repayments" status={repaymentSignal}
              detail={`${track.paidOnTime} on time · ${track.paidLate} late · ${track.overdue} overdue`}
              value={onTimeRate != null ? pct(onTimeRate) : '—'} />
            <div style={{ display: 'grid', gridTemplateColumns: 'repeat(4, 1fr)', gap: 8, marginTop: 8 }}>
              {[
                { label: 'Installments', value: String(track.totalInstallments) },
                { label: 'On Time',      value: String(track.paidOnTime),  color: '#16a34a' },
                { label: 'Late',         value: String(track.paidLate),    color: '#d97706' },
                { label: 'Overdue',      value: String(track.overdue),     color: track.overdue > 0 ? '#dc2626' : '#16a34a' },
              ].map(r => (
                <div key={r.label} style={{ background: '#f9fafb', borderRadius: 7, padding: '10px 12px', textAlign: 'center' }}>
                  <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 4 }}>{r.label}</div>
                  <div style={{ fontWeight: 800, fontSize: '1.25rem', color: r.color || '#111827' }}>{r.value}</div>
                </div>
              ))}
            </div>
          </>
        )}
      </Section>

      <Section title="Provider Decision" icon={CheckCircle} color="#d97706">
        {!p2vest.decisionStatus ? (
          <div style={{ padding: '12px 0', color: '#9ca3af', fontSize: '0.875rem' }}>No provider submission yet for the latest application.</div>
        ) : (
          <>
            <Signal label="P2Vest Decision" status={p2vestSignal}
              detail={`Credit score: ${p2vest.creditScore ?? '—'} · Risk: ${p2vest.riskRating || '—'}`}
              value={p2vest.decisionStatus} />
            {p2vest.decisionStatus === 'approved' && (
              <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 8, marginTop: 8 }}>
                {[
                  { label: 'Recommended Amount', value: fmt(p2vest.recommendedLoanAmount) },
                  { label: 'Recommended Tenor',  value: p2vest.recommendedTenure ? `${p2vest.recommendedTenure} months` : '—' },
                  { label: 'Confidence Score',   value: p2vest.confidenceScore ? pct(p2vest.confidenceScore) : '—' },
                ].map(r => (
                  <div key={r.label} style={{ background: '#f0fdf4', borderRadius: 7, padding: '10px 12px' }}>
                    <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 3 }}>{r.label}</div>
                    <div style={{ fontWeight: 700, fontSize: '0.9375rem', color: '#16a34a' }}>{r.value}</div>
                  </div>
                ))}
              </div>
            )}
            {Array.isArray(p2vest.declineReasons) && p2vest.declineReasons.length > 0 && (
              <div style={{ marginTop: 10, padding: '10px 14px', background: '#fef2f2', borderRadius: 7 }}>
                <div style={{ fontWeight: 700, fontSize: '0.8125rem', color: '#dc2626', marginBottom: 6 }}>Decline Reasons</div>
                <ul style={{ margin: 0, paddingLeft: 18 }}>
                  {p2vest.declineReasons.map((r, i) => (
                    <li key={i} style={{ fontSize: '0.875rem', color: '#374151', marginBottom: 3 }}>{r}</li>
                  ))}
                </ul>
              </div>
            )}
          </>
        )}
      </Section>

      {/* Disclaimer */}
      <div style={{ padding: '12px 16px', background: '#f9fafb', borderRadius: 8, border: '1px solid #e5e7eb', fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.6 }}>
        <strong style={{ color: '#374151' }}>Important:</strong> These signals are decision-support indicators, not automated credit approvals.
        CareCova administrators are responsible for the final credit decision.
        All signals are derived from: Mono financial data, AI pre-screen, FirstCentral bureau, P2Vest provider, and CareCova repayment history.
        Last assessed: {fmtDate(customer.lastMonoSync) || 'not yet assessed'}.
      </div>
    </div>
  )
}
