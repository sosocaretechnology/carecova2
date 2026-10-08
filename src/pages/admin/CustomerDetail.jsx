import { useState, useEffect } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { useAuth } from '../../hooks/useAuth'
import { customerService } from '../../services/customerService'
import { auditService } from '../../services/auditService'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

import OverviewTab         from '../../components/admin/Customer360/OverviewTab'
import PersonalInfoTab     from '../../components/admin/Customer360/PersonalInfoTab'
import KycIdentityTab      from '../../components/admin/Customer360/KycIdentityTab'
import BankAccountsTab     from '../../components/admin/Customer360/BankAccountsTab'
import FinancialProfileTab from '../../components/admin/Customer360/FinancialProfileTab'
import IncomeAnalysisTab   from '../../components/admin/Customer360/IncomeAnalysisTab'
import TransactionsTab     from '../../components/admin/Customer360/TransactionsTab'
import StatementsTab       from '../../components/admin/Customer360/StatementsTab'
import CreditApplicationsTab from '../../components/admin/Customer360/CreditApplicationsTab'
import HealthcareTab       from '../../components/admin/Customer360/HealthcareTab'
import RepaymentsTab       from '../../components/admin/Customer360/RepaymentsTab'
import ActivityLogTab      from '../../components/admin/Customer360/ActivityLogTab'
import CreditDecisionTab   from '../../components/admin/Customer360/CreditDecisionTab'
import FirstCentralReportsTab from '../../components/admin/Customer360/FirstCentralReportsTab'
import { firstCentralService } from '../../services/firstCentralService'

import {
  User, Shield, Wifi, TrendingUp, BarChart2, ArrowLeftRight,
  FileText, CreditCard, Hospital, DollarSign, Activity,
  ChevronLeft, RefreshCw, CheckCircle, AlertCircle, Clock, WifiOff, Zap, BadgeCheck,
} from 'lucide-react'

const TABS = [
  { key: 'overview',       label: 'Overview',              Icon: User },
  { key: 'personal',       label: 'Personal Info',          Icon: User },
  { key: 'kyc',            label: 'KYC / Identity',         Icon: Shield },
  { key: 'firstcentral',   label: 'FirstCentral',           Icon: BadgeCheck },
  { key: 'bank',           label: 'Bank Accounts',          Icon: Wifi },
  { key: 'financial',      label: 'Financial Profile',      Icon: TrendingUp },
  { key: 'income',         label: 'Income Analysis',        Icon: BarChart2 },
  { key: 'transactions',   label: 'Transactions',           Icon: ArrowLeftRight },
  { key: 'statements',     label: 'Bank Statements',        Icon: FileText },
  { key: 'applications',   label: 'Credit Applications',    Icon: CreditCard },
  { key: 'healthcare',     label: 'Healthcare',             Icon: Hospital },
  { key: 'repayments',     label: 'Repayments',             Icon: DollarSign },
  { key: 'decision',       label: 'Credit Decision',        Icon: Zap, highlight: true },
  { key: 'activity',       label: 'Activity Log',           Icon: Activity },
]

const fmtDate = (d) => d ? new Date(d).toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' }) : '—'
const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : 'Never'
const fmt = (n) => n != null ? `₦${Number(n).toLocaleString()}` : '—'

function KycStatusIcon({ status }) {
  const map = {
    verified:    { Icon: CheckCircle, color: 'var(--color-success)' },
    partial:     { Icon: AlertCircle, color: 'var(--color-warning)' },
    pending:     { Icon: Clock,       color: 'var(--color-info)' },
    not_started: { Icon: AlertCircle, color: 'var(--color-text-label)' },
  }
  const { Icon, color } = map[status] || map.not_started
  return <Icon size={14} color={color} />
}

