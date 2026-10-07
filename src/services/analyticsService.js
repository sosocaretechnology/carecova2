import { isGoogleAnalyticsConfigured } from './googleAnalytics'

export const analyticsService = {
  isConfigured() {
    return isGoogleAnalyticsConfigured()
  },

  async getStats(range = '30d') {
    const params = new URLSearchParams({ range })
    const res = await fetch(`/api/analytics?${params}`)
    if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`)
    return res.json()
  },
}
