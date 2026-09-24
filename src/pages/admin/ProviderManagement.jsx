import { useState, useEffect } from 'react'
import { Building2, Plus, X, Eye, EyeOff, CheckCircle, XCircle, RefreshCw, Pencil, KeyRound, Trash2 } from 'lucide-react'
import { adminService } from '../../services/adminService'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

const PROVIDER_TYPES = [
  { value: 'hospital', label: 'Hospital' },
  { value: 'clinic', label: 'Clinic' },
  { value: 'dental', label: 'Dental' },
  { value: 'gym', label: 'Gym / Wellness' },
]

const EMPTY_FORM = {
  name: '', type: 'hospital', email: '', phone: '', address: '',
  accountName: '', accountNumber: '', bankCode: '',
}

export default function ProviderManagement() {
  const [providers, setProviders] = useState([])
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')
  const [togglingId, setTogglingId] = useState(null)

  const [showAddModal, setShowAddModal] = useState(false)
  const [addForm, setAddForm] = useState(EMPTY_FORM)
  const [addSubmitting, setAddSubmitting] = useState(false)
  const [addError, setAddError] = useState('')
  const [addSuccess, setAddSuccess] = useState('')
  const [showAddPassword, setShowAddPassword] = useState(false)

  const [editProvider, setEditProvider] = useState(null)
  const [editForm, setEditForm] = useState(EMPTY_FORM)
  const [editSubmitting, setEditSubmitting] = useState(false)
  const [editError, setEditError] = useState('')
  const [editSuccess, setEditSuccess] = useState('')

  const [deleteProvider, setDeleteProvider] = useState(null)
  const [deleteSubmitting, setDeleteSubmitting] = useState(false)
  const [deleteError, setDeleteError] = useState('')

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

  const handleAdd = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddSuccess('')
    if (!addForm.name.trim()) return setAddError('Facility name is required')
    if (!addForm.email.trim()) return setAddError('Facility email is required')
    if (!addForm.phone.trim()) return setAddError('Phone number is required')
    if (!addForm.password?.trim()) return setAddError('Initial password is required')
    if (addForm.password.length < 8) return setAddError('Password must be at least 8 characters')
    setAddSubmitting(true)
    try {
      const created = await adminService.createProvider({
        name: addForm.name.trim(),
        type: addForm.type,
        email: addForm.email.trim(),
        phone: addForm.phone.trim(),
        ...(addForm.address?.trim() ? { address: addForm.address.trim() } : {}),
        ...(addForm.accountName?.trim() ? { accountName: addForm.accountName.trim() } : {}),
        ...(addForm.accountNumber?.trim() ? { accountNumber: addForm.accountNumber.trim() } : {}),
        ...(addForm.bankCode?.trim() ? { bankCode: addForm.bankCode.trim() } : {}),
      })
      const providerId = created?.id || created?._id
      if (providerId) {
        await adminService.resetProviderPassword(providerId, addForm.password.trim())
      }
      setAddSuccess(`Provider "${addForm.name}" created. They can now log in with their facility email and the password you set.`)
      setAddForm(EMPTY_FORM)
      await load()
      setTimeout(() => { setShowAddModal(false); setAddSuccess('') }, 3000)
    } catch (err) {
      setAddError(err.message || 'Failed to create provider')
    } finally {
      setAddSubmitting(false)
    }
  }

  const openEdit = (p) => {
    setEditProvider(p)
    setEditForm({ name: p.name || '', type: p.type || 'hospital', email: p.email || '', phone: p.phone || '', address: p.address || '', accountName: p.accountName || '', accountNumber: p.accountNumber || '', bankCode: p.bankCode || '' })
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
        ...(editForm.accountName.trim() ? { accountName: editForm.accountName.trim() } : {}),
        ...(editForm.accountNumber.trim() ? { accountNumber: editForm.accountNumber.trim() } : {}),
        ...(editForm.bankCode.trim() ? { bankCode: editForm.bankCode.trim() } : {}),
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
        ? 'Portal account created! The provider can now log in with their facility email and this password.'
        : 'Password reset successfully!')
      setTimeout(() => { setResetProvider(null); setResetSuccess('') }, 2500)
    } catch (err) {
      setResetError(err.message || 'Failed to reset password')
    } finally {
      setResetSubmitting(false)
    }
  }

  if (loading) return <FullScreenLoader label="Loading providers…" />

  return (
    <div className="admin-page">
      <div className="admin-page-header">
        <div>
          <h1>Provider Management</h1>
          <p>Manage hospitals, clinics, and healthcare providers on CareCova</p>
        </div>
        <div className="flex gap-3">
          <button onClick={load} className="button button--secondary">
            <RefreshCw size={15} /> Refresh
          </button>
          <button
            onClick={() => { setShowAddModal(true); setAddForm(EMPTY_FORM); setAddError(''); setAddSuccess('') }}
            className="button button--primary"
          >
            <Plus size={16} /> Add Provider
          </button>
        </div>
      </div>

      {error && <div className="alert-box alert-error">{error}</div>}

      <div className="admin-table-container mt-4">
        {providers.length === 0 ? (
          <div className="cc-provider-empty">
            <Building2 size={44} color="var(--color-border)" style={{ margin: '0 auto 16px', display: 'block' }} />
            <p>No providers yet.</p>
            <button onClick={() => setShowAddModal(true)} className="button button--primary" style={{ marginTop: 16 }}>
              <Plus size={16} /> Add First Provider
            </button>
          </div>
        ) : (
          <>
            <div className="admin-table-wrapper">
              <table className="admin-table has-sticky-col">
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
                        <td>
                          <div className="flex items-center gap-2">
                            <div className="cc-provider-icon">
                              <Building2 size={16} />
                            </div>
                            <span className="font-medium">{p.name || '—'}</span>
                          </div>
                        </td>
                        <td className="text-sm text-muted">{typeLabel(p.type)}</td>
                        <td className="text-sm text-muted">{p.email || '—'}</td>
                        <td className="text-sm text-muted">{p.phone || '—'}</td>
                        <td>
                          <span className={`cc-provider-status-badge ${active ? 'cc-provider-status-active' : 'cc-provider-status-inactive'}`}>
                            {active ? <CheckCircle size={11} /> : <XCircle size={11} />}
                            {active ? 'Active' : 'Inactive'}
                          </span>
                        </td>
                        <td className="text-sm text-muted">{formatDate(p.createdAt)}</td>
                        <td>
                          <div className="flex gap-2" style={{ flexWrap: 'nowrap' }}>
                            <button onClick={() => openEdit(p)} title="Edit provider details" className="cc-action-btn cc-action-btn-edit">
                              <Pencil size={13} />
                            </button>
                            <button onClick={() => openReset(p)} title="Reset portal password" className="cc-action-btn cc-action-btn-key">
                              <KeyRound size={13} />
                            </button>
                            <button onClick={() => { setDeleteProvider(p); setDeleteError('') }} title="Delete provider" className="cc-action-btn cc-action-btn-delete">
                              <Trash2 size={13} />
                            </button>
                            <button
                              disabled={togglingId === id}
                              onClick={() => handleToggleStatus(p)}
                              className={`cc-toggle-btn ${active ? 'cc-toggle-btn-deactivate' : 'cc-toggle-btn-activate'}`}
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
            </div>
            <div className="cc-table-footer">
              {providers.length} provider{providers.length !== 1 ? 's' : ''} · {providers.filter(isActive).length} active
            </div>
          </>
        )}
      </div>

      {/* ── Add Provider Modal ── */}
      {showAddModal && (
        <ProviderModal title="Add New Provider" subtitle="Create a facility and set up their login credentials" onClose={() => setShowAddModal(false)}>
          <form onSubmit={handleAdd} className="modal-body">
            <p className="cc-section-label">Facility Information</p>
            <div className="input-group">
              <label className="input-label">Facility Name *</label>
              <input className="input" value={addForm.name} onChange={(e) => setAddForm(f => ({ ...f, name: e.target.value }))} placeholder="e.g. Lagos General Hospital" />
            </div>
            <div className="cc-form-row-2">
              <div className="input-group">
                <label className="input-label">Facility Type *</label>
                <select className="input" value={addForm.type} onChange={(e) => setAddForm(f => ({ ...f, type: e.target.value }))}>
                  {PROVIDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Phone *</label>
                <input className="input" value={addForm.phone} onChange={(e) => setAddForm(f => ({ ...f, phone: e.target.value }))} placeholder="08XXXXXXXXX" />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Facility Email *</label>
              <input className="input" type="email" value={addForm.email} onChange={(e) => setAddForm(f => ({ ...f, email: e.target.value }))} placeholder="contact@facility.com" />
            </div>
            <div className="input-group">
              <label className="input-label">Address</label>
              <input className="input" value={addForm.address} onChange={(e) => setAddForm(f => ({ ...f, address: e.target.value }))} placeholder="123 Street, City, State" />
            </div>

            <hr className="cc-form-divider" />
            <p className="cc-section-label">Bank Account Details <span style={{ fontWeight: 400, textTransform: 'none', letterSpacing: 0, color: 'var(--color-text-label)' }}>(required for P2Vest disbursement)</span></p>
            <div className="input-group">
              <label className="input-label">Account Name</label>
              <input className="input" value={addForm.accountName || ''} onChange={(e) => setAddForm(f => ({ ...f, accountName: e.target.value }))} placeholder="e.g. Lagos General Hospital" />
            </div>
            <div className="cc-form-row-2">
              <div className="input-group">
                <label className="input-label">Account Number</label>
                <input className="input" value={addForm.accountNumber || ''} onChange={(e) => setAddForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="10-digit NUBAN" />
              </div>
              <div className="input-group">
                <label className="input-label">Bank Code</label>
                <input className="input" value={addForm.bankCode || ''} onChange={(e) => setAddForm(f => ({ ...f, bankCode: e.target.value }))} placeholder="e.g. 058" />
              </div>
            </div>

            <hr className="cc-form-divider" />
            <p className="cc-section-label">Portal Login Password</p>
            <div className="input-group">
              <label className="input-label">Password</label>
              <div className="cc-password-field">
                <input
                  className="input"
                  type={showAddPassword ? 'text' : 'password'}
                  value={addForm.password || ''}
                  onChange={(e) => setAddForm(f => ({ ...f, password: e.target.value }))}
                  placeholder="Minimum 8 characters"
                  style={{ paddingRight: 40 }}
                />
                <button type="button" onClick={() => setShowAddPassword(s => !s)} className="cc-password-eye">
                  {showAddPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
            </div>

            {addError && <div className="alert-box alert-error">{addError}</div>}
            {addSuccess && <div className="alert-box alert-success">{addSuccess}</div>}
            <div className="modal-footer">
              <button type="submit" disabled={addSubmitting} className="button button--primary">{addSubmitting ? 'Creating…' : 'Create Provider'}</button>
              <button type="button" onClick={() => setShowAddModal(false)} className="button button--secondary">Cancel</button>
            </div>
          </form>
        </ProviderModal>
      )}

      {/* ── Edit Provider Modal ── */}
      {editProvider && (
        <ProviderModal title="Edit Provider" subtitle={`Updating details for ${editProvider.name}`} onClose={() => setEditProvider(null)}>
          <form onSubmit={handleEdit} className="modal-body">
            <div className="input-group">
              <label className="input-label">Facility Name *</label>
              <input className="input" value={editForm.name} onChange={(e) => setEditForm(f => ({ ...f, name: e.target.value }))} />
            </div>
            <div className="cc-form-row-2">
              <div className="input-group">
                <label className="input-label">Facility Type</label>
                <select className="input" value={editForm.type} onChange={(e) => setEditForm(f => ({ ...f, type: e.target.value }))}>
                  {PROVIDER_TYPES.map((t) => <option key={t.value} value={t.value}>{t.label}</option>)}
                </select>
              </div>
              <div className="input-group">
                <label className="input-label">Phone</label>
                <input className="input" value={editForm.phone} onChange={(e) => setEditForm(f => ({ ...f, phone: e.target.value }))} />
              </div>
            </div>
            <div className="input-group">
              <label className="input-label">Email</label>
              <input className="input" type="email" value={editForm.email} onChange={(e) => setEditForm(f => ({ ...f, email: e.target.value }))} />
            </div>
            <div className="input-group">
              <label className="input-label">Address</label>
              <input className="input" value={editForm.address} onChange={(e) => setEditForm(f => ({ ...f, address: e.target.value }))} placeholder="Street, City, State" />
            </div>
            <hr className="cc-form-divider" />
            <p style={{ margin: '0 0 10px', fontSize: 'var(--text-body-sm)', fontWeight: 600, color: 'var(--color-text-secondary)' }}>
              Bank Account Details <span style={{ fontWeight: 400, color: 'var(--color-text-label)' }}>(required for P2Vest disbursement)</span>
            </p>
            <div className="input-group">
              <label className="input-label">Account Name</label>
              <input className="input" value={editForm.accountName} onChange={(e) => setEditForm(f => ({ ...f, accountName: e.target.value }))} placeholder="e.g. Lagos General Hospital" />
            </div>
            <div className="cc-form-row-2">
              <div className="input-group">
                <label className="input-label">Account Number</label>
                <input className="input" value={editForm.accountNumber} onChange={(e) => setEditForm(f => ({ ...f, accountNumber: e.target.value }))} placeholder="10-digit NUBAN" />
              </div>
              <div className="input-group">
                <label className="input-label">Bank Code</label>
                <input className="input" value={editForm.bankCode} onChange={(e) => setEditForm(f => ({ ...f, bankCode: e.target.value }))} placeholder="e.g. 058" />
              </div>
            </div>
            {editError && <div className="alert-box alert-error">{editError}</div>}
            {editSuccess && <div className="alert-box alert-success">{editSuccess}</div>}
            <div className="modal-footer">
              <button type="submit" disabled={editSubmitting} className="button button--primary">{editSubmitting ? 'Saving…' : 'Save Changes'}</button>
              <button type="button" onClick={() => setEditProvider(null)} className="button button--secondary">Cancel</button>
            </div>
          </form>
        </ProviderModal>
      )}

      {/* ── Delete Confirmation Modal ── */}
      {deleteProvider && (
        <ProviderModal title="Delete Provider" subtitle={`Permanently remove ${deleteProvider.name}`} onClose={() => setDeleteProvider(null)}>
          <div className="modal-body">
            <div className="cc-modal-danger-note">
              <strong>This cannot be undone.</strong> Deleting this provider will permanently remove their facility record and portal login account. Patient applications already linked to them will remain in the system.
            </div>
            <p style={{ margin: '0 0 20px', fontSize: '0.9375rem', color: 'var(--color-text-secondary)' }}>
              Are you sure you want to delete <strong>{deleteProvider.name}</strong>?
            </p>
            {deleteError && <div className="alert-box alert-error">{deleteError}</div>}
            <div className="modal-footer">
              <button className="button button--danger" disabled={deleteSubmitting} onClick={handleDelete}>
                {deleteSubmitting ? 'Deleting…' : 'Yes, Delete Provider'}
              </button>
              <button className="button button--secondary" onClick={() => setDeleteProvider(null)}>Cancel</button>
            </div>
          </div>
        </ProviderModal>
      )}

      {/* ── Reset Password Modal ── */}
      {resetProvider && (
        <ProviderModal title="Reset Portal Password" subtitle={`Set a new login password for ${resetProvider.name}`} onClose={() => setResetProvider(null)}>
          <form onSubmit={handleReset} className="modal-body">
            <div className="cc-modal-warn-note">
              If this provider has no portal account yet, one will be created using their facility email.
              Otherwise their existing session will be invalidated and the password replaced.
            </div>
            <div className="input-group">
              <label className="input-label">New Password</label>
              <div className="cc-password-field">
                <input
                  className="input"
                  type={showNewPassword ? 'text' : 'password'}
                  value={newPassword}
                  onChange={(e) => { setNewPassword(e.target.value); setResetError('') }}
                  placeholder="Minimum 8 characters"
                  style={{ paddingRight: 40 }}
                  autoFocus
                />
                <button type="button" onClick={() => setShowNewPassword(s => !s)} className="cc-password-eye">
                  {showNewPassword ? <EyeOff size={16} /> : <Eye size={16} />}
                </button>
              </div>
              {newPassword && newPassword.length < 8 && (
                <p style={{ margin: '4px 0 0', fontSize: 'var(--text-xs)', color: 'var(--color-danger)' }}>At least 8 characters required</p>
              )}
            </div>
            {resetError && <div className="alert-box alert-error">{resetError}</div>}
            {resetSuccess && <div className="alert-box alert-success">{resetSuccess}</div>}
            <div className="modal-footer">
              <button type="submit" disabled={resetSubmitting || newPassword.length < 8} className="button button--primary">
                {resetSubmitting ? 'Resetting…' : 'Reset Password'}
              </button>
              <button type="button" onClick={() => setResetProvider(null)} className="button button--secondary">Cancel</button>
            </div>
          </form>
        </ProviderModal>
      )}
    </div>
  )
}

function ProviderModal({ title, subtitle, onClose, children }) {
  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <div>
            <h2>{title}</h2>
            {subtitle && <p className="cc-modal-subtitle">{subtitle}</p>}
          </div>
          <button onClick={onClose} className="modal-close" aria-label="Close"><X size={20} /></button>
        </div>
        {children}
      </div>
    </div>
  )
}
