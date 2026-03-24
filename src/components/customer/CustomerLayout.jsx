import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { Link } from 'react-router-dom'
import NotificationBell from '../NotificationBell'

export default function CustomerLayout() {
  const { isAuthenticated, customer, loading, logout } = useCustomerAuth()
  const navigate = useNavigate()

  if (loading) {
    return <div className="loading">Loading...</div>
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />
  }

  const handleLogout = () => {
    logout()
    navigate('/')
  }

  const name = customer?.fullName || customer?.phone || 'Account'

  return (
    <div className="customer-portal-layout">
      <header className="customer-portal-header">
        <div className="customer-portal-header-inner">
          <Link to="/" className="customer-portal-brand">
            Carecova
          </Link>
          <nav className="customer-portal-nav">
            <NavLink to="/portal" end className={({ isActive }) => (isActive ? 'customer-portal-nav-link active' : 'customer-portal-nav-link')}>
              Overview
            </NavLink>
            <NavLink to="/portal/loans" className={({ isActive }) => (isActive ? 'customer-portal-nav-link active' : 'customer-portal-nav-link')}>
              My loans
            </NavLink>
            <NavLink to="/portal/notifications" className={({ isActive }) => (isActive ? 'customer-portal-nav-link active' : 'customer-portal-nav-link')}>
              Notifications
            </NavLink>
          </nav>
          <div className="customer-portal-user">
            <NotificationBell notificationsPath="/portal/notifications" />
            <span className="customer-portal-name">{name}</span>
            <button type="button" className="customer-portal-logout" onClick={handleLogout}>
              Sign out
            </button>
          </div>
        </div>
      </header>
      <main className="customer-portal-main">
        <Outlet />
      </main>
    </div>
  )
}
