import { useState, useEffect, useCallback, useRef } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import SecurityBadge from '../components/SecurityBadge'
import TawkToChat from '../components/TawkToChat'
import WhatsAppFloat from '../components/WhatsAppFloat'
import slideImg1 from '../assets/slide-fertility-consultation.jpg'
import slideImg2 from '../assets/slide-ivf-financing.jpg'
import slideImg3 from '../assets/slide-surrogacy.jpg'
import slideImg4 from '../assets/slide-healthcare.jpg'
import {
  CONSULTATION_BOOKING_PATH,
  CONSULTATION_BOOKING_FEE_NAIRA,
  CONSULTATION_COMPARE_FEE_NAIRA,
} from '../constants/consultation'

/* ── Slide definitions ───────────────────────────────────────────── */
const SLIDES = [
  {
    id: 3,
    image: slideImg4,
    imagePosition: '65% center',
    duration: 15000,
    badge: 'Healthcare Financing',
    badgePink: false,
    headingGreen: 'Get Treated Now,',
    headingPink: 'Pay Over Time',
    body: "Access quality healthcare at top clinics today — no upfront payment needed. We cover the cost and you repay in simple, flexible monthly installments that fit your budget.",
    showPricing: false,
    cta: { label: 'Apply for Financing', path: '/apply' },
    ctaPink: false,
    quote: 'Your health should\nnever wait.',
    showVideoCard: false,
  },
  {
    id: 0,
    image: slideImg1,
    imagePosition: '70% center',
    duration: 6000,
    badge: 'Fertility Consultation',
    badgePink: true,
    headingGreen: 'Compare Fertility Clinics',
    headingPink: 'Before You Decide',
    body: 'Speak with experienced fertility doctors online, understand your options, compare treatment approaches and costs, and choose the clinic that\'s right for you — all from the comfort of your home.',
    showPricing: true,
    cta: { label: 'Compare Fertility Clinics', path: CONSULTATION_BOOKING_PATH },
    ctaPink: false,
    quote: 'Your fertility journey\ndeserves the right guidance.',
    showVideoCard: true,
  },
  {
    id: 1,
    image: slideImg2,
    imagePosition: '60% center',
    duration: 6000,
    badge: 'IVF Financing',
    badgePink: false,
    headingGreen: 'Fund Your IVF Journey',
    headingPink: 'Without the Stress',
    body: 'Access the best IVF clinics immediately and spread the cost into manageable monthly installments. Realise your family dream — no upfront financial barrier.',
    showPricing: false,
    cta: { label: 'Apply for IVF Financing', path: '/apply' },
    ctaPink: false,
    quote: 'Every family deserves\na fighting chance.',
    showVideoCard: false,
  },
  {
    id: 2,
    image: slideImg3,
    imagePosition: '58% center',
    duration: 6000,
    badge: 'Surrogacy',
    badgePink: true,
    headingGreen: 'Your Surrogacy Journey',
    headingPink: 'Starts Here',
    body: 'Connect with vetted surrogates and egg donors, navigate the legal and medical steps, and get expert guidance every step of the way through our partner clinics.',
    showPricing: false,
    cta: { label: 'Explore Surrogacy Options', path: CONSULTATION_BOOKING_PATH },
    ctaPink: true,
    quote: 'A new life begins\nwith the right support.',
    showVideoCard: false,
  },
]

/* ── Trust strip items ───────────────────────────────────────────── */
const TRUST_ITEMS = [
  {
    title: 'Trusted Partner Clinics',
    desc: 'Work with reputable fertility clinics',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M12 22s8-4 8-10V5l-8-3-8 3v7c0 6 8 10 8 10z" />
        <polyline points="9 12 11 14 15 10" />
      </svg>
    ),
  },
  {
    title: 'Qualified Doctors',
    desc: 'Consult with experienced fertility specialists',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
        <circle cx="12" cy="7" r="4" />
        <path d="M16 11l1.5 1.5" />
        <circle cx="18.5" cy="13.5" r="2.5" />
      </svg>
    ),
  },
  {
    title: 'Secure & Confidential',
    desc: 'Your privacy is our priority',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <rect x="3" y="11" width="18" height="11" rx="2" ry="2" />
        <path d="M7 11V7a5 5 0 0110 0v4" />
      </svg>
    ),
  },
  {
    title: 'More Choices, Better Decisions',
    desc: 'Compare and choose with confidence',
    icon: (
      <svg width="28" height="28" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.8" strokeLinecap="round" strokeLinejoin="round">
        <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
      </svg>
    ),
  },
]

