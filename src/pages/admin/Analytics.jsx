import WebAnalyticsCard from '../../components/admin/Dashboard/WebAnalyticsCard'

export default function Analytics() {
  return (
    <div className="admin-dashboard-page">
      <div className="admin-page-header">
        <h1>Website Analytics</h1>
        <p>Visitor traffic and page performance from Google Analytics</p>
      </div>
      <WebAnalyticsCard />
    </div>
  )
}
