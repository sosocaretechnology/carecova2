import { useEffect, useMemo, useRef, useState } from 'react'
import { Link } from 'react-router-dom'
import { ArrowLeft, CheckCircle2, Clock3, ShieldCheck } from 'lucide-react'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import { consultationService } from '../services/consultationService'
import { validateConsultationBooking } from '../utils/consultationValidation'
import './ConsultationBooking.css'

const INITIAL_FORM = {
  fullName: '',
  email: '',
  phone: '',
  gender: '',
  providerId: '',
  reason: '',
  healthHistory: '',
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

export default function ConsultationBooking() {
  const [form, setForm] = useState(INITIAL_FORM)
  const [errors, setErrors] = useState({})
  const [config, setConfig] = useState(null)
  const [configError, setConfigError] = useState('')
  const [facilitySearch, setFacilitySearch] = useState('')
  const [facilityRefresh, setFacilityRefresh] = useState(0)
  const [facilityResults, setFacilityResults] = useState([])
  const [facilities, setFacilities] = useState({})
  const [facilitiesLoading, setFacilitiesLoading] = useState(true)
  const [facilityError, setFacilityError] = useState('')
  const [submitting, setSubmitting] = useState(false)
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

  useEffect(() => {
    loadConfig()
  }, [])

  useEffect(() => {
    let active = true
    setFacilitiesLoading(true)
    setFacilityError('')
    const timer = window.setTimeout(async () => {
      try {
        const results = await consultationService.searchFacilities(facilitySearch)
        if (!active) return
        setFacilityResults(results)
        setFacilities((current) => ({
          ...current,
          ...Object.fromEntries(results.map((facility) => [facility.id, facility])),
        }))
      } catch (error) {
        if (!active) return
        setFacilityError(error.message || 'Partner facilities could not be loaded.')
        setFacilityResults([])
      } finally {
        if (active) setFacilitiesLoading(false)
      }
    }, facilitySearch ? 250 : 0)

    return () => {
      active = false
      window.clearTimeout(timer)
    }
  }, [facilitySearch, facilityRefresh])

  const selectedFacility = facilities[form.providerId]
  const visibleFacilities = useMemo(() => {
    if (!selectedFacility || facilityResults.some((facility) => facility.id === selectedFacility.id)) {
      return facilityResults
    }
    return [selectedFacility, ...facilityResults]
  }, [facilityResults, selectedFacility])

  const hasFacilities = Object.keys(facilities).length > 0
  const bookingAvailable = config?.available === true && !configError
  const minimumDateTime = toLocalDateTimeValue(new Date())

  const updateField = (event) => {
    const { name, value, type, checked } = event.target
    setForm((current) => ({ ...current, [name]: type === 'checkbox' ? checked : value }))
    setErrors((current) => ({ ...current, [name]: '' }))
    setSubmitError('')
  }

  const handleSubmit = async (event) => {
    event.preventDefault()
    if (submittingRef.current) return

    const nextErrors = validateConsultationBooking(form)
    setErrors(nextErrors)
    setSubmitError('')
    if (Object.keys(nextErrors).length) {
      const firstField = Object.keys(nextErrors)[0]
      document.getElementById(`consultation-${firstField}`)?.focus()
      return
    }
    if (!idempotencyKey.current) {
      setSubmitError('This browser could not securely prepare the request. Please reload the page and try again.')
      return
    }

    submittingRef.current = true
    setSubmitting(true)
    try {
      const payload = {
        ...form,
        fullName: form.fullName.trim(),
        email: form.email.trim().toLowerCase(),
        phone: form.phone.trim(),
        reason: form.reason.trim(),
        healthHistory: form.healthHistory.trim() || undefined,
        preferredAt: form.preferredAt ? new Date(form.preferredAt).toISOString() : undefined,
        consentAccepted: true,
      }
      const result = await consultationService.submitBooking(payload, idempotencyKey.current)
      setReceipt(result)
    } catch (error) {
      setSubmitError(error.message || 'We could not send your request. Please try again.')
    } finally {
      submittingRef.current = false
      setSubmitting(false)
    }
  }

  const resetForm = () => {
    setForm(INITIAL_FORM)
    setReceipt(null)
    setErrors({})
    setSubmitError('')
    idempotencyKey.current = makeIdempotencyKey()
  }

  return (
    <>
      <Header />
      <main className="consultation-page">
        <section className="consultation-intro">
          <div className="container consultation-intro-inner">
            <Link to="/" className="consultation-back"><ArrowLeft size={17} aria-hidden="true" /> Back to CareCova</Link>
            <p className="eyebrow">A helpful first conversation</p>
            <h1>Book a Free Consultation</h1>
            <p className="consultation-intro-copy">
              Speak with us about your healthcare needs. Request a free, 30-minute introductory consultation with a participating healthcare facility. Our team will contact you to confirm your appointment.
            </p>
            <div className="consultation-offer-points">
              <span><Clock3 size={18} aria-hidden="true" /> 30 minutes</span>
              <span><CheckCircle2 size={18} aria-hidden="true" /> Free during our launch period</span>
              <span><ShieldCheck size={18} aria-hidden="true" /> Your request is not yet an appointment</span>
            </div>
          </div>
        </section>

        <section className="section consultation-form-section">
          <div className="container consultation-layout">
            <aside className="consultation-sidebar">
              <h2>What happens next?</h2>
              <ol>
                <li><span>1</span><div><strong>Send your request</strong><p>Choose a participating facility and tell us what you would like to discuss.</p></div></li>
                <li><span>2</span><div><strong>Our team contacts you</strong><p>We will call, text, or email to agree on a suitable time.</p></div></li>
                <li><span>3</span><div><strong>Appointment confirmed</strong><p>Your appointment is confirmed only after we contact you and agree on the details.</p></div></li>
              </ol>
              <p className="consultation-sidebar-note">If you need urgent medical attention, contact local emergency services or visit a nearby emergency department.</p>
            </aside>

            <div className="consultation-card">
              {receipt ? (
                <div className="consultation-success" role="status" aria-live="polite">
                  <span className="consultation-success-icon"><CheckCircle2 size={28} aria-hidden="true" /></span>
                  <p className="eyebrow">Request received</p>
                  <h2>Thanks, {form.fullName.trim().split(/\s+/)[0] || 'we have your request'}.</h2>
                  <p>Your request is pending confirmation. The CareCova team will contact you to agree on an appointment. This submission does not confirm an appointment or guarantee immediate access to a clinician.</p>
                  <div className="consultation-reference"><span>Request reference</span><strong>{receipt.bookingReference}</strong></div>
                  <p className="consultation-success-meta">{receipt.facilityName} · Free · {receipt.durationMinutes} minutes</p>
                  <Button variant="secondary" onClick={resetForm}>Send another request</Button>
                </div>
              ) : configError ? (
                <div className="consultation-unavailable" role="alert">
                  <p className="eyebrow">Booking unavailable</p>
                  <h2>We could not load the booking service.</h2>
                  <p>{configError}</p>
                  <Button variant="secondary" onClick={loadConfig}>Try again</Button>
                  <a href="mailto:support@carecova.com">Contact our team</a>
                </div>
              ) : !config ? (
                <div className="consultation-loading" role="status" aria-live="polite">Loading consultation details…</div>
              ) : !bookingAvailable ? (
                <div className="consultation-unavailable" role="status">
                  <p className="eyebrow">Booking unavailable</p>
                  <h2>We are preparing consultation bookings.</h2>
                  <p>Please contact our team and we will help you with the next step.</p>
                  <a href="mailto:support@carecova.com">Contact support@carecova.com</a>
                </div>
              ) : (
                <>
                  <div className="consultation-form-heading">
                    <div><p className="eyebrow">Free during launch</p><h2>Request your consultation</h2></div>
                    <span className="consultation-price">₦0</span>
                  </div>
                  <p className="consultation-form-lead">Share the details below and our team will follow up to confirm a date and time.</p>

                  {!hasFacilities && !facilitiesLoading && !facilityError && (
                    <div className="consultation-inline-message" role="status">
                      No participating facilities are available right now. Please <a href="mailto:support@carecova.com">contact our team</a> for assistance.
                    </div>
                  )}

                  {facilityError && (
                    <div className="consultation-inline-message consultation-inline-error" role="alert">
                      {facilityError} <button type="button" onClick={() => setFacilityRefresh((value) => value + 1)}>Retry</button>
                    </div>
                  )}

                  <form onSubmit={handleSubmit} noValidate>
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
                        <label htmlFor="consultation-facilitySearch">Search partner facilities by name or location</label>
                        <input id="consultation-facilitySearch" type="search" autoComplete="off" placeholder="Search by facility name or location" value={facilitySearch} onChange={(event) => setFacilitySearch(event.target.value)} />
                        <label htmlFor="consultation-providerId">Partner facility <span aria-hidden="true">*</span></label>
                        <select id="consultation-providerId" name="providerId" value={form.providerId} onChange={updateField} required disabled={facilitiesLoading || !hasFacilities} aria-invalid={!!errors.providerId} aria-describedby={errors.providerId ? 'error-providerId' : 'facility-help'}>
                          <option value="">{facilitiesLoading ? 'Loading partner facilities…' : hasFacilities ? 'Select a partner facility' : 'No facilities available'}</option>
                          {visibleFacilities.map((facility) => (
                            <option key={facility.id} value={facility.id}>{facility.name}{facility.address ? ` — ${facility.address}` : ''}</option>
                          ))}
                        </select>
                        {!facilitiesLoading && facilitySearch.trim() && !facilityResults.length && !facilityError && <span className="consultation-field-help">No active partner facilities match that search.</span>}
                        {!errors.providerId && <span className="consultation-field-help" id="facility-help">Options come from currently active CareCova partner facilities.</span>}
                        {errors.providerId && <span className="consultation-field-error" id="error-providerId">{errors.providerId}</span>}
                      </div>
                      <div className="consultation-field consultation-field-wide">
                        <label htmlFor="consultation-reason">Reason for consultation <span aria-hidden="true">*</span></label>
                        <textarea id="consultation-reason" name="reason" value={form.reason} onChange={updateField} rows={4} maxLength={1000} required aria-invalid={!!errors.reason} aria-describedby={errors.reason ? 'error-reason' : 'reason-help'} />
                        <span className="consultation-field-help" id={errors.reason ? 'error-reason' : 'reason-help'}>{errors.reason || `${form.reason.length}/1,000 characters. Keep details brief; do not include information you do not need us to know.`}</span>
                      </div>
                      <div className="consultation-field consultation-field-wide">
                        <label htmlFor="consultation-healthHistory">Relevant medical history <span className="consultation-optional">Optional</span></label>
                        <textarea id="consultation-healthHistory" name="healthHistory" value={form.healthHistory} onChange={updateField} rows={3} maxLength={1500} aria-invalid={!!errors.healthHistory} aria-describedby={errors.healthHistory ? 'error-healthHistory' : 'history-help'} />
                        <span className="consultation-field-help" id={errors.healthHistory ? 'error-healthHistory' : 'history-help'}>{errors.healthHistory || 'Only share history relevant to this request. This information is encrypted and visible only to admin and customer-service staff.'}</span>
                      </div>
                      <div className="consultation-field consultation-field-wide">
                        <label htmlFor="consultation-preferredAt">Preferred date and time <span className="consultation-optional">Optional</span></label>
                        <input id="consultation-preferredAt" name="preferredAt" type="datetime-local" min={minimumDateTime} value={form.preferredAt} onChange={updateField} aria-invalid={!!errors.preferredAt} aria-describedby={errors.preferredAt ? 'error-preferredAt' : 'preferred-help'} />
                        <span className="consultation-field-help" id={errors.preferredAt ? 'error-preferredAt' : 'preferred-help'}>{errors.preferredAt || 'This is only a preference. We will check with you before confirming an appointment.'}</span>
                      </div>
                    </div>

                    <div className={`consultation-consent${errors.consentAccepted ? ' consultation-consent-error' : ''}`}>
                      <input id="consultation-consentAccepted" name="consentAccepted" type="checkbox" checked={form.consentAccepted} onChange={updateField} required aria-invalid={!!errors.consentAccepted} aria-describedby={errors.consentAccepted ? 'error-consentAccepted' : 'consent-help'} />
                      <div>
                        <label htmlFor="consultation-consentAccepted">I agree that CareCova may use the information I provide to process this request and contact me about it. <span aria-hidden="true">*</span></label>
                        <span className="consultation-field-help" id={errors.consentAccepted ? 'error-consentAccepted' : 'consent-help'}>{errors.consentAccepted || <>Read our <Link to="/privacy">Privacy Policy</Link>. Sending this form does not confirm an appointment.</>}</span>
                      </div>
                    </div>

                    {submitError && <div className="consultation-submit-error" role="alert">{submitError}</div>}
                    <Button type="submit" disabled={submitting || facilitiesLoading || !hasFacilities} className="consultation-submit-button">
                      {submitting ? 'Sending request…' : 'Request my free consultation'}
                    </Button>
                    <p className="consultation-form-footnote">No payment is required to submit this request.</p>
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
