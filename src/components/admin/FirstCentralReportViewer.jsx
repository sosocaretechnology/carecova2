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

function collectReportSections(value, fallbackLabel = 'Report details') {
  if (Array.isArray(value)) {
    return value.flatMap((item, index) => {
      if (isObject(item)) {
        const entries = Object.entries(item)
        if (entries.length === 1) {
          const [label, child] = entries[0]
          if (/^record\s*\d+$/i.test(label)) return collectReportSections(child, `${fallbackLabel} ${index + 1}`)
          return [{ label, value: child }]
        }
        if (entries.length > 1) return entries.map(([label, child]) => ({ label, value: child }))
      }
      return [{ label: `${fallbackLabel} ${index + 1}`, value: item }]
    })
  }

  if (isObject(value)) {
    const entries = Object.entries(value)
    if (entries.length === 1) {
      const [label, child] = entries[0]
      if (/^record\s*\d+$/i.test(label)) return collectReportSections(child, fallbackLabel)
      return [{ label, value: child }]
    }
    return entries.map(([label, child]) => ({ label, value: child }))
  }

  return value === null || value === undefined ? [] : [{ label: fallbackLabel, value }]
}

function sectionGroup(label) {
  const name = humanize(label).toLowerCase()
  if (/subject|personal|identity|demograph|consumer match|identification/.test(name)) return 'identity'
  if (/enquir|search request/.test(name)) return 'enquiries'
  if (/payment|delinquen|repay|arrear|overdue|default/.test(name)) return 'payments'
  if (/credit account|credit agreement|facility|facilities|loan|credit limit/.test(name)) return 'credit'
  return 'other'
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
  const [activeTab, setActiveTab] = useState('overview')

  if (!report) {
    return (
      <div style={{ ...panelStyle, color: '#64748b' }}>
        Full FirstCentral report details will appear here after a bureau check is run and saved.
      </div>
    )
  }

  const productKeys = new Set(['consumerMatch', 'detailedCredit', 'iScore', 'iScoreStatus'])
  const additionalFields = Object.fromEntries(
    Object.entries(report).filter(([key]) => !productKeys.has(key)),
  )
  const bureauSections = collectReportSections(report.detailedCredit)
  const sectionsByGroup = bureauSections.reduce((groups, section) => {
    const group = sectionGroup(section.label)
    groups[group].push(section)
    return groups
  }, { identity: [], credit: [], payments: [], enquiries: [], other: [] })
  const hasConsumerMatch = Object.prototype.hasOwnProperty.call(report, 'consumerMatch')
  const hasIScore = Object.prototype.hasOwnProperty.call(report, 'iScore')
  const tabs = [
    { key: 'overview', label: 'Overview' },
    ...((hasConsumerMatch || sectionsByGroup.identity.length) ? [{ key: 'identity', label: 'Identity', count: sectionsByGroup.identity.length + Number(hasConsumerMatch) }] : []),
    ...(sectionsByGroup.credit.length ? [{ key: 'credit', label: 'Credit facilities', count: sectionsByGroup.credit.length }] : []),
    ...(sectionsByGroup.payments.length ? [{ key: 'payments', label: 'Repayment history', count: sectionsByGroup.payments.length }] : []),
    ...(sectionsByGroup.enquiries.length ? [{ key: 'enquiries', label: 'Enquiries', count: sectionsByGroup.enquiries.length }] : []),
    ...(hasIScore ? [{ key: 'score', label: 'Score details' }] : []),
    ...((sectionsByGroup.other.length || Object.keys(additionalFields).length) ? [{ key: 'other', label: 'Other data', count: sectionsByGroup.other.length + Object.keys(additionalFields).length }] : []),
  ]
  const selectedTab = tabs.some((tab) => tab.key === activeTab) ? activeTab : tabs[0].key

  const handleTabKeyDown = (event, index) => {
    let nextIndex
    if (event.key === 'ArrowRight' || event.key === 'ArrowDown') nextIndex = (index + 1) % tabs.length
    if (event.key === 'ArrowLeft' || event.key === 'ArrowUp') nextIndex = (index - 1 + tabs.length) % tabs.length
    if (event.key === 'Home') nextIndex = 0
    if (event.key === 'End') nextIndex = tabs.length - 1
    if (nextIndex !== undefined) {
      event.preventDefault()
      const nextTab = tabs[nextIndex]
      setActiveTab(nextTab.key)
      document.getElementById(`firstcentral-tab-${nextTab.key}`)?.focus()
    }
  }

  const renderSections = (sections) => sections.map((section, index) => (
    <JsonNode key={`${section.label}-${index}`} label={section.label} value={section.value} depth={0} />
  ))

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

      <div role="tablist" aria-label="FirstCentral report sections" style={{ display: 'flex', gap: 4, overflowX: 'auto', borderBottom: '1px solid #e2e8f0', marginBottom: 14 }}>
        {tabs.map((tab, index) => {
          const selected = selectedTab === tab.key
          return (
            <button
              key={tab.key}
              id={`firstcentral-tab-${tab.key}`}
              type="button"
              role="tab"
              aria-selected={selected}
              aria-controls={`firstcentral-panel-${tab.key}`}
              tabIndex={selected ? 0 : -1}
              onClick={() => setActiveTab(tab.key)}
              onKeyDown={(event) => handleTabKeyDown(event, index)}
              style={{ flex: '0 0 auto', padding: '10px 13px', border: 0, borderBottom: selected ? '3px solid #059669' : '3px solid transparent', background: 'transparent', color: selected ? '#047857' : '#64748b', fontSize: 13, fontWeight: selected ? 750 : 600, cursor: 'pointer' }}
            >
              {tab.label}{tab.count !== undefined && <span style={{ marginLeft: 6, color: selected ? '#047857' : '#94a3b8' }}>({tab.count})</span>}
            </button>
          )
        })}
      </div>

      <div id={`firstcentral-panel-${selectedTab}`} role="tabpanel" aria-labelledby={`firstcentral-tab-${selectedTab}`} tabIndex={0}>
        {selectedTab === 'overview' && (
          <>
            {summary ? (
              <>
                <div style={{ marginBottom: 8, color: '#334155', fontSize: 13, fontWeight: 750 }}>Credit overview</div>
                <div style={{ display: 'grid', gridTemplateColumns: 'repeat(auto-fit, minmax(145px, 1fr))', gap: 8 }}>
                  {[
                    ['iScore', summary.iScore],
                    ['Repayment rating', summary.repaymentRating ?? summary.riskBand],
                    ['Facilities', summary.totalFacilities],
                    ['Performing', summary.performingFacilities],
                    ['Non-performing', summary.nonPerformingFacilities],
                    ['Outstanding', formatNaira(summary.totalOutstanding)],
                    ['Overdue', formatNaira(summary.totalOverdue)],
                    ['Recent enquiries', summary.recentEnquiries],
                  ].map(([label, value]) => <ValueField key={label} label={label} value={value} />)}
                </div>
              </>
            ) : <div style={{ color: '#64748b', fontSize: 13 }}>No summary metrics were returned for this check.</div>}
            {report.iScoreStatus === 'unavailable' && (
              <div style={{ padding: 12, marginTop: 12, background: '#fff7ed', borderRadius: 8, color: '#9a3412', fontSize: 13 }}>
                FirstCentral did not return the iScore product for this check. The detailed credit response is still saved in the other tabs.
              </div>
            )}
            {report.iScoreStatus === 'available' && <div style={{ marginTop: 12, color: '#64748b', fontSize: 13 }}>iScore product response saved.</div>}
          </>
        )}
        {selectedTab === 'identity' && (
          <>
            {hasConsumerMatch && <JsonNode label="Consumer match" value={report.consumerMatch} depth={0} />}
            {renderSections(sectionsByGroup.identity)}
          </>
        )}
        {selectedTab === 'credit' && renderSections(sectionsByGroup.credit)}
        {selectedTab === 'payments' && renderSections(sectionsByGroup.payments)}
        {selectedTab === 'enquiries' && renderSections(sectionsByGroup.enquiries)}
        {selectedTab === 'score' && <JsonNode label="iScore · Product 70" value={report.iScore} depth={0} />}
        {selectedTab === 'other' && (
          <>
            {renderSections(sectionsByGroup.other)}
            {Object.keys(additionalFields).length > 0 && <JsonNode label="Additional captured fields" value={additionalFields} depth={0} />}
          </>
        )}
      </div>
    </section>
  )
}
