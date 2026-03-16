export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  if (!isOpen) return null

  const sizeClass =
    size === 'sm' ? 'modal-content--sm' : size === 'lg' ? 'modal-content--lg' : ''

  const handleOverlayClick = () => {
    if (onClose) onClose()
  }

  const handleContentClick = (event) => {
    event.stopPropagation()
  }

  return (
    <div className="modal-overlay" onClick={handleOverlayClick}>
      <div className={`modal-content ${sizeClass}`} onClick={handleContentClick}>
        <div className="modal-header">
          {title && <h2>{title}</h2>}
          {onClose && (
            <button
              type="button"
              className="modal-close"
              aria-label="Close"
              onClick={onClose}
            >
              ×
            </button>
          )}
        </div>
        <div className="modal-body">{children}</div>
        {footer && <div className="modal-footer">{footer}</div>}
      </div>
    </div>
  )
}

