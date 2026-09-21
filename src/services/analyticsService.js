const POSTHOG_HOST = (import.meta.env.VITE_POSTHOG_HOST || 'https://us.i.posthog.com').replace(/\/$/, '')
const PROJECT_ID = import.meta.env.VITE_POSTHOG_PROJECT_ID
const PERSONAL_KEY = import.meta.env.VITE_POSTHOG_PERSONAL_KEY

async function runQuery(sql) {
  const res = await fetch(`${POSTHOG_HOST}/api/projects/${PROJECT_ID}/query/`, {
    method: 'POST',
    headers: {
      'Content-Type': 'application/json',
      Authorization: `Bearer ${PERSONAL_KEY}`,
    },
    body: JSON.stringify({ query: { kind: 'HogQLQuery', query: sql } }),
  })
  if (!res.ok) throw new Error(`PostHog query failed: ${res.status}`)
  const data = await res.json()
  return data.results ?? []
}

export const analyticsService = {
  isConfigured() {
    return !!(PROJECT_ID && PERSONAL_KEY)
  },

  async getStats() {
    const [todayRows, weekRows, monthRows, pagesRows] = await Promise.all([
      runQuery(`
        SELECT count(distinct person_id) as visitors, count(*) as pageviews
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= toStartOfDay(now())
      `),
      runQuery(`
        SELECT count(distinct person_id) as visitors, count(*) as pageviews
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 7 DAY
      `),
      runQuery(`
        SELECT count(distinct person_id) as visitors, count(*) as pageviews
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 30 DAY
      `),
      runQuery(`
        SELECT
          replaceRegexpAll(properties.$current_url, 'https?://[^/]+', '') as path,
          count(*) as views
        FROM events
        WHERE event = '$pageview'
          AND timestamp >= now() - INTERVAL 7 DAY
        GROUP BY path
        ORDER BY views DESC
        LIMIT 6
      `),
    ])

    return {
      today: {
        visitors: Number(todayRows[0]?.[0] ?? 0),
        pageviews: Number(todayRows[0]?.[1] ?? 0),
      },
      week: {
        visitors: Number(weekRows[0]?.[0] ?? 0),
        pageviews: Number(weekRows[0]?.[1] ?? 0),
      },
      month: {
        visitors: Number(monthRows[0]?.[0] ?? 0),
        pageviews: Number(monthRows[0]?.[1] ?? 0),
      },
      topPages: (pagesRows || []).map(([path, views]) => ({ path: path || '/', views: Number(views) })),
    }
  },
}
