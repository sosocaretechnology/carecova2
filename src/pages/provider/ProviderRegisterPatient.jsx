import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, ChevronLeft, UserPlus, AlertCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'
import { uploadFileToCloudinary } from '../../services/cloudinaryService'
import { NIGERIAN_STATES, STATE_CITIES, STATE_LGAS } from '../../data/locationData'

// ── Constants ────────────────────────────────────────────────────────────────

const TREATMENT_CATEGORIES = [
  'Surgery', 'Maternity', 'Dental', 'Eye Care / Optical', 'Emergency',
  'Chronic Care', 'Lab / Diagnostics', 'IVF & Fertility', 'Wellness & Screening',
  'Cosmetic & Corrective', 'Mental Health', 'Oncology', 'Orthopaedics',
  'Physiotherapy', 'Radiology', 'Renal Care', 'Dermatology', 'Cardiology', 'Other',
]

const URGENCY_OPTIONS = [
  { value: 'emergency',   label: 'Emergency' },
  { value: 'this_week',  label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'not_urgent', label: 'Not urgent' },
]

const EMPLOYMENT_TYPES = [
  { value: 'full_time_employed', label: 'Full-Time Employed' },
  { value: 'part_time_employed', label: 'Part-Time Employed' },
  { value: 'self_employed',      label: 'Self-Employed' },
  { value: 'business_owner',     label: 'Business Owner' },
  { value: 'civil_servant',      label: 'Civil Servant' },
  { value: 'unemployed',         label: 'Unemployed' },
  { value: 'retired',            label: 'Retired' },
]

const EMPLOYMENT_DURATION_OPTIONS = [
  { value: 'less_than_1_year', label: 'Less than 1 year' },
  { value: '1_2_years',        label: '1 – 2 years' },
  { value: '3_5_years',        label: '3 – 5 years' },
  { value: '6_10_years',       label: '6 – 10 years' },
  { value: 'over_10_years',    label: 'Over 10 years' },
]

const GENDER_OPTIONS = [
  { value: 'male',   label: 'Male' },
  { value: 'female', label: 'Female' },
  { value: 'other',  label: 'Other' },
]

const EMPLOYMENT_SECTOR_OPTIONS = [
  { value: 'government',   label: 'Government' },
  { value: 'private',      label: 'Private' },
  { value: 'self-employed', label: 'Self-employed' },
]

const MONTHS = ['January','February','March','April','May','June','July','August','September','October','November','December']
const MONTH_OPTIONS = [{ value: '', label: 'Month' }, ...MONTHS.map((m, i) => ({ value: String(i + 1).padStart(2, '0'), label: m }))]
const DAY_OPTIONS = [{ value: '', label: 'Day' }, ...Array.from({ length: 31 }, (_, i) => ({ value: String(i + 1).padStart(2, '0'), label: String(i + 1) }))]
const currentYear = new Date().getFullYear()
const YEAR_OPTIONS = [{ value: '', label: 'Year' }, ...Array.from({ length: 83 }, (_, i) => { const y = currentYear - 18 - i; return { value: String(y), label: String(y) } })]

const STEPS = [
  { label: 'Patient Info',     num: 1 },
  { label: 'Medical Details',  num: 2 },
  { label: 'Financial Info',   num: 3 },
  { label: 'Guarantor',        num: 4 },
  { label: 'Consent',          num: 5 },
]

const EMPTY = {
  // Step 1 — Patient Info
  fullName: '', phone: '', email: '', bvn: '', nin: '',
  dateOfBirth: '', gender: '',
  state: '', lga: '', city: '', homeAddress: '',
  documents: {}, applicantPhoto: null,
  // Step 2 — Medical Details
  hospitalName: '', hospitalAddress: '', hospitalPhone: '', hospitalEmail: '',
  isPartnerSuggested: false, suggestedHospitalId: '',
  treatmentCategory: '', procedureOrService: '', healthDescription: '', urgency: '',
  // Step 3 — Financial Info
  employmentType: '', employmentSector: '', employerName: '', jobTitle: '',
  employmentDuration: '', salaryFrequency: 'monthly',
  monthlyIncome: '', monthlyExpenses: '',
  estimatedCost: '', requestedAmount: '',
  preferredDuration: '6', repaymentMethod: '',
  repaymentBankName: '', repaymentAccountNumber: '',
  hasActiveLoans: false, activeLoansMonthlyRepayment: '',
  // Step 4 — Guarantor
  guarantorName: '', guarantorPhone: '', guarantorEmail: '', guarantorBvn: '',
  guarantorRelationship: '', guarantorEmploymentSector: '',
  guarantorEmployerName: '', guarantorMonthlyIncome: '',
  // Step 5 — Consent
  consentDataProcessing: false, consentTerms: false, consentMarketing: false,
}

// ── Shared style helpers ──────────────────────────────────────────────────────

const fieldBase = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none',
  background: '#fff', boxSizing: 'border-box',
}
const labelStyle = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
  color: '#374151', marginBottom: '5px',
}
const required = <span style={{ color: '#dc2626' }}> *</span>

function Field({ lbl, req, children, hint }) {
  return (
    <div>
      <label style={labelStyle}>{lbl}{req && required}</label>
      {hint && <p style={{ margin: '0 0 5px', fontSize: '0.75rem', color: '#9ca3af' }}>{hint}</p>}
      {children}
    </div>
  )
}

function ErrMsg({ text }) {
  if (!text) return null
  return <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px' }}>{text}</div>
}

// ── Sector from employment type ───────────────────────────────────────────────

function sectorFromType(type) {
  if (type === 'civil_servant') return 'government'
  if (['full_time_employed', 'part_time_employed'].includes(type)) return 'private'
  return 'other'
}

// ── Main component ────────────────────────────────────────────────────────────

