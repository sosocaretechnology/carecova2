import { useState, useEffect } from 'react'
import { Building2, Plus, X, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Pencil, KeyRound, Trash2 } from 'lucide-react'
import { adminService } from '../../services/adminService'

const PROVIDER_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'dental', label: 'Dental' },
  { value: 'gym', label: 'Gym / Wellness' },
]

const EMPTY_FORM = {
  name: '', type: 'hospital', email: '', phone: '', address: '',
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  // Add modal
  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [showAddPassword, setShowAddPassword] = useState(false)

  // Edit modal
  const [editProvider, setEditProvider] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  // Delete confirmation
  const [deleteProvider, setDeleteProvider] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

  // Reset password modal
  const [resetProvider, setResetProvider] = useState(null)
  const [newPassword, setNewPassword] = useState('')
  const [showNewPassword, setShowNewPassword] = useState(false)
  const [resetSubmitting, setResetSubmitting] = useState(false)
  const [resetError, setResetError] = useState('')
  const [resetSuccess, setResetSuccess] = useState('')

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

  const isActive = (p) => p.status === 'active' || p.isActive === true
  const formatDate = (d) => !d ? '—' : new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' })
  const typeLabel = (type) => PROVIDER_TYPES.find((t) => t.value === type)?.label ?? type ?? '—'

  // ── Add ──────────────────────────────────────────────────────────────────────
  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddSuccess('')
    if (!addForm.name.trim()) return setAddError('Facility name is required')
    if (!addForm.email.trim()) return setAddError('Facility email is required')
    if (!addForm.phone.trim()) return setAddError('Phone number is required')
    setAddSubmitting(true)
    try {
      await adminService.createProvider({
        name: addForm.name.trim(),
        type: addForm.type,
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        ...(addForm.address.trim() ? { address: addForm.address.trim() } : {}),
      })
      setAddSuccess(`Provider "${addForm.name}" created successfully!`)
      setAddForm(EMPTY_FORM)
      await load()
      setTimeout(() => { setShowAddModal(false); setAddSuccess('') }, 2000)
    } catch (err) {
      setAddError(err.message || 'Failed to create provider')
    } finally {
      setAddSubmitting(false)
    }
  }

  // ── Edit ─────────────────────────────────────────────────────────────────────
  const openEdit = (p) => {
    setEditProvider(p)
    setEditForm({ name: p.name || '', type: p.type || 'hospital', email: p.email || '', phone: p.phone || '', address: p.address || '' })
    setEditError('')
    setEditSuccess('')
  }

  const handleEdit = async (e) => {
    e.preventDefault()
    setEditError('')
    setEditSuccess('')
    if (!editForm.name.trim()) return setEditError('Facility name is required')
    setEditSubmitting(true)
    try {
      const id = editProvider.id || editProvider._id
      await adminService.updateProvider(id, {
        name: editForm.name.trim(),
        type: editForm.type,
        email: editForm.email.trim(),
        phone: editForm.phone.trim(),
        address: editForm.address.trim(),
      })
      setEditSuccess('Provider updated successfully!')
      await load()
      setTimeout(() => { setEditProvider(null); setEditSuccess('') }, 1500)
    } catch (err) {
      setEditError(err.message || 'Failed to update provider')
    } finally {
      setEditSubmitting(false)
    }
  }

  // ── Toggle status ─────────────────────────────────────────────────────────────
  const handleToggleStatus = async (provider) => {
    const id = provider.id || provider._id
    setTogglingId(id)
    try {
      await adminService.updateProviderStatus(id, !(provider.status === 'active' || provider.isActive === true))
      await load()
    } catch (err) {
      alert(err.message || 'Failed to update provider status')
    } finally {
      setTogglingId(null)
    }
  }

  // ── Delete ────────────────────────────────────────────────────────────────────
  const handleDelete = async () => {
    setDeleteSubmitting(true)
    setDeleteError('')
    try {
      await adminService.deleteProvider(deleteProvider.id || deleteProvider._id)
      setDeleteProvider(null)
      await load()
    } catch (err) {
      setDeleteError(err.message || 'Failed to delete provider')
    } finally {
      setDeleteSubmitting(false)
    }
  }

  // ── Reset password ────────────────────────────────────────────────────────────
  const openReset = (p) => {
    setResetProvider(p)
    setNewPassword('')
    setShowNewPassword(false)
    setResetError('')
    setResetSuccess('')
  }

  const handleReset = async (e) => {
    e.preventDefault()
    setResetError('')
    setResetSuccess('')
    if (newPassword.length < 8) return setResetError('Password must be at least 8 characters')
    setResetSubmitting(true)
    try {
      const id = resetProvider.id || resetProvider._id
      const result = await adminService.resetProviderPassword(id, newPassword)
      setResetSuccess(result?.created
        ? `Portal account created! The provider can now log in with their facility email and this password.`
        : 'Password reset successfully!')
      setTimeout(() => { setResetProvider(null); setResetSuccess('') }, 2500)
    } catch (err) {
      setResetError(err.message || 'Failed to reset password')
    } finally {
      setResetSubmitting(false)
    }
  }

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
          <button onClick={load} style={btnSecondary}>
            <RefreshCw size={15} /> Refresh
          </button>
          <button onClick={() => { setShowAddModal(true); setAddForm(EMPTY_FORM); setAddError(''); setAddSuccess('') }} style={btnPrimary}>
            <Plus size={16} /> Add Provider
          </button>
        </div>
      </div>

      {error && <div style={errorBanner}>{error}</div>}

      {/* Provider Table */}
      <div style={{ background: '#fff', borderRadius: '12px', border: '1px solid #e5e7eb', overflow: 'hidden', boxShadow: '0 1px 4px rgba(0,0,0,0.05)' }}>
        {loading ? (
          <div style={{ padding: '60px', textAlign: 'center', color: '#9ca3af' }}>Loading providers…</div>
        ) : providers.length === 0 ? (
          <div style={{ padding: '60px', textAlign: 'center' }}>
            <Building2 size={44} color="#d1d5db" style={{ marginBottom: '16px' }} />
            <p style={{ margin: 0, color: '#9ca3af', fontSize: '0.9375rem', fontWeight: 500 }}>No providers yet.</p>
            <button onClick={() => setShowAddModal(true)} style={{ ...btnPrimary, marginTop: '16px' }}>
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
                  <th>Status</th>
                  <th>Added</th>
                  <th>Actions</th>
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
                          <div style={{ width: '32px', height: '32px', borderRadius: '8px', background: '#eff6ff', border: '1px solid #bfdbfe', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
                            <Building2 size={16} color="#2563eb" />
                          </div>
                          {p.name || '—'}
                        </div>
                      </td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{typeLabel(p.type)}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{p.email || '—'}</td>
                      <td style={{ color: '#6b7280', fontSize: '0.875rem' }}>{p.phone || '—'}</td>
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
                        <div style={{ display: 'flex', gap: '6px', flexWrap: 'nowrap' }}>
                          {/* Edit */}
                          <button onClick={() => openEdit(p)} title="Edit provider details" style={actionBtn('#eff6ff', '#2563eb')}>
                            <Pencil size={13} />
                          </button>
                          {/* Reset password */}
                          <button onClick={() => openReset(p)} title="Reset portal password" style={actionBtn('#fef3c7', '#d97706')}>
                            <KeyRound size={13} />
                          </button>
                          {/* Delete */}
                          <button onClick={() => { setDeleteProvider(p); setDeleteError('') }} title="Delete provider" style={actionBtn('#fef2f2', '#dc2626')}>
                            <Trash2 size={13} />
                          </button>
                          {/* Toggle status */}
                          <button
                            disabled={togglingId === id}
                            onClick={() => handleToggleStatus(p)}
                            style={{
                              padding: '5px 10px', borderRadius: '6px', border: 'none',
                              background: active ? '#fef2f2' : '#f0fdf4',
                              color: active ? '#dc2626' : '#16a34a',
                              fontWeight: 600, fontSize: '0.75rem',
                              cursor: togglingId === id ? 'wait' : 'pointer',
                              opacity: togglingId === id ? 0.6 : 1,
                              whiteSpace: 'nowrap',
                            }}
                          >
                            {togglingId === id ? 'Saving…' : active ? 'Deactivate' : 'Activate'}
                          </button>
                        </div>
                      </td>
                    </tr>
                  )
                })}
              </tbody>
            </table>
            <div style={{ padding: '12px 20px', borderTop: '1px solid #f3f4f6', fontSize: '0.8125rem', color: '#9ca3af' }}>
              {providers.length} provider{providers.length !== 1 ? 's' : ''} · {providers.filter(isActive).length} active
            </div>
          </>
        )}
      </div>

      {/* ── Add Provider Modal ───────────────────────────────────────────────── */}
      {showAddModal && (
        <Modal title="Add New Provider" subtitle="Create a facility and set up their login credentials" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd} style={{ padding: '24px' }}>
            <SectionLabel>Facility Information</SectionLabel>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <Field label="Facility Name *"><input name="name" value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lagos General Hospital" style={inputStyle} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Facility Type *">
                  <select name="type" value={addForm.type} onChange={(e) => setAddForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                    {PROVIDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Phone *"><input value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="08XXXXXXXXX" style={inputStyle} /></Field>
              </div>
              <Field label="Facility Email *"><input type="email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@facility.com" style={inputStyle} /></Field>
              <Field label="Address"><input value={addForm.address} onChange={(e) => setAddForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Street, City, State" style={inputStyle} /></Field>
            </div>

            <div style={{ borderTop: '1px solid #f3f4f6', marginBottom: '20px' }} />
            <SectionLabel>Portal Login Password (optional)</SectionLabel>
            <div style={{ marginBottom: '20px' }}>
              <Field label="Password">
                <div style={{ position: 'relative' }}>
                  <input type={showAddPassword ? 'text' : 'password'} value={addForm.password || ''} onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))} placeholder="Minimum 8 characters" style={{ ...inputStyle, paddingRight: '40px' }} />
                  <button type="button" onClick={() => setShowAddPassword(s => !s)} style={eyeBtn}>
                    {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
              </Field>
            </div>

            {addError && <div style={errorBox}>{addError}</div>}
            {addSuccess && <div style={successBox}>{addSuccess}</div>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setShowAddModal(false)} style={btnSecondary}>Cancel</button>
              <button type="submit" disabled={addSubmitting} style={btnPrimary}>{addSubmitting ? 'Creating…' : 'Create Provider'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Edit Provider Modal ──────────────────────────────────────────────── */}
      {editProvider && (
        <Modal title="Edit Provider" subtitle={`Updating details for ${editProvider.name}`} onClose={() => setEditProvider(null)}>
          <form onSubmit={handleEdit} style={{ padding: '24px' }}>
            <div style={{ display: 'grid', gap: '14px', marginBottom: '20px' }}>
              <Field label="Facility Name *"><input value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} style={inputStyle} /></Field>
              <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '14px' }}>
                <Field label="Facility Type">
                  <select value={editForm.type} onChange={(e) => setEditForm(f => ({ ...f, type: e.target.value }))} style={inputStyle}>
                    {PROVIDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                  </select>
                </Field>
                <Field label="Phone"><input value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} style={inputStyle} /></Field>
              </div>
              <Field label="Email"><input type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} style={inputStyle} /></Field>
              <Field label="Address"><input value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, State" style={inputStyle} /></Field>
            </div>
            {editError && <div style={errorBox}>{editError}</div>}
            {editSuccess && <div style={successBox}>{editSuccess}</div>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setEditProvider(null)} style={btnSecondary}>Cancel</button>
              <button type="submit" disabled={editSubmitting} style={btnPrimary}>{editSubmitting ? 'Saving…' : 'Save Changes'}</button>
            </div>
          </form>
        </Modal>
      )}

      {/* ── Delete Confirmation Modal ────────────────────────────────────────── */}
      {deleteProvider && (
        <Modal title="Delete Provider" subtitle={`Permanently remove ${deleteProvider.name}`} onClose={() => setDeleteProvider(null)}>
          <div style={{ padding: '24px' }}>
            <div style={{ padding: '14px 16px', borderRadius: '8px', background: '#fef2f2', border: '1px solid #fecaca', fontSize: '0.875rem', color: '#991b1b', marginBottom: '20px' }}>
              <strong>This cannot be undone.</strong> Deleting this provider will permanently remove their facility record and portal login account. Patient applications already linked to them will remain in the system.
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '0.9375rem', color: '#374151' }}>
              Are you sure you want to delete <strong>{deleteProvider.name}</strong>?
            </p>
            {deleteError && <div style={errorBox}>{deleteError}</div>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setDeleteProvider(null)} style={btnSecondary}>Cancel</button>
              <button
                onClick={handleDelete}
                disabled={deleteSubmitting}
                style={{ ...btnPrimary, background: deleteSubmitting ? '#fca5a5' : 'linear-gradient(135deg,#dc2626,#b91c1c)' }}
              >
                {deleteSubmitting ? 'Deleting…' : 'Yes, Delete Provider'}
              </button>
            </div>
          </div>
        </Modal>
      )}

      {/* ── Reset Password Modal ─────────────────────────────────────────────── */}
      {resetProvider && (
        <Modal title="Reset Portal Password" subtitle={`Set a new login password for ${resetProvider.name}`} onClose={() => setResetProvider(null)}>
          <form onSubmit={handleReset} style={{ padding: '24px' }}>
            <div style={{ marginBottom: '8px', padding: '12px 14px', borderRadius: '8px', background: '#fffbeb', border: '1px solid #fde68a', fontSize: '0.8125rem', color: '#92400e' }}>
              If this provider has no portal account yet, one will be created using their facility email.
              Otherwise their existing session will be invalidated and the password replaced.
            </div>
            <div style={{ marginTop: '16px', marginBottom: '20px' }}>
              <Field label="New Password">
                <div style={{ position: 'relative' }}>
                  <input
                    type={showNewPassword ? 'text' : 'password'}
                    value={newPassword}
                    onChange={(e) => { setNewPassword(e.target.value); setResetError('') }}
                    placeholder="Minimum 8 characters"
                    style={{ ...inputStyle, paddingRight: '40px' }}
                    autoFocus
                  />
                  <button type="button" onClick={() => setShowNewPassword(s => !s)} style={eyeBtn}>
                    {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                  </button>
                </div>
                {newPassword && newPassword.length < 8 && (
                  <p style={{ margin: '4px 0 0', fontSize: '0.75rem', color: '#ef4444' }}>At least 8 characters required</p>
                )}
              </Field>
            </div>
            {resetError && <div style={errorBox}>{resetError}</div>}
            {resetSuccess && <div style={successBox}>{resetSuccess}</div>}
            <div style={{ display: 'flex', gap: '12px', justifyContent: 'flex-end' }}>
              <button type="button" onClick={() => setResetProvider(null)} style={btnSecondary}>Cancel</button>
              <button type="submit" disabled={resetSubmitting || newPassword.length < 8} style={{ ...btnPrimary, background: resetSubmitting ? '#93c5fd' : 'linear-gradient(135deg,#d97706,#b45309)' }}>
                {resetSubmitting ? 'Resetting…' : 'Reset Password'}
              </button>
            </div>
          </form>
        </Modal>
      )}
    </div>
  )
}

