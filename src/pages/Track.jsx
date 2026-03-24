import { useState } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import Input from '../components/Input'
import StatusBadge from '../components/StatusBadge'
import RepaymentSchedule from '../components/RepaymentSchedule'
import RepaymentDashboard from '../components/RepaymentDashboard'
import { trackingService } from '../services/trackingService'

const asNaira = (nairaValue, koboValue) => {
  if (typeof nairaValue === 'number' && Number.isFinite(nairaValue)) return nairaValue
  const fromKobo = Number(koboValue)
  return Number.isFinite(fromKobo) ? fromKobo / 100 : 0
}

const formatNaira = (value) => `₦${Math.round(Number(value || 0)).toLocaleString()}`

export default function Track() {
  const [searchParams] = useSearchParams()
  const [loanId, setLoanId] = useState(searchParams.get('loanId') || '')
  const [loan, setLoan] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  const handleTrack = async (e) => {
    e.preventDefault()

    if (!loanId.trim()) {
      setError('Please enter an application ID')
      return
    }

    setLoading(true)
    setError('')
    setLoan(null)

    try {
      const result = await trackingService.trackLoan(loanId.trim())
      setLoan(result)
    } catch (err) {
      setError('Application not found. Please check your application ID.')
      setLoan(null)
    } finally {
      setLoading(false)
    }
  }

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="container">
            <h1>Track Your Application</h1>
            <p>
              Enter your application ID to see the current status and repayment
              schedule.
            </p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="track-card">
              <form onSubmit={handleTrack} className="track-form">
                <Input
                  label="Application ID"
                  type="text"
                  placeholder="Enter Application ID (e.g. LN-123456)"
                  value={loanId}
                  onChange={(e) => setLoanId(e.target.value.toUpperCase())}
                  error={error}
                />
                <Button type="submit" variant="primary" disabled={loading}>
                  {loading ? 'Tracking...' : 'Track Status'}
                </Button>
              </form>
            </div>

            {loan && (
              <>
                <div className="track-welcome-bar">
                  <p className="track-welcome-text">
                    Welcome back{loan.fullName || loan.patientName ? `, ${(loan.fullName || loan.patientName).split(' ')[0]}` : ''}!
                  </p>
                  {loan.id === 'LN-DEMO' && (
                    <span className="track-demo-badge" title="Sample customer journey for presentations">Presentation demo</span>
                  )}
                </div>
                {loan.status === 'approved' && !loan.offerAcceptedAt ? (
                  <div className="offer-cta-card">
                    <h3>Your application has been approved</h3>
                    <p>Review and accept your offer to proceed with your loan.</p>
                    <Link to={`/offer/${loan.id}`}>
                      <Button variant="primary">View and accept your offer</Button>
                    </Link>
                  </div>
                ) : (loan.status === 'approved' && loan.offerAcceptedAt) || loan.status === 'active' ? (
                  <RepaymentDashboard loan={loan} />
                ) : (
                  <div className="loan-details">
                    <div className="loan-header">
                      <h2>Application Details - {loan.id}</h2>
                      <StatusBadge status={loan.status} />
                    </div>

                    <div className="loan-info-grid">
                      <div className="info-item">
                        <strong>Patient Name:</strong>
                        <p>{loan.patientName}</p>
                      </div>
                      <div className="info-item">
                        <strong>Hospital:</strong>
                        <p>{loan.hospital}</p>
                      </div>
                      <div className="info-item">
                        <strong>Treatment Category:</strong>
                        <p>{loan.treatmentCategory}</p>
                      </div>
                      <div className="info-item">
                        <strong>Estimated Cost:</strong>
                        <p>{formatNaira(asNaira(loan.estimatedCost, loan.estimatedCostKobo) || asNaira(loan.requestedAmount, loan.requestedAmountKobo))}</p>
                      </div>
                      <div className="info-item">
                        <strong>Status:</strong>
                        <p>
                          <StatusBadge status={loan.status} />
                        </p>
                      </div>
                      <div className="info-item">
                        <strong>Submitted:</strong>
                        <p>{new Date(loan.submittedAt).toLocaleDateString()}</p>
                      </div>
                      {loan.approvedAt && (
                        <div className="info-item">
                          <strong>Approved:</strong>
                          <p>{new Date(loan.approvedAt).toLocaleDateString()}</p>
                        </div>
                      )}
                    </div>

                    {loan.rejectionReason && (
                      <div className="rejection-notice">
                        <h3>Rejection Reason</h3>
                        <p>{loan.rejectionReason}</p>
                      </div>
                    )}
                  </div>
                )}
              </>
            )}
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
