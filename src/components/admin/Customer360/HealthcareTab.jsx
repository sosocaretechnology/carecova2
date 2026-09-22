import { useNavigate } from 'react-router-dom'
import { Hospital, Stethoscope, ExternalLink, Calendar } from 'lucide-react'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'

const URGENCY_CFG = {
  emergency: { bg: '#fef2f2', color: '#dc2626' },
  urgent:    { bg: '#fffbeb', color: '#d97706' },
  elective:  { bg: '#eff6ff', color: '#3b82f6' },
  routine:   { bg: '#f0fdf4', color: '#16a34a' },
}

function TreatmentCard({ loan, navigate }) {
  const urgency = String(loan.urgency || 'routine').toLowerCase()
  const urg = URGENCY_CFG[urgency] || URGENCY_CFG.routine

  const rows = [
    { label: 'Treatment Category',  value: loan.treatmentCategory },
    { label: 'Procedure / Service', value: loan.procedureOrService },
    { label: 'Health Description',  value: loan.healthDescription },
    { label: 'Hospital / Provider', value: loan.hospital || loan.hospitalName },
    { label: 'Hospital Address',    value: loan.hospitalAddress },
    { label: 'Treatment Cost',      value: fmt(loan.estimatedCost || loan.requestedAmount) },
    { label: 'Amount Financed',     value: fmt(loan.approvedAmount) },
    { label: 'Application Date',    value: fmtDate(loan.submittedAt) },
    { label: 'Disbursed',           value: fmtDate(loan.disbursedAt) },
    { label: 'Application Status',  value: loan.status },
  ]

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 14 }}>
      <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', marginBottom: 14 }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: 10 }}>
          <div style={{ width: 42, height: 42, borderRadius: 10, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
            <Stethoscope size={20} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontWeight: 700, fontSize: '1rem', color: '#111827' }}>
              {loan.treatmentCategory || loan.procedureOrService || 'Healthcare Financing'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280' }}>
              {loan.hospital || loan.hospitalName || '—'} · {fmtDate(loan.submittedAt)}
            </div>
          </div>
        </div>
        <div style={{ display: 'flex', flexDirection: 'column', alignItems: 'flex-end', gap: 6 }}>
          <span style={{ fontSize: '0.75rem', fontWeight: 700, padding: '3px 10px', borderRadius: 999, background: urg.bg, color: urg.color, textTransform: 'capitalize' }}>
            {urgency}
          </span>
          <button
            onClick={() => navigate(`/admin/applications/${loan.id}`)}
            style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', color: '#2563eb', background: 'none', border: 'none', cursor: 'pointer', padding: 0 }}
          >
            View Application <ExternalLink size={11} />
          </button>
        </div>
      </div>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: '8px 24px' }}>
        {rows.map(r => r.value && (
          <div key={r.label} style={{ padding: '6px 0', borderBottom: '1px solid #f9fafb' }}>
            <div style={{ fontSize: '0.7rem', color: '#9ca3af', fontWeight: 700, textTransform: 'uppercase', marginBottom: 2 }}>{r.label}</div>
            <div style={{ fontSize: '0.9rem', fontWeight: 500, color: '#374151' }}>{r.value}</div>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function HealthcareTab({ customer }) {
  const navigate = useNavigate()
  const loans = customer.loans || []

  const treatmentLoans = loans.filter(l =>
    l.treatmentCategory || l.procedureOrService || l.healthDescription || l.hospitalName || l.hospital
  )

  const hospitals = [...new Set(loans.map(l => l.hospital || l.hospitalName).filter(Boolean))]

  return (
    <div>
      {/* Provider summary */}
      {hospitals.length > 0 && (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 12 }}>
            <Hospital size={18} color="#059669" />
            <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Healthcare Providers</h3>
          </div>
          <div style={{ display: 'flex', flexWrap: 'wrap', gap: 8 }}>
            {hospitals.map(h => (
              <span key={h} style={{ padding: '4px 12px', borderRadius: 999, background: '#f0fdf4', color: '#059669', fontSize: '0.875rem', fontWeight: 600 }}>
                {h}
              </span>
            ))}
          </div>
        </div>
      )}

      {/* Treatment history */}
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Treatment History</h3>
        <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', color: '#6b7280' }}>
          Healthcare services and procedures this patient has applied to finance.
        </p>
      </div>

      {treatmentLoans.length === 0 ? (
        <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '40px 24px', textAlign: 'center' }}>
          <Stethoscope size={38} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
          <div style={{ fontWeight: 600, color: '#374151' }}>No treatment records</div>
          <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: 4 }}>Treatment details will appear when credit applications include medical information.</div>
        </div>
      ) : (
        treatmentLoans.map(loan => (
          <TreatmentCard key={loan.id} loan={loan} navigate={navigate} />
        ))
      )}
    </div>
  )
}
