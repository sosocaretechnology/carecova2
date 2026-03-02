import React from 'react'
import { useNavigate } from 'react-router-dom'
import { MessageSquare, Clock, FileText, AlertTriangle } from 'lucide-react'

export default function SupportDashboardView({ kpis, queues }) {
    const navigate = useNavigate()

    return (
        <div className="support-dashboard">
            <section className="admin-kpi-grid">
                <div className="admin-kpi-card info">
                    <div className="kpi-icon"><MessageSquare size={24} /></div>
                    <div className="kpi-title">Open Tickets</div>
                    <div className="kpi-value">12</div>
                    <div className="kpi-subtext">Awaiting response</div>
                </div>
                <div className="admin-kpi-card warning">
                    <div className="kpi-icon"><Clock size={24} /></div>
                    <div className="kpi-title">Incomplete Apps</div>
                    <div className="kpi-value">{kpis.pending}</div>
                    <div className="kpi-subtext">Missing documentation</div>
                </div>
                <div className="admin-kpi-card primary">
                    <div className="kpi-icon"><FileText size={24} /></div>
                    <div className="kpi-title">Total Applications</div>
                    <div className="kpi-value">{kpis.total}</div>
                    <div className="kpi-subtext">View all history</div>
                </div>
                <div className="admin-kpi-card danger">
                    <div className="kpi-icon"><AlertTriangle size={24} /></div>
                    <div className="kpi-title">Overdue Follow-ups</div>
                    <div className="kpi-value">4</div>
                    <div className="kpi-subtext">High priority</div>
                </div>
            </section>

            <div className="dashboard-content-grid">
                <div className="dashboard-main-col">
                    <section className="dashboard-queues">
                        <h2>Support Queue</h2>
                        <div className="queue-panel">
                            <div className="queue-header">
                                <h3>Need Clarification</h3>
                                <span className="queue-count">{queues.needsReview.length} items</span>
                            </div>
                            <div className="queue-list">
                                {queues.needsReview.map(app => (
                                    <div key={app.id} className="queue-item" onClick={() => navigate(`/admin/applications/${app.id}`)}>
                                        <div className="queue-item-primary">
                                            <span className="queue-item-id">{app.id}</span>
                                            <span className="queue-item-name">{app.fullName}</span>
                                        </div>
                                        <div className="queue-item-secondary">
                                            <span className="queue-item-time">Awaiting documents</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
