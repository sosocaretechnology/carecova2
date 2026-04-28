import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, DollarSign, Building2, LogOut } from 'lucide-react'

const navItems = [
  { name: 'Overview', path: '/provider', icon: <LayoutDashboard size={18} />, end: true },
  { name: 'Patients', path: '/provider/patients', icon: <Users size={18} /> },
  { name: 'Loan Applications', path: '/provider/loans', icon: <CreditCard size={18} /> },
  { name: 'Repayments', path: '/provider/repayments', icon: <DollarSign size={18} /> },
  { name: 'Facility Profile', path: '/provider/profile', icon: <Building2 size={18} /> },
]

export default function ProviderSidebar({ onLogout }) {
  return (
    <aside className="admin-sidebar">
      <div className="admin-sidebar-header">
        <div className="admin-logo">CareCova</div>
        <div style={{ fontSize: '0.75rem', color: '#6b7280', marginTop: '2px', fontWeight: 500 }}>
          Provider Portal
        </div>
      </div>

      <nav className="admin-nav">
        {navItems.map((item) => (
          <NavLink
            key={item.path}
            to={item.path}
            end={item.end}
            className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
          >
            <span className="admin-nav-icon">{item.icon}</span>
            <span className="admin-nav-text">{item.name}</span>
          </NavLink>
        ))}
      </nav>

      <div className="admin-sidebar-footer">
        <button className="admin-logout-btn" onClick={onLogout}>
          <span className="admin-nav-icon"><LogOut size={18} /></span>
          <span className="admin-nav-text">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
