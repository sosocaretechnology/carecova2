import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, DollarSign, Building2, LogOut, UserPlus } from 'lucide-react'
import logo from '../../assets/logo.png'

const navItems = [
  { name: 'Overview',          path: '/provider',                  icon: LayoutDashboard, end: true },
  { name: 'Patients',          path: '/provider/patients',         icon: Users },
  { name: 'Loan Applications', path: '/provider/loans',            icon: CreditCard },
  { name: 'Repayments',        path: '/provider/repayments',       icon: DollarSign },
  { name: 'Register Patient',  path: '/provider/register-patient', icon: UserPlus },
  { name: 'Facility Profile',  path: '/provider/profile',          icon: Building2 },
]

export default function ProviderSidebar({ onLogout, open, onClose }) {
  return (
    <aside className={`admin-sidebar${open ? ' admin-sidebar--open' : ''}`} aria-label="Provider navigation">
      <div className="admin-sidebar-header">
        <div className="admin-sidebar-brand">
          <img src={logo} alt="CareCova" className="admin-sidebar-logo" />
          <div>
            <div className="admin-sidebar-logo-text">CareCova</div>
            <div className="admin-sidebar-portal-label">Provider Portal</div>
          </div>
        </div>
      </div>

      <nav className="admin-nav" aria-label="Provider navigation">
        <div className="admin-nav-group">
          <div className="admin-nav-group-label">Navigation</div>
          {navItems.map((item) => {
            const Icon = item.icon
            return (
              <NavLink
                key={item.path}
                to={item.path}
                end={item.end}
                onClick={onClose}
                className={({ isActive }) =>
                  `admin-nav-item${isActive ? ' active' : ''}`
                }
              >
                <span className="admin-nav-icon" aria-hidden="true">
                  <Icon size={16} />
                </span>
                <span className="admin-nav-text">{item.name}</span>
              </NavLink>
            )
          })}
        </div>
      </nav>

      <div className="admin-sidebar-footer">
        <button className="admin-logout-btn" onClick={onLogout}>
          <span className="admin-nav-icon" aria-hidden="true">
            <LogOut size={16} />
          </span>
          <span className="admin-nav-text">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
