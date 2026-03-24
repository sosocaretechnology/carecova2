import { useEffect, useMemo, useState } from 'react'
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
  return parsed.toLocaleString('en-GB')
}

function formatDate(value) {
  if (!value) return '—'
  const parsed = new Date(value)
  if (Number.isNaN(parsed.getTime())) return '—'
  return parsed.toLocaleDateString('en-GB')
}

function formatCurrency(value) {
  const amount = Number(value || 0)
  return `₦${amount.toLocaleString()}`
}

function toKoboString(value) {
  const amount = Number(value || 0)
  return amount > 0 ? String(Math.round(amount * 100)) : ''
}

function formatKoboWithNaira(kobo) {
  const amountKobo = Number(kobo || 0)
  const amountNaira = amountKobo / 100
  return `${amountKobo.toLocaleString()} kobo (${formatCurrency(amountNaira)})`
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
  const fallbackAmount = loan?.repaymentSchedule?.find((item) => !item.paid)?.amount || loan?.monthlyInstallment || loan?.outstandingBalance || loan?.approvedAmount || 0
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
  const session = adminService.getSession()
  const isSalesUser = ['sales', 'sales_agent'].includes(session?.role)
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
  const [customerErrors, setCustomerErrors] = useState({})
  const [mandateErrors, setMandateErrors] = useState({})
  const [debitErrors, setDebitErrors] = useState({})

  useEffect(() => {
    setCustomerForm(resolveDefaultCustomerForm(loan))
    setMandateForm(resolveDefaultMandateForm(loan))
    setDebitForm(resolveDefaultDebitForm(loan))
    setCustomerErrors({})
    setMandateErrors({})
    setDebitErrors({})
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
  const dueAmountNaira = Number(nextInstallment?.amount || loan?.monthlyInstallment || 0)
  const dueAmountKobo = toKoboString(dueAmountNaira)
  const unifiedAmountKobo = useMemo(
    () => mandateForm.amount || debitForm.balanceAmount || debitForm.debitAmount || dueAmountKobo,
    [mandateForm.amount, debitForm.balanceAmount, debitForm.debitAmount, dueAmountKobo],
  )

  const step1Done = Boolean(customer.id)
  const step2Done = Boolean(mandate.id)
  const step3Done = Boolean(balanceInquiry.checkedAt)
  const step4Done = Boolean(lastDebit.reference) && String(lastDebit.status || '').toLowerCase().includes('success')

  const createCustomerDisabledReason = !isEligible ? 'Loan must be approved or active first' : ''
  const createMandateDisabledReason = !isEligible ? 'Loan must be approved or active first' : !customer.id ? 'Complete Step 1 first (Create customer)' : ''
  const checkBalanceDisabledReason = !mandate.id ? 'Complete Step 2 first (Create mandate)' : ''
  const debitDisabledReason = !mandate.id ? 'Complete Step 2 first (Create mandate)' : ''

  const setUnifiedAmount = (value) => {
    const sanitized = String(value || '').replace(/\D/g, '')
    setMandateForm((current) => ({ ...current, amount: sanitized }))
    setDebitForm((current) => ({
      ...current,
      balanceAmount: sanitized,
      debitAmount: sanitized,
    }))
  }

  useEffect(() => {
    if (!dueAmountKobo) return
    if (!mandateForm.amount && !debitForm.balanceAmount && !debitForm.debitAmount) {
      setUnifiedAmount(dueAmountKobo)
    }
  }, [dueAmountKobo, mandateForm.amount, debitForm.balanceAmount, debitForm.debitAmount])

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
    const errors = {}
    if (!/^\d{11}$/.test(String(customerForm.identityNumber || '').trim())) errors.identityNumber = 'BVN must be 11 digits'
    if (!customerForm.firstName.trim()) errors.firstName = 'First name is required'
    if (!customerForm.lastName.trim()) errors.lastName = 'Last name is required'
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(customerForm.email.trim())) errors.email = 'Enter a valid email'
    if (!/^(0\d{10}|\+234\d{10})$/.test(customerForm.phone.trim())) errors.phone = 'Use Nigerian format: 0XXXXXXXXXX or +234XXXXXXXXXX'
    const address = customerForm.address.trim()
    if (!address || address.length < 8) errors.address = 'Enter a complete Nigerian address'
    if (/united states|usa/i.test(address)) errors.address = 'Use a Nigerian address'
    setCustomerErrors(errors)
    if (Object.keys(errors).length > 0) return

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
    const errors = {}
    const mandateAmount = Number(mandateForm.amount)
    if (!Number.isFinite(mandateAmount) || mandateAmount <= 0) errors.amount = 'Enter a valid amount in kobo'
    if (!mandateForm.startDate) errors.startDate = 'Start date is required'
    if (!mandateForm.endDate) errors.endDate = 'End date is required'
    setMandateErrors(errors)
    if (Object.keys(errors).length > 0) return

    await runAction('mandate', () =>
      adminService.initiateMonoDirectDebitMandateForLoan(loan.id, {
        amount: mandateAmount,
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
    const errors = {}
    if (!Number.isFinite(Number(debitForm.debitAmount)) || Number(debitForm.debitAmount) <= 0) {
      errors.debitAmount = 'Enter a valid debit amount in kobo'
    }
    if (!debitForm.narration.trim()) errors.narration = 'Narration is required'
    setDebitErrors(errors)
    if (Object.keys(errors).length > 0) return

    await runAction('debit', () =>
      adminService.debitMonoDirectDebitMandateForLoan(loan.id, {
        amount: Number(debitForm.debitAmount),
        narration: debitForm.narration.trim(),
        feeBearer: debitForm.feeBearer,
        reference: debitForm.reference.trim() || undefined,
      }),
    )
  }

  if (isSalesUser) {
    return (
      <div className="detail-card" style={{ borderLeft: '4px solid #f59e0b', marginTop: 16 }}>
        <h2 style={{ marginBottom: 6 }}>Mono Direct Debit</h2>
        <div className="alert-box alert-warning">
          Mono Direct Debit actions are restricted to credit/admin roles. Sales users do not have access.
        </div>
      </div>
    )
  }

  return (
    <div className="detail-card" style={{ borderLeft: `4px solid ${statusMeta.color}`, marginTop: 16 }}>
      <div className="flex-between" style={{ gap: 12, alignItems: 'center', marginBottom: 8 }}>
        <div>
          <h2 style={{ marginBottom: 2 }}>Mono Direct Debit</h2>
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

      <div className="p-3 rounded-lg border border-gray-200 bg-gray-50 mt-3">
        <div className="text-xs text-muted">Current due installment</div>
        <div className="font-bold text-base">
          {formatCurrency(dueAmountNaira)} ({formatKoboWithNaira(unifiedAmountKobo)})
        </div>
        <div className="text-xs text-muted">
          Due date: {nextInstallment?.dueDate ? formatDate(nextInstallment.dueDate) : '—'}
        </div>
      </div>

      <div className="info-grid mt-3" style={{ rowGap: 8 }}>
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
            {nextInstallment ? `${formatCurrency(nextInstallment.amount)} due ${formatDate(nextInstallment.dueDate)}` : '—'}
          </div>
        </div>
      </div>

      <div
        className="mt-4 direct-debit-steps-grid"
        style={{
          display: 'grid',
          gap: 12,
          gridTemplateColumns: 'repeat(auto-fit, minmax(280px, 1fr))',
          alignItems: 'stretch',
        }}
      >
        <form onSubmit={handleCreateCustomer} style={sectionStyle} className="direct-debit-step-card">
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>1. Create customer {step1Done ? '✅' : '⏳'}</h3>
              <div className="text-xs text-muted">BVN is required by Mono for direct debit customer creation.</div>
            </div>
            <Landmark size={18} color="#334155" />
          </div>
          <div style={formGridStyle}>
            <input id={`bvn-${loan.id}`} aria-label="BVN" className="form-input direct-debit-input" placeholder="BVN (11 digits)" value={customerForm.identityNumber} onChange={(e) => setCustomerForm((current) => ({ ...current, identityNumber: e.target.value }))} />
            {customerErrors.identityNumber ? <div className="text-xs text-error">{customerErrors.identityNumber}</div> : null}
            <input id={`first-name-${loan.id}`} aria-label="First name" className="form-input direct-debit-input" placeholder="First name" value={customerForm.firstName} onChange={(e) => setCustomerForm((current) => ({ ...current, firstName: e.target.value }))} />
            <input id={`last-name-${loan.id}`} aria-label="Last name" className="form-input direct-debit-input" placeholder="Last name" value={customerForm.lastName} onChange={(e) => setCustomerForm((current) => ({ ...current, lastName: e.target.value }))} />
            <input id={`email-${loan.id}`} aria-label="Email" className="form-input direct-debit-input" placeholder="Email" value={customerForm.email} onChange={(e) => setCustomerForm((current) => ({ ...current, email: e.target.value }))} />
            {customerErrors.email ? <div className="text-xs text-error">{customerErrors.email}</div> : null}
            <input id={`phone-${loan.id}`} aria-label="Phone" className="form-input direct-debit-input" placeholder="08012345678" value={customerForm.phone} onChange={(e) => setCustomerForm((current) => ({ ...current, phone: e.target.value }))} />
            {customerErrors.phone ? <div className="text-xs text-error">{customerErrors.phone}</div> : null}
            <input id={`address-${loan.id}`} aria-label="Address (Nigeria)" className="form-input direct-debit-input" placeholder="12 Admiralty Way, Lekki, Lagos" value={customerForm.address} onChange={(e) => setCustomerForm((current) => ({ ...current, address: e.target.value }))} />
            {customerErrors.address ? <div className="text-xs text-error">{customerErrors.address}</div> : null}
          </div>
          <div style={actionRowStyle}>
            <button className="button button--primary" disabled={!isEligible || loading.customer} title={createCustomerDisabledReason}>
              {loading.customer ? 'Creating...' : customer.id ? 'Refresh Customer' : 'Create Customer'}
            </button>
            {createCustomerDisabledReason ? <span className="text-xs text-muted">{createCustomerDisabledReason}</span> : null}
          </div>
        </form>

        <form onSubmit={handleCreateMandate} style={sectionStyle} className="direct-debit-step-card">
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>2. Initiate mandate {step2Done ? '✅' : step1Done ? '⏳' : '⚪'}</h3>
              <div className="text-xs text-muted">Use kobo. E-mandate includes the fixed N50 NIBSS fee.</div>
            </div>
            <Wallet size={18} color="#334155" />
          </div>
          <div style={formGridStyle}>
            <input id={`mandate-amount-${loan.id}`} aria-label="Mandate amount in kobo" className="form-input direct-debit-input" placeholder="Amount (kobo)" value={mandateForm.amount} onChange={(e) => setUnifiedAmount(e.target.value)} />
            <div className="text-xs text-muted">{formatKoboWithNaira(mandateForm.amount)}</div>
            {mandateErrors.amount ? <div className="text-xs text-error">{mandateErrors.amount}</div> : null}
            <select className="form-input direct-debit-input" value={mandateForm.mandateType} onChange={(e) => setMandateForm((current) => ({ ...current, mandateType: e.target.value }))}>
              <option value="emandate">E-mandate</option>
              <option value="signed">Signed</option>
              <option value="gsm">GSM</option>
              <option value="sweep">Sweep</option>
            </select>
            <input className="form-input direct-debit-input" type="date" value={mandateForm.startDate} onChange={(e) => setMandateForm((current) => ({ ...current, startDate: e.target.value }))} />
            <input className="form-input direct-debit-input" type="date" value={mandateForm.endDate} onChange={(e) => setMandateForm((current) => ({ ...current, endDate: e.target.value }))} />
            <input className="form-input direct-debit-input" placeholder="Description" value={mandateForm.description} onChange={(e) => setMandateForm((current) => ({ ...current, description: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div style={actionRowStyle}>
            <button className="button button--primary" disabled={!isEligible || !customer.id || loading.mandate} title={createMandateDisabledReason}>
              {loading.mandate ? 'Initiating...' : mandate.id ? 'Re-initiate Mandate' : 'Create Mandate'}
            </button>
            {createMandateDisabledReason ? <span className="text-xs text-muted">{createMandateDisabledReason}</span> : null}
            {mandate.monoUrl ? (
              <a href={mandate.monoUrl} target="_blank" rel="noreferrer" className="button button--secondary" style={{ display: 'inline-flex', alignItems: 'center', gap: 6 }}>
                Open Mono Link <ArrowUpRight size={14} />
              </a>
            ) : null}
          </div>
        </form>

        <div style={sectionStyle} className="direct-debit-step-card">
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>3. Confirm balance {step3Done ? '✅' : step2Done ? '⏳' : '⚪'}</h3>
              <div className="text-xs text-muted">Optional but recommended before a variable debit.</div>
            </div>
            <RefreshCw size={18} color="#334155" />
          </div>
          <div style={{ ...formGridStyle, gridTemplateColumns: '2fr 1fr 1fr' }}>
            <input id={`balance-amount-${loan.id}`} aria-label="Balance check amount in kobo" className="form-input direct-debit-input" placeholder="Check Amount (kobo)" value={debitForm.balanceAmount} onChange={(e) => setUnifiedAmount(e.target.value)} />
            <div className="text-xs text-muted">{formatKoboWithNaira(debitForm.balanceAmount)}</div>
            <button className="button button--secondary" disabled={!mandate.id || loading.balance} onClick={() => handleBalanceInquiry(true)} title={checkBalanceDisabledReason}>
              {loading.balance ? 'Checking...' : 'Check Amount'}
            </button>
            <button className="button button--secondary" disabled={!mandate.id || loading.balance} onClick={() => handleBalanceInquiry(false)} title={checkBalanceDisabledReason}>
              Current Balance
            </button>
          </div>
          {checkBalanceDisabledReason ? <span className="text-xs text-muted">{checkBalanceDisabledReason}</span> : null}
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

        <form onSubmit={handleDebit} style={sectionStyle} className="direct-debit-step-card">
          <div className="flex-between" style={{ alignItems: 'center' }}>
            <div>
              <h3 style={sectionHeadingStyle}>4. Debit account {step4Done ? '✅' : step2Done ? '⏳' : '⚪'}</h3>
              <div className="text-xs text-muted">Use kobo and keep a small bank buffer where needed.</div>
            </div>
            <CheckCircle2 size={18} color="#334155" />
          </div>
          <div style={formGridStyle}>
            <input id={`debit-amount-${loan.id}`} aria-label="Debit amount in kobo" className="form-input direct-debit-input" placeholder="Amount (kobo)" value={debitForm.debitAmount} onChange={(e) => setUnifiedAmount(e.target.value)} />
            <div className="text-xs text-muted">{formatKoboWithNaira(debitForm.debitAmount)}</div>
            {debitErrors.debitAmount ? <div className="text-xs text-error">{debitErrors.debitAmount}</div> : null}
            <select className="form-input direct-debit-input" value={debitForm.feeBearer} onChange={(e) => setDebitForm((current) => ({ ...current, feeBearer: e.target.value }))}>
              <option value="business">Business pays fee</option>
              <option value="customer">Customer pays fee</option>
            </select>
            <input className="form-input direct-debit-input" placeholder="Reference (optional)" value={debitForm.reference} onChange={(e) => setDebitForm((current) => ({ ...current, reference: e.target.value }))} />
            <input className="form-input direct-debit-input" placeholder="Narration" value={debitForm.narration} onChange={(e) => setDebitForm((current) => ({ ...current, narration: e.target.value }))} style={{ gridColumn: '1 / -1' }} />
          </div>
          <div style={actionRowStyle}>
            <button className="button button--primary" disabled={!mandate.id || loading.debit} title={debitDisabledReason}>
              {loading.debit ? 'Debiting...' : 'Debit Account'}
            </button>
            {debitDisabledReason ? <span className="text-xs text-muted">{debitDisabledReason}</span> : null}
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
  padding: 12,
  background: '#f8fafc',
}

const formGridStyle = {
  display: 'grid',
  gridTemplateColumns: 'repeat(auto-fit, minmax(220px, 1fr))',
  gap: 8,
  marginTop: 8,
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
  marginTop: 8,
}
