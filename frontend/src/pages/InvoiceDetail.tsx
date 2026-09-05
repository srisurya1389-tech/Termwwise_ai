import { useEffect, useState } from 'react';
import { useParams, useNavigate, Link } from 'react-router-dom';
import {
  ArrowLeft,
  AlertTriangle,
  Sparkles,
  CreditCard,
  Building2,
  CheckCircle2,
  Clock,
  Sliders
} from 'lucide-react';

import { api } from '../api/client';
import type { Invoice, PriorityItem, TermAnalysis, PaymentTimeline } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
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

  const handleLaunchNegotiation = async () => {
    if (!invoice) return;
    try {
      setStartingNegotiation(true);
      const neg = await api.startNegotiation(invoice.invoice_id);
      navigate(`/negotiations/${neg.id}`);
    } catch {
      navigate('/negotiations');
    } finally {
      setStartingNegotiation(false);
    }
  };

  if (loading) {
    return (
      <DashboardLayout pageTitle="Invoice Intelligence">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  if (error || !invoice) {
    return (
      <DashboardLayout pageTitle="Invoice Intelligence">
        <div className="flex flex-col items-center justify-center p-12 text-center bg-[#090C16] border border-[#182038] rounded-2xl max-w-md mx-auto mt-12 space-y-4">
          <AlertTriangle className="text-rose-500" size={40} />
          <h3 className="text-base font-bold text-white">Invoice Not Found</h3>
          <p className="text-xs text-gray-400">{error || `Invoice with ID '${invoiceId}' was not found.`}</p>
          <button
            onClick={() => navigate('/receivables')}
            className="px-4 py-2 bg-purple-600 hover:bg-purple-500 text-white rounded-xl text-xs font-bold transition cursor-pointer"
          >
            Back to Receivables
          </button>
        </div>
      </DashboardLayout>
    );
  }

  // 5-step visual timeline state
  const isPaid = invoice.payment_status === 'Paid';
  const isOverdue = invoice.payment_status === 'Overdue';
  const timelineSteps = [
    { name: 'Invoice Created', date: invoice.invoice_date, done: true },
    { name: 'Payment Expected', date: invoice.due_date, done: true },
    { name: 'Reminder Scheduled', date: 'Day 30', done: isOverdue || isPaid },
    { name: 'AI Negotiation Copilot', date: priorityItem ? 'Active Priority' : 'Standby', done: isOverdue || isPaid },
    { name: 'Payment Reconciled', date: isPaid ? 'Settled' : 'Pending', done: isPaid },
  ];

  const targetTerm = termAnalysis?.recommended_target_term_days || 60;
  const fallbackTerm = termAnalysis?.recommended_fallback_term_days || 75;

  return (
    <DashboardLayout pageTitle={`Invoice Intelligence — ${invoice.invoice_id}`}>
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/receivables"
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-purple-300 font-semibold transition"
        >
          <ArrowLeft size={14} /> Back to Receivables
        </Link>
      </div>

      {/* Header Profile */}
      <div className="p-6 rounded-3xl bg-gradient-to-r from-[#110D26] via-[#14122C] to-[#0A0D18] border border-purple-500/30 mb-8 shadow-xl relative overflow-hidden text-left">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-2xl font-mono font-black text-white">{invoice.invoice_id}</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  isPaid
                    ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-800/40'
                    : isOverdue
                    ? 'bg-rose-950/60 text-rose-300 border border-rose-800/40'
                    : 'bg-amber-950/60 text-amber-300 border border-amber-800/40'
                }`}
              >
                {invoice.payment_status}
              </span>
              <RiskBadge level={priorityItem?.risk_level || 'LOW'} />
            </div>
            <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-6 gap-y-1">
              <span>
                Buyer: <strong className="text-purple-300 font-semibold">{invoice.buyer_name}</strong>
              </span>
              <span>
                Issue Date: <strong className="text-gray-300 font-mono">{invoice.invoice_date}</strong>
              </span>
              <span>
                Due Date: <strong className="text-gray-300 font-mono">{invoice.due_date}</strong>
              </span>
              <span>
                Contract Term: <strong className="text-purple-300 font-mono">{invoice.agreed_payment_days} Days</strong>
              </span>
            </div>
          </div>

          <div className="flex items-center gap-4">
            <div className="text-right">
              <div className="text-xs text-gray-400 uppercase font-medium">Invoice Value</div>
              <div className="text-2xl font-mono font-black text-white">
                ₹{(invoice.amount / 100000).toFixed(2)} Lakhs
              </div>
            </div>

            {!isPaid && (
              <button
                onClick={handleLaunchNegotiation}
                disabled={startingNegotiation}
                className="px-5 py-2.5 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow-lg shadow-purple-600/30 transition flex items-center gap-2 cursor-pointer"
              >
                <Sparkles size={15} />
                {startingNegotiation ? 'Opening Workspace...' : 'Start Negotiation'}
              </button>
            )}
          </div>
        </div>
      </div>

      {/* 5-Step Visual Timeline */}
      <div className="p-6 bg-[#0B0E17] border border-[#1A2238] rounded-2xl mb-8 space-y-4 shadow-xl text-left">
        <div className="flex items-center justify-between">
          <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
            <Clock size={16} className="text-purple-400" />
            5-Step Receivables Lifecycle Timeline
          </h3>
          <span className="text-xs font-mono text-gray-400">Status: {invoice.payment_status}</span>
        </div>

        <div className="grid grid-cols-1 sm:grid-cols-5 gap-3 pt-2">
          {timelineSteps.map((step, idx) => (
            <div
              key={step.name}
              className={`p-3.5 rounded-xl border text-left space-y-1 relative ${
                step.done
                  ? 'bg-[#11172A] border-indigo-500/40 text-indigo-200'
                  : 'bg-[#080B14] border-[#161D32] opacity-60'
              }`}
            >
              <div className="flex items-center justify-between text-[10px] font-mono font-bold">
                <span>0{idx + 1}</span>
                {step.done && <CheckCircle2 size={13} className="text-emerald-400" />}
              </div>
              <div className="text-xs font-bold text-white tracking-wide">{step.name}</div>
              <div className="text-[10px] text-gray-400 font-mono">{step.date}</div>
            </div>
          ))}
        </div>
      </div>

      {/* 2-Column Grid: Buyer Behavior vs Risk & Term Optimizer */}
      <div className="grid grid-cols-1 lg:grid-cols-2 gap-8 mb-8">
        {/* Buyer Behavior Intelligence */}
        <div className="p-6 bg-[#0B0E17] border border-[#1A2238] rounded-2xl space-y-4 shadow-xl text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Building2 size={16} className="text-cyan-400" />
              Buyer Payment Behavior Report
            </h3>
            <Link
              to={`/buyers/${invoice.buyer_id}`}
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold"
            >
              Full Profile →
            </Link>
          </div>

          <div className="grid grid-cols-2 sm:grid-cols-3 gap-3 text-xs">
            <div className="p-3.5 bg-[#0E1220] border border-[#19223A] rounded-xl space-y-1">
              <div className="text-gray-400">Historical Median</div>
              <div className="text-base font-mono font-bold text-white">62 Days</div>
              <div className="text-[10px] text-gray-500">p50 collection timing</div>
            </div>

            <div className="p-3.5 bg-[#0E1220] border border-[#19223A] rounded-xl space-y-1">
              <div className="text-gray-400">Average DSO</div>
              <div className="text-base font-mono font-bold text-purple-300">65.4 Days</div>
              <div className="text-[10px] text-gray-500">Trailing 12-month mean</div>
            </div>

            <div className="p-3.5 bg-[#0E1220] border border-[#19223A] rounded-xl space-y-1">
              <div className="text-gray-400">Late Payment Rate</div>
              <div className="text-base font-mono font-bold text-amber-400">18.5%</div>
              <div className="text-[10px] text-gray-500">Frequency of delays</div>
            </div>
          </div>

          <div className="p-4 bg-[#080B14] border border-[#161D32] rounded-xl text-xs space-y-1.5 text-left">
            <div className="font-bold text-gray-200">Behavioral Summary</div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              {invoice.buyer_name} maintains an institutional track record with high settlement predictability. While contractual terms are set to {invoice.agreed_payment_days} days, actual payments cluster tightly between 58 and 64 days, offering a prime opportunity for AI term compression.
            </p>
          </div>
        </div>

        {/* Term Optimizer Calibration */}
        <div className="p-6 bg-[#0B0E17] border border-[#1A2238] rounded-2xl space-y-4 shadow-xl text-left">
          <div className="flex items-center justify-between">
            <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
              <Sliders size={16} className="text-purple-400" />
              AI Net-Term Calibration
            </h3>
            <span className="px-2 py-0.5 rounded text-[10px] font-bold font-mono bg-purple-950/60 text-purple-300 border border-purple-800/40">
              OPTIMIZED
            </span>
          </div>

          <div className="grid grid-cols-3 gap-3 text-xs">
            <div className="p-3 bg-[#0E1220] border border-[#19223A] rounded-xl space-y-1 text-left">
              <div className="text-gray-400">Current Term</div>
              <div className="text-base font-mono font-bold text-gray-300">
                {invoice.agreed_payment_days}d
              </div>
              <div className="text-[10px] text-gray-500">Contractual</div>
            </div>

            <div className="p-3 bg-[#130F2A] border border-purple-500/50 rounded-xl space-y-1 text-left shadow-sm">
              <div className="text-purple-300 font-bold flex items-center gap-1">
                <Sparkles size={11} />
                Target
              </div>
              <div className="text-base font-mono font-bold text-purple-300">
                {targetTerm}d
              </div>
              <div className="text-[10px] text-emerald-400 font-bold">
                -{invoice.agreed_payment_days - targetTerm}d DSO
              </div>
            </div>

            <div className="p-3 bg-[#0E1220] border border-[#19223A] rounded-xl space-y-1 text-left">
              <div className="text-gray-400">Fallback</div>
              <div className="text-base font-mono font-bold text-cyan-300">
                {fallbackTerm}d
              </div>
              <div className="text-[10px] text-gray-500">Safe Boundary</div>
            </div>
          </div>

          <div className="p-4 bg-[#080B14] border border-[#161D32] rounded-xl text-xs space-y-2 text-left">
            <div className="font-bold text-gray-200 flex items-center justify-between">
              <span>Working Capital Impact</span>
              <span className="text-emerald-400 font-mono font-bold">
                +₹{(((invoice.amount * (invoice.agreed_payment_days - targetTerm)) / 365) * 0.12).toFixed(2)} Unlock
              </span>
            </div>
            <p className="text-gray-400 leading-relaxed text-[11px]">
              {termAnalysis?.evidence && termAnalysis.evidence.length > 0
                ? termAnalysis.evidence.join(' • ')
                : 'Compressing contractual terms to match verified median payment velocity reduces cash-flow gap exposure.'}
            </p>
          </div>
        </div>
      </div>

      {/* Payment Records & Settlement Timeline */}
      <div className="p-6 bg-[#0B0E17] border border-[#1A2238] rounded-2xl space-y-4 shadow-xl text-left">
        <h3 className="text-sm font-bold text-white uppercase tracking-wider flex items-center gap-2">
          <CreditCard size={16} className="text-emerald-400" />
          Reconciled Settlement Timeline & Payment Receipts
        </h3>

        {paymentsTimeline?.payments && paymentsTimeline.payments.length > 0 ? (
          <div className="space-y-3">
            {paymentsTimeline.payments.map((pmt) => (
              <div
                key={pmt.payment_id}
                className="p-4 bg-[#0E1322] border border-[#1A233D] rounded-xl flex items-center justify-between flex-wrap gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">{pmt.payment_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      {pmt.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400 font-mono">
                    Settled on {pmt.payment_date} via {pmt.source}
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-sm font-bold font-mono text-emerald-400">
                    +₹{(pmt.amount / 100000).toFixed(2)}L
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">Reconciled</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-6 bg-[#0E1322] border border-[#1A233D] rounded-xl text-center text-gray-400 text-xs">
            No partial or full settlements recorded for this invoice yet.
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
