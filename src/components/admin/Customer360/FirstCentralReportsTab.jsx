import { BadgeCheck, CalendarClock } from 'lucide-react'
import FirstCentralReportViewer from '../FirstCentralReportViewer'

export default function FirstCentralReportsTab({ reports = [] }) {
  if (!reports.length) {
    return (
      <div className="detail-card" style={{ padding: 28, textAlign: 'center', color: '#64748b' }}>
        <BadgeCheck size={28} style={{ marginBottom: 8, color: '#94a3b8' }} />
        <h3 style={{ margin: '0 0 6px', color: '#1e293b' }}>No FirstCentral reports yet</h3>
        <p style={{ margin: 0 }}>Run a bureau check from one of this customer’s applications. Saved reports will appear here for credit review.</p>
      </div>
    )
  }

  return (
    <div style={{ display: 'grid', gap: 18 }}>
      {reports.map((entry, index) => {
        const label = entry.applicationCode || `Application ${String(entry.applicationId || '').slice(-8)}`
        return (
          <section key={entry.applicationId || index}>
            <div style={{ display: 'flex', alignItems: 'center', gap: 8, margin: '2px 0 10px', color: '#334155' }}>
              <BadgeCheck size={17} color="#4f46e5" />
              <strong>{label}</strong>
              {entry.fullName && <span style={{ color: '#64748b' }}>· {entry.fullName}</span>}
              <span style={{ display: 'inline-flex', alignItems: 'center', gap: 5, marginLeft: 'auto', color: '#64748b', fontSize: 12 }}>
                <CalendarClock size={14} />
                {entry.checkedAt ? new Date(entry.checkedAt).toLocaleString('en-NG') : 'Date unavailable'}
              </span>
            </div>
            <FirstCentralReportViewer
              report={entry.report}
              summary={entry.summary}
              checkedAt={entry.checkedAt}
              applicationLabel={label}
            />
          </section>
        )
      })}
    </div>
  )
}
