import { useEffect, useMemo, useRef } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import { Bell } from 'lucide-react'
import { useNotifications } from '../context/NotificationContext'

function getRelativeTime(value) {
  if (!value) return 'Just now'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return 'Just now'
  const diff = Date.now() - date.getTime()
  const minutes = Math.floor(diff / 60000)
  if (minutes < 1) return 'Just now'
  if (minutes < 60) return `${minutes}m ago`
  const hours = Math.floor(minutes / 60)
  if (hours < 24) return `${hours}h ago`
  if (hours < 48) return 'Yesterday'
  const days = Math.floor(hours / 24)
  if (days < 7) return `${days}d ago`
  return date.toLocaleDateString('en-GB')
}

function fallbackRoute(notification, notificationsPath) {
  const data = notification?.data || {}
  const isPortal = String(notificationsPath || '').startsWith('/portal')
  const isCredit = String(notificationsPath || '').startsWith('/credit')
  if (data.loanId) return isPortal ? `/portal/loans/${data.loanId}` : (isCredit ? `/credit/loans/${data.loanId}` : `/admin/loans/${data.loanId}`)
  if (data.applicationId) return isPortal ? `/portal/loans/${data.applicationId}` : `/admin/applications/${data.applicationId}`
  if (String(notification?.type || '').includes('repayment')) return isPortal ? '/portal/loans' : (isCredit ? '/credit/repayments' : '/admin/repayments')
  return notificationsPath || '/admin/notifications'
}

function resolveNotificationRoute(notification, notificationsPath) {
  const deepLink = String(notification?.data?.deepLink || '').trim()
  if (!deepLink) return fallbackRoute(notification, notificationsPath)
  const isPortal = String(notificationsPath || '').startsWith('/portal')
  const isCredit = String(notificationsPath || '').startsWith('/credit')

  const loanApplicationMatch = deepLink.match(/^\/loan-applications\/([^/]+)$/)
  if (loanApplicationMatch) {
    const id = loanApplicationMatch[1]
    if (isPortal) return `/portal/loans/${id}`
    return `/admin/applications/${id}`
  }

  const adminLoanApplicationsMatch = deepLink.match(/^\/admin\/loan-applications\/([^/]+)$/)
  if (adminLoanApplicationsMatch) {
    const id = adminLoanApplicationsMatch[1]
    if (isPortal) return `/portal/loans/${id}`
    return `/admin/applications/${id}`
  }

  const loansMatch = deepLink.match(/^\/loans\/([^/]+)$/)
  if (loansMatch) {
    const id = loansMatch[1]
    if (isPortal) return `/portal/loans/${id}`
    if (isCredit) return `/credit/loans/${id}`
    return `/admin/loans/${id}`
  }

  return deepLink
}

export default function NotificationBell({ notificationsPath = '/notifications' }) {
  const navigate = useNavigate()
  const panelRef = useRef(null)
  const {
    panelOpen,
    togglePanel,
    closePanel,
    items,
    unreadCount,
    loading,
    error,
    refreshList,
    markOneRead,
    markAllAsRead,
    isAuthenticated,
  } = useNotifications()

  useEffect(() => {
    if (panelOpen) refreshList({ page: 1, limit: 8 })
  }, [panelOpen, refreshList])

  useEffect(() => {
    if (!panelOpen) return undefined
    const handler = (event) => {
      if (!panelRef.current?.contains(event.target)) closePanel()
    }
    document.addEventListener('mousedown', handler)
    return () => document.removeEventListener('mousedown', handler)
  }, [panelOpen, closePanel])

  const latestItems = useMemo(() => (items || []).slice(0, 8), [items])
  if (!isAuthenticated) return null

  return (
    <div className="notification-bell" ref={panelRef}>
      <button
        type="button"
        className="notification-bell-button"
        aria-label={`Notifications${unreadCount > 0 ? `, ${unreadCount} unread` : ''}`}
        onClick={togglePanel}
      >
        <Bell size={18} />
        {unreadCount > 0 ? <span className="notification-bell-badge">{unreadCount > 99 ? '99+' : unreadCount}</span> : null}
      </button>

      {panelOpen ? (
        <div className="notification-panel" role="dialog" aria-label="Notifications panel">
          <div className="notification-panel-header">
            <strong>Notifications</strong>
            <button
              type="button"
              className="notification-link-btn"
              onClick={markAllAsRead}
              disabled={unreadCount === 0}
            >
              Mark all as read
            </button>
          </div>

          <div className="notification-panel-body">
            {loading ? <div className="notification-empty">Loading...</div> : null}
            {!loading && error ? <div className="notification-empty">{error}</div> : null}
            {!loading && !error && latestItems.length === 0 ? (
              <div className="notification-empty">No notifications yet.</div>
            ) : null}
            {!loading && !error && latestItems.map((item, idx) => (
              <button
                type="button"
                key={item.id || `${item.createdAt}-${idx}`}
                className={`notification-item ${item.isRead ? '' : 'unread'}`}
                onClick={async () => {
                  if (!item.isRead && item.id) {
                    await markOneRead(item.id, { localOnly: !item.canMarkRead })
                  }
                  closePanel()
                  navigate(resolveNotificationRoute(item, notificationsPath))
                }}
              >
                <div className="notification-item-title-row">
                  <span className="notification-item-title">{item.title}</span>
                  <span className={`notification-priority ${item.priority || 'medium'}`}>{item.priority || 'medium'}</span>
                </div>
                {item.categoryLabel ? (
                  <div className="notification-item-meta-row">
                    <span className={`notification-category ${item.categoryKey || 'system'}`}>{item.categoryLabel}</span>
                  </div>
                ) : null}
                <div className="notification-item-body">{item.body}</div>
                <div className="notification-item-time">{getRelativeTime(item.createdAt)}</div>
              </button>
            ))}
          </div>

          <div className="notification-panel-footer">
            <Link to={notificationsPath} className="notification-view-all" onClick={closePanel}>
              View all
            </Link>
          </div>
        </div>
      ) : null}
    </div>
  )
}