/* ── Video card (floating UI overlay) ───────────────────────────── */
function VideoCard() {
  return (
    <div className="hero-video-card">
      <div className="hero-video-card-avatar">
        <img
          src="https://images.unsplash.com/photo-1559839734-2b71ea197ec2?w=220&q=80&auto=format&fit=crop&fp-y=0.3"
          alt="Fertility specialist"
          className="hero-video-card-img"
        />
        <div className="hero-video-card-controls">
          <button className="hvc-btn" aria-label="Mute">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M12 1a3 3 0 00-3 3v8a3 3 0 006 0V4a3 3 0 00-3-3z" />
              <path d="M19 10v2a7 7 0 01-14 0v-2" />
              <line x1="12" y1="19" x2="12" y2="23" />
              <line x1="8" y1="23" x2="16" y2="23" />
            </svg>
          </button>
          <button className="hvc-btn" aria-label="Camera">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <polygon points="23 7 16 12 23 17 23 7" />
              <rect x="1" y="5" width="15" height="14" rx="2" ry="2" />
            </svg>
          </button>
          <button className="hvc-btn hvc-btn--end" aria-label="End call">
            <svg width="14" height="14" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round">
              <path d="M22 16.92v3a2 2 0 01-2.18 2 19.79 19.79 0 01-8.63-3.07A19.5 19.5 0 013.07 9.8 19.79 19.79 0 01.1 1.18 2 2 0 012.1 0h3a2 2 0 012 1.72 12.84 12.84 0 00.7 2.81 2 2 0 01-.45 2.11L6.91 7.91a16 16 0 006 6l1.27-1.27a2 2 0 012.11-.45 12.84 12.84 0 002.81.7A2 2 0 0122 14.92z" />
            </svg>
          </button>
        </div>
      </div>
      <div className="hero-video-card-checks">
        <span className="hvc-check"><span className="hvc-check-dot" />Ask questions</span>
        <span className="hvc-check"><span className="hvc-check-dot" />Compare options</span>
        <span className="hvc-check"><span className="hvc-check-dot" />Make an informed choice</span>
      </div>
    </div>
  )
}

