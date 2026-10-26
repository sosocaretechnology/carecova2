import { useState, useEffect } from 'react'
import { createPortal } from 'react-dom'
import { Link } from 'react-router-dom'
import Button from './Button'
import NotificationBell from './NotificationBell'
import { useCustomerAuth } from '../hooks/useCustomerAuth'
import logo from '../assets/logo.png'
import { CONSULTATION_BOOKING_PATH, CONSULTATION_BOOKING_FEE_NAIRA } from '../constants/consultation'

const OUR_SERVICES = [
  { label: 'Fertility Consultation', path: CONSULTATION_BOOKING_PATH, desc: 'Speak with a fertility specialist' },
  { label: 'IVF Financing', path: '/apply', desc: 'Fund your IVF treatment today' },
  { label: 'Surrogacy Guidance', path: '/apply', desc: 'Understand your surrogacy options' },
  { label: 'Egg Donation', path: '/apply', desc: 'Explore egg donation pathways' },
  { label: 'Success Rates', path: '/how-it-works', desc: 'See our partner clinic outcomes' },
  { label: 'Dental & Optical', path: '/apply', desc: 'Finance your dental or vision care' },
  { label: 'Screenings & Wellness', path: '/apply', desc: 'Preventive health screenings' },
]

const RESOURCES = [
  { label: 'Blog', path: '/blog', desc: 'Health & fertility insights' },
  { label: 'FAQ', path: '/faq', desc: 'Common questions answered' },
  { label: 'How It Works', path: '/how-it-works', desc: 'Your financing journey explained' },
  { label: 'Track Application', path: '/track', desc: 'Check your loan status' },
  { label: 'Privacy Policy', path: '/privacy', desc: 'How we protect your data' },
]

