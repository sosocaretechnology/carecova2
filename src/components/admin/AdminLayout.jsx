import { useState, useEffect } from 'react'
import { Outlet, Navigate, useLocation } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import AdminSidebar from './AdminSidebar'
import NotificationBell from '../NotificationBell'
import logo from '../../assets/logo.png'
import { Menu, X } from 'lucide-react'

const PAGE_TITLES = {
  '/admin/dashboard':      'Dashboard',
  '/admin/applications':   'Applications',
  '/admin/customers':      'Customers',
  '/admin/loans':          'Active Credits',
  '/admin/repayments':     'Repayments',
  '/admin/wallets':        'Org Wallets',
  '/admin/rules':          'Rules & Config',
  '/admin/audit':          'Audit Logs',
  '/admin/users':          'User Management',
  '/admin/providers':      'Providers',
  '/admin/recovery':       'Recovery',
  '/admin/disbursements':  'Disbursement Queue',
  '/admin/analytics':      'Analytics',
  '/admin/notifications':  'Notifications',
  '/admin/financing':      'Financing Queue',
}

function getPageTitle(pathname) {
  if (PAGE_TITLES[pathname]) return PAGE_TITLES[pathname]
  if (pathname.startsWith('/admin/applications/')) return 'Application Review'
  if (pathname.startsWith('/admin/customers/')) return 'Customer 360'
  if (pathname.startsWith('/admin/loans/')) return 'Credit Detail'
  if (pathname.startsWith('/admin/disbursements/')) return 'Disbursement Case'
  if (pathname.startsWith('/admin/financing/')) return 'Financier Application'
  return 'CareCova Admin'
}

export default function AdminLayout() {
  const { isAuthenticated, session, loading, logout } = useAuth()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  // Close sidebar on route change (mobile)
  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="admin-loading">
        <img src={logo} alt="CareCova" className="cc-auth-loading-logo" />
        <span className="cc-auth-loading-text">Loading CareCova Admin…</span>
      </div>
    )
  }

  if (!isAuthenticated) {
    return <Navigate to="/admin" replace />
  }

  const initials = session?.name
    ? session.name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
    : '?'

  const pageTitle = getPageTitle(location.pathname)

  return (
    <div className="admin-layout">
      {/* Mobile overlay */}
      {sidebarOpen && (
        <div
          className="admin-sidebar-overlay"
          onClick={() => setSidebarOpen(false)}
          aria-hidden="true"
        />
      )}

      <AdminSidebar
        onLogout={logout}
        open={sidebarOpen}
        onClose={() => setSidebarOpen(false)}
        session={session}
      />

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
            <NotificationBell notificationsPath="/admin/notifications" />
            <div className="admin-user-badge" title={session?.name}>{initials}</div>
            <span className="admin-topbar-username capitalize">
              {session?.name}
              {session?.role && (
                <span style={{ color: 'var(--color-text-muted)', fontWeight: 400, marginLeft: 4 }}>
                  · {session.role.replace(/_/g, ' ')}
                </span>
              )}
            </span>
          </div>
        </header>
        <main className="admin-main-content">
          <Outlet />
        </main>
      </div>
    </div>
  )
}
