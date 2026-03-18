import { useEffect, useState } from 'react'
import { AlertCircle, ArrowUpRight, CheckCircle2, Landmark, RefreshCw, Wallet } from 'lucide-react'
import { adminService } from '../../services/adminService'

const STATUS_META = {
  customer_created: { label: 'Customer created', color: '#2563eb' },
  awaiting_authorization: { label: 'Awaiting authorization', color: '#d97706' },
  rejected: { label: 'Rejected', color: '#dc2626' },
  approved: { label: 'Approved', color: '#2563eb' },
  ready_to_debit: { label: 'Ready to debit', color: '#15803d' },
  paused: { label: 'Paused', color: '#d97706' },
  reinstated: { label: 'Reinstated', color: '#15803d' },
  debit_processing: { label: 'Debit processing', color: '#2563eb' },
  debit_successful: { label: 'Debit successful', color: '#15803d' },
  debit_failed: { label: 'Debit failed', color: '#dc2626' },
  cancelled: { label: 'Cancelled', color: '#dc2626' },
}

function formatDateTime(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleString()
}

function formatCurrency(value) {
  const amount = Number(value || 0)
  return `₦${amount.toLocaleString()}`
}

function toKoboString(value) {
  const amount = Number(value || 0)
  return amount > 0 ? String(Math.round(amount * 100)) : ''
}

function resolveDefaultCustomerForm(loan) {
  const customer = loan?.monoDirectDebit?.customer || {}
  return {
    identityNumber: customer.identity?.number || '',
    firstName: customer.firstName || splitName(loan?.fullName || loan?.patientName).firstName,
    lastName: customer.lastName || splitName(loan?.fullName || loan?.patientName).lastName,
    email: customer.email || loan?.email || '',
    phone: customer.phone || loan?.phone || '',
    address: customer.address || loan?.homeAddress || '',
  }
}

function resolveDefaultMandateForm(loan) {
  const mandate = loan?.monoDirectDebit?.mandate || {}
  const fallbackAmount = loan?.outstandingBalance || loan?.totalRepayment || loan?.approvedAmount || loan?.requestedAmount || loan?.estimatedCost || 0
  const nextDue = loan?.repaymentSchedule?.find((item) => !item.paid)?.dueDate
  const lastDue = loan?.repaymentSchedule?.[loan?.repaymentSchedule?.length - 1]?.dueDate

  return {
    amount: mandate.amountKobo ? String(mandate.amountKobo) : toKoboString(fallbackAmount),
    mandateType: mandate.mandateType || 'emandate',
    description: mandate.description || `Loan repayment for ${loan?.email || loan?.fullName || loan?.patientName || 'applicant'}`,
    startDate: mandate.startDate || (nextDue ? String(nextDue).slice(0, 10) : new Date().toISOString().slice(0, 10)),
    endDate: mandate.endDate || (lastDue ? String(lastDue).slice(0, 10) : new Date().toISOString().slice(0, 10)),
  }
}

function resolveDefaultDebitForm(loan) {
  const nextInstallment = loan?.repaymentSchedule?.find((item) => !item.paid)
  const lastDebit = loan?.monoDirectDebit?.lastDebit || {}
  return {
    balanceAmount: nextInstallment ? toKoboString(nextInstallment.amount) : '',
    debitAmount: nextInstallment ? toKoboString(nextInstallment.amount) : '',
    narration: lastDebit.narration || `Loan repayment for ${loan?.fullName || loan?.patientName || 'applicant'}`,
    feeBearer: 'business',
    reference: '',
  }
}

