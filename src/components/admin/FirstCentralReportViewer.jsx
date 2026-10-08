import { useState } from 'react'

const panelStyle = {
  background: '#fff',
  border: '1px solid #e2e8f0',
  borderRadius: 10,
  padding: 18,
  marginBottom: 14,
}

const sectionStyle = {
  border: '1px solid #e2e8f0',
  borderRadius: 8,
  background: '#fff',
}

function humanize(value) {
  const label = String(value)
    .replace(/([a-z0-9])([A-Z])/g, '$1 $2')
    .replace(/[_-]+/g, ' ')
    .replace(/\s+/g, ' ')
    .trim()

  return label
    .replace(/\bBvn\b/gi, 'BVN')
    .replace(/\bNin\b/gi, 'NIN')
    .replace(/\bId\b/g, 'ID')
    .replace(/\bI Score\b/gi, 'iScore')
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value)
}

function formatValue(value) {
  if (value === null || value === undefined || value === '') return '—'
  if (typeof value === 'boolean') return value ? 'Yes' : 'No'
  return String(value)
}

function ValueField({ label, value }) {
  return (
    <div style={{ minWidth: 0, padding: '9px 10px', background: '#f8fafc', borderRadius: 6 }}>
      <div style={{ color: '#64748b', fontSize: 11, fontWeight: 700, marginBottom: 4 }}>{humanize(label)}</div>
      <div style={{ color: '#1e293b', fontSize: 13, fontWeight: 600, overflowWrap: 'anywhere', whiteSpace: 'pre-wrap' }}>
        {formatValue(value)}
      </div>
    </div>
  )
}

function SectionSummary({ label, count }) {
  return (
    <summary style={{ cursor: 'pointer', listStylePosition: 'inside', padding: '11px 13px', color: '#334155', fontWeight: 750 }}>
      {humanize(label)}
      {count !== undefined && <span style={{ marginLeft: 7, color: '#94a3b8', fontWeight: 500 }}>({count})</span>}
    </summary>
  )
}

function JsonNode({ label, value, depth = 0 }) {
  if (Array.isArray(value)) {
    return (
      <details open={depth === 0} style={{ ...sectionStyle, marginTop: 8 }}>
        <SectionSummary label={label} count={value.length} />
        <div style={{ display: 'grid', gap: 8, padding: '0 10px 10px' }}>
          {value.length ? value.map((item, index) => {
            // FirstCentral wraps named report sections in anonymous one-key records.
            // Promote that key to the heading so the UI shows "Credit Account Summary"
            // instead of the unhelpful "Record 4".
            const entries = isObject(item) ? Object.entries(item) : []
            const [sectionName, sectionValue] = entries[0] || []
            const isNamedSection = entries.length === 1 && (Array.isArray(sectionValue) || isObject(sectionValue))

            return (
              <JsonNode
                key={`${label}-${index}`}
                label={isNamedSection ? sectionName : `Entry ${index + 1}`}
                value={isNamedSection ? sectionValue : item}
                depth={depth + 1}
              />
            )
          }) : <div style={{ padding: '4px 2px', color: '#64748b', fontSize: 13 }}>No entries returned.</div>}
        </div>
      </details>
    )
  }

  if (isObject(value)) {
    const entries = Object.entries(value)
    const fields = entries.filter(([, child]) => !Array.isArray(child) && !isObject(child))
    const nested = entries.filter(([, child]) => Array.isArray(child) || isObject(child))

    if (!entries.length) {
      return (
        <div style={{ ...sectionStyle, padding: 12, color: '#64748b', fontSize: 13 }}>
          {humanize(label)}: no fields returned.
        </div>
      )
    }

    return (
      <section style={{ ...sectionStyle, padding: 11, marginTop: 8 }}>
        <div style={{ color: '#334155', fontSize: 13, fontWeight: 750, marginBottom: fields.length ? 9 : 0 }}>{humanize(label)}</div>
        {fields.length > 0 && (
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(min(100%, 210px), 1fr))', gap: 7 }}>
            {fields.map(([key, child]) => <ValueField key={key} label={key} value={child} />)}
          </div>
        )}
        {nested.length > 0 && (
          <div style={{ display: 'grid', gap: 7, marginTop: fields.length ? 8 : 0 }}>
            {nested.map(([key, child]) => <JsonNode key={key} label={key} value={child} depth={depth + 1} />)}
          </div>
        )}
      </section>
    )
  }

  return <ValueField label={label} value={value} />
}

function formatNaira(value) {
  if (value === null || value === undefined || value === '') return '—'
  const amount = Number(value)
  return Number.isFinite(amount) ? `₦${amount.toLocaleString('en-NG')}` : String(value)
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
          <h3 style={{ margin: 0, color: '#0f172a', fontSize: 18 }}>FirstCentral credit report</h3>
          <p style={{ margin: '5px 0 0', color: '#64748b', fontSize: 13 }}>
            Saved {checkedAt ? new Date(checkedAt).toLocaleString('en-NG') : 'time unavailable'} · report sections and returned fields.
          </p>
        </div>
        <div style={{ display: 'flex', gap: 8, flexWrap: 'wrap' }}>
          <button type="button" className="button button--secondary button--compact" onClick={copyJson}>{copied ? 'Copied' : 'Copy JSON'}</button>
          <button type="button" className="button button--secondary button--compact" onClick={() => downloadReport(report, summary, applicationLabel)}>Download JSON</button>
        </div>
      </header>

      {summary && (
        <div>
          <div style={{ marginBottom: 8, color: '#334155', fontSize: 13, fontWeight: 750 }}>Credit overview</div>
          <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8, marginBottom: 16 }}>
            {[
              ['iScore', summary.iScore],
              ['Repayment rating', summary.repaymentRating ?? summary.riskBand],
              ['Facilities', summary.totalFacilities],
              ['Performing', summary.performingFacilities],
              ['Non-performing', summary.nonPerformingFacilities],
              ['Outstanding', formatNaira(summary.totalOutstanding)],
              ['Overdue', formatNaira(summary.totalOverdue)],
              ['Recent enquiries', summary.recentEnquiries],
            ].map(([label, value]) => (
              <ValueField key={label} label={label} value={value} />
            ))}
          </div>
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
        <details key={key} open style={{ ...sectionStyle, marginTop: 10 }}>
          <SectionSummary label={title} />
          <div style={{ padding: '0 10px 10px' }}><JsonNode label={title} value={report[key]} depth={0} /></div>
        </details>
      )) : (
        <JsonNode label="FirstCentral response" value={report} depth={0} />
      )}
      {Object.keys(additionalFields).length > 0 && (
        <details style={{ ...sectionStyle, marginTop: 10 }}>
          <SectionSummary label="Additional captured fields" />
          <div style={{ padding: '0 10px 10px' }}><JsonNode label="Additional fields" value={additionalFields} depth={0} /></div>
        </details>
      )}
    </section>
  )
}
