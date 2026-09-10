import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import IconBadge from '../IconBadge'

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
} from 'lucide-react';

export default function AdminSidebar({ onLogout, open, onClose }) {
    const { session } = useAuth()
    const role = session?.role || 'admin'

    const allItems = [
        { name: 'Dashboard',         path: '/admin/dashboard',      icon: LayoutDashboard, color: 'green',   roles: ['admin', 'sales', 'support'] },
        { name: 'Applications',      path: '/admin/applications',   icon: ClipboardList,   color: 'blue',    roles: ['admin', 'sales', 'support'] },
        { name: 'Active Loans',      path: '/admin/loans',          icon: CreditCard,      color: 'violet',  roles: ['admin', 'sales', 'support'] },
        { name: 'Repayments',        path: '/admin/repayments',     icon: DollarSign,      color: 'emerald', roles: ['admin', 'support'] },
        { name: 'Org Wallets',       path: '/admin/wallets',        icon: Wallet,          color: 'cyan',    roles: ['admin'] },
        { name: 'Rules & Config',    path: '/admin/rules',          icon: Settings,        color: 'slate',   roles: ['admin'] },
        { name: 'Audit Logs',        path: '/admin/audit',          icon: FileText,        color: 'indigo',  roles: ['admin'] },
        { name: 'User Management',   path: '/admin/users',          icon: UserCheck,       color: 'rose',    roles: ['admin'] },
        { name: 'Providers',         path: '/admin/providers',      icon: Building2,       color: 'teal',    roles: ['admin'] },
        { name: 'Recovery',          path: '/admin/recovery',       icon: AlertTriangle,   color: 'orange',  roles: ['admin', 'support', 'sales'] },
        { name: 'Disbursement Queue',path: '/admin/disbursements',  icon: Send,            color: 'sky',     roles: ['admin'] },
        { name: 'Financing',         path: '/admin/financing',      icon: Banknote,        color: 'amber',   roles: ['financier'] },
    ]

    const navItems = allItems.filter(item => item.roles.includes(role))

    return (
        <aside className={`admin-sidebar${open ? ' admin-sidebar--open' : ''}`}>
            <div className="admin-sidebar-header">
                <div className="admin-logo">CareCova</div>
            </div>

            <nav className="admin-nav">
                {navItems.map((item) => {
                    const Icon = item.icon
                    return (
                        <NavLink
                            key={item.path}
                            to={item.path}
                            onClick={onClose}
                            className={({ isActive }) =>
                                `admin-nav-item ${isActive ? 'active' : ''}`
                            }
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
