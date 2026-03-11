import { useCallback, useEffect, useMemo, useState } from 'react'
import { adminService } from '../../services/adminService'
import logoUrl from '../../assets/logo.png'

const fmtCurrency = (value, currency = 'NGN') => {
  const amount = Number(value || 0)
  return new Intl.NumberFormat('en-NG', {
    style: 'currency',
    currency,
    maximumFractionDigits: 2,
  }).format(amount)
}

const fmtDateTime = (value) => {
  if (!value) return '—'
  const date = new Date(value)
  if (Number.isNaN(date.getTime())) return '—'
  return date.toLocaleString()
}

const escapeHtml = (text = '') =>
  String(text)
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;')
    .replaceAll("'", '&#039;')

const ESSENTIAL_ORG_PURPOSES = [
  {
    purpose: 'org_loan_repayment',
    title: 'Loan Repayment',
    helper: 'Collect loan repayment inflows',
  },
  {
    purpose: 'org_referral_commission',
    title: 'Commission',
    helper: 'Referral and commission earnings',
  },
  {
    purpose: 'org_loan_deposit',
    title: 'Loan Deposit',
    helper: 'Loan disbursement and deposit pool',
  },
]

export default function OrganizationWallets() {
  const [wallets, setWallets] = useState([])
  const [essentialWallets, setEssentialWallets] = useState([])
  const [essentialOwnerId, setEssentialOwnerId] = useState('')
  const [transactions, setTransactions] = useState([])
  const [overview, setOverview] = useState(null)
  const [totalTransactions, setTotalTransactions] = useState(0)

  const [loading, setLoading] = useState(true)
  const [loadingTransactions, setLoadingTransactions] = useState(false)
  const [actionLoading, setActionLoading] = useState(false)
  const [error, setError] = useState('')

  const [ownerTypeFilter, setOwnerTypeFilter] = useState('organization')
  const [purposeFilter, setPurposeFilter] = useState('')
  const [statusFilter, setStatusFilter] = useState('')
  const [ownerIdFilter, setOwnerIdFilter] = useState('')
  const [currencyFilter, setCurrencyFilter] = useState('NGN')
  const [txTypeFilter, setTxTypeFilter] = useState('')
  const [dateFrom, setDateFrom] = useState('')
  const [dateTo, setDateTo] = useState('')

  const [selectedWalletId, setSelectedWalletId] = useState('')

  const [actionType, setActionType] = useState('fund')
  const [actionPurpose, setActionPurpose] = useState('org_loan_repayment')
  const [actionAmount, setActionAmount] = useState('')
  const [actionReference, setActionReference] = useState('')
  const [actionDescription, setActionDescription] = useState('')

  const selectedWallet = useMemo(
    () => wallets.find((wallet) => wallet.id === selectedWalletId) || null,
    [wallets, selectedWalletId],
  )

  const essentialWalletLookup = useMemo(() => {
    const entries = essentialWallets.map((wallet) => [wallet.purpose, wallet])
    return new Map(entries)
  }, [essentialWallets])

  const walletFilters = useMemo(
    () => ({
      ownerType: ownerTypeFilter || undefined,
      purpose: purposeFilter || undefined,
      status: statusFilter || undefined,
      ownerId: ownerIdFilter || undefined,
      currency: currencyFilter || undefined,
    }),
    [ownerTypeFilter, purposeFilter, statusFilter, ownerIdFilter, currencyFilter],
  )

  const transactionFilters = useMemo(
    () => ({
      walletId: selectedWalletId || undefined,
      ownerType: ownerTypeFilter || undefined,
      ownerId: ownerIdFilter || undefined,
      purpose: purposeFilter || undefined,
      transactionType: txTypeFilter || undefined,
      currency: currencyFilter || undefined,
      dateFrom: dateFrom || undefined,
      dateTo: dateTo || undefined,
      page: 1,
      limit: 100,
    }),
    [
      selectedWalletId,
      ownerTypeFilter,
      ownerIdFilter,
      purposeFilter,
      txTypeFilter,
      currencyFilter,
      dateFrom,
      dateTo,
    ],
  )

  const loadWalletsAndOverview = useCallback(async () => {
    setLoading(true)
    setError('')
    try {
      const [walletData, overviewData, essentialData] = await Promise.all([
        adminService.getWallets(walletFilters),
        adminService.getWalletOverview({
          ownerType: ownerTypeFilter || undefined,
          currency: currencyFilter || undefined,
          dateFrom: dateFrom || undefined,
          dateTo: dateTo || undefined,
        }),
        adminService.getOrganizationEssentialWallets({
          ownerId: ownerIdFilter || undefined,
          currency: currencyFilter || undefined,
        }),
      ])

      setWallets(walletData || [])
      setOverview(overviewData)
      setEssentialWallets(essentialData?.wallets || [])
      setEssentialOwnerId(essentialData?.ownerId || '')

      if (!selectedWalletId && walletData?.length > 0) {
        setSelectedWalletId(walletData[0].id)
      }

      if (
        selectedWalletId &&
        walletData?.length > 0 &&
        !walletData.some((wallet) => wallet.id === selectedWalletId)
      ) {
        setSelectedWalletId(walletData[0].id)
      }

      if (!walletData?.length) {
        setSelectedWalletId('')
      }
    } catch (loadError) {
      console.error('Error loading wallets:', loadError)
      setError(loadError.message || 'Unable to load wallets data')
    } finally {
      setLoading(false)
    }
  }, [
    walletFilters,
    ownerTypeFilter,
    currencyFilter,
    dateFrom,
    dateTo,
    selectedWalletId,
  ])

  const loadTransactions = useCallback(async () => {
    setLoadingTransactions(true)
    try {
      const txData = await adminService.getWalletTransactions(transactionFilters)
      setTransactions(txData?.items || [])
      setTotalTransactions(txData?.total || 0)
    } catch (txError) {
      console.error('Error loading transactions:', txError)
      setTransactions([])
      setTotalTransactions(0)
    } finally {
      setLoadingTransactions(false)
    }
  }, [transactionFilters])

  useEffect(() => {
    loadWalletsAndOverview()
  }, [loadWalletsAndOverview])

  useEffect(() => {
    loadTransactions()
  }, [loadTransactions])

  const handleAdjustWallet = async (e) => {
    e.preventDefault()
    const isOrganizationFund =
      actionType === 'fund' && (ownerTypeFilter || 'organization') === 'organization'

    if (!isOrganizationFund && !selectedWalletId) {
      setError('Select a wallet first')
      return
    }

    const amount = Number(actionAmount)
    if (!Number.isFinite(amount) || amount <= 0) {
      setError('Enter a valid amount greater than 0')
      return
    }

    setActionLoading(true)
    setError('')
    try {
      const payload = {
        amount,
        reference: actionReference.trim() || undefined,
        description: actionDescription.trim() || undefined,
      }

      if (isOrganizationFund) {
        const result = await adminService.fundOrganizationWallet({
          ...payload,
          purpose: actionPurpose,
          ownerId: ownerIdFilter.trim() || undefined,
          currency: currencyFilter || undefined,
        })
        if (result?.wallet?.id) {
          setSelectedWalletId(result.wallet.id)
        }
      } else if (actionType === 'fund') {
        await adminService.fundWallet(selectedWalletId, payload)
      } else {
        await adminService.debitWallet(selectedWalletId, payload)
      }

      setActionAmount('')
      setActionReference('')
      setActionDescription('')

      await Promise.all([loadWalletsAndOverview(), loadTransactions()])
    } catch (adjustError) {
      console.error('Wallet adjustment failed:', adjustError)
      setError(adjustError.message || 'Wallet adjustment failed')
    } finally {
      setActionLoading(false)
    }
  }

  const handleExportStatement = async () => {
    if (!selectedWalletId) {
      setError('Select a wallet before exporting statement')
      return
    }

    try {
      const statement = await adminService.getWalletStatement(selectedWalletId, {
        dateFrom: dateFrom || undefined,
        dateTo: dateTo || undefined,
      })

      const rowsHtml = (statement.transactions || [])
        .map(
          (tx) => `
          <tr>
            <td>${escapeHtml(new Date(tx.createdAt).toLocaleDateString())}</td>
            <td>${escapeHtml(tx.reference || '—')}</td>
            <td>${escapeHtml(tx.transactionType)}</td>
            <td style="text-align:right;">${escapeHtml(fmtCurrency(tx.amount, statement.wallet.currency))}</td>
            <td style="text-align:right;">${escapeHtml(fmtCurrency(tx.balanceAfter, statement.wallet.currency))}</td>
            <td>${escapeHtml(tx.description || '—')}</td>
          </tr>
        `,
        )
        .join('')

      const printWindow = window.open('', '_blank', 'width=1024,height=768')
      if (!printWindow) {
        setError('Popup blocked. Please allow popups to export statement.')
        return
      }

      printWindow.document.write(`
        <html>
          <head>
            <title>CareCova Wallet Statement</title>
            <style>
              body { font-family: Arial, sans-serif; color: #1f2937; margin: 24px; }
              .header { display: flex; align-items: center; justify-content: space-between; margin-bottom: 16px; }
              .logo { height: 40px; }
              .title { font-size: 20px; font-weight: 700; margin: 0; }
              .sub { margin: 3px 0; color: #4b5563; }
              .summary { margin: 16px 0; padding: 12px; border: 1px solid #e5e7eb; border-radius: 8px; }
              .summary-grid { display: grid; grid-template-columns: repeat(3, 1fr); gap: 8px; }
              .summary-item { font-size: 12px; color: #4b5563; }
              .summary-item strong { display: block; color: #111827; font-size: 14px; margin-top: 2px; }
              table { width: 100%; border-collapse: collapse; margin-top: 12px; }
              th, td { border: 1px solid #e5e7eb; padding: 8px; font-size: 12px; }
              th { background: #f3f4f6; text-align: left; }
              .foot { margin-top: 16px; font-size: 11px; color: #6b7280; }
            </style>
          </head>
          <body>
            <div class="header">
              <div>
                <h1 class="title">CareCova Wallet Statement</h1>
                <p class="sub">Wallet: ${escapeHtml(statement.wallet.walletName)} (${escapeHtml(statement.wallet.ownerType)})</p>
                <p class="sub">Owner: ${escapeHtml(statement.wallet.ownerId)} | Currency: ${escapeHtml(statement.wallet.currency)}</p>
                <p class="sub">Period: ${escapeHtml(dateFrom || 'Beginning')} - ${escapeHtml(dateTo || 'Now')}</p>
              </div>
              <img src="${logoUrl}" class="logo" alt="CareCova Logo" />
            </div>

            <div class="summary">
              <div class="summary-grid">
                <div class="summary-item">Opening Balance<strong>${escapeHtml(fmtCurrency(statement.openingBalance, statement.wallet.currency))}</strong></div>
                <div class="summary-item">Closing Balance<strong>${escapeHtml(fmtCurrency(statement.closingBalance, statement.wallet.currency))}</strong></div>
                <div class="summary-item">Net Movement<strong>${escapeHtml(fmtCurrency(statement.netMovement, statement.wallet.currency))}</strong></div>
                <div class="summary-item">Total Credits<strong>${escapeHtml(fmtCurrency(statement.totalCredits, statement.wallet.currency))}</strong></div>
                <div class="summary-item">Total Debits<strong>${escapeHtml(fmtCurrency(statement.totalDebits, statement.wallet.currency))}</strong></div>
                <div class="summary-item">Transactions<strong>${escapeHtml(String((statement.transactions || []).length))}</strong></div>
              </div>
            </div>

            <table>
              <thead>
                <tr>
                  <th>Date</th>
                  <th>Reference</th>
                  <th>Type</th>
                  <th>Amount</th>
                  <th>Balance After</th>
                  <th>Description</th>
                </tr>
              </thead>
              <tbody>
                ${rowsHtml || '<tr><td colspan="6" style="text-align:center;">No transactions for selected range</td></tr>'}
              </tbody>
            </table>
            <p class="foot">Generated on ${new Date().toLocaleString()} by CareCova Admin.</p>
          </body>
        </html>
      `)

      printWindow.document.close()
      printWindow.focus()
      setTimeout(() => {
        printWindow.print()
      }, 300)
    } catch (statementError) {
      console.error('Statement export failed:', statementError)
      setError(statementError.message || 'Failed to export statement')
    }
  }

  if (loading && !overview) {
    return <div className="admin-loading">Loading wallets...</div>
  }

  return (
    <div className="admin-wallets-page">
      <div className="admin-page-header">
        <h1>Organization Wallets</h1>
        <p>Manage wallet balances, credits/debits, transactions, and statements.</p>
      </div>

      {error && <div className="admin-error-banner">{error}</div>}

      <section className="essential-wallets-section">
        <div className="wallets-card-header">
          <h2>Essential Organization Wallets</h2>
          <span>{essentialOwnerId || ownerIdFilter || 'carecova-org'}</span>
        </div>
        <div className="essential-wallets-grid">
          {ESSENTIAL_ORG_PURPOSES.map((item) => {
            const wallet = essentialWalletLookup.get(item.purpose)
            const balance = wallet?.balance || 0
            return (
              <article key={item.purpose} className="essential-wallet-card">
                <div className="essential-wallet-title">{item.title}</div>
                <div className="essential-wallet-balance">
                  {fmtCurrency(balance, wallet?.currency || currencyFilter || 'NGN')}
                </div>
                <div className="essential-wallet-helper">{item.helper}</div>
                <button
                  type="button"
                  className="table-action-btn"
                  onClick={() => {
                    if (wallet?.id) setSelectedWalletId(wallet.id)
                    setActionType('fund')
                    setActionPurpose(item.purpose)
                  }}
                >
                  {wallet?.id ? 'View Wallet' : 'Fund & Auto Create'}
                </button>
              </article>
            )
          })}
        </div>
      </section>

      <section className="admin-kpi-grid">
        <div className="admin-kpi-card primary">
          <div className="kpi-title">Total Wallet Balance</div>
          <div className="kpi-value">{fmtCurrency(overview?.totalBalance, currencyFilter || 'NGN')}</div>
        </div>
        <div className="admin-kpi-card success">
          <div className="kpi-title">Organization Balance</div>
          <div className="kpi-value">{fmtCurrency(overview?.organizationBalance, currencyFilter || 'NGN')}</div>
        </div>
        <div className="admin-kpi-card">
          <div className="kpi-title">Wallets</div>
          <div className="kpi-value">{overview?.totalWallets || 0}</div>
          <div className="kpi-subtext">{overview?.activeWallets || 0} active</div>
        </div>
        <div className="admin-kpi-card warning">
          <div className="kpi-title">Inflow</div>
          <div className="kpi-value">{fmtCurrency(overview?.inflow, currencyFilter || 'NGN')}</div>
        </div>
        <div className="admin-kpi-card danger">
          <div className="kpi-title">Outflow</div>
          <div className="kpi-value">{fmtCurrency(overview?.outflow, currencyFilter || 'NGN')}</div>
        </div>
        <div className="admin-kpi-card info">
          <div className="kpi-title">Net Flow</div>
          <div className="kpi-value">{fmtCurrency(overview?.netFlow, currencyFilter || 'NGN')}</div>
          <div className="kpi-subtext">{overview?.transactionCount || 0} transactions</div>
        </div>
      </section>

      <section className="wallets-filter-panel">
        <div className="wallets-filter-grid">
          <select value={ownerTypeFilter} onChange={(e) => setOwnerTypeFilter(e.target.value)}>
            <option value="">All owners</option>
            <option value="organization">Organization</option>
            <option value="user">User</option>
            <option value="sales_team">Sales Team</option>
          </select>

          <select value={purposeFilter} onChange={(e) => setPurposeFilter(e.target.value)}>
            <option value="">All purposes</option>
            <option value="org_referral_commission">Commission</option>
            <option value="org_loan_repayment">Org Loan Repayment</option>
            <option value="org_loan_deposit">Org Loan Deposit</option>
            <option value="org_medical_payment">Org Medical Payment</option>
            <option value="sales_commission">Sales Commission</option>
            <option value="user_main">User Main</option>
            <option value="general">General</option>
          </select>

          <select value={statusFilter} onChange={(e) => setStatusFilter(e.target.value)}>
            <option value="">All statuses</option>
            <option value="active">Active</option>
            <option value="inactive">Inactive</option>
            <option value="frozen">Frozen</option>
          </select>

          <input
            type="text"
            placeholder="Owner ID"
            value={ownerIdFilter}
            onChange={(e) => setOwnerIdFilter(e.target.value)}
          />

          <input
            type="text"
            placeholder="Currency (NGN)"
            value={currencyFilter}
            onChange={(e) => setCurrencyFilter(e.target.value.toUpperCase())}
          />

          <select value={txTypeFilter} onChange={(e) => setTxTypeFilter(e.target.value)}>
            <option value="">All tx types</option>
            <option value="credit">Credit</option>
            <option value="debit">Debit</option>
          </select>

          <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} />
          <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} />

          <button type="button" className="admin-btn" onClick={loadWalletsAndOverview}>
            Apply Filters
          </button>

          <button type="button" className="admin-btn secondary" onClick={handleExportStatement}>
            Export Statement PDF
          </button>
        </div>
      </section>

      <div className="wallets-layout-grid">
        <section className="wallets-table-card">
          <div className="wallets-card-header">
            <h2>All Wallets</h2>
            <span>{wallets.length} results</span>
          </div>
          <div className="wallets-table-scroll">
            <table className="wallets-table">
              <thead>
                <tr>
                  <th>Wallet</th>
                  <th>Owner Type</th>
                  <th>Owner ID</th>
                  <th>Purpose</th>
                  <th>Status</th>
                  <th>Balance</th>
                  <th></th>
                </tr>
              </thead>
              <tbody>
                {wallets.length === 0 ? (
                  <tr>
                    <td colSpan="7" className="wallets-empty">No wallets found</td>
                  </tr>
                ) : (
                  wallets.map((wallet) => (
                    <tr key={wallet.id} className={wallet.id === selectedWalletId ? 'selected-row' : ''}>
                      <td>{wallet.walletName}</td>
                      <td>{wallet.ownerType}</td>
                      <td>{wallet.ownerId}</td>
                      <td>{wallet.purpose}</td>
                      <td>{wallet.status}</td>
                      <td>{fmtCurrency(wallet.balance, wallet.currency)}</td>
                      <td>
                        <button
                          type="button"
                          className="table-action-btn"
                          onClick={() => setSelectedWalletId(wallet.id)}
                        >
                          View Transactions
                        </button>
                      </td>
                    </tr>
                  ))
                )}
              </tbody>
            </table>
          </div>
        </section>

        <section className="wallets-action-card">
          <div className="wallets-card-header">
            <h2>Fund / Minus</h2>
          </div>
          <p className="wallets-action-target">
            {actionType === 'fund' && (ownerTypeFilter || 'organization') === 'organization'
              ? `Funding purpose: ${actionPurpose} (${essentialOwnerId || ownerIdFilter || 'carecova-org'})`
              : selectedWallet
                ? `Selected: ${selectedWallet.walletName} (${selectedWallet.ownerId})`
                : 'Select a wallet to perform transactions'}
          </p>

          <form className="wallet-adjust-form" onSubmit={handleAdjustWallet}>
            <select value={actionType} onChange={(e) => setActionType(e.target.value)}>
              <option value="fund">Fund Wallet</option>
              <option value="debit">Minus / Debit Wallet</option>
            </select>

            {actionType === 'fund' && (ownerTypeFilter || 'organization') === 'organization' && (
              <select value={actionPurpose} onChange={(e) => setActionPurpose(e.target.value)}>
                {ESSENTIAL_ORG_PURPOSES.map((item) => (
                  <option key={item.purpose} value={item.purpose}>
                    {item.title}
                  </option>
                ))}
                <option value="org_medical_payment">Org Medical Payment</option>
                <option value="general">General</option>
              </select>
            )}

            <input
              type="number"
              min="0"
              step="0.01"
              placeholder="Amount"
              value={actionAmount}
              onChange={(e) => setActionAmount(e.target.value)}
              required
            />

            <input
              type="text"
              placeholder="Reference"
              value={actionReference}
              onChange={(e) => setActionReference(e.target.value)}
            />

            <textarea
              rows="3"
              placeholder="Description"
              value={actionDescription}
              onChange={(e) => setActionDescription(e.target.value)}
            />

            <button
              className="admin-btn"
              type="submit"
              disabled={
                actionLoading ||
                (actionType === 'debit' && !selectedWalletId)
              }
            >
              {actionLoading ? 'Processing...' : actionType === 'fund' ? 'Fund Wallet' : 'Debit Wallet'}
            </button>
          </form>
        </section>
      </div>

      <section className="wallets-table-card mt-3">
        <div className="wallets-card-header">
          <h2>Wallet Transactions</h2>
          <span>{loadingTransactions ? 'Loading...' : `${totalTransactions} total`}</span>
        </div>

        <div className="wallets-table-scroll">
          <table className="wallets-table">
            <thead>
              <tr>
                <th>Date</th>
                <th>Wallet</th>
                <th>Type</th>
                <th>Reference</th>
                <th>Amount</th>
                <th>Balance After</th>
                <th>Description</th>
              </tr>
            </thead>
            <tbody>
              {transactions.length === 0 ? (
                <tr>
                  <td colSpan="7" className="wallets-empty">No transactions for selected filters</td>
                </tr>
              ) : (
                transactions.map((tx) => (
                  <tr key={tx.id}>
                    <td>{fmtDateTime(tx.createdAt)}</td>
                    <td>{tx.walletName}</td>
                    <td>{tx.transactionType}</td>
                    <td>{tx.reference || '—'}</td>
                    <td>{fmtCurrency(tx.amount, tx.currency)}</td>
                    <td>{fmtCurrency(tx.balanceAfter, tx.currency)}</td>
                    <td>{tx.description || '—'}</td>
                  </tr>
                ))
              )}
            </tbody>
          </table>
        </div>
      </section>
    </div>
  )
}
