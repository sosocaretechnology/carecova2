import StatusBadge from '../../StatusBadge'
import { useRiskBadge } from '../../../hooks/useAffordabilityCheck'

export default function ApplicantSnapshot({ loan }) {
    const getDocumentStatus = (docKey) => {
        if (!loan.documents) return 'missing'
        const doc = loan.documents[docKey]
        if (!doc) return 'missing'
        return doc.status || 'uploaded'
    }

    const formatDocName = (key) => key.replace(/_/g, ' ').replace(/\b\w/g, l => l.toUpperCase())

    // Safe extraction of nested structures from new Apply hook output
    const location = loan.location || { state: loan.state, city: loan.city }
    const hospital = loan.hospital || { name: loan.hospitalName || loan.hospital, isPartnerSuggested: false }
    const riskMetrics = loan.internalRiskMetrics || loan.affordability || {}

    // Fallbacks if not set
    const badgeInfo = useRiskBadge(riskMetrics.riskLevel || 'LOW')
    const income = loan.monthlyIncome || loan.monthlyIncomeRange || 0;
    const expenses = loan.monthlyExpenses || 0;
    const dispIncome = riskMetrics.disposableIncome || (income - expenses);

    return (
        <div className="detail-column column-snapshot">
            <div className="detail-card">
                <h2>Applicant Identity</h2>
                <div className="identity-header">
                    {loan.applicantPhoto?.dataUrl && (
                        <div className="identity-photo">
                            <img
                                src={loan.applicantPhoto.dataUrl}
                                alt={loan.fullName || loan.patientName}
                                className="identity-photo-img"
                            />
                        </div>
                    )}
                    <div className="identity-primary">
                        <div className="info-group">
                            <div className="info-label">Full Name</div>
                            <div className="info-value text-lg font-bold">{loan.fullName || loan.patientName}</div>
                        </div>
                        <div className="info-grid mt-3">
                            <div className="info-group">
                                <div className="info-label">Phone</div>
                                <div className="info-value">{loan.phone}</div>
                            </div>
                            <div className="info-group">
                                <div className="info-label">Email</div>
                                <div className="info-value">{loan.email || '—'}</div>
                            </div>
                            <div className="info-group">
                                <div className="info-label">Location (Triangulated)</div>
                                <div className="info-value">{location.city}, {location.state}</div>
                            </div>
                        </div>
                    </div>
                </div>
            </div>

            <div className="detail-card">
                <h2>Employment & Income</h2>
                <div className="info-grid">
                    <div className="info-group">
                        <div className="info-label">Sector</div>
                        <div className="info-value capitalize font-bold">{loan.employmentSector || loan.employmentType || '—'}</div>
                    </div>
                    <div className="info-group col-span-2">
                        <div className="info-label">Employer / Business</div>
                        <div className="info-value">{loan.employerName || '—'}</div>
                    </div>
                    <div className="info-group">
                        <div className="info-label">Stated Income</div>
                        <div className="info-value font-medium text-primary">
                            ₦{income ? income.toLocaleString() : '—'}
                        </div>
                    </div>
                    <div className="info-group">
                        <div className="info-label">Stated Expenses</div>
                        <div className="info-value font-medium">
                            ₦{expenses ? expenses.toLocaleString() : '—'}
                        </div>
                    </div>
                </div>
            </div>

            <div className="detail-card bg-sage-light" style={{ borderLeft: `4px solid ${riskMetrics.riskLevel === 'HIGH' ? '#ef4444' : riskMetrics.riskLevel === 'MEDIUM' ? '#f59e0b' : '#10b981'}` }}>
                <div style={{ display: 'flex', justifyContent: 'space-between', alignItems: 'center' }}>
                    <h2 style={{ margin: 0 }}>Internal Risk & Affordability</h2>
                    <span className={`badge ${badgeInfo.className}`}>{badgeInfo.label}</span>
                </div>
                <div className="info-grid mt-3">
                    <div className="info-group">
                        <div className="info-label">Disposable Income</div>
                        <div className={`info-value font-bold ${dispIncome <= 0 ? 'text-danger' : 'text-success'}`}>
                            ₦{dispIncome.toLocaleString()}
                        </div>
                    </div>
                    <div className="info-group">
                        <div className="info-label">DTI Ratio (Affordability)</div>
                        <div className="info-value font-bold">
                            {riskMetrics.affordabilityRatio ? (riskMetrics.affordabilityRatio * 100).toFixed(1) + '%' : '—'}
                        </div>
                    </div>
                    {riskMetrics.riskReasons && riskMetrics.riskReasons.length > 0 && (
                        <div className="info-group col-span-2" style={{ marginTop: '10px' }}>
                            <div className="info-label text-danger">Risk Flags:</div>
                            <ul style={{ color: '#ef4444', fontSize: '0.85rem', margin: 0, paddingLeft: '20px' }}>
                                {riskMetrics.riskReasons.map((r, i) => <li key={i}>{r}</li>)}
                            </ul>
                        </div>
                    )}
                </div>
            </div>

            <div className="detail-card">
                <h2>Medical Context</h2>
                <div className="info-grid">
                    <div className="info-group col-span-2">
                        <div className="info-label">Treatment Category</div>
                        <div className="info-value font-medium">{loan.treatmentCategory}</div>
                    </div>
                    <div className="info-group col-span-2">
                        <div className="info-label">Hospital</div>
                        <div className="info-value">
                            {hospital.name || 'Any partner near me'}
                            {hospital.isPartnerSuggested && <span className="badge badge-success ml-2" style={{ fontSize: '0.7em' }}>Partner Range</span>}
                        </div>
                    </div>
                    <div className="info-group col-span-2">
                        <div className="info-label">Description</div>
                        <div className="info-value text-sm">{loan.healthDescription || loan.procedureOrService || '—'}</div>
                    </div>
                </div>
            </div>

            <div className="detail-card">
                <h2>Completeness & Case File</h2>
                <div className="doc-list">
                    {['id_document', 'treatment_estimate', 'payslip'].map(docKey => {
                        const status = getDocumentStatus(docKey)
                        const doc = loan.documents?.[docKey]
                        return (
                            <div key={docKey} className="doc-item">
                                <div className="doc-info">
                                    <span className="doc-icon">📄</span>
                                    <div>
                                        <div className="doc-name">{formatDocName(docKey)}</div>
                                        {doc && doc.fileName && <div className="doc-meta">{doc.fileName}</div>}
                                    </div>
                                </div>
                                <div className={`doc-status status-${status}`}>
                                    {status === 'uploaded' ? '✓ Uploaded' : '❌ Missing'}
                                </div>
                            </div>
                        )
                    })}
                </div>
            </div>

            {loan.coBorrower && (
                <div className="detail-card" style={{ borderLeft: '4px solid #3b82f6' }}>
                    <h2>Co-Borrower</h2>
                    <div className="info-grid">
                        <div className="info-group">
                            <div className="info-label">Name</div>
                            <div className="info-value">{loan.coBorrower.name}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">Phone</div>
                            <div className="info-value">{loan.coBorrower.phone}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">Relationship</div>
                            <div className="info-value">{loan.coBorrower.relationship}</div>
                        </div>
                        <div className="info-group">
                            <div className="info-label">Sector</div>
                            <div className="info-value capitalize">{loan.coBorrower.employmentSector || '—'}</div>
                        </div>
                        <div className="info-group col-span-2">
                            <div className="info-label">Income</div>
                            <div className="info-value">₦{loan.coBorrower.monthlyIncome ? loan.coBorrower.monthlyIncome.toLocaleString() : '—'}</div>
                        </div>
                    </div>
                </div>
            )}
        </div>
    )
}
