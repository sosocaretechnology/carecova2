import { useState, useEffect } from 'react'
import { useNavigate, useSearchParams } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import PaymentMethodSelector from '../components/PaymentMethodSelector'
import Input from '../components/Input'
import { trackingService } from '../services/trackingService'
import { paymentService } from '../services/paymentService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const USE_BACKEND = !!API_BASE_URL

export default function MakePayment() {
  const navigate = useNavigate()
  const [searchParams] = useSearchParams()
  const loanId = searchParams.get('loanId')

  const [loan, setLoan] = useState(null)
  const [selectedMethod, setSelectedMethod] = useState('wallet')
  const [amount, setAmount] = useState('')
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')

  useEffect(() => {
    const loadLoan = async () => {
      if (loanId) {
        try {
          const loanData = await trackingService.trackLoan(loanId)
          setLoan(loanData)
          if (loanData.nextPayment) {
            setAmount(loanData.nextPayment.amount.toString())
          }
        } catch (err) {
          setError('Loan not found')
        }
      }
    }
    loadLoan()
  }, [loanId])

  const handleSubmit = async (e) => {
    e.preventDefault()
    setError('')

    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid payment amount')
      return
    }

    if (!loan) {
      setError('Loan information not available')
      return
    }

    setLoading(true)

    try {
      const amountNaira = parseFloat(amount)
      if (USE_BACKEND) {
        const link = await paymentService.createRepaymentLink({
          loanId: loan.id,
          amount: amountNaira,
          email: loan.email,
        })
        if (!link?.authorizationUrl) {
          throw new Error('Payment link generation failed')
        }
        try {
          sessionStorage.setItem('carecova_pending_payment_loan_id', String(loan.id))
        } catch (_) {}
        window.location.assign(link.authorizationUrl)
        return
      }

      const result = await paymentService.processPayment({
        loanId: loan.id,
        amount: amountNaira,
        method: selectedMethod,
      })
      const transactionId = result?.id || result?.transactionId
      if (!transactionId) throw new Error('Payment submitted but no transaction reference was returned')

      navigate(`/payment-confirmation?transactionId=${transactionId}&loanId=${loan.id}`)
    } catch (err) {
      setError(
        err.message ||
        (USE_BACKEND
          ? 'Repayment API failed. Please retry or contact support.'
          : 'Payment processing failed. Please try again.')
      )
    } finally {
      setLoading(false)
    }
  }

  const handleSimulatePayment = async () => {
    setError('')
    if (!amount || parseFloat(amount) <= 0) {
      setError('Please enter a valid payment amount to simulate')
      return
    }
    if (!loan) {
      setError('Loan information not available')
      return
    }

    setLoading(true)
    try {
      const result = await paymentService.processPayment({
        loanId: loan.id,
        amount: parseFloat(amount),
        method: `${selectedMethod} (simulated)`,
      })
      const transactionId = result?.id || result?.transactionId
      if (!transactionId) throw new Error('Simulation failed to generate transaction reference')
      navigate(`/payment-confirmation?transactionId=${transactionId}&loanId=${loan.id}&source=demo`)
    } catch (err) {
      setError(err.message || 'Unable to simulate payment right now.')
    } finally {
      setLoading(false)
    }
  }

  if (!loan) {
    return (
      <>
        <Header />
        <main>
          <section className="section">
            <div className="container">
              <div className="loading">Loading payment information...</div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  const nextPayment = loan.nextPayment
  const maxAmount = loan.outstandingBalance || nextPayment?.amount || 0

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="container">
            <h1>Make a Payment</h1>
            <p>Complete your payment securely</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="payment-container">
              <div className="payment-summary">
                <h2>Payment Summary</h2>
                <div className="payment-summary-item">
                  <span>Loan ID:</span>
                  <strong>{loan.id}</strong>
                </div>
                {nextPayment && (
                  <div className="payment-summary-item">
                    <span>Next Payment Due:</span>
                    <strong>₦{nextPayment.amount.toLocaleString()}</strong>
                  </div>
                )}
                <div className="payment-summary-item">
                  <span>Outstanding Balance:</span>
                  <strong>₦{loan.outstandingBalance?.toLocaleString() || '0'}</strong>
                </div>
              </div>

              <form onSubmit={handleSubmit} className="payment-form">
                <Input
                  label="Payment Amount (₦)"
                  type="number"
                  min="1"
                  max={maxAmount}
                  value={amount}
                  onChange={(e) => setAmount(e.target.value)}
                  placeholder={`Enter amount (max: ₦${maxAmount.toLocaleString()})`}
                  required
                />

                <PaymentMethodSelector
                  selectedMethod={selectedMethod}
                  onSelect={setSelectedMethod}
                />

                {error && <div className="error-message">{error}</div>}

                <div style={{ display: 'grid', gap: 8 }}>
                  <Button type="submit" variant="primary" className="full-width" disabled={loading}>
                    {loading ? 'Preparing Payment...' : (USE_BACKEND ? 'Proceed to Paystack' : 'Proceed to Payment')}
                  </Button>
                  <Button type="button" variant="secondary" className="full-width" disabled={loading} onClick={handleSimulatePayment}>
                    {loading ? 'Simulating...' : 'Simulate Payment (Demo)'}
                  </Button>
                </div>
              </form>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
