import { useState, useEffect } from 'react'
import { analyticsService } from '../../../services/analyticsService'

function StatBox({ label, value, sub }) {
  return (
    <div className="sub-kpi-card">
      <span className="kpi-title">{label}</span>
      <span className="kpi-value">{value.toLocaleString()}</span>
      {sub && <span style={{ fontSize: '11px', color: 'var(--color-text-muted)' }}>{sub}</span>}
    </div>
  )
}

export default function WebAnalyticsCard() {
  const [stats, setStats] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState(null)

  useEffect(() => {
    if (!analyticsService.isConfigured()) {
      setError('not_configured')
      setLoading(false)
      return
    }
    analyticsService.getStats()
      .then(setStats)
      .catch(() => setError('fetch_failed'))
      .finally(() => setLoading(false))
  }, [])

  return (
    <section className="dashboard-insights" style={{ marginTop: '24px' }}>
      <h2 style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
        Website Analytics
        <span style={{
          fontSize: '10px',
          fontWeight: 700,
          letterSpacing: '0.1em',
          textTransform: 'uppercase',
          padding: '2px 8px',
          borderRadius: '999px',
          background: 'var(--color-primary-muted)',
          color: 'var(--color-primary)',
        }}>Live</span>
      </h2>

      {loading && (
        <p style={{ fontSize: '13px', color: 'var(--color-text-muted)', padding: '16px 0' }}>
          Loading visitor stats…
        </p>
      )}

      {error === 'not_configured' && (
        <div style={{
          background: 'var(--color-bg-warm)',
          border: '1px solid var(--color-border)',
          borderRadius: '12px',
          padding: '16px 20px',
          fontSize: '13px',
          color: 'var(--color-text-muted)',
          lineHeight: '1.6',
        }}>
          <strong style={{ color: 'var(--color-text)' }}>Google Analytics not configured.</strong>
          <p style={{ marginTop: '6px' }}>Make sure <code>VITE_GA_MEASUREMENT_ID</code>, <code>GA4_PROPERTY_ID</code>, and <code>GOOGLE_SERVICE_ACCOUNT_JSON</code> are set, then deploy to Vercel.</p>
        </div>
      )}

      {error === 'fetch_failed' && (
        <p style={{ fontSize: '13px', color: 'var(--color-error)', padding: '8px 0' }}>
          Could not load analytics — the Vercel function may not be deployed yet, or check the GA4 credentials in Vercel environment variables.
        </p>
      )}

      {stats && (
        <>
          <div className="admin-sub-kpi-grid" style={{ marginBottom: '20px' }}>
            <StatBox label="Visitors Today" value={stats.today.visitors} sub={`${stats.today.pageviews} pageviews`} />
            <StatBox label="Visitors (7d)" value={stats.week.visitors} sub={`${stats.week.pageviews} pageviews`} />
            <StatBox label="Visitors (30d)" value={stats.month.visitors} sub={`${stats.month.pageviews} pageviews`} />
          </div>

          {stats.topPages.length > 0 && (
            <div className="insight-card">
              <h3>Top Pages (Last 7 Days)</h3>
              <div style={{ marginTop: '12px', display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {stats.topPages.map(({ path, views }) => {
                  const max = stats.topPages[0].views
                  const pct = Math.round((views / max) * 100)
                  return (
                    <div key={path} style={{ display: 'flex', alignItems: 'center', gap: '10px' }}>
                      <span style={{
                        flex: 1,
                        fontSize: '12px',
                        fontWeight: 600,
                        color: 'var(--color-text)',
                        overflow: 'hidden',
                        textOverflow: 'ellipsis',
                        whiteSpace: 'nowrap',
                      }}>{path || '/'}</span>
                      <div style={{
                        width: '80px',
                        height: '6px',
                        borderRadius: '999px',
                        background: 'var(--color-border)',
                        overflow: 'hidden',
                      }}>
                        <div style={{
                          width: `${pct}%`,
                          height: '100%',
                          borderRadius: '999px',
                          background: 'var(--color-primary)',
                        }} />
                      </div>
                      <span style={{
                        fontSize: '12px',
                        fontWeight: 700,
                        color: 'var(--color-text-secondary)',
                        minWidth: '32px',
                        textAlign: 'right',
                      }}>{views.toLocaleString()}</span>
                    </div>
                  )
                })}
              </div>
            </div>
          )}
        </>
      )}
    </section>
  )
}
