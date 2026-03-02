import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { Clock, CheckCircle, XCircle, TrendingUp, AlertTriangle, ArrowRight } from 'lucide-react'
import StatusBadge from '../../components/StatusBadge'

export default function CreditDashboard() {
    const [kpis, setKpis] = useState(null)
    const [queue, setQueue] = useState([])
    const navigate = useNavigate()

    useEffect(() => {
        adminService.getKPIs().then(setKpis)
        adminService.getDisbursementQueue().then(setQueue)
    }, [])

    const readyItems = queue.filter(l => ['pending_disbursement', 'approved'].includes(l.status))
    const clarificationItems = queue.filter(l => l.status === 'need_more_info')
    const processingCount = queue.filter(l => l.status === 'disbursement_processing').length

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1>Disbursement Dashboard</h1>
                <p>Manage payouts, hospital verification, and loan activation</p>
            </div>

            {/* KPI Cards */}
            <div className="admin-kpi-grid">
                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#fff7ed' }}>
                        <Clock size={22} style={{ color: '#f97316' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Pending Disbursements</p>
                        <h2 className="kpi-value">{kpis?.pendingDisbursementCount ?? '—'}</h2>
                        <p className="kpi-sub">₦{(kpis?.pendingDisbursementAmount ?? 0).toLocaleString()} awaiting payout</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#f0fdf4' }}>
                        <CheckCircle size={22} style={{ color: '#22c55e' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Disbursed Today</p>
                        <h2 className="kpi-value">{kpis?.disbursedTodayCount ?? '—'}</h2>
                        <p className="kpi-sub">₦{(kpis?.disbursedTodayAmount ?? 0).toLocaleString()} sent</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#fef2f2' }}>
                        <XCircle size={22} style={{ color: '#ef4444' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Failed / Returned</p>
                        <h2 className="kpi-value">{kpis?.failedDisbursements ?? '—'}</h2>
                        <p className="kpi-sub">Requires review</p>
                    </div>
                </div>

                <div className="kpi-card">
                    <div className="kpi-icon" style={{ background: '#eff6ff' }}>
                        <TrendingUp size={22} style={{ color: '#3b82f6' }} />
                    </div>
                    <div className="kpi-content">
                        <p className="kpi-label">Total in Queue</p>
                        <h2 className="kpi-value">{queue.length}</h2>
                        <p className="kpi-sub">Active cases</p>
                    </div>
                </div>
            </div>

            {/* Processing Banner */}
            {processingCount > 0 && (
                <div className="mb-5 p-4 rounded-lg flex items-center gap-3"
                    style={{ background: '#dbeafe', border: '1px solid #93c5fd' }}>
                    <div className="kpi-icon" style={{ background: '#bfdbfe', width: 32, height: 32, minWidth: 32 }}>
                        <Clock size={16} style={{ color: '#1d4ed8' }} />
                    </div>
                    <span className="text-sm font-medium" style={{ color: '#1d4ed8' }}>
                        {processingCount} disbursement{processingCount !== 1 ? 's' : ''} currently processing…
                    </span>
                </div>
            )}

            {/* Queue Sections */}
            <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: 'var(--space-4)' }}>
                {/* Ready for Payout */}
                <div className="detail-card">
                    <div className="flex items-center gap-2 mb-4">
                        <CheckCircle size={16} style={{ color: '#22c55e' }} />
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                            Ready for Payout
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{ background: '#dcfce7', color: '#15803d' }}>
                                {readyItems.length}
                            </span>
                        </h3>
                    </div>

                    {readyItems.length === 0 ? (
                        <p className="text-sm text-muted italic">No cases ready for payout.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {readyItems.slice(0, 5).map(l => (
                                <div
                                    key={l.id}
                                    onClick={() => navigate(`/credit/disbursements/${l.id}`)}
                                    className="flex-between"
                                    style={{
                                        padding: '12px 14px',
                                        background: '#f9fafb',
                                        borderRadius: '8px',
                                        border: '1px solid #e5e7eb',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.15s, background 0.15s',
                                    }}
                                    onMouseOver={e => e.currentTarget.style.borderColor = '#22c55e'}
                                    onMouseOut={e => e.currentTarget.style.borderColor = '#e5e7eb'}
                                >
                                    <div>
                                        <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.fullName || l.patientName}</div>
                                        <div style={{ fontSize: '0.7rem', color: '#6b7280', fontFamily: 'monospace' }}>{l.id}</div>
                                    </div>
                                    <div className="flex items-center gap-2">
                                        <span style={{ fontWeight: 700, fontSize: '0.875rem' }}>
                                            ₦{(l.approvedAmount || 0).toLocaleString()}
                                        </span>
                                        <ArrowRight size={14} style={{ color: '#9ca3af' }} />
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>

                {/* Needs Clarification */}
                <div className="detail-card">
                    <div className="flex items-center gap-2 mb-4">
                        <AlertTriangle size={16} style={{ color: '#f59e0b' }} />
                        <h3 style={{ margin: 0, fontSize: '0.95rem', fontWeight: 700 }}>
                            Needs Clarification
                            <span className="ml-2 px-2 py-0.5 rounded-full text-xs font-bold"
                                style={{ background: '#fef3c7', color: '#b45309' }}>
                                {clarificationItems.length}
                            </span>
                        </h3>
                    </div>

                    {clarificationItems.length === 0 ? (
                        <p className="text-sm text-muted italic">No cases awaiting clarification.</p>
                    ) : (
                        <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                            {clarificationItems.slice(0, 5).map(l => (
                                <div
                                    key={l.id}
                                    onClick={() => navigate(`/credit/disbursements/${l.id}`)}
                                    style={{
                                        padding: '12px 14px',
                                        background: '#fffbeb',
                                        borderRadius: '8px',
                                        border: '1px solid #fde68a',
                                        cursor: 'pointer',
                                        transition: 'border-color 0.15s',
                                    }}
                                    onMouseOver={e => e.currentTarget.style.borderColor = '#f59e0b'}
                                    onMouseOut={e => e.currentTarget.style.borderColor = '#fde68a'}
                                >
                                    <div style={{ fontWeight: 600, fontSize: '0.875rem' }}>{l.fullName || l.patientName}</div>
                                    <div style={{ fontSize: '0.75rem', color: '#92400e', marginTop: 2 }}>
                                        {l.correctionNotes || 'Missing details'}
                                    </div>
                                </div>
                            ))}
                        </div>
                    )}
                </div>
            </div>

            {/* View All CTA */}
            <div className="mt-4 text-center">
                <button
                    className="button button--secondary"
                    onClick={() => navigate('/credit/disbursements')}
                >
                    View Full Disbursement Queue →
                </button>
            </div>
        </div>
    )
}
