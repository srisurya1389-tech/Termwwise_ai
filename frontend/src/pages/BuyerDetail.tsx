import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  LineChart as ChartIcon,
  Trophy,
  History,
  AlertTriangle,
  CreditCard
} from 'lucide-react';

import {
  ResponsiveContainer,
  ComposedChart,
  Line,
  Bar,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  Legend
} from 'recharts';
import { api } from '../api/client';
import type { BuyerDetail as BuyerDetailType, Invoice, Negotiation, Outcome, BuyerPaymentAnalysis } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function BuyerDetail() {
  const { buyerId } = useParams<{ buyerId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [buyer, setBuyer] = useState<BuyerDetailType | null>(null);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [outcomes, setOutcomes] = useState<Outcome[]>([]);
  const [paymentAnalysis, setPaymentAnalysis] = useState<BuyerPaymentAnalysis | null>(null);

  useEffect(() => {
    async function loadBuyerData() {
      if (!buyerId) return;
      try {
        setLoading(true);
        const buyerDetail = await api.getBuyer(Number(buyerId));
        setBuyer(buyerDetail);

        // Fetch related data
        const [invList, negList, outList, analysisData] = await Promise.all([
          api.getInvoices(undefined, buyerDetail.name),
          api.getNegotiations(),
          api.getOutcomes(),
          api.getBuyerPaymentAnalysis(buyerDetail.id).catch(() => null),
        ]);

        setInvoices(invList);
        setPaymentAnalysis(analysisData);
        
        // Filter negotiations and outcomes by buyer name/id
        const filteredNegs = negList.filter((n) => n.buyer_id === buyerDetail.id);
        const filteredOuts = outList.filter((o) => o.buyer_id === buyerDetail.id);
        
        setNegotiations(filteredNegs);
        setOutcomes(filteredOuts);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load buyer details.');
      } finally {
        setLoading(false);
      }
    }
    loadBuyerData();

  }, [buyerId]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Buyer Profile">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !buyer) {
    return (
      <DashboardLayout pageTitle="Buyer Profile">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0C0C12] border border-[#171822] rounded-2xl max-w-md mx-auto mt-12">
          <AlertTriangle className="text-rose-500 mb-4" size={40} />
          <h3 className="text-sm font-semibold text-white mb-2">Buyer Profile Not Found</h3>
          <p className="text-xs text-gray-500 mb-6">{error || `Buyer detail was not found.`}</p>
          <button 
            onClick={() => navigate('/buyers')}
            className="px-4 py-2 bg-[#12121B] border border-[#1C1D26] hover:bg-[#1A1A26] rounded-xl text-xs font-semibold cursor-pointer text-white"
          >
            Back to Buyers List
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Format currency helpers
  const formatLakhs = (amount: number) => {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  };

  // Compile Recharts chart data: Agreed vs Actual payment days for paid invoices
  const paidInvoices = invoices
    .filter((inv) => inv.payment_status === 'Paid' && inv.actual_payment_date)
    .sort((a, b) => new Date(a.invoice_date).getTime() - new Date(b.invoice_date).getTime());

  const chartData = paidInvoices.map((inv) => {
    const invoiceDate = new Date(inv.invoice_date);
    const actualPaymentDate = new Date(inv.actual_payment_date!);
    const actualDays = Math.round(
      (actualPaymentDate.getTime() - invoiceDate.getTime()) / (1000 * 60 * 60 * 24)
    );

    return {
      invoiceId: inv.invoice_id,
      agreedTerm: inv.agreed_payment_days,
      actualDays: actualDays,
    };
  });

  // Calculate learning performance loops
  const totalOutcomesCount = outcomes.length;
  const successfulOutcomes = outcomes.filter(o => o.outcome !== 'NEGOTIATION_FAILED').length;
  const successRate = totalOutcomesCount > 0 ? (successfulOutcomes / totalOutcomesCount) * 100 : null;
  
  const avgImprovement = totalOutcomesCount > 0 
    ? outcomes.reduce((acc, curr) => acc + curr.days_improved, 0) / totalOutcomesCount 
    : null;

  const mapes = outcomes.filter(o => o.prediction_error !== null).map(o => Math.abs(o.prediction_error!));
  const avgMape = mapes.length > 0 ? mapes.reduce((acc, curr) => acc + curr, 0) / mapes.length : null;

  return (
    <DashboardLayout pageTitle={`Buyer Profile • ${buyer.name}`}>
      <div className="space-y-6 text-left">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/buyers')}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer transition font-medium"
        >
          <ArrowLeft size={14} />
          Back to Buyers list
        </button>

        {/* Profile Summary Banner */}
        <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div className="space-y-1">
            <h2 className="text-2xl font-black text-white">{buyer.name}</h2>
            <div className="text-xs text-gray-500 font-mono">
              SYSTEM PROFILE REGISTERED ON {new Date(buyer.created_at).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
            </div>
          </div>
          <RiskBadge level={buyer.intelligence.risk_level} />
        </div>

        {/* Dynamic Statistic Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Average payment Speed</div>
            <div className="text-2xl font-black text-white mt-1.5 font-mono">
              {buyer.intelligence.average_payment_days ? `${buyer.intelligence.average_payment_days.toFixed(0)} Days` : '—'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Median Payment Days</div>
            <div className="text-2xl font-black text-white mt-1.5 font-mono">
              {buyer.intelligence.median_payment_days ? `${buyer.intelligence.median_payment_days.toFixed(0)} Days` : '—'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Late Payment Rate</div>
            <div className="text-2xl font-black text-white mt-1.5 font-mono">
              {buyer.intelligence.late_payment_percentage ? `${buyer.intelligence.late_payment_percentage.toFixed(0)}%` : '—'}
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Outstanding Liability</div>
            <div className="text-2xl font-black text-white mt-1.5 font-mono">
              {formatLakhs(buyer.intelligence.outstanding_amount)}
            </div>
          </div>
        </div>

        {/* Prediction Confidence Banner */}
        <ConfidenceIndicator 
          confidence={buyer.intelligence.confidence} 
          historyCount={buyer.intelligence.invoice_count} 
        />

        {/* Charts & Analytics */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Payment History Timeline Chart */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <ChartIcon size={14} className="text-purple-400" />
                Agreed vs Actual Payment days
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Compares contractual agreed net terms with actual payment times of paid invoices.
              </p>
            </div>

            {chartData.length > 0 ? (
              <div className="h-64 w-full">
                <ResponsiveContainer width="100%" height="100%">
                  <ComposedChart data={chartData} margin={{ top: 10, right: 10, left: -25, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" stroke="#161720" vertical={false} />
                    <XAxis dataKey="invoiceId" stroke="#4B5563" fontSize={10} tickLine={false} />
                    <YAxis stroke="#4B5563" fontSize={10} tickLine={false} />
                    <Tooltip 
                      contentStyle={{ backgroundColor: '#0F0F16', borderColor: '#1F202B', borderRadius: '12px' }}
                      labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#FFF' }}
                      itemStyle={{ fontSize: '10px' }}
                    />
                    <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                    <Bar name="Agreed Payment Days" dataKey="agreedTerm" fill="#1E1F30" radius={[4, 4, 0, 0]} barSize={20} />
                    <Line name="Actual Payment Days" type="monotone" dataKey="actualDays" stroke="#8B5CF6" strokeWidth={2} dot={{ fill: '#8B5CF6', r: 3 }} />
                  </ComposedChart>
                </ResponsiveContainer>
              </div>
            ) : (
              <div className="flex items-center justify-center h-64 bg-[#0A0A0E] border border-dashed border-[#1B1B28] rounded-xl text-xs text-gray-500">
                No paid transaction history to plot.
              </div>
            )}
          </div>

          {/* TermWise Closed Loop Learning Profiles */}
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col justify-between">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5 mb-4">
                <Trophy size={14} className="text-purple-400" />
                TermWise Learning Loop
              </h3>
              
              <div className="space-y-4">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Negotiation Success Rate</div>
                  <div className="text-base font-bold text-white mt-1">
                    {successRate !== null ? `${successRate.toFixed(0)}%` : 'Insufficient history'}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">
                    {totalOutcomesCount} total closed negotiation processes.
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Avg. Agreed Term Reduction</div>
                  <div className="text-base font-bold text-white mt-1 text-emerald-400">
                    {avgImprovement !== null ? `-${avgImprovement.toFixed(0)} Days` : 'Insufficient history'}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">
                    Average improvement over target contractual net terms.
                  </div>
                </div>

                <div>
                  <div className="text-[10px] text-gray-500 uppercase tracking-wider">Prediction Accuracy (MAPE)</div>
                  <div className="text-base font-bold text-white mt-1 text-indigo-400">
                    {avgMape !== null ? `±${avgMape.toFixed(1)} Days` : 'Insufficient history'}
                  </div>
                  <div className="text-[9px] text-gray-500 mt-0.5">
                    Mean absolute forecast timing deviation.
                  </div>
                </div>
              </div>
            </div>

            <div className="text-[10px] text-gray-500 leading-relaxed pt-4 border-t border-[#12121A]">
              Learned values automatically update the buyer risk profiles in subsequent forecasts.
            </div>
          </div>
        </div>

        {/* Payment Analysis & Settlement History (Stage 10) */}
        {paymentAnalysis && (
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] text-left space-y-6">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161722] pb-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <CreditCard size={14} className="text-purple-400" />
                  Payment Settlement & Settlement Analytics
                </h3>
                <p className="text-[11px] text-gray-500 mt-0.5">
                  Verified cash received and reconciliation metrics across all invoices.
                </p>
              </div>
              <span className="text-xs font-mono font-bold text-emerald-400 bg-emerald-950/30 border border-emerald-800/30 px-3 py-1 rounded-full">
                {paymentAnalysis.successful_payment_count} Settled Payments
              </span>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4">
              <div className="bg-[#0E0E14] p-4 rounded-xl border border-[#161722]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Cash Received</div>
                <div className="text-lg font-bold text-emerald-400 font-mono mt-1">₹{paymentAnalysis.total_paid.toLocaleString('en-IN')}</div>
              </div>

              <div className="bg-[#0E0E14] p-4 rounded-xl border border-[#161722]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Total Outstanding</div>
                <div className="text-lg font-bold text-amber-400 font-mono mt-1">₹{paymentAnalysis.total_outstanding.toLocaleString('en-IN')}</div>
              </div>

              <div className="bg-[#0E0E14] p-4 rounded-xl border border-[#161722]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Partial Invoices Count</div>
                <div className="text-lg font-bold text-indigo-300 font-mono mt-1">{paymentAnalysis.partial_payment_count}</div>
              </div>

              <div className="bg-[#0E0E14] p-4 rounded-xl border border-[#161722]">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Late-Payment Rate</div>
                <div className="text-lg font-bold text-rose-400 font-mono mt-1">{paymentAnalysis.late_payment_percentage.toFixed(0)}%</div>
              </div>
            </div>

            {paymentAnalysis.recent_payments.length > 0 && (
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Recent Payment Records</div>
                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#161720] text-gray-500 pb-2">
                        <th className="py-2.5 font-bold">Payment ID</th>
                        <th className="py-2.5 font-bold">Invoice</th>
                        <th className="py-2.5 font-bold">Payment Date</th>
                        <th className="py-2.5 font-bold">Amount</th>
                        <th className="py-2.5 font-bold">Status</th>
                        <th className="py-2.5 font-bold text-right">Data Source</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#12121A]">
                      {paymentAnalysis.recent_payments.map((p) => (
                        <tr key={p.id} className="hover:bg-[#12121A]/60 transition">
                          <td className="py-3 font-mono font-semibold text-white">{p.payment_id}</td>
                          <td className="py-3 font-mono text-purple-300">{p.invoice_id}</td>
                          <td className="py-3 text-gray-400">{p.payment_date}</td>
                          <td className="py-3 font-bold text-white font-mono">₹{p.amount.toLocaleString('en-IN')}</td>
                          <td className="py-3">
                            <span className={`px-2 py-0.5 rounded text-[9px] font-mono font-bold ${
                              p.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'
                            }`}>
                              {p.status}
                            </span>
                          </td>
                          <td className="py-3 text-right">
                            <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-[#161622] text-gray-400 border border-[#222234]">
                              {p.source}
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}
          </div>
        )}

        {/* Negotiations History logs */}
        <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] text-left">
          <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-6">
            <History size={14} className="text-purple-400" />
            Negotiation and Outcome History
          </h3>


          {negotiations.length > 0 ? (
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#161720] text-gray-500 pb-2">
                    <th className="py-2.5 font-bold">Invoice ID</th>
                    <th className="py-2.5 font-bold">Status</th>
                    <th className="py-2.5 font-bold text-center">Initial Term</th>
                    <th className="py-2.5 font-bold text-center">Agreed Term</th>
                    <th className="py-2.5 font-bold text-right">Approval State</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12121A]">
                  {negotiations.map((neg) => (
                    <tr 
                      key={neg.id} 
                      onClick={() => navigate(`/negotiations/${neg.id}`)}
                      className="hover:bg-[#12121A]/60 cursor-pointer transition"
                    >
                      <td className="py-3 font-semibold text-white font-mono">{neg.invoice_id}</td>
                      <td className="py-3">
                        <span className={`px-2 py-0.5 rounded-full text-[9px] font-bold ${
                          neg.status === 'AGREED' 
                            ? 'bg-emerald-500/10 text-emerald-400' 
                            : neg.status === 'REJECTED' 
                            ? 'bg-rose-500/10 text-rose-400' 
                            : 'bg-amber-500/10 text-amber-400'
                        }`}>
                          {neg.status}
                        </span>
                      </td>
                      <td className="py-3 text-center text-gray-300 font-mono">{neg.boundary_term} Days</td>
                      <td className="py-3 text-center text-white font-bold font-mono">
                        {neg.buyer_latest_offer ? `${neg.buyer_latest_offer} Days` : 'In progress'}
                      </td>
                      <td className="py-3 text-right font-mono text-gray-400">{neg.approval_status}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          ) : (
            <div className="text-center py-6 text-xs text-gray-500 border border-dashed border-[#1C1D2A] rounded-xl">
              No active or previous negotiation histories found for this buyer.
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
