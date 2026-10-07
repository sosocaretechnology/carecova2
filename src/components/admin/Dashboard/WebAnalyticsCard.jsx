import { useEffect, useState } from 'react'
import { Activity, RefreshCw } from 'lucide-react'
import { analyticsService } from '../../../services/analyticsService'
import './WebAnalyticsCard.css'

const RANGE_LABELS = {
  '7d': 'Last 7 days',
  '30d': 'Last 30 days',
  '90d': 'Last 90 days',
  '12m': 'Last 12 months',
}

const numberFormat = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 1 })
const percentFormat = new Intl.NumberFormat('en-NG', {
  style: 'percent',
  maximumFractionDigits: 1,
})
const costFormat = new Intl.NumberFormat('en-NG', { maximumFractionDigits: 2 })

function formatNumber(value) {
  return numberFormat.format(Number(value) || 0)
}

function formatPercent(value) {
  return percentFormat.format(Number(value) || 0)
}

function formatCost(value) {
  return costFormat.format(Number(value) || 0)
}

function formatDuration(seconds) {
  const totalSeconds = Math.max(0, Math.round(Number(seconds) || 0))
  const minutes = Math.floor(totalSeconds / 60)
  const remainingSeconds = totalSeconds % 60
  return minutes ? `${minutes}m ${remainingSeconds}s` : `${remainingSeconds}s`
}

function formatDate(value, monthly = false) {
  const raw = String(value || '')
  const year = Number(raw.slice(0, 4))
  const month = Number(raw.slice(4, 6)) - 1
  const day = monthly ? 1 : Number(raw.slice(6, 8))
  if (!year || month < 0 || month > 11) return raw
  const date = new Date(year, month, day)
  return new Intl.DateTimeFormat('en-NG', {
    day: monthly ? undefined : 'numeric',
    month: 'short',
    year: monthly ? '2-digit' : undefined,
  }).format(date)
}

function displayDimension(value) {
  return value === '(not set)' || !value ? 'Unassigned' : value
}

function StatBox({ label, value, sub }) {
  return (
    <div className="sub-kpi-card analytics-stat-card">
      <span className="kpi-title">{label}</span>
      <span className="kpi-value">{value}</span>
      {sub && <span className="analytics-stat-sub">{sub}</span>}
    </div>
  )
}

