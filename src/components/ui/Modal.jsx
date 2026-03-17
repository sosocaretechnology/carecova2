import { useEffect, useState } from 'react'

export default function Modal({
  isOpen,
  onClose,
  title,
  children,
  footer = null,
  size = 'md', // 'sm' | 'md' | 'lg'
}) {
  const [visible, setVisible] = useState(isOpen)
  const [isClosing, setIsClosing] = useState(false)

  useEffect(() => {
    if (isOpen) {
      setVisible(true)
      setIsClosing(false)
      return
    }
    if (visible) {
      setIsClosing(true)
      const timer = setTimeout(() => {
        setVisible(false)
        setIsClosing(false)
      }, 200)
      return () => clearTimeout(timer)
    }
  }, [isOpen, visible])

  if (!visible) return null

  const sizeClass =
    size === 'sm' ? 'modal-content--sm' : size === 'lg' ? 'modal-content--lg' : ''

  const handleOverlayClick = () => {
    if (onClose) onClose()
  }

  const handleContentClick = (event) => {
    event.stopPropagation()
  }

  const overlayClassName = `modal-overlay ${isOpen ? 'modal-enter' : ''} ${
    isClosing ? 'modal-leave' : ''
  }`
  const contentClassName = `modal-content ${sizeClass} ${isOpen ? 'modal-enter' : ''} ${
    isClosing ? 'modal-leave' : ''
  }`

  return (
    <div className={overlayClassName} onClick={handleOverlayClick}>
      <div className={contentClassName} onClick={handleContentClick}>
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

