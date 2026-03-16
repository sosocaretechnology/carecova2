/**
 * Standardized modal for Dojah Identity, Personal & Account Information verification response.
 * Uses the app's modal design (modal-overlay, modal-content, modal-header, modal-body, modal-footer).
 */
export default function DojahResponseModal({ open, onClose, response = null, loading = false }) {
  if (!open) return null

  const status = response?.status ?? 'pending'
  const statusLabel = status === 'success' || status === 'passed' ? 'Verified' : status === 'failed' || status === 'error' ? 'Failed' : 'Pending'
  const statusClass = status === 'success' || status === 'passed' ? 'dojah-status--success' : status === 'failed' || status === 'error' ? 'dojah-status--failed' : 'dojah-status--pending'

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content dojah-modal" onClick={(e) => e.stopPropagation()}>
        <div className="modal-header">
          <h2>Dojah Identity & KYC Verification</h2>
          <button type="button" className="modal-close" onClick={onClose} aria-label="Close">
            ×
          </button>
        </div>
        <div className="modal-body">
          {loading ? (
            <div className="dojah-modal-loading">Running verification…</div>
          ) : response ? (
            <>
              <div className="dojah-modal-status">
                <span className={`dojah-status-badge ${statusClass}`}>{statusLabel}</span>
                {response.message && <p className="dojah-modal-message">{response.message}</p>}
              </div>
              {(response.personal || response.account) && (
                <div className="dojah-modal-sections">
                  {response.personal && (
                    <div className="dojah-section">
                      <h4>Personal Information</h4>
                      <dl className="dojah-dl">
                        {Object.entries(response.personal).map(([key, value]) => (
                          value != null && value !== '' && (
                            <div key={key} className="dojah-dl-row">
                              <dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</dt>
                              <dd>{String(value)}</dd>
                            </div>
                          )
                        ))}
                      </dl>
                    </div>
                  )}
                  {response.account && (
                    <div className="dojah-section">
                      <h4>Account Information</h4>
                      <dl className="dojah-dl">
                        {Object.entries(response.account).map(([key, value]) => (
                          value != null && value !== '' && (
                            <div key={key} className="dojah-dl-row">
                              <dt>{key.replace(/([A-Z])/g, ' $1').replace(/^./, (s) => s.toUpperCase())}</dt>
                              <dd>{String(value)}</dd>
                            </div>
                          )
                        ))}
                      </dl>
                    </div>
                  )}
                </div>
              )}
              {response?.raw && (
                <details className="dojah-raw">
                  <summary>Raw response</summary>
                  <pre>{typeof response.raw === 'string' ? response.raw : JSON.stringify(response.raw, null, 2)}</pre>
                </details>
              )}
            </>
          ) : (
            <div className="dojah-modal-placeholder">
              <p>Identity & KYC (Dojah) verification is run by the backend.</p>
              <p>When an API is available, this modal will show verification status, personal information, and account information here.</p>
              <p className="dojah-modal-hint">Use the <strong>Verification & Risk</strong> section on the application detail page to view current identity status.</p>
            </div>
          )}
        </div>
        <div className="modal-footer">
          <button type="button" className="button button--primary" onClick={onClose}>
            Close
          </button>
        </div>
      </div>
    </div>
  )
}
