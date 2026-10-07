import { useEffect } from 'react'
import { useLocation } from 'react-router-dom'

const TRACKED_PUBLIC_PATHS = new Set([
  '/',
  '/how-it-works',
  '/calculator',
  '/faq',
  '/privacy',
  '/apply',
  '/eligibility',
])

export function usePageTracking() {
  const location = useLocation()
  const pagePath = location.pathname.replace(/\/+$/, '') || '/'

  useEffect(() => {
    if (TRACKED_PUBLIC_PATHS.has(pagePath) && typeof window.gtag === 'function') {
      window.gtag('event', 'page_view', {
        page_path: pagePath,
        page_location: `${window.location.origin}${pagePath}`,
      })
    }
  }, [pagePath])
}
