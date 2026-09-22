import { FRESHNESS_STYLE, DATA_TYPES } from '../../../services/freshnessService'
import { Clock } from 'lucide-react'

const fmtDateTime = (d) => d
  ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' })
  : 'Never'

const TYPE_LABELS = {
  [DATA_TYPES.MONO_ACCOUNT]:    'Bank Account',
  [DATA_TYPES.TRANSACTIONS]:    'Transactions',
  [DATA_TYPES.INCOME]:          'Income Analysis',
  [DATA_TYPES.STATEMENT]:       'Bank Statement',
  [DATA_TYPES.IDENTITY]:        'Identity (KYC)',
  [DATA_TYPES.CREDIT_BUREAU]:   'Credit Bureau',
  [DATA_TYPES.GEMINI_ANALYSIS]: 'AI Analysis',
}

/**
 * Panel shown at the bottom of Overview tab summarising all dataset freshness.
 * freshness — map returned by freshnessService.deriveFromCustomer(customer)
 */
export default function DataFreshnessPanel({ freshness }) {
  if (!freshness) return null

  return (
    <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '20px 24px', marginTop: 20 }}>
      <div style={{ display: 'flex', alignItems: 'center', gap: 8, marginBottom: 14 }}>
        <Clock size={17} color="#6b7280" />
        <h3 style={{ margin: 0, fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Data Freshness</h3>
      </div>
      <p style={{ margin: '0 0 14px', fontSize: '0.8125rem', color: '#6b7280' }}>
        Every financial dataset must be fresh before it can be used in a credit decision.
        Stale data (&gt;30 days) requires a refresh before a new assessment.
      </p>

      <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(200px, 1fr))', gap: 10 }}>
        {Object.entries(freshness).map(([type, info]) => {
          const style = FRESHNESS_STYLE[info.level]
          const label = TYPE_LABELS[type] || type
          return (
            <div
              key={type}
              style={{
                display: 'flex', alignItems: 'center', justifyContent: 'space-between',
                padding: '10px 14px', borderRadius: 8,
                background: style.bg,
                border: `1px solid ${style.color}28`,
              }}
            >
              <div>
                <div style={{ fontWeight: 600, fontSize: '0.8125rem', color: '#374151' }}>{label}</div>
                <div style={{ fontSize: '0.75rem', color: '#9ca3af', marginTop: 1 }}>
                  {fmtDateTime(info.timestamp)}
                </div>
              </div>
              <span style={{
                fontSize: '0.7rem', fontWeight: 700, padding: '2px 8px',
                borderRadius: 999, background: 'white', color: style.color,
                border: `1px solid ${style.color}40`, whiteSpace: 'nowrap', marginLeft: 8,
              }}>
                {style.label}
              </span>
            </div>
          )
        })}
      </div>

      <div style={{ marginTop: 14, display: 'flex', gap: 12, flexWrap: 'wrap', fontSize: '0.75rem', color: '#9ca3af' }}>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: FRESHNESS_STYLE.fresh.color }} />
          Fresh (&lt;7 days)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: FRESHNESS_STYLE.aging.color }} />
          Aging (7–30 days)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: FRESHNESS_STYLE.stale.color }} />
          Stale (&gt;30 days — refresh required)
        </span>
        <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5 }}>
          <span style={{ display: 'inline-block', width: 8, height: 8, borderRadius: '50%', background: FRESHNESS_STYLE.missing.color }} />
          No data
        </span>
      </div>
    </div>
  )
}
