const EMAIL_PATTERN = /^[^\s@]+@[^\s@]+\.[^\s@]+$/
const PHONE_PATTERN = /^(?:\+?\d{10,15}|0\d{9,10})$/

export function validateConsultationBooking(values, now = Date.now()) {
  const errors = {}
  const fullName = String(values.fullName || '').trim()
  const email = String(values.email || '').trim()
  const phone = String(values.phone || '').replace(/[\s()-]/g, '')
  const reason = String(values.reason || '').trim()
  const healthHistory = String(values.healthHistory || '').trim()

  if (fullName.length < 2) errors.fullName = 'Enter your full name.'
  else if (fullName.length > 120) errors.fullName = 'Name must be 120 characters or fewer.'

  if (!EMAIL_PATTERN.test(email) || email.length > 254) errors.email = 'Enter a valid email address.'
  if (!PHONE_PATTERN.test(phone)) errors.phone = 'Enter a valid phone number, including the country code if needed.'
  if (!String(values.providerId || '').trim()) errors.providerId = 'Choose a partner facility.'
  if (reason.length < 2) errors.reason = 'Tell us briefly what you would like to discuss.'
  else if (reason.length > 1000) errors.reason = 'Please keep this to 1,000 characters or fewer.'
  if (healthHistory.length > 1500) errors.healthHistory = 'Please keep this to 1,500 characters or fewer.'

  if (values.preferredAt) {
    const preferredAt = new Date(values.preferredAt).getTime()
    if (!Number.isFinite(preferredAt) || preferredAt <= now) {
      errors.preferredAt = 'Choose a future date and time, or leave this blank.'
    }
  }

  if (!values.consentAccepted) errors.consentAccepted = 'Consent is required to send this request.'
  return errors
}
