import { createSign } from 'crypto'

const PROPERTY_ID = process.env.GA4_PROPERTY_ID
const SA_JSON = process.env.GOOGLE_SERVICE_ACCOUNT_JSON

const PUBLIC_PATHS = [
  '/',
  '/how-it-works',
  '/calculator',
  '/faq',
  '/privacy',
  '/apply',
  '/eligibility',
]

const DATE_RANGES = {
  '7d': { startDate: '6daysAgo', endDate: 'today' },
  '30d': { startDate: '29daysAgo', endDate: 'today' },
  '90d': { startDate: '89daysAgo', endDate: 'today' },
  '12m': { startDate: '365daysAgo', endDate: 'today' },
}

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

async function postReport(accessToken, endpoint, body) {
  const res = await fetch(
    `https://analyticsdata.googleapis.com/v1beta/properties/${PROPERTY_ID}:${endpoint}`,
    {
      method: 'POST',
      headers: {
        Authorization: `Bearer ${accessToken}`,
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    }
  )
  const data = await res.json()
  if (!res.ok) {
    throw new Error(data?.error?.message || `GA4 ${endpoint} request failed (${res.status})`)
  }
  return data
}

function batchRunReports(accessToken, requests) {
  return postReport(accessToken, 'batchRunReports', { requests })
}

function runReport(accessToken, body) {
  return postReport(accessToken, 'runReport', body)
}

function runRealtimeReport(accessToken, body) {
  return postReport(accessToken, 'runRealtimeReport', body)
}

function publicPathFilter(fieldName = 'pagePath') {
  return {
    filter: {
      fieldName,
      inListFilter: { values: PUBLIC_PATHS, caseSensitive: true },
    },
  }
}

function toNumber(value) {
  const parsed = Number.parseFloat(value || '0')
  return Number.isFinite(parsed) ? parsed : 0
}

function reportRows(report) {
  const dimensionHeaders = report?.dimensionHeaders || []
  const metricHeaders = report?.metricHeaders || []
  return (report?.rows || []).map((row) => {
    const dimensions = Object.fromEntries(dimensionHeaders.map((header, index) => [
      header.name,
      row.dimensionValues?.[index]?.value || '',
    ]))
    const metrics = Object.fromEntries(metricHeaders.map((header, index) => [
      header.name,
      toNumber(row.metricValues?.[index]?.value),
    ]))
    return { ...dimensions, ...metrics }
  })
}

function reportSummary(report) {
  return reportRows(report)[0] || {}
}

function selectedRange(req) {
  const requested = Array.isArray(req.query?.range) ? req.query.range[0] : req.query?.range
  return DATE_RANGES[requested] ? requested : '30d'
}

function createRequests(dateRange, trendDimension) {
  const base = {
    dateRanges: [dateRange],
    dimensionFilter: publicPathFilter(),
  }

  return [
    {
      ...base,
      metrics: [
        { name: 'activeUsers' },
        { name: 'newUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'bounceRate' },
        { name: 'averageSessionDuration' },
        { name: 'keyEvents' },
        { name: 'eventCount' },
      ],
    },
    {
      ...base,
      dimensions: [{ name: trendDimension }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ dimension: { dimensionName: trendDimension } }],
      limit: 400,
    },
    {
      ...base,
      dimensions: [{ name: 'pagePath' }],
      metrics: [
        { name: 'screenPageViews' },
        { name: 'activeUsers' },
        { name: 'userEngagementDuration' },
        { name: 'scrolledUsers' },
      ],
      orderBys: [{ metric: { metricName: 'screenPageViews' }, desc: true }],
      limit: 12,
    },
    {
      ...base,
      dimensions: [{ name: 'sessionDefaultChannelGroup' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'keyEvents' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 10,
    },
    {
      ...base,
      dimensions: [{ name: 'deviceCategory' }],
      metrics: [
        { name: 'activeUsers' },
        { name: 'sessions' },
        { name: 'screenPageViews' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 5,
    },
    {
      ...base,
      dimensions: [{ name: 'country' }],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 10,
    },
    {
      ...base,
      dimensions: [{ name: 'eventName' }],
      metrics: [
        { name: 'eventCount' },
        { name: 'totalUsers' },
        { name: 'keyEvents' },
      ],
      orderBys: [{ metric: { metricName: 'eventCount' }, desc: true }],
      limit: 25,
    },
    {
      ...base,
      dimensions: [
        { name: 'sessionSourceMedium' },
        { name: 'sessionCampaignName' },
      ],
      metrics: [
        { name: 'sessions' },
        { name: 'keyEvents' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 20,
    },
    {
      ...base,
      dimensionFilter: publicPathFilter('landingPage'),
      dimensions: [{ name: 'landingPage' }],
      metrics: [
        { name: 'sessions' },
        { name: 'engagedSessions' },
        { name: 'engagementRate' },
        { name: 'keyEvents' },
      ],
      orderBys: [{ metric: { metricName: 'sessions' }, desc: true }],
      limit: 12,
    },
    {
      ...base,
      dimensions: [
        { name: 'operatingSystem' },
        { name: 'browser' },
      ],
      metrics: [{ name: 'activeUsers' }, { name: 'sessions' }],
      orderBys: [{ metric: { metricName: 'activeUsers' }, desc: true }],
      limit: 12,
    },
  ]
}

export default async function handler(req, res) {
  res.setHeader('Cache-Control', 's-maxage=60, stale-while-revalidate=120')

  if (req.method !== 'GET') {
    res.setHeader('Allow', 'GET')
    return res.status(405).json({ error: 'Method not allowed' })
  }

  if (!PROPERTY_ID || !SA_JSON) {
    return res.status(503).json({ error: 'GA4 credentials not configured on server' })
  }

  try {
    const range = selectedRange(req)
    const dateRange = DATE_RANGES[range]
    const trendDimension = range === '12m' ? 'yearMonth' : 'date'
    const requests = createRequests(dateRange, trendDimension)
    const sa = JSON.parse(SA_JSON)
    const accessToken = await getAccessToken(sa)

    const [coreBatch, detailBatch, realtime, searchConsole, advertising] = await Promise.all([
      batchRunReports(accessToken, requests.slice(0, 5)),
      batchRunReports(accessToken, requests.slice(5)),
      runRealtimeReport(accessToken, {
        dimensions: [{ name: 'country' }],
        metrics: [{ name: 'activeUsers' }],
        metricAggregations: ['TOTAL'],
      }).catch(() => null),
      runReport(accessToken, {
        dateRanges: [dateRange],
        dimensionFilter: publicPathFilter(),
        metrics: [
          { name: 'organicGoogleSearchClicks' },
          { name: 'organicGoogleSearchImpressions' },
          { name: 'organicGoogleSearchClickThroughRate' },
          { name: 'organicGoogleSearchAveragePosition' },
        ],
      }).catch(() => null),
      runReport(accessToken, {
        dateRanges: [dateRange],
        metrics: [
          { name: 'advertiserAdImpressions' },
          { name: 'advertiserAdClicks' },
          { name: 'advertiserAdCost' },
          { name: 'advertiserAdCostPerClick' },
          { name: 'advertiserAdCostPerKeyEvent' },
        ],
      }).catch(() => null),
    ])

    const reports = [...(coreBatch.reports || []), ...(detailBatch.reports || [])]
    const overview = reportSummary(reports[0])
    const realtimeActiveUsers = toNumber(realtime?.totals?.[0]?.metricValues?.[0]?.value)
    const searchSummary = searchConsole ? reportSummary(searchConsole) : null
    const advertisingSummary = advertising ? reportSummary(advertising) : null

    return res.json({
      range,
      overview: {
        activeUsers: overview.activeUsers || 0,
        newUsers: overview.newUsers || 0,
        sessions: overview.sessions || 0,
        pageViews: overview.screenPageViews || 0,
        engagedSessions: overview.engagedSessions || 0,
        engagementRate: overview.engagementRate || 0,
        bounceRate: overview.bounceRate || 0,
        averageSessionDuration: overview.averageSessionDuration || 0,
        keyEvents: overview.keyEvents || 0,
        eventCount: overview.eventCount || 0,
      },
      realtime: { activeUsers: realtimeActiveUsers },
      trend: reportRows(reports[1]).map((row) => ({
        date: row[trendDimension],
        activeUsers: row.activeUsers,
        sessions: row.sessions,
        pageViews: row.screenPageViews,
      })),
      pages: reportRows(reports[2]).map((row) => ({
        path: row.pagePath || '/',
        pageViews: row.screenPageViews,
        users: row.activeUsers,
        engagementSeconds: row.userEngagementDuration,
        scrolledUsers: row.scrolledUsers,
      })),
      channels: reportRows(reports[3]).map((row) => ({
        channel: row.sessionDefaultChannelGroup,
        sessions: row.sessions,
        engagedSessions: row.engagedSessions,
        engagementRate: row.engagementRate,
        keyEvents: row.keyEvents,
      })),
      devices: reportRows(reports[4]).map((row) => ({
        device: row.deviceCategory,
        users: row.activeUsers,
        sessions: row.sessions,
        pageViews: row.screenPageViews,
      })),
      countries: reportRows(reports[5]).map((row) => ({
        country: row.country,
        users: row.activeUsers,
        sessions: row.sessions,
      })),
      events: reportRows(reports[6]).map((row) => ({
        name: row.eventName,
        count: row.eventCount,
        users: row.totalUsers,
        keyEvents: row.keyEvents,
      })),
      sources: reportRows(reports[7]).map((row) => ({
        sourceMedium: row.sessionSourceMedium,
        campaign: row.sessionCampaignName,
        sessions: row.sessions,
        keyEvents: row.keyEvents,
      })),
      landingPages: reportRows(reports[8]).map((row) => ({
        path: row.landingPage || '/',
        sessions: row.sessions,
        engagedSessions: row.engagedSessions,
        engagementRate: row.engagementRate,
        keyEvents: row.keyEvents,
      })),
      technology: reportRows(reports[9]).map((row) => ({
        operatingSystem: row.operatingSystem,
        browser: row.browser,
        users: row.activeUsers,
        sessions: row.sessions,
      })),
      searchConsole: searchSummary ? {
        clicks: searchSummary.organicGoogleSearchClicks || 0,
        impressions: searchSummary.organicGoogleSearchImpressions || 0,
        clickThroughRate: searchSummary.organicGoogleSearchClickThroughRate || 0,
        averagePosition: searchSummary.organicGoogleSearchAveragePosition || 0,
      } : null,
      advertising: advertisingSummary ? {
        impressions: advertisingSummary.advertiserAdImpressions || 0,
        clicks: advertisingSummary.advertiserAdClicks || 0,
        cost: advertisingSummary.advertiserAdCost || 0,
        costPerClick: advertisingSummary.advertiserAdCostPerClick || 0,
        costPerKeyEvent: advertisingSummary.advertiserAdCostPerKeyEvent || 0,
      } : null,
    })
  } catch (err) {
    console.error('GA4 analytics error:', err.message)
    return res.status(500).json({ error: 'Failed to fetch analytics data' })
  }
}
