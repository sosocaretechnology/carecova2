import { createContext, useCallback, useContext, useEffect, useMemo, useState } from 'react'
import { notificationService } from '../services/notificationService'
import { useAuth } from '../hooks/useAuth'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import { getNotificationCategory } from '../utils/notificationCategory'

const NotificationContext = createContext(null)

function isNotificationRelevant(item, role, isSuperAdmin) {
  if (isSuperAdmin) return true
  if (!role) return true
  const audienceRole = item?.audienceRole || item?.data?.audienceRole
  if (audienceRole) {
    if (Array.isArray(audienceRole)) return audienceRole.includes(role)
    return String(audienceRole) === String(role)
  }
  const targetRoles = item?.data?.targetRoles || item?.data?.roles
  if (Array.isArray(targetRoles) && targetRoles.length > 0) {
    return targetRoles.includes(role)
  }

  const type = String(item?.type || '').toLowerCase()
  const isNewApplication = ['application_submitted', 'new_application', 'new_applicant', 'sales_review_pending'].includes(type)
  if (isNewApplication) return ['sales', 'admin', 'support'].includes(role)

  const isCreditOps = ['approved_for_disbursement', 'disbursement_confirmed', 'disbursement_failed'].includes(type)
  if (isCreditOps) return ['credit_officer', 'admin'].includes(role)

  const categoryKey = item?.categoryKey || getNotificationCategory(item).key
  if ((role === 'credit_officer' || role === 'credit') && (categoryKey === 'stage1' || categoryKey === 'admin_review')) {
    return false
  }

  return true
}

export function NotificationProvider({ children }) {
  const { isAuthenticated: isAdminAuthenticated, session } = useAuth()
  const { isAuthenticated: isCustomerAuthenticated } = useCustomerAuth()
  const isAuthenticated = isAdminAuthenticated || isCustomerAuthenticated
  const role = isCustomerAuthenticated ? 'customer' : (session?.role || '')
  const isSuperAdmin = session?.admin?.role === 'super_admin'

  const [items, setItems] = useState([])
  const [unreadCount, setUnreadCount] = useState(0)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const [panelOpen, setPanelOpen] = useState(false)

  const refreshUnreadCount = useCallback(async () => {
    if (!isAuthenticated) {
      setUnreadCount(0)
      return 0
    }
    try {
      const count = await notificationService.getUnreadCount()
      setUnreadCount(count)
      return count
    } catch (err) {
      if (/not authenticated|401/i.test(String(err?.message || ''))) {
        setUnreadCount(0)
        setItems([])
      }
      return 0
    }
  }, [isAuthenticated])

  const refreshList = useCallback(async (options = {}) => {
    if (!isAuthenticated) {
      setItems([])
      setUnreadCount(0)
      return { items: [], unreadCount: 0, total: 0, page: 1, limit: 20 }
    }
    try {
      setLoading(true)
      setError('')
      const payload = await notificationService.listNotifications(options)
      const filteredItems = (payload.items || []).filter((item) =>
        isNotificationRelevant(item, role, isSuperAdmin),
      )
      setItems(filteredItems)
      await refreshUnreadCount()
      return payload
    } catch (err) {
      const message = err?.message || 'Unable to load notifications'
      setError(message)
      if (/not authenticated|401/i.test(message)) {
        setItems([])
        setUnreadCount(0)
      }
      return { items: [], unreadCount: 0, total: 0, page: 1, limit: 20 }
    } finally {
      setLoading(false)
    }
  }, [isAuthenticated, role, isSuperAdmin, refreshUnreadCount])

  /**
   * Mark one notification as read. Use localOnly when the id cannot be PATCHed (e.g. demo ids)
   * but the UI should still drop the unread badge by one when the user opens the item.
   */
  const markOneRead = useCallback(async (id, options = {}) => {
    const { localOnly = false } = options
    if (!id) return
    const previousItems = items
    const previousUnread = unreadCount
    const target = previousItems.find((item) => item.id === id)
    if (!target || target.isRead) return

    const now = new Date().toISOString()
    setItems((curr) =>
      curr.map((item) => (item.id === id ? { ...item, isRead: true, readAt: item.readAt || now } : item)),
    )
    setUnreadCount((curr) => Math.max(0, curr - 1))

    if (localOnly) return

    try {
      await notificationService.markRead(id)
      await refreshUnreadCount()
    } catch (err) {
      setItems(previousItems)
      setUnreadCount(previousUnread)
      setError(err?.message || 'Unable to mark notification as read')
    }
  }, [items, unreadCount, refreshUnreadCount])

  const markAllAsRead = useCallback(async () => {
    const previousItems = items
    const previousUnread = unreadCount
    const now = new Date().toISOString()
    setItems((curr) => curr.map((item) => ({ ...item, isRead: true, readAt: item.readAt || now })))
    setUnreadCount(0)
    try {
      await notificationService.markAllRead()
      await refreshUnreadCount()
    } catch (err) {
      setItems(previousItems)
      setUnreadCount(previousUnread)
      setError(err?.message || 'Unable to mark all notifications as read')
    }
  }, [items, unreadCount, refreshUnreadCount])

  const openPanel = useCallback(() => setPanelOpen(true), [])
  const closePanel = useCallback(() => setPanelOpen(false), [])
  const togglePanel = useCallback(() => setPanelOpen((v) => !v), [])

  useEffect(() => {
    if (!isAuthenticated) {
      setItems([])
      setUnreadCount(0)
      setPanelOpen(false)
      return
    }
    refreshUnreadCount()
  }, [isAuthenticated, session?.accessToken, refreshUnreadCount])

  useEffect(() => {
    if (!isAuthenticated) return undefined
    let timer = null
    const tick = () => {
      if (document.visibilityState === 'visible') refreshUnreadCount()
    }
    timer = window.setInterval(tick, 30000)
    const onVisibility = () => {
      if (document.visibilityState === 'visible') refreshUnreadCount()
    }
    document.addEventListener('visibilitychange', onVisibility)
    return () => {
      if (timer) window.clearInterval(timer)
      document.removeEventListener('visibilitychange', onVisibility)
    }
  }, [isAuthenticated, refreshUnreadCount])

  const value = useMemo(
    () => ({
      items,
      unreadCount,
      loading,
      error,
      panelOpen,
      refreshList,
      refreshUnreadCount,
      openPanel,
      closePanel,
      togglePanel,
      markOneRead,
      markAllAsRead,
      isAuthenticated,
    }),
    [
      items,
      unreadCount,
      loading,
      error,
      panelOpen,
      refreshList,
      refreshUnreadCount,
      openPanel,
      closePanel,
      togglePanel,
      markOneRead,
      markAllAsRead,
      isAuthenticated,
    ],
  )

  return (
    <NotificationContext.Provider value={value}>
      {children}
    </NotificationContext.Provider>
  )
}

export function useNotifications() {
  const context = useContext(NotificationContext)
  if (!context) {
    throw new Error('useNotifications must be used within NotificationProvider')
  }
  return context
}

