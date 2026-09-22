import { getFreshnessLevel, FRESHNESS_STYLE } from '../../../services/freshnessService'
import { RefreshCw } from 'lucide-react'

/**
 * Compact inline badge showing data freshness.
 * timestamp — ISO date string or null
 * onRefresh  — optional async handler; shows a spinner while running
 */
export default function FreshnessBadge({ timestamp, onRefresh, refreshing = false, label }) {
  const { level, label: ageLabel } = getFreshnessLevel(timestamp)
  const style = FRESHNESS_STYLE[level]

  return (
    <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, fontSize: '0.75rem', fontWeight: 600, padding: '3px 10px', borderRadius: 999, background: style.bg, color: style.color }}>
      <span
        style={{
          display: 'inline-block', width: 7, height: 7, borderRadius: '50%',
          background: style.color, flexShrink: 0,
          animation: level === 'fresh' ? 'none' : undefined,
        }}
      />
      {label && <span style={{ color: '#6b7280', fontWeight: 500 }}>{label}:</span>}
      {level === 'missing' ? 'No data' : ageLabel}
      {onRefresh && (
        <button
          onClick={e => { e.stopPropagation(); onRefresh() }}
          disabled={refreshing}
          title="Refresh this data"
          style={{ background: 'none', border: 'none', padding: '0 0 0 2px', cursor: refreshing ? 'not-allowed' : 'pointer', display: 'flex', alignItems: 'center', color: style.color, opacity: refreshing ? 0.5 : 1 }}
        >
          <RefreshCw size={11} style={{ animation: refreshing ? 'spin 1s linear infinite' : 'none' }} />
        </button>
      )}
    </span>
  )
}
