import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck, Copy, Check } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import WhatsAppFloat from '../components/WhatsAppFloat'
import { consultationService } from '../services/consultationService'
import { validateConsultationBooking } from '../utils/consultationValidation'
import { CONSULTATION_BOOKING_FEE_NAIRA } from '../constants/consultation'
import './ConsultationBooking.css'

const BANK_DETAILS = {
  bankName: 'Wema Bank',
  accountNumber: '0124253771',
  accountName: 'Sosocare Digital Solution Ltd',
  currency: 'NGN',
}

const OFFICE_WHATSAPP = '+2349160103000'
const OFFICE_PHONE = '0916 010 3000'
const OFFICE_EMAIL = 'support@carecova.com'

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  providerId: '',
  reason: '',
  healthHistory: undefined,
  preferredAt: '',
  consentAccepted: false,
}

function makeIdempotencyKey() {
  if (typeof window !== 'undefined' && window.crypto?.randomUUID) {
    return window.crypto.randomUUID()
  }
  return ''
}

function toLocalDateTimeValue(date) {
  const local = new Date(date.getTime() - date.getTimezoneOffset() * 60_000)
  return local.toISOString().slice(0, 16)
}

function CopyButton({ text }) {
  const [copied, setCopied] = useState(false)
  const copy = async () => {
    try {
      await navigator.clipboard.writeText(text)
      setCopied(true)
      setTimeout(() => setCopied(false), 2000)
    } catch {
      /* ignore */
    }
  }
  return (
    <button type="button" className="consultation-copy-btn" onClick={copy} title="Copy to clipboard" aria-label="Copy to clipboard">
      {copied ? <Check size={14} /> : <Copy size={14} />}
    </button>
  )
}

/* ── Bank Transfer Panel ─────────────────────────────────────────────────── */
function BankTransferPanel({ amount, onConfirmed }) {
  const [confirmed, setConfirmed] = useState(false)

  return (
    <div className="bank-transfer-panel">
      <div className="bank-transfer-header">
        <div className="bank-transfer-badge">Transfer to Bank</div>
        <span className="bank-transfer-amount">₦{amount.toLocaleString('en-NG')}</span>
      </div>

      <p className="bank-transfer-instruction">
        Transfer exactly <strong>₦{amount.toLocaleString('en-NG')}</strong> to the account below, then
        send your payment receipt to our team to complete your booking.
      </p>

      <div className="bank-transfer-details">
        <div className="bank-detail-row">
          <span className="bank-detail-label">Bank</span>
          <span className="bank-detail-value">{BANK_DETAILS.bankName}</span>
        </div>
        <div className="bank-detail-row">
          <span className="bank-detail-label">Account Number</span>
          <span className="bank-detail-value bank-detail-highlight">
            {BANK_DETAILS.accountNumber}
            <CopyButton text={BANK_DETAILS.accountNumber} />
          </span>
        </div>
        <div className="bank-detail-row">
          <span className="bank-detail-label">Account Name</span>
          <span className="bank-detail-value">{BANK_DETAILS.accountName}</span>
        </div>
        <div className="bank-detail-row">
          <span className="bank-detail-label">Amount</span>
          <span className="bank-detail-value bank-detail-highlight">
            ₦{amount.toLocaleString('en-NG')} {BANK_DETAILS.currency}
            <CopyButton text={amount.toString()} />
          </span>
        </div>
      </div>

      <div className="bank-transfer-receipt-guide">
        <p className="bank-transfer-receipt-title">After transferring, send your receipt to:</p>
        <div className="bank-transfer-channels">
          <a
            href={`https://wa.me/${OFFICE_WHATSAPP.replace(/[^0-9]/g, '')}`}
            target="_blank"
            rel="noopener noreferrer"
            className="bank-transfer-channel bank-transfer-channel--whatsapp"
          >
            <svg width="18" height="18" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
              <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
            </svg>
            WhatsApp: {OFFICE_PHONE}
          </a>
          <a href={`mailto:${OFFICE_EMAIL}`} className="bank-transfer-channel bank-transfer-channel--email">
            <svg width="18" height="18" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M4 4h16c1.1 0 2 .9 2 2v12c0 1.1-.9 2-2 2H4c-1.1 0-2-.9-2-2V6c0-1.1.9-2 2-2z" />
              <polyline points="22,6 12,13 2,6" />
            </svg>
            Email: {OFFICE_EMAIL}
          </a>
        </div>
        <p className="bank-transfer-note">
          Our team will verify your payment and contact you within 24 hours to confirm your appointment.
        </p>
      </div>

      <label className="bank-transfer-confirm-label">
        <input
          type="checkbox"
          checked={confirmed}
          onChange={(e) => setConfirmed(e.target.checked)}
          className="bank-transfer-confirm-checkbox"
        />
        <span>I have made the transfer and sent my receipt to CareCova.</span>
      </label>

      <Button
        type="button"
        variant="primary"
        disabled={!confirmed}
        onClick={onConfirmed}
        className="consultation-submit-button"
      >
        Submit Booking Request
      </Button>
    </div>
  )
}

