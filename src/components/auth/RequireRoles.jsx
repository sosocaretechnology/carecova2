import { Navigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import FullScreenLoader from '../ui/FullScreenLoader'

export default function RequireRoles({ allowedRoles, children }) {
  const { isAuthenticated, session, loading } = useAuth()

  if (loading) {
    return <FullScreenLoader />
  }

  if (!isAuthenticated || !session) {
    return <Navigate to="/admin" replace />
  }

  const role = session.role || 'admin'
  if (Array.isArray(allowedRoles) && allowedRoles.length > 0 && !allowedRoles.includes(role)) {
    return (
      <div className="admin-page">
        <div className="alert-box alert-warning">
          You do not have permission to view this page.
        </div>
      </div>
    )
  }

  return children
}

