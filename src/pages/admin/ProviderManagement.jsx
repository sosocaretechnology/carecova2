import { useState, useEffect } from 'react'
import { Building2, Plus, X, Eye, EyeOff, CheckCircle, XCircle, RefreshCw } from 'lucide-react'
import { adminService } from '../../services/adminService'

const PROVIDER_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'dental', label: 'Dental' },
  { value: 'gym', label: 'Gym / Wellness' },
  { value: 'pharmacy', label: 'Pharmacy' },
  { value: 'other', label: 'Other' },
]

const EMPTY_FORM = {
  name: '',
  type: 'hospital',
  email: '',
  phone: '',
  address: '',
  contactName: '',
  staffEmail: '',
  staffPassword: '',
  staffRole: 'staff',
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [showModal, setShowModal] = useState(false)
  const [form, setForm] = useState(EMPTY_FORM)
  const [submitting, setSubmitting] = useState(false)
  const [formError, setFormError] = useState('')
  const [formSuccess, setFormSuccess] = useState('')
  const [showPassword, setShowPassword] = useState(false)
  const [togglingId, setTogglingId] = useState(null)

  const load = async () => {
    setLoading(true)
    setError('')
    try {
      const data = await adminService.getProviders()
      const list = Array.isArray(data) ? data : data?.providers ?? data?.data ?? data?.items ?? []
      setProviders(list)
    } catch (err) {
      setError(err.message || 'Failed to load providers')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => { load() }, [])

  const handleInput = (e) => {
    const { name, value } = e.target
    setForm((prev) => ({ ...prev, [name]: value }))
    setFormError('')
  }

  const handleSubmit = async (e) => {
    e.preventDefault()
    setFormError('')
    setFormSuccess('')

    if (!form.name.trim()) return setFormError('Facility name is required')
    if (!form.email.trim()) return setFormError('Facility email is required')
    if (!form.phone.trim()) return setFormError('Phone number is required')
    if (!form.staffEmail.trim()) return setFormError('Staff login email is required')
    if (!form.staffPassword.trim()) return setFormError('Staff password is required')
    if (form.staffPassword.length < 8) return setFormError('Password must be at least 8 characters')

    setSubmitting(true)
    try {
      await adminService.createProvider({
        name: form.name.trim(),
        type: form.type,
        email: form.email.trim(),
        phone: form.phone.trim(),
        address: form.address.trim(),
        contactName: form.contactName.trim(),
        staffEmail: form.staffEmail.trim(),
        staffPassword: form.staffPassword,
        staffRole: form.staffRole,
      })
      setFormSuccess(`Provider "${form.name}" created successfully!`)
      setForm(EMPTY_FORM)
      await load()
      setTimeout(() => {
        setShowModal(false)
        setFormSuccess('')
      }, 2000)
    } catch (err) {
      setFormError(err.message || 'Failed to create provider')
    } finally {
      setSubmitting(false)
    }
  }

  const handleToggleStatus = async (provider) => {
    const id = provider.id || provider._id
    setTogglingId(id)
    try {
      const newStatus = (provider.status === 'active' || provider.isActive === true) ? 'inactive' : 'active'
      await adminService.updateProviderStatus(id, newStatus)
      await load()
    } catch (err) {
      alert(err.message || 'Failed to update provider status')
    } finally {
      setTogglingId(null)
    }
  }

  const isActive = (p) => p.status === 'active' || p.isActive === true

  const formatDate = (d) => {
    if (!d) return '—'
    return new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  }

  const typeLabel = (type) => PROVIDER_TYPES.find((t) => t.value === type)?.label ?? type ?? '—'

  return (
    <div>
      {/* Page Header */}
      <div style={{ marginBottom: '28px', display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: '12px' }}>
        <div>
          <h2 style={{ margin: 0, fontSize: '1.375rem', fontWeight: 700, color: '#111827' }}>Provider Management</h2>
          <p style={{ margin: '4px 0 0', fontSize: '0.875rem', color: '#6b7280' }}>
            Manage hospitals, clinics, and other healthcare providers onboarded to CareCova
          </p>
        </div>
        <div style={{ display: 'flex', gap: '10px' }}>
          <button
            onClick={load}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '6px',
              padding: '9px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
              background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem',
              cursor: 'pointer',
            }}
          >
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => { setShowModal(true); setForm(EMPTY_FORM); setFormError(''); setFormSuccess('') }}
            style={{
              display: 'inline-flex', alignItems: 'center', gap: '8px',
              padding: '10px 20px', borderRadius: '8px', border: 'none',
              background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
              color: '#fff', fontWeight: 600, fontSize: '0.875rem',
              cursor: 'pointer', boxShadow: '0 3px 10px rgba(37,99,235,0.3)',
            }}
          >
            <Plus size={16} /> Add Provider
          </button>
        </div>
      </div>

      {/* Error Banner */}
      {error && (
        <div style={{
          marginBottom: '20px', padding: '12px 16px', borderRadius: '8px',
          background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626',
          fontSize: '0.875rem',
        }}>
          {error}
        </div>
      )}

      {/* Provider Table */}
      <div style={{
        background: '#fff', borderRadius: '12px',
        border: '1px solid #e5e7eb', overflow: 'hidden',
        boxShadow: '0 1px 4px rgba(0,0,0,0.05)',
      }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>
            Loading providers…
          </div>
        ) : providers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Building2 size={44} color="#d1d5db" style={{ marginBottom: '16px' }} />
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9375rem', fontWeight: 500 }}>
              No providers yet.
            </p>
            <p style={{ margin: '4px 0 16px', color: '#d1d5db', fontSize: '0.8125rem' }}>
              Add a hospital or clinic to get started.
            </p>
            <button
              onClick={() => setShowModal(true)}
              style={{
                padding: '10px 20px', borderRadius: '8px', border: 'none',
                background: '#2563eb', color: '#fff', fontWeight: 600,
                fontSize: '0.875rem', cursor: 'pointer',
                display: 'inline-flex', alignItems: 'center', gap: '6px',
              }}
            >
              <Plus size={16} /> Add First Provider
            </button>
          </div>
        ) : (
          <>
            <table className="admin-table" style={{ margin: 0 }}>
              <thead>
                <tr>
                  <th>Facility Name</th>
                  <th>Type</th>
                  <th>Email</th>
                  <th>Phone</th>
                  <th>Patients</th>
                  <th>Status</th>
                  <th>Added</th>
                  <th>Action</th>
                </tr>
              </thead>
              <tbody>
                {providers.map((p) => {
                  const id = p.id || p._id
                  const active = isActive(p)
                  return (
                    <tr key={id}>
                      <td style={{ fontWeight: 600, color: '#111827' }}>
                        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
                          <div style={{
                            width: '32px', height: '32px', borderRadius: '8px',
                            background: '#eff6ff', border: '1px solid #bfdbfe',
                            display: 'flex', alignItems: 'center', justifyContent: 'center',
                            flexShrink: 0,
                          }}>
                            <Building2 size={16} color="#2563eb" />
                          </div>
                          {p.name || '—'}
                        </div>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{typeLabel(p.type)}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{p.email || '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{p.phone || '—'}</td>
                      <td style={{ fontWeight: 500, color: '#111827' }}>
                        {p.patientCount ?? p.totalPatients ?? '—'}
                      </td>
                      <td>
                        <span style={{
                          display: 'inline-flex', alignItems: 'center', gap: '4px',
                          padding: '3px 10px', borderRadius: '12px', fontSize: '0.75rem', fontWeight: 600,
                          background: active ? 'rgba(34,197,94,0.1)' : 'rgba(239,68,68,0.1)',
                          color: active ? '#16a34a' : '#dc2626',
                          border: `1px solid ${active ? 'rgba(34,197,94,0.2)' : 'rgba(239,68,68,0.2)'}`,
                        }}>
                          {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                          {active ? 'Active' : 'Inactive'}
                        </span>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.8125rem' }}>{formatDate(p.createdAt)}</td>
                      <td>
                        <button
                          disabled={togglingId === id}
                          onClick={() => handleToggleStatus(p)}
                          style={{
                            padding: '6px 12px', borderRadius: '6px', border: 'none',
                            background: active ? '#fef2f2' : '#f0fdf4',
                            color: active ? '#dc2626' : '#16a34a',
                            fontWeight: 600, fontSize: '0.75rem',
                            cursor: togglingId === id ? 'wait' : 'pointer',
                            opacity: togglingId === id ? 0.6 : 1,
                          }}
                        >
                          {togglingId === id ? 'Saving…' : active ? 'Deactivate' : 'Activate'}
                        </button>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', fontSize: '0.8125rem', color: '#9ca3af' }}>
              {providers.length} provider{providers.length !== 1 ? 's' : ''} total ·{' '}
              {providers.filter(isActive).length} active
            </div>
          </>
        )}
      </div>

      {/* Add Provider Modal */}
      {showModal && (
        <div style={{
          position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)',
          display: 'flex', alignItems: 'center', justifyContent: 'center',
          zIndex: 9999, padding: '16px',
        }}>
          <div style={{
            background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '560px',
            maxHeight: '90vh', overflowY: 'auto',
            boxShadow: '0 20px 60px rgba(0,0,0,0.2)',
          }}>
            {/* Modal Header */}
            <div style={{
              padding: '20px 24px', borderBottom: '1px solid #f3f4f6',
              display: 'flex', alignItems: 'center', justifyContent: 'space-between',
            }}>
              <div>
                <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>
                  Add New Provider
                </h3>
                <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>
                  Create a facility and set up their login credentials
                </p>
              </div>
              <button
                onClick={() => setShowModal(false)}
                style={{
                  background: 'none', border: 'none', cursor: 'pointer',
                  color: '#9ca3af', padding: '4px',
                }}
              >
                <X size={20} />
              </button>
            </div>

            {/* Modal Form */}
            <form onSubmit={handleSubmit} style={{ padding: '24px' }}>
              {/* Section: Facility Info */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Facility Information
                </p>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Facility Name *</label>
                    <input
                      name="name" value={form.name} onChange={handleInput}
                      placeholder="e.g. Lagos General Hospital"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                  <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                    <div>
                      <label style={labelStyle}>Facility Type *</label>
                      <select
                        name="type" value={form.type} onChange={handleInput}
                        style={{ ...inputStyle, cursor: 'pointer' }}
                        onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                        onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                      >
                        {PROVIDER_TYPES.map((t) => (
                          <option key={t.value} value={t.value}>{t.label}</option>
                        ))}
                      </select>
                    </div>
                    <div>
                      <label style={labelStyle}>Phone *</label>
                      <input
                        name="phone" value={form.phone} onChange={handleInput}
                        placeholder="08XXXXXXXXX"
                        style={inputStyle}
                        onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                        onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                      />
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Facility Email *</label>
                    <input
                      name="email" type="email" value={form.email} onChange={handleInput}
                      placeholder="contact@facility.com"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Address</label>
                    <input
                      name="address" value={form.address} onChange={handleInput}
                      placeholder="123 Street, City, State"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Contact Person Name</label>
                    <input
                      name="contactName" value={form.contactName} onChange={handleInput}
                      placeholder="e.g. Dr. Ade Okafor"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                </div>
              </div>

              {/* Divider */}
              <div style={{ borderTop: '1px solid #f3f4f6', marginBottom: '20px' }} />

              {/* Section: Login Credentials */}
              <div style={{ marginBottom: '20px' }}>
                <p style={{ margin: '0 0 4px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Portal Login Credentials
                </p>
                <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', color: '#9ca3af' }}>
                  These credentials will be shared with the provider to access the portal.
                </p>
                <div style={{ display: 'grid', gap: '14px' }}>
                  <div>
                    <label style={labelStyle}>Login Email *</label>
                    <input
                      name="staffEmail" type="email" value={form.staffEmail} onChange={handleInput}
                      placeholder="staff@facility.com"
                      style={inputStyle}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    />
                  </div>
                  <div>
                    <label style={labelStyle}>Password *</label>
                    <div style={{ position: 'relative' }}>
                      <input
                        name="staffPassword" type={showPassword ? 'text' : 'password'}
                        value={form.staffPassword} onChange={handleInput}
                        placeholder="Minimum 8 characters"
                        style={{ ...inputStyle, paddingRight: '40px' }}
                        onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                        onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                      />
                      <button
                        type="button"
                        onClick={() => setShowPassword((s) => !s)}
                        style={{
                          position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
                          background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0,
                        }}
                      >
                        {showPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                      </button>
                    </div>
                  </div>
                  <div>
                    <label style={labelStyle}>Staff Role</label>
                    <select
                      name="staffRole" value={form.staffRole} onChange={handleInput}
                      style={{ ...inputStyle, cursor: 'pointer' }}
                      onFocus={(e) => (e.target.style.borderColor = '#2563eb')}
                      onBlur={(e) => (e.target.style.borderColor = '#e2e8f0')}
                    >
                      <option value="staff">Staff</option>
                      <option value="provider_admin">Provider Admin</option>
                    </select>
                  </div>
                </div>
              </div>

              {/* Feedback */}
              {formError && (
                <div style={{
                  marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
                  background: '#fef2f2', border: '1px solid #fecaca',
                  color: '#dc2626', fontSize: '0.875rem',
                }}>
                  {formError}
                </div>
              )}
              {formSuccess && (
                <div style={{
                  marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
                  background: '#f0fdf4', border: '1px solid #bbf7d0',
                  color: '#16a34a', fontSize: '0.875rem', fontWeight: 500,
                }}>
                  {formSuccess}
                </div>
              )}

              {/* Actions */}
              <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
                <button
                  type="button"
                  onClick={() => setShowModal(false)}
                  style={{
                    padding: '10px 20px', borderRadius: '8px',
                    border: '1.5px solid #e2e8f0', background: '#fff',
                    color: '#374151', fontWeight: 500, fontSize: '0.875rem',
                    cursor: 'pointer',
                  }}
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  style={{
                    padding: '10px 24px', borderRadius: '8px', border: 'none',
                    background: submitting ? '#93c5fd' : 'linear-gradient(135deg, #2563eb, #1d4ed8)',
                    color: '#fff', fontWeight: 600, fontSize: '0.875rem',
                    cursor: submitting ? 'wait' : 'pointer',
                  }}
                >
                  {submitting ? 'Creating…' : 'Create Provider'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  )
}

const labelStyle = {
  display: 'block',
  fontSize: '0.8125rem',
  fontWeight: 500,
  color: '#374151',
  marginBottom: '6px',
}

const inputStyle = {
  width: '100%',
  padding: '9px 12px',
  borderRadius: '8px',
  border: '1.5px solid #e2e8f0',
  fontSize: '0.875rem',
  outline: 'none',
  background: '#fff',
  boxSizing: 'border-box',
  transition: 'border-color 0.15s',
}