export default function ProviderRegisterPatient() {
  const navigate = useNavigate()
  const onSessionExpired = useSessionExpired()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(null)

  // DOB parts (kept outside form for controlled selects)
  const [dobDay, setDobDay] = useState('')
  const [dobMonth, setDobMonth] = useState('')
  const [dobYear, setDobYear] = useState('')

  // Hospital picker
  const [providerList, setProviderList] = useState([])
  const [providerListLoading, setProviderListLoading] = useState(true)
  const [hospitalMode, setHospitalMode] = useState('select')
  const [hospitalSearch, setHospitalSearch] = useState('')
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false)

  // Upload loading states
  const [uploadingId, setUploadingId] = useState(false)
  const [uploadingPhoto, setUploadingPhoto] = useState(false)
  const [uploadingEstimate, setUploadingEstimate] = useState(false)
  const [uploadingPayslip, setUploadingPayslip] = useState(false)

  // Fetch provider network for hospital picker
  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
    if (!apiBase) { setProviderListLoading(false); return }
    fetch(`${apiBase}/api/provider/public/providers?limit=100`)
      .then(r => { if (!r.ok) throw new Error(`HTTP ${r.status}`); return r.json() })
      .then(data => setProviderList(Array.isArray(data) ? data : data?.providers ?? []))
      .catch(() => {})
      .finally(() => setProviderListLoading(false))
  }, [])

  // ── Field handlers ──────────────────────────────────────────────────────────

  const set = (e) => {
    const { name, value, type, checked } = e.target
    setForm(p => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    setErrors(p => ({ ...p, [name]: '' }))
  }

  const setField = (name, value) => {
    setForm(p => ({ ...p, [name]: value }))
    setErrors(p => ({ ...p, [name]: '' }))
  }

  const handleDobChange = (part, value) => {
    const d = part === 'day'   ? value : dobDay
    const m = part === 'month' ? value : dobMonth
    const y = part === 'year'  ? value : dobYear
    if (part === 'day')   setDobDay(value)
    if (part === 'month') setDobMonth(value)
    if (part === 'year')  setDobYear(value)
    if (d && m && y) setField('dateOfBirth', `${y}-${m}-${d}`)
  }

  // Reset city/LGA when state changes
  const handleStateChange = (e) => {
    setForm(p => ({ ...p, state: e.target.value, city: '', lga: '' }))
    setErrors(p => ({ ...p, state: '' }))
  }

  // ── Validation ──────────────────────────────────────────────────────────────

  const validate = (s) => {
    const e = {}
    if (s === 1) {
      if (!form.fullName.trim())    e.fullName    = 'Full name is required'
      if (!form.phone.trim())       e.phone       = 'Phone number is required'
      if (!form.dateOfBirth)        e.dateOfBirth = 'Date of birth is required'
      if (!form.gender)             e.gender      = 'Gender is required'
      if (!form.state)              e.state       = 'State is required'
      if (!form.lga.trim())         e.lga         = 'LGA is required'
      if (!form.city.trim())        e.city        = 'City is required'
      if (!form.homeAddress.trim()) e.homeAddress = 'Home address is required'
      if (!form.documents?.id_document) e.id_document = 'Government-issued ID is required'
    }
    if (s === 2) {
      if (!form.hospitalName.trim())       e.hospitalName    = 'Hospital name is required'
      if (!form.isPartnerSuggested && !form.hospitalPhone?.trim()) e.hospitalPhone = 'Hospital contact number is required'
      if (!form.treatmentCategory)         e.treatmentCategory = 'Treatment category is required'
      if (!form.healthDescription.trim())  e.healthDescription = 'Health description is required'
      if (!form.urgency)                   e.urgency = 'Urgency is required'
    }
    if (s === 3) {
      if (!form.employmentType) e.employmentType = 'Employment type is required'
      const needsEmployer = ['full_time_employed','part_time_employed','civil_servant'].includes(form.employmentType)
      if (needsEmployer && !form.employerName.trim()) e.employerName = 'Employer name is required'
      if (!form.monthlyExpenses && form.monthlyExpenses !== 0) e.monthlyExpenses = 'Monthly expenses is required'
      if (!form.estimatedCost)    e.estimatedCost    = 'Estimated treatment cost is required'
      if (!form.requestedAmount)  e.requestedAmount  = 'Requested amount is required'
      if (!form.preferredDuration) e.preferredDuration = 'Repayment duration is required'
      if (!form.repaymentMethod)  e.repaymentMethod  = 'Repayment method is required'
      if (['salary_deduction','bank_debit','bank_transfer'].includes(form.repaymentMethod)) {
        if (!form.repaymentBankName.trim())      e.repaymentBankName      = 'Bank name is required'
        if (!form.repaymentAccountNumber.trim()) e.repaymentAccountNumber = 'Account number is required'
      }
    }
    if (s === 4) {
      if (!form.guarantorName.trim())         e.guarantorName         = 'Guarantor name is required'
      if (!form.guarantorPhone.trim())        e.guarantorPhone        = 'Guarantor phone is required'
      if (!form.guarantorEmail.trim())        e.guarantorEmail        = 'Guarantor email is required'
      if (!form.guarantorBvn.trim())          e.guarantorBvn          = 'Guarantor BVN is required'
      if (!form.guarantorRelationship.trim()) e.guarantorRelationship = 'Relationship to patient is required'
    }
    if (s === 5) {
      if (!form.consentDataProcessing) e.consentDataProcessing = 'Patient must consent to data processing'
      if (!form.consentTerms)          e.consentTerms          = 'Patient must accept terms & conditions'
    }
    return e
  }

  const next = () => {
    const e = validate(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setStep(s => s + 1)
  }

  const back = () => setStep(s => s - 1)

  // ── Submit ──────────────────────────────────────────────────────────────────

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e5 = validate(5)
    if (Object.keys(e5).length) { setErrors(e5); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        fullName:    form.fullName.trim(),
        phone:       form.phone.trim(),
        ...(form.email.trim()      ? { email: form.email.trim() }      : {}),
        ...(form.bvn.trim()        ? { bvn: form.bvn.trim() }          : {}),
        ...(form.nin.trim()        ? { nin: form.nin.trim() }          : {}),
        ...(form.dateOfBirth       ? { dateOfBirth: form.dateOfBirth } : {}),
        ...(form.gender            ? { gender: form.gender }           : {}),
        state:       form.state,
        lga:         form.lga.trim(),
        city:        form.city.trim(),
        homeAddress: form.homeAddress.trim(),
        documents:   form.documents,
        ...(form.applicantPhoto ? { applicantPhoto: form.applicantPhoto } : {}),
        hospitalName:        form.hospitalName.trim(),
        ...(form.hospitalAddress.trim() ? { hospitalAddress: form.hospitalAddress.trim() } : {}),
        ...(form.hospitalPhone.trim()   ? { hospitalPhone: form.hospitalPhone.trim() }   : {}),
        ...(form.hospitalEmail.trim()   ? { hospitalEmail: form.hospitalEmail.trim() }   : {}),
        isPartnerSuggested:  form.isPartnerSuggested,
        ...(form.suggestedHospitalId    ? { suggestedHospitalId: form.suggestedHospitalId } : {}),
        treatmentCategory:  form.treatmentCategory,
        ...(form.procedureOrService.trim() ? { procedureOrService: form.procedureOrService.trim() } : {}),
        healthDescription: form.healthDescription.trim(),
        urgency:           form.urgency,
        employmentType:    form.employmentType,
        ...(form.employmentSector.trim() ? { employmentSector: form.employmentSector.trim() } : {}),
        ...(form.employerName.trim()     ? { employerName: form.employerName.trim() }         : {}),
        ...(form.jobTitle.trim()         ? { jobTitle: form.jobTitle.trim() }                 : {}),
        ...(form.employmentDuration      ? { employmentDuration: form.employmentDuration }    : {}),
        salaryFrequency:   form.salaryFrequency,
        ...(form.monthlyIncome           ? { monthlyIncome: Number(form.monthlyIncome) }      : {}),
        monthlyExpenses:   Number(form.monthlyExpenses),
        estimatedCost:     Number(form.estimatedCost),
        requestedAmount:   Number(form.requestedAmount),
        preferredDuration: Number(form.preferredDuration),
        repaymentMethod:   form.repaymentMethod,
        ...(form.repaymentBankName.trim()      ? { repaymentBankName: form.repaymentBankName.trim() }           : {}),
        ...(form.repaymentAccountNumber.trim() ? { repaymentAccountNumber: form.repaymentAccountNumber.trim() } : {}),
        hasActiveLoans: form.hasActiveLoans,
        ...(form.hasActiveLoans && form.activeLoansMonthlyRepayment ? { activeLoansMonthlyRepayment: Number(form.activeLoansMonthlyRepayment) } : {}),
        guarantorName:             form.guarantorName.trim(),
        guarantorPhone:            form.guarantorPhone.trim(),
        guarantorEmail:            form.guarantorEmail.trim(),
        guarantorBvn:              form.guarantorBvn.trim(),
        guarantorRelationship:     form.guarantorRelationship.trim(),
        ...(form.guarantorEmploymentSector ? { guarantorEmploymentSector: form.guarantorEmploymentSector } : {}),
        ...(form.guarantorEmployerName.trim() ? { guarantorEmployerName: form.guarantorEmployerName.trim() } : {}),
        ...(form.guarantorMonthlyIncome ? { guarantorMonthlyIncome: Number(form.guarantorMonthlyIncome) } : {}),
        guarantor: {
          fullName: form.guarantorName.trim(),
          phone:    form.guarantorPhone.trim(),
          email:    form.guarantorEmail.trim(),
          bvn:      form.guarantorBvn.trim(),
        },
        consentDataProcessing: form.consentDataProcessing,
        consentTerms:          form.consentTerms,
        consentMarketing:      form.consentMarketing,
      }
      const result = await providerAuthService.registerPatient(payload)
      setSuccess(result)
    } catch (err) {
      if (err?.message?.includes('Session expired')) { onSessionExpired(); return }
      setSubmitError(err?.message || 'Registration failed. Please try again.')
    } finally {
      setSubmitting(false)
    }
  }

  // ── Cloudinary upload helpers ───────────────────────────────────────────────

  const handleFileUpload = async (file, folder, docKey, setUploading) => {
    setUploading(true)
    try {
      const uploaded = await uploadFileToCloudinary(file, { folder })
      setForm(p => ({
        ...p,
        documents: {
          ...p.documents,
          [docKey]: { fileName: uploaded.fileName, fileSize: uploaded.fileSize, mimeType: uploaded.mimeType, url: uploaded.url, storageKey: uploaded.storageKey },
        },
      }))
      setErrors(p => ({ ...p, [docKey]: '' }))
    } catch (err) {
      setErrors(p => ({ ...p, [docKey]: err.message || 'Upload failed' }))
    } finally {
      setUploading(false)
    }
  }

  const handlePhotoUpload = async (file) => {
    setUploadingPhoto(true)
    try {
      const uploaded = await uploadFileToCloudinary(file, { folder: 'carecova/applicant-photos' })
      setField('applicantPhoto', { fileName: uploaded.fileName, fileSize: uploaded.fileSize, mimeType: uploaded.mimeType, url: uploaded.url, storageKey: uploaded.storageKey })
    } catch (err) {
      setErrors(p => ({ ...p, applicantPhoto: err.message || 'Upload failed' }))
    } finally {
      setUploadingPhoto(false)
    }
  }

  // ── Success screen ──────────────────────────────────────────────────────────

  if (success) {
    return (
      <div className="cc-register-success">
        <div className="cc-register-success-icon">
          <CheckCircle size={32} />
        </div>
        <h2>Patient Registered!</h2>
        <p>The loan application has been submitted to the CareCova sales queue.</p>
        <p className="app-id">
          Application ID: <strong style={{ color: 'var(--color-text-secondary)' }}>{success.applicationId}</strong>
        </p>
        <div className="cc-register-success-actions">
          <button
            onClick={() => { setForm(EMPTY); setStep(1); setSuccess(null); setDobDay(''); setDobMonth(''); setDobYear('') }}
            className="button button--secondary"
          >
            Register Another
          </button>
          <button onClick={() => navigate('/provider/patients')} className="button button--primary">
            View Patients
          </button>
        </div>
      </div>
    )
  }

  // ── Step bar ────────────────────────────────────────────────────────────────

  const StepBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', marginBottom: '28px', overflowX: 'auto' }}>
      {STEPS.map((s, i) => (
        <div key={s.num} style={{ display: 'flex', alignItems: 'center', flex: i < STEPS.length - 1 ? '1' : undefined }}>
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', flexShrink: 0 }}>
            <div style={{
              width: '28px', height: '28px', borderRadius: '50%', fontSize: '0.8125rem', fontWeight: 700,
              display: 'flex', alignItems: 'center', justifyContent: 'center',
              background: step > s.num ? '#059669' : step === s.num ? '#2563eb' : '#e5e7eb',
              color: step >= s.num ? '#fff' : '#9ca3af',
            }}>
              {step > s.num ? <CheckCircle size={14} /> : s.num}
            </div>
            <span style={{ fontSize: '0.8125rem', fontWeight: step === s.num ? 600 : 400, color: step === s.num ? '#111827' : '#9ca3af', whiteSpace: 'nowrap' }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{ flex: 1, height: '2px', margin: '0 10px', background: step > s.num ? '#059669' : '#e5e7eb' }} />
          )}
        </div>
      ))}
    </div>
  )

  const fieldStyle = (k) => ({ ...fieldBase, borderColor: errors[k] ? '#fca5a5' : '#e2e8f0' })

  // Derived repayment methods based on employment type
  const sector = sectorFromType(form.employmentType)
  const availableRepaymentMethods = sector === 'government'
    ? [{ value: 'salary_deduction', label: 'Salary Deduction' }, { value: 'bank_debit', label: 'Bank Debit' }, { value: 'card_debit', label: 'Card / Payment Card' }]
    : sector === 'private'
    ? [{ value: 'bank_debit', label: 'Bank Debit' }, { value: 'card_debit', label: 'Card / Payment Card' }]
    : [{ value: 'bank_debit', label: 'Bank Debit' }, { value: 'card_debit', label: 'Card / Payment Card' }, { value: 'bank_transfer', label: 'Bank Transfer' }]

  const needsEmployer = ['full_time_employed', 'part_time_employed', 'civil_servant'].includes(form.employmentType)
  const needsRepaymentBank = ['salary_deduction', 'bank_debit', 'bank_transfer'].includes(form.repaymentMethod)

  // Dynamic city/LGA options
  const cityOptions   = form.state ? STATE_CITIES[form.state]   : null
  const lgaOptions    = form.state ? STATE_LGAS[form.state]     : null

  // ── Render ──────────────────────────────────────────────────────────────────

  return (
    <div className="admin-page" style={{ maxWidth: 720 }}>
      <div className="admin-page-header" style={{ marginBottom: 24 }}>
        <div>
          <h1>Register New Patient</h1>
          <p>Submit a healthcare financing application on behalf of your patient</p>
        </div>
      </div>

      <div className="cc-step-form-card">
        <StepBar />

        <form onSubmit={handleSubmit}>

          {/* ── Step 1: Patient Info ───────────────────────────────────────── */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Name + Phone */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Full Name" req>
                  <input name="fullName" value={form.fullName} onChange={set} placeholder="e.g. Adaeze Okafor" style={fieldStyle('fullName')} />
                  <ErrMsg text={errors.fullName} />
                </Field>
                <Field lbl="Phone Number" req>
                  <input name="phone" value={form.phone} onChange={set} placeholder="08012345678" style={fieldStyle('phone')} />
                  <ErrMsg text={errors.phone} />
                </Field>
              </div>

              {/* Email + Gender */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Email Address">
                  <input name="email" type="email" value={form.email} onChange={set} placeholder="patient@example.com" style={fieldStyle('email')} />
                </Field>
                <Field lbl="Gender" req>
                  <select name="gender" value={form.gender} onChange={set} style={{ ...fieldStyle('gender'), cursor: 'pointer' }}>
                    <option value="">Select gender…</option>
                    {GENDER_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ErrMsg text={errors.gender} />
                </Field>
              </div>

              {/* Date of birth */}
              <Field lbl="Date of Birth" req>
                <div style={{ display: 'flex', gap: '8px' }}>
                  <select value={dobDay} onChange={e => handleDobChange('day', e.target.value)} style={{ ...fieldStyle('dateOfBirth'), flex: 1 }}>
                    {DAY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select value={dobMonth} onChange={e => handleDobChange('month', e.target.value)} style={{ ...fieldStyle('dateOfBirth'), flex: 2 }}>
                    {MONTH_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <select value={dobYear} onChange={e => handleDobChange('year', e.target.value)} style={{ ...fieldStyle('dateOfBirth'), flex: 1.5 }}>
                    {YEAR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </div>
                <ErrMsg text={errors.dateOfBirth} />
              </Field>

              {/* Address section */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Home Address
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <Field lbl="State" req>
                    <select value={form.state} onChange={handleStateChange} style={{ ...fieldStyle('state'), cursor: 'pointer' }}>
                      <option value="">Select state…</option>
                      {NIGERIAN_STATES.map(s => <option key={s} value={s}>{s}</option>)}
                    </select>
                    <ErrMsg text={errors.state} />
                  </Field>

                  <Field lbl="City / Town" req>
                    {cityOptions ? (
                      <select name="city" value={form.city} onChange={set} style={{ ...fieldStyle('city'), cursor: 'pointer' }}>
                        <option value="">{form.state ? 'Select city' : 'Select state first'}</option>
                        {cityOptions.map(c => <option key={c} value={c}>{c}</option>)}
                      </select>
                    ) : (
                      <input name="city" value={form.city} onChange={set} placeholder="e.g. Ikeja" style={fieldStyle('city')} />
                    )}
                    <ErrMsg text={errors.city} />
                  </Field>

                  <Field lbl="LGA" req>
                    {lgaOptions ? (
                      <select name="lga" value={form.lga} onChange={set} style={{ ...fieldStyle('lga'), cursor: 'pointer' }}>
                        <option value="">{form.state ? 'Select LGA' : 'Select state first'}</option>
                        {lgaOptions.map(l => <option key={l} value={l}>{l}</option>)}
                      </select>
                    ) : (
                      <input name="lga" value={form.lga} onChange={set} placeholder="e.g. Ikeja" style={fieldStyle('lga')} />
                    )}
                    <ErrMsg text={errors.lga} />
                  </Field>
                </div>
                <Field lbl="Street Address" req>
                  <input name="homeAddress" value={form.homeAddress} onChange={set} placeholder="12 Allen Avenue, Ikeja" style={fieldStyle('homeAddress')} />
                  <ErrMsg text={errors.homeAddress} />
                </Field>
              </div>

              {/* Identity section */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Identity Verification
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <Field lbl="BVN (optional — encrypted at rest)">
                    <input name="bvn" value={form.bvn} onChange={e => setField('bvn', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11-digit BVN" maxLength={11} style={fieldBase} />
                  </Field>
                  <Field lbl="NIN (optional)">
                    <input name="nin" value={form.nin} onChange={set} placeholder="National Identity Number" style={fieldBase} />
                  </Field>
                </div>

                {/* Government ID upload */}
                <Field lbl="Government-issued ID" req hint="NIN slip, National ID, Voter's card, International passport or Driver's licence. PDF, JPG or PNG.">
                  {form.documents?.id_document ? (
                    <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px' }}>
                      <span style={{ fontSize: '0.875rem', color: '#166534', flex: 1 }}>{form.documents.id_document.fileName}</span>
                      <button type="button" onClick={() => setForm(p => ({ ...p, documents: { ...p.documents, id_document: null } }))} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>Remove</button>
                    </div>
                  ) : (
                    <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={uploadingId}
                      style={{ marginTop: '6px', display: 'block' }}
                      onChange={async e => { const f = e.target.files?.[0]; if (!f) return; await handleFileUpload(f, 'carecova/id-documents', 'id_document', setUploadingId); e.target.value = '' }}
                    />
                  )}
                  {uploadingId && <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginTop: '4px' }}>Uploading…</span>}
                  <ErrMsg text={errors.id_document} />
                </Field>

                {/* Patient photo */}
                <div style={{ marginTop: '16px' }}>
                  <Field lbl="Patient Photo (optional)" hint="A clear photo of the patient's face for identity verification.">
                    {form.applicantPhoto?.url ? (
                      <div style={{ marginTop: '8px', display: 'flex', alignItems: 'center', gap: '12px' }}>
                        <img src={form.applicantPhoto.url} alt="Patient" style={{ width: 64, height: 64, borderRadius: '50%', objectFit: 'cover', border: '2px solid #e5e7eb' }} />
                        <div>
                          <div style={{ fontSize: '0.875rem', color: '#374151' }}>{form.applicantPhoto.fileName}</div>
                          <button type="button" onClick={() => setField('applicantPhoto', null)} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem', marginTop: '4px' }}>Remove photo</button>
                        </div>
                      </div>
                    ) : (
                      <input type="file" accept="image/*" disabled={uploadingPhoto}
                        style={{ marginTop: '6px', display: 'block' }}
                        onChange={async e => { const f = e.target.files?.[0]; if (!f) return; await handlePhotoUpload(f); e.target.value = '' }}
                      />
                    )}
                    {uploadingPhoto && <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginTop: '4px' }}>Uploading photo…</span>}
                  </Field>
                </div>
              </div>
            </div>
          )}

          {/* ── Step 2: Medical Details ────────────────────────────────────── */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              {/* Hospital picker */}
              <div>
                <p style={{ margin: '0 0 10px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Hospital / Clinic
                </p>
                <div style={{ display: 'flex', gap: '8px', marginBottom: '12px' }}>
                  {['select', 'custom'].map(mode => (
                    <button
                      key={mode}
                      type="button"
                      onClick={() => {
                        setHospitalMode(mode)
                        setHospitalSearch('')
                        setShowHospitalDropdown(false)
                        if (mode === 'custom') { setField('suggestedHospitalId', ''); setField('isPartnerSuggested', false); setField('hospitalName', '') }
                      }}
                      style={{
                        padding: '7px 14px', borderRadius: '8px', fontSize: '0.8125rem', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                        borderColor: hospitalMode === mode ? '#2563eb' : '#e2e8f0',
                        background: hospitalMode === mode ? '#eff6ff' : '#fff',
                        color: hospitalMode === mode ? '#2563eb' : '#6b7280',
                      }}
                    >
                      {mode === 'select' ? 'Select from CareCova network' : 'Enter hospital manually'}
                    </button>
                  ))}
                </div>

                {hospitalMode === 'select' ? (
                  <div>
                    <label style={labelStyle}>Hospital / Clinic name {required}</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder="Search by name…"
                        value={hospitalSearch || form.hospitalName}
                        onFocus={() => { setHospitalSearch(form.hospitalName || ''); setShowHospitalDropdown(true) }}
                        onChange={e => {
                          setHospitalSearch(e.target.value)
                          setShowHospitalDropdown(true)
                          if (!e.target.value) { setField('hospitalName', ''); setField('suggestedHospitalId', ''); setField('isPartnerSuggested', false) }
                        }}
                        onBlur={() => setTimeout(() => setShowHospitalDropdown(false), 180)}
                        style={{ ...fieldStyle('hospitalName'), width: '100%' }}
                      />
                      {showHospitalDropdown && (
                        <div style={{ position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50, background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px', boxShadow: '0 8px 24px rgba(0,0,0,0.10)', maxHeight: '240px', overflowY: 'auto' }}>
                          {providerListLoading ? (
                            <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '0.875rem' }}>Loading facilities…</div>
                          ) : (() => {
                            const term = (hospitalSearch || '').toLowerCase()
                            const filtered = providerList.filter(p => !term || (p.name || '').toLowerCase().includes(term))
                            if (!filtered.length) return (
                              <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '0.875rem' }}>
                                No matching facilities.{' '}
                                <button type="button" onClick={() => { setHospitalMode('custom'); setField('hospitalName', hospitalSearch); setShowHospitalDropdown(false) }}
                                  style={{ color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.875rem' }}>
                                  Enter "{hospitalSearch}" manually
                                </button>
                              </div>
                            )
                            return filtered.map(p => {
                              const pid = p.id || p._id
                              return (
                                <div key={pid} onMouseDown={() => {
                                  setField('hospitalName', p.name)
                                  setField('hospitalAddress', p.address || '')
                                  setField('suggestedHospitalId', pid)
                                  setField('isPartnerSuggested', true)
                                  setHospitalSearch('')
                                  setShowHospitalDropdown(false)
                                  setErrors(prev => ({ ...prev, hospitalName: '' }))
                                }}
                                  style={{ padding: '10px 16px', cursor: 'pointer', borderBottom: '1px solid #f3f4f6', background: form.suggestedHospitalId === pid ? '#eff6ff' : 'transparent' }}>
                                  <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{p.name}</div>
                                  {(p.address || p.type) && <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>{[p.type, p.address].filter(Boolean).join(' · ')}</div>}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </div>
                    {form.hospitalName && !showHospitalDropdown && (
                      <div style={{ marginTop: '8px', padding: '8px 12px', borderRadius: '7px', background: '#f0fdf4', border: '1px solid #bbf7d0', display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534' }}>{form.hospitalName}</div>
                          {form.hospitalAddress && <div style={{ fontSize: '0.8rem', color: '#4ade80' }}>{form.hospitalAddress}</div>}
                          {form.isPartnerSuggested && <span style={{ fontSize: '0.75rem', background: '#bbf7d0', color: '#166534', padding: '1px 7px', borderRadius: '8px', fontWeight: 600 }}>CareCova Network</span>}
                        </div>
                        <button type="button" onClick={() => { setField('hospitalName', ''); setField('hospitalAddress', ''); setField('suggestedHospitalId', ''); setField('isPartnerSuggested', false); setHospitalSearch('') }}
                          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>Change</button>
                      </div>
                    )}
                    <ErrMsg text={errors.hospitalName} />
                  </div>
                ) : (
                  <div>
                    <div style={{ marginBottom: '12px', padding: '10px 14px', borderRadius: '8px', background: '#fefce8', border: '1px solid #fde68a', fontSize: '0.8125rem', color: '#92400e' }}>
                      Your hospital isn't on our partner list yet — fill in the details below and we'll reach out to establish a partnership.
                    </div>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                      <Field lbl="Hospital / Clinic name" req>
                        <input name="hospitalName" value={form.hospitalName} onChange={set} placeholder="e.g. City Medical Centre" style={fieldStyle('hospitalName')} />
                        <ErrMsg text={errors.hospitalName} />
                      </Field>
                      <Field lbl="Hospital contact number" req>
                        <input name="hospitalPhone" value={form.hospitalPhone} onChange={e => setField('hospitalPhone', e.target.value.replace(/[^\d+\s\-()]/g, ''))} placeholder="e.g. 08012345678" style={fieldStyle('hospitalPhone')} />
                        <ErrMsg text={errors.hospitalPhone} />
                      </Field>
                      <Field lbl="Hospital area / address (optional)">
                        <input name="hospitalAddress" value={form.hospitalAddress} onChange={set} placeholder="Street, area or city" style={fieldBase} />
                      </Field>
                      <Field lbl="Hospital email (optional)">
                        <input name="hospitalEmail" type="email" value={form.hospitalEmail} onChange={set} placeholder="hospital@example.com" style={fieldBase} />
                      </Field>
                    </div>
                  </div>
                )}
              </div>

              {/* Treatment info */}
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Treatment Category" req>
                  <select name="treatmentCategory" value={form.treatmentCategory} onChange={set} style={{ ...fieldStyle('treatmentCategory'), cursor: 'pointer' }}>
                    <option value="">Select category…</option>
                    {TREATMENT_CATEGORIES.map(c => <option key={c} value={c}>{c}</option>)}
                  </select>
                  <ErrMsg text={errors.treatmentCategory} />
                </Field>
                <Field lbl="Procedure / Service (optional)">
                  <input name="procedureOrService" value={form.procedureOrService} onChange={set} placeholder="e.g. Root canal, cataract surgery" style={fieldBase} />
                </Field>
              </div>

              <Field lbl="Health Description" req hint="Briefly describe the patient's condition and why this treatment is needed.">
                <textarea name="healthDescription" value={form.healthDescription} onChange={set} rows={3}
                  placeholder="Describe the patient's condition and treatment need…"
                  style={{ ...fieldStyle('healthDescription'), resize: 'vertical' }}
                />
                <ErrMsg text={errors.healthDescription} />
              </Field>

              <Field lbl="Urgency" req>
                <select name="urgency" value={form.urgency} onChange={set} style={{ ...fieldStyle('urgency'), cursor: 'pointer' }}>
                  <option value="">Select urgency…</option>
                  {URGENCY_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                </select>
                <ErrMsg text={errors.urgency} />
              </Field>

              {/* Treatment estimate upload */}
              <Field lbl="Hospital treatment estimate / quote (optional)" hint="Upload the cost estimate or quote from the hospital. PDF, JPG or PNG.">
                {form.documents?.treatment_estimate ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px' }}>
                    <span style={{ fontSize: '0.875rem', color: '#166534', flex: 1 }}>{form.documents.treatment_estimate.fileName}</span>
                    <button type="button" onClick={() => setForm(p => ({ ...p, documents: { ...p.documents, treatment_estimate: null } }))} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                  </div>
                ) : (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={uploadingEstimate}
                    style={{ marginTop: '6px', display: 'block' }}
                    onChange={async e => { const f = e.target.files?.[0]; if (!f) return; await handleFileUpload(f, 'carecova/treatment-estimates', 'treatment_estimate', setUploadingEstimate); e.target.value = '' }}
                  />
                )}
                {uploadingEstimate && <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginTop: '4px' }}>Uploading estimate…</span>}
                {errors.treatment_estimate && <ErrMsg text={errors.treatment_estimate} />}
              </Field>
            </div>
          )}

          {/* ── Step 3: Financial Info ────────────────────────────────────── */}
          {step === 3 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Employment Type" req>
                  <select name="employmentType" value={form.employmentType} onChange={set} style={{ ...fieldStyle('employmentType'), cursor: 'pointer' }}>
                    <option value="">Select…</option>
                    {EMPLOYMENT_TYPES.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ErrMsg text={errors.employmentType} />
                </Field>
                <Field lbl="Employment Sector (optional)">
                  <input name="employmentSector" value={form.employmentSector} onChange={set} placeholder="e.g. Healthcare, Finance, Education" style={fieldBase} />
                </Field>
              </div>

              {needsEmployer && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field lbl="Employer Name" req>
                    <input name="employerName" value={form.employerName} onChange={set} placeholder="e.g. Lagos State Government" style={fieldStyle('employerName')} />
                    <ErrMsg text={errors.employerName} />
                  </Field>
                  <Field lbl="Job Title (optional)">
                    <input name="jobTitle" value={form.jobTitle} onChange={set} placeholder="e.g. Senior Nurse" style={fieldBase} />
                  </Field>
                </div>
              )}

              {(needsEmployer || form.employmentType === 'self_employed') && (
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field lbl="How long in current employment?">
                    <select name="employmentDuration" value={form.employmentDuration} onChange={set} style={{ ...fieldBase, cursor: 'pointer' }}>
                      <option value="">Select duration…</option>
                      {EMPLOYMENT_DURATION_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                    </select>
                  </Field>
                  <Field lbl="Salary Frequency">
                    <select name="salaryFrequency" value={form.salaryFrequency} onChange={set} style={{ ...fieldBase, cursor: 'pointer' }}>
                      <option value="monthly">Monthly</option>
                      <option value="weekly">Weekly</option>
                    </select>
                  </Field>
                </div>
              )}

              {sector === 'government' && (
                <div style={{ padding: '10px 14px', background: '#f0fdf4', borderRadius: '8px', fontSize: '0.8125rem', color: '#166534', fontWeight: 600 }}>
                  Policy: Salary deduction → Bank debit → Card fallback
                </div>
              )}
              {sector === 'private' && (
                <div style={{ padding: '10px 14px', background: '#eff6ff', borderRadius: '8px', fontSize: '0.8125rem', color: '#1d4ed8', fontWeight: 600 }}>
                  Policy: Bank debit → Card fallback (Guarantor recommended)
                </div>
              )}

              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Monthly Income (₦) (optional)">
                  <input name="monthlyIncome" type="number" min="0" value={form.monthlyIncome} onChange={set} placeholder="0" style={fieldBase} />
                </Field>
                <Field lbl="Monthly Expenses (₦)" req>
                  <input name="monthlyExpenses" type="number" min="0" value={form.monthlyExpenses} onChange={set} placeholder="0" style={fieldStyle('monthlyExpenses')} />
                  <ErrMsg text={errors.monthlyExpenses} />
                </Field>
              </div>

              {/* Payslip upload */}
              <Field lbl="Pay Slip (optional)" hint="Most recent pay slip for income verification. PDF, JPG or PNG.">
                {form.documents?.payslip ? (
                  <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginTop: '6px', padding: '8px 12px', background: '#f0fdf4', border: '1px solid #bbf7d0', borderRadius: '7px' }}>
                    <span style={{ fontSize: '0.875rem', color: '#166534', flex: 1 }}>{form.documents.payslip.fileName}</span>
                    <button type="button" onClick={() => setForm(p => ({ ...p, documents: { ...p.documents, payslip: null } }))} style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem' }}>Remove</button>
                  </div>
                ) : (
                  <input type="file" accept=".pdf,.jpg,.jpeg,.png" disabled={uploadingPayslip}
                    style={{ marginTop: '6px', display: 'block' }}
                    onChange={async e => { const f = e.target.files?.[0]; if (!f) return; await handleFileUpload(f, 'carecova/payslips', 'payslip', setUploadingPayslip); e.target.value = '' }}
                  />
                )}
                {uploadingPayslip && <span style={{ fontSize: '0.8rem', color: '#6b7280', display: 'block', marginTop: '4px' }}>Uploading pay slip…</span>}
              </Field>

              {/* Credit request */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Credit Request</p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                  <Field lbl="Estimated Treatment Cost (₦)" req>
                    <input name="estimatedCost" type="number" min="1" value={form.estimatedCost} onChange={set} placeholder="e.g. 150000" style={fieldStyle('estimatedCost')} />
                    <ErrMsg text={errors.estimatedCost} />
                  </Field>
                  <Field lbl="Loan Amount Requested (₦)" req>
                    <input name="requestedAmount" type="number" min="1" value={form.requestedAmount} onChange={set} placeholder="e.g. 120000" style={fieldStyle('requestedAmount')} />
                    <ErrMsg text={errors.requestedAmount} />
                  </Field>
                </div>
                <div style={{ marginTop: '16px' }}>
                  <Field lbl="Repayment Duration" req>
                    <select name="preferredDuration" value={form.preferredDuration} onChange={set} style={{ ...fieldStyle('preferredDuration'), cursor: 'pointer' }}>
                      {[1, 2, 3, 6, 9, 12, 18, 24].map(m => <option key={m} value={m}>{m} month{m !== 1 ? 's' : ''}</option>)}
                    </select>
                    <ErrMsg text={errors.preferredDuration} />
                  </Field>
                </div>
              </div>

              {/* Repayment */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>Repayment Preferences</p>
                <Field lbl="Preferred Repayment Method" req>
                  <select name="repaymentMethod" value={form.repaymentMethod} onChange={set} style={{ ...fieldStyle('repaymentMethod'), cursor: 'pointer' }}>
                    <option value="">Select method…</option>
                    {availableRepaymentMethods.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  <ErrMsg text={errors.repaymentMethod} />
                </Field>

                {needsRepaymentBank && (
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginTop: '16px' }}>
                    <Field lbl="Repayment Bank Name" req>
                      <input name="repaymentBankName" value={form.repaymentBankName} onChange={set} placeholder="e.g. Access Bank" style={fieldStyle('repaymentBankName')} />
                      <ErrMsg text={errors.repaymentBankName} />
                    </Field>
                    <Field lbl="Repayment Account Number" req>
                      <input name="repaymentAccountNumber" inputMode="numeric" value={form.repaymentAccountNumber} onChange={e => setField('repaymentAccountNumber', e.target.value.replace(/\D/g, '').slice(0, 10))} placeholder="10 digits" style={fieldStyle('repaymentAccountNumber')} />
                      <ErrMsg text={errors.repaymentAccountNumber} />
                    </Field>
                  </div>
                )}
              </div>

              {/* Active loans */}
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <label style={labelStyle}>Does the patient currently have any active loans?</label>
                <div style={{ display: 'flex', gap: '8px', marginTop: '6px' }}>
                  {[{ v: true, l: 'Yes' }, { v: false, l: 'No' }].map(({ v, l }) => (
                    <button key={l} type="button" onClick={() => setField('hasActiveLoans', v)}
                      style={{
                        padding: '7px 20px', borderRadius: '8px', border: '1.5px solid', cursor: 'pointer', fontSize: '0.875rem', fontWeight: 600,
                        borderColor: form.hasActiveLoans === v ? '#2563eb' : '#e2e8f0',
                        background: form.hasActiveLoans === v ? '#eff6ff' : '#fff',
                        color: form.hasActiveLoans === v ? '#2563eb' : '#6b7280',
                      }}
                    >{l}</button>
                  ))}
                </div>
                {form.hasActiveLoans && (
                  <div style={{ marginTop: '12px' }}>
                    <Field lbl="Total Monthly Loan Repayment (₦)" req>
                      <input name="activeLoansMonthlyRepayment" type="number" min="0" value={form.activeLoansMonthlyRepayment} onChange={set} placeholder="0" style={fieldStyle('activeLoansMonthlyRepayment')} />
                      <ErrMsg text={errors.activeLoansMonthlyRepayment} />
                    </Field>
                  </div>
                )}
              </div>
            </div>
          )}

          {/* ── Step 4: Guarantor ─────────────────────────────────────────── */}
          {step === 4 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ padding: '14px 16px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.875rem', color: '#1e40af' }}>
                A guarantor is required by our financing partner. Their details will be shared with the financier for credit review.
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Guarantor Full Name" req>
                  <input name="guarantorName" value={form.guarantorName} onChange={set} placeholder="Full name" style={fieldStyle('guarantorName')} />
                  <ErrMsg text={errors.guarantorName} />
                </Field>
                <Field lbl="Guarantor Phone" req>
                  <input name="guarantorPhone" type="tel" value={form.guarantorPhone} onChange={set} placeholder="08012345678" style={fieldStyle('guarantorPhone')} />
                  <ErrMsg text={errors.guarantorPhone} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Guarantor Email" req>
                  <input name="guarantorEmail" type="email" value={form.guarantorEmail} onChange={set} placeholder="guarantor@example.com" style={fieldStyle('guarantorEmail')} />
                  <ErrMsg text={errors.guarantorEmail} />
                </Field>
                <Field lbl="Guarantor BVN" req hint="Required by our financing partner for credit verification.">
                  <input name="guarantorBvn" inputMode="numeric" maxLength={11} value={form.guarantorBvn} onChange={e => setField('guarantorBvn', e.target.value.replace(/\D/g, '').slice(0, 11))} placeholder="11 digits" style={fieldStyle('guarantorBvn')} />
                  <ErrMsg text={errors.guarantorBvn} />
                </Field>
              </div>
              <Field lbl="Relationship to Patient" req>
                <input name="guarantorRelationship" value={form.guarantorRelationship} onChange={set} placeholder="e.g. Spouse, Sibling, Parent, Friend" style={fieldStyle('guarantorRelationship')} />
                <ErrMsg text={errors.guarantorRelationship} />
              </Field>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '14px', display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <Field lbl="Employment Sector (optional)">
                  <select name="guarantorEmploymentSector" value={form.guarantorEmploymentSector} onChange={set} style={{ ...fieldBase, cursor: 'pointer' }}>
                    <option value="">Select…</option>
                    {EMPLOYMENT_SECTOR_OPTIONS.map(o => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                </Field>
                <Field lbl="Employer Name (optional)">
                  <input name="guarantorEmployerName" value={form.guarantorEmployerName} onChange={set} placeholder="e.g. Zenith Bank" style={fieldBase} />
                </Field>
                <Field lbl="Monthly Income (₦) (optional)">
                  <input name="guarantorMonthlyIncome" type="number" min="0" value={form.guarantorMonthlyIncome} onChange={set} placeholder="0" style={fieldBase} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 5: Consent ───────────────────────────────────────────── */}
          {step === 5 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{ padding: '16px', borderRadius: '10px', background: '#eff6ff', border: '1px solid #bfdbfe', fontSize: '0.875rem', color: '#1e40af' }}>
                Please confirm that the patient has been informed about and has agreed to the following before submitting.
              </div>

              {[
                { name: 'consentDataProcessing', title: 'Data Processing Consent', req: true,  desc: 'The patient consents to CareCova collecting and processing their personal and financial data to assess and administer a medical loan.' },
                { name: 'consentTerms',           title: 'Terms & Conditions',      req: true,  desc: "The patient has read and accepted CareCova's terms and conditions and loan agreement." },
                { name: 'consentMarketing',       title: 'Marketing Communications (optional)', req: false, desc: 'The patient consents to receiving relevant health financing offers and updates from CareCova.' },
              ].map(c => (
                <label key={c.name} style={{
                  display: 'flex', gap: '14px', alignItems: 'flex-start', padding: '16px', borderRadius: '10px', cursor: 'pointer',
                  border: `1.5px solid ${errors[c.name] ? '#fca5a5' : form[c.name] ? '#86efac' : '#e5e7eb'}`,
                  background: form[c.name] ? '#f0fdf4' : '#fff',
                }}>
                  <input type="checkbox" name={c.name} checked={form[c.name]} onChange={set}
                    style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', marginBottom: '3px' }}>
                      {c.title}{c.req && <span style={{ color: '#dc2626' }}> *</span>}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5 }}>{c.desc}</div>
                    <ErrMsg text={errors[c.name]} />
                  </div>
                </label>
              ))}

              {submitError && (
                <div className="alert-box alert-error">
                  <AlertCircle size={16} style={{ flexShrink: 0 }} /> {submitError}
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ─────────────────────────────────────────────────── */}
          <div className="cc-step-nav">
            <button
              type="button"
              onClick={step === 1 ? () => navigate('/provider/patients') : back}
              className="button button--secondary"
            >
              <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 5 ? (
              <button type="button" onClick={next} className="button button--primary">
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button type="submit" disabled={submitting} className="button button--primary">
                <UserPlus size={16} />
                {submitting ? 'Submitting…' : 'Register Patient'}
              </button>
            )}
          </div>
        </form>
      </div>
    </div>
  )
}
