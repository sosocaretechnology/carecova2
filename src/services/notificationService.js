import { getNotificationCategory } from '../utils/notificationCategory'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''

const ADMIN_SESSION_KEY = 'carecova_admin_session'
const CUSTOMER_SESSION_KEY = 'carecova_customer_session'

function getStoredSession(key) {
  try {
    const raw = localStorage.getItem(key)
    return raw ? JSON.parse(raw) : null
  } catch {
    return null
  }
}

function getAccessToken() {
  const adminSession = getStoredSession(ADMIN_SESSION_KEY)
  if (adminSession?.accessToken) return adminSession.accessToken
  const customerSession = getStoredSession(CUSTOMER_SESSION_KEY)
  if (customerSession?.accessToken) return customerSession.accessToken
  return null
}

function normalizeNotification(item = {}) {
  const amountKobo = Number(item?.data?.amountKobo)
  const amountNaira = Number.isFinite(amountKobo) ? amountKobo / 100 : undefined
  const id = item.id || item._id || null
  const { key: categoryKey, label: categoryLabel } = getNotificationCategory({
    ...item,
    data: item.data,
    type: item.type,
  })
  const idStr = id != null ? String(id) : ''
  const isSyntheticId = /^notif-\d+$/i.test(idStr) || idStr.startsWith('demo-')
  return {
    id,
    type: item.type || 'system_alert',
    title: item.title || 'Notification',
    body: item.body || '',
    audienceRole: item.audienceRole || item?.data?.audienceRole || null,
    categoryKey,
    categoryLabel,
    data: {
      ...(item.data || {}),
      ...(amountNaira !== undefined ? { amountNaira } : {}),
    },
    isRead: Boolean(item.isRead ?? item.readAt),
    readAt: item.readAt || null,
    createdAt: item.createdAt || new Date().toISOString(),
    priority: item.priority || 'medium',
    canMarkRead: Boolean(id) && !isSyntheticId,
  }
}

async function request(path, options = {}) {
  if (!API_ROOT) throw new Error('Backend API is not configured')
  const token = getAccessToken()
  if (!token) throw new Error('Not authenticated')

  let response
  try {
    response = await fetch(`${API_ROOT}${path}`, {
      ...options,
      headers: {
        'Content-Type': 'application/json',
        Authorization: `Bearer ${token}`,
        ...(options.headers || {}),
      },
    })
  } catch {
    throw new Error(`Unable to reach backend at ${API_ROOT}`)
  }

  const contentType = response.headers.get('content-type') || ''
  const isJson = contentType.includes('application/json')
  const body = isJson ? await response.json() : await response.text()
  if (!response.ok) {
    const message = isJson ? (body?.message || 'Request failed') : (body || 'Request failed')
    throw new Error(Array.isArray(message) ? message.join(', ') : message)
  }
  return body
}

export const notificationService = {
  listNotifications: async ({ unreadOnly, type, page = 1, limit = 20 } = {}) => {
    const query = new URLSearchParams(
      Object.entries({ unreadOnly, type, page, limit }).reduce((acc, [k, v]) => {
        if (v === undefined || v === null || v === '') return acc
        acc[k] = String(v)
        return acc
      }, {}),
    ).toString()
    const data = await request(`/notifications${query ? `?${query}` : ''}`)
    const items = Array.isArray(data) ? data : (data?.items || data?.data || [])
    const normalizedItems = items.map(normalizeNotification)
    return {
      items: normalizedItems,
      page: data?.page ?? page,
      limit: data?.limit ?? limit,
      total: data?.total ?? normalizedItems.length,
      // Only trust server-provided totals; a page slice is not global unread count.
      unreadCount: data?.unreadCount,
    }
  },

  getUnreadCount: async () => {
    const data = await request('/notifications/unread-count')
    return Number(data?.unreadCount || 0)
  },

  markRead: async (id) => {
    if (!id) throw new Error('Notification id is required')
    const data = await request(`/notifications/${encodeURIComponent(id)}/read`, {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
    return normalizeNotification(data?.item || data?.notification || data || { id, isRead: true })
  },

  markAllRead: async () => {
    return request('/notifications/read-all', {
      method: 'PATCH',
      body: JSON.stringify({}),
    })
  },
}
