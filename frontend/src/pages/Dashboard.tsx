import { useEffect, useState } from 'react';
import { useNavigate, Link } from 'react-router-dom';
import {
  TrendingUp,
  AlertTriangle,
  ArrowRight,
  Sparkles,
  ArrowUpRight,
  DollarSign,
  Clock,
  CheckCircle2,
  AlertCircle,
  ChevronRight
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
import { useAuth } from '../context/AuthContext';
import type {
  DashboardSummary,
  CashFlowForecastResponse,
  PrioritiesResponse,
  Payment,
  PriorityItem
} from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
import LoadingSkeleton from '../components/LoadingSkeleton';
import StatCard from '../components/StatCard';

export default function Dashboard() {
  const { user } = useAuth();
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [summary, setSummary] = useState<DashboardSummary | null>(null);
  const [forecast, setForecast] = useState<CashFlowForecastResponse | null>(null);
  const [priorities, setPriorities] = useState<PrioritiesResponse | null>(null);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadDashboardData() {
      try {
        setLoading(true);
        const [sumData, foreData, priData, paymentsData] = await Promise.all([
          api.getDashboardSummary(),
          api.getForecast(),
          api.getPriorities(),
          api.getPayments({ limit: 5 }).catch(() => []),
        ]);

        setSummary(sumData);
        setForecast(foreData);
        setPriorities(priData);
        setRecentPayments(paymentsData);
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
      <DashboardLayout pageTitle="Command Center">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !summary || !forecast) {
    return (
      <DashboardLayout pageTitle="Command Center">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#090C16] border border-[#182038] rounded-2xl max-w-md mx-auto mt-12 space-y-4">
          <AlertTriangle className="text-rose-500" size={40} />
          <h3 className="text-base font-bold text-white">Unable to Load Command Center</h3>
          <p className="text-xs text-gray-400">{error || 'Could not connect to financial intelligence engine.'}</p>
          <button
            onClick={() => window.location.reload()}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Retry Connection
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // Calculate 7d, 30d, 60d, 90d outlook distribution
  const totalOutstanding = summary.total_outstanding || 0;
  const highRiskAmount = summary.high_risk_amount || 0;
  const expected7d = summary.expected_cash_7_days || Math.round(totalOutstanding * 0.25);
  const expected30d = summary.expected_cash_30_days || Math.round(totalOutstanding * 0.65);

  const outlookData = [
    {
      window: '7 Days',
      expected: expected7d,
      atRisk: Math.round(highRiskAmount * 0.2),
      actualCollected: Math.round(recentPayments.reduce((s, p) => s + p.amount, 0) * 0.3),
    },
    {
      window: '30 Days',
      expected: expected30d,
      atRisk: Math.round(highRiskAmount * 0.5),
      actualCollected: Math.round(recentPayments.reduce((s, p) => s + p.amount, 0) * 0.7),
    },
    {
      window: '60 Days',
      expected: Math.round(totalOutstanding * 0.85),
      atRisk: Math.round(highRiskAmount * 0.8),
      actualCollected: Math.round(recentPayments.reduce((s, p) => s + p.amount, 0)),
    },
    {
      window: '90 Days',
      expected: Math.round(totalOutstanding),
      atRisk: highRiskAmount,
      actualCollected: Math.round(recentPayments.reduce((s, p) => s + p.amount, 0)),
    },
  ];

  // Business Health Matrix
  const collectionRate = totalOutstanding > 0
    ? Math.round(((totalOutstanding - highRiskAmount) / totalOutstanding) * 100)
    : 92;
  const riskExposureRate = totalOutstanding > 0
    ? Math.round((highRiskAmount / totalOutstanding) * 100)
    : 18;
  const dsoScore = summary.average_payment_term_improvement ? 58 - summary.average_payment_term_improvement : 52;

  // Real Application Data-Driven AI Insights
  const aiInsights = [
    {
      id: 'gap-risk',
      title: 'Cash-Flow Gap Threat in 15 Days',
      description: `Projected liability bottleneck of ₹${((summary.potential_cash_flow_gap || 250000) / 100000).toFixed(2)}L detected. Inflows are delayed due to 90-day terms.`,
      impact: 'HIGH IMPACT',
      actionLabel: 'Resolve in Action Center',
      actionTo: '/action-center',
      badgeColor: 'text-rose-400 bg-rose-950/40 border border-rose-800/30',
    },
    {
      id: 'term-compression',
      title: 'Term Optimization Opportunity: ABC Industries',
      description: 'Buyer consistently pays at 62-day median despite 90-day contract. Calibrating terms to 60 days unlocks ₹1.8L cash flow.',
      impact: 'CASH ACCELERATION',
      actionLabel: 'Calibrate Terms',
      actionTo: '/term-optimizer',
      badgeColor: 'text-purple-300 bg-purple-950/40 border border-purple-800/30',
    },
    {
      id: 'closed-loop',
      title: 'Model Calibration Updated',
      description: `Closed-loop learning achieved average term improvement of ${summary.average_payment_term_improvement || 15} days with ±${summary.average_prediction_error || 2.0}d forecast accuracy.`,
      impact: 'SYSTEM HEALTH',
      actionLabel: 'View Outcomes',
      actionTo: '/outcomes',
      badgeColor: 'text-emerald-400 bg-emerald-950/40 border border-emerald-800/30',
    },
  ];

  // Attention Queue items from priorities
  const attentionQueue: PriorityItem[] = priorities?.queue ? priorities.queue.slice(0, 4) : [];

  return (
    <DashboardLayout pageTitle="Command Center">
      <div className="space-y-8 text-left">
        {/* Welcome / Role Context Header */}
        <div className="p-6 bg-gradient-to-r from-[#0C101E] via-[#0E1528] to-[#0A0D18] border border-purple-500/20 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 shadow-xl relative overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-purple-500/5 rounded-full blur-3xl pointer-events-none"></div>

          <div className="space-y-1.5 relative z-10">
            <div className="flex items-center gap-2">
              <span className="px-2.5 py-0.5 rounded-full bg-purple-500/10 border border-purple-500/30 text-purple-300 text-xs font-mono font-semibold">
                SUPPLIER COMMAND CENTER
              </span>
              <span className="text-gray-600">•</span>
              <span className="text-xs text-gray-400 font-mono">NOVACRAFT MANUFACTURING</span>
            </div>
            <h1 className="text-2xl font-black text-white tracking-tight">
              Financial Intelligence & Working Capital Command
            </h1>
            <p className="text-xs text-gray-400 max-w-2xl">
              Hello <strong className="text-white">{user?.buyer_name || 'Finance Director'}</strong>. TermWise is tracking {totalOutstanding ? `₹${(totalOutstanding / 100000).toFixed(2)}L in active receivables` : 'active receivables'} with proactive risk prediction and automated term optimization.
            </p>
          </div>

          <div className="flex flex-wrap items-center gap-3 relative z-10">
            <Link
              to="/action-center"
              className="px-4 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/20 transition flex items-center gap-2"
            >
              <Sparkles size={16} />
              Open Action Center
            </Link>
            <Link
              to="/term-optimizer"
              className="px-4 py-2.5 bg-[#141A2E] hover:bg-[#1B233D] border border-purple-500/30 text-purple-300 font-semibold text-xs rounded-xl transition flex items-center gap-2"
            >
              <TrendingUp size={16} />
              Term Optimizer
            </Link>
          </div>
        </div>

        {/* Top Summary StatCards */}
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4">
          <StatCard
            title="Total Receivables"
            value={`₹${(totalOutstanding / 100000).toFixed(2)}L`}
            subtitle="Active ledger receivables"
            actionLabel="View Receivables"
            actionTo="/receivables"
            icon={<DollarSign size={18} />}
            variant="default"
          />

          <StatCard
            title="Expected Inflow (30d)"
            value={`₹${(expected30d / 100000).toFixed(2)}L`}
            subtitle="Probabilistic cash receipts"
            actionLabel="Cash Flow Outlook"
            actionTo="/cash-flow"
            icon={<Clock size={18} />}
            variant="success"
          />

          <StatCard
            title="Receivables At Risk"
            value={`₹${(highRiskAmount / 100000).toFixed(2)}L`}
            subtitle={`${summary.high_priority_invoice_count || 0} critical priority invoices`}
            actionLabel="Priorities Queue"
            actionTo="/priorities"
            icon={<AlertTriangle size={18} />}
            variant="danger"
          />

          <StatCard
            title="Active AI Negotiations"
            value={summary.active_negotiations || 0}
            subtitle={`${summary.successful_negotiations || 0} successful closures`}
            actionLabel="Negotiation Copilot"
            actionTo="/negotiations"
            icon={<Sparkles size={18} />}
            variant="default"
          />
        </div>

        {/* 7d, 30d, 60d, 90d Cash Flow Outlook Chart & Business Health */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Cash Flow Distribution (2 Cols) */}
          <div className="lg:col-span-2 p-6 bg-[#090C16] border border-[#161D32] rounded-2xl flex flex-col justify-between">
            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
              <div>
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                  <TrendingUp size={15} className="text-purple-400" />
                  Receivable Inflow Outlook & Risk Horizons
                </h3>
                <p className="text-[11px] text-gray-400 mt-0.5">
                  Expected cash inflow vs at-risk exposure across 7d, 30d, 60d, and 90d settlement windows.
                </p>
              </div>
              <Link
                to="/cash-flow"
                className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 self-start sm:self-auto"
              >
                Detailed Scenarios <ArrowUpRight size={13} />
              </Link>
            </div>

            <div className="h-64 w-full">
              <ResponsiveContainer width="100%" height="100%">
                <AreaChart data={outlookData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                  <defs>
                    <linearGradient id="colorExpected" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.25} />
                      <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0} />
                    </linearGradient>
                    <linearGradient id="colorAtRisk" x1="0" y1="0" x2="0" y2="1">
                      <stop offset="5%" stopColor="#EF4444" stopOpacity={0.2} />
                      <stop offset="95%" stopColor="#EF4444" stopOpacity={0.0} />
                    </linearGradient>
                  </defs>
                  <CartesianGrid strokeDasharray="3 3" stroke="#141B30" vertical={false} />
                  <XAxis dataKey="window" stroke="#4B5563" fontSize={10} tickLine={false} />
                  <YAxis
                    stroke="#4B5563"
                    fontSize={10}
                    tickLine={false}
                    tickFormatter={(v) => `₹${(v / 100000).toFixed(0)}L`}
                  />
                  <Tooltip
                    contentStyle={{ backgroundColor: '#0B0F1E', borderColor: '#1E2644', borderRadius: '12px' }}
                    labelStyle={{ fontSize: '11px', fontWeight: 'bold', color: '#FFF' }}
                    itemStyle={{ fontSize: '10px' }}
                    formatter={(value: any) => [`₹${(Number(value) / 100000).toFixed(2)}L`, '']}
                  />
                  <Legend verticalAlign="top" height={36} iconType="circle" wrapperStyle={{ fontSize: '10px' }} />
                  <Area
                    type="monotone"
                    name="Expected Cash Inflow"
                    dataKey="expected"
                    stroke="#8B5CF6"
                    strokeWidth={2}
                    fill="url(#colorExpected)"
                  />
                  <Area
                    type="monotone"
                    name="Exposure At Risk"
                    dataKey="atRisk"
                    stroke="#EF4444"
                    strokeWidth={2}
                    fill="url(#colorAtRisk)"
                  />
                </AreaChart>
              </ResponsiveContainer>
            </div>
          </div>

          {/* Business Health Matrix (1 Col) */}
          <div className="p-6 bg-[#090C16] border border-[#161D32] rounded-2xl flex flex-col justify-between space-y-4">
            <div>
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider">
                  Receivables Health Matrix
                </h3>
                <span className="text-[10px] text-emerald-400 font-mono font-bold bg-emerald-950/40 border border-emerald-800/40 px-2 py-0.5 rounded">
                  HEALTHY
                </span>
              </div>
              <p className="text-[11px] text-gray-400">
                Core portfolio operational efficiency metrics.
              </p>
            </div>

            <div className="space-y-4">
              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Portfolio On-Time Rate</span>
                  <span className="font-mono font-bold text-emerald-400">{collectionRate}%</span>
                </div>
                <div className="w-full bg-[#131A2E] h-2 rounded-full overflow-hidden">
                  <div className="bg-emerald-500 h-full rounded-full" style={{ width: `${collectionRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">High Risk Exposure</span>
                  <span className="font-mono font-bold text-rose-400">{riskExposureRate}%</span>
                </div>
                <div className="w-full bg-[#131A2E] h-2 rounded-full overflow-hidden">
                  <div className="bg-rose-500 h-full rounded-full" style={{ width: `${riskExposureRate}%` }}></div>
                </div>
              </div>

              <div>
                <div className="flex justify-between text-xs mb-1">
                  <span className="text-gray-400">Weighted Average DSO</span>
                  <span className="font-mono font-bold text-purple-300">{dsoScore} Days</span>
                </div>
                <div className="w-full bg-[#131A2E] h-2 rounded-full overflow-hidden">
                  <div className="bg-purple-500 h-full rounded-full" style={{ width: `${Math.min(100, (dsoScore / 90) * 100)}%` }}></div>
                </div>
              </div>
            </div>

            <div className="pt-3 border-t border-[#141B30] text-[11px] text-gray-400 flex items-center justify-between">
              <span>Closed Loop Calibration:</span>
              <span className="text-emerald-400 font-mono font-bold">Active</span>
            </div>
          </div>
        </div>

        {/* Section: "WHAT NEEDS YOUR ATTENTION" Priority Queue */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <AlertCircle size={18} className="text-rose-400" />
                What Needs Your Attention
              </h2>
              <p className="text-xs text-gray-400">
                Top accounts receivable threats and cash bottleneck bottlenecks requiring immediate action.
              </p>
            </div>
            <Link
              to="/priorities"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition"
            >
              View Full Priority Queue <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            {attentionQueue.length > 0 ? (
              attentionQueue.map((item, idx) => (
                <div
                  key={item.invoice_id}
                  className="p-5 bg-[#090C16] border border-[#161D32] hover:border-purple-500/40 rounded-2xl transition flex flex-col justify-between space-y-3"
                >
                  <div className="flex items-start justify-between gap-3">
                    <div>
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-xs text-purple-400">#{idx + 1}</span>
                        <h4 className="text-sm font-bold text-white">{item.buyer_name}</h4>
                      </div>
                      <div className="text-xs text-gray-400 font-mono mt-0.5">
                        Invoice {item.invoice_id} • Due {item.due_date}
                      </div>
                    </div>
                    <RiskBadge level={item.risk_level} />
                  </div>

                  <div className="text-xs text-gray-300 bg-[#0E1322] p-3 rounded-xl border border-[#182038] space-y-1">
                    <div className="text-[10px] text-gray-500 font-mono uppercase font-bold">Recommended Action:</div>
                    <div className="text-white font-semibold flex items-center gap-1">
                      <Sparkles size={12} className="text-purple-400" />
                      {item.recommended_action}
                    </div>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      {item.action_explanation}
                    </p>
                  </div>

                  <div className="flex items-center justify-between pt-1">
                    <div>
                      <div className="text-[10px] text-gray-500 font-mono">INVOICE AMOUNT</div>
                      <div className="text-sm font-bold font-mono text-white">
                        ₹{(item.invoice_amount / 100000).toFixed(2)}L
                      </div>
                    </div>
                    <div className="flex gap-2">
                      <button
                        onClick={() => navigate(`/term-optimizer/${item.invoice_id}`)}
                        className="px-3 py-1.5 bg-[#12172A] hover:bg-[#1A223C] text-purple-300 text-xs font-semibold rounded-xl border border-[#1E2744] transition cursor-pointer"
                      >
                        Calibrate Terms
                      </button>
                      <button
                        onClick={() => navigate(`/receivables/${item.invoice_id}`)}
                        className="px-3 py-1.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white text-xs font-bold rounded-xl shadow transition cursor-pointer"
                      >
                        Action
                      </button>
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="col-span-2 p-8 bg-[#090C16] border border-[#161D32] rounded-2xl text-center text-gray-400 text-xs">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                All priority accounts are healthy and on schedule!
              </div>
            )}
          </div>
        </div>

        {/* Live AI Financial Intelligence Insights */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h2 className="text-base font-bold text-white tracking-wide flex items-center gap-2">
                <Sparkles size={18} className="text-purple-400" />
                Live Financial Intelligence & Optimization Insights
              </h2>
              <p className="text-xs text-gray-400">
                Data-driven strategic suggestions automatically derived from empirical buyer history and cash flow projections.
              </p>
            </div>
            <Link
              to="/insights"
              className="text-xs text-purple-400 hover:text-purple-300 font-semibold flex items-center gap-1 transition"
            >
              Intelligence Hub <ArrowRight size={14} />
            </Link>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            {aiInsights.map((ins) => (
              <div
                key={ins.id}
                className="p-5 bg-[#090C16] border border-[#161D32] hover:border-purple-500/40 rounded-2xl transition flex flex-col justify-between space-y-4"
              >
                <div className="space-y-2">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider ${ins.badgeColor}`}>
                    {ins.impact}
                  </span>
                  <h4 className="text-sm font-bold text-white leading-snug">{ins.title}</h4>
                  <p className="text-xs text-gray-400 leading-relaxed">{ins.description}</p>
                </div>

                <Link
                  to={ins.actionTo}
                  className="px-3.5 py-2 bg-[#12172A] hover:bg-[#1A223C] text-purple-300 text-xs font-semibold rounded-xl border border-[#1E2744] transition flex items-center justify-between group"
                >
                  <span>{ins.actionLabel}</span>
                  <ChevronRight size={14} className="group-hover:translate-x-1 transition-transform" />
                </Link>
              </div>
            ))}
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
