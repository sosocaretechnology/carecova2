
import React, { useState } from 'react';
import { Link } from 'react-router-dom';
import { getRiskConfig } from '../src/data/riskConfig';

const Calculator: React.FC = () => {
  const [amount, setAmount] = useState<number>(250000);
  const [months, setMonths] = useState<number>(6);

  const config = getRiskConfig();
  const interestRate = config.interestRate;
  const totalRepayment = amount * (1 + (interestRate * months));
  const monthlyInstallment = totalRepayment / months;

  return (
    <div className="bg-slate-50 py-20 min-h-screen">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-16">
          <h1 className="text-4xl font-extrabold text-slate-900 tracking-tight">Repayment Calculator</h1>
          <p className="mt-4 text-lg text-slate-600 font-medium">Estimate your monthly installments before you apply.</p>
        </div>

        <div className="bg-white rounded-[3rem] shadow-2xl shadow-slate-200 border border-slate-100 overflow-hidden lg:flex">
          <div className="p-10 lg:w-1/2 bg-white">
            <div className="mb-10">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Procedure Cost (₦)</label>
              <input 
                type="range" 
                min="50000" 
                max="5000000" 
                step="50000"
                value={amount}
                onChange={(e) => setAmount(parseInt(e.target.value))}
                className="w-full h-2 bg-slate-100 rounded-lg appearance-none cursor-pointer accent-blue-600 mb-4"
              />
              <div className="flex justify-between items-center">
                <span className="text-sm font-bold text-slate-400">₦50k</span>
                <span className="text-2xl font-black text-blue-600">₦{amount.toLocaleString()}</span>
                <span className="text-sm font-bold text-slate-400">₦5M</span>
              </div>
            </div>

            <div className="mb-10">
              <label className="block text-xs font-black text-slate-400 uppercase tracking-widest mb-4">Tenure (Months)</label>
              <div className="grid grid-cols-3 gap-4">
                {[3, 6, 12].map(m => (
                  <button
                    key={m}
                    onClick={() => setMonths(m)}
                    className={`py-4 rounded-2xl font-bold transition-all border-2 ${
                      months === m 
                        ? 'bg-blue-600 border-blue-600 text-white shadow-lg shadow-blue-100' 
                        : 'bg-white border-slate-100 text-slate-500 hover:border-blue-200'
                    }`}
                  >
                    {m} Months
                  </button>
                ))}
              </div>
            </div>

            <p className="text-xs text-slate-400 italic">
              * This is an estimate based on average rates. Final terms will be provided after credit assessment.
            </p>
          </div>

          <div className="p-10 lg:w-1/2 bg-blue-600 text-white flex flex-col justify-center text-center">
            <span className="text-sm font-bold text-blue-100 uppercase tracking-widest mb-2">Estimated Monthly Payment</span>
            <div className="text-5xl font-black mb-10">₦{monthlyInstallment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</div>
            
            <div className="space-y-4 mb-10">
              <div className="flex justify-between text-sm border-b border-blue-500 pb-2">
                <span className="text-blue-200">Total Repayment</span>
                <span className="font-bold">₦{totalRepayment.toLocaleString(undefined, { maximumFractionDigits: 0 })}</span>
              </div>
              <div className="flex justify-between text-sm border-b border-blue-500 pb-2">
                <span className="text-blue-200">Monthly Interest Rate</span>
                <span className="font-bold">{(interestRate * 100).toFixed(0)}%</span>
              </div>
            </div>

            <Link 
              to="/apply" 
              className="w-full py-5 bg-white text-blue-600 font-black rounded-2xl text-lg hover:bg-slate-50 transition-all shadow-xl"
            >
              Apply with these Terms
            </Link>
          </div>
        </div>
      </div>
    </div>
  );
};

export default Calculator;
