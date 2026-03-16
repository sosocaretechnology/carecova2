import { useState } from 'react'
import { asObject, asNumber, formatCurrency, formatDateTime, resolveAccountFromSection } from './utils'
import DojahResponseModal from './DojahResponseModal'

function InfoRow({ label, value }) {
  return (
    <div className="id-info-row">
      <span className="id-info-label">{label}</span>
      <span className="id-info-value">{value || '—'}</span>
    </div>
  )
}

export default function IdentityTab({ sections, loadSection, sectionLoading }) {
  const section = sections?.account
  const loaded = section?.status === 'success'
  const account = resolveAccountFromSection(section)
  const institution = asObject(account.institution)
  const [dojahModalOpen, setDojahModalOpen] = useState(false)

  const handleDojahClick = () => {
    setDojahModalOpen(true)
  }

  return (
    <div className="id-identity-tab">
      <div className="id-tab-header">
        <h3>Identity & Account Information</h3>
        <div style={{ display: 'flex', gap: '0.5rem' }}>
          <button
            className="button button--secondary button--sm"
            onClick={() => loadSection('account')}
            disabled={sectionLoading?.account}
          >
            {sectionLoading?.account ? 'Loading...' : loaded ? 'Refresh' : 'Load Account Data'}
          </button>
          <button
            type="button"
            className="button button--primary button--sm"
            onClick={handleDojahClick}
          >
            Verify with Dojah
          </button>
        </div>
      </div>
      <p className="text-muted text-sm mb-4">Confirms the person owns the account and verifies identity.</p>

      {!loaded ? (
        <div className="text-muted">Click "Load Account Data" above to fetch identity information.</div>
      ) : (
        <div className="id-info-grid">
          <div className="id-info-card">
            <h4>Account Details</h4>
            <InfoRow label="Account Name" value={account.name || account.account_name} />
            <InfoRow label="Account Number" value={account.accountNumber || account.account_number} />
            <InfoRow label="Bank / Institution" value={institution.name || institution.bank_name} />
            <InfoRow label="Account Type" value={account.type || account.account_type} />
            <InfoRow label="Currency" value={account.currency} />
            <InfoRow label="Balance" value={formatCurrency(asNumber(account.balance) ?? asNumber(asObject(account.account).balance))} />
          </div>
          <div className="id-info-card">
            <h4>Verification</h4>
            <InfoRow label="BVN" value={account.bvn} />
            <InfoRow label="Phone Number" value={account.phone || account.phone_number} />
            <InfoRow label="Email" value={account.email} />
            <InfoRow label="Account Age" value={account.account_age || account.accountAge} />
            <InfoRow label="Created At" value={formatDateTime(account.created_at || account.createdAt)} />
            <InfoRow label="Data Fetched" value={formatDateTime(section?.generatedAt)} />
          </div>
        </div>
      )}

      <DojahResponseModal
        open={dojahModalOpen}
        onClose={() => setDojahModalOpen(false)}
        response={null}
        loading={false}
      />
    </div>
  )
}
