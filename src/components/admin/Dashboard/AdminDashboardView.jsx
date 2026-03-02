import React from 'react'
import { useNavigate } from 'react-router-dom'
import { Shield, TrendingUp, DollarSign, AlertCircle } from 'lucide-react'
import StatusBadge from '../../StatusBadge'

export default function AdminDashboardView({ kpis, queues, insights }) {
    const navigate = useNavigate()

    return (
        <div className="admin-dashboard">
            <section className="admin-kpi-grid">
                <div className="admin-kpi-card">
                    <div className="kpi-title">Total Disbursed</div>
                    <div className="kpi-value">₦{kpis.totalDisbursedAmount.toLocaleString()}</div>
                    <div className="kpi-subtext">{kpis.disbursed} loans total</div>
                </div>
                <div className="admin-kpi-card warning">
                    <div className="kpi-title">Stage 2 Review</div>
                    <div className="kpi-value">{kpis.stage1Approved}</div>
                    <div className="kpi-subtext">Awaiting final credit decision</div>
                </div>
                <div className="admin-kpi-card primary">
                    <div className="kpi-title">Active Portfolio</div>
                    <div className="kpi-value">{kpis.total}</div>
                    <div className="kpi-subtext">Total applications</div>
                </div>
                <div className="admin-kpi-card danger">
                    <div className="kpi-title">Portfolio At Risk</div>
                    <div className="kpi-value">₦{kpis.overdueValue.toLocaleString()}</div>
                    <div className="kpi-subtext">{kpis.overdueCount} loans in arrears</div>
                </div>
            </section>

            <section className="admin-sub-kpi-grid">
                <div className="sub-kpi-card">
                    <span className="kpi-title">New Applications</span>
                    <span className="kpi-value">{kpis.newApplications}</span>
                </div>
                <div className="sub-kpi-card">
                    <span className="kpi-title">Pending Review</span>
                    <span className="kpi-value">{kpis.pendingReview}</span>
                </div>
                <div className="sub-kpi-card">
                    <span className="kpi-title">Awaiting Documents</span>
                    <span className="kpi-value">{kpis.awaitingDocuments}</span>
                </div>
                <div className="sub-kpi-card">
                    <span className="kpi-title">Ready to Disburse</span>
                    <span className="kpi-value">{kpis.readyToDisburse}</span>
                </div>
                <div className="sub-kpi-card">
                    <span className="kpi-title">Active Loans</span>
                    <span className="kpi-value">{kpis.activeLoansCount}</span>
                </div>
                <div className="sub-kpi-card">
                    <span className="kpi-title">Overdue Payments</span>
                    <span className="kpi-value">{kpis.overdueCount}</span>
                </div>
            </section>

            <div className="dashboard-content-grid">
                <div className="dashboard-main-col">
                    <section className="dashboard-queues">
                        <h2>System Queues</h2>
                        <div className="queue-panel">
                            <div className="queue-header warning">
                                <h3>Final Credit Approval (Stage 2)</h3>
                                <span className="queue-count">{queues.needsReview.filter(q => q.status === 'stage_2_review').length} items</span>
                            </div>
                            <div className="queue-list">
                                {queues.needsReview.filter(q => q.status === 'stage_2_review').map(app => (
                                    <div key={app.id} className="queue-item" onClick={() => navigate(`/admin/applications/${app.id}`)}>
                                        <div className="queue-item-primary">
                                            <span className="queue-item-name">{app.fullName}</span>
                                            <span className="risk-badge risk-badge-medium">Risk: {app.riskScore}</span>
                                        </div>
                                        <div className="queue-item-secondary">
                                            <span className="queue-item-amount">₦{app.requestedAmount?.toLocaleString()}</span>
                                            <span className="queue-item-time">Sales: {app.assignedTo}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>

                        <div className="queue-panel">
                            <div className="queue-header danger">
                                <h3>High Priority Issues</h3>
                                <span className="queue-count">{queues.highRisk.length} items</span>
                            </div>
                            <div className="queue-list">
                                {queues.highRisk.map(app => (
                                    <div key={app.id} className="queue-item" onClick={() => navigate(`/admin/applications/${app.id}`)}>
                                        <div className="queue-item-primary">
                                            <span className="queue-item-name">{app.fullName}</span>
                                            <StatusBadge status={app.status} />
                                        </div>
                                        <div className="queue-item-secondary">
                                            <span className="risk-badge risk-badge-high">Risk: {app.riskScore}</span>
                                        </div>
                                    </div>
                                ))}
                            </div>
                        </div>
                    </section>
                </div>

                <div className="dashboard-side-col">
                    <section className="dashboard-insights">
                        <h2>System Health</h2>
                        <div className="insight-card">
                            <h3>Repayment Rate</h3>
                            <div className="insight-value">{kpis.repaymentRate}%</div>
                            <div className="progress-bar-container mt-2">
                                <div className="progress-bar-fill success" style={{ width: `${kpis.repaymentRate}%` }}></div>
                            </div>
                        </div>

                        <div className="insight-card">
                            <h3>Approval Efficiency</h3>
                            <div className="insight-value">{insights.avgDecisionTimeHours}h</div>
                            <p className="insight-context">Avg. turnaround time</p>
                        </div>
                    </section>
                </div>
            </div>
        </div>
    )
}