function ReportTable({ title, rows, columns, emptyMessage = 'No data for this period.' }) {
  return (
    <section className="insight-card analytics-panel">
      <h3>{title}</h3>
      {rows?.length ? (
        <div className="analytics-table-scroll">
          <table className="analytics-table">
            <thead>
              <tr>
                {columns.map((column) => <th key={column.key}>{column.label}</th>)}
              </tr>
            </thead>
            <tbody>
              {rows.map((row, rowIndex) => (
                <tr key={`${title}-${rowIndex}`}>
                  {columns.map((column) => (
                    <td key={column.key} className={column.numeric ? 'analytics-number-cell' : ''}>
                      {column.render ? column.render(row[column.key], row) : displayDimension(row[column.key])}
                    </td>
                  ))}
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <p className="analytics-empty">{emptyMessage}</p>
      )}
    </section>
  )
}

function TrendChart({ rows, metric, monthly, onMetricChange }) {
  const maximum = Math.max(1, ...rows.map((row) => Number(row[metric]) || 0))
  const metricLabel = {
    sessions: 'sessions',
    activeUsers: 'active users',
    pageViews: 'page views',
  }[metric]

  return (
    <section className="insight-card analytics-panel analytics-trend-panel">
      <div className="analytics-panel-heading">
        <div>
          <h3>Traffic trend</h3>
          <p>{monthly ? 'Monthly' : 'Daily'} activity for the selected period</p>
        </div>
        <select
          className="analytics-select analytics-chart-select"
          value={metric}
          onChange={(event) => onMetricChange(event.target.value)}
          aria-label="Traffic chart metric"
        >
          <option value="sessions">Sessions</option>
          <option value="activeUsers">Active users</option>
          <option value="pageViews">Page views</option>
        </select>
      </div>
      {rows.length ? (
        <>
          <div className="analytics-trend-chart" role="img" aria-label={`${metricLabel} over time`}>
            {rows.map((row) => {
              const value = Number(row[metric]) || 0
              const height = value ? Math.max(4, (value / maximum) * 100) : 0
              return (
                <div
                  className="analytics-trend-column"
                  key={row.date}
                  title={`${formatDate(row.date, monthly)}: ${formatNumber(value)} ${metricLabel}`}
                  aria-label={`${formatDate(row.date, monthly)}: ${formatNumber(value)} ${metricLabel}`}
                >
                  <span className="analytics-trend-bar" style={{ height: `${height}%` }} />
                </div>
              )
            })}
          </div>
          <div className="analytics-trend-axis">
            <span>{formatDate(rows[0].date, monthly)}</span>
            <span>{formatDate(rows[rows.length - 1].date, monthly)}</span>
          </div>
        </>
      ) : (
        <p className="analytics-empty">No trend data for this period.</p>
      )}
    </section>
  )
}

export default function WebAnalyticsCard() {
  const [stats, setStats] = useState(null)
  const [range, setRange] = useState('30d')
  const [chartMetric, setChartMetric] = useState('sessions')
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)
  const [refreshKey, setRefreshKey] = useState(0)
  const [updatedAt, setUpdatedAt] = useState(null)

  useEffect(() => {
    let current = true
    setError(null)

    if (!analyticsService.isConfigured()) {
      setError('not_configured')
      setLoading(false)
      return () => { current = false }
    }

    setLoading(true)
    analyticsService.getStats(range)
      .then((data) => {
        if (!current) return
        setStats(data)
        setUpdatedAt(new Date())
      })
      .catch(() => {
        if (current) setError('fetch_failed')
      })
      .finally(() => {
        if (current) setLoading(false)
      })

    return () => { current = false }
  }, [range, refreshKey])

  const overview = stats?.overview || {}
  const monthly = range === '12m'

  return (
    <section className="dashboard-insights analytics-dashboard">
      <div className="analytics-toolbar">
        <div className="analytics-title-wrap">
          <h2>Website Analytics</h2>
          <span className="analytics-live-badge"><Activity size={12} /> GA4</span>
        </div>
        <div className="analytics-toolbar-actions">
          <label className="analytics-range-label" htmlFor="analytics-range">Period</label>
          <select
            id="analytics-range"
            className="analytics-select"
            value={range}
            onChange={(event) => setRange(event.target.value)}
          >
            {Object.entries(RANGE_LABELS).map(([value, label]) => <option key={value} value={value}>{label}</option>)}
          </select>
          <button
            className="analytics-refresh-button"
            type="button"
            onClick={() => setRefreshKey((key) => key + 1)}
            disabled={loading}
          >
            <RefreshCw size={15} className={loading ? 'analytics-refresh-spinning' : ''} />
            Refresh
          </button>
        </div>
      </div>

      <div className="analytics-context-row">
        <p>Public website activity · {RANGE_LABELS[range]}</p>
        <p>
          {updatedAt ? `Updated ${updatedAt.toLocaleTimeString('en-NG', { hour: '2-digit', minute: '2-digit' })}` : ''}
          {loading ? ' Loading…' : ''}
        </p>
      </div>

      {error === 'not_configured' && (
        <div className="analytics-message analytics-message-warning">
          <strong>Google Analytics is not configured in this build.</strong>
          <p>Set <code>VITE_GA_MEASUREMENT_ID</code>, <code>GA4_PROPERTY_ID</code>, and <code>GOOGLE_SERVICE_ACCOUNT_JSON</code>, then redeploy.</p>
        </div>
      )}

      {error === 'fetch_failed' && (
        <div className="analytics-message analytics-message-error">
          Could not load GA4 reports. Check that the Vercel function is deployed and its service account has Viewer access to the property.
        </div>
      )}

      {stats && (
        <>
          <div className="analytics-overview-strip">
            <div className="analytics-realtime-card">
              <span className="analytics-realtime-dot" />
              <div>
                <strong>{formatNumber(stats.realtime?.activeUsers || 0)}</strong>
                <span>Active users in the last 30 minutes · all property routes</span>
              </div>
            </div>
            <span className="analytics-range-caption">{RANGE_LABELS[range]} · public routes only</span>
          </div>

          <div className="admin-sub-kpi-grid analytics-kpi-grid">
            <StatBox label="Active users" value={formatNumber(overview.activeUsers)} />
            <StatBox label="New users" value={formatNumber(overview.newUsers)} />
            <StatBox label="Sessions" value={formatNumber(overview.sessions)} />
            <StatBox label="Page views" value={formatNumber(overview.pageViews)} />
            <StatBox label="Engaged sessions" value={formatNumber(overview.engagedSessions)} />
            <StatBox label="Engagement rate" value={formatPercent(overview.engagementRate)} />
            <StatBox label="Bounce rate" value={formatPercent(overview.bounceRate)} />
            <StatBox label="Key events" value={formatNumber(overview.keyEvents)} sub="Mark events as key events in GA4 to count them here" />
            <StatBox label="Avg. session duration" value={formatDuration(overview.averageSessionDuration)} />
            <StatBox label="Views per session" value={formatNumber(overview.sessions ? overview.pageViews / overview.sessions : 0)} />
            <StatBox label="Total events" value={formatNumber(overview.eventCount)} />
          </div>

          <TrendChart rows={stats.trend || []} metric={chartMetric} monthly={monthly} onMetricChange={setChartMetric} />

          <div className="analytics-report-grid">
            <ReportTable
              title="Top pages"
              rows={stats.pages}
              columns={[
                { key: 'path', label: 'Page' },
                { key: 'pageViews', label: 'Views', numeric: true, render: formatNumber },
                { key: 'users', label: 'Users', numeric: true, render: formatNumber },
                { key: 'engagementSeconds', label: 'Engagement', numeric: true, render: formatDuration },
                { key: 'scrolledUsers', label: 'Scrolled', numeric: true, render: formatNumber },
              ]}
            />
            <ReportTable
              title="Traffic channels"
              rows={stats.channels}
              columns={[
                { key: 'channel', label: 'Channel' },
                { key: 'sessions', label: 'Sessions', numeric: true, render: formatNumber },
                { key: 'engagedSessions', label: 'Engaged sessions', numeric: true, render: formatNumber },
                { key: 'engagementRate', label: 'Engagement rate', numeric: true, render: formatPercent },
                { key: 'keyEvents', label: 'Key events', numeric: true, render: formatNumber },
              ]}
            />
            <ReportTable
              title="Landing pages"
              rows={stats.landingPages}
              columns={[
                { key: 'path', label: 'Entry page' },
                { key: 'sessions', label: 'Sessions', numeric: true, render: formatNumber },
                { key: 'engagedSessions', label: 'Engaged sessions', numeric: true, render: formatNumber },
                { key: 'engagementRate', label: 'Engagement rate', numeric: true, render: formatPercent },
                { key: 'keyEvents', label: 'Key events', numeric: true, render: formatNumber },
              ]}
            />
            <ReportTable
              title="Sources and campaigns"
              rows={stats.sources}
              columns={[
                { key: 'sourceMedium', label: 'Source / medium' },
                { key: 'campaign', label: 'Campaign', render: displayDimension },
                { key: 'sessions', label: 'Sessions', numeric: true, render: formatNumber },
                { key: 'keyEvents', label: 'Key events', numeric: true, render: formatNumber },
              ]}
            />
            <ReportTable
              title="Devices"
              rows={stats.devices}
              columns={[
                { key: 'device', label: 'Device' },
                { key: 'users', label: 'Users', numeric: true, render: formatNumber },
                { key: 'sessions', label: 'Sessions', numeric: true, render: formatNumber },
                { key: 'pageViews', label: 'Views', numeric: true, render: formatNumber },
              ]}
            />
            <ReportTable
              title="Browsers and operating systems"
              rows={stats.technology}
              columns={[
                { key: 'browser', label: 'Browser' },
                { key: 'operatingSystem', label: 'Operating system' },
                { key: 'users', label: 'Users', numeric: true, render: formatNumber },
                { key: 'sessions', label: 'Sessions', numeric: true, render: formatNumber },
              ]}
            />
            <ReportTable
              title="Countries"
              rows={stats.countries}
              columns={[
                { key: 'country', label: 'Country' },
                { key: 'users', label: 'Users', numeric: true, render: formatNumber },
                { key: 'sessions', label: 'Sessions', numeric: true, render: formatNumber },
              ]}
            />
            <ReportTable
              title="Events"
              rows={stats.events}
              columns={[
                { key: 'name', label: 'Event' },
                { key: 'count', label: 'Count', numeric: true, render: formatNumber },
                { key: 'users', label: 'Users', numeric: true, render: formatNumber },
                { key: 'keyEvents', label: 'Key events', numeric: true, render: formatNumber },
              ]}
            />
          </div>

          <section className="insight-card analytics-panel analytics-search-panel">
            <h3>Google organic search</h3>
            {stats.searchConsole ? (
              <div className="analytics-search-stats">
                <StatBox label="Clicks" value={formatNumber(stats.searchConsole.clicks)} />
                <StatBox label="Impressions" value={formatNumber(stats.searchConsole.impressions)} />
                <StatBox label="Click-through rate" value={formatPercent(stats.searchConsole.clickThroughRate)} />
                <StatBox label="Average position" value={formatNumber(stats.searchConsole.averagePosition)} />
              </div>
            ) : (
              <p className="analytics-empty">Link Google Search Console to this GA4 property to enable clicks, impressions, and search position reports.</p>
            )}
          </section>

          <section className="insight-card analytics-panel analytics-search-panel">
            <h3>Paid advertising</h3>
            {stats.advertising ? (
              <>
                <p className="analytics-empty analytics-panel-note">Costs use the currency configured for the GA4 property.</p>
                <div className="analytics-search-stats">
                  <StatBox label="Ad impressions" value={formatNumber(stats.advertising.impressions)} />
                  <StatBox label="Ad clicks" value={formatNumber(stats.advertising.clicks)} />
                  <StatBox label="Ad cost" value={formatCost(stats.advertising.cost)} />
                  <StatBox label="Cost per click" value={formatCost(stats.advertising.costPerClick)} />
                  <StatBox label="Cost per key event" value={formatCost(stats.advertising.costPerKeyEvent)} />
                </div>
              </>
            ) : (
              <p className="analytics-empty">Link Google Ads or import campaign cost data into GA4 to enable paid advertising reports.</p>
            )}
          </section>
        </>
      )}
    </section>
  )
}
