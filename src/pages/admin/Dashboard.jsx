import { useState, useEffect } from 'react'
import { useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { useAuth } from '../../hooks/useAuth'
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
                const [kpiData, queueData, insightData] = await Promise.all([
                    adminService.getKPIs(),
                    adminService.getQueues(),
                    adminService.getInsights()
                ])
                setKpis(kpiData)
                setQueues(queueData)
                setInsights(insightData)
            } catch (error) {
                console.error('Error loading dashboard data:', error)
            } finally {
                setLoading(false)
            }
        }
        loadData()
    }, [])

    if (loading || !kpis || !queues || !insights) {
        return <div className="admin-loading">Loading dashboard metrics...</div>
    }

    const renderDashboard = () => {
        switch (session?.role) {
            case 'sales':
                return <SalesDashboardView kpis={kpis} queues={queues} />
            case 'support':
                return <SupportDashboardView kpis={kpis} queues={queues} />
            case 'admin':
            default:
                return <AdminDashboardView kpis={kpis} queues={queues} insights={insights} />
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
