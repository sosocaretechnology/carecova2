import { useState } from 'react'
import Button from './Button'
import Input from './Input'
import { User } from 'lucide-react'
import Modal from './ui/Modal'

export default function ProfileAccessModal({ isOpen, onClose, onSubmit }) {
  const [userId, setUserId] = useState('')
  const [error, setError] = useState('')

  const handleSubmit = (e) => {
    e.preventDefault()
    setError('')

    if (!userId.trim()) {
      setError('Please enter your phone number or email')
      return
    }

    onSubmit(userId.trim())
  }

  if (!isOpen) return null

  return (
    <Modal
      isOpen={isOpen}
      onClose={onClose}
      title="Access Your Profile"
      size="sm"
      footer={null}
    >
      <div className="profile-access-modal-content">
          <div className="profile-access-modal-icon"><User size={48} /></div>
          <p className="profile-access-modal-description">
            Enter your phone number or email address to view your profile and loan history
          </p>
          <form onSubmit={handleSubmit} className="profile-access-modal-form">
            <Input
              label="Phone Number or Email"
              type="text"
              placeholder="e.g. 08012345678 or name@email.com"
              value={userId}
              onChange={(e) => {
                setUserId(e.target.value)
                setError('')
              }}
              error={error}
              required
              autoFocus
            />
            <div className="profile-access-modal-actions">
              <Button type="button" variant="ghost" onClick={onClose}>
                Cancel
              </Button>
              <Button type="submit" variant="primary">
                Continue
              </Button>
            </div>
          </form>
      </div>
    </Modal>
  )
}
