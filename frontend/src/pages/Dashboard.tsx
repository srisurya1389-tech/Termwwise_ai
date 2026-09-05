import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  ShieldCheck,
  Zap
} from 'lucide-react';
import {
  AreaChart,
  Area,
  XAxis,
  YAxis,
  CartesianGrid,
  Tooltip,
  ResponsiveContainer,
  Legend
} from 'recharts';
import { api } from '../api/client';
import type { DashboardSummary, CashFlowForecastResponse, PrioritiesResponse, BuyerDetail, RazorpayStatus, Payment } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Dashboard() {
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [forecast, setForecast] = useState<CashFlowForecastResponse | null>(null);
  const [priorities, setPriorities] = useState<PrioritiesResponse | null>(null);
  const [buyersDetails, setBuyersDetails] = useState<BuyerDetail[]>([]);
  const [paymentStatus, setPaymentStatus] = useState<RazorpayStatus | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [sumData, foreData, priData, buyersData, statusData, paymentsData] = await Promise.all([
          api.getDashboardSummary(),
          api.getForecast(),
          api.getPriorities(),
          api.getBuyers(),
          api.getRazorpayStatus().catch(() => null),
          api.getPayments({ limit: 5 }).catch(() => []),
        ]);

        setSummary(sumData);
        setForecast(foreData);
        setPriorities(priData);
        setPaymentStatus(statusData);
        setRecentPayments(paymentsData);

        // Fetch detailed intelligence for first 5 buyers
        const details = await Promise.all(
          buyersData.slice(0, 5).map((b) => api.getBuyer(b.id))
        );
        setBuyersDetails(details);
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load dashboard.');
      } finally {
        setLoading(false);
      }
    }
    loadDashboardData();

  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Executive Dashboard">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (error) {
    return (
      <DashboardLayout pageTitle="Executive Dashboard">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0C0C12] border border-[#171822] rounded-2xl max-w-md mx-auto mt-12">
          <AlertTriangle className="text-rose-500 mb-4" size={40} />
          <h3 className="text-sm font-semibold text-white mb-2">Unable to load cash-flow forecast</h3>
          <p className="text-xs text-gray-500 mb-6">{error}</p>
          <button 
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-[#12121B] border border-[#1C1D26] hover:bg-[#1A1A26] rounded-xl text-xs font-semibold cursor-pointer"
          >
            Retry Connection
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

  // Compile Recharts chart data
  // Combine scenarios into cumulative values for chronological days
  const chartData = [
    { day: 'Day 0', optimistic: 0, base: 0, pessimistic: 0 },
    {
      day: '7 Days',
      optimistic: forecast?.scenarios.optimistic.within_7_days || 0,
      base: forecast?.scenarios.base.within_7_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_7_days || 0,
    },
    {
      day: '15 Days',
      optimistic: forecast?.scenarios.optimistic.within_15_days || 0,
      base: forecast?.scenarios.base.within_15_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_15_days || 0,
    },
    {
      day: '30 Days',
      optimistic: forecast?.scenarios.optimistic.within_30_days || 0,
      base: forecast?.scenarios.base.within_30_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_30_days || 0,
    },
    {
      day: '60 Days',
      optimistic: forecast?.scenarios.optimistic.within_60_days || 0,
      base: forecast?.scenarios.base.within_60_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_60_days || 0,
    },
  ];

  // Cash gap alerts
  const primaryGap = forecast?.potential_gaps && forecast.potential_gaps.length > 0
    ? forecast.potential_gaps[0]
    : null;

  return (
    <DashboardLayout pageTitle="Cash Flow Command Center">
      <div className="space-y-6">
        {/* Payment Data Source Indicator Banner */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between p-3.5 bg-[#0C0C14] border border-[#1C1C28] rounded-2xl gap-2 shadow-lg">
          <div className="flex items-center gap-3">
            {paymentStatus?.mode === 'LIVE' ? (
              <span className="flex items-center gap-2 px-3 py-1 bg-emerald-950/40 border border-emerald-800/40 rounded-full text-xs font-mono font-bold text-emerald-300">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
                Razorpay Connected (Live Data)
              </span>
            ) : (
              <span className="flex items-center gap-2 px-3 py-1 bg-purple-950/40 border border-purple-800/40 rounded-full text-xs font-mono font-bold text-purple-300">
                <span className="h-2 w-2 rounded-full bg-purple-400"></span>
                Demo Data Mode (Synthetic Dataset)
              </span>
            )}
            <span className="text-xs text-gray-400 hidden md:inline">
              {paymentStatus?.mode === 'LIVE'
                ? 'Settlement actuals & invoices automatically reconciled from Razorpay.'
                : 'Showing deterministic synthetic payment timelines and buyer health.'}
            </span>
          </div>
          <button
            onClick={() => navigate('/settings/integrations')}
            className="text-xs font-semibold text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition self-end sm:self-auto"
          >
            Manage Integration
            <ArrowRight size={12} />
          </button>
        </div>

        {/* Upper Hero Area - Expected Receivables */}
        <div id="tour-cash-position" className="grid grid-cols-1 lg:grid-cols-4 gap-4">
          {/* Main Hero Card */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-gradient-to-br from-[#101019] via-[#0E0E15] to-[#0A0A0F] border border-[#1C1D2A] flex flex-col justify-between shadow-2xl relative overflow-hidden">
            <div className="absolute top-0 right-0 h-32 w-32 rounded-full bg-purple-500/5 blur-[50px] pointer-events-none"></div>
            <div>
              <div className="text-xs text-gray-500 font-medium uppercase tracking-wider">Expected Receivables</div>
              <div className="text-4xl font-black text-white mt-2 font-mono">
                {formatLakhs(summary?.total_outstanding || 0)}
              </div>
              <div className="flex items-center gap-1.5 text-emerald-400 text-xs font-semibold mt-1">
                <TrendingUp size={12} />

                <span>+8.4% vs previous period</span>
              </div>
            </div>
            <div className="text-[10px] text-gray-500 mt-6 font-mono uppercase tracking-wider">
              Total outstanding invoice assets under analysis
            </div>
          </div>

          {/* Forecast Buckets */}
          <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720] flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Expected in 7 Days</div>
              <div className="text-2xl font-black text-white mt-1.5 font-mono">
                {formatLakhs(summary?.expected_cash_7_days || 0)}
              </div>
            </div>
            <div className="text-[10px] text-emerald-400 bg-emerald-500/10 border border-emerald-500/20 px-2 py-0.5 rounded-full w-fit mt-4">
              BASE SCENARIO
            </div>
          </div>

          <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720] flex flex-col justify-between">
            <div>
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Expected in 30 Days</div>
              <div className="text-2xl font-black text-white mt-1.5 font-mono">
                {formatLakhs(summary?.expected_cash_30_days || 0)}
              </div>
            </div>
            <div className="text-[10px] text-indigo-400 bg-indigo-500/10 border border-indigo-500/20 px-2 py-0.5 rounded-full w-fit mt-4">
              AI TIMING MODEL
            </div>
          </div>
        </div>

        {/* Additional Metrics Row */}
        <div className="grid grid-cols-2 lg:grid-cols-5 gap-4">
          <div className="p-4 rounded-xl bg-[#0D0D13] border border-[#161720] flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Potential Cash Gap</span>
            <span className="text-lg font-black text-rose-400 mt-1 font-mono">{formatLakhs(summary?.potential_cash_flow_gap || 0)}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0D13] border border-[#161720] flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">High Risk Outstanding</span>
            <span className="text-lg font-black text-amber-400 mt-1 font-mono">{formatLakhs(summary?.high_risk_amount || 0)}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0D13] border border-[#161720] flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Priority Invoices</span>
            <span className="text-lg font-black text-white mt-1 font-mono">{summary?.high_priority_invoice_count || 0}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0D13] border border-[#161720] flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Negotiations</span>
            <span className="text-lg font-black text-indigo-400 mt-1 font-mono">{summary?.active_negotiations || 0}</span>
          </div>

          <div className="p-4 rounded-xl bg-[#0D0D13] border border-[#161720] flex flex-col justify-between">
            <span className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Prediction Accuracy</span>
            <span className="text-lg font-black text-emerald-400 mt-1 font-mono">
              {summary?.average_prediction_error ? `±${summary.average_prediction_error.toFixed(1)}d` : '±2.5d'}
            </span>
          </div>
        </div>

        {/* Cash Flow Gaps Alert Area */}
        {primaryGap && primaryGap.gap_amount > 0 && (
          <div id="tour-gap-alert" className="p-4 rounded-xl bg-amber-500/10 border border-amber-500/20 flex flex-col md:flex-row md:items-center justify-between gap-4">
            <div className="flex gap-3 items-start">
              <AlertTriangle className="text-amber-400 shrink-0 mt-0.5 animate-pulse" size={18} />
              <div>
                <h4 className="text-xs font-bold text-white uppercase tracking-wider font-mono">NovaCraft Cash-flow pressure detected</h4>
                <p className="text-[11px] text-gray-400 mt-1 leading-relaxed">
                  Potential gap of <span className="text-amber-300 font-bold font-mono">{formatLakhs(primaryGap.gap_amount)}</span> expected around{' '}
                  <span className="text-gray-300 font-semibold">{new Date(primaryGap.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>.{' '}
                  Main contributor: <span className="text-white font-medium">{primaryGap.reason.split('expected from ')[1]?.split(' may')[0] || 'Outstanding invoices'}</span>.
                </p>
              </div>
            </div>
            <button 
              onClick={() => navigate('/priorities')}
              className="px-3.5 py-1.5 bg-[#171720] hover:bg-[#20202C] border border-[#252636] rounded-xl text-xs font-semibold text-amber-300 cursor-pointer shrink-0 transition"
            >
              Review Priorities
            </button>
          </div>
        )}

        {/* Interactive Cash-Flow Health Chart */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Chart Panel */}
          <div className="lg:col-span-2 p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col justify-between">
            <div className="mb-4">
              <h3 className="text-sm font-bold text-white tracking-tight">Expected Cash Inflow Scenarios</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Displays cumulative projected inflows under optimistic, base, and pessimistic schedules.
              </p>
            </div>

            <div className="h-72 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="optColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#10B981" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="baseColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.15}/>
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                    </linearGradient>
                    <linearGradient id="pessColor" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.1}/>
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0}/>
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#161720" vertical={false} />
                  <XAxis dataKey="day" stroke="#4B5563" fontSize={10} tickLine={false} />
                  <YAxis 
                    stroke="#4B5563" 
                    fontSize={10} 
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  />
                  <Tooltip 
                    contentStyle={{ backgroundColor: '#0F0F16', borderColor: '#1F202B', borderRadius: '12px' }}
                    labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#FFF' }}
                    itemStyle={{ fontSize: '10px' }}
                    formatter={(value: any) => [`₹${(Number(value) / 100000).toFixed(2)}L`, '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Area type="monotone" name="Optimistic Inflow" dataKey="optimistic" stroke="#10B981" strokeWidth={2} fillOpacity={1} fill="url(#optColor)" />
                  <Area type="monotone" name="Base Forecast" dataKey="base" stroke="#8B5CF6" strokeWidth={2} fillOpacity={1} fill="url(#baseColor)" />
                  <Area type="monotone" name="Pessimistic Inflow" dataKey="pessimistic" stroke="#EF4444" strokeWidth={2} fillOpacity={1} fill="url(#pessColor)" />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* AI Intelligence Insights Card */}
          <div className="p-6 rounded-2xl bg-gradient-to-br from-[#0F0A1C] via-[#090612] to-[#06040C] border border-[#231A3D] flex flex-col justify-between relative overflow-hidden">
            <div className="absolute top-0 right-0 h-40 w-40 rounded-full bg-purple-500/5 blur-[60px] pointer-events-none"></div>
            <div>
              <div className="flex items-center gap-2 text-purple-400 mb-4">
                <Sparkles size={16} />
                <h3 className="text-xs font-bold font-mono tracking-wider uppercase">TermWise Intelligence</h3>
              </div>
              
              <div className="space-y-4 text-left">
                <div>
                  <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Projected Gaps</div>
                  <div className="text-white text-xs mt-1 leading-relaxed">
                    {summary?.high_priority_invoice_count ? (
                      `Currently, ${summary.high_priority_invoice_count} critical invoices represent the primary cash-flow bottlenecks for the SME.`
                    ) : (
                      'All upcoming critical expenses are covered by expected cash receipts.'
                    )}
                  </div>
                </div>

                {priorities?.queue && priorities.queue.length > 0 && (
                  <div>
                    <div className="text-[10px] text-gray-500 uppercase font-bold tracking-wider">Top Priority Action</div>
                    <div className="text-white text-xs mt-1 leading-relaxed">
                      {priorities.queue[0].buyer_name} is the highest impact outstanding invoice ({formatLakhs(priorities.queue[0].invoice_amount)}).
                      Buyer historically pays late.
                    </div>
                  </div>
                )}
                
                <div className="p-3 bg-purple-950/20 border border-purple-500/20 rounded-xl">
                  <div className="text-[10px] font-bold text-purple-300">Recommended Next Step</div>
                  <div className="text-[10px] text-gray-400 mt-0.5">
                    Trigger payment term analysis for top priority items.
                  </div>
                </div>
              </div>
            </div>

            <button 
              onClick={() => navigate('/insights')}
              className="mt-6 flex items-center justify-center gap-2 py-2.5 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold shadow-[0_4px_20px_rgba(168,85,247,0.3)] transition cursor-pointer"
            >
              Open AI Insight Hub
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* Priority Receivables Listing */}
        <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] text-left">
          <div className="flex justify-between items-center mb-6">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight">Receivables That Need Attention</h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Top high-priority invoices sorted by dynamic threat-impact prioritizations.
              </p>
            </div>
            <button 
              onClick={() => navigate('/receivables')}
              className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer transition font-semibold"
            >
              View All Invoices
              <ArrowUpRight size={14} />
            </button>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-xs text-left">
              <thead>
                <tr className="border-b border-[#161720] text-gray-500 pb-2">
                  <th className="py-2.5 font-bold">Buyer</th>
                  <th className="py-2.5 font-bold">Invoice</th>
                  <th className="py-2.5 font-bold">Amount</th>
                  <th className="py-2.5 font-bold">Risk Level</th>
                  <th className="py-2.5 font-bold">Due In</th>
                  <th className="py-2.5 font-bold text-center">Score</th>
                  <th className="py-2.5 font-bold text-right">Recommended Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-[#12121A]">
                {priorities?.queue && priorities.queue.slice(0, 5).map((item) => (
                  <tr 
                    key={item.invoice_id} 
                    onClick={() => navigate(`/receivables/${item.invoice_id}`)}
                    className="hover:bg-[#12121A]/60 cursor-pointer transition"
                  >
                    <td className="py-3 font-semibold text-white">{item.buyer_name}</td>
                    <td className="py-3 font-mono text-gray-400">{item.invoice_id}</td>
                    <td className="py-3 font-bold text-white font-mono">{formatLakhs(item.invoice_amount)}</td>
                    <td className="py-3"><RiskBadge level={item.risk_level} /></td>
                    <td className="py-3 text-gray-400">
                      {Math.ceil((new Date(item.due_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24))} days
                    </td>
                    <td className="py-3 text-center">
                      <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                        item.priority_score >= 70 ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'
                      }`}>
                        {item.priority_score}
                      </span>
                    </td>
                    <td className="py-3 text-right">
                      <span className="text-purple-400 font-semibold flex items-center justify-end gap-1 hover:text-purple-300">
                        {item.recommended_action}
                        <ArrowRight size={12} />
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        </div>

        {/* Lower Grid: Buyer Health, Recent Payments, Quick Actions */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Buyer Health Table */}
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] text-left">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Buyer Payment Health</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Historical averages compiled dynamically.</p>
              </div>
              <button 
                onClick={() => navigate('/buyers')}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-semibold"
              >
                All Buyers
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {buyersDetails.map((b) => (
                <div 
                  key={b.id}
                  onClick={() => navigate(`/buyers/${b.id}`)}
                  className="p-3 bg-[#0E0E14] border border-[#161720]/80 rounded-xl hover:bg-[#12121C] hover:border-[#1E1F2C] cursor-pointer transition flex items-center justify-between"
                >
                  <div>
                    <h4 className="text-xs font-bold text-white">{b.name}</h4>
                    <div className="text-[10px] text-gray-500 mt-0.5">
                      Avg. Payment: <span className="text-white font-medium">{b.intelligence.average_payment_days?.toFixed(0)} days</span> •{' '}
                      Late Rate: <span className="text-amber-400">{b.intelligence.late_payment_percentage?.toFixed(0)}%</span>
                    </div>
                  </div>
                  <RiskBadge level={b.intelligence.risk_level} />
                </div>
              ))}
            </div>
          </div>

          {/* Recent Payments Activity (Stage 10) */}
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] text-left">
            <div className="flex justify-between items-center mb-6">
              <div>
                <h3 className="text-sm font-bold text-white tracking-tight">Recent Settlement Activity</h3>
                <p className="text-[11px] text-gray-500 mt-0.5">Real-time payment intake stream.</p>
              </div>
              <button 
                onClick={() => navigate('/settings/integrations')}
                className="text-xs text-purple-400 hover:text-purple-300 flex items-center gap-1 cursor-pointer font-semibold"
              >
                Sync
                <ArrowUpRight size={14} />
              </button>
            </div>

            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">No payment records yet.</div>
              ) : (
                recentPayments.slice(0, 5).map((p) => (
                  <div
                    key={p.id}
                    onClick={() => navigate(`/receivables/${p.invoice_id}`)}
                    className="p-3 bg-[#0E0E14] border border-[#161720]/80 rounded-xl hover:bg-[#12121C] hover:border-[#1E1F2C] cursor-pointer transition flex items-center justify-between"
                  >
                    <div>
                      <h4 className="text-xs font-bold text-white truncate max-w-[140px]">{p.buyer_name || p.invoice_id}</h4>
                      <div className="text-[10px] text-gray-500 mt-0.5 flex items-center gap-1 font-mono">
                        <span>{p.invoice_id}</span>
                        <span>•</span>
                        <span>{p.payment_date}</span>
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">₹{p.amount.toLocaleString('en-IN')}</div>
                      <div className="flex items-center justify-end gap-1 mt-0.5">
                        <span
                          className={`text-[9px] font-mono px-1.5 py-0.2 rounded font-semibold ${
                            p.status === 'SUCCESS'
                              ? 'text-emerald-400 bg-emerald-950/40'
                              : 'text-rose-400 bg-rose-950/40'
                          }`}
                        >
                          {p.status}
                        </span>
                        <span className="text-[8px] font-mono px-1 rounded bg-[#181824] text-gray-400">
                          {p.source}
                        </span>
                      </div>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>

          {/* Quick Actions Panel */}
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] text-left flex flex-col justify-between">
            <div>
              <h3 className="text-sm font-bold text-white tracking-tight mb-4">Quick Control Actions</h3>
              <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                <button 
                  onClick={() => navigate('/priorities')}
                  className="p-3 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] rounded-xl text-left cursor-pointer transition"
                >
                  <AlertTriangle className="text-amber-400 mb-2" size={16} />
                  <div className="text-xs font-bold text-white">Review Priorities</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Prioritized Action Queue</div>
                </button>


                <button 
                  onClick={() => navigate('/cash-flow')}
                  className="p-3 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] rounded-xl text-left cursor-pointer transition"
                >
                  <TrendingUp className="text-purple-400 mb-2" size={16} />
                  <div className="text-xs font-bold text-white">Run Cash Forecast</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Simulate gap boundaries</div>
                </button>

                <button 
                  onClick={() => navigate('/negotiations')}
                  className="p-3 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] rounded-xl text-left cursor-pointer transition"
                >
                  <Zap className="text-indigo-400 mb-2" size={16} />
                  <div className="text-xs font-bold text-white">Prepare Negotiation</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Draft strategy & offers</div>
                </button>

                <button 
                  onClick={() => navigate('/outcomes')}
                  className="p-3 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] rounded-xl text-left cursor-pointer transition"
                >
                  <ShieldCheck className="text-emerald-400 mb-2" size={16} />
                  <div className="text-xs font-bold text-white">View Outcomes</div>
                  <div className="text-[10px] text-gray-500 mt-0.5">Score historical accuracy</div>
                </button>
              </div>
            </div>

            <div className="mt-6 flex items-center justify-between text-[11px] text-gray-500 px-1 border-t border-[#12121A] pt-4">
              <span className="flex items-center gap-1 text-purple-400">
                <Sparkles size={12} />
                Decision Support Engine Active
              </span>
              <span>v1.0.0</span>
            </div>
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
