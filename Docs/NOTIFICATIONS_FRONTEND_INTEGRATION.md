# In-App Notifications Frontend Integration

This document describes the frontend integration for in-app notifications.

## Implemented Components

- `src/services/notificationService.js`
  - `listNotifications({ unreadOnly, type, page, limit })`
  - `getUnreadCount()`
  - `markRead(id)`
  - `markAllRead()`
- `src/context/NotificationContext.jsx`
  - Global notification state, optimistic read updates, polling every 30s while visible.
- `src/components/NotificationBell.jsx`
  - Bell icon, unread badge, dropdown list, mark-all action, deep-link navigation.
- `src/pages/Notifications.jsx`
  - Full list page with unread tab, type filter, pagination, and read actions.

## Route Integration

- Customer: `/portal/notifications`
- Admin: `/admin/notifications`
- Credit: `/credit/notifications`

## Layout Integration

- Customer header now includes bell + notifications nav link.
- Admin topbar now includes bell.
- Credit topbar and sidebar nav now include notifications access.

## Polling Behavior

- Unread count refreshes:
  - on auth/session changes
  - every 30 seconds while document is visible
  - on visibility change back to visible

## Error Handling

- If backend is unavailable, dropdown/page shows non-blocking error.
- If session is unauthenticated/expired, list and unread count reset to safe defaults.
- `markRead` and `markAllRead` use optimistic UI; failed API calls rollback local state.

## Data Normalization

- Notification payload is normalized for UI defaults.
- If `data.amountKobo` exists, `data.amountNaira` is derived as `amountKobo / 100`.

## Notes

- Customer backend auth token support is expected for live `/notifications` calls.
- Current integration gracefully handles missing token as unauthenticated.
