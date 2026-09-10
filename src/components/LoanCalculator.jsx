import { useState, useEffect, useRef } from 'react'
import { getRiskConfig } from '../data/riskConfig'

const API_ROOT = ((import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')) + '/api'

const fmt = (n) => n != null ? `₦${Number(n).toLocaleString('en-NG', { minimumFractionDigits: 0 })}` : '—'

// Local reducing-balance calculation used when P2Vest API is unavailable
function calcLocal(amount, tenure) {
  const monthlyRate = getRiskConfig().interestRate
  const r = monthlyRate
  const n = tenure
  const installment = r === 0 ? amount / n : (amount * r * Math.pow(1 + r, n)) / (Math.pow(1 + r, n) - 1)
  let balance = amount
  const schedules = []
  let totalInterest = 0
  for (let i = 1; i <= n; i++) {
    const interest = balance * r
    const principal = installment - interest
    totalInterest += interest
    balance = Math.max(balance - principal, 0)
    schedules.push({ month: i, payment: Math.round(installment), principal: Math.round(principal), interest: Math.round(interest), balance: Math.round(balance) })
  }
  return {
    monthlyInstallment: Math.round(installment),
    totalRepayable: Math.round(installment * n),
    totalInterest: Math.round(totalInterest),
    interestRate: (monthlyRate * 100).toFixed(0),
    schedules,
    _isEstimate: true,
  }
}

async function fetchSchedule(amount, tenure, creditScore) {
  const params = new URLSearchParams({ amount: String(amount), tenure: String(tenure) })
  if (creditScore) params.set('creditScore', String(creditScore))
  try {
    const res = await fetch(`${API_ROOT}/partners/p2vest/calculator?${params}`)
    if (res.ok) return await res.json()
  } catch {}
  // Fall back to local calculation when API is unavailable
  return calcLocal(amount, tenure)
}

// Standalone widget — works embedded in Apply form or on homepage
export default function LoanCalculator({ initialAmount = '', initialTenure = '', creditScore, compact = false, onResult }) {
  const [amount, setAmount] = useState(String(initialAmount || ''))
  const [tenure, setTenure] = useState(String(initialTenure || ''))
  const [result, setResult] = useState(null)
  const [loading, setLoading] = useState(false)
  const [error, setError] = useState('')
  const debounceRef = useRef(null)

  // Auto-calculate when amount + tenure change (debounced 600ms)
  useEffect(() => {
    const a = Number(String(amount).replace(/[^0-9.]/g, ''))
    const t = Number(tenure)
    if (!a || !t || a < 100000 || t < 1) { setResult(null); setError(''); return }
    clearTimeout(debounceRef.current)
    debounceRef.current = setTimeout(async () => {
      setLoading(true)
      setError('')
      try {
        const data = await fetchSchedule(a, t, creditScore)
        setResult(data)
        onResult?.(data)
      } catch (err) {
        setError(err?.message || 'Unable to calculate — please check your connection.')
        setResult(null)
      } finally {
        setLoading(false)
      }
    }, 600)
    return () => clearTimeout(debounceRef.current)
  }, [amount, tenure, creditScore])

  // When parent changes props (Apply form), sync
  useEffect(() => { if (initialAmount) setAmount(String(initialAmount)) }, [initialAmount])
  useEffect(() => { if (initialTenure) setTenure(String(initialTenure)) }, [initialTenure])

  const monthly = result?.monthlyInstallment ?? result?.monthly_installment ?? result?.installment
  const total = result?.totalRepayable ?? result?.total_repayable ?? result?.totalAmount
  const interest = result?.totalInterest ?? result?.total_interest
  const rate = result?.interestRate ?? result?.interest_rate
  const schedules = result?.schedules ?? result?.schedule ?? []

  return (
    <div style={{ borderRadius: '12px', border: '1.5px solid #e0e7ff', background: '#f8faff', padding: compact ? '14px 16px' : '20px 24px' }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '14px' }}>
        <span style={{ fontSize: '1.1rem' }}>🧮</span>
        <div>
          <p style={{ margin: 0, fontWeight: 700, fontSize: '0.9375rem', color: '#1e3a5f' }}>Loan Repayment Preview</p>
          <p style={{ margin: 0, fontSize: '0.75rem', color: '#6b7280' }}>Provisional estimate — no application created</p>
        </div>
      </div>

      {!compact && (
        <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '10px', marginBottom: '14px' }}>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Loan Amount (₦)</label>
            <input
              type="text"
              inputMode="numeric"
              placeholder="e.g. 500000"
              value={amount}
              onChange={(e) => setAmount(e.target.value.replace(/[^0-9.]/g, ''))}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #d1d5db', fontSize: '0.875rem' }}
            />
          </div>
          <div>
            <label style={{ fontSize: '0.75rem', fontWeight: 600, color: '#374151', display: 'block', marginBottom: '4px' }}>Tenure (months)</label>
            <select
              value={tenure}
              onChange={(e) => setTenure(e.target.value)}
              style={{ width: '100%', boxSizing: 'border-box', padding: '8px 10px', borderRadius: '7px', border: '1.5px solid #d1d5db', fontSize: '0.875rem', background: '#fff' }}
            >
              <option value="">Select</option>
              {[1, 2, 3, 4, 6, 9, 12].map(m => <option key={m} value={m}>{m} month{m > 1 ? 's' : ''}</option>)}
            </select>
          </div>
        </div>
      )}

      {loading && (
        <div style={{ textAlign: 'center', padding: '12px 0', color: '#6b7280', fontSize: '0.8125rem' }}>
          Calculating…
        </div>
      )}

      {error && !loading && (
        <div style={{ padding: '10px 12px', borderRadius: '7px', background: '#fef2f2', color: '#dc2626', fontSize: '0.8125rem' }}>
          {error}
        </div>
      )}

      {result && !loading && (
        <>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(3, 1fr)', gap: '8px', marginBottom: schedules.length ? '14px' : 0 }}>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e0e7ff', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Monthly</p>
              <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 800, color: '#2563eb' }}>{fmt(monthly)}</p>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e0e7ff', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Total Repayable</p>
              <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 800, color: '#111827' }}>{fmt(total)}</p>
            </div>
            <div style={{ background: '#fff', borderRadius: '8px', padding: '10px 12px', border: '1px solid #e0e7ff', textAlign: 'center' }}>
              <p style={{ margin: 0, fontSize: '0.7rem', color: '#6b7280', fontWeight: 600, textTransform: 'uppercase' }}>Interest Rate</p>
              <p style={{ margin: '4px 0 0', fontSize: '1rem', fontWeight: 800, color: '#059669' }}>{rate != null ? `${rate}%` : interest ? fmt(interest) : '—'}</p>
            </div>
          </div>

          {schedules.length > 0 && (
            <div style={{ overflowX: 'auto' }}>
              <table style={{ width: '100%', borderCollapse: 'collapse', fontSize: '0.8rem' }}>
                <thead>
                  <tr style={{ background: '#eff6ff' }}>
                    {['Month', 'Payment', 'Principal', 'Interest', 'Balance'].map(h => (
                      <th key={h} style={{ padding: '6px 8px', textAlign: 'right', fontWeight: 600, color: '#374151', borderBottom: '1px solid #e0e7ff', whiteSpace: 'nowrap' }}>{h}</th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {schedules.map((s, i) => (
                    <tr key={i} style={{ borderBottom: '1px solid #f3f4f6' }}>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280' }}>{s.month ?? i + 1}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', fontWeight: 600 }}>{fmt(s.payment ?? s.installment ?? s.amount)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right' }}>{fmt(s.principal)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#d97706' }}>{fmt(s.interest)}</td>
                      <td style={{ padding: '5px 8px', textAlign: 'right', color: '#6b7280' }}>{fmt(s.balance ?? s.outstandingBalance)}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          )}

          <p style={{ margin: '8px 0 0', fontSize: '0.7rem', color: '#9ca3af', textAlign: 'center' }}>
            {result._isEstimate ? `⚠️ Indicative estimate at ${(getRiskConfig().interestRate * 100).toFixed(0)}%/month — final rate subject to credit assessment.` : 'Estimates are provisional and subject to credit assessment. Actual rates may vary.'}
          </p>
        </>
      )}

      {!result && !loading && !error && (
        <div style={{ textAlign: 'center', padding: '10px 0', color: '#9ca3af', fontSize: '0.8125rem' }}>
          {compact ? 'Enter your loan amount and tenure above to see the estimated repayment.' : 'Enter an amount (min ₦100,000) and tenure to see the repayment estimate.'}
        </div>
      )}
    </div>
  )
}
