import { useState, useEffect } from 'react'
import { Link } from 'react-router-dom'
import Button from './Button'
import NotificationBell from './NotificationBell'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import logo from '../assets/logo.png'

export default function Header() {
  const [userId, setUserId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const { isAuthenticated: customerLoggedIn } = useCustomerAuth()

  useEffect(() => {
    const storedUserId = localStorage.getItem('carecova_user_id')
    if (storedUserId) {
      setUserId(storedUserId)
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlUserId = params.get('userId')
      if (urlUserId) {
        setUserId(urlUserId)
      }
    }
  }, [])

  const closeMenu = () => setMenuOpen(false)

  return (
    <header className="site-header glass-panel" style={{ position: 'sticky', top: 0, zIndex: 50 }}>
      <div className="container header-content">
        <Link to="/" className="brand" onClick={closeMenu}>
          <img src={logo} alt="CareCova" className="brand-logo" />
          <span className="brand-text">
            <span className="brand-mark">CareCova</span>
            <span className="brand-tagline">CareNow, Pay Later</span>
          </span>
        </Link>

        <button
          className="mobile-menu-toggle"
          onClick={() => setMenuOpen(!menuOpen)}
          aria-label={menuOpen ? 'Close menu' : 'Open menu'}
          aria-expanded={menuOpen}
        >
          {menuOpen ? '✕' : '☰'}
        </button>

        <nav className={`nav${menuOpen ? ' nav--open' : ''}`}>
          <Link to="/how-it-works" onClick={closeMenu}>How It Works</Link>
          <Link to="/calculator" onClick={closeMenu}>Calculator</Link>
          <Link to="/apply" onClick={closeMenu}>Apply</Link>
          <Link to="/track" onClick={closeMenu}>Track</Link>
          <Link to="/faq" onClick={closeMenu}>FAQ</Link>
          <div className="mobile-nav-actions">
            {customerLoggedIn ? (
              <Link to="/portal" className="mobile-nav-account" onClick={closeMenu}>My Account</Link>
            ) : (
              <Link to="/login" className="mobile-nav-account" onClick={closeMenu}>Sign In</Link>
            )}
            <Link to="/apply" className="mobile-nav-cta" onClick={closeMenu}>Apply Now</Link>
          </div>
        </nav>

        <div className="header-actions">
          {userId && <NotificationBell userId={userId} />}
          {customerLoggedIn ? (
            <Link to="/portal">
              <Button variant="ghost">My account</Button>
            </Link>
          ) : (
            <Link to="/login">
              <Button variant="ghost">Sign in</Button>
            </Link>
          )}
          <Link to="/apply">
            <Button variant="primary">Apply Now</Button>
          </Link>
        </div>
      </div>
    </header>
  )
}
