/**
 * freshnessService.js
 *
 * Tracks when each type of financial data was last fetched per customer.
 * Uses the Mono sync timestamps from loan records as the authoritative source,
 * with a localStorage cache so the UI can show freshness without an API call.
 *
 * Freshness thresholds (configurable):
 *   FRESH   < 7 days
 *   AGING   7–30 days
 *   STALE   > 30 days
 *   MISSING no data ever fetched
 */

const STORAGE_KEY = 'carecova_data_freshness'
const THRESHOLDS = {
  fresh:  7  * 24 * 60 * 60 * 1000,   // 7 days
  aging: 30  * 24 * 60 * 60 * 1000,   // 30 days
}

export const DATA_TYPES = {
  MONO_ACCOUNT:    'mono_account',
  TRANSACTIONS:    'transactions',
  INCOME:          'income',
  STATEMENT:       'statement',
  IDENTITY:        'identity',
  CREDIT_BUREAU:   'credit_bureau',
  GEMINI_ANALYSIS: 'gemini_analysis',
}

function load() {
  try {
    const s = localStorage.getItem(STORAGE_KEY)
    return s ? JSON.parse(s) : {}
  } catch { return {} }
}

function save(data) {
  try { localStorage.setItem(STORAGE_KEY, JSON.stringify(data)) } catch (_) {}
}

/**
 * Returns freshness level string and human-readable label for a timestamp.
 * @param {string|Date|null} timestamp
 * @returns {{ level: 'fresh'|'aging'|'stale'|'missing', label: string, ageMs: number|null }}
 */
export function getFreshnessLevel(timestamp) {
  if (!timestamp) return { level: 'missing', label: 'Never synced', ageMs: null }
  const now = Date.now()
  const ageMs = now - new Date(timestamp).getTime()
  if (ageMs < THRESHOLDS.fresh) return { level: 'fresh',  label: `${Math.floor(ageMs / 86400000)}d ago`, ageMs }
  if (ageMs < THRESHOLDS.aging) return { level: 'aging',  label: `${Math.floor(ageMs / 86400000)}d ago`, ageMs }
  return { level: 'stale', label: `${Math.floor(ageMs / 86400000)}d ago`, ageMs }
}

export const FRESHNESS_STYLE = {
  fresh:   { color: '#16a34a', bg: '#f0fdf4', label: 'Fresh' },
  aging:   { color: '#d97706', bg: '#fffbeb', label: 'Aging' },
  stale:   { color: '#dc2626', bg: '#fef2f2', label: 'Stale' },
  missing: { color: '#9ca3af', bg: '#f9fafb', label: 'No data' },
}

export const freshnessService = {
  /**
   * Derive freshness timestamps from a customer profile (built from loans).
   * Returns a map of { [DATA_TYPE]: { timestamp, level, label, ageMs } }
   */
  deriveFromCustomer(customer) {
    const loan = customer?.latestLoan || {}
    const loans = customer?.loans || []

    const latestMonoLoan = loans.find(l => l.monoAccountId) || loan
    const latestFcLoan   = loans.find(l => l.firstCentralCheckedAt) || loan
    const latestAiLoan   = loans.find(l => l.geminiInsights?.preScreenAt) || loan

    const timestamps = {
      [DATA_TYPES.MONO_ACCOUNT]:    latestMonoLoan.monoLinkedAt || null,
      [DATA_TYPES.TRANSACTIONS]:    latestMonoLoan.monoLinkedAt || null,
      [DATA_TYPES.INCOME]:          latestMonoLoan.monoLinkedAt || null,
      [DATA_TYPES.STATEMENT]:       latestMonoLoan.monoLinkedAt || null,
      [DATA_TYPES.IDENTITY]:        loan.verificationStatus?.identity === 'verified' ? (loan.submittedAt || null) : null,
      [DATA_TYPES.CREDIT_BUREAU]:   latestFcLoan.firstCentralCheckedAt || null,
      [DATA_TYPES.GEMINI_ANALYSIS]: latestAiLoan.geminiInsights?.preScreenAt || null,
    }

    const result = {}
    for (const [type, ts] of Object.entries(timestamps)) {
      result[type] = { timestamp: ts, ...getFreshnessLevel(ts) }
    }
    return result
  },

  /**
   * Manually record that a data type was just refreshed for a customer.
   */
  markRefreshed(customerId, dataType) {
    const all = load()
    if (!all[customerId]) all[customerId] = {}
    all[customerId][dataType] = new Date().toISOString()
    save(all)
  },

  /**
   * Get stored refresh timestamp for a customer + data type.
   */
  getStored(customerId, dataType) {
    const all = load()
    return all[customerId]?.[dataType] || null
  },

  /**
   * Check if a given dataset needs refreshing for a new credit application.
   * Returns true if data is stale (>30 days) or missing.
   */
  needsRefresh(timestamp) {
    if (!timestamp) return true
    const ageMs = Date.now() - new Date(timestamp).getTime()
    return ageMs >= THRESHOLDS.aging
  },
}
