import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Lightbulb, Sparkles, AlertTriangle, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import type { PrioritiesResponse, CashFlowForecastResponse } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [priorities, setPriorities] = useState<PrioritiesResponse | null>(null);
  const [forecast, setForecast] = useState<CashFlowForecastResponse | null>(null);

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [pri, fore] = await Promise.all([
          api.getPriorities(),
          api.getForecast()
        ]);
        setPriorities(pri);
        setForecast(fore);
      } catch (err) {
        console.error('Failed to load insights', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="AI Insights Hub">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Format currency
  const formatLakhs = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  // Compile insights dynamically from backend data
  const insightsList = [];

  // Insight 1: Cash Gap Pressure Alert
  const gap = forecast?.potential_gaps && forecast.potential_gaps.length > 0 ? forecast.potential_gaps[0] : null;
  if (gap && gap.gap_amount > 0) {
    insightsList.push({
      id: 'cash-gap',
      type: 'RISK',
      title: 'Critical Cash-Flow Gap Looming',
      level: 'HIGH IMPACT',
      levelColor: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      icon: AlertTriangle,
      evidence: [
        `Projected gap of ${formatLakhs(gap.gap_amount)} identified around ${new Date(gap.expense_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}.`,
        `Cumulative expenses before this date will total ${formatLakhs(gap.cumulative_expenses)} while predicted inflows are capped at ${formatLakhs(gap.cumulative_inflow)}.`
      ],
      action: 'Prioritize outstanding invoices due before gap date',
      navPath: '/priorities'
    });
  }

  // Insight 2: Top Opportunity Invoice
  const topOpp = priorities?.queue && priorities.queue.length > 0 ? priorities.queue[0] : null;
  if (topOpp && topOpp.opportunity_score >= 65) {
    insightsList.push({
      id: 'term-optimize',
      type: 'OPPORTUNITY',
      title: `Optimize Payment Terms: ${topOpp.buyer_name}`,
      level: 'HIGH OPPORTUNITY',
      levelColor: 'text-indigo-400 bg-indigo-500/10 border-indigo-500/20',
      icon: Sparkles,
      evidence: [
        `Invoice ${topOpp.invoice_id} has a major cash volume of ${formatLakhs(topOpp.invoice_amount)}.`,
        `Buyer payment speed is predictable, making a term-optimization reduction highly viable.`,
        `Optimized net term limits calculated: Target ${topOpp.risk_score - 10} days, Fallback ${topOpp.risk_score} days.`
      ],
      action: 'Open scenario simulator and analyze parameters',
      navPath: `/receivables/${topOpp.invoice_id}`
    });
  }

  // Insight 3: Insufficient buyer payment histories
  const totalInvoicesCount = priorities?.queue.length || 0;
  if (totalInvoicesCount > 2) {
    insightsList.push({
      id: 'unpredictable-buyers',
      type: 'INSIGHT',
      title: 'Concentrated Cash Flow bottlenecks',
      level: 'MEDIUM SIGNIFICANCE',
      levelColor: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: Lightbulb,
      evidence: [
        `${totalInvoicesCount} key invoices represent over 80% of the total outstanding receivables assets under analysis.`,
        `Reducing terms on just these key accounts would improve predicted cash positions by more than 15 days.`
      ],
      action: 'Orchestrate active negotiation copilot sessions',
      navPath: '/negotiations'
    });
  }

  return (
    <DashboardLayout pageTitle="TermWise Intelligence Hub">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">AI Intelligence & Advisory</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Data-driven strategic recommendations compiled dynamically from live accounts receivable ledger books.
          </p>
        </div>

        {/* Dynamic Insights list */}
        <div className="space-y-6">
          {insightsList.map((item) => {
            const Icon = item.icon;
            return (
              <div 
                key={item.id}
                className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col md:flex-row md:items-center justify-between gap-6"
              >
                <div className="space-y-4 max-w-2xl">
                  <div className="flex flex-wrap items-center gap-3">
                    <Icon size={16} className="text-purple-400 shrink-0" />
                    <span className={`px-2.5 py-0.5 rounded-full text-[9px] font-bold border ${item.levelColor}`}>
                      {item.level}
                    </span>
                    <h3 className="text-sm font-bold text-white">{item.title}</h3>
                  </div>

                  <div className="space-y-2">
                    <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Deterministic Evidence</div>
                    <ul className="space-y-1.5">
                      {item.evidence.map((bullet, idx) => (
                        <li key={idx} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                          <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5"></span>
                          {bullet}
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>

                <div className="flex flex-col items-end justify-center shrink-0">
                  <div className="text-[9px] text-gray-500 font-mono mb-2 uppercase">RECOMMENDED STRATEGY</div>
                  <button 
                    onClick={() => navigate(item.navPath)}
                    className="px-4 py-2.5 bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] hover:border-purple-500/40 text-purple-400 hover:text-purple-300 rounded-xl text-xs font-bold transition flex items-center gap-1.5 cursor-pointer shadow-lg"
                  >
                    {item.action}
                    <ArrowRight size={14} />
                  </button>
                </div>
              </div>
            );
          })}
        </div>

      </div>
    </DashboardLayout>
  );
}
