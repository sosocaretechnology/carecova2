import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { trackingService } from '../../services/trackingService'
import { useAuth } from '../../hooks/useAuth'
import { Phone, MessageSquare, Save, AlertTriangle, Search, RefreshCcw } from 'lucide-react'

export default function RecoveryWorkbench() {
    const [loans, setLoans] = useState([])
    const [selectedLoan, setSelectedLoan] = useState(null)
    const [note, setNote] = useState('')
    const [loading, setLoading] = useState(true)
    const [searchTerm, setSearchTerm] = useState('')
    const { session } = useAuth()

    const fetchData = async () => {
        try {
            const all = await adminService.getAllLoans()
            let candidates = all.filter(l => l.status === 'overdue' || (l.dpd && l.dpd > 0) || l.status === 'active')
            if (session?.role === 'sales') {
                candidates = candidates.filter(l => l.assignedTo === session.username)
            }

            const tracked = await Promise.all(
                candidates.map(l => trackingService.trackLoan(l.id))
            )
            setLoans(tracked.filter(l => l.dpd > 0))
        } catch (err) {
            console.error(err)
        } finally {
            setLoading(false)
        }
    }

    useEffect(() => {
        fetchData()
    }, [session?.username, session?.role])

    const handleAddNote = async (id) => {
        if (!note.trim()) return
        try {
            await adminService.addRecoveryNote(id, note)
            setNote('')
            fetchData()
            alert('Recovery note saved.')
        } catch (err) {
            alert(err.message)
        }
    }

  const handleSimulateRepayment = async (type) => {
    if (!selectedLoan || !selectedLoan.repaymentSchedule) return
    const index = selectedLoan.repaymentSchedule.findIndex((p) => !p.paid)
    if (index === -1) {
      alert('All installments are already marked as paid for this loan.')
      return
    }

    const installment = selectedLoan.repaymentSchedule[index]
    const amount =
      type === 'full'
        ? installment.amount
        : Math.max(Math.round(installment.amount * 0.5), 1)

    try {
      await adminService.recordPayment(selectedLoan.id, index, {
        amount,
        method: 'Recovery Simulation',
        reference: `SIM-${Date.now()}`,
      })
      await fetchData()
      alert(
        type === 'full'
          ? 'Simulated full installment repayment recorded.'
          : 'Simulated partial installment repayment recorded.'
      )
    } catch (err) {
      alert(err.message)
    }
  }

    const filteredLoans = loans.filter(l =>
        (l.fullName || l.patientName || '').toLowerCase().includes(searchTerm.toLowerCase()) ||
        l.id.toLowerCase().includes(searchTerm.toLowerCase())
    )

    if (loading) return <div className="admin-loading">Loading recovery cases...</div>

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1>Recovery Workbench</h1>
                    <p>Manage overdue collections and contact logs</p>
                </div>
                <div className="search-box relative">
                    <Search className="absolute left-3 top-1/2 -translate-y-1/2 text-muted" size={18} />
                    <input
                        type="text"
                        placeholder="Search overdue loans..."
                        className="input pl-10"
                        value={searchTerm}
                        onChange={(e) => setSearchTerm(e.target.value)}
                    />
                </div>
            </div>

            <div className="dashboard-content-grid mt-6">
                <div className="dashboard-main-col">
                    <div className="admin-table-container">
                        <table className="admin-table">
                            <thead>
                                <tr>
                                    <th>Loan ID</th>
                                    <th>Patient</th>
                                    <th>Overdue (₦)</th>
                                    <th>DPD</th>
                                    <th>Last Action</th>
                                    <th>Action</th>
                                </tr>
                            </thead>
                            <tbody>
                                {filteredLoans.length === 0 ? (
                                    <tr><td colSpan="6" className="empty-table">No pending recovery cases.</td></tr>
                                ) : (
                                    filteredLoans.map(loan => (
                                        <tr key={loan.id} className={selectedLoan?.id === loan.id ? 'active-row' : ''}>
                                            <td className="font-mono text-sm">{loan.id}</td>
                                            <td>
                                                <div className="font-medium">{loan.fullName}</div>
                                                <div className="text-xs text-muted">{loan.phone}</div>
                                            </td>
                                            <td className="font-bold text-error">
                                                {(loan.nextPayment?.amount || 0).toLocaleString()}
                                            </td>
                                            <td>
                                                <span className="risk-badge risk-badge-high">{loan.dpd} Days</span>
                                            </td>
                                            <td className="text-xs text-muted italic">
                                                {loan.recoveryHistory?.[0]?.note || 'No attempts logged'}
                                            </td>
                                            <td>
                                                <button
                                                    className="button button--secondary text-xs"
                                                    onClick={() => setSelectedLoan(loan)}
                                                >
                                                    View / Call
                                                </button>
                                            </td>
                                        </tr>
                                    ))
                                )}
                            </tbody>
                        </table>
                    </div>
                </div>

                <div className="dashboard-side-col">
                    {selectedLoan ? (
                        <div className="recovery-panel bg-white p-4 rounded-lg shadow-sm border">
                            <h3 className="flex items-center gap-2 mb-4">
                                <AlertTriangle className="text-error" size={20} />
                                Recovery Action: {selectedLoan.id}
                            </h3>

                            <div className="contact-info mb-6 p-3 bg-gray-50 rounded">
                                <div className="text-sm font-bold">{selectedLoan.fullName}</div>
                                <div className="text-sm text-primary font-medium mb-2">{selectedLoan.phone}</div>
                                <div className="flex gap-2">
                                    <a href={`tel:${selectedLoan.phone}`} className="button button--primary text-xs flex-1">
                                        <Phone size={14} /> Call Now
                                    </a>
                                    <button className="button button--ghost text-xs flex-1">
                                        <MessageSquare size={14} /> SMS
                                    </button>
                                </div>
                            </div>

                            <div className="mt-4 p-3 bg-amber-50 rounded border border-amber-100">
                              <div className="flex items-center gap-2 mb-2">
                                <RefreshCcw size={14} className="text-amber-500" />
                                <span className="text-xs font-bold uppercase text-amber-700">
                                  Repayment Simulation (Demo)
                                </span>
                              </div>
                              <p className="text-xs text-amber-700 mb-2">
                                Use these buttons in demo mode to simulate what happens when a borrower pays
                                part or all of the next overdue installment. This updates the loan, wallet,
                                and repayment history.
                              </p>
                              <div className="flex gap-2">
                                <button
                                  type="button"
                                  className="button button--secondary text-xs flex-1"
                                  onClick={() => handleSimulateRepayment('full')}
                                >
                                  Simulate Full Payment
                                </button>
                                <button
                                  type="button"
                                  className="button button--ghost text-xs flex-1"
                                  onClick={() => handleSimulateRepayment('partial')}
                                >
                                  Simulate Partial
                                </button>
                              </div>
                            </div>

                            <div className="log-action">
                                <label className="text-xs font-bold uppercase text-muted block mb-2">Log Recovery Note</label>
                                <textarea
                                    className="input w-100 mb-3"
                                    rows="4"
                                    placeholder="e.g. Called client, promised to pay by Friday..."
                                    value={note}
                                    onChange={(e) => setNote(e.target.value)}
                                ></textarea>
                                <button
                                    className="button button--primary w-100"
                                    onClick={() => handleAddNote(selectedLoan.id)}
                                >
                                    <Save size={16} /> Save Log Entry
                                </button>
                            </div>

                            <div className="history-list mt-6">
                                <label className="text-xs font-bold uppercase text-muted block mb-2">Previous Attempts</label>
                                {selectedLoan.recoveryHistory?.length > 0 ? (
                                    <div className="space-y-3">
                                        {selectedLoan.recoveryHistory.map((h, i) => (
                                            <div key={i} className="text-xs border-left-large pl-2 py-1" style={{ borderLeft: '2px solid #e5e7eb' }}>
                                                <div className="font-bold">{h.adminName} <span className="text-muted font-normal ml-2">{new Date(h.date).toLocaleDateString()}</span></div>
                                                <div className="mt-1 text-gray-700">{h.note}</div>
                                            </div>
                                        ))}
                                    </div>
                                ) : (
                                    <div className="text-xs text-muted italic">No history recorded.</div>
                                )}
                            </div>
                        </div>
                    ) : (
                        <div className="empty-selection p-8 text-center bg-gray-50 rounded-lg border border-dashed">
                            <AlertTriangle size={32} className="text-muted mb-2 mx-auto" />
                            <p className="text-sm text-muted">Select a loan from the list to initiate recovery actions.</p>
                        </div>
                    )}
                </div>
            </div>
        </div>
    )
}
