import { NavLink, Outlet, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { adminService } from '../../services/adminService'
import { LayoutDashboard, Send, LogOut } from 'lucide-react'

export default function CreditLayout() {
    const { session } = useAuth()
    const navigate = useNavigate()

    const handleLogout = () => {
        adminService.logout()
        navigate('/admin')
    }

    const navItems = [
        { name: 'Dashboard', path: '/credit/dashboard', icon: <LayoutDashboard size={18} /> },
        { name: 'Active Loans', path: '/credit/loans', icon: <LayoutDashboard size={18} /> },
        { name: 'Repayments', path: '/credit/repayments', icon: <LayoutDashboard size={18} /> },
        { name: 'Disbursement Queue', path: '/credit/disbursements', icon: <Send size={18} /> },
    ]

    return (
        <div className="admin-layout">
            <aside className="admin-sidebar">
                <div className="admin-sidebar-header">
                    <div className="admin-logo">CareCova</div>
                    <div style={{ fontSize: '0.65rem', opacity: 0.6, textTransform: 'uppercase', letterSpacing: '0.05em', marginTop: '4px' }}>
                        {session?.role === 'admin' ? 'Super Admin · Credit Module' : 'Credit Officer'}
                    </div>
                </div>
                <nav className="admin-nav">
                    {navItems.map(item => (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
                        >
                            <span className="admin-nav-icon">{item.icon}</span>
                            <span className="admin-nav-text">{item.name}</span>
                        </NavLink>
                    ))}
                </nav>
                <div className="admin-sidebar-footer">
                    <div style={{ padding: '4px 16px 8px', fontSize: '0.75rem', color: 'var(--color-text-muted)' }}>
                        Logged in as <strong>{session?.name}</strong>
                    </div>
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        <span className="admin-nav-icon"><LogOut size={18} /></span>
                        <span className="admin-nav-text">Sign Out</span>
                    </button>
                </div>
            </aside>
            <div className="admin-content-wrapper">
                <header className="admin-topbar">
                    <div className="admin-topbar-title">
                        {session?.role === 'admin' ? 'Disbursement & Credit Operations' : 'Credit Officer Portal'}
                    </div>
                    <div className="admin-topbar-actions">
                        <span className="admin-user-badge">{session?.name?.split(' ').map(n => n[0]).join('')}</span>
                        <span className="capitalize">{session?.name} ({session?.role})</span>
                    </div>
                </header>
                <main className="admin-main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
