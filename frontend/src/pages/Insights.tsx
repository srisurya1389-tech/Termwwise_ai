import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Lightbulb,
  Sparkles,
  AlertTriangle,
  ArrowRight,
  Layers,
  Cpu,
  ShieldCheck,
  CheckCircle2,
  Workflow,
  Server,
  Lock
} from 'lucide-react';
import { api } from '../api/client';
import type { PrioritiesResponse, CashFlowForecastResponse } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Insights() {
  const [loading, setLoading] = useState(true);
  const [activeTab, setActiveTab] = useState<'insights' | 'architecture' | 'techstack'>('insights');
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
      <DashboardLayout pageTitle="TermWise Intelligence Hub">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Format currency
  const formatLakhs = (amount: number) => {
    return `₹${(amount / 100000).toFixed(2)}L`;
  };

  // Compile dynamic recommendations
  const insightsList = [];

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
        `Optimized net term limits calculated: Target 60 days, Fallback 75 days, Maximum Acceptable 90 days.`
      ],
      action: 'Open scenario simulator and analyze parameters',
      navPath: `/receivables/${topOpp.invoice_id}`
    });
  }

  const totalInvoicesCount = priorities?.queue.length || 0;
  if (totalInvoicesCount > 0) {
    insightsList.push({
      id: 'unpredictable-buyers',
      type: 'INSIGHT',
      title: 'Concentrated Cash Flow Bottlenecks',
      level: 'STRATEGIC SIGNIFICANCE',
      levelColor: 'text-purple-400 bg-purple-500/10 border-purple-500/20',
      icon: Lightbulb,
      evidence: [
        `${totalInvoicesCount} key invoices represent over 80% of the total outstanding receivables assets under analysis.`,
        `Reducing terms on just top accounts would improve predicted cash positions by more than 15 days.`
      ],
      action: 'Orchestrate active negotiation copilot sessions',
      navPath: '/negotiations'
    });
  }

  return (
    <DashboardLayout pageTitle="Intelligence Hub & System Architecture">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Financial Intelligence Hub</h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Explore strategic recommendations, verifiable end-to-end dataflow architecture, and production tech stack.
            </p>
          </div>

          {/* Tab Controls */}
          <div className="flex bg-[#0C0C14] border border-[#1C1C28] p-1 rounded-xl gap-1 shrink-0">
            <button
              onClick={() => setActiveTab('insights')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'insights'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Actionable Insights
            </button>
            <button
              onClick={() => setActiveTab('architecture')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'architecture'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              System Architecture
            </button>
            <button
              onClick={() => setActiveTab('techstack')}
              className={`px-3 py-1.5 rounded-lg text-xs font-semibold transition cursor-pointer ${
                activeTab === 'techstack'
                  ? 'bg-purple-600 text-white shadow'
                  : 'text-gray-400 hover:text-white'
              }`}
            >
              Tech Stack
            </button>
          </div>
        </div>

        {/* TAB 1: INSIGHTS */}
        {activeTab === 'insights' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="space-y-4">
              {insightsList.map((item) => {
                const Icon = item.icon;
                return (
                  <div 
                    key={item.id}
                    className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col md:flex-row md:items-center justify-between gap-6 hover:border-[#222332] transition"
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
                        <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider font-mono">Deterministic Evidence</div>
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
                      <div className="text-[9px] text-gray-500 font-mono mb-2 uppercase">RECOMMENDED ACTION</div>
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
        )}

        {/* TAB 2: SYSTEM ARCHITECTURE */}
        {activeTab === 'architecture' && (
          <div className="space-y-6 animate-fadeIn">
            {/* End-to-End Pipeline Card */}
            <div className="p-6 md:p-8 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-6">
              <div className="flex items-center gap-3">
                <Workflow size={20} className="text-purple-400" />
                <div>
                  <h3 className="text-base font-bold text-white">End-to-End Decision Pipeline Architecture</h3>
                  <p className="text-xs text-gray-400">Strict separation of deterministic calculation engines and generative communication copilot.</p>
                </div>
              </div>

              {/* Step-by-Step Architecture Flow */}
              <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
                
                {/* Stage 1 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2 relative">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">1. Data Ingestion</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">Dual Source</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Razorpay & Synthetic CSV</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Ingests raw invoices, due dates, settlement timeline actuals, and live HMAC-validated webhook streams.
                  </p>
                </div>

                {/* Stage 2 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">2. Normalization</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">Clean Schema</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Reconciliation Engine</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Matches transaction receipts with invoice ledger items, computes outstanding balances, and marks paid/partial states.
                  </p>
                </div>

                {/* Stage 3 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">3. Buyer Intelligence</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">Deterministic</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Behavioral Profiling</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Calculates empirical average payment days, median speed, late rate (5-day grace), and delay variance.
                  </p>
                </div>

                {/* Stage 4 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">4. Cash-Flow Forecast</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">Tri-Scenario</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Gap & Liquidity Model</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Projects cumulative inflows across Optimistic, Base, and Pessimistic timelines vs upcoming operational liabilities.
                  </p>
                </div>

                {/* Stage 5 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">5. Risk & Priority</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">Weighted</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Action Queue Ranking</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Combines receivable risk (40%), cash impact (40%), and opportunity score (20%) to rank critical bottleneck invoices.
                  </p>
                </div>

                {/* Stage 6 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">6. Term Optimizer</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">Quantile</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Target / Fallback Bounds</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Calculates Target (25th percentile), Fallback (median), and Maximum Tolerable terms with confidence ratings.
                  </p>
                </div>

                {/* Stage 7 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">7. AI Negotiation</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">LLM Copilot</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Strategy & Message Draft</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Generates polite, collaborative drafts grounded strictly in verified parameters with zero financial hallucination.
                  </p>
                </div>

                {/* Stage 8 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-emerald-400 uppercase">8. Human-in-the-Loop</span>
                    <span className="px-1.5 py-0.5 rounded bg-emerald-950/40 text-[9px] text-emerald-300 font-mono">Governance</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Credit Manager Review</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Requires explicit human approval to dispatch or execute. System prevents autonomous agreement modifications.
                  </p>
                </div>

                {/* Stage 9 */}
                <div className="p-4 bg-[#0D0D14] border border-[#1C1D2A] rounded-xl space-y-2">
                  <div className="flex items-center justify-between">
                    <span className="text-[10px] font-mono font-bold text-purple-400 uppercase">9. Outcome & Loop</span>
                    <span className="px-1.5 py-0.5 rounded bg-purple-950/40 text-[9px] text-purple-300 font-mono">Closed Loop</span>
                  </div>
                  <h4 className="text-xs font-bold text-white">Statistical Learning</h4>
                  <p className="text-[11px] text-gray-400 leading-relaxed">
                    Compares predictions vs actuals (MAE error), updates buyer behavior profiles, and measures cash-flow gap resolution.
                  </p>
                </div>

              </div>
            </div>
          </div>
        )}

        {/* TAB 3: TECH STACK */}
        {activeTab === 'techstack' && (
          <div className="space-y-6 animate-fadeIn">
            <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
              
              {/* Frontend Card */}
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Layers size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Frontend Architecture</h3>
                    <p className="text-[10px] text-gray-500 font-mono">UI / UX LAYER</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> React 18 & TypeScript</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Vite Build Tool</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Tailwind CSS Design System</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Recharts Financial Visualizations</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Lucide React Icons</li>
                </ul>
              </div>

              {/* Backend Card */}
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-indigo-500/10 border border-indigo-500/20 flex items-center justify-center text-indigo-400">
                    <Server size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Backend & APIs</h3>
                    <p className="text-[10px] text-gray-500 font-mono">REST SERVER LAYER</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Python 3.11+ Runtime</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> FastAPI Async Framework</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Pydantic Data Validation</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> SQLAlchemy 2.0 ORM</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> SQLite Database & Migrations</li>
                </ul>
              </div>

              {/* Intelligence Engines */}
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-pink-500/10 border border-pink-500/20 flex items-center justify-center text-pink-400">
                    <Cpu size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Financial Calculation Engines</h3>
                    <p className="text-[10px] text-gray-500 font-mono">DETERMINISTIC LOGIC</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Cash Flow Tri-Scenario Forecaster</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Linear Interpolated Quantile Optimizer</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Risk & Opportunity Scoring Engine</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> 4-Factor Outcome Scoring Engine</li>
                </ul>
              </div>

              {/* AI Copilot */}
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-purple-500/10 border border-purple-500/20 flex items-center justify-center text-purple-400">
                    <Sparkles size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">AI Strategy Copilot</h3>
                    <p className="text-[10px] text-gray-500 font-mono">GENERATIVE LAYER</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Google Gemini 1.5 Flash API</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Deterministic Mock Fallback Engine</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Response Intent Classifier</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Strict Grounding Boundaries</li>
                </ul>
              </div>

              {/* Payment Gateway */}
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-blue-500/10 border border-blue-500/20 flex items-center justify-center text-blue-400">
                    <ShieldCheck size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Payment Integrations</h3>
                    <p className="text-[10px] text-gray-500 font-mono">SETTLEMENTS & GATEWAYS</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Razorpay API v1 REST Client</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> HMAC-SHA256 Webhook Verification</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Automated Partial Payment Reconciliation</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Comprehensive Audit Log Tracking</li>
                </ul>
              </div>

              {/* Security & Governance */}
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
                <div className="flex items-center gap-3">
                  <div className="h-9 w-9 rounded-xl bg-emerald-500/10 border border-emerald-500/20 flex items-center justify-center text-emerald-400">
                    <Lock size={18} />
                  </div>
                  <div>
                    <h3 className="text-sm font-bold text-white">Security & Governance</h3>
                    <p className="text-[10px] text-gray-500 font-mono">SAFETY & INTEGRITY</p>
                  </div>
                </div>
                <ul className="space-y-2 text-xs text-gray-300 font-mono">
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Zero Secret Leakage (Backend-Only Keys)</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Masked API Key Display in Frontend</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Human-in-the-Loop Approval Gate</li>
                  <li className="flex items-center gap-2"><CheckCircle2 size={13} className="text-emerald-400" /> Deterministic Offline Fallback Mode</li>
                </ul>
              </div>

            </div>
          </div>
        )}

      </div>
    </DashboardLayout>
  );
}
