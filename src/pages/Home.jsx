import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import SecurityBadge from '../components/SecurityBadge'
import TawkToChat from '../components/TawkToChat'
import heroImage from '../assets/hero-family.jpg'
import { CONSULTATION_BOOKING_PATH } from '../constants/consultation'

export default function Home() {

  return (
    <>
      <Header />
      <TawkToChat />
      <main>
        <section className="hero mesh-bg-hero">
          <div className="container hero-content">
            <div className="hero-copy-block">
              <p className="eyebrow">Healthcare Financing</p>
              <h1>
                Get treated now,<span> pay for it later.</span>
              </h1>
              <p className="hero-copy">
                Don't delay your health because of upfront costs. Access quality
                non-terminal medical care immediately at our partner hospitals
                and pay back in flexible installments.
              </p>
              <div className="hero-actions">
                <Link to="/apply">
                  <Button variant="primary">Apply for Treatment Credit</Button>
                </Link>
                <Link to="/eligibility">
                  <Button variant="secondary">Check Eligibility</Button>
                </Link>
                <Link to="/resume">
                  <Button variant="ghost">Resume Application</Button>
                </Link>
                <Link to="/how-it-works">
                  <Button variant="ghost">How it works</Button>
                </Link>
              </div>
              <div className="hero-badges">
                <span>24 hr average approval</span>
                <span>Partner clinics nationwide</span>
                <span>Transparent terms</span>
              </div>
            </div>
            <div className="hero-visual">
              <img
                src={heroImage}
                alt="Happy family"
              />
              <div className="floating-card glass-card">
                <p className="floating-title">Average approval</p>
                <p className="floating-value">24 hrs</p>
                <p className="floating-note">Across partner clinics</p>
              </div>
            </div>
          </div>
        </section>

        <section className="trust-strip">
          <div className="container trust-content">
            <div>
              <h3>₦ 2.4B+</h3>
              <p>Care financed responsibly</p>
            </div>
            <div>
              <h3>180+</h3>
              <p>Clinics in our network</p>
            </div>
            <div>
              <h3>96%</h3>
              <p>Repayment success</p>
            </div>
            <div>
              <h3>4.9/5</h3>
              <p>Customer satisfaction</p>
            </div>
          </div>
        </section>

        <section className="section" id="how-it-works">
          <div className="container">
            <div className="section-header center">
              <h2>How CareNow Works</h2>
              <p>Four easy steps to financing your elective medical treatment.</p>
            </div>
            <div className="steps-grid">
              <article className="step-card glass-card">
                <span className="step-number">01</span>
                <h3>Apply</h3>
                <p>Securely upload your treatment estimate or hospital bill.</p>
              </article>
              <article className="step-card glass-card">
                <span className="step-number">02</span>
                <h3>Review</h3>
                <p>Get a fast decision based on smart affordability checks.</p>
              </article>
              <article className="step-card glass-card">
                <span className="step-number">03</span>
                <h3>Treated</h3>
                <p>Focus on your health while we settle the bill directly.</p>
              </article>
              <article className="step-card glass-card">
                <span className="step-number">04</span>
                <h3>Repay</h3>
                <p>Split the cost into clear, interest-fair installments.</p>
              </article>
            </div>
            <div className="section-cta">
              <Link to="/how-it-works">
                <Button variant="secondary">Learn More</Button>
              </Link>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="section-header center">
              <h2>Trusted by Hospitals Nationwide</h2>
              <p>We are partnering with trusted hospitals all around Nigeria to bring you seamless healthcare financing.</p>
            </div>
          </div>
        </section>

        <section className="section section-accent mesh-bg-primary">
          <div className="container">
            <div className="section-header center">
              <h2>Financing for Elective Procedures</h2>
              <p>
                Health shouldn't wait for your next paycheck. CareCova empowers
                you to access essential but non-emergency medical care with
                financial dignity.
              </p>
            </div>
            <div className="card-grid">
              <article className="info-card glass-card">
                <h3>IVF & Fertility</h3>
                <p>Realize your family dreams now, pay over time.</p>
              </article>
              <article className="info-card glass-card">
                <h3>Dental & Optical</h3>
                <p>Comprehensive care for eyes, teeth, and wellness.</p>
              </article>
              <article className="info-card glass-card">
                <h3>Screenings & Wellness</h3>
                <p>Preventive checks to stay ahead of health issues.</p>
              </article>
              <article className="info-card glass-card">
                <h3>Cosmetic & Corrective</h3>
                <p>Specialized surgeries and corrective procedures.</p>
              </article>
            </div>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <SecurityBadge />
          </div>
        </section>

        <section className="cta">
          <div className="container cta-content">
            <div>
              <h2>Ready to prioritize your health?</h2>
              <p>
                Apply for a treatment credit today and get a decision in as little as 24 hours. Your health should not have to wait for the next paycheck.
              </p>
            </div>
            <Link to="/apply">
              <Button variant="light">Apply for Treatment Credit</Button>
            </Link>
            <Link to={CONSULTATION_BOOKING_PATH}>
              <Button variant="light">Book a Reservation</Button>
            </Link>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
