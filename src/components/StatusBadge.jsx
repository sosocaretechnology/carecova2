export default function StatusBadge({ status, className = '' }) {
  const statusConfig = {
    pending: { label: 'Pending', icon: '●', class: 'status--pending' },
    approved: { label: 'Approved', icon: '✓', class: 'status--approved' },
    approved_for_disbursement: { label: 'Approved for Disbursement', icon: '✓', class: 'status--approved' },
    rejected: { label: 'Rejected', icon: '✗', class: 'status--rejected' },
    active: { label: 'Active', icon: '●', class: 'status--active' },
    overdue: { label: 'Overdue', icon: '!', class: 'status--overdue' },
    completed: { label: 'Completed', icon: '★', class: 'status--completed' },
  }

  const config = statusConfig[status] || statusConfig.pending

  return (
    <span className={`status-badge ${config.class} ${className}`}>
      <span aria-hidden="true">{config.icon}</span>
      {config.label}
    </span>
  )
}
