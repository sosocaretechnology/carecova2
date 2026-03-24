import { useState, useEffect } from 'react'
import { useSearchParams, Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import Receipt from '../components/Receipt'
import { paymentService } from '../services/paymentService'
import { adminService } from '../services/adminService'

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const USE_BACKEND = !!API_BASE_URL

export default function PaymentConfirmation() {
  const [searchParams] = useSearchParams()
  const transactionId = searchParams.get('transactionId')
  const loanId = searchParams.get('loanId')
  const source = searchParams.get('source')

  const [payment, setPayment] = useState(null)
  const [loading, setLoading] = useState(true)

  useEffect(() => {
    const loadPayment = async () => {
      if (transactionId) {
        try {
          let paymentData = null
          const session = adminService.getSession()
          const canUseAdminRepayments = USE_BACKEND && !!session?.accessToken
          if (canUseAdminRepayments) {
            const loanRepayments = await adminService.getRepaymentsByLoan(loanId, { limit: 100 })
            const items = Array.isArray(loanRepayments)
              ? loanRepayments
              : (loanRepayments?.items || loanRepayments?.data || [])
            const found = items.find((item) => String(item.id) === String(transactionId))
            if (found) {
              paymentData = {
                id: found.id,
                loanId: found.loanId || loanId,
                amount: Number(found.amountNaira ?? (Number(found.amountKobo || 0) / 100) ?? 0),
                method: found.paymentChannel || found.method || 'Unknown',
                status: found.status || 'completed',
                processedAt: found.paidAt || found.createdAt || new Date().toISOString(),
              }
            }
          }
          if (!paymentData && !USE_BACKEND) {
            paymentData = await paymentService.getReceipt(transactionId)
          }
          if (!paymentData && USE_BACKEND && !canUseAdminRepayments) {
            paymentData = await paymentService.getReceipt(transactionId)
          }
          if (!paymentData && USE_BACKEND) {
            if (source === 'demo') {
              paymentData = await paymentService.getReceipt(transactionId)
            } else {
              throw new Error('Repayment receipt not found from backend')
            }
          }
          setPayment(paymentData)
        } catch (error) {
          console.error('Error loading payment:', error)
        } finally {
          setLoading(false)
        }
      }
    }
    loadPayment()
  }, [transactionId])

  const handleDownloadReceipt = () => {
    // In a real implementation, this would generate and download a PDF
    alert('Receipt download feature will be implemented with PDF generation')
  }

  const handleEmailReceipt = () => {
    // In a real implementation, this would send email
    alert('Receipt email feature will be implemented with email service')
  }

  if (loading) {
    return (
      <>
        <Header />
        <main>
          <section className="section">
            <div className="container">
              <div className="loading">Loading payment confirmation...</div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  if (!payment) {
    return (
      <>
        <Header />
        <main>
          <section className="section">
            <div className="container">
              <div className="error-message">Payment information not found</div>
            </div>
          </section>
        </main>
        <Footer />
      </>
    )
  }

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="container">
            <h1>Payment Successful!</h1>
            <p>Your payment has been processed</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="payment-confirmation-container">
              <div className="payment-confirmation-success">
                <div className="success-icon">✓</div>
                <h2>Payment Confirmed</h2>
                <p className="transaction-id">Transaction ID: {payment.id}</p>
              </div>

              <Receipt payment={payment} loanId={loanId} />

              <div className="payment-confirmation-actions">
                <Button variant="primary" onClick={handleDownloadReceipt}>
                  Download Receipt
                </Button>
                <Button variant="ghost" onClick={handleEmailReceipt}>
                  Email Receipt
                </Button>
                <Link to={`/track?loanId=${loanId}`}>
                  <Button variant="secondary">View Loan Details</Button>
                </Link>
              </div>
            </div>
          </div>
        </section>
      </main>
      <Footer />
    </>
  )
}
