import { NavLink } from 'react-router-dom'
import { LayoutDashboard, Users, CreditCard, DollarSign, Building2, LogOut } from 'lucide-react'
import IconBadge from '../IconBadge'

const navItems = [
  { name: 'Overview',          path: '/provider',             icon: LayoutDashboard, color: 'green',  end: true },
  { name: 'Patients',          path: '/provider/patients',    icon: Users,           color: 'blue'           },
  { name: 'Loan Applications', path: '/provider/loans',       icon: CreditCard,      color: 'violet'         },
  { name: 'Repayments',        path: '/provider/repayments',  icon: DollarSign,      color: 'emerald'        },
  { name: 'Facility Profile',  path: '/provider/profile',     icon: Building2,       color: 'teal'           },
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
        {navItems.map((item) => {
          const Icon = item.icon
          return (
            <NavLink
              key={item.path}
              to={item.path}
              end={item.end}
              className={({ isActive }) => `admin-nav-item ${isActive ? 'active' : ''}`}
            >
              <span className="admin-nav-icon">
                <IconBadge color={item.color} size="sm">
                  <Icon size={16} />
                </IconBadge>
              </span>
              <span className="admin-nav-text">{item.name}</span>
            </NavLink>
          )
        })}
      </nav>

      <div className="admin-sidebar-footer">
        <button className="admin-logout-btn" onClick={onLogout}>
          <span className="admin-nav-icon">
            <IconBadge color="red" size="sm">
              <LogOut size={16} />
            </IconBadge>
          </span>
          <span className="admin-nav-text">Sign Out</span>
        </button>
      </div>
    </aside>
  )
}
