import { CreditCard, Wallet, Landmark } from 'lucide-react'
import IconBadge from './IconBadge'

export default function PaymentMethodSelector({ selectedMethod, onSelect, methods = [] }) {
  const defaultMethods = [
    {
      id: 'wallet',
      name: 'Pay with Wallet',
      description: 'OPay, Palmpay, and other mobile wallets',
      icon: <IconBadge color="green" size="md"><Wallet size={20} /></IconBadge>,
      recommended: true,
      processingTime: 'Instant',
    },
    {
      id: 'bank-transfer',
      name: 'Bank Transfer',
      description: 'Direct bank transfer',
      icon: <IconBadge color="blue" size="md"><Landmark size={20} /></IconBadge>,
      recommended: false,
      processingTime: '1-2 business days',
    },
    {
      id: 'card',
      name: 'Card Payment',
      description: 'Debit or credit card',
      icon: <IconBadge color="violet" size="md"><CreditCard size={20} /></IconBadge>,
      recommended: false,
      processingTime: 'Instant',
    },
  ]

  const paymentMethods = methods.length > 0 ? methods : defaultMethods

  return (
    <div className="payment-method-selector">
      <h3>Select Payment Method</h3>
      <div className="payment-methods-grid">
        {paymentMethods.map((method) => (
          <div
            key={method.id}
            className={`payment-method-card ${selectedMethod === method.id ? 'payment-method-card--selected' : ''} ${method.recommended ? 'payment-method-card--recommended' : ''}`}
            onClick={() => onSelect(method.id)}
          >
            {method.recommended && (
              <span className="payment-method-badge">Recommended</span>
            )}
            <div className="payment-method-icon">{method.icon}</div>
            <div className="payment-method-name">{method.name}</div>
            <div className="payment-method-description">{method.description}</div>
            <div className="payment-method-time">
              Processing: {method.processingTime}
            </div>
          </div>
        ))}
      </div>
    </div>
  )
}
