import { getStatusBadgeConfig } from '../utils/statusModel'

export default function StatusBadge({ status, className = '' }) {
  const config = getStatusBadgeConfig(status)

  return (
    <span className={`status-badge ${config.className} ${className}`}>
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  )
}
