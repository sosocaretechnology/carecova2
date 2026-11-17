import { useState, useEffect } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import Select from '../components/Select'
import { eligibilityService } from '../services/eligibilityService'
import { trackGoogleAnalyticsEvent } from '../services/googleAnalytics'

export default function EligibilityCheck() {
  const navigate = useNavigate()
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

  // Hospital picker state
  const [providerList, setProviderList] = useState([])
  const [providerListLoading, setProviderListLoading] = useState(true)
  const [hospitalSearch, setHospitalSearch] = useState('')
  const [showHospitalDropdown, setShowHospitalDropdown] = useState(false)
  const [selectedHospitalName, setSelectedHospitalName] = useState('')

  const [formData, setFormData] = useState({
    employmentType: '',
    hospital: '',
    treatmentCategory: '',
  })

  const employmentTypes = [
    { value: '', label: 'Select Employment Type' },
    { value: 'employed', label: 'Employed' },
    { value: 'self-employed', label: 'Self-Employed' },
    { value: 'business-owner', label: 'Business Owner' },
    { value: 'unemployed', label: 'Unemployed' },
  ]

  const treatmentCategories = [
    { value: '', label: 'Select Treatment Category' },
    { value: 'IVF & Fertility', label: 'IVF & Fertility' },
    { value: 'Dental & Optical', label: 'Dental & Optical' },
    { value: 'Wellness & Screening', label: 'Wellness & Screening' },
    { value: 'Cosmetic & Corrective', label: 'Cosmetic & Corrective' },
  ]

  useEffect(() => {
    const apiBase = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
    if (!apiBase) { setProviderListLoading(false); return }
    fetch(`${apiBase}/api/provider/public/providers?limit=200`)
      .then((r) => r.json())
      .then((data) => {
        const list = Array.isArray(data) ? data : data?.providers ?? []
        setProviderList(list)
      })
      .catch((err) => console.error('[CareCova] Failed to load provider list:', err.message))
      .finally(() => setProviderListLoading(false))
  }, [])

  const handleChange = (field, value) => {
    setFormData((prev) => ({ ...prev, [field]: value }))
    setResult(null)
    setError('')
  }

  const handleCheck = async (e) => {
    e.preventDefault()
    setError('')

    if (!formData.employmentType || !formData.hospital || !formData.treatmentCategory) {
      setError('Please fill in all fields')
      return
    }

    setLoading(true)
    try {
      const eligibilityResult = await eligibilityService.checkEligibility(formData)
      trackGoogleAnalyticsEvent('eligibility_check_completed')
      setResult(eligibilityResult)
    } catch (err) {
      setError('Failed to check eligibility. Please try again.')
    } finally {
      setLoading(false)
    }
  }

  const handleApply = () => {
    // Navigate to apply page with pre-filled data
    const params = new URLSearchParams({
      employmentType: formData.employmentType,
      hospital: formData.hospital,
      treatmentCategory: formData.treatmentCategory,
    })
    navigate(`/apply?${params.toString()}`)
  }


  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="container">
            <h1>Check Your Eligibility</h1>
            <p>See how much you may qualify for before applying</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="eligibility-container">
              <div className="eligibility-form-section">
                <h2>Quick Eligibility Check</h2>
                <p className="eligibility-description">
                  Answer a few questions to see your estimated loan amount
                </p>

                <form onSubmit={handleCheck} className="eligibility-form">
                  <Select
                    label="Employment Type"
                    options={employmentTypes}
                    value={formData.employmentType}
                    onChange={(e) => handleChange('employmentType', e.target.value)}
                    required
                  />

                  {/* Searchable hospital combobox */}
                  <div className="form-group">
                    <label className="form-label">Partner Hospital <span style={{ color: '#ef4444' }}>*</span></label>
                    <div style={{ position: 'relative' }}>
                      <input
                        type="text"
                        placeholder={providerListLoading ? 'Loading facilities…' : 'Search by hospital name…'}
                        value={showHospitalDropdown ? hospitalSearch : selectedHospitalName}
                        onFocus={() => { setHospitalSearch(''); setShowHospitalDropdown(true) }}
                        onChange={(e) => {
                          setHospitalSearch(e.target.value)
                          setShowHospitalDropdown(true)
                          if (!e.target.value) {
                            setSelectedHospitalName('')
                            handleChange('hospital', '')
                          }
                        }}
                        onBlur={() => setTimeout(() => setShowHospitalDropdown(false), 180)}
                        required={!formData.hospital}
                        style={{
                          width: '100%', padding: '10px 14px', borderRadius: '8px',
                          border: '1.5px solid #e2e8f0', fontSize: '0.9375rem',
                          outline: 'none', boxSizing: 'border-box', background: '#fff',
                        }}
                      />
                      {showHospitalDropdown && (
                        <div style={{
                          position: 'absolute', top: 'calc(100% + 4px)', left: 0, right: 0, zIndex: 50,
                          background: '#fff', border: '1px solid #e2e8f0', borderRadius: '10px',
                          boxShadow: '0 8px 24px rgba(0,0,0,0.1)', maxHeight: '260px', overflowY: 'auto',
                        }}>
                          {providerListLoading ? (
                            <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '0.875rem' }}>Loading facilities…</div>
                          ) : (() => {
                            const term = hospitalSearch.toLowerCase()
                            const filtered = providerList.filter(
                              (p) => !term || (p.name || '').toLowerCase().includes(term)
                            )
                            if (filtered.length === 0) {
                              return <div style={{ padding: '14px 16px', color: '#9ca3af', fontSize: '0.875rem' }}>No matching facilities found.</div>
                            }
                            return filtered.map((p) => {
                              const pid = p.id || p._id
                              const isSelected = formData.hospital === p.name
                              return (
                                <div
                                  key={pid}
                                  onMouseDown={() => {
                                    setSelectedHospitalName(p.name)
                                    handleChange('hospital', p.name)
                                    setHospitalSearch('')
                                    setShowHospitalDropdown(false)
                                  }}
                                  style={{
                                    padding: '11px 16px', cursor: 'pointer',
                                    display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                                    background: isSelected ? '#eff6ff' : 'transparent',
                                    borderBottom: '1px solid #f3f4f6',
                                  }}
                                >
                                  <div>
                                    <div style={{ fontWeight: 600, fontSize: '0.9rem', color: '#111827' }}>{p.name}</div>
                                    {(p.address || p.type) && (
                                      <div style={{ fontSize: '0.8rem', color: '#6b7280', marginTop: '2px' }}>
                                        {[p.type, p.address].filter(Boolean).join(' · ')}
                                      </div>
                                    )}
                                  </div>
                                  {isSelected && (
                                    <span style={{ fontSize: '0.75rem', background: '#dbeafe', color: '#2563eb', padding: '2px 8px', borderRadius: '10px', fontWeight: 600 }}>
                                      Selected
                                    </span>
                                  )}
                                </div>
                              )
                            })
                          })()}
                        </div>
                      )}
                    </div>
                    {formData.hospital && !showHospitalDropdown && (
                      <div style={{
                        marginTop: '8px', padding: '8px 12px', borderRadius: '8px',
                        background: '#f0fdf4', border: '1px solid #bbf7d0',
                        display: 'flex', justifyContent: 'space-between', alignItems: 'center',
                      }}>
                        <span style={{ fontWeight: 600, fontSize: '0.875rem', color: '#166534' }}>{formData.hospital}</span>
                        <button
                          type="button"
                          onClick={() => { setSelectedHospitalName(''); handleChange('hospital', ''); setHospitalSearch('') }}
                          style={{ background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontSize: '0.8rem', fontWeight: 500 }}
                        >
                          Change
                        </button>
                      </div>
                    )}
                  </div>

                  <Select
                    label="Treatment Category"
                    options={treatmentCategories}
                    value={formData.treatmentCategory}
                    onChange={(e) => handleChange('treatmentCategory', e.target.value)}
                    required
                  />

                  {error && <div className="error-message">{error}</div>}

                  <Button type="submit" variant="primary" className="full-width" disabled={loading}>
                    {loading ? 'Checking...' : 'Check Eligibility'}
                  </Button>
                </form>
              </div>

              {result && (
                <div className="eligibility-result-section">
                  <div className="eligibility-result-card">
                    <div className="eligibility-result-icon">✓</div>
                    <h3>You May Qualify!</h3>
                    <div className="eligibility-amount">
                      <span className="eligibility-amount-label">Up to</span>
                      <span className="eligibility-amount-value">
                        ₦{result.estimatedAmount.toLocaleString()}
                      </span>
                    </div>
                    <p className="eligibility-message">{result.message}</p>
                    <div className="eligibility-actions">
                      <Button variant="primary" onClick={handleApply} className="full-width">
                        Apply Now
                      </Button>
                      <Link to="/calculator">
                        <Button variant="ghost" className="full-width">
                          Calculate Repayment
                        </Button>
                      </Link>
                    </div>
                    <p className="eligibility-note">
                      * This is an estimate. Final approval and amount will be determined after
                      full application review.
                    </p>
                  </div>
                </div>
              )}
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
