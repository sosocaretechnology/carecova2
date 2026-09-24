import { useEffect, useState } from 'react'
import { Building2, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'
import IconBadge from '../../components/IconBadge'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

const PROVIDER_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'dental', label: 'Dental' },
  { value: 'gym', label: 'Gym / Wellness' },
]

export default function ProviderProfile() {
  const [profile, setProfile] = useState(null)
  const [form, setForm] = useState(null)
  const [loading, setLoading] = useState(true)
  const [saving, setSaving] = useState(false)
  const [error, setError] = useState('')
  const [success, setSuccess] = useState('')
  const [editing, setEditing] = useState(false)

  useEffect(() => {
    let cancelled = false
    providerAuthService.getProfile()
      .then((data) => {
        if (!cancelled) {
          setProfile(data)
          setForm({
            name: data?.name || data?.facilityName || '',
            type: data?.type || 'clinic',
            email: data?.email || '',
            phone: data?.phone || '',
            address: data?.address || '',
            contactName: data?.contactName || data?.contactPerson || '',
          })
        }
      })
      .catch((err) => { if (!cancelled) setError(err?.message || 'Failed to load profile') })
      .finally(() => { if (!cancelled) setLoading(false) })
    return () => { cancelled = true }
  }, [])

  const handleInput = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setError('')
    setSuccess('')
  }

  const handleSave = async (e) => {
    e.preventDefault()
    if (!form.name.trim()) return setError('Facility name is required')
    if (!form.email.trim()) return setError('Email is required')
    setSaving(true)
    setError('')
    setSuccess('')
    try {
      const updated = await providerAuthService.updateProfile(form)
      setProfile(updated)
      setSuccess('Profile updated successfully!')
      setEditing(false)
    } catch (err) {
      setError(err?.message || 'Failed to update profile')
    } finally {
      setSaving(false)
    }
  }

  const handleCancel = () => {
    setEditing(false)
    setError('')
    setSuccess('')
    if (profile) {
      setForm({
        name: profile?.name || profile?.facilityName || '',
        type: profile?.type || 'clinic',
        email: profile?.email || '',
        phone: profile?.phone || '',
        address: profile?.address || '',
        contactName: profile?.contactName || profile?.contactPerson || '',
      })
    }
  }

  if (loading) return <FullScreenLoader label="Loading profile…" />

  const isActive = profile?.status === 'active' || profile?.isActive

  return (
    <div className="admin-page" style={{ maxWidth: 720 }}>
      <div className="admin-page-header">
        <div>
          <h1>Facility Profile</h1>
          <p>View and manage your facility's information</p>
        </div>
        {!editing && (
          <button onClick={() => setEditing(true)} className="button button--primary">
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div className="alert-box alert-error">
          <AlertCircle size={16} style={{ flexShrink: 0 }} /> {error}
        </div>
      )}
      {success && (
        <div className="alert-box alert-success">
          <CheckCircle size={16} style={{ flexShrink: 0 }} /> {success}
        </div>
      )}

      <div className="admin-table-container" style={{ padding: 0 }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid var(--color-border-light)', display: 'flex', alignItems: 'center', gap: 14 }}>
          <IconBadge color="blue" size="lg"><Building2 size={24} /></IconBadge>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: 'var(--color-text)' }}>
              {profile?.name || profile?.facilityName || '—'}
            </div>
            <div style={{ fontSize: 'var(--text-body-sm)', color: 'var(--color-text-muted)', marginTop: 2, textTransform: 'capitalize' }}>
              {profile?.type || '—'} &bull;{' '}
              <span style={{ color: isActive ? 'var(--color-success-text)' : 'var(--color-danger-text)', fontWeight: 600 }}>
                {profile?.status || (isActive ? 'Active' : 'Inactive')}
              </span>
            </div>
          </div>
        </div>

        <form onSubmit={handleSave} style={{ padding: 24 }}>
          <div style={{ display: 'grid', gap: 16 }}>
            <div className="cc-form-row-2">
              <div className="input-group">
                <label className="input-label">Facility Name</label>
                <input
                  name="name"
                  className="input"
                  value={form?.name || ''}
                  onChange={handleInput}
                  disabled={!editing}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Facility Type</label>
                <select
                  name="type"
                  className="input"
                  value={form?.type || ''}
                  onChange={handleInput}
                  disabled={!editing}
                >
                  {PROVIDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div className="cc-form-row-2">
              <div className="input-group">
                <label className="input-label">Email Address</label>
                <input
                  name="email"
                  type="email"
                  className="input"
                  value={form?.email || ''}
                  onChange={handleInput}
                  disabled={!editing}
                />
              </div>
              <div className="input-group">
                <label className="input-label">Phone Number</label>
                <input
                  name="phone"
                  className="input"
                  value={form?.phone || ''}
                  onChange={handleInput}
                  disabled={!editing}
                />
              </div>
            </div>

            <div className="input-group">
              <label className="input-label">Address</label>
              <input
                name="address"
                className="input"
                value={form?.address || ''}
                onChange={handleInput}
                disabled={!editing}
                placeholder={editing ? 'e.g. 123 Street, Lagos' : '—'}
              />
            </div>

            <div className="input-group">
              <label className="input-label">Contact Person</label>
              <input
                name="contactName"
                className="input"
                value={form?.contactName || ''}
                onChange={handleInput}
                disabled={!editing}
                placeholder={editing ? 'e.g. Dr. Ade Okafor' : '—'}
              />
            </div>
          </div>

          {editing && (
            <div style={{ display: 'flex', gap: 12, justifyContent: 'flex-end', marginTop: 24, paddingTop: 20, borderTop: '1px solid var(--color-border-light)' }}>
              <button type="button" onClick={handleCancel} className="button button--secondary">
                Cancel
              </button>
              <button type="submit" disabled={saving} className="button button--primary">
                <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
