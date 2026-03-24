import { useEffect, useMemo, useState } from 'react'
import { useLocation, useNavigate } from 'react-router-dom'
import { useNotifications } from '../context/NotificationContext'
import { useAuth } from '../hooks/useAuth'
import { NOTIFICATION_CATEGORY_LABELS, NOTIFICATION_CATEGORY_ORDER } from '../utils/notificationCategory'

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
  return date.toLocaleString('en-GB', { dateStyle: 'medium', timeStyle: 'short' })
}

function fallbackRoute(notification, basePath) {
  const data = notification?.data || {}
  const isPortal = String(basePath || '').startsWith('/portal')
  const isCredit = String(basePath || '').startsWith('/credit')
  if (data.loanId) return isPortal ? `/portal/loans/${data.loanId}` : (isCredit ? `/credit/loans/${data.loanId}` : `/admin/loans/${data.loanId}`)
  if (data.applicationId) return isPortal ? `/portal/loans/${data.applicationId}` : `/admin/applications/${data.applicationId}`
  if (String(notification?.type || '').includes('repayment')) return isPortal ? '/portal/loans' : (isCredit ? '/credit/repayments' : '/admin/repayments')
  return basePath || '/admin/notifications'
}

function resolveNotificationRoute(notification, basePath) {
  const deepLink = String(notification?.data?.deepLink || '').trim()
  if (!deepLink) return fallbackRoute(notification, basePath)
  const isPortal = String(basePath || '').startsWith('/portal')
  const isCredit = String(basePath || '').startsWith('/credit')

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

export default function Notifications() {
  const navigate = useNavigate()
  const location = useLocation()
  const {
    items,
    loading,
    error,
    unreadCount,
    refreshList,
    markOneRead,
    markAllAsRead,
  } = useNotifications()

  const [tab, setTab] = useState('all')
  const [typeFilter, setTypeFilter] = useState('')
  const [page, setPage] = useState(1)
  const [limit] = useState(20)
  const [total, setTotal] = useState(0)
  const basePath = location.pathname.startsWith('/portal')
    ? '/portal/notifications'
    : location.pathname.startsWith('/credit')
      ? '/credit/notifications'
      : '/admin/notifications'

  useEffect(() => {
    refreshList({
      unreadOnly: tab === 'unread' ? true : undefined,
      type: typeFilter || undefined,
      page,
      limit,
    }).then((payload) => {
      setTotal(payload?.total || 0)
    })
  }, [tab, typeFilter, page, limit, refreshList])

  const totalPages = Math.max(1, Math.ceil((total || 0) / limit))
  const availableTypes = useMemo(
    () => Array.from(new Set((items || []).map((item) => item.type).filter(Boolean))),
    [items],
  )

  const displayItems = useMemo(() => {
    if (!categoryFilter || !isSuperAdmin) return items || []
    return (items || []).filter((item) => item.categoryKey === categoryFilter)
  }, [items, categoryFilter, isSuperAdmin])

  return (
    <div className="notifications-page">
      <div className="notifications-page-header">
        <div>
          <h1>Notifications</h1>
          <p>Stay up to date with application, repayment, and account updates.</p>
        </div>
        <button type="button" className="button button--secondary" onClick={markAllAsRead} disabled={unreadCount === 0}>
          Mark all as read
        </button>
      </div>

      <div className="notifications-toolbar">
        <div className="notifications-tabs">
          <button type="button" className={tab === 'all' ? 'active' : ''} onClick={() => { setTab('all'); setPage(1) }}>
            All
          </button>
          <button type="button" className={tab === 'unread' ? 'active' : ''} onClick={() => { setTab('unread'); setPage(1) }}>
            Unread ({unreadCount})
          </button>
        </div>
        <div className="notifications-toolbar-filters">
          {isSuperAdmin ? (
            <select
              className="notifications-category-filter"
              value={categoryFilter}
              onChange={(event) => { setCategoryFilter(event.target.value); setPage(1) }}
              aria-label="Filter by workflow category"
            >
              <option value="">All categories</option>
              {NOTIFICATION_CATEGORY_ORDER.map((key) => (
                <option key={key} value={key}>{NOTIFICATION_CATEGORY_LABELS[key]}</option>
              ))}
            </select>
          ) : null}
          <select
            className="notifications-type-filter"
            value={typeFilter}
            onChange={(event) => { setTypeFilter(event.target.value); setPage(1) }}
          >
            <option value="">All types</option>
            {availableTypes.map((type) => (
              <option key={type} value={type}>{type}</option>
            ))}
          </select>
        </div>
      </div>
      {isSuperAdmin && categoryFilter ? (
        <p className="notifications-filter-hint">
          Showing only “{NOTIFICATION_CATEGORY_LABELS[categoryFilter] || categoryFilter}” on this page of results. Clear the category filter or change page to see others.
        </p>
      ) : null}

      {loading ? <div className="notification-empty">Loading notifications...</div> : null}
      {!loading && error ? <div className="notification-empty">{error}</div> : null}
      {!loading && !error && displayItems.length === 0 ? (
        <div className="notification-empty">
          {items.length > 0 && categoryFilter ? 'No notifications match this category on this page.' : 'No notifications found.'}
        </div>
      ) : null}

      {!loading && !error && displayItems.length > 0 ? (
        <div className="notifications-list">
          {displayItems.map((item, idx) => (
            <div key={item.id || `${item.createdAt}-${idx}`} className={`notification-card ${item.isRead ? '' : 'unread'}`}>
              <button
                type="button"
                className="notification-card-main"
                onClick={async () => {
                  if (!item.isRead && item.id) {
                    await markOneRead(item.id, { localOnly: !item.canMarkRead })
                  }
                  navigate(resolveNotificationRoute(item, basePath))
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
              {!item.isRead && item.id ? (
                <button
                  type="button"
                  className="notification-link-btn"
                  onClick={(event) => {
                    event.stopPropagation()
                    markOneRead(item.id, { localOnly: !item.canMarkRead })
                  }}
                >
                  Mark read
                </button>
              ) : null}
            </div>
          ))}
        </div>
      ) : null}

      <div className="notifications-pagination">
        <button type="button" className="button button--secondary button--compact" disabled={page <= 1} onClick={() => setPage((p) => Math.max(1, p - 1))}>
          Prev
        </button>
        <span>Page {page} of {totalPages}</span>
        <button type="button" className="button button--secondary button--compact" disabled={page >= totalPages} onClick={() => setPage((p) => p + 1)}>
          Next
        </button>
      </div>
    </div>
  )
}