/* ── Main Home component ─────────────────────────────────────────── */
export default function Home() {
  const [current, setCurrent] = useState(0)
  const [animating, setAnimating] = useState(false)
  const timerRef = useRef(null)

  const goTo = useCallback((index) => {
    if (animating) return
    setAnimating(true)
    setCurrent(index)
    setTimeout(() => setAnimating(false), 600)
  }, [animating])

  const prev = useCallback(() => {
    goTo((current - 1 + SLIDES.length) % SLIDES.length)
  }, [current, goTo])

  const next = useCallback(() => {
    goTo((current + 1) % SLIDES.length)
  }, [current, goTo])

  /* Auto-advance; first slide stays 10s, others 6s */
  useEffect(() => {
    const dur = SLIDES[current]?.duration ?? 6000
    timerRef.current = setTimeout(() => {
      setCurrent((c) => (c + 1) % SLIDES.length)
    }, dur)
    return () => clearTimeout(timerRef.current)
  }, [current])

  /* Manual nav — clear pending timeout; effect re-arms automatically */
  const manualNav = (fn) => {
    clearTimeout(timerRef.current)
    fn()
  }

  const slide = SLIDES[current]

  return (
    <>
      <Header />
      <TawkToChat />
      <WhatsAppFloat />
      <main className="home-main">

        {/* ── Hero Slider ───────────────────────────────────────── */}
        <section className="home-hero" aria-label="Featured services">
          {/* Slides */}
          <div className="home-hero-inner">
            {SLIDES.map((s, i) => (
              <div
                key={s.id}
                className={`hero-slide${i === current ? ' hero-slide--active' : ''}${i === (current - 1 + SLIDES.length) % SLIDES.length ? ' hero-slide--prev' : ''}`}
                aria-hidden={i !== current}
              >
                {/* Background image */}
                <div className="hero-slide-bg">
                  <img
                    src={s.image}
                    alt=""
                    className="hero-slide-img"
                    aria-hidden="true"
                    style={{ objectPosition: s.imagePosition }}
                  />
                  <div className="hero-slide-tint" />
                </div>

                {/* Content */}
                <div className="container hero-slide-content">
                  {/* Left — text */}
                  <div className="hero-slide-left">
                    <span className={`hero-badge${s.badgePink ? ' hero-badge--pink' : ''}`}>
                      <svg width="15" height="15" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                        <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                        <circle cx="12" cy="7" r="4" />
                      </svg>
                      {s.badge}
                    </span>

                    <h1 className="hero-heading">
                      <span className="hero-heading-green">{s.headingGreen}</span>
                      <span className="hero-heading-pink">{s.headingPink}</span>
                    </h1>

                    <p className="hero-body">{s.body}</p>

                    {s.showPricing && (
                      <div className="hero-pricing">
                        <Link to={CONSULTATION_BOOKING_PATH} className="hero-pricing-card">
                          <div className="hero-pricing-icon hero-pricing-icon--green">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M20 21v-2a4 4 0 00-4-4H8a4 4 0 00-4 4v2" />
                              <circle cx="12" cy="7" r="4" />
                            </svg>
                          </div>
                          <div className="hero-pricing-info">
                            <span className="hero-pricing-label">Consult One Clinic</span>
                            <span className="hero-pricing-amount hero-pricing-amount--green">
                              ₦{CONSULTATION_BOOKING_FEE_NAIRA.toLocaleString('en-NG')}
                            </span>
                          </div>
                          <span className="hero-pricing-arrow hero-pricing-arrow--green" aria-hidden="true">→</span>
                        </Link>

                        <Link to={`${CONSULTATION_BOOKING_PATH}?type=compare`} className="hero-pricing-card hero-pricing-card--pink">
                          <div className="hero-pricing-icon hero-pricing-icon--pink">
                            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
                              <path d="M17 21v-2a4 4 0 00-4-4H5a4 4 0 00-4 4v2" />
                              <circle cx="9" cy="7" r="4" />
                              <path d="M23 21v-2a4 4 0 00-3-3.87" />
                              <path d="M16 3.13a4 4 0 010 7.75" />
                            </svg>
                          </div>
                          <div className="hero-pricing-info">
                            <span className="hero-pricing-label">Compare Two Clinics</span>
                            <span className="hero-pricing-amount hero-pricing-amount--pink">
                              ₦{CONSULTATION_COMPARE_FEE_NAIRA.toLocaleString('en-NG')}
                            </span>
                          </div>
                          <span className="hero-pricing-arrow hero-pricing-arrow--pink" aria-hidden="true">→</span>
                        </Link>
                      </div>
                    )}

                    <Link
                      to={s.cta.path}
                      className={`hero-cta-btn${s.ctaPink ? ' hero-cta-btn--pink' : ''}`}
                    >
                      {s.cta.label} <span aria-hidden="true">→</span>
                    </Link>

                    {s.id === 0 && (
                      <a
                        href="https://wa.me/2349160103000?text=Hello%20CareCova!%20I%20would%20like%20to%20speak%20to%20a%20fertility%20expert."
                        target="_blank"
                        rel="noopener noreferrer"
                        className="hero-wa-link"
                      >
                        <svg width="16" height="16" viewBox="0 0 24 24" fill="currentColor" aria-hidden="true">
                          <path d="M17.472 14.382c-.297-.149-1.758-.867-2.03-.967-.273-.099-.471-.148-.67.15-.197.297-.767.966-.94 1.164-.173.199-.347.223-.644.075-.297-.15-1.255-.463-2.39-1.475-.883-.788-1.48-1.761-1.653-2.059-.173-.297-.018-.458.13-.606.134-.133.298-.347.446-.52.149-.174.198-.298.298-.497.099-.198.05-.371-.025-.52-.075-.149-.669-1.612-.916-2.207-.242-.579-.487-.5-.669-.51-.173-.008-.371-.01-.57-.01-.198 0-.52.074-.792.372-.272.297-1.04 1.016-1.04 2.479 0 1.462 1.065 2.875 1.213 3.074.149.198 2.096 3.2 5.077 4.487.709.306 1.262.489 1.694.625.712.227 1.36.195 1.871.118.571-.085 1.758-.719 2.006-1.413.248-.694.248-1.289.173-1.413-.074-.124-.272-.198-.57-.347m-5.421 7.403h-.004a9.87 9.87 0 01-5.031-1.378l-.361-.214-3.741.982.998-3.648-.235-.374a9.86 9.86 0 01-1.51-5.26c.001-5.45 4.436-9.884 9.888-9.884 2.64 0 5.122 1.03 6.988 2.898a9.825 9.825 0 012.893 6.994c-.003 5.45-4.437 9.884-9.885 9.884m8.413-18.297A11.815 11.815 0 0012.05 0C5.495 0 .16 5.335.157 11.892c0 2.096.547 4.142 1.588 5.945L.057 24l6.305-1.654a11.882 11.882 0 005.683 1.448h.005c6.554 0 11.89-5.335 11.893-11.893a11.821 11.821 0 00-3.48-8.413z" />
                        </svg>
                        Speak to a Fertility Expert
                      </a>
                    )}
                  </div>

                  {/* Right — image overlays */}
                  <div className="hero-slide-right">
                    {s.showVideoCard && <VideoCard />}
                    <div className="hero-quote-overlay">
                      <p className="hero-quote-text">
                        {s.quote.split('\n').map((line, i) => (
                          <span key={i}>{line}<br /></span>
                        ))}
                      </p>
                      <span className="hero-quote-heart" aria-hidden="true">
                        <svg width="22" height="22" viewBox="0 0 24 24" fill="#e879a0" stroke="#e879a0" strokeWidth="1">
                          <path d="M20.84 4.61a5.5 5.5 0 00-7.78 0L12 5.67l-1.06-1.06a5.5 5.5 0 00-7.78 7.78l1.06 1.06L12 21.23l7.78-7.78 1.06-1.06a5.5 5.5 0 000-7.78z" />
                        </svg>
                      </span>
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>

          {/* Arrows */}
          <button
            className="hero-arrow hero-arrow--prev"
            onClick={() => manualNav(prev)}
            aria-label="Previous slide"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="15 18 9 12 15 6" />
            </svg>
          </button>
          <button
            className="hero-arrow hero-arrow--next"
            onClick={() => manualNav(next)}
            aria-label="Next slide"
          >
            <svg width="20" height="20" viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="2.5" strokeLinecap="round" strokeLinejoin="round" aria-hidden="true">
              <polyline points="9 18 15 12 9 6" />
            </svg>
          </button>

          {/* Dots */}
          <div className="hero-dots" role="tablist" aria-label="Slide navigation">
            {SLIDES.map((s, i) => (
              <button
                key={s.id}
                role="tab"
                aria-selected={i === current}
                aria-label={`Slide ${i + 1}: ${s.badge}`}
                className={`hero-dot${i === current ? ' hero-dot--active' : ''}`}
                onClick={() => manualNav(() => goTo(i))}
              />
            ))}
          </div>

          {/* Trust strip */}
          <div className="hero-trust-strip">
            <div className="container">
              <div className="hero-trust-grid">
                {TRUST_ITEMS.map((item) => (
                  <div key={item.title} className="hero-trust-item">
                    <span className="hero-trust-icon">{item.icon}</span>
                    <div className="hero-trust-text">
                      <strong>{item.title}</strong>
                      <span>{item.desc}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          </div>
        </section>

        {/* ── Stats Bar ─────────────────────────────────────────── */}
        <section className="home-stats">
          <div className="container home-stats-grid">
            <div className="home-stat">
              <span className="home-stat-value">₦2.4B+</span>
              <span className="home-stat-label">Care financed responsibly</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">180+</span>
              <span className="home-stat-label">Partner clinics nationwide</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">96%</span>
              <span className="home-stat-label">IVF success rate (partner clinics)</span>
            </div>
            <div className="home-stat">
              <span className="home-stat-value">500+</span>
              <span className="home-stat-label">Qualified fertility doctors</span>
            </div>
          </div>
        </section>

        {/* ── How It Works ──────────────────────────────────────── */}
        <section className="section home-how" id="how-it-works">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">Simple process</p>
              <h2>How CareCova Works</h2>
              <p>Four easy steps to financing your elective medical treatment.</p>
            </div>
            <div className="home-how-grid">
              {[
                { step: '01', title: 'Consult', desc: 'Book a consultation with a fertility specialist and compare clinic options.' },
                { step: '02', title: 'Apply', desc: 'Securely upload your treatment estimate or hospital bill.' },
                { step: '03', title: 'Get Treated', desc: 'Focus on your health while we settle the bill directly with the clinic.' },
                { step: '04', title: 'Repay', desc: 'Split the cost into clear, interest-fair weekly or monthly installments.' },
              ].map((item) => (
                <div key={item.step} className="home-how-card glass-card">
                  <span className="home-how-number">{item.step}</span>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </div>
              ))}
            </div>
            <div className="section-cta">
              <Link to="/how-it-works"><Button variant="secondary">Learn More</Button></Link>
            </div>
          </div>
        </section>

        {/* ── Services Grid ─────────────────────────────────────── */}
        <section className="section section-accent">
          <div className="container">
            <div className="section-header center">
              <p className="eyebrow">Our services</p>
              <h2>Financing for Elective Procedures</h2>
              <p>Health shouldn't wait for your next paycheck. Access the care you need with financial dignity.</p>
            </div>
            <div className="card-grid">
              {[
                { title: 'IVF & Fertility', desc: 'Realise your family dreams now, pay over time with flexible plans.', pink: true },
                { title: 'Surrogacy & Egg Donation', desc: 'Get expert guidance and financing for surrogacy journeys.', pink: true },
                { title: 'Dental & Optical', desc: 'Comprehensive care for eyes, teeth, and oral wellness.', pink: false },
                { title: 'Screenings & Wellness', desc: 'Preventive checks to stay ahead of health issues.', pink: false },
                { title: 'Cosmetic & Corrective', desc: 'Specialized surgeries and corrective procedures.', pink: false },
                { title: 'Mental Health', desc: 'Therapy, counselling, and fertility-related psychological support.', pink: true },
              ].map((item) => (
                <article key={item.title} className={`info-card glass-card${item.pink ? ' info-card--pink-accent' : ''}`}>
                  <h3>{item.title}</h3>
                  <p>{item.desc}</p>
                </article>
              ))}
            </div>
          </div>
        </section>

        {/* ── Security ──────────────────────────────────────────── */}
        <section className="section">
          <div className="container">
            <SecurityBadge />
          </div>
        </section>

        {/* ── Blog teaser ───────────────────────────────────────── */}
        <section className="section home-blog-teaser">
          <div className="container">
            <div className="section-header">
              <div>
                <p className="eyebrow">From the blog</p>
                <h2>Health &amp; Fertility Insights</h2>
              </div>
              <Link to="/blog"><Button variant="secondary">View all articles</Button></Link>
            </div>
            <div className="home-blog-grid">
              {[
                {
                  cat: 'IVF & Fertility',
                  title: 'Understanding IVF: What to Expect at Every Stage',
                  date: 'Oct 10, 2026',
                  img: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=400&q=80&auto=format&fit=crop',
                },
                {
                  cat: 'Success Rates',
                  title: 'IVF Success Rates in Nigeria: What the Numbers Really Mean',
                  date: 'Oct 3, 2026',
                  img: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=400&q=80&auto=format&fit=crop',
                },
                {
                  cat: 'Financing',
                  title: 'How to Finance Fertility Treatment Without Breaking the Bank',
                  date: 'Sep 18, 2026',
                  img: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=400&q=80&auto=format&fit=crop',
                },
              ].map((post) => (
                <Link to="/blog" key={post.title} className="home-blog-card glass-card">
                  <div className="home-blog-card-img-wrap">
                    <img src={post.img} alt={post.title} className="home-blog-card-img" loading="lazy" />
                    <span className="home-blog-card-cat">{post.cat}</span>
                  </div>
                  <div className="home-blog-card-body">
                    <time className="home-blog-card-date">{post.date}</time>
                    <h3 className="home-blog-card-title">{post.title}</h3>
                    <span className="home-blog-card-read">Read article →</span>
                  </div>
                </Link>
              ))}
            </div>
          </div>
        </section>

        {/* ── Final CTA ─────────────────────────────────────────── */}
        <section className="cta">
          <div className="container cta-content">
            <div>
              <h2>Ready to start your journey?</h2>
              <p>Book a consultation or apply for treatment financing today.</p>
            </div>
            <Link to={CONSULTATION_BOOKING_PATH}>
              <Button variant="light">Book a Consultation</Button>
            </Link>
            <Link to="/apply">
              <Button variant="light">Apply for Financing</Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
