import React from 'react'
import { useNavigate } from 'react-router-dom'
import { TrendingUp, Users, CheckCircle, Clock } from 'lucide-react'

export default function SalesDashboardView({ kpis, queues }) {
    const navigate = useNavigate()

    return (
        <div className="sales-dashboard">
            <section className="admin-kpi-grid">
                <div className="admin-kpi-card primary">
                    <div className="kpi-icon"><Users size={24} /></div>
                    <div className="kpi-title">Your Portfolio</div>
                    <div className="kpi-value">{kpis.total}</div>
                    <div className="kpi-subtext">Assigned applicants</div>
                </div>
                <div className="admin-kpi-card success">
                    <div className="kpi-icon"><CheckCircle size={24} /></div>
                    <div className="kpi-title">Stage 1 Approved</div>
                    <div className="kpi-value">{kpis.stage1Approved}</div>
                    <div className="kpi-subtext">Sent for final review</div>
                </div>
                <div className="admin-kpi-card info">
                    <div className="kpi-icon"><TrendingUp size={24} /></div>
                    <div className="kpi-title">Commission Earned</div>
                    <div className="kpi-value">₦{kpis.commissionEarned.toLocaleString()}</div>
                    <div className="kpi-subtext">Click to view breakdown</div>
                </div>
                <div className="admin-kpi-card warning">
                    <div className="kpi-icon"><Clock size={24} /></div>
                    <div className="kpi-title">Commission Pending</div>
                    <div className="kpi-value">₦{kpis.commissionPending.toLocaleString()}</div>
                    <div className="kpi-subtext">On pending approvals</div>
                </div>
            </section>

            <div className="dashboard-content-grid">
                <div className="dashboard-main-col">
                    <section className="dashboard-queues">
                        <h2>Your Priority Actions</h2>
                        <div className="queue-panel">
                            <div className="queue-header">
                                <h3>Active Portfolio (Needs Data)</h3>
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
                                            <span className="queue-item-amount">₦{app.requestedAmount?.toLocaleString()}</span>
                                            <span className="queue-item-time">{app.status.replace('_', ' ')}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="dashboard-side-col">
                    <section className="dashboard-insights">
                        <h2>Performance</h2>
                        <div className="insight-card">
                            <h3>Repayment Performance</h3>
                            <div className="insight-value">{kpis.repaymentRate}%</div>
                            <div className="progress-bar-container mt-2">
                                <div className="progress-bar-fill success" style={{ width: `${kpis.repaymentRate}%` }}></div>
                            </div>
                            <p className="insight-context">Collection rate from your portfolio</p>
                        </div>

                        <div className="insight-card mt-4">
                            <h3>Commission History</h3>
                            <div className="text-sm">
                                <div className="flex-between py-1 border-bottom">
                                    <span>Locked (Disbursed)</span>
                                    <strong className="text-success">₦{kpis.commissionEarned.toLocaleString()}</strong>
                                </div>
                                <div className="flex-between py-1 border-bottom">
                                    <span>In Review</span>
                                    <strong className="text-warning">₦{65000?.toLocaleString()}</strong>
                                </div>
                                <div className="flex-between py-1 border-bottom">
                                    <span>Last Payout</span>
                                    <span className="text-muted">Feb 15, 2026</span>
                                </div>
                            </div>
                            <button className="button button--ghost w-full mt-3 text-xs">View Full Ledger</button>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
