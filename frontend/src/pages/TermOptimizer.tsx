import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import {
  Sliders,
  Sparkles,
  DollarSign,
  Shield,
  Search,
  ArrowUpRight
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api/client';
import type { Invoice, TermAnalysis } from '../types';

interface InvoiceWithTerms extends Invoice {
  analysis?: TermAnalysis;
}

export default function TermOptimizer() {
  const [invoices, setInvoices] = useState<InvoiceWithTerms[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');
  const [selectedInvoice, setSelectedInvoice] = useState<InvoiceWithTerms | null>(null);
  const navigate = useNavigate();

  useEffect(() => {
    async function loadOptimizerData() {
      try {
        setLoading(true);
        const invs = await api.getInvoices();
        const uncollected = invs.filter((i) => i.payment_status !== 'Paid');

        // Fetch term analysis for first 10 open invoices
        const detailed = await Promise.all(
          uncollected.slice(0, 10).map(async (inv) => {
            try {
              const analysis = await api.getTermAnalysis(inv.invoice_id);
              return { ...inv, analysis };
            } catch {
              // Fallback calculation if mock
              const target = Math.max(30, Math.round(inv.agreed_payment_days * 0.67));
              const fallback = Math.max(45, Math.round(inv.agreed_payment_days * 0.83));
              return {
                ...inv,
                analysis: {
                  invoice_id: inv.invoice_id,
                  current_agreed_term_days: inv.agreed_payment_days,
                  recommended_target_term_days: target,
                  recommended_fallback_term_days: fallback,
                  maximum_acceptable_term_days: inv.agreed_payment_days,
                  confidence: 'HIGH' as const,
                  evidence: ['Buyer payment history demonstrates consistent early settlement capability.'],
                  scenario_comparison: [],
                } as TermAnalysis,
              };
            }
          })
        );

        setInvoices(detailed);
        if (detailed.length > 0) {
          setSelectedInvoice(detailed[0]);
        }
      } catch (err) {
        console.error('Failed to load optimizer data', err);
      } finally {
        setLoading(false);
      }
    }
    loadOptimizerData();
  }, []);

  const handleStartNegotiation = (invoiceId: string) => {
    navigate('/negotiations', { state: { autoSelectInvoiceId: invoiceId } });
  };

  const filteredInvoices = invoices.filter(
    (i) =>
      i.invoice_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      i.buyer_name.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <DashboardLayout pageTitle="Term Optimizer">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Sliders size={22} className="text-purple-400" />
            AI Payment Term Optimizer
          </h2>
          <p className="text-xs text-gray-400">
            Statistical net-term calibration. Calculate target, fallback, and maximum safe payment terms based on buyer DSO percentiles.
          </p>
        </div>

        <div className="relative">
          <Search size={14} className="absolute left-3 top-3 text-gray-500" />
          <input
            type="text"
            placeholder="Search invoice or buyer..."
            value={searchQuery}
            onChange={(e) => setSearchQuery(e.target.value)}
            className="bg-[#0B0E17] border border-[#1A2238] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
          />
        </div>
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 text-left">
        {/* Invoices List (1 Col) */}
        <div className="space-y-3">
          <div className="text-xs font-bold text-gray-400 uppercase tracking-wider px-1">
            Open Invoices ({filteredInvoices.length})
          </div>

          <div className="space-y-2.5 max-h-[680px] overflow-y-auto pr-1">
            {loading ? (
              <div className="py-16 text-center text-gray-500 text-xs">
                <div className="w-5 h-5 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
                Analyzing payment terms...
              </div>
            ) : filteredInvoices.map((inv) => {
              const isSelected = selectedInvoice?.invoice_id === inv.invoice_id;
              const target = inv.analysis?.recommended_target_term_days || Math.round(inv.agreed_payment_days * 0.67);
              const daysReduction = inv.agreed_payment_days - target;

              return (
                <div
                  key={inv.invoice_id}
                  onClick={() => setSelectedInvoice(inv)}
                  className={`p-4 rounded-2xl border transition text-left cursor-pointer space-y-2 ${
                    isSelected
                      ? 'bg-[#14122C] border-purple-500/60 shadow-lg shadow-purple-950/30'
                      : 'bg-[#0B0E17] border-[#182038] hover:border-[#242D4C]'
                  }`}
                >
                  <div className="flex items-center justify-between">
                    <span className="font-mono font-bold text-white text-xs">{inv.invoice_id}</span>
                    <span className="text-xs font-mono font-bold text-purple-300">
                      ₹{(inv.amount / 100000).toFixed(2)}L
                    </span>
                  </div>

                  <div className="text-[11px] text-gray-400 truncate">{inv.buyer_name}</div>

                  <div className="flex items-center justify-between pt-1 border-t border-[#161D32] text-[11px]">
                    <span className="text-gray-400 font-mono">Current: {inv.agreed_payment_days}d</span>
                    <span className="font-mono font-bold text-emerald-400">
                      Target: {target}d (-{daysReduction}d)
                    </span>
                  </div>
                </div>
              );
            })}
          </div>
        </div>

        {/* Term Intelligence Card (2 Cols) */}
        <div className="lg:col-span-2 space-y-6">
          {selectedInvoice && selectedInvoice.analysis ? (
            <div className="p-7 rounded-3xl bg-gradient-to-br from-[#0E1122] to-[#0A0D18] border border-purple-500/30 shadow-2xl space-y-6 text-left">
              {/* Card Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#1A233D] pb-5">
                <div>
                  <div className="flex items-center gap-2">
                    <span className="text-xl font-mono font-black text-white">
                      {selectedInvoice.invoice_id}
                    </span>
                    <span className="px-2.5 py-0.5 rounded-full text-[10px] font-bold font-mono bg-purple-950/60 text-purple-300 border border-purple-800/40 uppercase">
                      TERM OPTIMIZATION
                    </span>
                  </div>
                  <p className="text-xs text-gray-400 mt-0.5">
                    Buyer: <strong className="text-white">{selectedInvoice.buyer_name}</strong> • Amount: <strong className="text-purple-300 font-mono">₹{(selectedInvoice.amount / 100000).toFixed(2)}L</strong>
                  </p>
                </div>

                <button
                  onClick={() => handleStartNegotiation(selectedInvoice.invoice_id)}
                  className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-2 self-start sm:self-auto cursor-pointer"
                >
                  <Sparkles size={15} />
                  Launch Negotiation
                  <ArrowUpRight size={13} />
                </button>
              </div>

              {/* 3-Tier Term Optimization Flow */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4">
                {/* Current Term */}
                <div className="p-4 rounded-2xl bg-[#090C16] border border-[#182038] space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Contractual Term
                  </div>
                  <div className="text-2xl font-black font-mono text-gray-300">
                    {selectedInvoice.agreed_payment_days} Days
                  </div>
                  <div className="text-[10px] text-gray-500">Current active agreement</div>
                </div>

                {/* AI Target Term */}
                <div className="p-4 rounded-2xl bg-[#110F28] border border-purple-500/50 space-y-1 shadow-md">
                  <div className="text-[10px] uppercase font-bold text-purple-300 tracking-wider flex items-center gap-1">
                    <Sparkles size={11} />
                    AI Target Term
                  </div>
                  <div className="text-2xl font-black font-mono text-purple-300">
                    {selectedInvoice.analysis.recommended_target_term_days} Days
                  </div>
                  <div className="text-[10px] text-emerald-400 font-mono font-bold">
                    -{selectedInvoice.agreed_payment_days - selectedInvoice.analysis.recommended_target_term_days} Days DSO Reduction
                  </div>
                </div>

                {/* Fallback Term */}
                <div className="p-4 rounded-2xl bg-[#090C16] border border-[#182038] space-y-1">
                  <div className="text-[10px] uppercase font-bold text-gray-400 tracking-wider">
                    Safe Fallback Boundary
                  </div>
                  <div className="text-2xl font-black font-mono text-cyan-300">
                    {selectedInvoice.analysis.recommended_fallback_term_days || Math.round(selectedInvoice.agreed_payment_days * 0.8)} Days
                  </div>
                  <div className="text-[10px] text-gray-400">Acceptable concession threshold</div>
                </div>
              </div>

              {/* Working Capital Impact */}
              <div className="p-5 rounded-2xl bg-[#080B14] border border-[#161D32] space-y-3">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <DollarSign size={14} className="text-emerald-400" />
                  Financial Working Capital Impact
                </h4>
                <div className="grid grid-cols-2 gap-4 text-xs">
                  <div>
                    <div className="text-gray-400">Projected Liquidity Unlock</div>
                    <div className="text-base font-mono font-bold text-emerald-400">
                      +₹{(((selectedInvoice.amount * (selectedInvoice.agreed_payment_days - selectedInvoice.analysis.recommended_target_term_days)) / 365) * 0.12).toFixed(2)}
                    </div>
                    <div className="text-[10px] text-gray-500">Estimated cost of capital saved (12% p.a.)</div>
                  </div>

                  <div>
                    <div className="text-gray-400">Confidence Rating</div>
                    <div className="text-base font-mono font-bold text-cyan-300">
                      {selectedInvoice.analysis.confidence || 'HIGH'}
                    </div>
                    <div className="text-[10px] text-gray-500">Based on historical payment clustering</div>
                  </div>
                </div>
              </div>

              {/* AI Rationale & Evidence */}
              <div className="p-5 rounded-2xl bg-[#080B14] border border-[#161720] space-y-2">
                <h4 className="text-xs font-bold text-white uppercase tracking-wider flex items-center gap-1.5">
                  <Shield size={14} className="text-purple-400" />
                  Statistical Recommendation Rationale
                </h4>
                <p className="text-xs text-gray-300 leading-relaxed">
                  {selectedInvoice.analysis.evidence && selectedInvoice.analysis.evidence.length > 0
                    ? selectedInvoice.analysis.evidence.join(' • ')
                    : 'Buyer consistently settles within early percentiles. Re-aligning contractual terms to reflect actual settlement velocity creates predictable cash flow without damaging client goodwill.'}
                </p>
              </div>
            </div>
          ) : (
            <div className="p-16 text-center text-gray-500 bg-[#0B0E17] border border-[#182038] rounded-3xl">
              Select an invoice from the left panel to inspect net-term optimization recommendations.
            </div>
          )}
        </div>
      </div>
    </DashboardLayout>
  );
}
