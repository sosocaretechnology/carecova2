import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import Input from '../components/Input'
import Select from '../components/Select'
import ProgressIndicator from '../components/ProgressIndicator'
import StepNavigation from '../components/StepNavigation'
import { loanService } from '../services/loanService'
import { applicationService } from '../services/applicationService'
import { validateStep } from '../utils/validation'
import ConsentCheckbox from '../components/ConsentCheckbox'
import { NIGERIAN_STATES, PREFERRED_CONTACT_OPTIONS } from '../data/locationData'
import { trackingService } from '../services/trackingService'
import MoneyInput from '../components/MoneyInput'
import { useAffordabilityCheck } from '../hooks/useAffordabilityCheck'
import { uploadFileToCloudinary } from '../services/cloudinaryService'

const TOTAL_STEPS = 5

const TREATMENT_CATEGORIES = [
  { value: '', label: 'Select treatment category' },
  { value: 'Surgery', label: 'Surgery' },
  { value: 'Maternity', label: 'Maternity' },
  { value: 'Dental', label: 'Dental' },
  { value: 'Optical', label: 'Optical' },
  { value: 'Emergency', label: 'Emergency' },
  { value: 'Chronic care', label: 'Chronic care' },
  { value: 'Lab/Diagnostics', label: 'Lab/Diagnostics' },
  { value: 'IVF & Fertility', label: 'IVF & Fertility' },
  { value: 'Wellness & Screening', label: 'Wellness & Screening' },
  { value: 'Cosmetic & Corrective', label: 'Cosmetic & Corrective' },
]

const URGENCY_OPTIONS = [
  { value: '', label: 'Select urgency' },
  { value: 'emergency', label: 'Emergency' },
  { value: 'this_week', label: 'This week' },
  { value: 'this_month', label: 'This month' },
  { value: 'not_urgent', label: 'Not urgent' },
]

const EMPLOYMENT_SECTOR_OPTIONS = [
  { value: '', label: 'Select sector' },
  { value: 'government', label: 'Government' },
  { value: 'private', label: 'Private' },
  { value: 'self-employed', label: 'Self-employed' },
]

const SALARY_FREQUENCY_OPTIONS = [
  { value: 'monthly', label: 'Monthly' },
  { value: 'weekly', label: 'Weekly' },
]

const TENOR_OPTIONS = [
  { value: '', label: 'Select tenor' },
  { value: '1', label: '1 month' },
  { value: '2', label: '2 months' },
  { value: '3-4', label: '3–4 months' },
  { value: '6', label: '6 months' },
]

const REPAYMENT_METHOD_OPTIONS = [
  { value: '', label: 'Select method' },
  { value: 'salary_deduction', label: 'Salary deduction' },
  { value: 'bank_debit', label: 'Bank debit' },
  { value: 'card_debit', label: 'Card debit' },
  { value: 'bank_transfer', label: 'Bank transfer' },
]

const LENDER_TYPE_OPTIONS = [
  { value: '', label: 'Select type' },
  { value: 'bank', label: 'Bank' },
  { value: 'fintech', label: 'Fintech' },
  { value: 'other', label: 'Other' },
]

const STATE_OPTIONS = [
  { value: '', label: 'Select state' },
  ...NIGERIAN_STATES.map((s, i) => ({ value: s, label: s, key: `state-${i}` })),
]

