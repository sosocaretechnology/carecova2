import { useState, useEffect } from 'react'
import { NavLink, Outlet, useNavigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { adminService } from '../../services/adminService'
import { LayoutDashboard, CreditCard, DollarSign, Send, Bell, LogOut, Menu, X } from 'lucide-react'
import NotificationBell from '../../components/NotificationBell'
import logo from '../../assets/logo.png'

const navItems = [
    { name: 'Dashboard',          path: '/credit/dashboard',     icon: LayoutDashboard },
    { name: 'Active Credits',     path: '/credit/loans',         icon: CreditCard },
    { name: 'Repayments',         path: '/credit/repayments',    icon: DollarSign },
    { name: 'Disbursement Queue', path: '/credit/disbursements', icon: Send },
    { name: 'Notifications',      path: '/credit/notifications', icon: Bell },
]

const PAGE_TITLES = {
    '/credit/dashboard':     'Dashboard',
    '/credit/loans':         'Active Credits',
    '/credit/repayments':    'Repayments',
    '/credit/disbursements': 'Disbursement Queue',
    '/credit/notifications': 'Notifications',
}

export default function CreditLayout() {
    const { session } = useAuth()
    const navigate = useNavigate()
    const location = useLocation()
    const [sidebarOpen, setSidebarOpen] = useState(false)

    useEffect(() => {
        setSidebarOpen(false)
    }, [location.pathname])

    const handleLogout = () => {
        adminService.logout()
        navigate('/admin')
    }

    const initials = session?.name
        ? session.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
        : '?'

    const pageTitle = PAGE_TITLES[location.pathname] || 'Credit Officer Portal'

    return (
        <div className="admin-layout">
            {sidebarOpen && (
                <div
                    className="admin-sidebar-overlay"
                    onClick={() => setSidebarOpen(false)}
                    aria-hidden="true"
                />
            )}

            <aside className={`admin-sidebar${sidebarOpen ? ' admin-sidebar--open' : ''}`} aria-label="Credit officer navigation">
                <div className="admin-sidebar-header">
                    <div className="admin-sidebar-brand">
                        <img src={logo} alt="CareCova" className="admin-sidebar-logo" />
                        <div>
                            <div className="admin-sidebar-logo-text">CareCova</div>
                            <div className="admin-sidebar-portal-label">
                                {session?.role === 'admin' ? 'Credit Module' : 'Credit Officer'}
                            </div>
                        </div>
                    </div>
                </div>
                <nav className="admin-nav" aria-label="Credit navigation">
                    <div className="admin-nav-group">
                        <div className="admin-nav-group-label">Navigation</div>
                        {navItems.map(item => {
                            const Icon = item.icon
                            return (
                                <NavLink
                                    key={item.path}
                                    to={item.path}
                                    onClick={() => setSidebarOpen(false)}
                                    className={({ isActive }) => `admin-nav-item${isActive ? ' active' : ''}`}
                                >
                                    <span className="admin-nav-icon" aria-hidden="true"><Icon size={16} /></span>
                                    <span className="admin-nav-text">{item.name}</span>
                                </NavLink>
                            )
                        })}
                    </div>
                </nav>
                <div className="admin-sidebar-footer">
                    <button className="admin-logout-btn" onClick={handleLogout}>
                        <span className="admin-nav-icon" aria-hidden="true"><LogOut size={16} /></span>
                        <span className="admin-nav-text">Sign Out</span>
                    </button>
                </div>
            </aside>

            <div className="admin-content-wrapper">
                <header className="admin-topbar">
                    <div className="admin-topbar-left">
                        <button
                            className="admin-hamburger"
                            onClick={() => setSidebarOpen(v => !v)}
                            aria-label="Toggle menu"
                            aria-expanded={sidebarOpen}
                        >
                            {sidebarOpen ? <X size={20} /> : <Menu size={20} />}
                        </button>
                        <span className="admin-topbar-page-title">{pageTitle}</span>
                    </div>
                    <div className="admin-topbar-actions">
                        <NotificationBell notificationsPath="/credit/notifications" />
                        <div className="admin-user-badge" title={session?.name}>{initials}</div>
                        <span className="admin-topbar-username capitalize">{session?.name}</span>
                    </div>
                </header>
                <main className="admin-main-content">
                    <Outlet />
                </main>
            </div>
        </div>
    )
}
