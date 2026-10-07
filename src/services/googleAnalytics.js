const MEASUREMENT_ID = import.meta.env.VITE_GA_MEASUREMENT_ID
const SCRIPT_ID = 'carecova-google-analytics'

export function isGoogleAnalyticsConfigured() {
  return Boolean(MEASUREMENT_ID)
}

export function initializeGoogleAnalytics() {
  if (!MEASUREMENT_ID || typeof window === 'undefined' || document.getElementById(SCRIPT_ID)) return

  window.dataLayer = window.dataLayer || []
  window.gtag = function gtag() {
    window.dataLayer.push(arguments)
  }
  window.gtag('js', new Date())
  window.gtag('config', MEASUREMENT_ID, { send_page_view: false })

  const script = document.createElement('script')
  script.id = SCRIPT_ID
  script.async = true
  script.src = `https://www.googletagmanager.com/gtag/js?id=${encodeURIComponent(MEASUREMENT_ID)}`
  document.head.appendChild(script)
}

export function trackGoogleAnalyticsEvent(eventName) {
  if (typeof window.gtag === 'function') {
    window.gtag('event', eventName)
  }
}
