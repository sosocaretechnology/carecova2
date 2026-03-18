import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../hooks/useAuth'
import FullScreenLoader from '../../components/ui/FullScreenLoader'
import SalesDashboardView from '../../components/admin/Dashboard/SalesDashboardView'
import AdminDashboardView from '../../components/admin/Dashboard/AdminDashboardView'
import SupportDashboardView from '../../components/admin/Dashboard/SupportDashboardView'

export default function Dashboard() {
    const { session } = useAuth()
    const [loading, setLoading] = useState(true)
    const [kpis, setKpis] = useState(null)
    const [queues, setQueues] = useState(null)
    const [insights, setInsights] = useState(null)

    useEffect(() => {
        async function loadData() {
            try {
                setLoading(true)
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
            } catch (error) {
                console.error('Error loading dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [session?.role])

    if (loading || !kpis || !queues) {
        return <FullScreenLoader label="Loading dashboard metrics…" />
    }

    const renderDashboard = () => {
        switch (session?.role) {
            case 'sales':
                return <SalesDashboardView kpis={kpis} queues={queues} />
            case 'support':
                return <SupportDashboardView kpis={kpis} queues={queues} />
            case 'admin':
            default:
                return <AdminDashboardView kpis={kpis} queues={queues} insights={insights ?? {}} />
        }
    }

    return (
        <div className="admin-dashboard-page">
            <div className="admin-page-header">
                <h1>{session?.role === 'sales' ? 'Sales Dashboard' : session?.role === 'support' ? 'Support Dashboard' : 'Admin Dashboard'}</h1>
                <p>{session?.role === 'sales' ? 'Manage your portfolio and performance' : 'Overview of loan applications and operations'}</p>
            </div>

            {renderDashboard()}
        </div>
    )
}
