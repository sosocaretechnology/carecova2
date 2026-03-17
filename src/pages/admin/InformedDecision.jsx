import { useEffect, useMemo, useState } from 'react'
import { useParams, useNavigate } from 'react-router-dom'
import { adminService } from '../../services/adminService'
import { SECTION_KEYS, toNumberOrEmpty } from '../../components/admin/InformedDecision/utils'
import DecisionSupportTab from '../../components/admin/InformedDecision/DecisionSupportTab'
import IdentityTab from '../../components/admin/InformedDecision/IdentityTab'
import IncomeTab from '../../components/admin/InformedDecision/IncomeTab'
import CashFlowTab from '../../components/admin/InformedDecision/CashFlowTab'
import LoanSignalsTab from '../../components/admin/InformedDecision/LoanSignalsTab'
import SpendingTab from '../../components/admin/InformedDecision/SpendingTab'
import AccountStabilityTab from '../../components/admin/InformedDecision/AccountStabilityTab'

const TABS = [
  { key: 'decision', label: 'Decision Support' },
  { key: 'identity', label: 'Identity' },
  { key: 'income', label: 'Income' },
  { key: 'cashflow', label: 'Cash Flow' },
  { key: 'loans', label: 'Loan Signals' },
  { key: 'spending', label: 'Spending' },
  { key: 'stability', label: 'Account Stability' },
]

