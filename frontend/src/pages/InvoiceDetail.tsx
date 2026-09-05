import { useEffect, useState } from 'react';
import { useParams, useNavigate } from 'react-router-dom';
import {
  ArrowLeft,
  Calendar,
  AlertTriangle,
  Sparkles,
  TrendingUp,
  Lightbulb,
  Hourglass,
  ShieldCheck
} from 'lucide-react';

import { api } from '../api/client';
import type { Invoice, PriorityItem, TermAnalysis, PaymentTimeline } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
import ConfidenceIndicator from '../components/ConfidenceIndicator';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function InvoiceDetail() {
  const { invoiceId } = useParams<{ invoiceId: string }>();
  const navigate = useNavigate();

  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [invoice, setInvoice] = useState<Invoice | null>(null);
  const [priorityItem, setPriorityItem] = useState<PriorityItem | null>(null);
  const [termAnalysis, setTermAnalysis] = useState<TermAnalysis | null>(null);
  const [paymentsTimeline, setPaymentsTimeline] = useState<PaymentTimeline | null>(null);
  const [startingNegotiation, setStartingNegotiation] = useState(false);

  useEffect(() => {
    async function loadDetailData() {
      if (!invoiceId) return;
      try {
        setLoading(true);
        const [invData, priData, analysisData, timelineData] = await Promise.all([
          api.getInvoice(invoiceId),
          api.getPriorities(),
          api.getTermAnalysis(invoiceId),
          api.getInvoicePayments(invoiceId).catch(() => null),
        ]);

        setInvoice(invData);
        setTermAnalysis(analysisData);
        setPaymentsTimeline(timelineData);


        // Find matches in priorities queue
        const match = priData.queue.find((item) => item.invoice_id === invoiceId);
        if (match) {
          setPriorityItem(match);
        }
        setError(null);
      } catch (err: any) {
        setError(err.message || 'Failed to load invoice details.');
      } finally {
        setLoading(false);
      }
    }
    loadDetailData();
  }, [invoiceId]);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Receivable Detail">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout pageTitle="Receivable Detail">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0C0C12] border border-[#171822] rounded-2xl max-w-md mx-auto mt-12">
          <AlertTriangle className="text-rose-500 mb-4" size={40} />
          <h3 className="text-sm font-semibold text-white mb-2">Invoice Not Found</h3>
          <p className="text-xs text-gray-500 mb-6">{error || `Invoice with ID '${invoiceId}' was not found.`}</p>
          <button 
            onClick={() => navigate('/receivables')}
            className="px-4 py-2 bg-[#12121B] border border-[#1C1D26] hover:bg-[#1A1A26] rounded-xl text-xs font-semibold cursor-pointer text-white"
          >
            Back to Receivables
          </button>
        </div>
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

  const handleStartNegotiation = async () => {
    if (!invoiceId) return;
    try {
      setStartingNegotiation(true);
      const neg = await api.startNegotiation(invoiceId);
      // Redirect to the negotiation workspace
      navigate(`/negotiations/${neg.id}`);
    } catch (err) {
      console.error('Failed to initiate negotiation', err);
      alert('Failed to initiate AI Negotiation. Please check if a negotiation is already active.');
    } finally {
      setStartingNegotiation(false);
    }
  };

  return (
    <DashboardLayout pageTitle={`Receivable Detail • ${invoice.invoice_id}`}>
      <div className="space-y-6 text-left">
        
        {/* Back Link */}
        <button 
          onClick={() => navigate('/receivables')}
          className="flex items-center gap-2 text-xs text-gray-400 hover:text-white cursor-pointer transition font-medium"
        >
          <ArrowLeft size={14} />
          Back to Receivables Ledger
        </button>

        {/* Invoice Summary Banner */}
        <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col md:flex-row md:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-black text-white font-mono">{invoice.invoice_id}</span>
              <RiskBadge level={priorityItem?.risk_level || 'LOW'} />
              <span className={`px-2 py-0.5 rounded-full text-[10px] font-bold border ${
                invoice.payment_status === 'Paid'
                  ? 'bg-emerald-500/10 text-emerald-400 border-emerald-500/15'
                  : 'bg-amber-500/10 text-amber-400 border-amber-500/15'
              }`}>
                {invoice.payment_status.toUpperCase()}
              </span>
            </div>
            <div className="text-xs text-gray-400">
              Buyer Name: <span className="text-white font-semibold">{invoice.buyer_name}</span>
            </div>
          </div>

          <div className="flex items-center gap-6">
            <div>
              <div className="text-[10px] text-gray-500 uppercase tracking-wider">Invoice Amount</div>
              <div className="text-2xl font-black text-white font-mono mt-1">{formatINR(invoice.amount)}</div>
            </div>

            {invoice.payment_status !== 'Paid' && (
              <button
                onClick={handleStartNegotiation}
                disabled={startingNegotiation}
                id="tour-initiate-negotiation"
                className="px-5 py-3 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white font-bold rounded-xl text-xs flex items-center gap-2 shadow-[0_4px_20px_rgba(168,85,247,0.3)] disabled:opacity-50 cursor-pointer transition-all duration-200"
              >
                <Sparkles size={14} />
                {startingNegotiation ? 'Preparing Agent...' : 'Initiate AI Negotiation'}
              </button>
            )}
          </div>
        </div>

        {/* Dynamic Threat Analytics Grid */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          
          {/* Main Analytics Fields */}
          <div className="lg:col-span-2 space-y-6">
            
            {/* Metadata Fields */}
            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 p-5 rounded-2xl bg-[#08080C] border border-[#15151F]">
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Calendar size={12} />
                  Agreed Net Term
                </div>
                <div className="text-base font-bold text-white mt-1">{invoice.agreed_payment_days} Days</div>
              </div>
              
              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <Hourglass size={12} />
                  Contractual Due Date
                </div>
                <div className="text-base font-bold text-white mt-1">
                  {new Date(invoice.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                </div>
              </div>

              <div>
                <div className="text-[10px] text-gray-500 uppercase tracking-wider flex items-center gap-1.5">
                  <TrendingUp size={12} />
                  Predicted Inflow Date
                </div>
                <div className="text-base font-bold text-purple-300 mt-1 font-mono">
                  {priorityItem ? (
                    new Date(priorityItem.predicted_payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })
                  ) : (
                    'Not calculated'
                  )}
                </div>
              </div>
            </div>

            {/* Explainable Threat Explanations */}
            {priorityItem?.why_explanation && priorityItem.why_explanation.length > 0 && (
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-4">
                  <Lightbulb size={14} className="text-purple-400" />
                  Why This Receivable Matters
                </h3>
                <ul className="space-y-3">
                  {priorityItem.why_explanation.map((bullet, i) => (
                    <li key={i} className="text-xs text-gray-300 flex items-start gap-2.5 leading-relaxed">
                      <span className="h-1.5 w-1.5 rounded-full bg-purple-500 shrink-0 mt-1.5"></span>
                      {bullet}
                    </li>
                  ))}
                </ul>
              </div>
            )}

            {/* Simulated scenarios Comparison */}
            {termAnalysis?.scenario_comparison && (
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
                <h3 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-2 mb-2">
                  <TrendingUp size={14} className="text-purple-400" />
                  Simulated Scenario Comparisons
                </h3>
                <p className="text-[11px] text-gray-500 mb-6 leading-relaxed">
                  Calculates expected payment dates, cash buffer volumes, and gap risk scores for various proposed terms.
                </p>

                <div className="overflow-x-auto">
                  <table className="w-full text-xs text-left">
                    <thead>
                      <tr className="border-b border-[#161720] text-gray-500 pb-2">
                        <th className="py-2.5 font-bold">Proposed Term</th>
                        <th className="py-2.5 font-bold">Expected Receipt</th>
                        <th className="py-2.5 font-bold">Cash within 60 Days</th>
                        <th className="py-2.5 font-bold">Projected Max Gap</th>
                        <th className="py-2.5 font-bold text-right">Risk Score</th>
                      </tr>
                    </thead>
                    <tbody className="divide-y divide-[#12121A]">
                      {termAnalysis.scenario_comparison.map((sim) => (
                        <tr 
                          key={sim.proposed_term}
                          className={`hover:bg-[#12121A]/40 transition ${
                            sim.proposed_term === invoice.agreed_payment_days ? 'bg-purple-950/10' : ''
                          }`}
                        >
                          <td className="py-3 font-semibold text-white">
                            {sim.proposed_term} Days{' '}
                            {sim.proposed_term === invoice.agreed_payment_days && (
                              <span className="text-[9px] text-purple-400 font-mono ml-1 font-bold uppercase">(Current)</span>
                            )}
                          </td>
                          <td className="py-3 font-mono text-gray-300">
                            {new Date(sim.expected_payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })}
                          </td>
                          <td className="py-3 text-gray-300 font-mono">{formatLakhs(sim.cash_within_60_days)}</td>
                          <td className="py-3 font-mono">
                            {sim.max_cash_flow_gap > 0 ? (
                              <span className="text-rose-400 font-semibold">{formatINR(sim.max_cash_flow_gap)}</span>
                            ) : (
                              <span className="text-emerald-400">No Gap</span>
                            )}
                          </td>
                          <td className="py-3 text-right">
                            <span className={`px-2 py-0.5 rounded font-bold font-mono ${
                              sim.risk_score >= 70 ? 'text-rose-400 bg-rose-500/10' : 'text-emerald-400 bg-emerald-500/10'
                            }`}>
                              {sim.risk_score} ({sim.risk_level})
                            </span>
                          </td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
              </div>
            )}

            {/* Payment Activity & Settlement Breakdown (Stage 10) */}
            <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] space-y-4">
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 border-b border-[#161722] pb-4">
                <div>
                  <h3 className="text-sm font-bold text-white tracking-tight flex items-center gap-2">
                    <ShieldCheck size={16} className="text-purple-400" />
                    Payment Settlement & Activity Timeline
                  </h3>
                  <p className="text-[11px] text-gray-500 mt-0.5">Verified transaction receipts and partial settlements.</p>
                </div>
                <div className="text-right">
                  <span className={`px-2.5 py-0.5 rounded-full text-xs font-mono font-bold ${
                    invoice.payment_status === 'Paid'
                      ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                      : invoice.payment_status === 'Partially Paid'
                      ? 'bg-indigo-500/10 text-indigo-400 border border-indigo-500/20'
                      : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                  }`}>
                    {invoice.payment_status.toUpperCase()}
                  </span>
                </div>
              </div>

              {/* Settlement Progress Bar */}
              {paymentsTimeline && (
                <div className="space-y-2 bg-[#0C0C14] p-4 rounded-xl border border-[#181826]">
                  <div className="flex justify-between text-xs font-mono">
                    <span className="text-gray-400">Total Invoiced: <strong className="text-white">{formatINR(paymentsTimeline.invoice_amount)}</strong></span>
                    <span className="text-emerald-400">Received: <strong>{formatINR(paymentsTimeline.total_received)}</strong></span>
                    <span className="text-amber-400">Outstanding: <strong>{formatINR(paymentsTimeline.outstanding_amount)}</strong></span>
                  </div>
                  <div className="w-full h-2.5 bg-[#181824] rounded-full overflow-hidden flex">
                    <div
                      className="bg-gradient-to-r from-emerald-500 to-teal-400 h-full transition-all duration-500"
                      style={{
                        width: `${Math.min(100, (paymentsTimeline.total_received / (paymentsTimeline.invoice_amount || 1)) * 100)}%`,
                      }}
                    ></div>
                  </div>
                  <div className="flex justify-between text-[10px] text-gray-500 font-mono">
                    <span>{((paymentsTimeline.total_received / (paymentsTimeline.invoice_amount || 1)) * 100).toFixed(0)}% Settled</span>
                    <span>{paymentsTimeline.payments.length} Transaction Events Recorded</span>
                  </div>
                </div>
              )}

              {/* Timeline Events List */}
              <div className="space-y-2 pt-2">
                <div className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Transaction History</div>
                {!paymentsTimeline || paymentsTimeline.payments.length === 0 ? (
                  <div className="p-4 text-center text-xs text-gray-500 bg-[#0A0A0F] rounded-xl border border-[#14141E]">
                    No settlement records received for this invoice yet.
                  </div>
                ) : (
                  paymentsTimeline.payments.map((p, idx) => (
                    <div
                      key={p.payment_id + idx}
                      className="p-3 bg-[#0E0E14] border border-[#181824] rounded-xl flex items-center justify-between hover:bg-[#12121A] transition"
                    >
                      <div className="flex items-center gap-3">
                        <div className={`h-8 w-8 rounded-lg flex items-center justify-center font-bold text-xs ${
                          p.status === 'SUCCESS' ? 'bg-emerald-950/40 text-emerald-400 border border-emerald-800/30' : 'bg-rose-950/40 text-rose-400 border border-rose-800/30'
                        }`}>
                          {p.status === 'SUCCESS' ? '✓' : '✗'}
                        </div>
                        <div>
                          <div className="text-xs font-bold text-white font-mono">{p.payment_id}</div>
                          <div className="text-[10px] text-gray-400">
                            {new Date(p.payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })} • Source:{' '}
                            <span className="font-mono text-purple-300 font-semibold">{p.source}</span>
                          </div>
                        </div>
                      </div>
                      <div className="text-right">
                        <div className="text-xs font-bold text-white font-mono">{formatINR(p.amount)}</div>
                        <span className={`text-[9px] font-mono font-bold px-1.5 py-0.2 rounded ${
                          p.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/30' : 'text-rose-400 bg-rose-950/30'
                        }`}>
                          {p.status}
                        </span>
                      </div>
                    </div>
                  ))
                )}
              </div>
            </div>
          </div>


          {/* Right sidebar - Optimization Ranges and Evidence */}
          <div className="space-y-6">
            
            {/* Priority Score Summary */}
            {priorityItem && (
              <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F] text-center">
                <div className="text-[10px] text-gray-500 uppercase tracking-wider">Priority Rank Score</div>
                <div className="text-5xl font-black text-white mt-2 font-mono">{priorityItem.priority_score}</div>
                <div className="text-[10px] font-semibold mt-1 uppercase tracking-wider text-rose-400 bg-rose-500/10 px-2 py-0.5 rounded-full w-fit mx-auto">
                  {priorityItem.recommended_action} REQUIRED
                </div>
                <div className="text-[10px] text-gray-500 mt-4 leading-relaxed">
                  Based on {priorityItem.risk_score} risk score, {priorityItem.cash_impact_score} cash impact score, and {priorityItem.opportunity_score} opportunity rating.
                </div>
              </div>
            )}

            {/* Optimization Recommendation Box */}
            {termAnalysis && (
              <div id="tour-term-optimizer" className="p-6 rounded-2xl bg-gradient-to-br from-[#0F0A1C] via-[#090612] to-[#06040C] border border-[#231A3D]">
                <div className="text-xs font-bold font-mono tracking-wider text-purple-400 uppercase mb-4 flex items-center gap-1.5">
                  <Sparkles size={14} />
                  Negotiation Guidance Limits
                </div>
                
                <div className="space-y-4">
                  <div className="flex justify-between items-center border-b border-[#1A1A28] pb-2.5">
                    <span className="text-xs text-gray-400">Target Term (Optimistic)</span>
                    <span className="text-xs font-bold text-white font-mono bg-indigo-500/10 text-indigo-400 px-2.5 py-0.5 rounded-lg border border-indigo-500/20">
                      {termAnalysis.recommended_target_term_days} Days
                    </span>
                  </div>

                  <div className="flex justify-between items-center border-b border-[#1A1A28] pb-2.5">
                    <span className="text-xs text-gray-400">Fallback Term (Compromise)</span>
                    <span className="text-xs font-bold text-white font-mono bg-purple-500/10 text-purple-400 px-2.5 py-0.5 rounded-lg border border-purple-500/20">
                      {termAnalysis.recommended_fallback_term_days} Days
                    </span>
                  </div>

                  <div className="flex justify-between items-center pb-1">
                    <span className="text-xs text-gray-400">Maximum Acceptable Term</span>
                    <span className="text-xs font-bold text-white font-mono bg-rose-500/10 text-rose-400 px-2.5 py-0.5 rounded-lg border border-rose-500/20">
                      {termAnalysis.maximum_acceptable_term_days} Days
                    </span>
                  </div>

                  {/* Confidence rating */}
                  <ConfidenceIndicator confidence={termAnalysis.confidence} />

                  {/* Evidence block */}
                  <div className="pt-4 border-t border-[#1F1F32]/60">
                    <div className="text-[10px] text-gray-500 uppercase tracking-wider font-bold mb-2">Supporting Evidence</div>
                    <ul className="space-y-2 text-[11px] text-gray-400 leading-relaxed">
                      {termAnalysis.evidence.map((bullet, i) => (
                        <li key={i} className="flex gap-2">
                          <span className="text-purple-400 shrink-0">•</span>
                          <span>{bullet}</span>
                        </li>
                      ))}
                    </ul>
                  </div>
                </div>
              </div>
            )}
            
          </div>
        </div>

      </div>
    </DashboardLayout>
  );
}
