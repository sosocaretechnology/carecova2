export const analyticsService = {
  isConfigured() {
    return !!import.meta.env.VITE_GA_MEASUREMENT_ID
  },

  async getStats() {
    const res = await fetch('/api/analytics')
    if (!res.ok) throw new Error(`Analytics fetch failed: ${res.status}`)
    return res.json()
  },
}
