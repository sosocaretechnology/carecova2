import { useState } from 'react'
import { useNavigate } from 'react-router-dom'
import { CheckCircle, ChevronRight, ChevronLeft, UserPlus, AlertCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import { useSessionExpired } from '../../components/provider/ProviderLayout'

const NG_STATES = [
  'Abia','Adamawa','Akwa Ibom','Anambra','Bauchi','Bayelsa','Benue','Borno',
  'Cross River','Delta','Ebonyi','Edo','Ekiti','Enugu','FCT','Gombe','Imo',
  'Jigawa','Kaduna','Kano','Katsina','Kebbi','Kogi','Kwara','Lagos','Nasarawa',
  'Niger','Ogun','Ondo','Osun','Oyo','Plateau','Rivers','Sokoto','Taraba',
  'Yobe','Zamfara',
]

const TREATMENT_CATEGORIES = [
  'Dental','Eye Care','Fertility','General Surgery','Maternity','Mental Health',
  'Oncology','Ophthalmology','Orthopaedics','Physiotherapy','Radiology',
  'Renal Care','Dermatology','Cardiology','Other',
]

const EMPLOYMENT_TYPES = [
  { value: 'full_time_employed', label: 'Full-Time Employed' },
  { value: 'part_time_employed', label: 'Part-Time Employed' },
  { value: 'self_employed', label: 'Self-Employed' },
  { value: 'business_owner', label: 'Business Owner' },
  { value: 'civil_servant', label: 'Civil Servant' },
  { value: 'unemployed', label: 'Unemployed' },
  { value: 'retired', label: 'Retired' },
]

const REPAYMENT_METHODS = [
  { value: 'bank_transfer', label: 'Bank Transfer' },
  { value: 'direct_debit', label: 'Direct Debit' },
  { value: 'paystack', label: 'Card / Paystack' },
]

const URGENCY_OPTIONS = [
  { value: 'urgent', label: 'Urgent — within days' },
  { value: 'soon', label: 'Soon — within weeks' },
  { value: 'flexible', label: 'Flexible — within months' },
]

const STEPS = [
  { label: 'Patient Info', num: 1 },
  { label: 'Medical Details', num: 2 },
  { label: 'Financial Info', num: 3 },
  { label: 'Consent', num: 4 },
]

const EMPTY = {
  // Step 1
  fullName: '', phone: '', email: '', bvn: '',
  state: '', lga: '', city: '', homeAddress: '',
  // Step 2
  treatmentCategory: '', procedureOrService: '', healthDescription: '',
  urgency: 'soon', hospitalName: '',
  // Step 3
  employmentType: '', employmentSector: '', employerName: '',
  monthlyIncome: '', monthlyExpenses: '', requestedAmount: '',
  estimatedCost: '', preferredDuration: '6', repaymentMethod: 'bank_transfer',
  // Step 4
  consentDataProcessing: false, consentTerms: false, consentMarketing: false,
}

const field = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1.5px solid #e2e8f0', fontSize: '0.875rem', outline: 'none',
  background: '#fff', boxSizing: 'border-box',
}
const label = {
  display: 'block', fontSize: '0.8125rem', fontWeight: 500,
  color: '#374151', marginBottom: '5px',
}
const required = <span style={{ color: '#dc2626' }}> *</span>

function Field({ lbl, req, children }) {
  return (
    <div>
      <label style={label}>{lbl}{req && required}</label>
      {children}
    </div>
  )
}

