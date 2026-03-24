import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { Landmark, TrendingUp, History } from 'lucide-react'
import FullScreenLoader from '../../components/ui/FullScreenLoader'

export default function Repayments() {
    const [transactions, setTransactions] = useState([])
    const [walletBalance, setWalletBalance] = useState(0)
    const [loading, setLoading] = useState(true)
    const [error, setError] = useState('')

    useEffect(() => {
        async function fetchData() {
            try {
                setError('')
                const [txData, balance] = await Promise.all([
                    adminService.getWalletTransactions({ ownerType: 'organization', currency: 'NGN' }),
                    adminService.getWalletBalance({ ownerType: 'organization', currency: 'NGN' }),
                ])
                const txs = Array.isArray(txData) ? txData : (txData?.items || txData?.data || [])
                setTransactions(txs)
                setWalletBalance(Number(balance) || 0)
            } catch (err) {
                console.error(err)
                setError(err.message || 'Unable to load wallet data')
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) return <FullScreenLoader label="Loading repayments & wallet…" />

    return (
        <div className="admin-page">
            <div className="admin-page-header">
                <div>
                    <h1>Org Wallet & Repayments</h1>
                    <p>Track incoming installments and collection attempts</p>
                </div>
                <div className="wallet-card-summary flex items-center gap-6 bg-white p-4 rounded-lg shadow-sm border border-gray-100">
                    <div className="wallet-icon bg-success-subtle p-3 rounded-full">
                        <Landmark size={24} className="text-success" />
                    </div>
                    <div>
                        <span className="text-xs text-muted block uppercase font-bold tracking-wider">Available Balance</span>
                        <span className="text-2xl font-black">₦{walletBalance.toLocaleString()}</span>
                    </div>
                </div>
            </div>

            {error ? (
                <div className="alert-box alert-error mt-4">{error}</div>
            ) : null}
            {!error && transactions.length === 0 && (
                <div className="alert-box alert-warning mt-4 text-xs">
                    No wallet transactions were returned from the backend. If you have already disbursed loans or recorded repayments,
                    the backend may not yet be writing ledger entries to the organization wallet.
                </div>
            )}

            <div className="admin-table-container mt-6">
                <div className="p-4 border-bottom flex items-center gap-2">
                    <History size={18} className="text-muted" />
                    <h2 className="text-sm font-bold uppercase tracking-widest text-muted m-0">Transaction History</h2>
                </div>
                <table className="admin-table">
                    <thead>
                        <tr>
                            <th>Transaction ID</th>
                            <th>Applicant</th>
                            <th>Amount (₦)</th>
                            <th>Method</th>
                            <th>Date</th>
                            <th>Status</th>
                        </tr>
                    </thead>
                    <tbody>
                        {transactions.length === 0 ? (
                            <tr>
                                <td colSpan="6" className="empty-table">
                                    No recent transactions recorded from the backend wallet.
                                    <br />
                                    <span className="text-xs text-muted">
                                        If you have already approved and disbursed loans but still see zero here,
                                        it likely means the backend has not started creating organization wallet
                                        ledger entries yet.
                                    </span>
                                </td>
                            </tr>
                        ) : (
                            transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="font-mono text-sm text-muted">{tx.id}</td>
                                    <td>
                                        <div className="font-medium">{tx.applicantName || tx.customerName || '—'}</div>
                                        <div className="text-xs text-muted">{tx.loanId || tx.reference || '—'}</div>
                                    </td>
                                    <td className="font-bold">
                                        {Number(
                                            tx.amount ??
                                            tx.amountNaira ??
                                            (Number(tx.amountKobo || 0) / 100)
                                        ).toLocaleString()}
                                    </td>
                                    <td className="text-sm">{tx.method || tx.paymentChannel || tx.type || '—'}</td>
                                    <td className="text-sm">{new Date(tx.date || tx.createdAt || tx.paidAt || Date.now()).toLocaleString()}</td>
                                    <td>
                                        <span className={`risk-badge ${String(tx.status || '').toLowerCase() === 'successful' || String(tx.status || '').toLowerCase() === 'success' || String(tx.status || '').toLowerCase() === 'paid' ? 'risk-badge-low' : 'risk-badge-high'}`}>
                                            {tx.status || '—'}
                                        </span>
                                    </td>
                                </tr>
                            ))
                        )}
                    </tbody>
                </table>
            </div>
        </div>
    )
}
