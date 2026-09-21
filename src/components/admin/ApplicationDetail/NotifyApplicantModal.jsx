import { useState } from 'react'
import { adminService } from '../../../services/adminService'

const NOTIFICATION_TYPES = [
  { value: 'accepted', label: 'Application Approved', color: '#15803d', bg: '#f0fdf4', border: '#86efac' },
  { value: 'rejected', label: 'Application Not Approved', color: '#dc2626', bg: '#fef2f2', border: '#fca5a5' },
  { value: 'under_review', label: 'Under Review', color: '#d97706', bg: '#fffbeb', border: '#fde68a' },
  { value: 'needs_info', label: 'Additional Info Required', color: '#2563eb', bg: '#eff6ff', border: '#bfdbfe' },
  { value: 'custom', label: 'Custom Message', color: '#6b7280', bg: '#f9fafb', border: '#e5e7eb' },
]

export default function NotifyApplicantModal({ loan, onClose }) {
  const [type, setType] = useState('under_review')
  const [message, setMessage] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [sent, setSent] = useState(false)
  const [sentTo, setSentTo] = useState('')

  const selected = NOTIFICATION_TYPES.find((t) => t.value === type)

  const handleSend = async (e) => {
    e.preventDefault()
    setError('')
    setLoading(true)
    try {
      const result = await adminService.notifyApplicant(loan.id, type, message || undefined)
      setSentTo(result.sentTo)
      setSent(true)
    } catch (err) {
      setError(err.message || 'Failed to send notification')
    } finally {
      setLoading(false)
    }
  }

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div
        className="modal-content modal-content--sm"
        onClick={(e) => e.stopPropagation()}
        style={{ maxWidth: '480px' }}
      >
        <div className="modal-header">
          <h2>Notify Applicant</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">×</button>
        </div>

        {sent ? (
          <div className="modal-body">
            <div style={{ textAlign: 'center', padding: '16px 0' }}>
              <div style={{ fontSize: '2.5rem', marginBottom: '12px' }}>✅</div>
              <p style={{ fontWeight: 700, fontSize: '1rem', color: '#15803d', marginBottom: '6px' }}>Notification Sent</p>
              <p style={{ color: '#6b7280', fontSize: '0.875rem' }}>
                Email sent to <strong>{sentTo}</strong>
              </p>
            </div>
            <div className="modal-footer" style={{ marginTop: '16px' }}>
              <button className="button button--primary" onClick={onClose}>Done</button>
            </div>
          </div>
        ) : (
          <form onSubmit={handleSend}>
            <div className="modal-body">
              <p style={{ marginBottom: '16px', fontSize: '0.875rem', color: '#6b7280' }}>
                Sending to: <strong style={{ color: '#374151' }}>{loan.email || 'No email on file'}</strong>
              </p>

              {!loan.email && (
                <div className="alert-box alert-error" style={{ marginBottom: '12px' }}>
                  This application has no email address — the notification cannot be sent.
                </div>
              )}

              <div className="input-group">
                <label className="input-label">Notification Type *</label>
                <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                  {NOTIFICATION_TYPES.map((t) => (
                    <label
                      key={t.value}
                      style={{
                        display: 'flex', alignItems: 'center', gap: '10px',
                        padding: '10px 14px', borderRadius: '8px', cursor: 'pointer',
                        border: `1.5px solid ${type === t.value ? t.border : '#e5e7eb'}`,
                        background: type === t.value ? t.bg : '#fff',
                        transition: 'all 0.15s',
                      }}
                    >
                      <input
                        type="radio"
                        name="notifType"
                        value={t.value}
                        checked={type === t.value}
                        onChange={() => setType(t.value)}
                        style={{ accentColor: t.color }}
                      />
                      <span style={{ fontWeight: 600, color: type === t.value ? t.color : '#374151', fontSize: '0.875rem' }}>
                        {t.label}
                      </span>
                    </label>
                  ))}
                </div>
              </div>

              <div className="input-group" style={{ marginTop: '16px' }}>
                <label className="input-label">
                  {type === 'custom' ? 'Message *' : 'Additional Note (optional)'}
                </label>
                <textarea
                  className="input"
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder={
                    type === 'custom'
                      ? 'Write your message to the applicant…'
                      : 'Add any extra context for the applicant (optional)…'
                  }
                  required={type === 'custom'}
                  style={{ resize: 'vertical', minHeight: '72px' }}
                />
              </div>

              {error && (
                <div className="alert-box alert-error" style={{ marginTop: '10px' }}>{error}</div>
              )}
            </div>
            <div className="modal-footer">
              <button
                type="submit"
                className="button button--primary"
                disabled={loading || !loan.email}
                style={{ background: selected?.color, borderColor: selected?.color }}
              >
                {loading ? 'Sending…' : 'Send Notification'}
              </button>
              <button type="button" className="button button--secondary" onClick={onClose}>
                Cancel
              </button>
            </div>
          </form>
        )}
      </div>
    </div>
  )
}