/* ── Facility Card Picker ────────────────────────────────────────────────── */
function FacilityPicker({ facilities, facilitySearch, onSearchChange, selectedId, onSelect, loading, error, onRetry }) {
  const visibleFacilities = useMemo(() => {
    const search = facilitySearch.trim().toLowerCase()
    if (!search) return facilities
    return facilities.filter(
      (f) =>
        f.name?.toLowerCase().includes(search) ||
        f.address?.toLowerCase().includes(search) ||
        f.location?.toLowerCase().includes(search)
    )
  }, [facilities, facilitySearch])

  // Group by location/state if available
  const grouped = useMemo(() => {
    const groups = {}
    for (const f of visibleFacilities) {
      const key = f.location || f.state || f.city || 'Other'
      if (!groups[key]) groups[key] = []
      groups[key].push(f)
    }
    return groups
  }, [visibleFacilities])

  const hasGroups = Object.keys(grouped).length > 1

  return (
    <div className="facility-picker">
      <div className="facility-search-wrap">
        <svg className="facility-search-icon" width="16" height="16" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
          <circle cx="11" cy="11" r="8" /><line x1="21" y1="21" x2="16.65" y2="16.65" />
        </svg>
        <input
          type="search"
          className="facility-search-input"
          placeholder="Search by name or location…"
          value={facilitySearch}
          onChange={(e) => onSearchChange(e.target.value)}
          autoComplete="off"
        />
        {facilitySearch && (
          <button type="button" className="facility-search-clear" onClick={() => onSearchChange('')} aria-label="Clear search">✕</button>
        )}
      </div>

      {error && (
        <div className="facility-error">
          {error}{' '}
          <button type="button" onClick={onRetry}>Retry</button>
        </div>
      )}

      {loading ? (
        <div className="facility-loading">
          <span className="facility-loading-spinner" aria-hidden="true" />
          Loading partner facilities…
        </div>
      ) : visibleFacilities.length === 0 ? (
        <div className="facility-empty">
          {facilitySearch.trim()
            ? `No facilities found for "${facilitySearch}". Try a different name or location.`
            : 'No partner facilities are available right now. Please contact our team.'}
        </div>
      ) : (
        <div className="facility-list">
          {hasGroups
            ? Object.entries(grouped).map(([location, items]) => (
                <div key={location} className="facility-group">
                  <p className="facility-group-label">{location}</p>
                  {items.map((f) => (
                    <FacilityCard key={f.id} facility={f} selected={f.id === selectedId} onSelect={onSelect} />
                  ))}
                </div>
              ))
            : visibleFacilities.map((f) => (
                <FacilityCard key={f.id} facility={f} selected={f.id === selectedId} onSelect={onSelect} />
              ))}
        </div>
      )}

      {selectedId && (
        <p className="facility-selected-note">
          ✓ Selected facility will be confirmed with your booking.
        </p>
      )}
    </div>
  )
}

function FacilityCard({ facility, selected, onSelect }) {
  return (
    <button
      type="button"
      className={`facility-card${selected ? ' facility-card--selected' : ''}`}
      onClick={() => onSelect(facility.id)}
      aria-pressed={selected}
    >
      <div className="facility-card-info">
        <span className="facility-card-name">{facility.name}</span>
        {(facility.address || facility.location || facility.city) && (
          <span className="facility-card-address">
            <svg width="12" height="12" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <path d="M21 10c0 7-9 13-9 13s-9-6-9-13a9 9 0 0118 0z" /><circle cx="12" cy="10" r="3" />
            </svg>
            {facility.address || facility.location || facility.city}
          </span>
        )}
      </div>
      <span className="facility-card-select" aria-hidden="true">
        {selected ? (
          <span className="facility-card-check">✓</span>
        ) : (
          <span className="facility-card-pick">Select</span>
        )}
      </span>
    </button>
  )
}

