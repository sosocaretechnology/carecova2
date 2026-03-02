import React, { useState, useEffect } from 'react'
import { auditService } from '../../services/auditService'
import { Search, Filter, FileText, User, Calendar, Clock } from 'lucide-react'

export default function AuditLogs() {
    const [logs, setLogs] = useState([])
    const [filters, setFilters] = useState({
        action: 'all',
        adminName: '',
        loanId: '',
    })
    const [searchTerm, setSearchTerm] = useState('')

    useEffect(() => {
        const data = auditService.getAll()
        setLogs(data)
    }, [])

    const filteredLogs = logs.filter(log => {
        if (filters.action !== 'all' && log.action !== filters.action) return false
        if (filters.adminName && !log.adminName.toLowerCase().includes(filters.adminName.toLowerCase())) return false
        if (filters.loanId && !log.loanId?.toLowerCase().includes(filters.loanId.toLowerCase())) return false

        if (searchTerm) {
            const searchStr = `${log.action} ${log.adminName} ${log.loanId} ${log.details}`.toLowerCase()
            if (!searchStr.includes(searchTerm.toLowerCase())) return false
        }

        return true
    })

    const actions = ['all', ...new Set(logs.map(l => l.action))]

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1>Audit Logs</h1>
                <p>Track every administrative action across the system for security and compliance.</p>
            </div>

            <div className="admin-toolbar flex-between mb-5">
                <div className="admin-search-wrapper flex-1 mr-4">
                    <Search className="search-icon" size={18} />
                    <input
                        type="text"
                        placeholder="Search logs (action, user, loan ID...)"
                        className="admin-search-input"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
                <div className="admin-filters flex items-center gap-3">
                    <div className="flex items-center gap-2">
                        <Filter size={16} className="text-muted" />
                        <select
                            className="admin-select"
                            value={filters.action}
                            onChange={(e) => setFilters({ ...filters, action: e.target.value })}
                        >
                            {actions.map(a => <option key={a} value={a} className="capitalize">{a.replace('_', ' ')}</option>)}
                        </select>
                    </div>
                </div>
            </div>

            <div className="admin-table-container">
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>User</th>
                            <th>Action</th>
                            <th>Loan ID</th>
                            <th>Details</th>
                            <th>Timestamp</th>
                        </tr>
                    </thead>
                    <tbody>
                        {filteredLogs.length === 0 ? (
                            <tr>
                                <td colSpan="5" className="empty-table">No audit logs found.</td>
                            </tr>
                        ) : (
                            filteredLogs.map(log => (
                                <tr key={log.id}>
                                    <td>
                                        <div className="flex items-center gap-2">
                                            <div className="avatar-chip">{log.adminName[0]}</div>
                                            <span className="font-medium">{log.adminName}</span>
                                        </div>
                                    </td>
                                    <td>
                                        <span className={`badge-audit badge-${log.action}`}>
                                            {log.action.replace('_', ' ')}
                                        </span>
                                    </td>
                                    <td>
                                        {log.loanId ? <span className="font-mono text-xs">{log.loanId}</span> : <span className="text-muted">—</span>}
                                    </td>
                                    <td className="max-w-md">
                                        <div className="text-sm truncate-2" title={log.details}>
                                            {log.details}
                                        </div>
                                    </td>
                                    <td>
                                        <div className="text-xs flex flex-col">
                                            <span className="flex items-center gap-1"><Calendar size={10} /> {new Date(log.timestamp).toLocaleDateString()}</span>
                                            <span className="flex items-center gap-1 text-muted"><Clock size={10} /> {new Date(log.timestamp).toLocaleTimeString()}</span>
                                        </div>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
