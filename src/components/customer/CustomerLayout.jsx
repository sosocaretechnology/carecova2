import { Outlet, Navigate, NavLink, useNavigate } from 'react-router-dom'
import { useCustomerAuth } from '../../hooks/useCustomerAuth'
import { Link } from 'react-router-dom'
import logo from '../../assets/logo.png'

export default function CustomerLayout() {
  const { isAuthenticated, customer, loading, logout } = useCustomerAuth()
  const navigate = useNavigate()

  if (loading) {
    return (
      <div className="customer-loading">
        <img src={logo} alt="CareCova" className="customer-loading-logo" />
        <span className="customer-loading-text">Loading your account…</span>
      </div>
    )
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
            <img src={logo} alt="CareCova" className="customer-portal-brand-logo" />
            <span className="customer-portal-brand-name">CareCova</span>
          </Link>

          <nav className="customer-portal-nav" aria-label="Customer navigation">
            <NavLink
              to="/portal"
              end
              className={({ isActive }) =>
                `customer-portal-nav-link${isActive ? ' active' : ''}`
              }
            >
              Overview
            </NavLink>
            <NavLink
              to="/portal/loans"
              className={({ isActive }) =>
                `customer-portal-nav-link${isActive ? ' active' : ''}`
              }
            >
              My Credits
            </NavLink>
            <NavLink
              to="/portal/notifications"
              className={({ isActive }) =>
                `customer-portal-nav-link${isActive ? ' active' : ''}`
              }
            >
              Notifications
            </NavLink>
          </nav>

          <div className="customer-portal-user">
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
