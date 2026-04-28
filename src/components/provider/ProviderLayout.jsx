import { Outlet, Navigate, useNavigate } from 'react-router-dom'
import { useProviderAuth } from '../../hooks/useProviderAuth'
import ProviderSidebar from './ProviderSidebar'
import { createContext, useContext } from 'react'

const SessionExpiredContext = createContext(() => {})
export const useSessionExpired = () => useContext(SessionExpiredContext)

export default function ProviderLayout() {
  const { isAuthenticated, loading, session, logout, handleSessionExpired } = useProviderAuth()
  const navigate = useNavigate()

  if (loading) return <div className="admin-loading">Loading Provider Portal...</div>
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
  const initials = name
    .split(' ')
    .map((n) => n[0])
    .join('')
    .toUpperCase()
    .slice(0, 2)

  return (
    <SessionExpiredContext.Provider value={onSessionExpired}>
      <div className="admin-layout">
        <ProviderSidebar onLogout={handleLogout} />
        <div className="admin-content-wrapper">
          <header className="admin-topbar">
            <div className="admin-topbar-title">Provider Portal</div>
            <div className="admin-topbar-actions">
              <span className="admin-user-badge">{initials}</span>
              <span>{name}</span>
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
