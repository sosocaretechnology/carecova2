import { useEffect, useState } from 'react'
import { Building2, Save, AlertCircle, CheckCircle } from 'lucide-react'
import { providerAuthService } from '../../services/providerAuthService'

const PROVIDER_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'dental', label: 'Dental' },
  { value: 'gym', label: 'Gym / Wellness' },
]

const fieldStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px',
}

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

  if (loading) {
    return <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading profile…</div>
  }

  return (
    <div style={{ maxWidth: '680px' }}>
      <div style={{ marginBottom: '24px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>Facility Profile</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            View and manage your facility's information
          </p>
        </div>
        {!editing && (
          <button
            onClick={() => setEditing(true)}
            style={{
              padding: '9px 20px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: 'pointer',
            }}
          >
            Edit Profile
          </button>
        )}
      </div>

      {error && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <AlertCircle size={16} /> {error}
        </div>
      )}

      {success && (
        <div style={{
          marginBottom: '16px', padding: '12px 16px', borderRadius: '8px',
          background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a',
          fontSize: '0.875rem', display: 'flex', alignItems: 'center', gap: '8px',
        }}>
          <CheckCircle size={16} /> {success}
        </div>
      )}

      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {/* Header */}
        <div style={{
          padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
          display: 'flex', alignItems: 'center', gap: '14px',
        }}>
          <div style={{
            width: '52px', height: '52px', borderRadius: '12px', background: '#eff6ff',
            border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center',
          }}>
            <Building2 size={24} color="#2563eb" />
          </div>
          <div>
            <div style={{ fontSize: '1rem', fontWeight: 700, color: '#111827' }}>
              {profile?.name || profile?.facilityName || '—'}
            </div>
            <div style={{ fontSize: '0.8125rem', color: '#6b7280', marginTop: '2px', textTransform: 'capitalize' }}>
              {profile?.type || '—'} &bull;{' '}
              <span style={{ color: profile?.status === 'active' || profile?.isActive ? '#16a34a' : '#dc2626', fontWeight: 600 }}>
                {profile?.status || (profile?.isActive ? 'Active' : 'Inactive')}
              </span>
            </div>
          </div>
        </div>

        {/* Form / View */}
        <form onSubmit={handleSave} style={{ padding: '24px' }}>
          <div style={{ display: 'grid', gap: '16px' }}>
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Facility Name</label>
                <input
                  name="name"
                  value={form?.name || ''}
                  onChange={handleInput}
                  disabled={!editing}
                  style={{ ...fieldStyle, background: editing ? '#fff' : '#f9fafb', color: editing ? '#111827' : '#6b7280' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Facility Type</label>
                <select
                  name="type"
                  value={form?.type || ''}
                  onChange={handleInput}
                  disabled={!editing}
                  style={{ ...fieldStyle, background: editing ? '#fff' : '#f9fafb', color: editing ? '#111827' : '#6b7280', cursor: editing ? 'pointer' : 'default' }}
                >
                  {PROVIDER_TYPES.map((t) => (
                    <option key={t.value} value={t.value}>{t.label}</option>
                  ))}
                </select>
              </div>
            </div>

            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px' }}>
              <div>
                <label style={labelStyle}>Email Address</label>
                <input
                  name="email"
                  type="email"
                  value={form?.email || ''}
                  onChange={handleInput}
                  disabled={!editing}
                  style={{ ...fieldStyle, background: editing ? '#fff' : '#f9fafb', color: editing ? '#111827' : '#6b7280' }}
                />
              </div>
              <div>
                <label style={labelStyle}>Phone Number</label>
                <input
                  name="phone"
                  value={form?.phone || ''}
                  onChange={handleInput}
                  disabled={!editing}
                  style={{ ...fieldStyle, background: editing ? '#fff' : '#f9fafb', color: editing ? '#111827' : '#6b7280' }}
                />
              </div>
            </div>

            <div>
              <label style={labelStyle}>Address</label>
              <input
                name="address"
                value={form?.address || ''}
                onChange={handleInput}
                disabled={!editing}
                placeholder={editing ? 'e.g. 123 Street, Lagos' : '—'}
                style={{ ...fieldStyle, background: editing ? '#fff' : '#f9fafb', color: editing ? '#111827' : '#6b7280' }}
              />
            </div>

            <div>
              <label style={labelStyle}>Contact Person</label>
              <input
                name="contactName"
                value={form?.contactName || ''}
                onChange={handleInput}
                disabled={!editing}
                placeholder={editing ? 'e.g. Dr. Ade Okafor' : '—'}
                style={{ ...fieldStyle, background: editing ? '#fff' : '#f9fafb', color: editing ? '#111827' : '#6b7280' }}
              />
            </div>
          </div>

          {editing && (
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end', marginTop: '24px', paddingTop: '20px', borderTop: '1px solid #f3f4f6' }}>
              <button
                type="button"
                onClick={handleCancel}
                style={{
                  padding: '9px 20px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
                  background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem', cursor: 'pointer',
                }}
              >
                Cancel
              </button>
              <button
                type="submit"
                disabled={saving}
                style={{
                  display: 'inline-flex', alignItems: 'center', gap: '6px',
                  padding: '9px 24px', borderRadius: '8px', border: 'none',
                  background: saving ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                  color: '#fff', fontWeight: 600, fontSize: '0.875rem', cursor: saving ? 'wait' : 'pointer',
                }}
              >
                <Save size={15} /> {saving ? 'Saving…' : 'Save Changes'}
              </button>
            </div>
          )}
        </form>
      </div>
    </div>
  )
}