export default function ProviderRegisterPatient() {
  const navigate = useNavigate()
  const onSessionExpired = useSessionExpired()
  const [step, setStep] = useState(1)
  const [form, setForm] = useState(EMPTY)
  const [errors, setErrors] = useState({})
  const [submitting, setSubmitting] = useState(false)
  const [submitError, setSubmitError] = useState('')
  const [success, setSuccess] = useState(null)

  const set = (e) => {
    const { name, value, type, checked } = e.target
    setForm((p) => ({ ...p, [name]: type === 'checkbox' ? checked : value }))
    setErrors((p) => ({ ...p, [name]: '' }))
  }

  // ── Validation per step ───────────────────────────────────────────────────

  const validate = (s) => {
    const e = {}
    if (s === 1) {
      if (!form.fullName.trim()) e.fullName = 'Full name is required'
      if (!form.phone.trim()) e.phone = 'Phone number is required'
      if (!form.state) e.state = 'State is required'
      if (!form.lga.trim()) e.lga = 'LGA is required'
      if (!form.city.trim()) e.city = 'City is required'
      if (!form.homeAddress.trim()) e.homeAddress = 'Home address is required'
    }
    if (s === 2) {
      if (!form.treatmentCategory) e.treatmentCategory = 'Treatment category is required'
      if (!form.healthDescription.trim()) e.healthDescription = 'Health description is required'
      if (!form.urgency) e.urgency = 'Urgency is required'
    }
    if (s === 3) {
      if (!form.employmentType) e.employmentType = 'Employment type is required'
      if (!form.monthlyExpenses && form.monthlyExpenses !== 0) e.monthlyExpenses = 'Monthly expenses is required'
      if (!form.requestedAmount) e.requestedAmount = 'Requested amount is required'
      if (!form.estimatedCost) e.estimatedCost = 'Estimated cost is required'
      if (!form.preferredDuration) e.preferredDuration = 'Duration is required'
      if (!form.repaymentMethod) e.repaymentMethod = 'Repayment method is required'
    }
    if (s === 4) {
      if (!form.consentDataProcessing) e.consentDataProcessing = 'Patient must consent to data processing'
      if (!form.consentTerms) e.consentTerms = 'Patient must accept terms & conditions'
    }
    return e
  }

  const next = () => {
    const e = validate(step)
    if (Object.keys(e).length) { setErrors(e); return }
    setStep((s) => s + 1)
  }

  const back = () => setStep((s) => s - 1)

  const handleSubmit = async (e) => {
    e.preventDefault()
    const e4 = validate(4)
    if (Object.keys(e4).length) { setErrors(e4); return }

    setSubmitting(true)
    setSubmitError('')
    try {
      const payload = {
        fullName: form.fullName.trim(),
        phone: form.phone.trim(),
        ...(form.email.trim() ? { email: form.email.trim() } : {}),
        ...(form.bvn.trim() ? { bvn: form.bvn.trim() } : {}),
        state: form.state,
        lga: form.lga.trim(),
        city: form.city.trim(),
        homeAddress: form.homeAddress.trim(),
        treatmentCategory: form.treatmentCategory,
        ...(form.procedureOrService.trim() ? { procedureOrService: form.procedureOrService.trim() } : {}),
        healthDescription: form.healthDescription.trim(),
        urgency: form.urgency,
        ...(form.hospitalName.trim() ? { hospitalName: form.hospitalName.trim() } : {}),
        employmentType: form.employmentType,
        ...(form.employmentSector.trim() ? { employmentSector: form.employmentSector.trim() } : {}),
        ...(form.employerName.trim() ? { employerName: form.employerName.trim() } : {}),
        ...(form.monthlyIncome ? { monthlyIncome: Number(form.monthlyIncome) } : {}),
        monthlyExpenses: Number(form.monthlyExpenses),
        requestedAmount: Number(form.requestedAmount),
        estimatedCost: Number(form.estimatedCost),
        preferredDuration: Number(form.preferredDuration),
        repaymentMethod: form.repaymentMethod,
        consentDataProcessing: form.consentDataProcessing,
        consentTerms: form.consentTerms,
        consentMarketing: form.consentMarketing,
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

  // ── Success screen ────────────────────────────────────────────────────────

  if (success) {
    return (
      <div style={{ maxWidth: '520px', margin: '0 auto', textAlign: 'center', padding: '48px 24px' }}>
        <div style={{
          width: '64px', height: '64px', borderRadius: '50%', background: '#d1fae5',
          display: 'flex', alignItems: 'center', justifyContent: 'center', margin: '0 auto 20px',
        }}>
          <CheckCircle size={32} color="#059669" />
        </div>
        <h2 style={{ margin: '0 0 8px', fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>
          Patient Registered!
        </h2>
        <p style={{ margin: '0 0 4px', fontSize: '0.9375rem', color: '#6b7280' }}>
          The loan application has been submitted to the CareCova sales queue.
        </p>
        <p style={{ margin: '0 0 28px', fontSize: '0.8125rem', color: '#9ca3af' }}>
          Application ID: <strong style={{ color: '#374151' }}>{success.applicationId}</strong>
        </p>
        <div style={{ display: 'flex', gap: '12px', justifyContent: 'center' }}>
          <button
            onClick={() => { setForm(EMPTY); setStep(1); setSuccess(null) }}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Register Another
          </button>
          <button
            onClick={() => navigate('/provider/patients')}
            style={{
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            View Patients
          </button>
        </div>
      </div>
    )
  }

  // ── Step indicator ────────────────────────────────────────────────────────

  const StepBar = () => (
    <div style={{ display: 'flex', alignItems: 'center', gap: 0, marginBottom: '28px' }}>
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
            <span style={{
              fontSize: '0.8125rem', fontWeight: step === s.num ? 600 : 400,
              color: step === s.num ? '#111827' : '#9ca3af',
              whiteSpace: 'nowrap',
            }}>
              {s.label}
            </span>
          </div>
          {i < STEPS.length - 1 && (
            <div style={{
              flex: 1, height: '2px', margin: '0 10px',
              background: step > s.num ? '#059669' : '#e5e7eb',
            }} />
          )}
        </div>
      ))}
    </div>
  )

  const err = (k) => errors[k] ? (
    <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px' }}>{errors[k]}</div>
  ) : null

  const inputStyle = (k) => ({ ...field, borderColor: errors[k] ? '#fca5a5' : '#e2e8f0' })

  // ── Form steps ────────────────────────────────────────────────────────────

  return (
    <div style={{ maxWidth: '720px' }}>
      <div style={{ marginBottom: '24px' }}>
        <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>Register New Patient</h2>
        <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
          Submit a loan application on behalf of your patient
        </p>
      </div>

      <div style={{
        background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb',
        padding: '28px', boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        <StepBar />

        <form onSubmit={handleSubmit}>
          {/* ── Step 1: Patient Info ── */}
          {step === 1 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Full Name" req>
                  <input name="fullName" value={form.fullName} onChange={set} placeholder="e.g. Adaeze Okafor" style={inputStyle('fullName')} />
                  {err('fullName')}
                </Field>
                <Field lbl="Phone Number" req>
                  <input name="phone" value={form.phone} onChange={set} placeholder="08012345678" style={inputStyle('phone')} />
                  {err('phone')}
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Email Address">
                  <input name="email" type="email" value={form.email} onChange={set} placeholder="patient@example.com" style={inputStyle('email')} />
                </Field>
                <Field lbl="BVN (optional — encrypted at rest)">
                  <input name="bvn" value={form.bvn} onChange={set} placeholder="••••••••••••" style={inputStyle('bvn')} />
                </Field>
              </div>
              <div style={{ borderTop: '1px solid #f3f4f6', paddingTop: '16px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.04em' }}>
                  Home Address
                </p>
                <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px', marginBottom: '16px' }}>
                  <Field lbl="State" req>
                    <select name="state" value={form.state} onChange={set} style={{ ...inputStyle('state'), cursor: 'pointer' }}>
                      <option value="">Select state…</option>
                      {NG_STATES.map((s) => <option key={s} value={s}>{s}</option>)}
                    </select>
                    {err('state')}
                  </Field>
                  <Field lbl="LGA" req>
                    <input name="lga" value={form.lga} onChange={set} placeholder="e.g. Ikeja" style={inputStyle('lga')} />
                    {err('lga')}
                  </Field>
                  <Field lbl="City" req>
                    <input name="city" value={form.city} onChange={set} placeholder="e.g. Ikeja" style={inputStyle('city')} />
                    {err('city')}
                  </Field>
                </div>
                <Field lbl="Street Address" req>
                  <input name="homeAddress" value={form.homeAddress} onChange={set} placeholder="12 Allen Avenue, Ikeja" style={inputStyle('homeAddress')} />
                  {err('homeAddress')}
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 2: Medical Details ── */}
          {step === 2 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Treatment Category" req>
                  <select name="treatmentCategory" value={form.treatmentCategory} onChange={set} style={{ ...inputStyle('treatmentCategory'), cursor: 'pointer' }}>
                    <option value="">Select category…</option>
                    {TREATMENT_CATEGORIES.map((c) => <option key={c} value={c}>{c}</option>)}
                  </select>
                  {err('treatmentCategory')}
                </Field>
                <Field lbl="Procedure / Service">
                  <input name="procedureOrService" value={form.procedureOrService} onChange={set} placeholder="e.g. Root canal, cataract surgery" style={field} />
                </Field>
              </div>
              <Field lbl="Health Description" req>
                <textarea
                  name="healthDescription" value={form.healthDescription} onChange={set}
                  placeholder="Briefly describe the patient's condition and why treatment is needed…"
                  rows={3}
                  style={{ ...inputStyle('healthDescription'), resize: 'vertical' }}
                />
                {err('healthDescription')}
              </Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Urgency" req>
                  <select name="urgency" value={form.urgency} onChange={set} style={{ ...inputStyle('urgency'), cursor: 'pointer' }}>
                    {URGENCY_OPTIONS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {err('urgency')}
                </Field>
                <Field lbl="Preferred Hospital (leave blank for any)">
                  <input name="hospitalName" value={form.hospitalName} onChange={set} placeholder="e.g. Lagos Island General Hospital" style={field} />
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 3: Financial Info ── */}
          {step === 3 && (
            <div style={{ display: 'grid', gap: '16px' }}>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Employment Type" req>
                  <select name="employmentType" value={form.employmentType} onChange={set} style={{ ...inputStyle('employmentType'), cursor: 'pointer' }}>
                    <option value="">Select…</option>
                    {EMPLOYMENT_TYPES.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {err('employmentType')}
                </Field>
                <Field lbl="Employment Sector">
                  <input name="employmentSector" value={form.employmentSector} onChange={set} placeholder="e.g. Healthcare, Finance" style={field} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Employer Name">
                  <input name="employerName" value={form.employerName} onChange={set} placeholder="e.g. Zenith Bank Plc" style={field} />
                </Field>
                <Field lbl="Monthly Income (₦)">
                  <input name="monthlyIncome" type="number" min="0" value={form.monthlyIncome} onChange={set} placeholder="0" style={field} />
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                <Field lbl="Monthly Expenses (₦)" req>
                  <input name="monthlyExpenses" type="number" min="0" value={form.monthlyExpenses} onChange={set} placeholder="0" style={inputStyle('monthlyExpenses')} />
                  {err('monthlyExpenses')}
                </Field>
                <Field lbl="Estimated Treatment Cost (₦)" req>
                  <input name="estimatedCost" type="number" min="1" value={form.estimatedCost} onChange={set} placeholder="e.g. 150000" style={inputStyle('estimatedCost')} />
                  {err('estimatedCost')}
                </Field>
              </div>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr 1fr', gap: '16px' }}>
                <Field lbl="Loan Amount Requested (₦)" req>
                  <input name="requestedAmount" type="number" min="1" value={form.requestedAmount} onChange={set} placeholder="e.g. 120000" style={inputStyle('requestedAmount')} />
                  {err('requestedAmount')}
                </Field>
                <Field lbl="Repayment Duration (months)" req>
                  <select name="preferredDuration" value={form.preferredDuration} onChange={set} style={{ ...inputStyle('preferredDuration'), cursor: 'pointer' }}>
                    {[3, 6, 9, 12, 18, 24].map((m) => <option key={m} value={m}>{m} months</option>)}
                  </select>
                  {err('preferredDuration')}
                </Field>
                <Field lbl="Repayment Method" req>
                  <select name="repaymentMethod" value={form.repaymentMethod} onChange={set} style={{ ...inputStyle('repaymentMethod'), cursor: 'pointer' }}>
                    {REPAYMENT_METHODS.map((o) => <option key={o.value} value={o.value}>{o.label}</option>)}
                  </select>
                  {err('repaymentMethod')}
                </Field>
              </div>
            </div>
          )}

          {/* ── Step 4: Consent ── */}
          {step === 4 && (
            <div style={{ display: 'grid', gap: '20px' }}>
              <div style={{
                padding: '16px', borderRadius: '10px', background: '#eff6ff',
                border: '1px solid #bfdbfe', fontSize: '0.875rem', color: '#1e40af',
              }}>
                Please confirm that the patient has been informed about and has agreed to the following before submitting.
              </div>

              {[
                {
                  name: 'consentDataProcessing',
                  title: 'Data Processing Consent',
                  desc: 'The patient consents to CareCova collecting and processing their personal and financial data to assess and administer a medical loan.',
                  req: true,
                },
                {
                  name: 'consentTerms',
                  title: 'Terms & Conditions',
                  desc: 'The patient has read and accepted CareCova\'s terms and conditions and loan agreement.',
                  req: true,
                },
                {
                  name: 'consentMarketing',
                  title: 'Marketing Communications (optional)',
                  desc: 'The patient consents to receiving relevant health financing offers and updates from CareCova.',
                  req: false,
                },
              ].map((c) => (
                <label key={c.name} style={{
                  display: 'flex', gap: '14px', alignItems: 'flex-start',
                  padding: '16px', borderRadius: '10px',
                  border: `1.5px solid ${errors[c.name] ? '#fca5a5' : form[c.name] ? '#86efac' : '#e5e7eb'}`,
                  background: form[c.name] ? '#f0fdf4' : '#fff', cursor: 'pointer',
                }}>
                  <input
                    type="checkbox" name={c.name} checked={form[c.name]} onChange={set}
                    style={{ marginTop: '2px', width: '16px', height: '16px', flexShrink: 0, cursor: 'pointer' }}
                  />
                  <div>
                    <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#111827', marginBottom: '3px' }}>
                      {c.title}{c.req && <span style={{ color: '#dc2626' }}> *</span>}
                    </div>
                    <div style={{ fontSize: '0.8125rem', color: '#6b7280', lineHeight: 1.5 }}>{c.desc}</div>
                    {errors[c.name] && (
                      <div style={{ fontSize: '0.75rem', color: '#dc2626', marginTop: '4px' }}>{errors[c.name]}</div>
                    )}
                  </div>
                </label>
              ))}

              {submitError && (
                <div style={{
                  padding: '12px 16px', borderRadius: '8px', background: '#fef2f2',
                  border: '1px solid #fecaca', color: '#dc2626',
                  fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
                }}>
                  <AlertCircle size={16} /> {submitError}
                </div>
              )}
            </div>
          )}

          {/* ── Navigation ── */}
          <div style={{
            display: 'flex', justifyContent: 'space-between', alignItems: 'center',
            marginTop: '28px', paddingTop: '20px', borderTop: '1px solid #f3f4f6',
          }}>
            <button
              type="button"
              onClick={step === 1 ? () => navigate('/provider/patients') : back}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: '6px',
                padding: '10px 20px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
                background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
              }}
            >
              <ChevronLeft size={16} /> {step === 1 ? 'Cancel' : 'Back'}
            </button>

            {step < 4 ? (
              <button
                type="button"
                onClick={next}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '10px 24px', borderRadius: '8px', border: 'none',
                  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Continue <ChevronRight size={16} />
              </button>
            ) : (
              <button
                type="submit"
                disabled={submitting}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '8px',
                  padding: '10px 28px', borderRadius: '8px', border: 'none',
                  background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                  cursor: submitting ? 'wait' : 'pointer',
                }}
              >
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
