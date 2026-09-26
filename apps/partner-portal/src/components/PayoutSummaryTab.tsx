import React, { useState, useEffect } from 'react';
import { partnerApi, PayoutSummary } from '../api/client';
import {
  DollarSign,
  CreditCard,
  ArrowUpRight,
  Clock,
  CheckCircle2,
  AlertCircle,
  Building2,
  Calendar,
  Send,
} from 'lucide-react';

export const PayoutSummaryTab: React.FC = () => {
  const [summary, setSummary] = useState<PayoutSummary | null>(null);
  const [loading, setLoading] = useState(true);
  const [requesting, setRequesting] = useState(false);
  const [payoutResult, setPayoutResult] = useState<any | null>(null);

  const loadSummary = async () => {
    try {
      setLoading(true);
      const res = await partnerApi.getPayoutSummary();
      setSummary(res);
    } catch (err: any) {
      console.warn('Failed to load payout summary:', err.message);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadSummary();
  }, []);

  const handleRequestPayout = async () => {
    try {
      setRequesting(true);
      setPayoutResult(null);
      const res = await partnerApi.requestPayout();
      setPayoutResult(res);
      await loadSummary();
    } catch (err: any) {
      alert(`Payout request failed: ${err.message}`);
    } finally {
      setRequesting(false);
    }
  };

  if (loading || !summary) {
    return (
      <div className="p-12 text-center text-slate-400 text-xs">
        Loading payout financials & settlement ledger...
      </div>
    );
  }

  return (
    <div className="space-y-6">
      {/* KPI Financial Overview Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-4 gap-4">
        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Gross Booking Sales</span>
            <DollarSign className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-slate-900">
            ${summary.gross_revenue.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-500 font-medium mt-1">
            {summary.completed_bookings_count} paid reservations
          </p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Platform Commission</span>
            <span className="text-[10px] font-bold bg-slate-100 text-slate-600 px-1.5 py-0.5 rounded">
              {(summary.platform_fee_rate * 100).toFixed(0)}%
            </span>
          </div>
          <div className="text-2xl font-black text-slate-700">
            -${summary.platform_commission.toFixed(2)}
          </div>
          <p className="text-[11px] text-slate-400 font-medium mt-1">Standard partner fee</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Available for Payout</span>
            <ArrowUpRight className="w-4 h-4 text-emerald-600" />
          </div>
          <div className="text-2xl font-black text-emerald-600">
            ${summary.available_payout.toFixed(2)}
          </div>
          <p className="text-[11px] text-emerald-600 font-semibold mt-1">Ready for transfer</p>
        </div>

        <div className="bg-white p-5 rounded-3xl border border-slate-200 shadow-sm">
          <div className="flex items-center justify-between text-slate-500 mb-2">
            <span className="text-xs font-bold uppercase tracking-wider">Pending Clearance</span>
            <Clock className="w-4 h-4 text-amber-600" />
          </div>
          <div className="text-2xl font-black text-slate-800">
            ${summary.pending_clearance.toFixed(2)}
          </div>
          <p className="text-[11px] text-amber-600 font-medium mt-1">Clears in 24-48 hours</p>
        </div>
      </div>

      {/* Payout Success Feedback */}
      {payoutResult && (
        <div className="p-4 bg-emerald-50 border border-emerald-200 rounded-2xl flex items-start space-x-3 text-emerald-950 text-xs animate-in fade-in">
          <CheckCircle2 className="w-5 h-5 text-emerald-600 shrink-0 mt-0.5" />
          <div className="space-y-1">
            <h4 className="font-bold text-emerald-900">{payoutResult.message}</h4>
            <p className="text-emerald-700">
              Transfer Reference: <code className="font-mono font-bold">{payoutResult.payout_reference}</code> • Amount: ${payoutResult.amount?.toFixed(2)} • Arrival: {payoutResult.estimated_arrival}
            </p>
          </div>
        </div>
      )}

      {/* Payout Settlement Account & Request Action Bar */}
      <div className="bg-gradient-to-r from-slate-900 to-indigo-950 text-white rounded-3xl p-6 sm:p-8 shadow-xl flex flex-col md:flex-row md:items-center justify-between gap-6">
        <div className="space-y-2">
          <div className="inline-flex items-center space-x-2 text-xs font-bold text-emerald-400">
            <CreditCard className="w-4 h-4" />
            <span>Connected Settlement Account</span>
          </div>
          <h3 className="text-lg font-bold">
            Bank Account: <span className="font-mono text-emerald-300">{summary.payout_account}</span>
          </h3>
          <p className="text-xs text-slate-300">
            Automatic Schedule: <strong className="text-white">{summary.payout_schedule}</strong> (Direct SEPA / ACH Wire)
          </p>
        </div>

        <button
          onClick={handleRequestPayout}
          disabled={requesting || summary.available_payout < 20}
          className="px-6 py-3 bg-emerald-500 hover:bg-emerald-400 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg transition-all flex items-center justify-center space-x-2 shrink-0 self-start md:self-auto"
        >
          {requesting ? (
            <span>Processing Transfer...</span>
          ) : (
            <>
              <Send className="w-4 h-4" />
              <span>Request Immediate Payout (${summary.available_payout.toFixed(2)})</span>
            </>
          )}
        </button>
      </div>

      {/* Settlements History Table */}
      <div className="bg-white rounded-3xl border border-slate-200 shadow-sm overflow-hidden">
        <div className="p-6 border-b border-slate-100 flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-slate-900">Recent Settlement History (Stubbed)</h3>
            <p className="text-xs text-slate-500">
              Electronic funds transfers initiated by the platform billing system.
            </p>
          </div>
          <span className="text-[11px] font-mono bg-slate-100 text-slate-600 px-2.5 py-1 rounded-lg">
            Currency: {summary.currency}
          </span>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs">
            <thead className="bg-slate-50 border-b border-slate-100 text-slate-500 uppercase tracking-wider font-semibold text-[10px]">
              <tr>
                <th className="py-3.5 px-6">Settlement ID</th>
                <th className="py-3.5 px-6">Date</th>
                <th className="py-3.5 px-6">Payout Method</th>
                <th className="py-3.5 px-6">Reference</th>
                <th className="py-3.5 px-6">Net Amount</th>
                <th className="py-3.5 px-6">Status</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-100 font-medium">
              {summary.settlements.map((s) => (
                <tr key={s.id} className="hover:bg-slate-50/60 transition-colors">
                  <td className="py-4 px-6 font-mono text-slate-900 font-bold">{s.id}</td>
                  <td className="py-4 px-6 text-slate-600">
                    {new Date(s.date).toLocaleDateString([], { year: 'numeric', month: 'short', day: 'numeric' })}
                  </td>
                  <td className="py-4 px-6 text-slate-700">{s.method}</td>
                  <td className="py-4 px-6 font-mono text-slate-500">{s.reference}</td>
                  <td className="py-4 px-6 font-bold text-emerald-600 text-sm">
                    +${Number(s.amount).toFixed(2)}
                  </td>
                  <td className="py-4 px-6">
                    <span className="inline-flex items-center gap-1 text-[11px] font-bold px-2 py-0.5 rounded-full bg-emerald-50 text-emerald-700 border border-emerald-200 capitalize">
                      <CheckCircle2 className="w-3 h-3 text-emerald-600" />
                      <span>{s.status}</span>
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
};