/* ── Main page ────────────────────────────────────────────────────────────── */
export default function ConsultationBooking() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState('')
  const [facilitySearch, setFacilitySearch] = useState('')
  const [facilityRefresh, setFacilityRefresh] = useState(0)
  const [facilityResults, setFacilityResults] = useState([])
  const [facilitiesLoading, setFacilitiesLoading] = useState(true)
  const [facilityError, setFacilityError] = useState('')
  const [step, setStep] = useState('form') // 'form' | 'payment' | 'submitting' | 'success'
  const [submitError, setSubmitError] = useState('')
  const [receipt, setReceipt] = useState(null)
  const idempotencyKey = useRef(makeIdempotencyKey())
  const submittingRef = useRef(false)

  const loadConfig = async () => {
    setConfigError('')
    try {
      const nextConfig = await consultationService.getConfig()
      setConfig(nextConfig)
    } catch (error) {
      setConfig(null)
      setConfigError(error.message || 'The booking service is unavailable.')
    }
  }

  useEffect(() => { loadConfig() }, [])

  useEffect(() => {
    let active = true
    setFacilitiesLoading(true)
    setFacilityError('')
    const timer = window.setTimeout(async () => {
      try {
        const results = await consultationService.searchFacilities(facilitySearch)
        if (active) setFacilityResults(results)
      } catch (error) {
        if (active) {
          setFacilityError(error.message || 'Partner facilities could not be loaded.')
          setFacilityResults([])
        }
      } finally {
        if (active) setFacilitiesLoading(false)
      }
    }, facilitySearch ? 250 : 0)
    return () => { active = false; window.clearTimeout(timer) }
  }, [facilitySearch, facilityRefresh])

  const hasFacilities = facilityResults.length > 0
  const bookingAvailable = config?.available === true && !configError
  const minimumDateTime = toLocalDateTimeValue(new Date())

  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const selectFacility = (id) => {
    setForm((current) => ({ ...current, providerId: id }))
    setErrors((current) => ({ ...current, providerId: '' }))
  }

  const handleFormSubmit = (event) => {
    event.preventDefault()
    const nextErrors = validateConsultationBooking(form)
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0]
      document.getElementById(`consultation-${firstField}`)?.focus()
      return
    }
    if (!idempotencyKey.current) {
      setSubmitError('This browser could not securely prepare the request. Please reload and try again.')
      return
    }
    setStep('payment')
    window.scrollTo({ top: 0, behavior: 'smooth' })
  }

  const handlePaymentConfirmed = async () => {
    if (submittingRef.current) return
    submittingRef.current = true
    setStep('submitting')
    try {
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        reason: form.reason.trim(),

        preferredAt: form.preferredAt ? new Date(form.preferredAt).toISOString() : undefined,
        consentAccepted: true,
      }
      const result = await consultationService.submitBooking(payload, idempotencyKey.current)
      setReceipt(result)
      setStep('success')
    } catch (error) {
      setSubmitError(error.message || 'We could not send your request. Please try again.')
      setStep('payment')
    } finally {
      submittingRef.current = false
    }
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setReceipt(null)
    setErrors({})
    setSubmitError('')
    setStep('form')
    idempotencyKey.current = makeIdempotencyKey()
  }

  const isSuccess = step === 'success'

  return (
    <>
      <WhatsAppFloat />
      <Header />
      <main className="consultation-page">
        <section className="consultation-intro">
          <div className="container consultation-intro-inner">
            <Link to="/" className="consultation-back"><ArrowLeft size={17} aria-hidden="true" /> Back to CareCova</Link>
            <p className="eyebrow">A helpful first conversation</p>
            <h1>Book a Consultation</h1>
            <p className="consultation-intro-copy">
              Book a 30-minute consultation with a participating healthcare facility. The reservation fee is ₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')}. Your appointment is confirmed only after our team contacts you.
            </p>
            <div className="consultation-offer-points">
              <span><Clock3 size={18} aria-hidden="true" /> 30 minutes</span>
              <span><CheckCircle2 size={18} aria-hidden="true" /> ₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')} reservation fee</span>
              <span><ShieldCheck size={18} aria-hidden="true" /> Your request is not yet an appointment</span>
            </div>
          </div>
        </section>

        <section className="section consultation-form-section">
          <div className="container consultation-layout">
            <aside className="consultation-sidebar">
              <h2>What happens next?</h2>
              <ol>
                <li><span>1</span><div><strong>Fill the form</strong><p>Choose a participating facility and tell us what you would like to discuss.</p></div></li>
                <li><span>2</span><div><strong>Pay by bank transfer</strong><p>Transfer ₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')} to our Wema Bank account and send your receipt via WhatsApp.</p></div></li>
                <li><span>3</span><div><strong>We contact you</strong><p>Our team verifies payment and calls or emails to agree on a suitable time.</p></div></li>
                <li><span>4</span><div><strong>Appointment confirmed</strong><p>Your appointment is confirmed only after we contact you and agree on the details.</p></div></li>
              </ol>
              <p className="consultation-sidebar-note">If you need urgent medical attention, contact local emergency services or visit a nearby emergency department.</p>
            </aside>

            <div className="consultation-card">
              {isSuccess ? (
                <div className="consultation-success" role="status" aria-live="polite">
                  <span className="consultation-success-icon"><CheckCircle2 size={28} aria-hidden="true" /></span>
                  <p className="eyebrow">Request received</p>
                  <h2>Thanks, {form.fullName.trim().split(/\s+/)[0] || 'we have your request'}.</h2>
                  <p>Your booking request is pending confirmation. The CareCova team will contact you shortly to verify payment and agree on an appointment time. This submission does not confirm an appointment or guarantee immediate access to a clinician.</p>
                  <div className="consultation-reference"><span>Request reference</span><strong>{receipt?.bookingReference}</strong></div>
                  <p className="consultation-success-meta">{receipt?.facilityName} · ₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')} · {receipt?.durationMinutes ?? 30} minutes</p>
                  <div className="consultation-success-reminder">
                    <p>Haven't sent your payment receipt yet?</p>
                    <a
                      href={`https://wa.me/${OFFICE_WHATSAPP.replace(/[^0-9]/g, '')}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="consultation-success-whatsapp"
                    >
                      Send receipt via WhatsApp → {OFFICE_PHONE}
                    </a>
                  </div>
                  <Button variant="secondary" onClick={resetForm}>Send another request</Button>
                </div>

              ) : configError ? (
                <div className="consultation-unavailable" role="alert">
                  <p className="eyebrow">Booking unavailable</p>
                  <h2>We could not load the booking service.</h2>
                  <p>{configError}</p>
                  <Button variant="secondary" onClick={loadConfig}>Try again</Button>
                  <a href={`mailto:${OFFICE_EMAIL}`}>Contact our team</a>
                </div>

              ) : !config ? (
                <div className="consultation-loading" role="status" aria-live="polite">Loading consultation details…</div>

              ) : !bookingAvailable ? (
                <div className="consultation-unavailable" role="status">
                  <p className="eyebrow">Booking unavailable</p>
                  <h2>We are preparing consultation bookings.</h2>
                  <p>Please contact our team and we will help you with the next step.</p>
                  <a href={`mailto:${OFFICE_EMAIL}`}>Contact {OFFICE_EMAIL}</a>
                </div>

              ) : step === 'payment' || step === 'submitting' ? (
                <>
                  <div className="consultation-form-heading">
                    <div>
                      <p className="eyebrow">Step 2 of 2</p>
                      <h2>Complete Payment</h2>
                    </div>
                    <span className="consultation-price">₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')}</span>
                  </div>
                  <p className="consultation-form-lead">
                    Transfer the fee to our bank account, then send your receipt. We will verify and confirm your appointment.
                  </p>
                  {submitError && <div className="consultation-submit-error" role="alert">{submitError}</div>}
                  {step === 'submitting' ? (
                    <div className="consultation-loading" role="status">Submitting your booking request…</div>
                  ) : (
                    <BankTransferPanel amount={CONSULTATION_BOOKING_FEE_NAIRA} onConfirmed={handlePaymentConfirmed} />
                  )}
                  <button type="button" className="consultation-back-link" onClick={() => setStep('form')}>
                    ← Back to edit my details
                  </button>
                </>

              ) : (
                <>
                  <div className="consultation-form-heading">
                    <div><p className="eyebrow">Step 1 of 2</p><h2>Your details</h2></div>
                    <span className="consultation-price">₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')}</span>
                  </div>
                  <p className="consultation-form-lead">Fill in your details and select a facility. You will pay by bank transfer on the next step.</p>

                  {!hasFacilities && !facilitiesLoading && !facilityError && (
                    <div className="consultation-inline-message" role="status">
                      No participating facilities are available right now. Please <a href={`mailto:${OFFICE_EMAIL}`}>contact our team</a> for assistance.
                    </div>
                  )}

                  <form onSubmit={handleFormSubmit} noValidate>
                    <div className="consultation-form-grid">
                      <div className="consultation-field">
                        <label htmlFor="consultation-fullName">Full name <span aria-hidden="true">*</span></label>
                        <input id="consultation-fullName" name="fullName" autoComplete="name" value={form.fullName} onChange={updateField} maxLength={120} required aria-invalid={!!errors.fullName} aria-describedby={errors.fullName ? 'error-fullName' : undefined} />
                        {errors.fullName && <span className="consultation-field-error" id="error-fullName">{errors.fullName}</span>}
                      </div>
                      <div className="consultation-field">
                        <label htmlFor="consultation-email">Email address <span aria-hidden="true">*</span></label>
                        <input id="consultation-email" name="email" type="email" autoComplete="email" value={form.email} onChange={updateField} maxLength={254} required aria-invalid={!!errors.email} aria-describedby={errors.email ? 'error-email' : undefined} />
                        {errors.email && <span className="consultation-field-error" id="error-email">{errors.email}</span>}
                      </div>
                      <div className="consultation-field">
                        <label htmlFor="consultation-phone">Phone number <span aria-hidden="true">*</span></label>
                        <input id="consultation-phone" name="phone" type="tel" inputMode="tel" autoComplete="tel" placeholder="e.g. +234 801 234 5678" value={form.phone} onChange={updateField} maxLength={24} required aria-invalid={!!errors.phone} aria-describedby={errors.phone ? 'error-phone' : undefined} />
                        {errors.phone && <span className="consultation-field-error" id="error-phone">{errors.phone}</span>}
                      </div>
                      <div className="consultation-field">
                        <label htmlFor="consultation-gender">Gender <span className="consultation-optional">Optional</span></label>
                        <select id="consultation-gender" name="gender" value={form.gender} onChange={updateField}>
                          <option value="">Prefer not to say</option>
                          <option value="female">Female</option>
                          <option value="male">Male</option>
                          <option value="non_binary">Non-binary</option>
                        </select>
                      </div>

                      <div className="consultation-field consultation-field-wide">
                        <label>Partner facility <span aria-hidden="true">*</span></label>
                        {errors.providerId && <span className="consultation-field-error" id="error-providerId">{errors.providerId}</span>}
                        <FacilityPicker
                          facilities={facilityResults}
                          facilitySearch={facilitySearch}
                          onSearchChange={setFacilitySearch}
                          selectedId={form.providerId}
                          onSelect={selectFacility}
                          loading={facilitiesLoading}
                          error={facilityError}
                          onRetry={() => setFacilityRefresh((v) => v + 1)}
                        />
                      </div>

                      <div className="consultation-field consultation-field-wide">
                        <label htmlFor="consultation-reason">Reason for consultation <span aria-hidden="true">*</span></label>
                        <textarea id="consultation-reason" name="reason" value={form.reason} onChange={updateField} rows={4} maxLength={1000} required aria-invalid={!!errors.reason} aria-describedby={errors.reason ? 'error-reason' : 'reason-help'} />
                        <span className="consultation-field-help" id={errors.reason ? 'error-reason' : 'reason-help'}>{errors.reason || `${form.reason.length}/1,000 characters.`}</span>
                      </div>
                      <div className="consultation-field consultation-field-wide">
                        <label htmlFor="consultation-preferredAt">Preferred date and time <span className="consultation-optional">Optional</span></label>
                        <input id="consultation-preferredAt" name="preferredAt" type="datetime-local" min={minimumDateTime} value={form.preferredAt} onChange={updateField} />
                        <span className="consultation-field-help">This is only a preference. We will check with you before confirming an appointment.</span>
                      </div>
                    </div>

                    <div className={`consultation-consent${errors.consentAccepted ? ' consultation-consent-error' : ''}`}>
                      <input id="consultation-consentAccepted" name="consentAccepted" type="checkbox" checked={form.consentAccepted} onChange={updateField} required aria-invalid={!!errors.consentAccepted} />
                      <div>
                        <label htmlFor="consultation-consentAccepted">I agree that CareCova may use the information I provide to process this request and contact me about it. <span aria-hidden="true">*</span></label>
                        <span className="consultation-field-help">
                          {errors.consentAccepted || <><Link to="/privacy">Privacy Policy</Link>. Sending this form does not confirm an appointment.</>}
                        </span>
                      </div>
                    </div>

                    {submitError && <div className="consultation-submit-error" role="alert">{submitError}</div>}

                    <Button type="submit" disabled={facilitiesLoading || !hasFacilities} className="consultation-submit-button">
                      Continue to Payment →
                    </Button>
                    <p className="consultation-form-footnote">
                      You will pay ₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')} by bank transfer on the next step.
                    </p>
                  </form>
                </>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
