import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AreaChart, Area, XAxis, YAxis, CartesianGrid, Tooltip, Legend, ResponsiveContainer } from 'recharts';
import { AlertTriangle, TrendingUp, ArrowUpRight, ShieldCheck, Zap } from 'lucide-react';
import { api } from '../api/client';
import type { CashFlowForecastResponse } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function CashFlow() {
  const [loading, setLoading] = useState(true);
  const [forecast, setForecast] = useState<CashFlowForecastResponse | null>(null);
  
  // Timeline selection: 7, 15, 30, or 60 days
  const [daysScope, setDaysScope] = useState<7 | 15 | 30 | 60>(30);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getForecast();
        setForecast(data);
      } catch (err) {
        console.error('Failed to load cash flow forecast', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Cash Flow Analytics">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Format currency helpers
  const formatINR = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };
  
  const formatLakhs = (amount: number) => {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  };

  // Compile scenario metrics based on selected days scope
  const scenariosData = {
    7: {
      optimistic: forecast?.scenarios.optimistic.within_7_days || 0,
      base: forecast?.scenarios.base.within_7_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_7_days || 0,
    },
    15: {
      optimistic: forecast?.scenarios.optimistic.within_15_days || 0,
      base: forecast?.scenarios.base.within_15_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_15_days || 0,
    },
    30: {
      optimistic: forecast?.scenarios.optimistic.within_30_days || 0,
      base: forecast?.scenarios.base.within_30_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_30_days || 0,
    },
    60: {
      optimistic: forecast?.scenarios.optimistic.within_60_days || 0,
      base: forecast?.scenarios.base.within_60_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_60_days || 0,
    },
  }[daysScope];

  // Compile Recharts chart timeline
  const chartData = [
    { day: 'Day 0', optimistic: 0, base: 0, pessimistic: 0 },
    ...(daysScope >= 7 ? [{
      day: '7 Days',
      optimistic: forecast?.scenarios.optimistic.within_7_days || 0,
      base: forecast?.scenarios.base.within_7_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_7_days || 0,
    }] : []),
    ...(daysScope >= 15 ? [{
      day: '15 Days',
      optimistic: forecast?.scenarios.optimistic.within_15_days || 0,
      base: forecast?.scenarios.base.within_15_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_15_days || 0,
    }] : []),
    ...(daysScope >= 30 ? [{
      day: '30 Days',
      optimistic: forecast?.scenarios.optimistic.within_30_days || 0,
      base: forecast?.scenarios.base.within_30_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_30_days || 0,
    }] : []),
    ...(daysScope >= 60 ? [{
      day: '60 Days',
      optimistic: forecast?.scenarios.optimistic.within_60_days || 0,
      base: forecast?.scenarios.base.within_60_days || 0,
      pessimistic: forecast?.scenarios.pessimistic.within_60_days || 0,
    }] : []),
  ];

  // Filter Gaps occurring within selected scope
  const filteredGaps = forecast?.potential_gaps.filter(gap => {
    const diffDays = Math.ceil(
      (new Date(gap.expense_date).getTime() - new Date().getTime()) / (1000 * 60 * 60 * 24)
    );
    return diffDays >= 0 && diffDays <= daysScope;
  }) || [];

  return (
    <DashboardLayout pageTitle="Cash Flow Timeline Analytics">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <TrendingUp size={20} className="text-purple-400" />
              Cash Inflow Timeline Forecast & Pressure Engine
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Empirical probabilistic forecasting comparing anticipated receivables against scheduled operational obligations.
            </p>
          </div>
          
          {/* Days Switch */}
          <div className="flex items-center gap-2">
            <span className="text-[11px] text-gray-500 font-mono">FORECAST HORIZON:</span>
            <div className="flex gap-1.5 p-1 bg-[#0E0E14] border border-[#161720] rounded-xl w-fit">
              {([7, 15, 30, 60] as const).map(d => (
                <button
                  key={d}
                  onClick={() => setDaysScope(d)}
                  className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                    daysScope === d
                      ? 'bg-purple-600 text-white shadow-[0_2px_8px_rgba(168,85,247,0.2)]'
                      : 'text-gray-400 hover:text-gray-200'
                  }`}
                >
                  {d} Days
                </button>
              ))}
            </div>
          </div>
        </div>

        {/* Forecast Scenarios Stat Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
          {/* Optimistic */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#0A1612] via-[#09100D] to-[#080C0A] border border-emerald-500/20 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-emerald-400 font-bold uppercase tracking-wider">Optimistic Scenario (Earliest)</div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 font-bold">
                  BEST CASE
                </span>
              </div>
              <div className="text-2xl font-black text-emerald-400 mt-2 font-mono">
                {formatLakhs(scenariosData.optimistic)}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-4 leading-relaxed flex gap-1.5 items-start border-t border-emerald-950/40 pt-3">
              <ShieldCheck size={13} className="text-emerald-400 shrink-0 mt-0.5" />
              <span>Receipts arriving on earliest buyer payment boundaries with prompt cash collection.</span>
            </div>
          </div>

          {/* Base */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#120D22] via-[#0D0A18] to-[#090710] border border-purple-500/25 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-purple-300 font-bold uppercase tracking-wider">Base Forecast (Median Expected)</div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-purple-950/60 text-purple-300 border border-purple-800/40 font-bold">
                  PRIMARY TARGET
                </span>
              </div>
              <div className="text-2xl font-black text-white mt-2 font-mono">
                {formatLakhs(scenariosData.base)}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-4 leading-relaxed flex gap-1.5 items-start border-t border-purple-950/40 pt-3">
              <Zap size={13} className="text-purple-400 shrink-0 mt-0.5" />
              <span>Receivables expected at empirical historical median buyer speeds.</span>
            </div>
          </div>

          {/* Pessimistic */}
          <div className="p-5 rounded-2xl bg-gradient-to-br from-[#180C0E] via-[#12080A] to-[#0A0506] border border-rose-500/20 flex flex-col justify-between shadow-lg">
            <div>
              <div className="flex items-center justify-between">
                <div className="text-[10px] text-rose-400 font-bold uppercase tracking-wider">Pessimistic Scenario (Delayed)</div>
                <span className="text-[9px] font-mono px-2 py-0.5 rounded bg-rose-950/60 text-rose-300 border border-rose-800/40 font-bold">
                  RISK BOUNDARY
                </span>
              </div>
              <div className="text-2xl font-black text-rose-400 mt-2 font-mono">
                {formatLakhs(scenariosData.pessimistic)}
              </div>
            </div>
            <div className="text-[10px] text-gray-400 mt-4 leading-relaxed flex gap-1.5 items-start border-t border-rose-950/40 pt-3">
              <AlertTriangle size={13} className="text-rose-400 shrink-0 mt-0.5" />
              <span>Delayed receipts arriving at latest historical payment constraint bounds.</span>
            </div>
          </div>
        </div>

        {/* Shaded Cumulative range chart */}
        <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
          <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 mb-4">
            <div>
              <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                <TrendingUp size={14} className="text-purple-400" />
                Cumulative Cash Inflow Forecast Envelope
              </h3>
              <p className="text-[11px] text-gray-500 mt-0.5">
                Visualizes uncertainty bounds for inflow volumes across {daysScope} days horizon.
              </p>
            </div>
            <div className="text-[10px] text-gray-500 font-mono">
              CONFIDENCE ENVELOPE: <span className="text-purple-300 font-bold">±₹{( (scenariosData.optimistic - scenariosData.pessimistic) / 200000 ).toFixed(2)}L</span>
            </div>
          </div>

          <div className="h-72 w-full">
            <ResponsiveContainer width="100%" height="100%">
              <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                <defs>
                  <linearGradient id="optColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#10B981" stopOpacity={0.15}/>
                    <stop offset="95%" stopColor="#10B981" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="baseColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#8B5CF6" stopOpacity={0.2}/>
                    <stop offset="95%" stopColor="#8B5CF6" stopOpacity={0.0}/>
                  </linearGradient>
                  <linearGradient id="pessColor" x1="0" y1="0" x2="0" y2="1">
                    <stop offset="5%" stopColor="#EF4444" stopOpacity={0.12}/>
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
                <Area type="monotone" name="Optimistic (Best Case)" dataKey="optimistic" stroke="#10B981" strokeWidth={2} fill="url(#optColor)" />
                <Area type="monotone" name="Base Forecast (Expected)" dataKey="base" stroke="#8B5CF6" strokeWidth={2} fill="url(#baseColor)" />
                <Area type="monotone" name="Pessimistic (Risk Boundary)" dataKey="pessimistic" stroke="#EF4444" strokeWidth={2} fill="url(#pessColor)" />
              </AreaChart>
            </ResponsiveContainer>
          </div>
        </div>

        {/* Cash flow Pressure periods */}
        <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
          <div className="flex items-center justify-between mb-4">
            <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <AlertTriangle size={14} className="text-amber-400" />
              Projected Cash-Flow Gaps / Pressure Periods ({filteredGaps.length})
            </h3>
            <span className="text-[10px] text-gray-500 font-mono">AUTO-DETECTED BOTTLENECKS</span>
          </div>

          {filteredGaps.length > 0 ? (
            <div className="space-y-4">
              {filteredGaps.map((gap, i) => (
                <div 
                  key={i}
                  className="p-5 bg-rose-500/5 border border-rose-500/20 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4 transition hover:border-rose-500/40"
                >
                  <div className="space-y-1.5 text-left">
                    <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2">
                      <span className="h-2 w-2 rounded-full bg-rose-500 animate-pulse"></span>
                      Projected Gap: {gap.expense_name}
                    </h4>
                    <p className="text-[11px] text-gray-400 leading-relaxed">
                      Due Date:{' '}
                      <strong className="text-white font-mono">
                        {new Date(gap.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                      </strong>{' '}
                      • Cumulative Expenses: <span className="text-gray-300 font-mono font-semibold">{formatINR(gap.cumulative_expenses)}</span> • Predicted Inflows:{' '}
                      <span className="text-gray-300 font-mono font-semibold">{formatINR(gap.cumulative_inflow)}</span>.
                    </p>
                    <div className="text-[11px] text-rose-300 font-medium bg-rose-950/40 p-2 rounded-lg border border-rose-800/30">
                      <strong>Root Cause:</strong> {gap.reason}
                    </div>
                  </div>
                  
                  <div className="flex flex-col items-end gap-2 justify-center shrink-0">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider">Gap Amount</div>
                    <div className="text-xl font-black text-rose-400 font-mono">{formatINR(gap.gap_amount)}</div>
                    <div className="flex gap-2">
                      <button 
                        onClick={() => navigate('/action-center')}
                        className="px-3 py-1.5 bg-rose-600 hover:bg-rose-500 text-white font-bold text-xs rounded-xl transition cursor-pointer shadow flex items-center gap-1"
                      >
                        Action Queue
                        <ArrowUpRight size={13} />
                      </button>
                      <button 
                        onClick={() => navigate('/priorities')}
                        className="px-3 py-1.5 bg-[#14141E] hover:bg-[#1E1E2C] text-gray-300 text-xs font-semibold rounded-xl border border-[#242436] transition cursor-pointer"
                      >
                        Priorities
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <div className="text-center py-8 text-xs text-gray-500 border border-dashed border-[#1B1B28] rounded-xl flex flex-col items-center gap-2">
              <ShieldCheck size={28} className="text-emerald-400" />
              <span>No cash-flow gap pressures projected within the selected {daysScope} days scope.</span>
            </div>
          )}
        </div>

      </div>
    </DashboardLayout>
  );
}
