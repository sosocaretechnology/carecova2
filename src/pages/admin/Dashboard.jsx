import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../hooks/useAuth'
import FullScreenLoader from '../../components/ui/FullScreenLoader'
import SalesDashboardView from '../../components/admin/Dashboard/SalesDashboardView'
import AdminDashboardView from '../../components/admin/Dashboard/AdminDashboardView'
import SupportDashboardView from '../../components/admin/Dashboard/SupportDashboardView'
import { AlertTriangle, RefreshCw } from 'lucide-react'

export default function Dashboard() {
    const navigate = useNavigate()
    const { session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState(null)
    const [kpis, setKpis] = useState(null)
    const [queues, setQueues] = useState(null)
    const [insights, setInsights] = useState(null)

    useEffect(() => {
        if (session?.role === 'financier') {
            navigate('/admin/financing', { replace: true })
        }
    }, [session?.role, navigate])

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
                setError(null)
                if (session?.role === 'sales') {
                    try {
                        const salesData = await adminService.getSalesDashboard()
                        if (salesData) {
                            setKpis(salesData.kpis)
                            setQueues(salesData.queues)
                            setInsights({})
                        } else {
                            setKpis({ total: 0, stage1Approved: 0, commissionAvailable: 0, commissionLocked: 0, repaymentRate: 0 })
                            setQueues({ needsReview: [] })
                            setInsights({})
                        }
                    } catch (_) {
                        setKpis({ total: 0, stage1Approved: 0, commissionAvailable: 0, commissionLocked: 0, repaymentRate: 0 })
                        setQueues({ needsReview: [] })
                        setInsights({})
                    }
                } else {
                    const [kpiData, queueData, insightData] = await Promise.all([
                        adminService.getKPIs(),
                        adminService.getQueues(),
                        adminService.getInsights()
                    ])
                    setKpis(kpiData)
                    setQueues(queueData)
                    setInsights(insightData)
                }
            } catch (err) {
                console.error('Error loading dashboard data:', err)
                setError(err.message || 'Failed to load dashboard data')
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [session?.role])

    if (session?.role === 'financier') {
        return <FullScreenLoader label="Redirecting to Financing…" />
    }

    if (loading || !kpis || !queues) {
        return <FullScreenLoader label="Loading dashboard metrics…" />
    }

    if (error) {
        return (
            <div className="admin-page">
                <div className="admin-page-header">
                    <h1>Dashboard</h1>
                </div>
                <div className="cc-error-state">
                    <AlertTriangle size={36} className="cc-error-state-icon" />
                    <div className="cc-error-state-title">Could not load dashboard</div>
                    <div className="cc-error-state-desc">{error}</div>
                    <button
                        className="button button--secondary button--sm"
                        onClick={() => { setError(null); setLoading(true) }}
                    >
                        <RefreshCw size={14} /> Try again
                    </button>
                </div>
            </div>
        )
    }

    const dashboardTitle = {
        sales: 'Sales Dashboard',
        support: 'Support Dashboard',
        credit_officer: 'Credit Officer Dashboard',
    }[session?.role] || 'Admin Dashboard'

    const dashboardSub = {
        sales: 'Manage your portfolio and track performance',
        support: 'Handle customer support and resolve issues',
        credit_officer: 'Credit review queue and disbursement operations',
    }[session?.role] || 'Platform overview and operational queues'

    const renderDashboard = () => {
        switch (session?.role) {
            case 'sales':
                return <SalesDashboardView kpis={kpis} queues={queues} />
            case 'support':
                return <SupportDashboardView kpis={kpis} queues={queues} />
            case 'credit_officer':
                return <AdminDashboardView kpis={kpis} queues={queues} insights={insights ?? {}} />
            case 'admin':
            case 'super_admin':
            default:
                return <AdminDashboardView kpis={kpis} queues={queues} insights={insights ?? {}} />
        }
    }

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <h1>{dashboardTitle}</h1>
                <p>{dashboardSub}</p>
            </div>
            {renderDashboard()}
        </div>
    )
}
