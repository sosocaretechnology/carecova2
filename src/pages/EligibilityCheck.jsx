import { useState } from 'react'
import { Link, useNavigate } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import Select from '../components/Select'
import { hospitalService } from '../services/hospitalService'
import { eligibilityService } from '../services/eligibilityService'
import { useEffect } from 'react'
import { trackGoogleAnalyticsEvent } from '../services/googleAnalytics'

export default function EligibilityCheck() {
  const navigate = useNavigate()
  const [hospitals, setHospitals] = useState([])
  const [loading, setLoading] = useState(false)
  const [result, setResult] = useState(null)
  const [error, setError] = useState('')

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
    const loadHospitals = async () => {
      try {
        const data = await hospitalService.getAllHospitals()
        setHospitals(data)
      } catch (error) {
        console.error('Error loading hospitals:', error)
      }
    }
    loadHospitals()
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

  const hospitalOptions = [
    { value: '', label: 'Choose a partner hospital' },
    ...hospitals.map((h) => ({ value: h.name, label: h.name })),
  ]

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

                  <Select
                    label="Partner Hospital"
                    options={hospitalOptions}
                    value={formData.hospital}
                    onChange={(e) => handleChange('hospital', e.target.value)}
                    required
                  />

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
