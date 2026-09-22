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

import {
  User, Shield, Wifi, TrendingUp, BarChart2, ArrowLeftRight,
  FileText, CreditCard, Hospital, DollarSign, Activity,
  ChevronLeft, RefreshCw, CheckCircle, AlertCircle, Clock, WifiOff, Zap,
} from 'lucide-react'

const TABS = [
  { key: 'overview',       label: 'Overview',              Icon: User },
  { key: 'personal',       label: 'Personal Info',          Icon: User },
  { key: 'kyc',            label: 'KYC / Identity',         Icon: Shield },
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
    verified:    { Icon: CheckCircle, color: '#16a34a' },
    partial:     { Icon: AlertCircle, color: '#d97706' },
    pending:     { Icon: Clock,       color: '#3b82f6' },
    not_started: { Icon: AlertCircle, color: '#9ca3af' },
  }
  const { Icon, color } = map[status] || map.not_started
  return <Icon size={14} color={color} />
}

export default function CustomerDetail() {
  const { customerId } = useParams()
  const navigate = useNavigate()
  const { session } = useAuth()
  const isAdmin = session?.role === 'admin'

  const [loading, setLoading] = useState(true)
  const [error, setError]   = useState(null)
  const [customer, setCustomer] = useState(null)
  const [bankAccounts, setBankAccounts] = useState([])
  const [transactions, setTransactions] = useState({ transactions: [], retrievedAt: null })
  const [repayments, setRepayments]   = useState([])
  const [geminiAnalysis, setGeminiAnalysis] = useState(null)
  const [activeTab, setActiveTab] = useState('overview')

  const decodedId = decodeURIComponent(customerId)

  const load = async () => {
    try {
      setLoading(true)
      setError(null)

      const [profile, accounts, txData, repData, analysis] = await Promise.all([
        customerService.getCustomerById(decodedId),
        customerService.getCustomerBankAccounts(decodedId),
        customerService.getCustomerTransactions(decodedId),
        customerService.getCustomerRepayments(decodedId),
        customerService.getCustomerFinancialAnalysis(decodedId),
      ])

      const enriched = { ...profile, _bankAccounts: accounts, _geminiAnalysis: analysis }
      setCustomer(enriched)
      setBankAccounts(accounts)
      setTransactions(txData)
      setRepayments(repData)
      setGeminiAnalysis(analysis)

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
  }, [decodedId])

  if (loading) return <FullScreenLoader label="Loading Customer 360…" />

  if (error) return (
    <div className="admin-page">
      <button onClick={() => navigate('/admin/customers')} style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', color: '#2563eb', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}>
        <ChevronLeft size={16} /> Back to Customers
      </button>
      <div style={{ background: '#fef2f2', border: '1px solid #fecaca', borderRadius: 8, padding: 16, color: '#dc2626' }}>{error}</div>
    </div>
  )

  if (!customer) return null

  const kycStatus = customer.kycStatus || 'not_started'
  const kycLabels = { verified: 'Verified', partial: 'Partial KYC', pending: 'Pending', not_started: 'Not Started' }

  return (
    <div className="admin-page">
      {/* Back nav */}
      <button
        onClick={() => navigate('/admin/customers')}
        style={{ display: 'inline-flex', alignItems: 'center', gap: 6, marginBottom: 16, background: 'none', border: 'none', color: '#6b7280', cursor: 'pointer', fontWeight: 600, fontSize: '0.875rem' }}
      >
        <ChevronLeft size={16} /> All Customers
      </button>

      {/* Customer header */}
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 12, padding: '24px 28px', marginBottom: 24 }}>
        <div style={{ display: 'flex', alignItems: 'flex-start', justifyContent: 'space-between', flexWrap: 'wrap', gap: 12 }}>
          {/* Left: identity */}
          <div style={{ display: 'flex', alignItems: 'center', gap: 16 }}>
            <div style={{ width: 56, height: 56, borderRadius: 14, background: '#eff6ff', display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0 }}>
              <User size={28} color="#3b82f6" />
            </div>
            <div>
              <h1 style={{ margin: '0 0 2px', fontSize: '1.4rem', fontWeight: 800, color: '#111827' }}>{customer.fullName}</h1>
              <div style={{ fontSize: '0.875rem', color: '#6b7280' }}>
                {customer.phone}
                {customer.email && customer.email !== '—' && <> · {customer.email}</>}
              </div>
              <div style={{ marginTop: 6, display: 'flex', gap: 6, flexWrap: 'wrap' }}>
                {/* KYC badge */}
                <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: kycStatus === 'verified' ? '#f0fdf4' : '#fffbeb', color: kycStatus === 'verified' ? '#16a34a' : '#d97706' }}>
                  <KycStatusIcon status={kycStatus} />
                  {kycLabels[kycStatus]}
                </span>
                {/* Mono badge */}
                {customer.hasMonoConnection
                  ? <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: '#f0fdf4', color: '#16a34a' }}><Wifi size={11} /> Bank Linked</span>
                  : <span style={{ display: 'inline-flex', alignItems: 'center', gap: 4, fontSize: '0.75rem', fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: '#f9fafb', color: '#9ca3af' }}><WifiOff size={11} /> No Bank</span>
                }
                {/* Active credit */}
                {customer.activeLoansCount > 0 && (
                  <span style={{ fontSize: '0.75rem', fontWeight: 600, padding: '2px 9px', borderRadius: 999, background: '#eff6ff', color: '#2563eb' }}>
                    {customer.activeLoansCount} Active Loan{customer.activeLoansCount !== 1 ? 's' : ''}
                  </span>
                )}
              </div>
            </div>
          </div>

          {/* Right: key numbers */}
          <div style={{ display: 'flex', gap: 12, flexWrap: 'wrap' }}>
            {[
              { label: 'Outstanding',   value: fmt(customer.outstandingBalance), danger: customer.outstandingBalance > 0 },
              { label: 'Total Credit',  value: fmt(customer.totalCreditLimit) },
              { label: 'Applications', value: String(customer.totalApplications) },
              { label: 'Last Sync',    value: fmtDate(customer.lastMonoSync) },
            ].map(k => (
              <div key={k.label} style={{ textAlign: 'center', padding: '8px 14px', background: '#f9fafb', borderRadius: 8 }}>
                <div style={{ fontSize: '0.65rem', fontWeight: 700, textTransform: 'uppercase', color: '#9ca3af', marginBottom: 2 }}>{k.label}</div>
                <div style={{ fontWeight: 800, fontSize: '0.9375rem', color: k.danger ? '#dc2626' : '#111827' }}>{k.value}</div>
              </div>
            ))}
          </div>
        </div>
      </div>

      {/* Tab bar */}
      <div style={{ display: 'flex', gap: 2, overflowX: 'auto', marginBottom: 20, background: '#f9fafb', borderRadius: 10, padding: 4, border: '1px solid #e5e7eb' }}>
        {TABS.map(tab => {
          const { Icon } = tab
          const active = activeTab === tab.key
          return (
            <button
              key={tab.key}
              onClick={() => setActiveTab(tab.key)}
              style={{
                display: 'inline-flex', alignItems: 'center', gap: 6,
                padding: '8px 14px', borderRadius: 7, border: 'none', cursor: 'pointer',
                fontWeight: active ? 700 : 500, fontSize: '0.8125rem', whiteSpace: 'nowrap',
                background: active ? (tab.highlight ? '#7c3aed' : '#fff') : (tab.highlight ? '#f5f3ff' : 'transparent'),
                color: active ? (tab.highlight ? '#fff' : '#2563eb') : (tab.highlight ? '#7c3aed' : '#6b7280'),
                boxShadow: active ? '0 1px 3px rgba(0,0,0,0.08)' : 'none',
                transition: 'all 0.15s',
              }}
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