export default function InformedDecision() {
  const { id } = useParams()
  const navigate = useNavigate()

  const [loan, setLoan] = useState(null)
  const [loading, setLoading] = useState(true)
  const [error, setError] = useState('')

  const [report, setReport] = useState(null)
  const [loadingOverview, setLoadingOverview] = useState(false)
  const [sectionLoading, setSectionLoading] = useState({})
  const [overviewLoaded, setOverviewLoaded] = useState(false)
  const [activeTab, setActiveTab] = useState('decision')

  const [form, setForm] = useState({
    bvn: '',
    principal: '',
    interestRate: 5,
    term: '',
    runCreditCheck: true,
  })

  useEffect(() => {
    let cancelled = false
    ;(async () => {
      try {
        setLoading(true)
        const found = await adminService.getLoanById(id)
        if (!cancelled) {
          setLoan(found)
          setForm((prev) => ({
            ...prev,
            bvn: found.bvn || found.identityNumber || prev.bvn || '',
            principal: found.requestedAmount || found.estimatedCost || '',
            term: found.preferredDuration || '',
          }))
        }
      } catch (err) {
        if (!cancelled) setError(err.message || 'Failed to load application')
      } finally {
        if (!cancelled) setLoading(false)
      }
    })()
    return () => { cancelled = true }
  }, [id])

  const canRun = Boolean(loan?.id && loan?.monoAccountId)

  const updateForm = (key, value) => {
    setForm((prev) => ({ ...prev, [key]: value }))
  }

  const buildPayload = () => {
    const payload = {}
    const bvn = String(form.bvn || '').trim()
    if (bvn) payload.bvn = bvn
    const principal = toNumberOrEmpty(form.principal)
    if (principal !== '') payload.principal = principal
    const interestRate = toNumberOrEmpty(form.interestRate)
    if (interestRate !== '') payload.interestRate = interestRate
    const term = toNumberOrEmpty(form.term)
    if (term !== '') payload.term = term
    payload.runCreditCheck = Boolean(form.runCreditCheck)
    payload.forceRefresh = false
    return payload
  }

  const loadOverview = async (forceRefresh = false) => {
    if (!canRun) return
    try {
      setLoadingOverview(true)
      setError('')
      const payload = buildPayload()
      const data = await adminService.getMonoInformedDecisionForLoan(
        loan.id,
        { ...payload, forceRefresh },
      )
      setReport(data)
      setOverviewLoaded(true)
    } catch (err) {
      setError(err.message || 'Unable to fetch Mono informed decision data')
    } finally {
      setLoadingOverview(false)
    }
  }

  const loadSection = async (sectionKey) => {
    if (!canRun) return
    try {
      setSectionLoading((prev) => ({ ...prev, [sectionKey]: true }))
      setError('')
      const payload = buildPayload()
      const sectionResponse = await adminService.getMonoInformedDecisionSectionForLoan(
        loan.id,
        sectionKey,
        payload,
      )
      setReport((prev) => {
        const next = prev || {
          status: 'partial_success',
          source: sectionResponse.source || 'cache',
          generatedAt: sectionResponse.generatedAt,
          analysis: { insights: [] },
          warnings: [],
          sections: {},
        }
        return {
          ...next,
          source: sectionResponse.source || next.source,
          generatedAt: sectionResponse.generatedAt || next.generatedAt,
          sections: {
            ...(next.sections || {}),
            [sectionKey]: sectionResponse.result,
          },
        }
      })
      const refreshedOverview = await adminService.getMonoInformedDecisionForLoan(
        loan.id,
        { ...payload, forceRefresh: false },
      )
      setReport(refreshedOverview)
    } catch (err) {
      setError(err.message || `Unable to fetch section data`)
    } finally {
      setSectionLoading((prev) => ({ ...prev, [sectionKey]: false }))
    }
  }

  const sections = useMemo(() => report?.sections || {}, [report])

  if (loading) return <div className="admin-loading">Loading application...</div>
  if (error && !loan) {
    return (
      <div className="admin-page">
        <div className="alert-box alert-error">{error}</div>
        <button className="button button--secondary mt-4" onClick={() => navigate('/admin/applications')}>
          ← Back to Applications
        </button>
      </div>
    )
  }

  const tabProps = { report, sections, form, loan, loadSection, sectionLoading }

  return (
    <div className="admin-page id-page">
      <div className="id-page-header">
        <button className="back-link text-sm text-primary font-bold bg-transparent border-none cursor-pointer" onClick={() => navigate('/admin/applications')}>
          ← Back to Applications
        </button>
        <h1>Informed Decision — {loan?.fullName || loan?.patientName || id}</h1>
        <p className="text-muted text-sm">Mono financial analysis for loan application {id}</p>
      </div>

      {!canRun && (
        <div className="alert-box alert-warning mt-3">
          This applicant does not have a linked Mono account yet. Link the account first from the application detail page.
        </div>
      )}

      {!overviewLoaded ? (
        <div className="id-form-step">
          <h2>Load Financial Data</h2>
          <p className="text-muted text-sm mb-4">Fill in the loan parameters and load the Mono overview to see financial analysis.</p>
          <div className="id-form-grid">
            <label>
              BVN
              <input type="text" value={form.bvn} onChange={(e) => updateForm('bvn', e.target.value)} placeholder="12345678901" maxLength={11} />
            </label>
            <label>
              Principal (NGN)
              <input type="number" value={form.principal} onChange={(e) => updateForm('principal', e.target.value)} min="1" />
            </label>
            <label>
              Interest Rate (%)
              <input type="number" value={form.interestRate} onChange={(e) => updateForm('interestRate', e.target.value)} min="0" step="0.1" />
            </label>
            <label>
              Term (months)
              <input type="number" value={form.term} onChange={(e) => updateForm('term', e.target.value)} min="1" />
            </label>
            <label className="id-checkbox">
              <input type="checkbox" checked={form.runCreditCheck} onChange={(e) => updateForm('runCreditCheck', e.target.checked)} />
              Run credit check
            </label>
          </div>
          {error && <div className="alert-box alert-error mt-3">{error}</div>}
          <div className="id-form-actions">
            <button className="button button--primary" onClick={() => loadOverview(false)} disabled={loadingOverview || !canRun}>
              {loadingOverview ? 'Loading...' : 'Load Cached Overview'}
            </button>
            <button className="button button--secondary" onClick={() => loadOverview(true)} disabled={loadingOverview || !canRun}>
              {loadingOverview ? 'Loading...' : 'Refresh From Mono'}
            </button>
          </div>
        </div>
      ) : (
        <>
          <div className="id-params-bar">
            <span><strong>BVN:</strong> {form.bvn || '—'}</span>
            <span><strong>Principal:</strong> ₦{Number(form.principal || 0).toLocaleString()}</span>
            <span><strong>Rate:</strong> {form.interestRate}%</span>
            <span><strong>Term:</strong> {form.term} months</span>
            <span><strong>Source:</strong> {report?.source || 'cache'}</span>
            <button className="button button--secondary button--sm" onClick={() => setOverviewLoaded(false)}>
              Edit Parameters
            </button>
            <button className="button button--secondary button--sm" onClick={() => loadOverview(true)} disabled={loadingOverview}>
              {loadingOverview ? 'Refreshing...' : 'Refresh'}
            </button>
          </div>

          {error && <div className="alert-box alert-error mt-3">{error}</div>}

          <div className="id-tabs">
            {TABS.map((tab) => (
              <button
                key={tab.key}
                className={`id-tab-btn ${activeTab === tab.key ? 'active' : ''}`}
                onClick={() => setActiveTab(tab.key)}
              >
                {tab.label}
              </button>
            ))}
          </div>

          <div className="id-tab-content">
            {activeTab === 'decision' && <DecisionSupportTab {...tabProps} />}
            {activeTab === 'identity' && <IdentityTab {...tabProps} />}
            {activeTab === 'income' && <IncomeTab {...tabProps} />}
            {activeTab === 'cashflow' && <CashFlowTab {...tabProps} />}
            {activeTab === 'loans' && <LoanSignalsTab {...tabProps} />}
            {activeTab === 'spending' && <SpendingTab {...tabProps} />}
            {activeTab === 'stability' && <AccountStabilityTab {...tabProps} />}
          </div>
        </>
      )}
    </div>
  )
}
