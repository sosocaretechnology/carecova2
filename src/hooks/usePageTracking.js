import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'
import posthog from 'posthog-js'

export function usePageTracking() {
  const location = useLocation()

  useEffect(() => {
    if (import.meta.env.VITE_POSTHOG_KEY) {
      posthog.capture('$pageview', {
        $current_url: window.location.href,
        path: location.pathname,
      })
    }
  }, [location.pathname])
}