export default function DirectDebitCard({ loan, onUpdated }) {
  const [customerForm, setCustomerForm] = useState(() => resolveDefaultCustomerForm(loan))
  const [mandateForm, setMandateForm] = useState(() => resolveDefaultMandateForm(loan))
  const [debitForm, setDebitForm] = useState(() => resolveDefaultDebitForm(loan))
  const [loading, setLoading] = useState({
    customer: false,
    mandate: false,
    balance: false,
    debit: false,
  })
  const [feedback, setFeedback] = useState({ type: '', message: '' })
  const [lastActionResult, setLastActionResult] = useState(null)

  useEffect(() => {
    setCustomerForm(resolveDefaultCustomerForm(loan))
    setMandateForm(resolveDefaultMandateForm(loan))
    setDebitForm(resolveDefaultDebitForm(loan))
  }, [loan])

  const directDebit = loan?.monoDirectDebit || {}
  const customer = directDebit.customer || {}
  const mandate = directDebit.mandate || {}
  const balanceInquiry = directDebit.balanceInquiry || {}
  const lastDebit = directDebit.lastDebit || {}
  const nextInstallment = loan?.repaymentSchedule?.find((item) => !item.paid) || null
  const statusKey = directDebit.status || (mandate.readyToDebit ? 'ready_to_debit' : customer.id ? 'customer_created' : 'not_started')
  const statusMeta = STATUS_META[statusKey] || { label: 'Not started', color: '#64748b' }
  const isEligible = ['approved', 'active', 'overdue'].includes(loan?.status)

  const updateLoading = (key, value) => {
    setLoading((current) => ({ ...current, [key]: value }))
  }

  const runAction = async (key, action) => {
    try {
      updateLoading(key, true)
      setFeedback({ type: '', message: '' })
      const result = await action()
      setFeedback({
        type: 'success',
        message: result?.message || 'Action completed successfully',
      })
      setLastActionResult(result)
      await onUpdated?.()
    } catch (error) {
      setFeedback({
        type: 'error',
        message: error.message || 'Action failed',
      })
    } finally {
      updateLoading(key, false)
    }
  }

  const handleCreateCustomer = async (event) => {
    event.preventDefault()
    await runAction('customer', () =>
      adminService.createMonoDirectDebitCustomerForLoan(loan.id, {
        identity: { type: 'bvn', number: customerForm.identityNumber.trim() },
        firstName: customerForm.firstName.trim(),
        lastName: customerForm.lastName.trim(),
        email: customerForm.email.trim(),
        phone: customerForm.phone.trim(),
        address: customerForm.address.trim(),
      }),
    )
  }

  const handleCreateMandate = async (event) => {
    event.preventDefault()
    await runAction('mandate', () =>
      adminService.initiateMonoDirectDebitMandateForLoan(loan.id, {
        amount: Number(mandateForm.amount),
        mandateType: mandateForm.mandateType,
        debitType: 'variable',
        description: mandateForm.description.trim(),
        startDate: mandateForm.startDate,
        endDate: mandateForm.endDate,
        redirectUrl: `${window.location.origin}/admin/loans/${loan.id}`,
      }),
    )
  }

  const handleBalanceInquiry = async (withAmount) => {
    await runAction('balance', () =>
      adminService.inquireMonoDirectDebitBalanceForLoan(loan.id, withAmount && debitForm.balanceAmount
        ? { amount: Number(debitForm.balanceAmount) }
        : {}),
    )
  }

  const handleDebit = async (event) => {
    event.preventDefault()
    await runAction('debit', () =>
      adminService.debitMonoDirectDebitMandateForLoan(loan.id, {
        amount: Number(debitForm.debitAmount),
        narration: debitForm.narration.trim(),
        feeBearer: debitForm.feeBearer,
        reference: debitForm.reference.trim() || undefined,
      }),
    )
  }

  return (
    <div className="detail-card" style={{ borderLeft: `4px solid ${statusMeta.color}` }}>
      <div className="flex-between" style={{ gap: 12, alignItems: 'center' }}>
        <div>
          <h2 style={{ marginBottom: 4 }}>Mono Direct Debit</h2>
          <div style={{ color: '#475569', fontSize: '0.86rem' }}>
            Create the customer, initiate the mandate, confirm funds, then debit the next installment.
          </div>
        </div>
        <span
          className="badge"
          style={{ background: `${statusMeta.color}22`, color: statusMeta.color, fontWeight: 700 }}
        >
          {statusMeta.label}
        </span>
      </div>

      {!isEligible ? (
        <div className="alert-box alert-warning mt-3">
          Direct debit actions are enabled once the loan is approved or active.
        </div>
      ) : null}

      {feedback.message ? (
        <div className={`alert-box ${feedback.type === 'error' ? 'alert-error' : 'alert-success'} mt-3`}>
          {feedback.message}
        </div>
      ) : null}

      <div className="info-grid mt-3">
        <div className="info-group">
          <div className="info-label">Customer ID</div>
          <div className="info-value font-mono">{customer.id || '—'}</div>
        </div>
        <div className="info-group">
          <div className="info-label">Mandate ID</div>
          <div className="info-value font-mono">{mandate.id || '—'}</div>
        </div>
        <div className="info-group">
          <div className="info-label">Mandate status</div>
          <div className="info-value">{mandate.status || '—'}</div>
        </div>
        <div className="info-group">
          <div className="info-label">Ready to debit</div>
          <div className="info-value">{mandate.readyToDebit ? 'Yes' : 'No'}</div>
        </div>
        <div className="info-group">
          <div className="info-label">Outstanding</div>
          <div className="info-value">{formatCurrency(loan.outstandingBalance || loan.totalRepayment || loan.requestedAmount)}</div>
        </div>
        <div className="info-group">
          <div className="info-label">Next installment</div>
          <div className="info-value">
            {nextInstallment ? `${formatCurrency(nextInstallment.amount)} due ${new Date(nextInstallment.dueDate).toLocaleDateString()}` : '—'}
          </div>
        </div>
      </div>

      <div className="mt-4" style={{ display: 'grid', gap: 16 }}>
        <form onSubmit={handleCreateCustomer} style={sectionStyle}>
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>1. Create customer</h3>
              <div className="text-xs text-muted">BVN is required by Mono for direct debit customer creation.</div>
            </div>
            <Landmark size={18} color="#334155" />
          </div>
          <div style={formGridStyle}>
            <input className="form-input" placeholder="BVN" value={customerForm.identityNumber} onChange={(e) => setCustomerForm((current) => ({ ...current, identityNumber: e.target.value }))} />
            <input className="form-input" placeholder="First name" value={customerForm.firstName} onChange={(e) => setCustomerForm((current) => ({ ...current, firstName: e.target.value }))} />
            <input className="form-input" placeholder="Last name" value={customerForm.lastName} onChange={(e) => setCustomerForm((current) => ({ ...current, lastName: e.target.value }))} />
            <input className="form-input" placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((current) => ({ ...current, email: e.target.value }))} />
            <input className="form-input" placeholder="Phone" value={customerForm.phone} onChange={(e) => setCustomerForm((current) => ({ ...current, phone: e.target.value }))} />
            <input className="form-input" placeholder="Address" value={customerForm.address} onChange={(e) => setCustomerForm((current) => ({ ...current, address: e.target.value }))} />
          </div>
          <div style={actionRowStyle}>
            <button className="button button--primary" disabled={!isEligible || loading.customer}>
              {loading.customer ? 'Creating...' : customer.id ? 'Refresh Customer' : 'Create Customer'}
            </button>
          </div>
        </form>

        <form onSubmit={handleCreateMandate} style={sectionStyle}>
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>2. Initiate mandate</h3>
              <div className="text-xs text-muted">Use kobo. E-mandate includes the fixed N50 NIBSS fee.</div>
            </div>
            <Wallet size={18} color="#334155" />
          </div>
          <div style={formGridStyle}>
            <input className="form-input" placeholder="Mandate amount (kobo)" value={mandateForm.amount} onChange={(e) => setMandateForm((current) => ({ ...current, amount: e.target.value }))} />
            <select className="form-input" value={mandateForm.mandateType} onChange={(e) => setMandateForm((current) => ({ ...current, mandateType: e.target.value }))}>
              <option value="emandate">E-mandate</option>
              <option value="signed">Signed</option>
              <option value="gsm">GSM</option>
              <option value="sweep">Sweep</option>
            </select>
            <input className="form-input" type="date" value={mandateForm.startDate} onChange={(e) => setMandateForm((current) => ({ ...current, startDate: e.target.value }))} />
            <input className="form-input" type="date" value={mandateForm.endDate} onChange={(e) => setMandateForm((current) => ({ ...current, endDate: e.target.value }))} />
            <input className="form-input" placeholder="Description" value={mandateForm.description} onChange={(e) => setMandateForm((current) => ({ ...current, description: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div style={actionRowStyle}>
            <button className="button button--primary" disabled={!isEligible || !customer.id || loading.mandate}>
              {loading.mandate ? 'Initiating...' : mandate.id ? 'Re-initiate Mandate' : 'Create Mandate'}
            </button>
            {mandate.monoUrl ? (
              <a href={mandate.monoUrl} target="_blank" rel="noreferrer" className="button button--secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Open Mono Link <ArrowUpRight size={14} />
              </a>
            ) : null}
          </div>
        </form>

        <div style={sectionStyle}>
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>3. Confirm balance</h3>
              <div className="text-xs text-muted">Optional but recommended before a variable debit.</div>
            </div>
            <RefreshCw size={18} color="#334155" />
          </div>
          <div style={{ ...formGridStyle, gridTemplateColumns: '2fr 1fr 1fr' }}>
            <input className="form-input" placeholder="Amount to check (kobo)" value={debitForm.balanceAmount} onChange={(e) => setDebitForm((current) => ({ ...current, balanceAmount: e.target.value }))} />
            <button className="button button--secondary" disabled={!mandate.id || loading.balance} onClick={() => handleBalanceInquiry(true)}>
              {loading.balance ? 'Checking...' : 'Check Amount'}
            </button>
            <button className="button button--secondary" disabled={!mandate.id || loading.balance} onClick={() => handleBalanceInquiry(false)}>
              Current Balance
            </button>
          </div>
          <div className="info-grid mt-3">
            <div className="info-group">
              <div className="info-label">Last inquiry</div>
              <div className="info-value">{formatDateTime(balanceInquiry.checkedAt)}</div>
            </div>
            <div className="info-group">
              <div className="info-label">Type</div>
              <div className="info-value">{balanceInquiry.inquiryType || '—'}</div>
            </div>
            <div className="info-group">
              <div className="info-label">Sufficient funds</div>
              <div className="info-value">
                {typeof balanceInquiry.raw?.has_sufficient_balance === 'boolean'
                  ? balanceInquiry.raw.has_sufficient_balance ? 'Yes' : 'No'
                  : '—'}
              </div>
            </div>
            <div className="info-group">
              <div className="info-label">Reported balance</div>
              <div className="info-value">
                {balanceInquiry.raw?.account_balance != null ? formatCurrency(balanceInquiry.raw.account_balance) : '—'}
              </div>
            </div>
          </div>
        </div>

        <form onSubmit={handleDebit} style={sectionStyle}>
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>4. Debit account</h3>
              <div className="text-xs text-muted">Use kobo and keep a small bank buffer where needed.</div>
            </div>
            <CheckCircle2 size={18} color="#334155" />
          </div>
          <div style={formGridStyle}>
            <input className="form-input" placeholder="Debit amount (kobo)" value={debitForm.debitAmount} onChange={(e) => setDebitForm((current) => ({ ...current, debitAmount: e.target.value }))} />
            <select className="form-input" value={debitForm.feeBearer} onChange={(e) => setDebitForm((current) => ({ ...current, feeBearer: e.target.value }))}>
              <option value="business">Business pays fee</option>
              <option value="customer">Customer pays fee</option>
            </select>
            <input className="form-input" placeholder="Reference (optional)" value={debitForm.reference} onChange={(e) => setDebitForm((current) => ({ ...current, reference: e.target.value }))} />
            <input className="form-input" placeholder="Narration" value={debitForm.narration} onChange={(e) => setDebitForm((current) => ({ ...current, narration: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div style={actionRowStyle}>
            <button className="button button--primary" disabled={!mandate.id || loading.debit}>
              {loading.debit ? 'Debiting...' : 'Debit Account'}
            </button>
          </div>
          <div className="info-grid mt-3">
            <div className="info-group">
              <div className="info-label">Last debit ref</div>
              <div className="info-value font-mono">{lastDebit.reference || '—'}</div>
            </div>
            <div className="info-group">
              <div className="info-label">Last debit status</div>
              <div className="info-value">{lastDebit.status || '—'}</div>
            </div>
            <div className="info-group">
              <div className="info-label">Last debit amount</div>
              <div className="info-value">{lastDebit.amountNaira != null ? formatCurrency(lastDebit.amountNaira) : '—'}</div>
            </div>
            <div className="info-group">
              <div className="info-label">Processed at</div>
              <div className="info-value">{formatDateTime(lastDebit.processedAt)}</div>
            </div>
          </div>
        </form>
      </div>

      {lastActionResult?.data ? (
        <details className="mt-4">
          <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#334155' }}>
            Latest API payload
          </summary>
          <pre style={{ marginTop: 12, padding: 12, background: '#0f172a', color: '#e2e8f0', borderRadius: 8, overflowX: 'auto', fontSize: 12 }}>
            {JSON.stringify(lastActionResult.data, null, 2)}
          </pre>
        </details>
      ) : null}

      {mandate.status === 'awaiting_authorization' && !mandate.readyToDebit ? (
        <div className="alert-box alert-warning mt-4" style={{ display: 'flex', alignItems: 'flex-start', gap: 8 }}>
          <AlertCircle size={16} />
          <span>
            Mono will only allow debit after the mandate is approved and the ready-to-debit webhook has been received.
          </span>
        </div>
      ) : null}
    </div>
  )
}

function splitName(value) {
  const parts = String(value || '').trim().split(/\s+/).filter(Boolean)
  return {
    firstName: parts[0] || '',
    lastName: parts.slice(1).join(' ') || parts[0] || '',
  }
}

const sectionStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 12,
  padding: 16,
  background: '#f8fafc',
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(180px, 1fr))',
  gap: 10,
  marginTop: 12,
}

const sectionHeadingStyle = {
  margin: 0,
  fontSize: '0.95rem',
  fontWeight: 700,
}

const actionRowStyle = {
  display: 'flex',
  gap: 8,
  flexWrap: 'wrap',
  marginTop: 12,
}
