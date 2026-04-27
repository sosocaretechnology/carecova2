import { NavLink } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'

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
} from 'lucide-react';

export default function AdminSidebar({ onLogout }) {
    const { session } = useAuth()
    const role = session?.role || 'admin'

    const allItems = [
        { name: 'Dashboard', path: '/admin/dashboard', icon: <LayoutDashboard size={18} />, roles: ['admin', 'sales', 'support'] },
        { name: 'Applications', path: '/admin/applications', icon: <ClipboardList size={18} />, roles: ['admin', 'sales', 'support'] },
        { name: 'Active Loans', path: '/admin/loans', icon: <CreditCard size={18} />, roles: ['admin', 'sales', 'support'] },
        { name: 'Repayments', path: '/admin/repayments', icon: <DollarSign size={18} />, roles: ['admin', 'support'] },
        { name: 'Org Wallets', path: '/admin/wallets', icon: <DollarSign size={18} />, roles: ['admin'] },
        { name: 'Rules & Config', path: '/admin/rules', icon: <Settings size={18} />, roles: ['admin'] },
        { name: 'Audit Logs', path: '/admin/audit', icon: <FileText size={18} />, roles: ['admin'] },
        { name: 'User Management', path: '/admin/users', icon: <UserCheck size={18} />, roles: ['admin'] },
        { name: 'Providers', path: '/admin/providers', icon: <Building2 size={18} />, roles: ['admin'] },
        { name: 'Recovery', path: '/admin/recovery', icon: <AlertTriangle size={18} />, roles: ['admin', 'support', 'sales'] },
        { name: 'Disbursement Queue', path: '/admin/disbursements', icon: <Send size={18} />, roles: ['admin'] },
    ]

    const navItems = allItems.filter(item => item.roles.includes(role))

    return (
        <aside className="admin-sidebar">
            <div className="admin-sidebar-header">
                <div className="admin-logo">CareCova</div>
            </div>

            <nav className="admin-nav">
                {navItems.map((item) => (
                    <NavLink
                        key={item.path}
                        to={item.path}
                        className={({ isActive }) =>
                            `admin-nav-item ${isActive ? 'active' : ''}`
                        }
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
