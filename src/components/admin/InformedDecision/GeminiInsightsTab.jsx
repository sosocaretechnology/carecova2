import { AlertTriangle, CheckCircle, Sparkles, RefreshCw } from 'lucide-react'
import IconBadge from '../../IconBadge'

const RISK_COLOR = {
  low: '#10b981',
  medium: '#f59e0b',
  high: '#ef4444',
}

const SEVERITY_LABEL = {
  low: 'Low',
  medium: 'Medium',
  high: 'High',
}

function RiskBadge({ level }) {
  const color = RISK_COLOR[level] || '#6b7280'
  return (
    <span
      style={{
        background: color + '18',
        color,
        border: `1px solid ${color}40`,
        borderRadius: '6px',
        padding: '2px 10px',
        fontSize: '12px',
        fontWeight: 700,
        textTransform: 'uppercase',
        letterSpacing: '0.05em',
      }}
    >
      {level}
    </span>
  )
}

export default function GeminiInsightsTab({ loan, onRefresh, refreshing }) {
  const insights = loan?.geminiInsights
  const consistency = insights?.consistency
  const narrative = insights?.narrative
  const generatedAt = insights?.generatedAt

  if (!insights) {
    return (
      <div className="detail-card" style={{ textAlign: 'center', padding: '40px 24px' }}>
        <div style={{ display: 'flex', justifyContent: 'center', marginBottom: '12px' }}>
          <IconBadge color="slate" size="lg"><Sparkles size={24} /></IconBadge>
        </div>
        <p className="font-medium text-muted">AI analysis not yet available</p>
        <p className="text-xs text-muted mt-1">
          Run the Informed Decision first. AI analysis generates automatically in the background.
        </p>
        {onRefresh && (
          <button
            className="button button--secondary mt-4"
            onClick={onRefresh}
            disabled={refreshing}
          >
            <RefreshCw size={14} className={refreshing ? 'spin' : ''} />
            {refreshing ? 'Checking…' : 'Check for AI Analysis'}
          </button>
        )}
      </div>
    )
  }

  return (
    <div style={{ display: 'flex', flexDirection: 'column', gap: '16px' }}>
      {generatedAt && (
        <p className="text-xs text-muted" style={{ textAlign: 'right' }}>
          AI analysis generated at {new Date(generatedAt).toLocaleString()}
          {onRefresh && (
            <button
              className="button button--ghost button--compact"
              style={{ marginLeft: '10px', fontSize: '11px' }}
              onClick={onRefresh}
              disabled={refreshing}
            >
              <RefreshCw size={12} /> {refreshing ? 'Refreshing…' : 'Refresh'}
            </button>
          )}
        </p>
      )}

      {/* ── Credit Narrative ─────────────────────────────────────────── */}
      {narrative && (
        <div className="detail-card">
          <div style={{ display: 'flex', alignItems: 'center', gap: '8px', marginBottom: '12px' }}>
            <IconBadge color="indigo" size="xs"><Sparkles size={14} /></IconBadge>
            <h3 style={{ margin: 0 }}>AI Credit Narrative</h3>
          </div>

          <div
            style={{
              background: '#f8f9ff',
              border: '1px solid #e0e7ff',
              borderRadius: '8px',
              padding: '16px',
              marginBottom: '16px',
            }}
          >
            <p className="font-medium" style={{ color: '#1e1b4b', marginBottom: '8px', fontSize: '15px' }}>
              {narrative.headline}
            </p>
            <p className="text-sm" style={{ color: '#374151', lineHeight: '1.6' }}>
              {narrative.body}
            </p>
          </div>

          <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '16px', marginBottom: '16px' }}>
            {narrative.keyStrengths?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Strengths
                </p>
                {narrative.keyStrengths.map((s, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                    <CheckCircle size={14} style={{ color: '#10b981', marginTop: '2px', flexShrink: 0 }} />
                    <p className="text-sm">{s}</p>
                  </div>
                ))}
              </div>
            )}

            {narrative.keyRisks?.length > 0 && (
              <div>
                <p className="text-xs font-medium text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                  Key Risks
                </p>
                {narrative.keyRisks.map((r, i) => (
                  <div key={i} style={{ display: 'flex', alignItems: 'flex-start', gap: '6px', marginBottom: '6px' }}>
                    <AlertTriangle size={14} style={{ color: '#f59e0b', marginTop: '2px', flexShrink: 0 }} />
                    <p className="text-sm">{r}</p>
                  </div>
                ))}
              </div>
            )}
          </div>

          {narrative.suggestedAction && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                gap: '8px',
                alignItems: 'flex-start',
              }}
            >
              <CheckCircle size={16} style={{ color: '#10b981', marginTop: '1px', flexShrink: 0 }} />
              <div>
                <p className="text-xs font-medium" style={{ color: '#065f46', marginBottom: '2px' }}>
                  SUGGESTED ACTION
                </p>
                <p className="text-sm" style={{ color: '#064e3b' }}>{narrative.suggestedAction}</p>
              </div>
            </div>
          )}
        </div>
      )}

      {/* ── Consistency Check ─────────────────────────────────────────── */}
      {consistency && (
        <div className="detail-card">
          <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <AlertTriangle size={18} style={{ color: '#f59e0b' }} />
              <h3 style={{ margin: 0 }}>Form vs Bank Data Consistency</h3>
            </div>
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
              <span className="text-xs text-muted">Overall Risk:</span>
              <RiskBadge level={consistency.overallRisk} />
            </div>
          </div>

          {consistency.summary && (
            <p className="text-sm" style={{ color: '#374151', marginBottom: '16px', lineHeight: '1.6' }}>
              {consistency.summary}
            </p>
          )}

          {consistency.flags?.length === 0 && (
            <div
              style={{
                background: '#f0fdf4',
                border: '1px solid #bbf7d0',
                borderRadius: '8px',
                padding: '12px 16px',
                display: 'flex',
                gap: '8px',
                alignItems: 'center',
              }}
            >
              <CheckCircle size={16} style={{ color: '#10b981' }} />
              <p className="text-sm" style={{ color: '#064e3b' }}>No inconsistencies found. Form data matches bank records.</p>
            </div>
          )}

          {consistency.flags?.length > 0 && (
            <div style={{ display: 'flex', flexDirection: 'column', gap: '10px' }}>
              {consistency.flags.map((flag, i) => {
                const color = RISK_COLOR[flag.severity] || '#6b7280'
                return (
                  <div
                    key={i}
                    style={{
                      border: `1px solid ${color}30`,
                      borderLeft: `4px solid ${color}`,
                      borderRadius: '6px',
                      padding: '12px 16px',
                      background: color + '08',
                    }}
                  >
                    <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center', marginBottom: '6px', flexWrap: 'wrap', gap: '6px' }}>
                      <span className="font-medium text-sm">{flag.field}</span>
                      <span
                        style={{
                          fontSize: '11px',
                          fontWeight: 700,
                          color,
                          textTransform: 'uppercase',
                        }}
                      >
                        {SEVERITY_LABEL[flag.severity]} RISK
                      </span>
                    </div>
                    <p className="text-sm" style={{ color: '#374151', marginBottom: '8px' }}>{flag.issue}</p>
                    <div style={{ display: 'grid', gridTemplateColumns: '1fr 1fr', gap: '8px' }}>
                      <div style={{ background: '#f9fafb', borderRadius: '4px', padding: '6px 10px' }}>
                        <p className="text-xs text-muted">Form Value</p>
                        <p className="text-sm font-medium">{flag.formValue ?? '—'}</p>
                      </div>
                      <div style={{ background: '#f9fafb', borderRadius: '4px', padding: '6px 10px' }}>
                        <p className="text-xs text-muted">Bank (Mono) Value</p>
                        <p className="text-sm font-medium">{flag.monoValue ?? '—'}</p>
                      </div>
                    </div>
                  </div>
                )
              })}
            </div>
          )}

          {consistency.recommendation && (
            <div
              style={{
                marginTop: '16px',
                background: '#fffbeb',
                border: '1px solid #fde68a',
                borderRadius: '8px',
                padding: '12px 16px',
              }}
            >
              <p className="text-xs font-medium" style={{ color: '#92400e', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recommendation
              </p>
              <p className="text-sm" style={{ color: '#78350f' }}>{consistency.recommendation}</p>
            </div>
          )}
        </div>
      )}
    </div>
  )
}
