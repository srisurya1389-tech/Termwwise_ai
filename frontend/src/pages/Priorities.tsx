import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { AlertTriangle, Sparkles, ChevronRight, Info } from 'lucide-react';
import { api } from '../api/client';
import type { PrioritiesResponse } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Priorities() {
  const [loading, setLoading] = useState(true);
  const [priorities, setPriorities] = useState<PrioritiesResponse | null>(null);
  
  // Track which invoice row details are expanded to show explanations
  const [expandedInvoices, setExpandedInvoices] = useState<Record<string, boolean>>({});

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getPriorities();
        setPriorities(data);
        
        // Auto-expand the first priority row by default for visual demonstration
        if (data.queue.length > 0) {
          setExpandedInvoices({ [data.queue[0].invoice_id]: true });
        }
      } catch (err) {
        console.error('Failed to load priorities queue', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Priorities Queue">
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

  const toggleExpand = (invoiceId: string) => {
    setExpandedInvoices(prev => ({
      ...prev,
      [invoiceId]: !prev[invoiceId]
    }));
  };

  return (
    <DashboardLayout pageTitle="Prioritized Accounts Receivable action Queue">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Receivables Action Queue</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Ranked queue prioritizes receivables threats based on cash gap impacts and negotiation windows.
          </p>
        </div>

        {/* Priority Summary Stat Grid */}
        {priorities?.summary && (
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">High Risk Outstanding</div>
              <div className="text-xl font-black text-rose-400 mt-1.5 font-mono">
                {formatLakhs(priorities.summary.high_risk_outstanding)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Critical Priorities Count</div>
              <div className="text-xl font-black text-white mt-1.5 font-mono">
                {priorities.summary.num_high_priority_invoices} Invoices
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Negotiable Opportunity Amount</div>
              <div className="text-xl font-black text-indigo-400 mt-1.5 font-mono">
                {formatLakhs(priorities.summary.potential_opportunity_amount)}
              </div>
            </div>

            <div className="p-5 rounded-2xl bg-[#0D0D13] border border-[#161720]">
              <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Buyers Requiring Action</div>
              <div className="text-xl font-black text-white mt-1.5 font-mono">
                {priorities.summary.buyers_requiring_action} Accounts
              </div>
            </div>
          </div>
        )}

        {/* Priorities Queue list */}
        {priorities?.queue && priorities.queue.length > 0 ? (
          <div className="space-y-4">
            {priorities.queue.map((item, idx) => {
              const isExpanded = !!expandedInvoices[item.invoice_id];
              return (
                <div 
                  key={item.invoice_id}
                  id={idx === 0 ? "tour-priority-queue" : undefined}
                  className={`border rounded-2xl transition-all duration-200 overflow-hidden ${
                    isExpanded 
                      ? 'bg-[#0E0E14] border-purple-500/40 shadow-[0_4px_25px_rgba(168,85,247,0.08)]' 
                      : 'bg-[#08080C] border-[#15151F] hover:border-[#222330]'
                  }`}
                >
                  {/* Row Summary Trigger */}
                  <div 
                    onClick={() => toggleExpand(item.invoice_id)}
                    className="p-5 flex flex-col lg:flex-row lg:items-center justify-between gap-4 cursor-pointer select-none"
                  >
                    <div className="flex items-center gap-4 min-w-0">
                      {/* Rank Indicator */}
                      <span className="text-base font-black text-purple-400 font-mono shrink-0 w-8">
                        #{idx + 1}
                      </span>
                      
                      <div className="min-w-0">
                        <h4 className="text-xs font-bold text-white truncate">{item.buyer_name}</h4>
                        <div className="flex flex-wrap gap-2 items-center mt-1 text-[10px] text-gray-500">
                          <span className="font-mono">{item.invoice_id}</span>
                          <span>•</span>
                          <span>Due date: {new Date(item.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}</span>
                          {item.contributes_to_gap && (
                            <>
                              <span>•</span>
                              <span className="text-rose-400 font-bold uppercase flex items-center gap-1 font-mono">
                                <AlertTriangle size={10} />
                                Gaps bottleneck
                              </span>
                            </>
                          )}
                        </div>
                      </div>
                    </div>

                    {/* Scores & Badges Row */}
                    <div className="flex flex-wrap items-center gap-6">
                      <div>
                        <div className="text-[10px] text-gray-500 font-mono">INVOICE AMOUNT</div>
                        <div className="text-sm font-bold text-white font-mono mt-0.5">{formatINR(item.invoice_amount)}</div>
                      </div>

                      <div className="hidden sm:block">
                        <div className="text-[10px] text-gray-500 font-mono">CASH IMPACT</div>
                        <span className={`px-2 py-0.5 rounded text-[9px] font-bold inline-block mt-0.5 ${
                          item.cash_impact_level === 'HIGH' ? 'text-rose-400 bg-rose-500/10' : 'text-gray-400 bg-gray-500/10'
                        }`}>
                          {item.cash_impact_level} IMPACT
                        </span>
                      </div>

                      <div className="hidden sm:block">
                        <div className="text-[10px] text-gray-500 font-mono">RECEIVABLE RISK</div>
                        <div className="mt-0.5">
                          <RiskBadge level={item.risk_level} />
                        </div>
                      </div>

                      <div>
                        <div className="text-[10px] text-gray-500 font-mono text-center">PRIORITY</div>
                        <div className="text-center mt-0.5">
                          <span className={`px-2 py-0.5 rounded font-mono font-black text-xs ${
                            item.priority_score >= 70 ? 'text-rose-400 bg-rose-500/10' : 'text-amber-400 bg-amber-500/10'
                          }`}>
                            {item.priority_score}
                          </span>
                        </div>
                      </div>

                      <div className="text-right shrink-0">
                        <div className="text-[10px] text-gray-500 font-mono">RECOMMENDED ACTION</div>
                        <span className="text-purple-400 hover:text-purple-300 font-bold mt-0.5 flex items-center gap-0.5">
                          {item.recommended_action}
                          <ChevronRight size={14} className={`transition-transform duration-200 ${isExpanded ? 'rotate-90' : ''}`} />
                        </span>
                      </div>
                    </div>
                  </div>

                  {/* Expanded evidence details */}
                  {isExpanded && (
                    <div className="px-5 pb-5 pt-2 border-t border-[#1C1D2A] bg-[#0A0A0F]/60 space-y-4">
                      {/* Threat Explanations */}
                      <div>
                        <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Why this invoice is ranked first</div>
                        <ul className="space-y-2">
                          {item.why_explanation.map((bullet, bIdx) => (
                            <li key={bIdx} className="text-xs text-gray-300 flex items-start gap-2 leading-relaxed">
                              <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5"></span>
                              {bullet}
                            </li>
                          ))}
                        </ul>
                      </div>

                      {/* Action Details & Triggers */}
                      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pt-3 border-t border-[#12121B]">
                        <div className="text-xs text-gray-400 leading-relaxed flex gap-1.5 items-start">
                          <Info size={14} className="text-purple-400 shrink-0 mt-0.5" />
                          <span>{item.action_explanation}</span>
                        </div>
                        
                        <div className="flex gap-2.5">
                          <button 
                            onClick={() => navigate(`/receivables/${item.invoice_id}`)}
                            className="px-4 py-2 bg-[#12121A] hover:bg-[#1C1C28] border border-[#232332] rounded-xl text-xs font-semibold text-white transition cursor-pointer"
                          >
                            Analyze Payment Scenarios
                          </button>
                          
                          <button 
                            onClick={async () => {
                              try {
                                const neg = await api.startNegotiation(item.invoice_id);
                                navigate(`/negotiations/${neg.id}`);
                              } catch {
                                alert('Negotiation setup failed. Profile may be locked.');
                              }
                            }}
                            className="px-4 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-xl text-xs font-bold shadow-[0_2px_10px_rgba(168,85,247,0.25)] transition cursor-pointer flex items-center gap-1"
                          >
                            <Sparkles size={12} />
                            Launch Negotiation Copilot
                          </button>
                        </div>
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ) : (
          <EmptyState 
            title="Action Queue Empty"
            description="All active receivables are classified low-risk and no upcoming cash-flow gap thresholds are triggered."
          />
        )}

      </div>
    </DashboardLayout>
  );
}
