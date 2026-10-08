import { useState } from 'react'

const panelStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 18,
  marginBottom: 14,
}

function humanize(value) {
  return String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()
}

function JsonNode({ label, value, depth = 0 }) {
  if (Array.isArray(value)) {
    return (
      <details open={depth < 1} style={{ borderTop: '1px solid #eef2f7', padding: '8px 0' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#334155' }}>
          {humanize(label)} <span style={{ color: '#94a3b8', fontWeight: 500 }}>({value.length})</span>
        </summary>
        <div style={{ paddingLeft: 14 }}>
          {value.length ? value.map((item, index) => (
            <JsonNode key={`${label}-${index}`} label={`Record ${index + 1}`} value={item} depth={depth + 1} />
          )) : <div style={{ padding: 8, color: '#94a3b8' }}>No entries</div>}
        </div>
      </details>
    )
  }

  if (value && typeof value === 'object') {
    const entries = Object.entries(value)
    return (
      <details open={depth < 1} style={{ borderTop: '1px solid #eef2f7', padding: '8px 0' }}>
        <summary style={{ cursor: 'pointer', fontWeight: 700, color: '#334155' }}>{humanize(label)}</summary>
        <div style={{ paddingLeft: 14 }}>
          {entries.length ? entries.map(([key, child]) => (
            <JsonNode key={`${label}-${key}`} label={key} value={child} depth={depth + 1} />
          )) : <div style={{ padding: 8, color: '#94a3b8' }}>No fields</div>}
        </div>
      </details>
    )
  }

  const formatted = value === null || value === undefined
    ? 'null'
    : typeof value === 'boolean'
      ? value ? 'Yes' : 'No'
      : String(value)

  return (
    <div style={{ display: 'grid', gridTemplateColumns: 'minmax(170px, 30%) minmax(0, 1fr)', gap: 12, padding: '7px 0', borderTop: '1px solid #f1f5f9' }}>
      <span style={{ color: '#64748b', fontSize: 13, overflowWrap: 'anywhere' }}>{humanize(label)}</span>
      <span style={{ color: '#1e293b', fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>{formatted}</span>
    </div>
  )
}

function downloadReport(report, summary, applicationLabel) {
  const blob = new Blob([JSON.stringify({ summary, report }, null, 2)], { type: 'application/json' })
  const url = URL.createObjectURL(blob)
  const link = document.createElement('a')
  const safeLabel = String(applicationLabel || 'application').replace(/[^a-z0-9_-]/gi, '-')
  link.href = url
  link.download = `firstcentral-${safeLabel}.json`
  document.body.appendChild(link)
  link.click()
  link.remove()
  URL.revokeObjectURL(url)
}

export default function FirstCentralReportViewer({ report, summary, checkedAt, applicationLabel }) {
  const [copied, setCopied] = useState(false)

  if (!report) {
    return (
      <div style={{ ...panelStyle, color: '#64748b' }}>
        Full FirstCentral report details will appear here after a bureau check is run and saved.
      </div>
    )
  }

  const productSections = [
    ['consumerMatch', 'Consumer match'],
    ['detailedCredit', 'Consumer Detailed Credit · Product 45'],
    ['iScore', 'iScore · Product 70'],
  ].filter(([key]) => Object.prototype.hasOwnProperty.call(report, key))
  const productKeys = new Set(['consumerMatch', 'detailedCredit', 'iScore', 'iScoreStatus'])
  const additionalFields = Object.fromEntries(
    Object.entries(report).filter(([key]) => !productKeys.has(key)),
  )

  const copyJson = async () => {
    try {
      await navigator.clipboard.writeText(JSON.stringify({ summary, report }, null, 2))
      setCopied(true)
      window.setTimeout(() => setCopied(false), 1800)
    } catch {
      setCopied(false)
    }
  }

  return (
    <section style={panelStyle}>
      <header style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'flex-start', gap: 14, flexWrap: 'wrap', marginBottom: 14 }}>
        <div>
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>Full FirstCentral response</h3>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>
            Saved {checkedAt ? new Date(checkedAt).toLocaleString('en-NG') : 'time unavailable'} · all JSON fields returned by the requested products are shown below.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="button button--secondary button--compact" onClick={copyJson}>{copied ? 'Copied' : 'Copy JSON'}</button>
          <button type="button" className="button button--secondary button--compact" onClick={() => downloadReport(report, summary, applicationLabel)}>Download JSON</button>
        </div>
      </header>

      {summary && (
        <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 10, marginBottom: 18 }}>
          {[
            ['iScore', summary.iScore],
            ['Repayment rating', summary.repaymentRating ?? summary.riskBand],
            ['Facilities', summary.totalFacilities],
            ['Performing', summary.performingFacilities],
            ['Non-performing', summary.nonPerformingFacilities],
            ['Outstanding', summary.totalOutstanding == null ? '—' : `₦${Number(summary.totalOutstanding).toLocaleString()}`],
            ['Overdue', summary.totalOverdue == null ? '—' : `₦${Number(summary.totalOverdue).toLocaleString()}`],
            ['Recent enquiries', summary.recentEnquiries],
          ].map(([label, value]) => (
            <div key={label} style={{ background: '#f8fafc', border: '1px solid #e2e8f0', borderRadius: 8, padding: '10px 12px' }}>
              <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, textTransform: 'uppercase', letterSpacing: '.04em' }}>{label}</div>
              <div style={{ marginTop: 4, color: '#0f172a', fontWeight: 700, overflowWrap: 'anywhere' }}>{value ?? '—'}</div>
            </div>
          ))}
        </div>
      )}

      {report.iScoreStatus === 'unavailable' && (
        <div style={{ padding: 12, marginBottom: 12, background: '#fff7ed', borderRadius: 8, color: '#9a3412', fontSize: 13 }}>
          FirstCentral did not return the iScore product for this check. The detailed credit response is still saved below.
        </div>
      )}
      {report.iScoreStatus === 'available' && (
        <div style={{ marginBottom: 12, color: '#64748b', fontSize: 13 }}>iScore product response saved.</div>
      )}

      {productSections.length ? productSections.map(([key, title]) => (
        <details key={key} open style={{ marginTop: 10, border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
          <summary style={{ cursor: 'pointer', color: '#1e293b', fontSize: 14, fontWeight: 800 }}>{title}</summary>
          <div style={{ marginTop: 8 }}><JsonNode label={title} value={report[key]} depth={0} /></div>
        </details>
      )) : (
        <JsonNode label="FirstCentral response" value={report} />
      )}
      {Object.keys(additionalFields).length > 0 && (
        <details style={{ marginTop: 10, border: '1px solid #e2e8f0', borderRadius: 8, padding: '12px 14px' }}>
          <summary style={{ cursor: 'pointer', color: '#1e293b', fontSize: 14, fontWeight: 800 }}>Additional captured fields</summary>
          <div style={{ marginTop: 8 }}><JsonNode label="Additional fields" value={additionalFields} depth={0} /></div>
        </details>
      )}
    </section>
  )
}
