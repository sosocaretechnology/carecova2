import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import logo from '../../assets/logo.png'

import {
  LayoutDashboard,
  ClipboardList,
  CreditCard,
  DollarSign,
  Settings,
  FileText,
  LogOut,
  UserCheck,
  AlertTriangle,
  Send,
  Building2,
  Banknote,
  Wallet,
  BarChart2,
  Users,
  X,
} from 'lucide-react'

const NAV_GROUPS = [
  {
    label: 'Overview',
    items: [
      { name: 'Dashboard', path: '/admin/dashboard', icon: LayoutDashboard, roles: ['admin', 'sales', 'support'] },
    ],
  },
  {
    label: 'Applications',
    items: [
      { name: 'Applications',  path: '/admin/applications', icon: ClipboardList, roles: ['admin', 'sales', 'support'] },
      { name: 'Customers',     path: '/admin/customers',    icon: Users,         roles: ['admin', 'credit_officer', 'support'] },
    ],
  },
  {
    label: 'Credit Operations',
    items: [
      { name: 'Active Credits',     path: '/admin/loans',         icon: CreditCard,    roles: ['admin', 'sales', 'support'] },
      { name: 'Repayments',         path: '/admin/repayments',    icon: DollarSign,    roles: ['admin', 'support'] },
      { name: 'Recovery',           path: '/admin/recovery',      icon: AlertTriangle, roles: ['admin', 'support', 'sales'] },
      { name: 'Disbursement Queue', path: '/admin/disbursements', icon: Send,          roles: ['admin'] },
    ],
  },
  {
    label: 'Partners',
    items: [
      { name: 'Providers',  path: '/admin/providers', icon: Building2, roles: ['admin', 'sales'] },
      { name: 'Financing',  path: '/admin/financing', icon: Banknote,  roles: ['financier'] },
    ],
  },
  {
    label: 'Insights',
    items: [
      { name: 'Analytics',  path: '/admin/analytics', icon: BarChart2, roles: ['admin'] },
      { name: 'Audit Logs', path: '/admin/audit',     icon: FileText,  roles: ['admin'] },
    ],
  },
  {
    label: 'Administration',
    items: [
      { name: 'User Management', path: '/admin/users',    icon: UserCheck, roles: ['admin'] },
      { name: 'Rules & Config',  path: '/admin/rules',    icon: Settings,  roles: ['admin'] },
      { name: 'Org Wallets',     path: '/admin/wallets',  icon: Wallet,    roles: ['admin'] },
    ],
  },
]

export default function AdminSidebar({ onLogout, open, onClose, session }) {
  const { session: authSession } = useAuth()
  const resolvedSession = session || authSession
  const role = resolvedSession?.role || 'admin'

  const visibleGroups = NAV_GROUPS.map(group => ({
    ...group,
    items: group.items.filter(item => item.roles.includes(role)),
  })).filter(group => group.items.length > 0)

  const portalLabel = role === 'financier' ? 'Financier Portal'
    : role === 'credit_officer' ? 'Credit Portal'
    : 'Admin Portal'

  return (
    <aside className={`admin-sidebar${open ? ' admin-sidebar--open' : ''}`} aria-label="Admin navigation">
      <div className="admin-sidebar-header">
        <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between' }}>
          <a href="/admin/dashboard" className="admin-sidebar-brand" onClick={onClose}>
            <img src={logo} alt="CareCova" className="admin-sidebar-logo" />
            <div>
              <div className="admin-sidebar-logo-text">CareCova</div>
              <div className="admin-sidebar-portal-label">{portalLabel}</div>
            </div>
          </a>
          {/* Mobile close button */}
          <button
            className="admin-hamburger"
            onClick={onClose}
            aria-label="Close menu"
            style={{ display: open ? 'flex' : undefined }}
          >
            <X size={18} />
          </button>
        </div>
      </div>

      <nav className="admin-nav" aria-label="Main navigation">
        {visibleGroups.map((group) => (
          <div key={group.label} className="admin-nav-group">
            <div className="admin-nav-group-label">{group.label}</div>
            {group.items.map((item) => {
              const Icon = item.icon
              return (
                <NavLink
                  key={item.path}
                  to={item.path}
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
        ))}
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
