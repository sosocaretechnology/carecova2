import React, { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { Plus, Shield, User, UserX, UserCheck, Mail, ShieldAlert } from 'lucide-react'

export default function UserManagement() {
    const [users, setUsers] = useState([])
    const [loading, setLoading] = useState(true)
    const [showAddModal, setShowAddModal] = useState(false)
    const [newUser, setNewUser] = useState({
        username: '',
        name: '',
        password: '',
        role: 'sales'
    })

    useEffect(() => {
        loadUsers()
    }, [])

    async function loadUsers() {
        setLoading(true)
        const data = await adminService.getUsersList()
        setUsers(data)
        setLoading(false)
    }

    const handleStatusToggle = async (username, currentStatus) => {
        const newStatus = currentStatus === 'active' ? 'suspended' : 'active'
        try {
            await adminService.updateUserStatus(username, newStatus)
            loadUsers()
        } catch (err) {
            alert(err.message)
        }
    }

    const handleAddUser = async (e) => {
        e.preventDefault()
        try {
            await adminService.addUser(newUser)
            setShowAddModal(false)
            setNewUser({ username: '', name: '', password: '', role: 'sales' })
            loadUsers()
        } catch (err) {
            alert(err.message)
        }
    }

    if (loading) return <div className="admin-loading">Loading users...</div>

    return (
        <div className="admin-page">
            <div className="admin-page-header flex-between align-center">
                <div>
                    <h1>User Management</h1>
                    <p>Admin user accounts and role-based permissions.</p>
                </div>
                <button className="button button--primary flex items-center gap-2" onClick={() => setShowAddModal(true)}>
                    <Plus size={18} /> Add User
                </button>
            </div>

            <div className="admin-table-container mt-6">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Name</th>
                            <th>Username</th>
                            <th>Role</th>
                            <th>Status</th>
                            <th>Actions</th>
                        </tr>
                    </thead>
                    <tbody>
                        {users.map(user => (
                            <tr key={user.username}>
                                <td>
                                    <div className="flex items-center gap-3">
                                        <div className="avatar-chip">{user.name[0]}</div>
                                        <div>
                                            <div className="font-medium">{user.name}</div>
                                        </div>
                                    </div>
                                </td>
                                <td>{user.username}</td>
                                <td>
                                    <div className="flex items-center gap-1">
                                        {user.role === 'admin' ? <ShieldAlert size={14} className="text-primary" /> : <Shield size={14} className="text-muted" />}
                                        <span className="capitalize">{user.role}</span>
                                    </div>
                                </td>
                                <td>
                                    <span className={`status-pill status-${user.status}`}>
                                        {user.status}
                                    </span>
                                </td>
                                <td>
                                    {user.username !== 'admin' && (
                                        <button
                                            className={`button button--ghost flex items-center gap-1 ${user.status === 'active' ? 'text-error' : 'text-success'}`}
                                            onClick={() => handleStatusToggle(user.username, user.status)}
                                        >
                                            {user.status === 'active' ? <><UserX size={14} /> Suspend</> : <><UserCheck size={14} /> Activate</>}
                                        </button>
                                    )}
                                </td>
                            </tr>
                        ))}
                    </tbody>
                </table>
            </div>

            {showAddModal && (
                <div className="modal-overlay" onClick={() => setShowAddModal(false)}>
                    <div className="modal-content modal-content--sm" onClick={e => e.stopPropagation()}>
                        <div className="modal-header">
                            <h2>Add New Admin User</h2>
                            <button type="button" className="modal-close" onClick={() => setShowAddModal(false)} aria-label="Close">×</button>
                        </div>
                        <form onSubmit={handleAddUser}>
                            <div className="modal-body">
                                <div className="input-group">
                                    <label className="input-label">Full Name</label>
                                    <input
                                        type="text"
                                        className="input"
                                        required
                                        value={newUser.name}
                                        onChange={e => setNewUser({ ...newUser, name: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Username</label>
                                    <input
                                        type="text"
                                        className="input"
                                        required
                                        value={newUser.username}
                                        onChange={e => setNewUser({ ...newUser, username: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Password</label>
                                    <input
                                        type="password"
                                        className="input"
                                        required
                                        value={newUser.password}
                                        onChange={e => setNewUser({ ...newUser, password: e.target.value })}
                                    />
                                </div>
                                <div className="input-group">
                                    <label className="input-label">Role</label>
                                    <select
                                        className="select"
                                        value={newUser.role}
                                        onChange={e => setNewUser({ ...newUser, role: e.target.value })}
                                    >
                                        <option value="sales">Sales Officer</option>
                                        <option value="support">Customer Support</option>
                                        <option value="admin">Super Admin</option>
                                        <option value="credit_officer">Credit Officer</option>
                                    </select>
                                </div>
                            </div>
                            <div className="modal-footer">
                                <button type="submit" className="button button--primary">Create User</button>
                                <button type="button" className="button button--secondary" onClick={() => setShowAddModal(false)}>Cancel</button>
                            </div>
                        </form>
                    </div>
                </div>
            )}
        </div>
    )
}
