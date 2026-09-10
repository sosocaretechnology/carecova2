
import React, { useState } from 'react';
import { LoanApplication, LoanStatus } from '../types';
import { getRiskConfig, saveRiskConfig } from '../src/data/riskConfig';

interface AdminProps {
  loans: LoanApplication[];
  onUpdate: (id: string, updates: Partial<LoanApplication>) => void;
}

const Admin: React.FC<AdminProps> = ({ loans, onUpdate }) => {
  const [filter, setFilter] = useState<LoanStatus | 'ALL'>('ALL');
  const [selectedLoan, setSelectedLoan] = useState<LoanApplication | null>(null);
  const [view, setView] = useState<'loans' | 'settings'>('loans');

  const [config, setConfig] = useState(() => getRiskConfig());
  const [interestInput, setInterestInput] = useState(() => (getRiskConfig().interestRate * 100).toFixed(0));
  const [settingsSaved, setSettingsSaved] = useState(false);

  const filteredLoans = filter === 'ALL' ? loans : loans.filter(l => l.status === filter);

  const handleAction = (id: string, status: LoanStatus) => {
    onUpdate(id, { status });
    setSelectedLoan(null);
  };

  const calculateDueDate = (startDate: string, monthsToAdd: number) => {
    const date = new Date(startDate);
    date.setMonth(date.getMonth() + monthsToAdd);
    return date.toLocaleDateString('en-NG', { day: 'numeric', month: 'short', year: 'numeric' });
  };

  const handleSaveSettings = () => {
    const parsed = parseFloat(interestInput);
    if (isNaN(parsed) || parsed < 0 || parsed > 100) return;
    const rate = parsed / 100;
    const updated = { ...config, interestRate: rate, lendingInterestRatePerMonth: rate, compoundMonthlyRate: rate };
    saveRiskConfig(updated);
    setConfig(updated);
    setSettingsSaved(true);
    setTimeout(() => setSettingsSaved(false), 3000);
  };

  const loanInterestRate = config.interestRate;

  return (
    <div className="bg-slate-50 min-h-screen py-12">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex flex-col md:flex-row justify-between items-start md:items-center mb-12 gap-6">
          <div>
            <h1 className="text-3xl font-extrabold text-slate-900">Admin Control</h1>
            <p className="text-slate-500 font-medium">Manage and review medical loan applications.</p>
          </div>
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setView('loans')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${
                view === 'loans'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              Applications
            </button>
            <button
              onClick={() => setView('settings')}
              className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${
                view === 'settings'
                  ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                  : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
              }`}
            >
              Settings
            </button>
          </div>
        </div>

        {view === 'settings' && (
          <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 p-10 max-w-lg">
            <h2 className="text-lg font-extrabold text-slate-900 mb-1">Loan Settings</h2>
            <p className="text-sm text-slate-400 font-medium mb-8">Changes apply immediately to all calculations across the platform.</p>

            <div className="mb-8">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-3">Monthly Interest Rate (%)</label>
              <div className="flex items-center gap-4">
                <input
                  type="number"
                  min="0"
                  max="100"
                  step="0.1"
                  value={interestInput}
                  onChange={(e) => setInterestInput(e.target.value)}
                  className="w-32 border-2 border-slate-100 rounded-xl px-4 py-3 text-xl font-black text-slate-900 focus:outline-none focus:border-blue-400 transition-colors"
                />
                <span className="text-2xl font-black text-slate-300">%</span>
                <span className="text-sm text-slate-400">per month</span>
              </div>
              <p className="text-xs text-slate-400 mt-2">Current live rate: <span className="font-bold text-blue-600">{(loanInterestRate * 100).toFixed(0)}%</span></p>
            </div>

            <button
              onClick={handleSaveSettings}
              className="px-8 py-4 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-lg shadow-blue-100"
            >
              {settingsSaved ? 'Saved!' : 'Save Changes'}
            </button>
          </div>
        )}

        {view === 'loans' && (
          <>
            <div className="flex flex-wrap gap-2 mb-6">
              {(['ALL', ...Object.values(LoanStatus)] as const).map(f => (
                <button
                  key={f}
                  onClick={() => setFilter(f)}
                  className={`px-4 py-2 rounded-xl text-xs font-bold transition-all uppercase tracking-widest ${
                    filter === f
                      ? 'bg-blue-600 text-white shadow-lg shadow-blue-100'
                      : 'bg-white text-slate-500 border border-slate-100 hover:bg-slate-50'
                  }`}
                >
                  {f}
                </button>
              ))}
            </div>

            <div className="bg-white rounded-3xl shadow-xl shadow-slate-200/50 border border-slate-100 overflow-hidden">
              <div className="overflow-x-auto">
                <table className="min-w-full divide-y divide-slate-100">
                  <thead className="bg-slate-50">
                    <tr>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Patient</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Clinic & Plan</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Amount</th>
                      <th className="px-8 py-5 text-left text-xs font-bold text-slate-400 uppercase tracking-widest">Status</th>
                      <th className="px-8 py-5 text-right text-xs font-bold text-slate-400 uppercase tracking-widest">Actions</th>
                    </tr>
                  </thead>
                  <tbody className="divide-y divide-slate-50 font-medium">
                    {filteredLoans.length === 0 ? (
                      <tr>
                        <td colSpan={5} className="px-8 py-20 text-center text-slate-400">No applications match your criteria.</td>
                      </tr>
                    ) : (
                      filteredLoans.map((loan) => (
                        <tr key={loan.id} className="hover:bg-slate-50/50 transition-colors">
                          <td className="px-8 py-6">
                            <div className="text-sm font-bold text-slate-900">{loan.fullName}</div>
                            <div className="text-[10px] text-blue-600 font-bold uppercase tracking-widest mt-0.5">{loan.id}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm text-slate-700">{loan.hospitalId}</div>
                            <div className="text-xs text-slate-400">{loan.treatmentType}</div>
                          </td>
                          <td className="px-8 py-6">
                            <div className="text-sm font-black text-slate-900">₦{loan.estimatedCost.toLocaleString()}</div>
                            <div className="text-xs text-slate-400">{loan.repaymentDuration} Months</div>
                          </td>
                          <td className="px-8 py-6">
                            <span className={`px-3 py-1 rounded-full text-[10px] font-black uppercase tracking-widest border ${
                              loan.status === LoanStatus.PENDING ? 'bg-amber-50 text-amber-600 border-amber-100' :
                              loan.status === LoanStatus.APPROVED ? 'bg-blue-50 text-blue-600 border-blue-100' :
                              loan.status === LoanStatus.REJECTED ? 'bg-rose-50 text-rose-600 border-rose-100' :
                              'bg-emerald-50 text-emerald-600 border-emerald-100'
                            }`}>
                              {loan.status}
                            </span>
                          </td>
                          <td className="px-8 py-6 text-right">
                            <button
                              onClick={() => setSelectedLoan(loan)}
                              className="px-4 py-2 rounded-lg bg-slate-100 text-slate-900 text-xs font-bold hover:bg-blue-600 hover:text-white transition-all"
                            >
                              View Details
                            </button>
                          </td>
                        </tr>
                      ))
                    )}
                  </tbody>
                </table>
              </div>
            </div>
          </>
        )}
      </div>

      {selectedLoan && (
        <div className="fixed inset-0 bg-slate-900/60 backdrop-blur-sm z-[60] flex items-center justify-center p-4">
          <div className="bg-white rounded-[2rem] max-w-2xl w-full max-h-[90vh] overflow-y-auto shadow-3xl animate-in zoom-in-95 duration-200">
            <div className="p-10 border-b border-slate-100 flex justify-between items-center sticky top-0 bg-white z-10">
              <div>
                <h2 className="text-2xl font-extrabold text-slate-900">Loan Review</h2>
                <p className="text-xs font-bold text-blue-600 uppercase tracking-widest mt-1">{selectedLoan.id}</p>
              </div>
              <button onClick={() => setSelectedLoan(null)} className="p-2 rounded-full hover:bg-slate-100 text-slate-400 transition-colors">
                <svg className="w-6 h-6" fill="none" stroke="currentColor" viewBox="0 0 24 24"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2.5} d="M6 18L18 6M6 6l12 12" /></svg>
              </button>
            </div>

            <div className="p-10 space-y-10">
              <div className="grid grid-cols-2 gap-8">
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Patient</h4>
                  <p className="font-bold text-slate-900">{selectedLoan.fullName}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Contact</h4>
                  <p className="text-sm font-bold text-slate-900">{selectedLoan.phone}</p>
                  <p className="text-xs text-slate-500">{selectedLoan.email}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Medical Facility</h4>
                  <p className="font-bold text-slate-900">{selectedLoan.hospitalId}</p>
                </div>
                <div>
                  <h4 className="text-[10px] font-black text-slate-400 uppercase tracking-widest mb-1">Loan Value</h4>
                  <p className="font-extrabold text-blue-600">₦{selectedLoan.estimatedCost.toLocaleString()}</p>
                  <p className="text-xs text-slate-400">{selectedLoan.repaymentDuration} month tenure · {(loanInterestRate * 100).toFixed(0)}% /mo</p>
                </div>
              </div>

              <div className="border-t border-slate-100 pt-8">
                <h3 className="text-xs font-black text-slate-900 uppercase tracking-[0.2em] mb-6">Repayment Breakdown</h3>
                {(() => {
                  const totalRepayment = selectedLoan.estimatedCost * (1 + loanInterestRate * selectedLoan.repaymentDuration);
                  const monthlyInstallment = totalRepayment / selectedLoan.repaymentDuration;
                  return (
                    <>
                      <div className="flex justify-between text-xs text-slate-500 font-bold mb-4 px-1">
                        <span>Total repayment: <span className="text-slate-800">₦{totalRepayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span></span>
                        <span>Rate: <span className="text-blue-600">{(loanInterestRate * 100).toFixed(0)}% /mo</span></span>
                      </div>
                      <div className="space-y-4">
                        {Array.from({ length: selectedLoan.repaymentDuration }).map((_, i) => (
                          <div key={i} className="flex items-center justify-between p-5 bg-slate-50 rounded-2xl border border-slate-100">
                            <div className="flex items-center gap-5">
                              <div className="w-10 h-10 rounded-xl bg-white border border-slate-200 flex items-center justify-center text-xs font-bold text-slate-400">
                                {i + 1}
                              </div>
                              <div>
                                <p className="text-sm font-black text-slate-900">₦{monthlyInstallment.toLocaleString(undefined, { minimumFractionDigits: 2, maximumFractionDigits: 2 })}</p>
                                <p className="text-[10px] text-slate-500 font-bold uppercase tracking-wide">Due: {calculateDueDate(selectedLoan.appliedAt, i + 1)}</p>
                              </div>
                            </div>
                            <span className="px-3 py-1 bg-white border border-slate-200 rounded-full text-[10px] font-black uppercase text-slate-300 tracking-widest">
                              Unpaid
                            </span>
                          </div>
                        ))}
                      </div>
                    </>
                  );
                })()}
              </div>

              {selectedLoan.status === LoanStatus.PENDING && (
                <div className="flex gap-6 pt-6">
                  <button
                    onClick={() => handleAction(selectedLoan.id, LoanStatus.APPROVED)}
                    className="flex-grow py-5 bg-blue-600 text-white font-black rounded-2xl hover:bg-blue-700 transition-all shadow-xl shadow-blue-100"
                  >
                    Approve Application
                  </button>
                  <button
                    onClick={() => handleAction(selectedLoan.id, LoanStatus.REJECTED)}
                    className="flex-grow py-5 bg-rose-50 text-rose-600 border border-rose-100 font-black rounded-2xl hover:bg-rose-100 transition-all"
                  >
                    Decline
                  </button>
                </div>
              )}

              {selectedLoan.status === LoanStatus.APPROVED && (
                <button
                  onClick={() => handleAction(selectedLoan.id, LoanStatus.DISBURSED)}
                  className="w-full py-5 bg-emerald-600 text-white font-black rounded-2xl hover:bg-emerald-700 transition-all shadow-xl shadow-emerald-100"
                >
                  Confirm Payment Disbursed
                </button>
              )}
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Admin;
