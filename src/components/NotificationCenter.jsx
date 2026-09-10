import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import { notificationService } from '../services/notificationService'
import {
  CheckCircle,
  Banknote,
  Clock,
  Megaphone,
  Bell
} from 'lucide-react'
import IconBadge from './IconBadge'

export default function NotificationCenter({ userId, onClose, onUnreadChange }) {
  const [notifications, setNotifications] = useState([])
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadNotifications = async () => {
      try {
        const data = await notificationService.getNotifications(userId)
        setNotifications(data)
        const unread = data.filter((n) => !n.read).length
        if (onUnreadChange) {
          onUnreadChange(unread)
        }
      } catch (error) {
        console.error('Error loading notifications:', error)
      } finally {
        setLoading(false)
      }
    }
    loadNotifications()
  }, [userId, onUnreadChange])

  const handleMarkAsRead = async (notificationId) => {
    await notificationService.markAsRead(notificationId)
    setNotifications((prev) =>
      prev.map((n) => (n.id === notificationId ? { ...n, read: true } : n))
    )
    if (onUnreadChange) {
      const unread = notifications.filter((n) => !n.read && n.id !== notificationId).length
      onUnreadChange(unread)
    }
  }

  const handleMarkAllAsRead = async () => {
    await notificationService.markAllAsRead(userId)
    setNotifications((prev) => prev.map((n) => ({ ...n, read: true })))
    if (onUnreadChange) {
      onUnreadChange(0)
    }
  }

  const getNotificationIcon = (type) => {
    switch (type) {
      case 'approval':
        return <IconBadge color="green" size="sm"><CheckCircle size={16} /></IconBadge>
      case 'payment':
        return <IconBadge color="blue" size="sm"><Banknote size={16} /></IconBadge>
      case 'reminder':
        return <IconBadge color="amber" size="sm"><Clock size={16} /></IconBadge>
      case 'policy':
        return <IconBadge color="violet" size="sm"><Megaphone size={16} /></IconBadge>
      default:
        return <IconBadge color="slate" size="sm"><Bell size={16} /></IconBadge>
    }
  }

  return (
    <div className="notification-center">
      <div className="notification-center-header">
        <h3>Notifications</h3>
        {notifications.some((n) => !n.read) && (
          <button
            className="notification-mark-all-read"
            onClick={handleMarkAllAsRead}
          >
            Mark all as read
          </button>
        )}
      </div>

      <div className="notification-center-body">
        {loading ? (
          <div className="loading">Loading notifications...</div>
        ) : notifications.length === 0 ? (
          <div className="notification-empty">
            <p>No notifications</p>
          </div>
        ) : (
          notifications.map((notification) => (
            <div
              key={notification.id}
              className={`notification-item ${!notification.read ? 'notification-item--unread' : ''}`}
              onClick={() => {
                if (!notification.read) {
                  handleMarkAsRead(notification.id)
                }
                if (notification.link) {
                  onClose()
                }
              }}
            >
              <div className="notification-icon">
                {getNotificationIcon(notification.type)}
              </div>
              <div className="notification-content">
                <div className="notification-title">{notification.title}</div>
                <div className="notification-message">{notification.message}</div>
                <div className="notification-time">
                  {new Date(notification.createdAt).toLocaleDateString()}
                </div>
              </div>
              {!notification.read && (
                <div className="notification-unread-indicator" />
              )}
            </div>
          ))
        )}
      </div>
    </div>
  )
}
