import { CheckCircle, XCircle, Clock, AlertCircle, ShieldCheck, CreditCard } from 'lucide-react'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

function VerificationRow({ label, status, detail, timestamp, source }) {
  const map = {
    verified: { Icon: CheckCircle, color: '#16a34a', bg: '#f0fdf4', label: 'Verified' },
    failed:   { Icon: XCircle,     color: '#dc2626', bg: '#fef2f2', label: 'Failed' },
    mismatch: { Icon: AlertCircle, color: '#dc2626', bg: '#fef2f2', label: 'Mismatch' },
    partial:  { Icon: AlertCircle, color: '#d97706', bg: '#fffbeb', label: 'Partial Match' },
    pending:  { Icon: Clock,       color: '#3b82f6', bg: '#eff6ff', label: 'Pending' },
    not_run:  { Icon: Clock,       color: '#9ca3af', bg: '#f9fafb', label: 'Not Run' },
  }
  const cfg = map[status] || map['not_run']
  return (
    <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', padding: '14px 0', borderBottom: '1px solid #f3f4f6' }}>
      <div style={{ flex: 1 }}>
        <div style={{ fontWeight: 600, fontSize: '0.9375rem', color: '#111827', marginBottom: 2 }}>{label}</div>
        {detail && <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{detail}</div>}
        {timestamp && <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 2 }}>{fmtDateTime(timestamp)}</div>}
        {source && <div style={{ marginTop: 4, fontSize: '0.75rem', color: '#6b7280' }}>Source: {source}</div>}
      </div>
      <span style={{ fontSize: '0.8125rem', fontWeight: 600, padding: '4px 12px', borderRadius: 999, background: cfg.bg, color: cfg.color, display: 'flex', alignItems: 'center', gap: 5, marginLeft: 12, flexShrink: 0 }}>
        <cfg.Icon size={13} />
        {cfg.label}
      </span>
    </div>
  )
}

function FirstCentralCard({ result, checkedAt }) {
  if (!result) return (
    <div style={{ padding: '20px 0', color: '#9ca3af', fontSize: '0.875rem', textAlign: 'center' }}>
      No credit bureau check on record.
    </div>
  )

  const score = result.iScore ?? result.creditScore ?? '—'
  const band  = result.riskBand ?? result.band ?? '—'
  const facilities = result.totalFacilities ?? result.noOfLoans ?? '—'
  const overdue = result.overdueAmount ?? result.totalOverdueAmount

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(140px, 1fr))', gap: 12, marginTop: 12 }}>
      {[
        { label: 'Credit Score',     value: score,    highlight: true },
        { label: 'Risk Band',        value: band },
        { label: 'Total Facilities', value: facilities },
        { label: 'Overdue Amount',   value: overdue != null ? `₦${Number(overdue).toLocaleString()}` : '—' },
        { label: 'Checked',          value: fmtDate(checkedAt) },
      ].map(c => (
        <div key={c.label} style={{ background: '#f9fafb', borderRadius: 8, padding: '12px 14px' }}>
          <div style={{ fontSize: '0.75rem', color: '#9ca3af', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.05em', marginBottom: 4 }}>{c.label}</div>
          <div style={{ fontWeight: c.highlight ? 800 : 600, fontSize: c.highlight ? '1.5rem' : '1rem', color: '#111827' }}>{String(c.value)}</div>
        </div>
      ))}
    </div>
  )
}

export default function KycIdentityTab({ customer }) {
  const identity = customer.latestLoan || {}
  const vs = customer.verificationStatus || {}

  const identityStatus   = vs.identity === 'verified' ? 'verified' : (vs.identity || 'not_run')
  const creditStatus     = vs.credit   === 'verified' ? 'verified' : (vs.credit   || 'not_run')
  const bankingStatus    = vs.banking  === 'verified' ? 'verified' : (vs.banking  || 'not_run')
  const payrollStatus    = vs.payroll  === 'verified' ? 'verified' : (vs.payroll  || 'not_run')

  const fc = customer.latestLoan?.firstCentralResult
  const fcAt = customer.latestLoan?.firstCentralCheckedAt

  return (
    <div>
      {/* Identity documents */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 6 }}>
          <ShieldCheck size={20} color="#2563eb" />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Identity Documents</h3>
        </div>
        <p style={{ margin: '0 0 12px', fontSize: '0.8125rem', color: '#6b7280' }}>Government ID verification results.</p>

        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '0 24px' }}>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>BVN</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{customer.bvnMasked || '—'}</div>
          </div>
          <div>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>NIN</div>
            <div style={{ fontFamily: 'monospace', fontSize: '1rem', fontWeight: 600, color: '#111827' }}>{customer.ninMasked || '—'}</div>
          </div>
          <div style={{ marginTop: 12 }}>
            <div style={{ fontSize: '0.75rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 6 }}>Date of Birth</div>
            <div style={{ fontSize: '0.9375rem', fontWeight: 500, color: '#111827' }}>{fmtDate(customer.dateOfBirth)}</div>
          </div>
        </div>
      </div>

      {/* Verification checks */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
          <CheckCircle size={20} color="#059669" />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Verification Status</h3>
        </div>

        <VerificationRow
          label="Identity Verification"
          status={identityStatus}
          detail="BVN / NIN check via identity provider"
          source="Dojah / Identity Provider"
        />
        <VerificationRow
          label="Credit Bureau Check"
          status={creditStatus}
          detail="FirstCentral credit history enquiry"
          timestamp={fcAt}
          source="FirstCentral Credit Bureau"
        />
        <VerificationRow
          label="Banking / Account Verification"
          status={bankingStatus}
          detail="Bank account linked via Mono Connect"
          timestamp={customer.monoLinkedAt}
          source="Mono"
        />
        <VerificationRow
          label="Payroll Verification"
          status={payrollStatus}
          detail="Employer payroll confirmation"
          source="Remita"
        />
      </div>

      {/* First Central Results */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 4 }}>
          <CreditCard size={20} color="#7c3aed" />
          <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Credit Bureau Report</h3>
        </div>
        <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', color: '#6b7280' }}>FirstCentral credit history and iScore.</p>
        <FirstCentralCard result={fc} checkedAt={fcAt} />
      </div>
    </div>
  )
}
