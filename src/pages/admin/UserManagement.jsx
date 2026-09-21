import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { Plus, Shield, ShieldAlert, UserX, UserCheck, Trash2, KeyRound } from 'lucide-react'

const ROLE_LABELS = {
  admin: 'Super Admin',
  sales: 'Sales Officer',
  support: 'Customer Support',
  credit_officer: 'Credit Officer',
  financier: 'Financier',
}

const PROTECTED_USERNAMES = ['admin']

const EMPTY_USER = { username: '', name: '', email: '', password: '', role: 'sales' }

export default function UserManagement() {
  const [users, setUsers] = useState([])
  const [loading, setLoading] = useState(true)
  const [loadError, setLoadError] = useState('')
  const [showAddModal, setShowAddModal] = useState(false)
  const [newUser, setNewUser] = useState(EMPTY_USER)
  const [addError, setAddError] = useState('')
  const [addLoading, setAddLoading] = useState(false)

  const [resetTarget, setResetTarget] = useState(null) // user object
  const [newPassword, setNewPassword] = useState('')
  const [confirmPassword, setConfirmPassword] = useState('')
  const [resetError, setResetError] = useState('')
  const [resetLoading, setResetLoading] = useState(false)

  const [deleteTarget, setDeleteTarget] = useState(null) // user object
  const [deleteLoading, setDeleteLoading] = useState(false)

  useEffect(() => { loadUsers() }, [])

  async function loadUsers() {
    setLoading(true)
    setLoadError('')
    try {
      const data = await adminService.getUsersList()
      setUsers(data)
    } catch (err) {
      setLoadError(err.message)
    } finally {
      setLoading(false)
    }
  }

  const handleStatusToggle = async (user) => {
    const newStatus = user.status === 'active' ? 'suspended' : 'active'
    try {
      await adminService.updateUserStatus(user.username, newStatus, user.id)
      await loadUsers()
    } catch (err) {
      alert(err.message)
    }
  }

  const handleAddUser = async (e) => {
    e.preventDefault()
    setAddError('')
    setAddLoading(true)
    try {
      await adminService.addUser(newUser)
      setShowAddModal(false)
      setNewUser(EMPTY_USER)
      await loadUsers()
    } catch (err) {
      setAddError(err.message)
    } finally {
      setAddLoading(false)
    }
  }

  const handleResetPassword = async (e) => {
    e.preventDefault()
    setResetError('')
    if (newPassword.length < 8) { setResetError('Password must be at least 8 characters'); return }
    if (newPassword !== confirmPassword) { setResetError('Passwords do not match'); return }
    setResetLoading(true)
    try {
      await adminService.resetUserPassword(resetTarget.username, newPassword, resetTarget.id)
      setResetTarget(null)
      setNewPassword('')
      setConfirmPassword('')
    } catch (err) {
      setResetError(err.message)
    } finally {
      setResetLoading(false)
    }
  }

  const handleDelete = async () => {
    setDeleteLoading(true)
    try {
      await adminService.deleteUser(deleteTarget.username, deleteTarget.id)
      setDeleteTarget(null)
      await loadUsers()
    } catch (err) {
      alert(err.message)
    } finally {
      setDeleteLoading(false)
    }
  }

  if (loading) return <div className="admin-loading">Loading users...</div>

  return (
    <div className="admin-page">
      <div className="admin-page-header flex-between align-center">
        <div>
          <h1>User Management</h1>
          <p style={{ marginTop: '4px', fontSize: '0.8125rem', color: 'var(--color-text-muted)' }}>Admin user accounts and role-based permissions.</p>
        </div>
        <button className="button button--primary" style={{ display: 'flex', alignItems: 'center', gap: '6px' }} onClick={() => { setShowAddModal(true); setAddError('') }}>
          <Plus size={16} /> Add User
        </button>
      </div>

      {loadError && <div className="alert-box alert-error" style={{ margin: '16px 0' }}>{loadError}</div>}

      <div className="admin-table-container" style={{ marginTop: '24px' }}>
        <table className="admin-table">
          <thead>
            <tr>
              <th>Name</th>
              <th>Username</th>
              <th>Email</th>
              <th>Role</th>
              <th>Status</th>
              <th>Actions</th>
            </tr>
          </thead>
          <tbody>
            {users.map(user => (
              <tr key={user.id || user.username}>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                    <div className="avatar-chip">{user.name?.[0] ?? '?'}</div>
                    <span style={{ fontWeight: 500 }}>{user.name}</span>
                  </div>
                </td>
                <td style={{ color: 'var(--color-text-muted)', fontFamily: 'monospace', fontSize: '0.875rem' }}>{user.username}</td>
                <td style={{ color: 'var(--color-text-muted)', fontSize: '0.875rem' }}>{user.email || '—'}</td>
                <td>
                  <div style={{ display: 'flex', alignItems: 'center', gap: '6px' }}>
                    {user.role === 'admin' ? <ShieldAlert size={14} style={{ color: 'var(--color-primary)' }} /> : <Shield size={14} style={{ color: 'var(--color-text-muted)' }} />}
                    <span className="capitalize">{ROLE_LABELS[user.role] ?? user.role}</span>
                  </div>
                </td>
                <td>
                  <span className={`status-pill status-${user.status}`}>{user.status}</span>
                </td>
                <td>
                  {!PROTECTED_USERNAMES.includes(user.username) && (
                    <div style={{ display: 'flex', gap: '6px', flexWrap: 'wrap' }}>
                      <button
                        className={`button button--ghost button--compact ${user.status === 'active' ? 'text-error' : 'text-success'}`}
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem' }}
                        onClick={() => handleStatusToggle(user)}
                      >
                        {user.status === 'active' ? <><UserX size={13} /> Suspend</> : <><UserCheck size={13} /> Activate</>}
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem' }}
                        onClick={() => { setResetTarget(user); setNewPassword(''); setConfirmPassword(''); setResetError('') }}
                      >
                        <KeyRound size={13} /> Reset PW
                      </button>
                      <button
                        className="button button--ghost button--compact"
                        style={{ display: 'flex', alignItems: 'center', gap: '4px', fontSize: '0.8125rem', color: 'var(--color-error)' }}
                        onClick={() => setDeleteTarget(user)}
                      >
                        <Trash2 size={13} /> Delete
                      </button>
                    </div>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {/* ── Add User Modal ── */}
      {showAddModal && (
        <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
          <div className="modal-content modal-content--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Add New User</h2>
              <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleAddUser}>
              <div className="modal-body">
                {addError && <div className="alert-box alert-error" style={{ marginBottom: '12px' }}>{addError}</div>}
                <div className="input-group">
                  <label className="input-label">Full Name *</label>
                  <input className="input" type="text" required value={newUser.name} onChange={e => setNewUser({ ...newUser, name: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Username *</label>
                  <input className="input" type="text" required value={newUser.username} onChange={e => setNewUser({ ...newUser, username: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Email</label>
                  <input className="input" type="email" value={newUser.email} onChange={e => setNewUser({ ...newUser, email: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Password *</label>
                  <input className="input" type="password" required minLength={8} value={newUser.password} onChange={e => setNewUser({ ...newUser, password: e.target.value })} />
                </div>
                <div className="input-group">
                  <label className="input-label">Role *</label>
                  <select className="select" value={newUser.role} onChange={e => setNewUser({ ...newUser, role: e.target.value })}>
                    <option value="sales">Sales Officer</option>
                    <option value="support">Customer Support</option>
                    <option value="credit_officer">Credit Officer</option>
                    <option value="admin">Super Admin</option>
                  </select>
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="button button--primary" disabled={addLoading}>{addLoading ? 'Creating…' : 'Create User'}</button>
                <button type="button" className="button button--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Reset Password Modal ── */}
      {resetTarget && (
        <div className="modal-overlay" onClick={() => setResetTarget(null)}>
          <div className="modal-content modal-content--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Reset Password</h2>
              <button type="button" className="modal-close" onClick={() => setResetTarget(null)} aria-label="Close">×</button>
            </div>
            <form onSubmit={handleResetPassword}>
              <div className="modal-body">
                <p style={{ marginBottom: '16px', color: 'var(--color-text-muted)', fontSize: '0.9375rem' }}>
                  Setting a new password for <strong>{resetTarget.name}</strong> ({resetTarget.username}).
                </p>
                {resetError && <div className="alert-box alert-error" style={{ marginBottom: '12px' }}>{resetError}</div>}
                <div className="input-group">
                  <label className="input-label">New Password *</label>
                  <input className="input" type="password" required minLength={8} value={newPassword} onChange={e => setNewPassword(e.target.value)} />
                </div>
                <div className="input-group">
                  <label className="input-label">Confirm Password *</label>
                  <input className="input" type="password" required value={confirmPassword} onChange={e => setConfirmPassword(e.target.value)} />
                </div>
              </div>
              <div className="modal-footer">
                <button type="submit" className="button button--primary" disabled={resetLoading}>{resetLoading ? 'Saving…' : 'Save Password'}</button>
                <button type="button" className="button button--secondary" onClick={() => setResetTarget(null)}>Cancel</button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Delete Confirm Modal ── */}
      {deleteTarget && (
        <div className="modal-overlay" onClick={() => setDeleteTarget(null)}>
          <div className="modal-content modal-content--sm" onClick={e => e.stopPropagation()}>
            <div className="modal-header">
              <h2>Delete User</h2>
              <button type="button" className="modal-close" onClick={() => setDeleteTarget(null)} aria-label="Close">×</button>
            </div>
            <div className="modal-body">
              <p>Are you sure you want to permanently delete <strong>{deleteTarget.name}</strong> ({deleteTarget.username})?</p>
              <p style={{ marginTop: '8px', color: 'var(--color-error)', fontSize: '0.875rem' }}>This action cannot be undone.</p>
            </div>
            <div className="modal-footer">
              <button className="button button--danger" disabled={deleteLoading} onClick={handleDelete}>{deleteLoading ? 'Deleting…' : 'Yes, Delete'}</button>
              <button className="button button--secondary" onClick={() => setDeleteTarget(null)}>Cancel</button>
            </div>
          </div>
        </div>
      )}
    </div>
  )
}
