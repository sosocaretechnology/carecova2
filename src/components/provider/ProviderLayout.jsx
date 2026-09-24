import { useState, useEffect } from 'react'
import { Outlet, Navigate, useNavigate, useLocation } from 'react-router-dom'
import { useProviderAuth } from '../../hooks/useProviderAuth'
import ProviderSidebar from './ProviderSidebar'
import logo from '../../assets/logo.png'
import { Menu, X } from 'lucide-react'
import { createContext, useContext } from 'react'

const SessionExpiredContext = createContext(() => {})
export const useSessionExpired = () => useContext(SessionExpiredContext)

const PAGE_TITLES = {
  '/provider':                  'Overview',
  '/provider/patients':         'Patients',
  '/provider/loans':            'Loan Applications',
  '/provider/repayments':       'Repayments',
  '/provider/profile':          'Facility Profile',
  '/provider/register-patient': 'Register Patient',
}

export default function ProviderLayout() {
  const { isAuthenticated, loading, session, logout, handleSessionExpired } = useProviderAuth()
  const navigate = useNavigate()
  const location = useLocation()
  const [sidebarOpen, setSidebarOpen] = useState(false)

  useEffect(() => {
    setSidebarOpen(false)
  }, [location.pathname])

  if (loading) {
    return (
      <div className="admin-loading">
        <img src={logo} alt="CareCova" className="cc-auth-loading-logo" />
        <span className="cc-auth-loading-text">Loading Provider Portal…</span>
      </div>
    )
  }

  if (!isAuthenticated) return <Navigate to="/provider/login" replace />

  const handleLogout = () => {
    logout()
    navigate('/provider/login')
  }

  const onSessionExpired = () => {
    handleSessionExpired()
    navigate('/provider/login', { replace: true })
  }

  const name = session?.provider?.name || session?.email || 'Provider'
  const initials = name.split(' ').map(n => n[0]).join('').toUpperCase().slice(0, 2)
  const pageTitle = PAGE_TITLES[location.pathname] || 'Provider Portal'

  return (
    <SessionExpiredContext.Provider value={onSessionExpired}>
      <div className="admin-layout">
        {sidebarOpen && (
          <div
            className="admin-sidebar-overlay"
            onClick={() => setSidebarOpen(false)}
            aria-hidden="true"
          />
        )}

        <ProviderSidebar
          onLogout={handleLogout}
          open={sidebarOpen}
          onClose={() => setSidebarOpen(false)}
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
              <div className="admin-user-badge" title={name}>{initials}</div>
              <span className="admin-topbar-username">{name}</span>
            </div>
          </header>
          <main className="admin-main-content">
            <Outlet />
          </main>
        </div>
      </div>
    </SessionExpiredContext.Provider>
  )
}
