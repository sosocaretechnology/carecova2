export const SECTION_KEYS = [
  'account',
  'incomeRecords',
  'transactions',
  'assets',
  'inflows',
  'credits',
  'debits',
  'statements',
  'creditworthiness',
]

export const SECTION_LABELS = {
  account: 'Account',
  incomeRecords: 'Income Records',
  transactions: 'Transactions',
  assets: 'Assets',
  inflows: 'Inflows',
  credits: 'Credits',
  debits: 'Debits',
  statements: 'Statements',
  creditworthiness: 'Creditworthiness',
}

export const STATUS_COLORS = {
  success: '#16a34a',
  error: '#dc2626',
  skipped: '#64748b',
}

export const DECISION_META = {
  approved: { label: 'APPROVED', color: '#15803d', bg: '#dcfce7' },
  rejected: { label: 'REJECTED', color: '#b91c1c', bg: '#fee2e2' },
  manual_review: { label: 'MANUAL REVIEW', color: '#92400e', bg: '#fef3c7' },
}

export const KNOWN_LOAN_APPS = [
  'fairmoney', 'carbon', 'branch', 'palmcredit', 'opay', 'aella',
  'renmoney', 'quickcheck', 'kuda', 'page financials', 'creditville',
  'kiakia', 'migo', 'specta', 'fint', 'lidya',
]

export const GAMBLING_KEYWORDS = [
  'bet9ja', 'betway', 'sportybet', 'nairabet', 'betking', '1xbet',
  'merrybet', 'bet', 'casino', 'gambl', 'lotto', 'pool',
]

export const toNumberOrEmpty = (value) => {
  if (value === undefined || value === null || value === '') return ''
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : ''
}

export const formatCurrency = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `₦${value.toLocaleString()}`
}

export const formatPercent = (value) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return '—'
  return `${Math.round(value * 100)}%`
}

export const asObject = (value) => {
  if (!value || typeof value !== 'object' || Array.isArray(value)) return {}
  return value
}

export const asArray = (value) => (Array.isArray(value) ? value : [])

export const asNumber = (value) => {
  const parsed = Number(value)
  return Number.isFinite(parsed) ? parsed : undefined
}

export const average = (values) => {
  if (!Array.isArray(values) || values.length === 0) return undefined
  return values.reduce((sum, v) => sum + v, 0) / values.length
}

export const round = (value, digits = 2) => {
  if (typeof value !== 'number' || Number.isNaN(value)) return undefined
  const power = 10 ** digits
  return Math.round(value * power) / power
}

export const formatDateTime = (value) => {
  if (!value) return '—'
  try {
    return new Date(value).toLocaleString()
  } catch {
    return String(value)
  }
}

export const compactJson = (value) => {
  try {
    return JSON.stringify(value, null, 2)
  } catch {
    return 'Unable to display response payload'
  }
}

export function resolveAccountFromSection(section) {
  const payload = asObject(section?.data)
  const data = asObject(payload.data)
  const nested = asObject(data.account)
  if (Object.keys(nested).length > 0) return nested
  if (data.name || data.account_name || data.balance !== undefined) return data
  if (payload.name || payload.account_name) return payload
  return data
}

export function extractTransactions(sections) {
  const txSection = asObject(sections?.transactions)
  if (txSection.status !== 'success') return []
  return asArray(asObject(txSection.data).data)
}

export function classifyTransaction(narration) {
  const lower = (narration || '').toLowerCase()
  for (const app of KNOWN_LOAN_APPS) {
    if (lower.includes(app)) return { type: 'loan', app }
  }
  for (const keyword of GAMBLING_KEYWORDS) {
    if (lower.includes(keyword)) return { type: 'gambling', keyword }
  }
  if (lower.includes('pos') || lower.includes('point of sale')) return { type: 'pos' }
  if (lower.includes('airtime') || lower.includes('data') || lower.includes('mtn') || lower.includes('glo') || lower.includes('airtel')) return { type: 'utility' }
  if (lower.includes('nepa') || lower.includes('phcn') || lower.includes('ikedc') || lower.includes('ekedc') || lower.includes('dstv') || lower.includes('gotv') || lower.includes('startimes')) return { type: 'utility' }
  if (lower.includes('rent') || lower.includes('landlord') || lower.includes('caution')) return { type: 'rent' }
  return { type: 'other' }
}