export default function Apply() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const draftId = searchParams.get('draftId')
  const providerIdParam = searchParams.get('providerId')

  const [currentStep, setCurrentStep] = useState(1)
  const [loading, setLoading] = useState(false)
  const [uploadingIdDocument, setUploadingIdDocument] = useState(false)
  const [uploadingApplicantPhoto, setUploadingApplicantPhoto] = useState(false)
  const [submitted, setSubmitted] = useState(false)
  const [loanId, setLoanId] = useState(null)
  const [errors, setErrors] = useState({})
  const [draftIdState, setDraftIdState] = useState(null)

  // Provider / hospital picker
  const [providerList, setProviderList] = useState([])
  const [providerListLoading, setProviderListLoading] = useState(true)
  const [hospitalMode, setHospitalMode] = useState('select') // 'select' | 'custom'
  const [hospitalSearch, setHospitalSearch] = useState('')
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false)

  const [formData, setFormData] = useState({
    fullName: '',
    phone: '',
    email: '',
    state: '',
    lga: '',
    city: '',
    homeAddress: '',
    landmark: '',
    gpsLat: '',
    gpsLng: '',
    preferredContact: '',

    // Hospital Triangulation MVP
    hospitalName: '',
    hospitalAddress: '',
    isPartnerSuggested: false,
    suggestedHospitalId: '',

    treatmentCategory: '',
    procedureOrService: '',
    healthDescription: '',
    urgency: '',

    // Financial & Employment
    employmentSector: '',
    employerName: '',
    jobTitle: '',
    salaryFrequency: 'monthly',
    monthlyIncome: '',
    monthlyExpenses: '',
    requestedAmount: '',
    preferredTenor: '',
    preferredDuration: 6,
    repaymentMethod: '',
    repaymentBankName: '',
    repaymentAccountNumber: '',
    hasActiveLoans: false,
    activeLoansMonthlyRepayment: '',
    lenderType: '',

    // Co-Borrower replaces Guarantor
    addCoBorrower: false,
    coBorrowerName: '',
    coBorrowerPhone: '',
    coBorrowerRelationship: '',
    coBorrowerEmploymentSector: '',
    coBorrowerEmployerName: '',
    coBorrowerMonthlyIncome: '',

    // Identity & media
    bvn: '',
    nin: '',
    applicantPhoto: null,
    documents: {},

    consentDataProcessing: false,
    consentTerms: false,
    consentMarketing: false,
  })

  // Hook for affordability & risk
  const { riskLevel, riskReasons, disposableIncome, estimatedInstallment, affordabilityRatio } = useAffordabilityCheck(
    formData.requestedAmount,
    formData.monthlyIncome,
    formData.monthlyExpenses,
    formData.preferredDuration
  );

  // Fetch active providers for hospital picker
  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
    if (!apiBase) { setProviderListLoading(false); return }
    fetch(`${apiBase}/api/provider/public/providers?limit=100`)
      .then((r) => {
        if (!r.ok) throw new Error(`HTTP ${r.status}`)
        return r.json()
      })
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.providers ?? []
        setProviderList(list)
      })
      .catch((err) => {
        console.error('[CareCova] Failed to load provider list:', err.message)
      })
      .finally(() => setProviderListLoading(false))
  }, [])

  useEffect(() => {
    const loadDraft = async () => {
      if (draftId) {
        try {
          const draft = await applicationService.getDraft(draftId)
          if (draft && draft.data) {
            setFormData((prev) => ({ ...prev, ...draft.data }))
            setCurrentStep(draft.step)
            setDraftIdState(draft.id)
          }
        } catch (error) {
          console.error('Error loading draft:', error)
        }
      }
    }
    loadDraft()

    const phoneParam = searchParams.get('phone')
    const emailParam = searchParams.get('email')
    if (phoneParam || emailParam) {
      loanService.getAllApplications().then((loans) => {
        const prev = loans.find(
          (l) => (phoneParam && l.phone === phoneParam) || (emailParam && l.email === emailParam)
        )
        if (prev) {
          setFormData((prevForm) => ({
            ...prevForm,
            fullName: prev.fullName || prev.patientName || prevForm.fullName,
            phone: prev.phone || prevForm.phone,
            email: prev.email || prevForm.email,
          }))
        }
      }).catch(() => { })
    }
  }, [draftId, searchParams])

  useEffect(() => {
    // Auto-save draft on step change
    const userId = formData.phone || formData.email
    if (userId && currentStep > 0) {
      applicationService.autoSaveDraft(formData, currentStep, userId)
    }
  }, [currentStep, formData])

  // Custom risk payload insertion for submissions
  const buildPayload = () => {
    const preferredContact = formData.preferredContact || 'call'
    const hospitalPreference = formData.hospitalName ? 'have_hospital' : 'any_near_me'
    const employmentType = formData.employmentType || formData.employmentSector
    const addGuarantor = formData.addGuarantor ?? formData.addCoBorrower
    const homeAddress = (formData.homeAddress || '').trim() || (formData.city ? `${formData.city} area` : '') || formData.lga || ''
    return {
      ...formData,
      preferredContact,
      hospitalPreference,
      employmentType,
      addGuarantor,
      homeAddress,
      guarantorName: formData.guarantorName ?? formData.coBorrowerName,
      guarantorPhone: formData.guarantorPhone ?? formData.coBorrowerPhone,
      guarantorRelationship: formData.guarantorRelationship ?? formData.coBorrowerRelationship,
      guarantorAddress: formData.guarantorAddress,
      guarantorEmploymentType: formData.guarantorEmploymentType ?? formData.coBorrowerEmploymentSector,
      // Grouping payload structure as requested
      location: {
        state: formData.state,
        city: formData.city,
        lga: formData.lga,
        address: formData.homeAddress,
        gps: { lat: formData.gpsLat, lng: formData.gpsLng }
      },
      hospital: {
        name: formData.hospitalName,
        address: formData.hospitalAddress,
        isPartnerSuggested: formData.isPartnerSuggested,
        suggestedHospitalId: formData.suggestedHospitalId
      },
      coBorrower: formData.addCoBorrower === true || formData.addCoBorrower === 'yes' ? {
        name: formData.coBorrowerName,
        phone: formData.coBorrowerPhone,
        relationship: formData.coBorrowerRelationship,
        employmentSector: formData.coBorrowerEmploymentSector,
        employerName: formData.coBorrowerEmployerName,
        monthlyIncome: formData.coBorrowerMonthlyIncome,
      } : null,
      internalRiskMetrics: {
        riskLevel,
        riskReasons,
        disposableIncome,
        estimatedInstallment,
        affordabilityRatio
      },
      ...(providerIdParam ? { providerId: providerIdParam } : {}),
    };
  }

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    if (errors[field]) {
      setErrors((prev) => ({ ...prev, [field]: '' }))
    }
  }

  const validateCurrentStep = () => {
    // In actual implementation, modify validation.js for new fields (CoBorrower, hospital)
    // Here we use existing validation with added dynamic checks
    const stepErrors = validateStep(currentStep, formData)

    // Add custom dynamic required checks
    if (currentStep === 1) {
      if (!formData.hospitalName) stepErrors.hospitalName = "Hospital name is required";
      if (!formData.documents?.id_document) stepErrors.id_document = "Government-issued ID is required";
    }
    if (currentStep === 3) {
      if (formData.employmentSector === 'government' || formData.employmentSector === 'private') {
        if (!formData.employerName) stepErrors.employerName = "Employer name is required";
      }
      if (!formData.monthlyIncome) stepErrors.monthlyIncome = "Monthly income is required";
      if (!formData.monthlyExpenses) stepErrors.monthlyExpenses = "Monthly expenses is required";
      if (!formData.requestedAmount) stepErrors.requestedAmount = "Requested amount is required";
    }

    setErrors(stepErrors)
    return Object.keys(stepErrors).length === 0
  }

  const handleNext = () => {
    if (validateCurrentStep()) {
      if (currentStep < TOTAL_STEPS) {
        setCurrentStep(currentStep + 1)
      }
    }
  }

  const handlePrevious = () => {
    if (currentStep > 1) {
      setCurrentStep(currentStep - 1)
    }
  }

  const handleSaveDraft = async () => {
    const userId = formData.phone || formData.email
    if (!userId) {
      alert('Please enter your phone or email to save your progress')
      return
    }

    try {
      const draft = await applicationService.saveDraft({
        id: draftIdState,
        userId,
        step: currentStep,
        data: formData,
      })
      alert('Your application has been saved. You can resume later.')
      navigate('/')
    } catch (error) {
      alert('Failed to save draft. Please try again.')
    }
  }

  const handleSubmit = async (e) => {
    e.preventDefault()

    if (!validateCurrentStep()) {
      return
    }
    setLoading(true)

    try {
      const result = await loanService.submitApplication(buildPayload())
      if (draftIdState) await applicationService.deleteDraft(draftIdState)
      setLoanId(result.id)
      setSubmitted(true)
    } catch (error) {
      setErrors({ submit: error.message })
    } finally {
      setLoading(false)
    }
  }

  const captureLocation = () => {
    if (!navigator.geolocation) return
    navigator.geolocation.getCurrentPosition(
      (pos) => {
        handleChange('gpsLat', pos.coords.latitude)
        handleChange('gpsLng', pos.coords.longitude)
        // Mock geolocation -> LGA filling
        handleChange('city', 'Ikeja')
        handleChange('lga', 'Ikeja')
        handleChange('state', 'Lagos')
      },
      () => { }
    )
  }

  const renderStep = () => {
    switch (currentStep) {
      case 1: {
        return (
          <div className="step-content">
            <h2>Applicant &amp; Treatment Location</h2>
            <p className="step-description">Identify yourself and where you will be receiving treatment.</p>
            <div className="form-grid">
              <Input label="Full name" type="text" placeholder="e.g. Adekunle Johnson" value={formData.fullName} onChange={(e) => handleChange('fullName', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))} error={errors.fullName} required />
              <Input label="Phone number" type="tel" placeholder="0801 234 5678" value={formData.phone} onChange={(e) => handleChange('phone', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))} error={errors.phone} required />
              <Input label="Email (optional)" type="email" placeholder="name@example.com" value={formData.email} onChange={(e) => handleChange('email', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))} error={errors.email} />

              <div className="form-section-label" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <h3>Your Location</h3>
                <Button type="button" variant="ghost" onClick={captureLocation}>Use my location</Button>
                {(formData.gpsLat && formData.gpsLng) && <span className="caption" style={{ marginLeft: '10px' }}>Location captured</span>}
              </div>

              <Select label="State" options={STATE_OPTIONS} value={formData.state} onChange={(e) => handleChange('state', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))} error={errors.state} required />
              <Input label="City / Town" type="text" placeholder="e.g. Ikeja" value={formData.city} onChange={(e) => handleChange('city', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))} error={errors.city} required />
              <Input label="LGA" type="text" placeholder="Local Government Area" value={formData.lga} onChange={(e) => handleChange('lga', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))} error={errors.lga} required />
              <Input label="Home address (optional)" type="text" placeholder="Street, area" value={formData.homeAddress} onChange={(e) => handleChange('homeAddress', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))} error={errors.homeAddress} />

              <div className="form-section-label" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <h3>Hospital / Clinic Details</h3>
                <p className="caption" style={{ marginTop: '0.25rem' }}>Select the facility where you will receive treatment, or enter your own.</p>
              </div>

              {/* Hospital Picker */}
              <div style={{ gridColumn: '1 / -1' }}>
                {/* Mode toggle */}
                <div style={{ display: 'flex', gap: '8px', marginBottom: '14px' }}>
                  <button
                    type="button"
                    onClick={() => { setHospitalMode('select'); setHospitalSearch(''); setShowHospitalDropdown(false) }}
                    style={{
                      padding: '7px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                      borderColor: hospitalMode === 'select' ? '#2563eb' : '#e2e8f0',
                      background: hospitalMode === 'select' ? '#eff6ff' : '#fff',
                      color: hospitalMode === 'select' ? '#2563eb' : '#6b7280',
                    }}
                  >
                    Select from our network
                  </button>
                  <button
                    type="button"
                    onClick={() => {
                      setHospitalMode('custom')
                      handleChange('suggestedHospitalId', '')
                      handleChange('isPartnerSuggested', false)
                      handleChange('hospitalName', '')
                      handleChange('hospitalAddress', '')
                    }}
                    style={{
                      padding: '7px 16px', borderRadius: '8px', fontSize: '0.875rem', fontWeight: 600, cursor: 'pointer', border: '1.5px solid',
                      borderColor: hospitalMode === 'custom' ? '#2563eb' : '#e2e8f0',
                      background: hospitalMode === 'custom' ? '#eff6ff' : '#fff',
                      color: hospitalMode === 'custom' ? '#2563eb' : '#6b7280',
                    }}
                  >
                    Enter my own hospital
                  </button>
                </div>

                {hospitalMode === 'select' ? (
                  <div>
                    {/* Search / combobox */}
                    <div style={{ position: 'relative' }}>
                      <label className="input-label">
                        Hospital / Clinic name <span className="required-asterisk">*</span>
                      </label>
                      <input
                        type="text"
                        placeholder="Search by name…"
                        value={hospitalSearch || formData.hospitalName}
                        onFocus={() => { setHospitalSearch(formData.hospitalName || ''); setShowHospitalDropdown(true) }}
                        onChange={(e) => {
                          setHospitalSearch(e.target.value)
                          setShowHospitalDropdown(true)
                          if (!e.target.value) {
                            handleChange('hospitalName', '')
                            handleChange('hospitalAddress', '')
                            handleChange('suggestedHospitalId', '')
                            handleChange('isPartnerSuggested', false)
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowHospitalDropdown(false), 180)}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '8px',
                          border: errors.hospitalName ? '1.5px solid #ef4444' : '1.5px solid #e2e8f0',
                          fontSize: '0.9375rem', outline: 'none', boxSizing: 'border-box',
                          background: '#fff',
                        }}
                      />
                      {showHospitalDropdown && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: '260px', overflowY: 'auto',
                        }}>
                          {(() => {
                            if (providerListLoading) {
                              return <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '0.875rem' }}>Loading facilities…</div>
                            }
                            const term = (hospitalSearch || '').toLowerCase()
                            const filtered = providerList.filter(
                              (p) => !term || (p.name || '').toLowerCase().includes(term)
                            )
                            if (filtered.length === 0) {
                              return (
                                <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '0.875rem' }}>
                                  No matching facilities found.{' '}
                                  <button type="button" onClick={() => { setHospitalMode('custom'); handleChange('hospitalName', hospitalSearch); setShowHospitalDropdown(false) }}
                                    style={{ color: '#2563eb', fontWeight: 600, background: 'none', border: 'none', cursor: 'pointer', padding: 0, fontSize: '0.875rem' }}>
                                    Enter "{hospitalSearch}" manually
                                  </button>
                                </div>
                              )
                            }
                            return filtered.map((p) => {
                              const pid = p.id || p._id
                              const selected = formData.suggestedHospitalId === pid
                              return (
                                <div
                                  key={pid}
                                  onMouseDown={() => {
                                    handleChange('hospitalName', p.name)
                                    handleChange('hospitalAddress', p.address || '')
                                    handleChange('suggestedHospitalId', pid)
                                    handleChange('isPartnerSuggested', true)
                                    setHospitalSearch('')
                                    setShowHospitalDropdown(false)
                                    setErrors((prev) => ({ ...prev, hospitalName: '' }))
                                  }}
                                  style={{
                                    padding: '11px 16px', cursor: 'pointer', display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: selected ? '#eff6ff' : 'transparent',
                                    borderBottom: '1px solid #f3f4f6',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{p.name}</div>
                                    {(p.address || p.type) && (
                                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                                        {[p.type, p.address].filter(Boolean).join(' · ')}
                                      </div>
                                    )}
                                  </div>
                                  {selected && <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>Selected</span>}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </div>
                    {/* Show selected facility */}
                    {formData.hospitalName && !showHospitalDropdown && (
                      <div style={{
                        marginTop: '10px', padding: '10px 14px', borderRadius: '8px',
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <div>
                          <div style={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534' }}>{formData.hospitalName}</div>
                          {formData.hospitalAddress && <div style={{ fontSize: '0.8rem', color: '#4ade80' }}>{formData.hospitalAddress}</div>}
                          {formData.isPartnerSuggested && <span style={{ fontSize: '0.75rem', background: '#bbf7d0', color: '#166534', padding: '1px 7px', borderRadius: '8px', fontWeight: 600 }}>CareCova Network</span>}
                        </div>
                        <button type="button" onClick={() => { handleChange('hospitalName', ''); handleChange('hospitalAddress', ''); handleChange('suggestedHospitalId', ''); handleChange('isPartnerSuggested', false); setHospitalSearch('') }}
                          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}>
                          Change
                        </button>
                      </div>
                    )}
                    {errors.hospitalName && <p style={{ margin: '6px 0 0', fontSize: '0.8125rem', color: '#ef4444' }}>{errors.hospitalName}</p>}
                  </div>
                ) : (
                  /* Custom entry mode */
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
                    <Input
                      label="Hospital / Clinic name"
                      type="text"
                      placeholder="e.g. Lagos University Teaching Hospital"
                      value={formData.hospitalName}
                      onChange={(e) => { handleChange('hospitalName', e.target.value); handleChange('isPartnerSuggested', false) }}
                      onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(1, formData) }))}
                      error={errors.hospitalName}
                      required
                    />
                    <Input
                      label="Hospital area / address (optional)"
                      type="text"
                      placeholder="Street, area or city"
                      value={formData.hospitalAddress}
                      onChange={(e) => { handleChange('hospitalAddress', e.target.value); handleChange('isPartnerSuggested', false) }}
                    />
                  </div>
                )}
              </div>

              <div className="form-section-label" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <h3>Identity verification</h3>
                <p className="caption" style={{ marginTop: '0.25rem' }}>Upload any government-issued ID (e.g. NIN slip, National ID, Voter&apos;s card, International passport, Driver&apos;s license).</p>
              </div>

              <Input
                label="BVN (optional but recommended)"
                type="text"
                placeholder="11-digit BVN"
                value={formData.bvn}
                onChange={(e) => handleChange('bvn', e.target.value)}
              />
              <Input
                label="NIN (optional)"
                type="text"
                placeholder="National Identity Number"
                value={formData.nin}
                onChange={(e) => handleChange('nin', e.target.value)}
              />
              <div style={{ gridColumn: '1 / -1' }}>
                <label className="input-label">Government-issued ID <span className="required-asterisk">*</span></label>
                {(formData.documents && formData.documents.id_document) ? (
                  <div className="document-upload-file" style={{ display: 'flex', alignItems: 'center', gap: '0.5rem', marginTop: '0.5rem' }}>
                    <span className="document-file-name">{formData.documents.id_document.fileName}</span>
                    <span className="document-file-size" style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                      ({formData.documents.id_document.fileSize < 1024 ? `${formData.documents.id_document.fileSize} B` : formData.documents.id_document.fileSize < 1024 * 1024 ? `${(formData.documents.id_document.fileSize / 1024).toFixed(1)} KB` : `${(formData.documents.id_document.fileSize / (1024 * 1024)).toFixed(1)} MB`})
                    </span>
                    <button type="button" className="document-remove" style={{ marginLeft: 'auto', padding: '0.25rem 0.5rem', fontSize: '0.875rem' }} onClick={() => setFormData((prev) => ({ ...prev, documents: { ...prev.documents, id_document: null } }))}>
                      Remove
                    </button>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept=".pdf,.jpg,.jpeg,.png"
                    className="document-upload-input"
                    style={{ marginTop: '0.5rem', display: 'block' }}
                    disabled={uploadingIdDocument}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return

                      setUploadingIdDocument(true)
                      try {
                        const uploaded = await uploadFileToCloudinary(file, {
                          folder: 'carecova/id-documents',
                        })
                        setFormData((prev) => ({
                          ...prev,
                          documents: {
                            ...prev.documents,
                            id_document: {
                              fileName: uploaded.fileName,
                              fileSize: uploaded.fileSize,
                              mimeType: uploaded.mimeType,
                              url: uploaded.url,
                              storageKey: uploaded.storageKey,
                            },
                          },
                        }))
                        setErrors((prev) => ({ ...prev, id_document: '' }))
                      } catch (error) {
                        setErrors((prev) => ({
                          ...prev,
                          id_document: error.message || 'Failed to upload ID document',
                        }))
                      } finally {
                        setUploadingIdDocument(false)
                        e.target.value = ''
                      }
                    }}
                  />
                )}
                {uploadingIdDocument && (
                  <span className="caption" style={{ display: 'block', marginTop: '0.4rem' }}>
                    Uploading ID document...
                  </span>
                )}
                {errors.id_document && <span className="input-error">{errors.id_document}</span>}
              </div>

              <div style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <label className="input-label">Applicant photo (selfie)</label>
                <p className="caption" style={{ marginTop: '0.25rem' }}>
                  A clear photo of the applicant&apos;s face. This is used for identity verification and will show in the admin case file.
                </p>
                {formData.applicantPhoto?.dataUrl || formData.applicantPhoto?.url ? (
                  <div style={{ marginTop: '0.75rem', display: 'flex', alignItems: 'center', gap: '1rem' }}>
                    <img
                      src={formData.applicantPhoto.dataUrl || formData.applicantPhoto.url}
                      alt="Applicant"
                      style={{ width: 72, height: 72, borderRadius: '999px', objectFit: 'cover', border: '2px solid var(--color-primary-subtle)' }}
                    />
                    <div>
                      <div className="text-sm font-medium">{formData.applicantPhoto.fileName}</div>
                      <button
                        type="button"
                        className="button button--ghost text-xs mt-1"
                        onClick={() => setFormData(prev => ({ ...prev, applicantPhoto: null }))}
                      >
                        Remove photo
                      </button>
                    </div>
                  </div>
                ) : (
                  <input
                    type="file"
                    accept="image/*"
                    className="document-upload-input"
                    style={{ marginTop: '0.5rem', display: 'block' }}
                    disabled={uploadingApplicantPhoto}
                    onChange={async (e) => {
                      const file = e.target.files?.[0]
                      if (!file) return
                      setUploadingApplicantPhoto(true)
                      try {
                        const uploaded = await uploadFileToCloudinary(file, {
                          folder: 'carecova/applicant-photos',
                        })
                        setFormData(prev => ({
                          ...prev,
                          applicantPhoto: {
                            fileName: uploaded.fileName,
                            fileSize: uploaded.fileSize,
                            mimeType: uploaded.mimeType,
                            url: uploaded.url,
                            storageKey: uploaded.storageKey,
                          },
                        }))
                      } catch (error) {
                        setErrors(prev => ({
                          ...prev,
                          applicantPhoto: error.message || 'Failed to upload applicant photo',
                        }))
                      } finally {
                        setUploadingApplicantPhoto(false)
                        e.target.value = ''
                      }
                    }}
                  />
                )}
                {uploadingApplicantPhoto && (
                  <span className="caption" style={{ display: 'block', marginTop: '0.4rem' }}>
                    Uploading applicant photo...
                  </span>
                )}
                {errors.applicantPhoto && <span className="input-error">{errors.applicantPhoto}</span>}
              </div>
            </div>
          </div>
        )
      }

      case 2:
        return (
          <div className="step-content">
            <h2>Treatment Info</h2>
            <p className="step-description">What treatment do you need and how urgent is it?</p>
            <div className="form-grid">
              <Select label="Treatment category" options={TREATMENT_CATEGORIES} value={formData.treatmentCategory} onChange={(e) => handleChange('treatmentCategory', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(2, formData) }))} error={errors.treatmentCategory} required />
              <Input label="Procedure / Service (optional)" type="text" placeholder="e.g. Dental implant" value={formData.procedureOrService} onChange={(e) => handleChange('procedureOrService', e.target.value)} />
              <div className="input-group">
                <label className="input-label">Brief description of health challenge *</label>
                <textarea className="input" rows={3} placeholder="Describe your condition or treatment need" value={formData.healthDescription} onChange={(e) => handleChange('healthDescription', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(2, formData) }))} />
                {errors.healthDescription && <span className="input-error">{errors.healthDescription}</span>}
              </div>
              <Select label="Urgency" options={URGENCY_OPTIONS} value={formData.urgency} onChange={(e) => handleChange('urgency', e.target.value)} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(2, formData) }))} error={errors.urgency} required />
            </div>
          </div>
        )

      case 3: {
        const isGov = formData.employmentSector === 'government';
        const isPrivate = formData.employmentSector === 'private';

        let availableRepaymentMethods = [];
        if (isGov) {
          availableRepaymentMethods = [
            { value: 'salary_deduction', label: 'Salary deduction' },
            { value: 'bank_debit', label: 'Bank debit' },
            { value: 'card_debit', label: 'Card debit' }
          ];
        } else if (isPrivate) {
          availableRepaymentMethods = [
            { value: 'bank_debit', label: 'Bank debit' },
            { value: 'card_debit', label: 'Card debit' }
          ];
        } else {
          availableRepaymentMethods = REPAYMENT_METHOD_OPTIONS.filter(o => o.value !== 'salary_deduction');
        }

        return (
          <div className="step-content">
            <h2>Financial Info &amp; Employment</h2>
            <p className="step-description">Detail your earning clarity and repayment preferences.</p>
            <div className="form-grid">

              <Select label="Employment sector" options={EMPLOYMENT_SECTOR_OPTIONS} value={formData.employmentSector} onChange={(e) => handleChange('employmentSector', e.target.value)} error={errors.employmentSector} required />

              {(isGov || isPrivate) && (
                <>
                  <Input label="Employer name" type="text" placeholder="e.g. Federal Ministry of Health" value={formData.employerName} onChange={(e) => handleChange('employerName', e.target.value)} error={errors.employerName} required />
                  <Input label="Job title (optional)" type="text" placeholder="e.g. Senior Accountant" value={formData.jobTitle} onChange={(e) => handleChange('jobTitle', e.target.value)} />
                </>
              )}

              <Select label="Salary frequency" options={SALARY_FREQUENCY_OPTIONS} value={formData.salaryFrequency} onChange={(e) => handleChange('salaryFrequency', e.target.value)} />

              <MoneyInput label="Monthly income" placeholder="₦ 0.00" value={formData.monthlyIncome} onChange={(v) => handleChange('monthlyIncome', v)} error={errors.monthlyIncome} required />
              <MoneyInput label="Monthly expenses" placeholder="₦ 0.00" value={formData.monthlyExpenses} onChange={(v) => handleChange('monthlyExpenses', v)} error={errors.monthlyExpenses} required />

              <div className="form-section-label" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <h3>Loan Request</h3>
              </div>

              <MoneyInput label="Requested loan amount" placeholder="₦ 0.00" value={formData.requestedAmount} onChange={(v) => handleChange('requestedAmount', v)} error={errors.requestedAmount} required />
              <Select label="Preferred repayment tenor" options={TENOR_OPTIONS} value={formData.preferredTenor} onChange={(e) => { handleChange('preferredTenor', e.target.value); const m = { '1': 1, '2': 2, '3-4': 4, '6': 6 }[e.target.value]; if (m) handleChange('preferredDuration', m) }} onBlur={() => setErrors((prev) => ({ ...prev, ...validateStep(3, formData) }))} error={errors.preferredTenor} required />

              <div className="form-section-label" style={{ gridColumn: '1 / -1', marginTop: '1rem', borderTop: '1px solid #ddd', paddingTop: '1rem' }}>
                <h3>Repayment Preferences</h3>
                <p className="caption" style={{ marginTop: '0' }}>Preference helps us set up repayment, but final route follows policy.</p>
                {isGov && <p className="caption" style={{ color: '#10b981', fontWeight: 'bold' }}>Policy: Salary deduction → Bank debit → Card fallback</p>}
                {isPrivate && <p className="caption" style={{ color: '#10b981', fontWeight: 'bold' }}>Policy: Bank debit → Card fallback (Co-borrower recommended)</p>}
              </div>

              <Select label="Preferred repayment method" options={[{ value: '', label: 'Select method' }, ...availableRepaymentMethods]} value={formData.repaymentMethod} onChange={(e) => handleChange('repaymentMethod', e.target.value)} error={errors.repaymentMethod} required />
              <Input label="Repayment Bank Name (optional)" type="text" placeholder="e.g. Access Bank" value={formData.repaymentBankName} onChange={(e) => handleChange('repaymentBankName', e.target.value)} />
              <Input label="Repayment Account Number (optional)" type="text" placeholder="10 digits" value={formData.repaymentAccountNumber} onChange={(e) => handleChange('repaymentAccountNumber', e.target.value)} />

              <div className="form-section-label" style={{ gridColumn: '1 / -1', marginTop: '1rem' }}>
                <label>Do you currently have any active loans?</label>
                <div className="tenure">
                  <button type="button" className={`chip ${formData.hasActiveLoans === true || formData.hasActiveLoans === 'yes' ? 'active' : ''}`} onClick={() => handleChange('hasActiveLoans', true)}>Yes</button>
                  <button type="button" className={`chip ${!formData.hasActiveLoans ? 'active' : ''}`} onClick={() => handleChange('hasActiveLoans', false)}>No</button>
                </div>
              </div>
              {(formData.hasActiveLoans === true || formData.hasActiveLoans === 'yes') && (
                <>
                  <MoneyInput label="Total monthly repayment" placeholder="₦ 0.00" value={formData.activeLoansMonthlyRepayment} onChange={(v) => handleChange('activeLoansMonthlyRepayment', v)} error={errors.activeLoansMonthlyRepayment} required />
                  <Select label="Lender type" options={LENDER_TYPE_OPTIONS} value={formData.lenderType} onChange={(e) => handleChange('lenderType', e.target.value)} error={errors.lenderType} required />
                </>
              )}
            </div>
          </div>
        )
      }

      case 4:
        return (
          <div className="step-content">
            <h2>Co-Borrower (Optional)</h2>
            <p className="step-description">Adding a Co-Borrower is recommended for private sector employees and higher loan amounts.</p>
            <div className="form-grid">
              <div className="form-section-label">
                <label>Add a Co-Borrower?</label>
                <div className="tenure">
                  <button type="button" className={`chip ${formData.addCoBorrower === true || formData.addCoBorrower === 'yes' ? 'active' : ''}`} onClick={() => handleChange('addCoBorrower', true)}>Yes</button>
                  <button type="button" className={`chip ${!formData.addCoBorrower ? 'active' : ''}`} onClick={() => handleChange('addCoBorrower', false)}>No</button>
                </div>
              </div>
              {(formData.addCoBorrower === true || formData.addCoBorrower === 'yes') && (
                <>
                  <Input label="Co-Borrower full name" type="text" placeholder="Full name" value={formData.coBorrowerName} onChange={(e) => handleChange('coBorrowerName', e.target.value)} error={errors.coBorrowerName} required />
                  <Input label="Co-Borrower phone" type="tel" placeholder="0801 234 5678" value={formData.coBorrowerPhone} onChange={(e) => handleChange('coBorrowerPhone', e.target.value)} error={errors.coBorrowerPhone} required />
                  <Input label="Relationship" type="text" placeholder="e.g. Spouse, Sibling" value={formData.coBorrowerRelationship} onChange={(e) => handleChange('coBorrowerRelationship', e.target.value)} error={errors.coBorrowerRelationship} required />
                  <Select label="Employment sector" options={EMPLOYMENT_SECTOR_OPTIONS} value={formData.coBorrowerEmploymentSector} onChange={(e) => handleChange('coBorrowerEmploymentSector', e.target.value)} />
                  <Input label="Employer Name (optional)" type="text" value={formData.coBorrowerEmployerName} onChange={(e) => handleChange('coBorrowerEmployerName', e.target.value)} />
                  <MoneyInput label="Monthly income (optional)" placeholder="₦ 0.00" value={formData.coBorrowerMonthlyIncome} onChange={(v) => handleChange('coBorrowerMonthlyIncome', v)} />
                </>
              )}
            </div>
          </div>
        )

      case 5: {
        const principal = parseFloat(formData.requestedAmount) || 0;
        const service_fee = principal * 0.05; // MOCK 5% service fee
        const total_repayable = principal + service_fee;

        return (
          <div className="step-content">
            <h2>Review &amp; Submit</h2>
            <p className="step-description">Confirm your details and submit.</p>

            <div className="review-section">
              <div className="review-card">
                <h3>Applicant &amp; Treatment</h3>
                <div className="review-item"><strong>Name:</strong> {formData.fullName || '—'}</div>
                <div className="review-item"><strong>Location:</strong> {[formData.state, formData.city].filter(Boolean).join(', ') || '—'}</div>
                <div className="review-item"><strong>Hospital:</strong> {formData.hospitalName} {formData.isPartnerSuggested ? '(Partner)' : ''}</div>
                <div className="review-item"><strong>Treatment:</strong> {formData.treatmentCategory || '—'}</div>
                <div className="review-item"><strong>Urgency:</strong> {formData.urgency || '—'}</div>
                {formData.documents?.id_document && <div className="review-item"><strong>Govt. ID:</strong> {formData.documents.id_document.fileName}</div>}
                {formData.bvn && <div className="review-item"><strong>BVN:</strong> {formData.bvn}</div>}
                {formData.nin && <div className="review-item"><strong>NIN:</strong> {formData.nin}</div>}
              </div>
              <div className="review-card">
                <h3>Financial Info</h3>
                <div className="review-item"><strong>Employment:</strong> {formData.employmentSector ? formData.employmentSector.toUpperCase() : '—'}</div>
                {formData.employerName && <div className="review-item"><strong>Employer:</strong> {formData.employerName}</div>}
                <div className="review-item"><strong>Monthly income:</strong> ₦{(formData.monthlyIncome)?.toLocaleString() || '0'}</div>
                <div className="review-item"><strong>Monthly expenses:</strong> ₦{(formData.monthlyExpenses)?.toLocaleString() || '0'}</div>
                <div className="review-item"><strong>Repayment method:</strong> {formData.repaymentMethod || '—'}</div>
              </div>
              <div className="review-card">
                <h3>Offer Breakdown</h3>
                <div className="review-item"><strong>Principal (Requested):</strong> ₦{principal.toLocaleString()}</div>
                <div className="review-item"><strong>Service Fee (Est.):</strong> ₦{service_fee.toLocaleString()}</div>
                <div className="review-item"><strong>Total Repayable:</strong> ₦{total_repayable.toLocaleString()}</div>
                <div className="review-item"><strong>Tenor:</strong> {formData.preferredDuration} months</div>
                {estimatedInstallment > 0 && (
                  <div className="review-item"><strong>Est. monthly repayment:</strong> ₦{Math.round(total_repayable / formData.preferredDuration).toLocaleString()}</div>
                )}
              </div>
              {(formData.addCoBorrower === true || formData.addCoBorrower === 'yes') && (
                <div className="review-card">
                  <h3>Co-Borrower</h3>
                  <div className="review-item"><strong>Name:</strong> {formData.coBorrowerName}</div>
                  <div className="review-item"><strong>Phone:</strong> {formData.coBorrowerPhone}</div>
                  <div className="review-item"><strong>Relationship:</strong> {formData.coBorrowerRelationship}</div>
                </div>
              )}
              <div className="review-card consent-section">
                <h3>Consent</h3>
                <ConsentCheckbox id="consentDataProcessing" label="I consent to CareCova processing my personal and financial data." required checked={formData.consentDataProcessing} onChange={(e) => handleChange('consentDataProcessing', e.target.checked)} error={errors.consentDataProcessing} />
                <ConsentCheckbox id="consentTerms" label="I have read and accept the Terms and Conditions." required checked={formData.consentTerms} onChange={(e) => handleChange('consentTerms', e.target.checked)} error={errors.consentTerms} />
              </div>
            </div>
          </div>
        )
      }

      default:
        return null
    }
  }

  if (submitted) {
    return (
      <>
        <Header />
        <main>
          <section className="section section-welcome">
            <div className="container">
              <div className="customer-welcome-card">
                <div className="customer-welcome-icon" aria-hidden="true">✓</div>
                <h1 className="customer-welcome-title">Welcome to Carecova</h1>
                <p className="customer-welcome-lead">Your healthcare financing application has been submitted. We’re here to support you through the process.</p>
                <div className="customer-welcome-id-box">
                  <span className="customer-welcome-id-label">Your application ID</span>
                  <strong className="customer-welcome-id-value">{loanId ?? '—'}</strong>
                  <p className="customer-welcome-id-hint">Save this ID to track your application. We’ll also send it to you via SMS and email.</p>
                </div>
                <div className="customer-welcome-next">
                  <h3>What happens next?</h3>
                  <ul>
                    <li><strong>Review</strong> – Our team will review your application (usually within 24–48 hours).</li>
                    <li><strong>Contact</strong> – We may call or email if we need any documents or details.</li>
                    <li><strong>Decision</strong> – You’ll receive an update and, if approved, your loan offer.</li>
                    <li><strong>Disbursement</strong> – Once you accept, funds go to your healthcare provider.</li>
                  </ul>
                </div>
                <div className="success-actions customer-welcome-actions">
                  <Button variant="primary" onClick={() => navigate(`/track?loanId=${loanId || ''}`)} disabled={!loanId}>Track your application</Button>
                  <Button variant="ghost" onClick={() => navigate('/login')}>Sign in to my account</Button>
                  <Button variant="ghost" onClick={() => navigate('/')}>Return home</Button>
                </div>
                <p className="customer-welcome-portal-hint">Use the same phone number from this application to sign in and see all your loans in one place.</p>
              </div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const canProceed = Object.keys(validateStep(currentStep, formData)).length === 0

  return (
    <>
      <Header />
      <main>
        <section className="page-hero mesh-bg-hero">
          <div className="container">
            <h1>Apply for Healthcare Financing</h1>
            <p>Quick and easy healthcare loans for your peace of mind.</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <ProgressIndicator currentStep={currentStep} totalSteps={TOTAL_STEPS} />

            <form className="apply-form-wizard glass-card" style={{ padding: '2rem', marginTop: '1rem' }} onSubmit={handleSubmit}>
              {renderStep()}

              {errors.submit && (
                <div className="error-message">{errors.submit}</div>
              )}

              <StepNavigation
                currentStep={currentStep}
                totalSteps={TOTAL_STEPS}
                onPrevious={handlePrevious}
                onNext={handleNext}
                onSave={handleSaveDraft}
                canProceed={canProceed}
                isLoading={loading}
              />
            </form>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
