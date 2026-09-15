import { useState } from 'react'
import { Link } from 'react-router-dom'
import Header from '../components/Header'
import Footer from '../components/Footer'
import Button from '../components/Button'
import { getRiskConfig } from '../data/riskConfig'

export default function Calculator() {
  const [amount, setAmount] = useState(250000)
  const [months, setMonths] = useState(6)

  const config = getRiskConfig()
  const interestRate = config.lendingInterestRatePerMonth ?? config.interestRate ?? 0.05
  const totalRepayment = amount * (1 + interestRate * months)
  const monthlyInstallment = totalRepayment / months
  const totalInterest = totalRepayment - amount

  return (
    <>
      <Header />
      <main>
        <section className="page-hero">
          <div className="container">
            <h1>Loan Calculator</h1>
            <p>Estimate your monthly installments before you apply.</p>
          </div>
        </section>

        <section className="section">
          <div className="container">
            <div className="calculator-container">
              <div className="calculator-inputs">
                <div className="calculator-field">
                  <label htmlFor="amount" className="calculator-label">
                    Procedure Cost (₦)
                  </label>
                  <div className="calculator-range-wrapper">
                    <input
                      type="range"
                      id="amount"
                      min="50000"
                      max="5000000"
                      step="50000"
                      value={amount}
                      onChange={(e) => setAmount(parseInt(e.target.value))}
                      className="calculator-range"
                    />
                    <div className="calculator-range-labels">
                      <span>₦50k</span>
                      <span className="calculator-value">₦{amount.toLocaleString()}</span>
                      <span>₦5M</span>
                    </div>
                  </div>
                </div>

                <div className="calculator-field">
                  <label className="calculator-label">Repayment Period</label>
                  <div className="calculator-options">
                    {[3, 6, 12].map((m) => (
                      <button
                        key={m}
                        onClick={() => setMonths(m)}
                        className={`calculator-option ${months === m ? 'calculator-option--active' : ''}`}
                      >
                        {m} Months
                      </button>
                    ))}
                  </div>
                </div>

                <p className="calculator-disclaimer">
                  * This is an estimate based on average rates. Final terms will be provided after credit assessment.
                </p>
              </div>

              <div className="calculator-results">
                <div className="calculator-results-header">
                  <span className="calculator-results-label">Estimated Monthly Payment</span>
                  <div className="calculator-results-amount">
                    ₦{Math.round(monthlyInstallment).toLocaleString()}
                  </div>
                </div>

                <div className="calculator-results-details">
                  <div className="calculator-result-item">
                    <span>Total Repayment</span>
                    <span className="calculator-result-value">
                      ₦{Math.round(totalRepayment).toLocaleString()}
                    </span>
                  </div>
                  <div className="calculator-result-item">
                    <span>Principal Amount</span>
                    <span className="calculator-result-value">
                      ₦{amount.toLocaleString()}
                    </span>
                  </div>
                  <div className="calculator-result-item">
                    <span>Total Interest</span>
                    <span className="calculator-result-value">
                      ₦{Math.round(totalInterest).toLocaleString()}
                    </span>
                  </div>
                  <div className="calculator-result-item">
                    <span>Monthly Interest Rate</span>
                    <span className="calculator-result-value">{(interestRate * 100).toFixed(0)}%</span>
                  </div>
                </div>

                <Link to="/apply" className="calculator-apply-link">
                  <Button variant="primary" className="calculator-apply-button">
                    Apply with these Terms
                  </Button>
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
