export default function Receipt({ payment, loanId }) {
  if (!payment) return null
  const amountNaira = typeof payment.amount === 'number'
    ? payment.amount
    : (Number.isFinite(Number(payment.amountNaira))
      ? Number(payment.amountNaira)
      : (Number.isFinite(Number(payment.amountKobo)) ? Number(payment.amountKobo) / 100 : 0))
  const method = payment.method || payment.paymentChannel || '—'
  const processedAt = payment.processedAt || payment.paidAt || payment.createdAt

  return (
    <div className="receipt-card">
      <div className="receipt-header">
        <h3>Payment Receipt</h3>
        <div className="receipt-status receipt-status--success">Completed</div>
      </div>

      <div className="receipt-details">
        <div className="receipt-detail-row">
          <span className="receipt-label">Transaction ID:</span>
          <span className="receipt-value">{payment.id}</span>
        </div>
        <div className="receipt-detail-row">
          <span className="receipt-label">Loan ID:</span>
          <span className="receipt-value">{loanId || payment.loanId}</span>
        </div>
        <div className="receipt-detail-row">
          <span className="receipt-label">Payment Amount:</span>
          <span className="receipt-value receipt-value--amount">
            ₦{Math.round(amountNaira).toLocaleString()}
          </span>
        </div>
        <div className="receipt-detail-row">
          <span className="receipt-label">Payment Method:</span>
          <span className="receipt-value">{method}</span>
        </div>
        <div className="receipt-detail-row">
          <span className="receipt-label">Date & Time:</span>
          <span className="receipt-value">
            {processedAt ? new Date(processedAt).toLocaleString() : '—'}
          </span>
        </div>
        <div className="receipt-detail-row">
          <span className="receipt-label">Status:</span>
          <span className="receipt-value receipt-value--success">{payment.status}</span>
        </div>
      </div>

      <div className="receipt-footer">
        <p>Thank you for your payment. This receipt serves as proof of payment.</p>
      </div>
    </div>
  )
}
