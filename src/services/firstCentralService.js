/**
 * FirstCentral Credit Bureau integration.
 *
 * In backend mode:  proxies through CareCova backend so credentials stay server-side.
 * In local/UAT mode: calls FirstCentral directly using UAT test credentials.
 *
 * Production credentials must live in the backend .env, not here.
 */

const API_BASE_URL = (import.meta.env.VITE_API_BASE_URL || '').replace(/\/$/, '')
const API_ROOT = API_BASE_URL ? `${API_BASE_URL}/api` : ''
const USE_BACKEND = !!API_BASE_URL

const FC_UAT_BASE = 'https://uat.firstcentralcreditbureau.com/firstcentralrestv2'
const FC_UAT_USERNAME = 'demo'
const FC_UAT_PASSWORD = 'demo@123'

// Token cache — FirstCentral tokens are valid for 5 hours
let _cachedToken = null
let _tokenFetchedAt = null
const TOKEN_TTL_MS = 4.5 * 60 * 60 * 1000 // 4.5 hours (refresh before expiry)

function getAdminToken() {
  try {
    const s = localStorage.getItem('carecova_admin_session')
    return s ? JSON.parse(s)?.token : null
  } catch { return null }
}

// ─── UAT direct helpers (local mode only) ────────────────────────────────────

async function fcRequest(path, body) {
  const res = await fetch(`${FC_UAT_BASE}${path}`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify(body),
  })
  if (!res.ok) throw new Error(`FirstCentral ${path} → HTTP ${res.status}`)
  return res.json()
}

async function getToken() {
  const now = Date.now()
  if (_cachedToken && _tokenFetchedAt && (now - _tokenFetchedAt) < TOKEN_TTL_MS) {
    return _cachedToken
  }
  const data = await fcRequest('/login', { username: FC_UAT_USERNAME, password: FC_UAT_PASSWORD })
  _cachedToken = data?.DataTicket || data?.dataTicket
  _tokenFetchedAt = now
  if (!_cachedToken) throw new Error('FirstCentral login did not return a DataTicket')
  return _cachedToken
}

async function matchConsumer(token, bvn) {
  const data = await fcRequest('/ConnectConsumerMatch', {
    DataTicket: token,
    EnquiryReason: 'Credit Application',
    Surname: '',
    Forename: '',
    MiddleName: '',
    Identification: bvn,
    ProductID: 44, // Consumer Basic Credit
  })
  const match = (data?.MatchedConsumers || data?.matchedConsumers || [])[0]
  if (!match) throw new Error('No matching consumer record found for this BVN in FirstCentral')
  return match
}

async function fetchReport(token, match, productId = 70) {
  return fcRequest('/consumerreports', {
    DataTicket: token,
    consumerID: match.ConsumerID || match.consumerId,
    EnquiryID: match.EnquiryID || match.enquiryId,
    SubscriberEnquiryEngineID: match.SubscriberEnquiryEngineID || match.subscriberEnquiryEngineId,
    productid: productId,
  })
}

// ─── Mock response for fully local mode (no backend, CORS blocked) ────────────

function buildMockResult(bvn) {
  return {
    _isMock: true,
    bvn,
    iScore: 620,
    riskBand: 'Medium',
    totalFacilities: 3,
    performingFacilities: 2,
    nonPerformingFacilities: 1,
    totalOutstanding: 450000,
    totalOverdue: 85000,
    enquiryDate: new Date().toISOString(),
    summary: 'UAT mock result — connect backend to get live bureau data.',
  }
}

// ─── Backend proxy helpers ────────────────────────────────────────────────────

async function backendCheck(loanId) {
  const token = getAdminToken()
  const headers = { 'Content-Type': 'application/json' }
  if (token) headers['Authorization'] = `Bearer ${token}`
  const res = await fetch(`${API_ROOT}/admin/loan-applications/${loanId}/first-central/check`, {
    method: 'POST',
    headers,
  })
  if (!res.ok) {
    const err = await res.json().catch(() => ({}))
    throw new Error(err?.message || `Backend first-central check failed (${res.status})`)
  }
  return res.json()
}

// ─── Public API ───────────────────────────────────────────────────────────────

export const firstCentralService = {
  /**
   * Run a full credit bureau check for a loan application.
   * In backend mode: proxied through CareCova API.
   * In UAT/local mode: calls FirstCentral directly (test credentials).
   */
  runCreditCheck: async (loanId, bvn) => {
    if (USE_BACKEND) {
      return backendCheck(loanId)
    }
    // Local UAT path: login → match → iScore report
    try {
      const token = await getToken()
      const match = await matchConsumer(token, bvn)
      // Fetch iScore (70) and Basic Credit (44) in parallel
      const [iScoreRaw, basicCreditRaw] = await Promise.allSettled([
        fetchReport(token, match, 70),
        fetchReport(token, match, 44),
      ])
      return {
        _isMock: false,
        bvn,
        iScore: iScoreRaw.status === 'fulfilled' ? (iScoreRaw.value?.Score ?? iScoreRaw.value?.iScore ?? null) : null,
        riskBand: iScoreRaw.status === 'fulfilled' ? (iScoreRaw.value?.RiskBand ?? iScoreRaw.value?.riskBand ?? null) : null,
        iScoreRaw: iScoreRaw.status === 'fulfilled' ? iScoreRaw.value : null,
        basicCreditRaw: basicCreditRaw.status === 'fulfilled' ? basicCreditRaw.value : null,
        enquiryDate: new Date().toISOString(),
        consumerID: match.ConsumerID || match.consumerId,
      }
    } catch (err) {
      // CORS will block direct calls in browser in some environments — return mock
      if (err.message?.includes('Failed to fetch') || err.message?.includes('NetworkError')) {
        console.warn('[FirstCentral] Direct call blocked (likely CORS) — using mock data for local testing')
        return buildMockResult(bvn)
      }
      throw err
    }
  },

  /**
   * Persist the bureau result onto the loan record in local storage.
   * The backend persists it server-side automatically.
   */
  saveResultLocally: (loanId, result) => {
    try {
      const key = 'carecova_loans'
      const loans = JSON.parse(localStorage.getItem(key) || '[]')
      const idx = loans.findIndex(l => l.id === loanId)
      if (idx !== -1) {
        loans[idx].firstCentralResult = result
        loans[idx].firstCentralCheckedAt = new Date().toISOString()
        localStorage.setItem(key, JSON.stringify(loans))
      }
    } catch { /* non-critical */ }
  },
}
