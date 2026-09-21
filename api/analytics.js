import { createSign } from 'crypto'

const PROPERTY_ID = process.env.GA4_PROPERTY_ID
const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

function base64url(input) {
  const buf = typeof input === 'string' ? Buffer.from(input) : input
  return buf.toString('base64').replace(/\+/g, '-').replace(/\//g, '_').replace(/=/g, '')
}

async function getAccessToken(sa) {
  const now = Math.floor(Date.now() / 1000)
  const header = base64url(JSON.stringify({ alg: 'RS256', typ: 'JWT' }))
  const payload = base64url(JSON.stringify({
    iss: sa.client_email,
    scope: 'https://www.googleapis.com/auth/analytics.readonly',
    aud: 'https://oauth2.googleapis.com/token',
    exp: now + 3600,
    iat: now,
  }))

  const sign = createSign('RSA-SHA256')
  sign.update(`${header}.${payload}`)
  const signature = sign.sign(sa.private_key, 'base64url')

  const res = await fetch('https://oauth2.googleapis.com/token', {
    method: 'POST',
    headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
    body: `grant_type=urn:ietf:params:oauth:grant-type:jwt-bearer&assertion=${header}.${payload}.${signature}`,
  })
  const data = await res.json()
  if (!data.access_token) throw new Error(`Token error: ${JSON.stringify(data)}`)
  return data.access_token
}

async function runReport(accessToken, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:runReport`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  return res.json()
}

function metricVal(report, index = 0) {
  return parseInt(report?.rows?.[0]?.metricValues?.[index]?.value || '0', 10)
}

export default async function handler(req, res) {
  res.setHeader('Access-Control-Allow-Origin', '*')
  res.setHeader('Cache-Control', 's-maxage=300') // cache 5 min on Vercel edge

  if (!PROPERTY_ID || !SA_JSON) {
    return res.status(503).json({ error: 'GA4 credentials not configured on server' })
  }

  try {
    const sa = JSON.parse(SA_JSON)
    const accessToken = await getAccessToken(sa)

    const [todayData, weekData, monthData, pagesData] = await Promise.all([
      runReport(accessToken, {
        dateRanges: [{ startDate: 'today', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      }),
      runReport(accessToken, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      }),
      runReport(accessToken, {
        dateRanges: [{ startDate: '30daysAgo', endDate: 'today' }],
        metrics: [{ name: 'activeUsers' }, { name: 'screenPageViews' }],
      }),
      runReport(accessToken, {
        dateRanges: [{ startDate: '7daysAgo', endDate: 'today' }],
        dimensions: [{ name: 'pagePath' }],
        metrics: [{ name: 'screenPageViews' }],
        orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
        limit: 6,
      }),
    ])

    res.json({
      today: {
        visitors: metricVal(todayData, 0),
        pageviews: metricVal(todayData, 1),
      },
      week: {
        visitors: metricVal(weekData, 0),
        pageviews: metricVal(weekData, 1),
      },
      month: {
        visitors: metricVal(monthData, 0),
        pageviews: metricVal(monthData, 1),
      },
      topPages: (pagesData.rows || []).map(row => ({
        path: row.dimensionValues[0].value,
        views: parseInt(row.metricValues[0].value, 10),
      })),
    })
  } catch (err) {
    console.error('GA4 analytics error:', err.message)
    res.status(500).json({ error: 'Failed to fetch analytics data' })
  }
}
