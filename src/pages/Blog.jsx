import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import { CONSULTATION_BOOKING_PATH } from '../constants/consultation'

const POSTS = [
  {
    id: 1,
    category: 'IVF & Fertility',
    title: 'Understanding IVF: What to Expect at Every Stage',
    excerpt:
      'From the first hormone injection to the embryo transfer, IVF can feel overwhelming. We break down each step so you can go into the process with confidence.',
    date: 'October 10, 2026',
    readTime: '6 min read',
    image: 'https://images.unsplash.com/photo-1584820927498-cfe5211fd8bf?w=640&q=80&auto=format&fit=crop',
  },
  {
    id: 2,
    category: 'Success Rates',
    title: 'IVF Success Rates in Nigeria: What the Numbers Really Mean',
    excerpt:
      'Published success rates can be misleading. Learn what questions to ask your clinic and how to interpret the statistics that matter most to your situation.',
    date: 'October 3, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1551884170-09fb70a3a2ed?w=640&q=80&auto=format&fit=crop',
  },
  {
    id: 3,
    category: 'Surrogacy',
    title: 'Surrogacy in Nigeria: Legal Framework and What You Need to Know',
    excerpt:
      'Surrogacy laws in Nigeria are still evolving. This guide summarises what intended parents and surrogates should understand before starting the journey.',
    date: 'September 25, 2026',
    readTime: '8 min read',
    image: 'https://images.unsplash.com/photo-1609220136736-443140cffec6?w=640&q=80&auto=format&fit=crop',
  },
  {
    id: 4,
    category: 'Financing',
    title: 'How to Finance Your Fertility Treatment Without Breaking the Bank',
    excerpt:
      'Fertility treatments are expensive, but they don\'t have to be paid upfront. Explore how CareCova\'s instalment plans can make IVF and other procedures accessible.',
    date: 'September 18, 2026',
    readTime: '4 min read',
    image: 'https://images.unsplash.com/photo-1554224155-8d04cb21cd6c?w=640&q=80&auto=format&fit=crop',
  },
  {
    id: 5,
    category: 'IVF & Fertility',
    title: 'Egg Freezing: Is It the Right Choice for You?',
    excerpt:
      'Whether you\'re not ready to start a family yet or facing a medical situation, egg freezing (oocyte cryopreservation) offers a path to preserve your options.',
    date: 'September 10, 2026',
    readTime: '5 min read',
    image: 'https://images.unsplash.com/photo-1576091160399-112ba8d25d1d?w=640&q=80&auto=format&fit=crop',
  },
  {
    id: 6,
    category: 'Wellness',
    title: 'Nutrition and Fertility: Foods That Support Your Journey',
    excerpt:
      'What you eat matters. Discover the evidence-based dietary changes that can improve egg quality, sperm health, and overall reproductive wellness.',
    date: 'September 2, 2026',
    readTime: '7 min read',
    image: 'https://images.unsplash.com/photo-1512621776951-a57141f2eefd?w=640&q=80&auto=format&fit=crop',
  },
]

const CATEGORIES = ['All', 'IVF & Fertility', 'Success Rates', 'Surrogacy', 'Financing', 'Wellness']

export default function Blog() {
  const [activeCategory, setActiveCategory] = useState('All')

  const filtered = activeCategory === 'All'
    ? POSTS
    : POSTS.filter((p) => p.category === activeCategory)

  return (
    <>
      <Header />
      <main>
        {/* Hero */}
        <section className="blog-hero">
          <div className="container blog-hero-content">
            <p className="eyebrow">CareCova Health Insights</p>
            <h1 className="blog-hero-title">The CareCova Blog</h1>
            <p className="blog-hero-sub">
              Expert guidance on fertility, surrogacy, healthcare financing, and everything in between — helping you make informed decisions with confidence.
            </p>
          </div>
        </section>

        {/* Category filter */}
        <section className="blog-filter-bar">
          <div className="container">
            <div className="blog-filter-row">
              {CATEGORIES.map((cat) => (
                <button
                  key={cat}
                  className={`blog-filter-btn${activeCategory === cat ? ' blog-filter-btn--active' : ''}`}
                  onClick={() => setActiveCategory(cat)}
                >
                  {cat}
                </button>
              ))}
            </div>
          </div>
        </section>

        {/* Posts grid */}
        <section className="section">
          <div className="container">
            {filtered.length === 0 ? (
              <p className="blog-empty">No posts in this category yet. Check back soon.</p>
            ) : (
              <div className="blog-grid">
                {filtered.map((post, idx) => (
                  <article key={post.id} className={`blog-card glass-card${idx === 0 && activeCategory === 'All' ? ' blog-card--featured' : ''}`}>
                    <div className="blog-card-img-wrap">
                      <img src={post.image} alt={post.title} className="blog-card-img" loading="lazy" />
                      <span className="blog-card-category">{post.category}</span>
                    </div>
                    <div className="blog-card-body">
                      <div className="blog-card-meta">
                        <time>{post.date}</time>
                        <span>·</span>
                        <span>{post.readTime}</span>
                      </div>
                      <h2 className="blog-card-title">{post.title}</h2>
                      <p className="blog-card-excerpt">{post.excerpt}</p>
                      <span className="blog-card-read">Read article →</span>
                    </div>
                  </article>
                ))}
              </div>
            )}
          </div>
        </section>

        {/* CTA strip */}
        <section className="cta">
          <div className="container cta-content">
            <div>
              <h2>Ready to take the next step?</h2>
              <p>Speak with a fertility specialist from the comfort of your home.</p>
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
