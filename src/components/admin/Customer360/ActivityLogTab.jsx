import { useEffect, useState } from 'react'
import { auditService } from '../../../services/auditService'
import { Clock, User, FileText, CheckCircle, AlertCircle, Activity } from 'lucide-react'

const fmtDateTime = (d) => d ? new Date(d).toLocaleString('en-NG', { day: 'numeric', month: 'short', year: 'numeric', hour: '2-digit', minute: '2-digit' }) : '—'

const ACTION_CFG = {
  customer_profile_viewed:    { label: 'Profile Viewed',       color: '#6b7280', bg: '#f9fafb',  Icon: User },
  kyc_verified:               { label: 'KYC Verified',         color: '#16a34a', bg: '#f0fdf4',  Icon: CheckCircle },
  bvn_verified:               { label: 'BVN Verified',         color: '#16a34a', bg: '#f0fdf4',  Icon: CheckCircle },
  bank_connected:             { label: 'Bank Connected',       color: '#2563eb', bg: '#eff6ff',  Icon: Activity },
  mono_refreshed:             { label: 'Mono Refreshed',       color: '#7c3aed', bg: '#f5f3ff',  Icon: Activity },
  statement_retrieved:        { label: 'Statement Retrieved',  color: '#0891b2', bg: '#ecfeff',  Icon: FileText },
  ai_analysis:                { label: 'AI Analysis Run',      color: '#d97706', bg: '#fffbeb',  Icon: Activity },
  credit_assessment:          { label: 'Credit Assessment',    color: '#2563eb', bg: '#eff6ff',  Icon: CheckCircle },
  credit_decision:            { label: 'Credit Decision',      color: '#059669', bg: '#f0fdf4',  Icon: CheckCircle },
  provider_submitted:         { label: 'Submitted to Provider',color: '#7c3aed', bg: '#f5f3ff',  Icon: FileText },
  approve:                    { label: 'Application Approved', color: '#16a34a', bg: '#f0fdf4',  Icon: CheckCircle },
  decline:                    { label: 'Application Declined', color: '#dc2626', bg: '#fef2f2',  Icon: AlertCircle },
  login:                      { label: 'Admin Login',          color: '#6b7280', bg: '#f9fafb',  Icon: User },
}

function getActionCfg(action) {
  return ACTION_CFG[action] || { label: action?.replace(/_/g, ' '), color: '#6b7280', bg: '#f9fafb', Icon: Activity }
}

export default function ActivityLogTab({ customer }) {
  const [logs, setLogs] = useState([])

  useEffect(() => {
    // Get audit logs for any of this customer's loan IDs
    const loanIds = new Set((customer.loans || []).map(l => l.id).filter(Boolean))
    const allLogs = auditService.getAll()
    const relevant = allLogs.filter(log =>
      (log.loanId && loanIds.has(log.loanId)) ||
      (log.details && typeof log.details === 'string' && log.details.includes(customer.phone))
    )
    setLogs(relevant)
  }, [customer])

  if (!logs.length) {
    return (
      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, padding: '48px 24px', textAlign: 'center' }}>
        <Clock size={40} style={{ margin: '0 auto 12px', color: '#d1d5db' }} />
        <div style={{ fontWeight: 600, color: '#374151' }}>No activity recorded</div>
        <div style={{ fontSize: '0.875rem', color: '#9ca3af', marginTop: 4 }}>Admin actions related to this patient will appear here.</div>
      </div>
    )
  }

  return (
    <div>
      <div style={{ marginBottom: 14 }}>
        <h3 style={{ margin: '0 0 4px', fontSize: '0.9375rem', fontWeight: 700, color: '#111827' }}>Activity Log</h3>
        <p style={{ margin: 0, fontSize: '0.8125rem', color: '#6b7280' }}>All admin actions recorded for this patient across all applications.</p>
      </div>

      <div style={{ background: '#fff', border: '1px solid #e5e7eb', borderRadius: 10, overflow: 'hidden' }}>
        {logs.map((log, i) => {
          const cfg = getActionCfg(log.action)
          return (
            <div key={log.id} style={{ display: 'flex', alignItems: 'flex-start', gap: 12, padding: '14px 20px', borderBottom: i < logs.length - 1 ? '1px solid #f3f4f6' : 'none' }}>
              <div style={{ width: 32, height: 32, borderRadius: 8, background: cfg.bg, display: 'flex', alignItems: 'center', justifyContent: 'center', flexShrink: 0, marginTop: 1 }}>
                <cfg.Icon size={15} color={cfg.color} />
              </div>
              <div style={{ flex: 1, minWidth: 0 }}>
                <div style={{ display: 'flex', alignItems: 'center', justifyContent: 'space-between', gap: 8, marginBottom: 2 }}>
                  <span style={{ fontWeight: 700, fontSize: '0.875rem', color: cfg.color }}>{cfg.label}</span>
                  <span style={{ fontSize: '0.75rem', color: '#9ca3af', whiteSpace: 'nowrap' }}>{fmtDateTime(log.timestamp)}</span>
                </div>
                <div style={{ display: 'flex', alignItems: 'center', gap: 6 }}>
                  <User size={11} color="#9ca3af" />
                  <span style={{ fontSize: '0.8125rem', color: '#6b7280' }}>{log.adminName || 'System'}</span>
                  {log.loanId && (
                    <>
                      <span style={{ color: '#d1d5db' }}>·</span>
                      <span style={{ fontSize: '0.75rem', fontFamily: 'monospace', color: '#9ca3af' }}>App {log.loanId.slice(-6)}</span>
                    </>
                  )}
                </div>
                {log.details && (
                  <div style={{ marginTop: 3, fontSize: '0.8125rem', color: '#374151', wordBreak: 'break-word' }}>{log.details}</div>
                )}
              </div>
            </div>
          )
        })}
      </div>
    </div>
  )
}
