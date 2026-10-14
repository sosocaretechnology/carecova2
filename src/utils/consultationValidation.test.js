import test from 'node:test'
import assert from 'node:assert/strict'
import { validateConsultationBooking } from './consultationValidation.js'
import { readFileSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { CONSULTATION_BOOKING_PATH } from '../constants/consultation.js'

const validRequest = {
  fullName: 'Ada Okafor',
  email: 'ada@example.com',
  phone: '+2348012345678',
  providerId: '507f1f77bcf86cd799439011',
  reason: 'I would like to discuss a routine health concern.',
  healthHistory: '',
  preferredAt: '',
  consentAccepted: true,
}

test('accepts a valid free-consultation request', () => {
  assert.deepEqual(validateConsultationBooking(validRequest), {})
})

test('reports required and malformed contact/form fields', () => {
  const errors = validateConsultationBooking({ ...validRequest, fullName: ' ', email: 'bad', phone: '1', providerId: '', reason: '', consentAccepted: false })
  assert.equal(errors.fullName, 'Enter your full name.')
  assert.equal(errors.email, 'Enter a valid email address.')
  assert.match(errors.phone, /valid phone number/)
  assert.equal(errors.providerId, 'Choose a partner facility.')
  assert.match(errors.reason, /discuss/)
  assert.match(errors.consentAccepted, /required/)
})

test('enforces reason and optional history length limits', () => {
  const errors = validateConsultationBooking({ ...validRequest, reason: 'x'.repeat(1001), healthHistory: 'x'.repeat(1501) })
  assert.match(errors.reason, /1,000/)
  assert.match(errors.healthHistory, /1,500/)
})

test('rejects a preferred date/time in the past', () => {
  const errors = validateConsultationBooking({ ...validRequest, preferredAt: '2026-10-12T10:00' }, new Date('2026-10-13T00:00:00').getTime())
  assert.match(errors.preferredAt, /future/)
})

test('homepage CTA and public router point to the consultation booking page', () => {
  const here = fileURLToPath(new URL('.', import.meta.url))
  const app = readFileSync(`${here}../App.jsx`, 'utf8')
  const home = readFileSync(`${here}../pages/Home.jsx`, 'utf8')
  assert.equal(CONSULTATION_BOOKING_PATH, '/consultation')
  assert.match(app, /Route path=\{CONSULTATION_BOOKING_PATH\} element=\{<ConsultationBooking \/>\}/)
  assert.match(home, /<Link to=\{CONSULTATION_BOOKING_PATH\}>[\s\S]*?Book a Free Consultation/)
})
