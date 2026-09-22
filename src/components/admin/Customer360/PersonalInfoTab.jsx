import { Shield, User } from 'lucide-react'

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'

function InfoSection({ title, icon: Icon, color = '#2563eb', rows }) {
  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginBottom: 16 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 10, marginBottom: 16 }}>
        <div style={{ width: 34, height: 34, borderRadius: 8, background: `${color}18`, display: 'flex', alignItems: 'center', justifyContent: 'center' }}>
          <Icon size={17} color={color} />
        </div>
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>{title}</h3>
      </div>
      <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '2px 24px' }}>
        {rows.map(row => (
          <div key={row.label} style={{ display: 'flex', flexDirection: 'column', padding: '8px 0', borderBottom: '1px solid #f9fafb' }}>
            <span style={{ fontSize: '0.75rem', fontWeight: 600, textTransform: 'uppercase', letterSpacing: '0.04em', color: '#9ca3af', marginBottom: 3 }}>{row.label}</span>
            <span style={{ fontSize: '0.9375rem', fontWeight: row.bold ? 700 : 500, color: row.muted ? '#6b7280' : '#111827' }}>
              {row.value || '—'}
              {row.source && (
                <span style={{ marginLeft: 6, fontSize: '0.7rem', fontWeight: 600, padding: '1px 6px', borderRadius: 999, background: '#eff6ff', color: '#3b82f6' }}>
                  {row.source}
                </span>
              )}
            </span>
          </div>
        ))}
      </div>
    </div>
  )
}

export default function PersonalInfoTab({ customer }) {
  const latest = customer.latestLoan || {}

  const personalRows = [
    { label: 'Full Name',          value: customer.fullName,                bold: true },
    { label: 'Phone Number',       value: customer.phone },
    { label: 'Email Address',      value: customer.email },
    { label: 'Date of Birth',      value: fmtDate(customer.dateOfBirth) },
    { label: 'Gender',             value: customer.gender },
    { label: 'BVN',                value: customer.bvnMasked,               source: 'Masked' },
    { label: 'NIN',                value: customer.ninMasked,               source: 'Masked' },
    { label: 'Preferred Contact',  value: latest.preferredContact },
  ]

  const locationRows = [
    { label: 'Home Address',       value: customer.homeAddress },
    { label: 'City',               value: customer.city },
    { label: 'LGA',                value: customer.lga },
    { label: 'State',              value: customer.state },
    { label: 'Landmark',           value: latest.landmark },
  ]

  const employmentRows = [
    { label: 'Employment Type',    value: customer.employmentType },
    { label: 'Sector',             value: customer.employmentSector },
    { label: 'Employer',           value: customer.employerName },
    { label: 'Job Title',          value: customer.jobTitle },
    { label: 'Duration',           value: customer.employmentDuration },
    { label: 'Salary Frequency',   value: latest.salaryFrequency },
  ]

  const financialRows = [
    { label: 'Monthly Income (Declared)',   value: customer.declaredMonthlyIncome ? `₦${Number(customer.declaredMonthlyIncome).toLocaleString()}` : '—', source: 'Customer Declared' },
    { label: 'Monthly Expenses (Declared)', value: customer.declaredMonthlyExpenses ? `₦${Number(customer.declaredMonthlyExpenses).toLocaleString()}` : '—', source: 'Customer Declared' },
    { label: 'Active Loans (Declared)',     value: latest.hasActiveLoans ? `Yes — ${latest.activeLoansMonthlyRepayment ? `₦${Number(latest.activeLoansMonthlyRepayment).toLocaleString()}/mo` : ''}` : 'None', source: 'Customer Declared' },
    { label: 'Lender Type',                value: latest.lenderType },
    { label: 'Income Range',               value: latest.monthlyIncomeRange },
  ]

  return (
    <div>
      <div style={{ display: 'flex', gap: 8, alignItems: 'center', marginBottom: 20, padding: '10px 14px', background: '#fffbeb', border: '1px solid #fde68a', borderRadius: 8 }}>
        <Shield size={15} color="#d97706" />
        <span style={{ fontSize: '0.8125rem', color: '#92400e' }}>
          <strong>Customer Declared Data</strong> — information provided directly by the patient. Verified data is shown in the KYC and Financial Profile tabs.
        </span>
      </div>

      <InfoSection title="Personal Details" icon={User} color="#2563eb" rows={personalRows} />
      <InfoSection title="Location" icon={User} color="#7c3aed" rows={locationRows} />
      <InfoSection title="Employment" icon={User} color="#059669" rows={employmentRows} />
      <InfoSection title="Declared Financial Position" icon={Shield} color="#d97706" rows={financialRows} />
    </div>
  )
}