export default function CustomerDetail() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isAdmin = session?.role === 'admin'
  const canViewFirstCentral = ['super_admin', 'admin', 'credit_admin', 'credit_officer', 'reviewer'].includes(session?.role)

  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [customer, setCustomer] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [transactions, setTransactions] = useState({ transactions: [], retrievedAt: null })
  const [repayments, setRepayments]   = useState([])
  const [geminiAnalysis, setGeminiAnalysis] = useState(null)
  const [firstCentralReports, setFirstCentralReports] = useState([])
  const [activeTab, setActiveTab] = useState('overview')

  const decodedId = decodeURIComponent(customerId)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)

      const [profile, accounts, txData, repData, analysis, bureauReports] = await Promise.all([
        customerService.getCustomerById(decodedId),
        customerService.getCustomerBankAccounts(decodedId),
        customerService.getCustomerTransactions(decodedId),
        customerService.getCustomerRepayments(decodedId),
        customerService.getCustomerFinancialAnalysis(decodedId),
        canViewFirstCentral
          ? firstCentralService.getCustomerReports(decodedId).catch(() => [])
          : Promise.resolve([]),
      ])

      const enriched = { ...profile, _bankAccounts: accounts, _geminiAnalysis: analysis }
      setCustomer(enriched)
      setBankAccounts(accounts)
      setTransactions(txData)
      setRepayments(repData)
      setGeminiAnalysis(analysis)
      setFirstCentralReports(Array.isArray(bureauReports) ? bureauReports : [])

      // Audit: record profile view
      auditService.record('customer_profile_viewed', {
        adminName: session?.name || session?.username || 'admin',
        message: `Customer 360 viewed: ${profile.fullName} (${profile.phone})`,
      })
    } catch (err) {
      setError(err.message || 'Failed to load customer')
    } finally {
      setLoading(false)
    }
  }

  useEffect(() => {
    load()
  }, [decodedId, canViewFirstCentral])

  if (loading) return <FullScreenLoader label="Loading Customer 360…" />

  if (error) return (
    <div className="admin-page">
      <button onClick={() => navigate('/admin/customers')} className="cc-back-link" style={{ marginBottom: 16 }}>
        <ChevronLeft size={16} /> Back to Customers
      </button>
      <div className="alert-box alert-error">{error}</div>
    </div>
  )

  if (!customer) return null

  const kycStatus = customer.kycStatus || 'not_started'
  const kycLabels = { verified: 'Verified', partial: 'Partial KYC', pending: 'Pending', not_started: 'Not Started' }

  return (
    <div className="admin-page">
      {/* Back nav */}
      <button onClick={() => navigate('/admin/customers')} className="cc-back-link" style={{ marginBottom: 16 }}>
        <ChevronLeft size={16} /> All Customers
      </button>

      {/* Customer header */}
      <div className="cc-c360-header">
        <div className="cc-c360-header-inner">
          {/* Left: identity */}
          <div className="cc-c360-identity">
            <div className="cc-c360-avatar">
              <User size={28} />
            </div>
            <div>
              <h1 className="cc-c360-name">{customer.fullName}</h1>
              <div className="cc-c360-contact">
                {customer.phone}
                {customer.email && customer.email !== '—' && <> · {customer.email}</>}
              </div>
              <div className="cc-c360-badges">
                <span className={`cc-c360-badge cc-c360-badge--${kycStatus === 'verified' ? 'verified' : kycStatus === 'partial' ? 'partial' : kycStatus === 'pending' ? 'pending' : 'not-started'}`}>
                  <KycStatusIcon status={kycStatus} />
                  {kycLabels[kycStatus]}
                </span>
                {customer.hasMonoConnection
                  ? <span className="cc-c360-badge cc-c360-badge--bank"><Wifi size={11} /> Bank Linked</span>
                  : <span className="cc-c360-badge cc-c360-badge--no-bank"><WifiOff size={11} /> No Bank</span>
                }
                {customer.activeLoansCount > 0 && (
                  <span className="cc-c360-badge cc-c360-badge--loan">
                    {customer.activeLoansCount} Active Loan{customer.activeLoansCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: key numbers */}
          <div className="cc-c360-stats">
            {[
              { label: 'Outstanding',  value: fmt(customer.outstandingBalance), danger: customer.outstandingBalance > 0 },
              { label: 'Total Credit', value: fmt(customer.totalCreditLimit) },
              { label: 'Applications', value: String(customer.totalApplications) },
              { label: 'Last Sync',   value: fmtDate(customer.lastMonoSync) },
            ].map(k => (
              <div key={k.label} className="cc-c360-stat">
                <div className="cc-c360-stat-label">{k.label}</div>
                <div className={`cc-c360-stat-value${k.danger ? ' cc-c360-stat-value--danger' : ''}`}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div className="cc-tab-bar" role="tablist" style={{ marginBottom: 20 }}>
        {TABS.filter(tab => tab.key !== 'firstcentral' || canViewFirstCentral).map(tab => {
          const { Icon } = tab
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              role="tab"
              aria-selected={active}
              onClick={() => setActiveTab(tab.key)}
              className={`cc-tab${tab.highlight ? ' cc-tab--highlight' : ''}${active ? ' is-active' : ''}`}
            >
              <Icon size={14} />
              {tab.label}
            </button>
          )
        })}
      </div>

      {/* Tab content */}
      <div>
        {activeTab === 'overview'     && <OverviewTab         customer={customer} />}
        {activeTab === 'personal'     && <PersonalInfoTab     customer={customer} />}
        {activeTab === 'kyc'          && <KycIdentityTab      customer={customer} />}
        {activeTab === 'firstcentral' && canViewFirstCentral && <FirstCentralReportsTab reports={firstCentralReports} />}
        {activeTab === 'bank'         && <BankAccountsTab     customer={customer} isAdmin={isAdmin} onDataRefreshed={load} />}
        {activeTab === 'financial'    && <FinancialProfileTab customer={customer} />}
        {activeTab === 'income'       && <IncomeAnalysisTab   customer={customer} onDataRefreshed={load} />}
        {activeTab === 'transactions' && (
          <TransactionsTab
            transactions={transactions.transactions}
            retrievedAt={transactions.retrievedAt}
            isAdmin={isAdmin}
          />
        )}
        {activeTab === 'statements'   && <StatementsTab       customer={customer} isAdmin={isAdmin} />}
        {activeTab === 'applications' && <CreditApplicationsTab customer={customer} />}
        {activeTab === 'healthcare'   && <HealthcareTab       customer={customer} />}
        {activeTab === 'repayments'   && <RepaymentsTab       repayments={repayments} />}
        {activeTab === 'decision'     && <CreditDecisionTab   customer={customer} />}
        {activeTab === 'activity'     && <ActivityLogTab      customer={customer} />}
      </div>
    </div>
  )
}
