import { useState } from 'react'
import { Sparkles, AlertTriangle, CheckCircle, FileText, RefreshCw } from 'lucide-react'
import { adminService } from '../../../services/adminService'
import IconBadge from '../../IconBadge'

const RISK_COLOR = { low: '#10b981', medium: '#f59e0b', high: '#ef4444' }
const SEVERITY_COLOR = { low: '#6b7280', medium: '#f59e0b', high: '#ef4444' }

function RiskBadge({ level }) {
  const color = RISK_COLOR[level] || '#6b7280'
  return (
    <span style={{
      background: color + '15', color, border: `1px solid ${color}40`,
      borderRadius: '6px', padding: '2px 10px', fontSize: '12px',
      fontWeight: 700, textTransform: 'uppercase', letterSpacing: '0.05em',
    }}>
      {level} risk
    </span>
  )
}

export default function AiPreScreenCard({ loan, onUpdated }) {
  const [running, setRunning] = useState(false)
  const [error, setError] = useState(null)

  const preScreen = loan?.geminiInsights?.preScreen
  const preScreenAt = loan?.geminiInsights?.preScreenAt

  const runPreScreen = async () => {
    setRunning(true)
    setError(null)
    try {
      const updated = await adminService.runAiPreScreen(loan.id)
      if (onUpdated) onUpdated(updated)
    } catch (err) {
      setError(err.message || 'AI pre-screen failed')
    } finally {
      setRunning(false)
    }
  }

  return (
    <div className="detail-card">
      <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', marginBottom: '12px', flexWrap: 'wrap', gap: '8px' }}>
        <div style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <IconBadge color="indigo" size="xs"><Sparkles size={14} /></IconBadge>
          <h3 style={{ margin: 0 }}>AI Pre-Screen</h3>
          {preScreen && <RiskBadge level={preScreen.initialRisk} />}
        </div>
        <button
          className="button button--secondary button--compact"
          onClick={runPreScreen}
          disabled={running}
        >
          <RefreshCw size={14} className={running ? 'spin' : ''} />
          {running ? 'Analysing…' : preScreen ? 'Re-run' : 'Run AI Analysis'}
        </button>
      </div>

      {error && (
        <div className="alert-box alert-error mb-3">{error}</div>
      )}

      {!preScreen && !running && (
        <p className="text-sm text-muted">
          AI can analyse this application right now using form data — no bank linking needed.
          Click <strong>Run AI Analysis</strong> to get an instant risk assessment, plain-English
          risk explanation, and a document checklist.
        </p>
      )}

      {running && (
        <div style={{ display: 'flex', alignItems: 'center', gap: '10px', padding: '16px 0', color: '#6b7280' }}>
          <RefreshCw size={16} className="spin" />
          <span className="text-sm">Gemini is analysing the application…</span>
        </div>
      )}

      {preScreen && (
        <div style={{ display: 'flex', flexDirection: 'column', gap: '14px' }}>
          {/* Summary */}
          <div style={{ background: '#f8f9ff', border: '1px solid #e0e7ff', borderRadius: '8px', padding: '14px 16px' }}>
            <p className="text-sm" style={{ color: '#374151', lineHeight: '1.6', marginBottom: '8px' }}>
              {preScreen.summary}
            </p>
            {preScreen.riskExplanation && (
              <p className="text-sm" style={{ color: '#4b5563', lineHeight: '1.6', fontStyle: 'italic' }}>
                {preScreen.riskExplanation}
              </p>
            )}
          </div>

          {/* Flags */}
          {preScreen.flags?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted mb-2" style={{ textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Flags ({preScreen.flags.length})
              </p>
              <div style={{ display: 'flex', flexDirection: 'column', gap: '8px' }}>
                {preScreen.flags.map((flag, i) => {
                  const color = SEVERITY_COLOR[flag.severity] || '#6b7280'
                  return (
                    <div key={i} style={{
                      borderLeft: `3px solid ${color}`,
                      padding: '8px 12px',
                      background: color + '08',
                      borderRadius: '0 6px 6px 0',
                      display: 'flex', alignItems: 'flex-start', gap: '8px',
                    }}>
                      <AlertTriangle size={14} style={{ color, marginTop: '2px', flexShrink: 0 }} />
                      <div>
                        <span className="text-xs font-medium" style={{ color, textTransform: 'uppercase' }}>
                          {flag.severity} · {flag.field}
                        </span>
                        <p className="text-sm" style={{ color: '#374151', marginTop: '2px' }}>{flag.issue}</p>
                      </div>
                    </div>
                  )
                })}
              </div>
            </div>
          )}

          {preScreen.flags?.length === 0 && (
            <div style={{ display: 'flex', alignItems: 'center', gap: '8px', color: '#059669' }}>
              <CheckCircle size={16} />
              <span className="text-sm">No issues flagged from form data.</span>
            </div>
          )}

          {/* Recommendation */}
          {preScreen.recommendation && (
            <div style={{ background: '#fffbeb', border: '1px solid #fde68a', borderRadius: '8px', padding: '12px 16px' }}>
              <p className="text-xs font-medium" style={{ color: '#92400e', marginBottom: '4px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                Recommended Next Step
              </p>
              <p className="text-sm" style={{ color: '#78350f' }}>{preScreen.recommendation}</p>
            </div>
          )}

          {/* Documents to request */}
          {preScreen.documentsToRequest?.length > 0 && (
            <div>
              <p className="text-xs font-medium text-muted mb-2" style={{ display: 'flex', alignItems: 'center', gap: '6px', textTransform: 'uppercase', letterSpacing: '0.05em' }}>
                <FileText size={12} /> Documents to Request
              </p>
              <div style={{ display: 'flex', flexWrap: 'wrap', gap: '6px' }}>
                {preScreen.documentsToRequest.map((doc, i) => (
                  <span key={i} style={{
                    background: '#f3f4f6', border: '1px solid #e5e7eb',
                    borderRadius: '20px', padding: '3px 10px', fontSize: '12px', color: '#374151',
                  }}>
                    {doc}
                  </span>
                ))}
              </div>
            </div>
          )}

          {preScreenAt && (
            <p className="text-xs text-muted" style={{ textAlign: 'right' }}>
              Last run: {new Date(preScreenAt).toLocaleString()}
            </p>
          )}
        </div>
      )}
    </div>
  )
}