export default function Header() {
  const [userId, setUserId] = useState(null)
  const [menuOpen, setMenuOpen] = useState(false)
  const [activeDropdown, setActiveDropdown] = useState(null)
  const { isAuthenticated: customerLoggedIn } = useCustomerAuth()

  useEffect(() => {
    const storedUserId = localStorage.getItem('carecova_user_id')
    if (storedUserId) {
      setUserId(storedUserId)
    } else if (typeof window !== 'undefined') {
      const params = new URLSearchParams(window.location.search)
      const urlUserId = params.get('userId')
      if (urlUserId) setUserId(urlUserId)
    }
  }, [])

  useEffect(() => {
    document.body.style.overflow = menuOpen ? 'hidden' : ''
    return () => { document.body.style.overflow = '' }
  }, [menuOpen])

  const closeMenu = () => setMenuOpen(false)

  return (
    <>
      <header className="site-header glass-panel" style={{ position: 'sticky', top: 0, zIndex: 100 }}>
        <div className="container header-content">
          <Link to="/" className="brand" onClick={closeMenu}>
            <img src={logo} alt="CareCova" className="brand-logo" />
            <span className="brand-text">
              <span className="brand-mark">CareCova</span>
              <span className="brand-tagline">CareNow, Pay Later</span>
            </span>
          </Link>

          {/* Desktop nav */}
          <nav className="nav desktop-nav">
            {/* Our Services dropdown */}
            <div
              className="nav-dropdown-group"
              onMouseEnter={() => setActiveDropdown('services')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className="nav-dropdown-trigger"
                aria-expanded={activeDropdown === 'services'}
                aria-haspopup="true"
              >
                Our Services <span className="nav-chevron" aria-hidden="true">▾</span>
              </button>
              <div className={`nav-dropdown-panel nav-dropdown-panel--wide${activeDropdown === 'services' ? ' nav-dropdown-panel--open' : ''}`}>
                <div className="nav-dropdown-grid">
                  {OUR_SERVICES.map((item) => (
                    <Link key={item.label} to={item.path} className="nav-dropdown-item" onClick={() => setActiveDropdown(null)}>
                      <span className="nav-dropdown-item-label">{item.label}</span>
                      <span className="nav-dropdown-item-desc">{item.desc}</span>
                    </Link>
                  ))}
                </div>
              </div>
            </div>

            <Link to="/how-it-works">How It Works</Link>

            {/* Resources dropdown */}
            <div
              className="nav-dropdown-group"
              onMouseEnter={() => setActiveDropdown('resources')}
              onMouseLeave={() => setActiveDropdown(null)}
            >
              <button
                className="nav-dropdown-trigger"
                aria-expanded={activeDropdown === 'resources'}
                aria-haspopup="true"
              >
                Resources <span className="nav-chevron" aria-hidden="true">▾</span>
              </button>
              <div className={`nav-dropdown-panel${activeDropdown === 'resources' ? ' nav-dropdown-panel--open' : ''}`}>
                {RESOURCES.map((item) => (
                  <Link key={item.label} to={item.path} className="nav-dropdown-item" onClick={() => setActiveDropdown(null)}>
                    <span className="nav-dropdown-item-label">{item.label}</span>
                    <span className="nav-dropdown-item-desc">{item.desc}</span>
                  </Link>
                ))}
              </div>
            </div>

            <Link to={CONSULTATION_BOOKING_PATH} className="booking-nav-link">Book a Consultation</Link>
          </nav>

          <button
            className="mobile-menu-toggle"
            onClick={() => setMenuOpen(!menuOpen)}
            aria-label={menuOpen ? 'Close menu' : 'Open menu'}
            aria-expanded={menuOpen}
          >
            {menuOpen ? '✕' : '☰'}
          </button>

          <div className="header-actions">
            {userId && <NotificationBell userId={userId} />}
            {customerLoggedIn ? (
              <Link to="/portal"><Button variant="ghost">My account</Button></Link>
            ) : (
              <Link to="/login"><Button variant="ghost">Sign in</Button></Link>
            )}
            <Link to="/apply"><Button variant="primary">Apply Now</Button></Link>
          </div>
        </div>
      </header>

      {/* Drawer + overlay rendered at body level to avoid iOS Safari backdrop-filter containing-block bug */}
      {createPortal(
        <>
          <div
            className={`mobile-drawer-overlay${menuOpen ? ' mobile-drawer-overlay--open' : ''}`}
            onClick={closeMenu}
            aria-hidden="true"
          />
          <div className={`mobile-drawer${menuOpen ? ' mobile-drawer--open' : ''}`} role="dialog" aria-modal="true" aria-label="Navigation menu">
            {/* Drawer header */}
            <div className="mobile-drawer-header">
              <Link to="/" className="brand" onClick={closeMenu}>
                <img src={logo} alt="CareCova" className="brand-logo" />
                <span className="brand-text">
                  <span className="brand-mark">CareCova</span>
                  <span className="brand-tagline">CareNow, Pay Later</span>
                </span>
              </Link>
              <button className="mobile-drawer-close" onClick={closeMenu} aria-label="Close menu">✕</button>
            </div>

            {/* Book a Consultation hero CTA */}
            <div className="mobile-drawer-cta">
              <Link to={CONSULTATION_BOOKING_PATH} className="mobile-drawer-book-btn" onClick={closeMenu}>
                <div className="mobile-drawer-book-icon" aria-hidden="true">
                  <svg width="24" height="24" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round">
                    <rect x="3" y="4" width="18" height="18" rx="2" ry="2" />
                    <line x1="16" y1="2" x2="16" y2="6" />
                    <line x1="8" y1="2" x2="8" y2="6" />
                    <line x1="3" y1="10" x2="21" y2="10" />
                  </svg>
                </div>
                <div className="mobile-drawer-book-text">
                  <span className="mobile-drawer-book-label">Book a Consultation</span>
                  <span className="mobile-drawer-book-sub">
                    Speak with a fertility specialist · from ₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')}
                  </span>
                </div>
                <span className="mobile-drawer-book-arrow" aria-hidden="true">→</span>
              </Link>
            </div>

            {/* Nav links */}
            <nav className="mobile-drawer-nav">
              <p className="mobile-drawer-section-title">Our Services</p>
              {OUR_SERVICES.map((item) => (
                <Link key={item.label} to={item.path} className="mobile-drawer-link" onClick={closeMenu}>
                  <span className="mobile-drawer-link-label">{item.label}</span>
                  <span className="mobile-drawer-link-desc">{item.desc}</span>
                </Link>
              ))}

              <div className="mobile-drawer-divider" />

              <p className="mobile-drawer-section-title">Resources</p>
              {RESOURCES.map((item) => (
                <Link key={item.label} to={item.path} className="mobile-drawer-link" onClick={closeMenu}>
                  <span className="mobile-drawer-link-label">{item.label}</span>
                  <span className="mobile-drawer-link-desc">{item.desc}</span>
                </Link>
              ))}

              <div className="mobile-drawer-divider" />

              <Link to="/how-it-works" className="mobile-drawer-link" onClick={closeMenu}>
                <span className="mobile-drawer-link-label">How It Works</span>
              </Link>
              <Link to="/track" className="mobile-drawer-link" onClick={closeMenu}>
                <span className="mobile-drawer-link-label">Track Application</span>
              </Link>
            </nav>

            {/* Footer actions */}
            <div className="mobile-drawer-footer">
              {customerLoggedIn ? (
                <Link to="/portal" className="mobile-drawer-account-btn" onClick={closeMenu}>My Account</Link>
              ) : (
                <Link to="/login" className="mobile-drawer-account-btn" onClick={closeMenu}>Sign In</Link>
              )}
              <Link to="/apply" className="mobile-drawer-apply-btn" onClick={closeMenu}>Apply for Financing</Link>
            </div>
          </div>
        </>,
        document.body
      )}
    </>
  )
}
