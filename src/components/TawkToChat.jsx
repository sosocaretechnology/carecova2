import { useEffect } from 'react'

const PROPERTY_ID = import.meta.env.VITE_TAWK_PROPERTY_ID || ''
const WIDGET_ID = import.meta.env.VITE_TAWK_WIDGET_ID || 'default'
const TAWK_SCRIPT_ID = 'carecova-tawk-to-script'

export default function TawkToChat() {
  useEffect(() => {
    const safeId = /^[A-Za-z0-9_-]+$/
    if (!safeId.test(PROPERTY_ID) || !safeId.test(WIDGET_ID)) return
    if (document.getElementById(TAWK_SCRIPT_ID)) return

    window.Tawk_API = window.Tawk_API || {}
    window.Tawk_LoadStart = new Date()

    const script = document.createElement('script')
    script.id = TAWK_SCRIPT_ID
    script.async = true
    script.src = `https://embed.tawk.to/${PROPERTY_ID}/${WIDGET_ID}`
    script.charset = 'UTF-8'
    script.setAttribute('crossorigin', '*')
    document.head.appendChild(script)

    return () => {
      // Tawk injects its own iframe and runtime; keep it available across SPA navigation.
    }
  }, [])

  return null
}