// ── Shared sub-components ────────────────────────────────────────────────────

function Modal({ title, subtitle, onClose, children }) {
  return (
    <div style={{ position: 'fixed', inset: 0, background: 'rgba(0,0,0,0.45)', display: 'flex', alignItems: 'center', justifyContent: 'center', zIndex: 9999, padding: '16px' }}>
      <div style={{ background: '#fff', borderRadius: '16px', width: '100%', maxWidth: '520px', maxHeight: '90vh', overflowY: 'auto', boxShadow: '0 20px 60px rgba(0,0,0,0.2)' }}>
        <div style={{ padding: '20px 24px', borderBottom: '1px solid #f3f4f6', display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <div>
            <h3 style={{ margin: 0, fontSize: '1.125rem', fontWeight: 700, color: '#111827' }}>{title}</h3>
            {subtitle && <p style={{ margin: '2px 0 0', fontSize: '0.8125rem', color: '#6b7280' }}>{subtitle}</p>}
          </div>
          <button onClick={onClose} style={{ background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: '4px' }}><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}

function SectionLabel({ children }) {
  return <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', fontWeight: 700, color: '#374151', textTransform: 'uppercase', letterSpacing: '0.05em' }}>{children}</p>
}

function Field({ label, children }) {
  return (
    <div>
      <label style={{ display: 'block', fontSize: '0.8125rem', fontWeight: 500, color: '#374151', marginBottom: '6px' }}>{label}</label>
      {children}
    </div>
  )
}

// ── Styles ───────────────────────────────────────────────────────────────────

const inputStyle = {
  width: '100%', padding: '9px 12px', borderRadius: '8px',
  border: '1.5px solid #e2e8f0', fontSize: '0.875rem',
  outline: 'none', background: '#fff', boxSizing: 'border-box',
}

const btnPrimary = {
  display: 'inline-flex', alignItems: 'center', gap: '7px',
  padding: '9px 20px', borderRadius: '8px', border: 'none',
  background: 'linear-gradient(135deg, #2563eb, #1d4ed8)',
  color: '#fff', fontWeight: 600, fontSize: '0.875rem',
  cursor: 'pointer', boxShadow: '0 2px 8px rgba(37,99,235,0.25)',
}

const btnSecondary = {
  display: 'inline-flex', alignItems: 'center', gap: '6px',
  padding: '9px 16px', borderRadius: '8px', border: '1.5px solid #e2e8f0',
  background: '#fff', color: '#374151', fontWeight: 500, fontSize: '0.875rem',
  cursor: 'pointer',
}

const actionBtn = (bg, color) => ({
  width: '30px', height: '30px', borderRadius: '6px', border: 'none',
  background: bg, color, display: 'flex', alignItems: 'center', justifyContent: 'center',
  cursor: 'pointer', flexShrink: 0,
})

const eyeBtn = {
  position: 'absolute', right: '10px', top: '50%', transform: 'translateY(-50%)',
  background: 'none', border: 'none', cursor: 'pointer', color: '#9ca3af', padding: 0,
}

const errorBanner = {
  marginBottom: '20px', padding: '12px 16px', borderRadius: '8px',
  background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.875rem',
}

const errorBox = {
  marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
  background: '#fef2f2', border: '1px solid #fecaca', color: '#dc2626', fontSize: '0.875rem',
}

const successBox = {
  marginBottom: '16px', padding: '10px 14px', borderRadius: '8px',
  background: '#f0fdf4', border: '1px solid #bbf7d0', color: '#16a34a', fontSize: '0.875rem', fontWeight: 500,
}
