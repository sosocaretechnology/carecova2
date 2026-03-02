import { useState, useEffect } from 'react'
import { adminService } from '../../services/adminService'
import { Landmark, TrendingUp, History } from 'lucide-react'

export default function Repayments() {
    const [transactions, setTransactions] = useState([])
    const [walletBalance, setWalletBalance] = useState(0)
    const [loading, setLoading] = useState(true)

    useEffect(() => {
        async function fetchData() {
            try {
                const txs = await adminService.getWalletTransactions()
                const balance = adminService.getWalletBalance()
                setTransactions(txs)
                setWalletBalance(balance)
            } catch (err) {
                console.error(err)
            } finally {
                setLoading(false)
            }
        }
        fetchData()
    }, [])

    if (loading) return <div className="admin-loading">Loading transactions...</div>

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
                            <tr><td colSpan="6" className="empty-table">No recent transactions recorded.</td></tr>
                        ) : (
                            transactions.map(tx => (
                                <tr key={tx.id}>
                                    <td className="font-mono text-sm text-muted">{tx.id}</td>
                                    <td>
                                        <div className="font-medium">{tx.applicantName}</div>
                                        <div className="text-xs text-muted">{tx.loanId}</div>
                                    </td>
                                    <td className="font-bold">{tx.amount.toLocaleString()}</td>
                                    <td className="text-sm">{tx.method}</td>
                                    <td className="text-sm">{new Date(tx.date).toLocaleString()}</td>
                                    <td>
                                        <span className={`risk-badge ${tx.status === 'Successful' ? 'risk-badge-low' : 'risk-badge-high'}`}>
                                            {tx.status}
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
