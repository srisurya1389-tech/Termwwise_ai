import React, { useState, useEffect } from 'react';
import { useParams, Link } from 'react-router-dom';
import {
  ArrowLeft,
  Clock,
  AlertCircle,
  CreditCard,
} from 'lucide-react';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { CustomerInvoiceDetail as DetailType } from '../../types';

export default function CustomerInvoiceDetail() {
  const { id } = useParams<{ id: string }>();
  const { user } = useAuth();
  const [invoice, setInvoice] = useState<DetailType | null>(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [requestedDays, setRequestedDays] = useState(60);
  const [reason, setReason] = useState('Working Capital Optimization');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [respondingCounter, setRespondingCounter] = useState(false);

  const fetchDetail = async () => {
    if (!id) return;
    try {
      setLoading(true);
      const res = await api.getCustomerInvoiceDetail(id, user?.email);
      setInvoice(res);
      setRequestedDays(Math.max(res.agreed_payment_days + 15, 60));
      setError(null);
    } catch (err: any) {
      console.error('Failed to fetch invoice details', err);
      setError(err.message || 'Invoice not found.');
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchDetail();
  }, [id, user?.email]);

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!invoice) return;

    try {
      setSubmitting(true);
      await api.createPaymentRequest(
        {
          invoice_id: invoice.invoice_id,
          requested_term: requestedDays,
          reason,
          message,
        },
        user?.email
      );
      setModalOpen(false);
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCounterResponse = async (action: 'ACCEPT' | 'REJECT') => {
    if (!invoice?.active_request) return;

    try {
      setRespondingCounter(true);
      await api.respondToCounteroffer(
        invoice.active_request.id,
        {
          action,
          message: action === 'ACCEPT' ? 'Accepted counteroffer terms.' : 'Rejected counteroffer.',
        },
        user?.email
      );
      fetchDetail();
    } catch (err: any) {
      alert(err.message || 'Failed to process counteroffer response.');
    } finally {
      setRespondingCounter(false);
    }
  };

  if (loading) {
    return (
      <CustomerLayout pageTitle="Invoice Details">
        <div className="flex flex-col items-center justify-center py-24 text-gray-400">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin mb-4"></div>
          <p className="font-mono text-sm">Loading invoice statement...</p>
        </div>
      </CustomerLayout>
    );
  }

  if (error || !invoice) {
    return (
      <CustomerLayout pageTitle="Invoice Not Found">
        <div className="p-8 bg-[#0D111E] border border-rose-900/40 rounded-2xl text-center space-y-4 max-w-lg mx-auto my-12">
          <AlertCircle size={36} className="mx-auto text-rose-400" />
          <h3 className="text-lg font-bold text-white">Invoice Statement Unavailable</h3>
          <p className="text-xs text-gray-400">{error || 'This invoice does not exist or you do not have permission.'}</p>
          <Link
            to="/customer/invoices"
            className="inline-flex items-center gap-2 px-4 py-2 bg-cyan-600 hover:bg-cyan-500 text-white font-bold text-xs rounded-xl"
          >
            <ArrowLeft size={14} /> Back to Invoices
          </Link>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout pageTitle={`Invoice ${invoice.invoice_id}`}>
      {/* Back button */}
      <div className="mb-6">
        <Link
          to="/customer/invoices"
          className="inline-flex items-center gap-2 text-xs text-gray-400 hover:text-cyan-300 font-semibold transition"
        >
          <ArrowLeft size={14} /> Back to Invoices
        </Link>
      </div>

      {/* Invoice Overview Card */}
      <div className="p-6 bg-gradient-to-r from-[#0C1222] via-[#0E172C] to-[#0A0E1A] border border-[#1B2440] rounded-2xl mb-8 relative shadow-xl">
        <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-6">
          <div className="space-y-2">
            <div className="flex items-center gap-3">
              <span className="text-xl font-mono font-black text-white">{invoice.invoice_id}</span>
              <span
                className={`px-3 py-0.5 rounded-full text-xs font-bold uppercase tracking-wider ${
                  invoice.payment_status === 'Paid'
                    ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                    : invoice.payment_status === 'Overdue'
                    ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                    : 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                }`}
              >
                {invoice.payment_status}
              </span>
            </div>
            <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-6 gap-y-1">
              <span>Customer: <strong className="text-white">{invoice.buyer_name}</strong></span>
              <span>Supplier: <strong className="text-cyan-300">NovaCraft Manufacturing</strong></span>
              <span>Invoice Date: <strong className="text-gray-300 font-mono">{invoice.invoice_date}</strong></span>
              <span>Due Date: <strong className="text-gray-300 font-mono">{invoice.due_date}</strong></span>
            </div>
          </div>

          <div className="flex items-center gap-3">
            {invoice.payment_status !== 'Paid' && !invoice.has_active_request && (
              <button
                onClick={() => setModalOpen(true)}
                className="px-4 py-2.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
              >
                <Clock size={16} />
                Request Extension
              </button>
            )}
          </div>
        </div>
      </div>

      {/* Counteroffer / Active Request Banner (if any) */}
      {invoice.active_request && (
        <div className="mb-8 p-6 bg-[#0E1629] border border-cyan-500/40 rounded-2xl shadow-xl space-y-4">
          <div className="flex items-center justify-between flex-wrap gap-2">
            <div className="flex items-center gap-2.5">
              <Clock size={20} className="text-cyan-400 animate-pulse" />
              <h3 className="text-base font-bold text-white">
                Payment Term Adjustment Request #{invoice.active_request.id}
              </h3>
            </div>
            <span
              className={`px-3 py-0.5 rounded-full text-xs font-mono font-bold uppercase ${
                invoice.active_request.status === 'COUNTEROFFER'
                  ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40 animate-pulse'
                  : invoice.active_request.status === 'APPROVED'
                  ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                  : invoice.active_request.status === 'REJECTED'
                  ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                  : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
              }`}
            >
              Status: {invoice.active_request.status}
            </span>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
            <div className="p-3 bg-[#0A0F1D] border border-[#18233D] rounded-xl space-y-1">
              <div className="text-gray-400">Original Term</div>
              <div className="text-base font-mono font-bold text-gray-300">
                {invoice.active_request.current_term} Days
              </div>
            </div>

            <div className="p-3 bg-[#0A0F1D] border border-[#18233D] rounded-xl space-y-1">
              <div className="text-gray-400">Your Requested Term</div>
              <div className="text-base font-mono font-bold text-cyan-300">
                {invoice.active_request.requested_term} Days
              </div>
              <div className="text-[11px] text-gray-500 truncate">{invoice.active_request.reason}</div>
            </div>

            <div className="p-3 bg-[#0A0F1D] border border-[#18233D] rounded-xl space-y-1">
              <div className="text-gray-400">Supplier Decision / Counter</div>
              <div className="text-base font-mono font-bold text-purple-300">
                {invoice.active_request.counter_term
                  ? `${invoice.active_request.counter_term} Days`
                  : invoice.active_request.status}
              </div>
              {invoice.active_request.counter_message && (
                <div className="text-[11px] text-gray-400 truncate">
                  "{invoice.active_request.counter_message}"
                </div>
              )}
            </div>
          </div>

          {/* If supplier made a counteroffer, customer can accept or reject */}
          {invoice.active_request.status === 'COUNTEROFFER' && (
            <div className="p-4 bg-purple-950/30 border border-purple-800/40 rounded-xl flex flex-col md:flex-row md:items-center justify-between gap-4">
              <div className="text-xs space-y-1">
                <div className="font-bold text-purple-200">
                  NovaCraft Manufacturing proposed a Counteroffer of {invoice.active_request.counter_term} Days.
                </div>
                <div className="text-gray-400">
                  Accepting this counteroffer will automatically adjust your invoice due date to match the new terms.
                </div>
              </div>

              <div className="flex items-center gap-3 shrink-0">
                <button
                  onClick={() => handleCounterResponse('REJECT')}
                  disabled={respondingCounter}
                  className="px-4 py-2 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/40 text-rose-300 text-xs font-bold rounded-xl transition"
                >
                  Decline
                </button>
                <button
                  onClick={() => handleCounterResponse('ACCEPT')}
                  disabled={respondingCounter}
                  className="px-5 py-2 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black rounded-xl shadow-lg shadow-emerald-500/20 transition"
                >
                  Accept New Term ({invoice.active_request.counter_term}d)
                </button>
              </div>
            </div>
          )}
        </div>
      )}

      {/* Financial Breakdown Grid */}
      <div className="grid grid-cols-1 md:grid-cols-3 gap-6 mb-8">
        <div className="p-5 bg-[#0C101E] border border-[#1A223A] rounded-2xl space-y-1">
          <div className="text-xs text-gray-400 uppercase font-medium">Total Billed Amount</div>
          <div className="text-2xl font-mono font-black text-white">
            ₹{(invoice.amount / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-gray-500">Gross invoice value</div>
        </div>

        <div className="p-5 bg-[#0C101E] border border-[#1A223A] rounded-2xl space-y-1">
          <div className="text-xs text-gray-400 uppercase font-medium">Settled to Date</div>
          <div className="text-2xl font-mono font-black text-emerald-400">
            ₹{(invoice.paid_amount / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-emerald-500/80">Reconciled payments</div>
        </div>

        <div className="p-5 bg-[#0C101E] border border-[#1A223A] rounded-2xl space-y-1">
          <div className="text-xs text-gray-400 uppercase font-medium">Balance Outstanding</div>
          <div className="text-2xl font-mono font-black text-cyan-300">
            ₹{(invoice.outstanding_amount / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-cyan-500/80">
            {invoice.days_until_due < 0
              ? `${Math.abs(invoice.days_until_due)} days past due`
              : `${invoice.days_until_due} days remaining`}
          </div>
        </div>
      </div>

      {/* Payment Timeline / Receipts */}
      <div className="p-6 bg-[#0A0D18] border border-[#182038] rounded-2xl space-y-4">
        <div className="flex items-center justify-between">
          <div>
            <h3 className="text-base font-bold text-white flex items-center gap-2">
              <CreditCard size={18} className="text-cyan-400" />
              Payment Records & Receipts
            </h3>
            <p className="text-xs text-gray-400">Recorded transactions matching invoice {invoice.invoice_id}</p>
          </div>
        </div>

        {invoice.payments && invoice.payments.length > 0 ? (
          <div className="space-y-3">
            {invoice.payments.map((p) => (
              <div
                key={p.payment_id}
                className="p-4 bg-[#0E1322] border border-[#1B2440] rounded-xl flex items-center justify-between flex-wrap gap-4"
              >
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <span className="font-mono font-bold text-white text-xs">{p.payment_id}</span>
                    <span className="px-2 py-0.5 rounded text-[10px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40">
                      {p.status}
                    </span>
                  </div>
                  <div className="text-xs text-gray-400">
                    Payment Date: <strong className="text-gray-300 font-mono">{p.payment_date}</strong> • Method: <span className="uppercase text-gray-300 font-mono">{p.source}</span>
                  </div>
                </div>

                <div className="text-right">
                  <div className="text-base font-mono font-black text-emerald-400">
                    +₹{(p.amount / 100000).toFixed(2)}L
                  </div>
                  <div className="text-[10px] text-gray-500 font-mono">100% RECONCILED</div>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-8 bg-[#0E1322] border border-[#1B2440] rounded-xl text-center text-gray-400 text-xs">
            No payments have been recorded for this invoice yet.
          </div>
        )}
      </div>

      {/* Extension Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D111E] border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#1A2238] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-cyan-400" />
                  Request Payment Extension
                </h3>
                <p className="text-xs text-gray-400">
                  Invoice <span className="font-mono text-cyan-300 font-semibold">{invoice.invoice_id}</span> (₹{(invoice.amount / 100000).toFixed(2)}L)
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleCreateRequest} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                    Current Agreed Term
                  </label>
                  <div className="w-full bg-[#13182A] border border-[#212A48] rounded-xl px-3 py-2 text-xs font-mono text-gray-300">
                    {invoice.agreed_payment_days} Days
                  </div>
                </div>

                <div>
                  <label className="block text-xs font-semibold text-cyan-300 mb-1.5">
                    Requested Term (Days)
                  </label>
                  <input
                    type="number"
                    min={invoice.agreed_payment_days + 1}
                    max={180}
                    value={requestedDays}
                    onChange={(e) => setRequestedDays(parseInt(e.target.value) || 0)}
                    required
                    className="w-full bg-[#13182A] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                  />
                </div>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Reason for Extension Request
                </label>
                <select
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  className="w-full bg-[#13182A] border border-[#212A48] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  <option value="Working Capital Optimization">Working Capital Optimization</option>
                  <option value="Inventory Turnover Cycle Delay">Inventory Turnover Cycle Delay</option>
                  <option value="Downstream Client Receivable Delay">Downstream Client Receivable Delay</option>
                  <option value="Quarterly Cash Flow Alignment">Quarterly Cash Flow Alignment</option>
                  <option value="Other Commercial Request">Other Commercial Request</option>
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Additional Message / Context for NovaCraft Finance Team
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide context regarding payment timeline commitment..."
                  className="w-full bg-[#13182A] border border-[#212A48] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-[#1A2238] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#13182A] hover:bg-[#1C233C] text-gray-300 text-xs font-semibold rounded-xl border border-[#212A48] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
                >
                  {submitting ? 'Submitting...' : 'Submit Extension Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
