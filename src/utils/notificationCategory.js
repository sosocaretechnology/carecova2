/** Human-readable workflow buckets for triage (aligned with sales → admin → credit → lifecycle). */

export const NOTIFICATION_CATEGORY_LABELS = {
  stage1: 'Stage 1 · New applicant',
  admin_review: 'Stage 2 · Admin review',
  credit: 'Credit & disbursement',
  repayment: 'Repayment',
  recovery: 'Recovery',
  customer: 'Customer account',
  system: 'System',
}

const BACKEND_KEY_ALIASES = {
  new_applicant: 'stage1',
  stage_1: 'stage1',
  stage1: 'stage1',
  sales: 'stage1',
  intake: 'stage1',
  admin: 'admin_review',
  stage_2: 'admin_review',
  stage2: 'admin_review',
  admin_review: 'admin_review',
  credit: 'credit',
  disbursement: 'credit',
  repayment: 'repayment',
  recovery: 'recovery',
  collections: 'recovery',
  customer: 'customer',
  portal: 'customer',
  system: 'system',
}

function normalizeRawCategory(raw) {
  if (!raw || typeof raw !== 'string') return null
  const k = raw.trim().toLowerCase().replace(/[\s-]+/g, '_')
  if (BACKEND_KEY_ALIASES[k]) return BACKEND_KEY_ALIASES[k]
  if (NOTIFICATION_CATEGORY_LABELS[k]) return k
  return null
}

/**
 * Infer category from notification type string (fallback when API does not send category).
 */
export function inferCategoryKeyFromType(type) {
  const t = String(type || '').toLowerCase()
  if (!t) return 'system'

  if (
    /^(application_submitted|new_application|new_applicant|sales_review|sales_pending|sales_assignment|lead_|applicant_|intake_)/.test(t)
    || t.includes('new_applicant')
    || t === 'sales_review_pending'
  ) return 'stage1'

  if (
    /pending_admin|admin_review|documents_required|application_returned|needs_admin|awaiting_admin|queue_admin/.test(t)
  ) return 'admin_review'

  if (
    /approved_for_disbursement|disbursement_|credit_review|credit_approval|ready_for_disburse|mono_|mandate_|payout|stage2_approved|final_credit/.test(t)
  ) return 'credit'

  if (
    /repayment|payment_received|installment|paystack|debit_success|loan_repayment|wallet_credit/.test(t)
  ) return 'repayment'

  if (/overdue|recovery|dpd|collections|default_|charge_off/.test(t)) return 'recovery'

  if (/customer_|portal_|borrower_/.test(t)) return 'customer'

  if (t === 'system_alert' || t === 'system') return 'system'

  return 'system'
}

/**
 * @param {object} item — notification-like object (type, category, data)
 * @returns {{ key: string, label: string }}
 */
export function getNotificationCategory(item) {
  const data = item?.data || {}
  const raw =
    item?.categoryKey
    || data.notificationCategory
    || data.category
    || data.stageCategory
    || data.workflowCategory
    || item?.category
    || ''

  const fromBackend = normalizeRawCategory(typeof raw === 'string' ? raw : String(raw || ''))
  const key = fromBackend || inferCategoryKeyFromType(item?.type)
  const label = NOTIFICATION_CATEGORY_LABELS[key] || NOTIFICATION_CATEGORY_LABELS.system

  return { key, label }
}

export const NOTIFICATION_CATEGORY_ORDER = Object.keys(NOTIFICATION_CATEGORY_LABELS)
