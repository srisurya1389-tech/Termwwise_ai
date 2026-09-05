import React, { useState, useEffect } from 'react';
import {
  Clock,
  Plus,
  Check,
} from 'lucide-react';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { PaymentRequest, CustomerInvoiceItem } from '../../types';

export default function CustomerRequests() {
  const { user } = useAuth();
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [invoices, setInvoices] = useState<CustomerInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoiceId, setSelectedInvoiceId] = useState('');
  const [requestedDays, setRequestedDays] = useState(60);
  const [reason, setReason] = useState('Working Capital Optimization');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [actionLoading, setActionLoading] = useState<number | null>(null);

  const loadData = async () => {
    try {
      setLoading(true);
      const [reqs, invs] = await Promise.all([
        api.getCustomerRequests(user?.email),
        api.getCustomerInvoices('open', user?.email),
      ]);
      setRequests(reqs);
      setInvoices(invs);
      if (invs.length > 0 && !selectedInvoiceId) {
        setSelectedInvoiceId(invs[0].invoice_id);
        setRequestedDays(invs[0].agreed_payment_days + 15);
      }
    } catch (err) {
      console.error('Failed to load customer requests data', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadData();
  }, [user?.email]);

  const handleInvoiceSelectChange = (invId: string) => {
    setSelectedInvoiceId(invId);
    const found = invoices.find(i => i.invoice_id === invId);
    if (found) {
      setRequestedDays(found.agreed_payment_days + 15);
    }
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoiceId) return;

    try {
      setSubmitting(true);
      await api.createPaymentRequest(
        {
          invoice_id: selectedInvoiceId,
          requested_term: requestedDays,
          reason,
          message,
        },
        user?.email
      );
      setModalOpen(false);
      setMessage('');
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to submit payment request.');
    } finally {
      setSubmitting(false);
    }
  };

  const handleCounterResponse = async (requestId: number, action: 'ACCEPT' | 'REJECT') => {
    try {
      setActionLoading(requestId);
      await api.respondToCounteroffer(
        requestId,
        {
          action,
          message: action === 'ACCEPT' ? 'Accepted counteroffer terms.' : 'Rejected counteroffer terms.',
        },
        user?.email
      );
      loadData();
    } catch (err: any) {
      alert(err.message || 'Failed to respond to counteroffer.');
    } finally {
      setActionLoading(null);
    }
  };

  const filteredRequests = requests.filter((r) => {
    if (filterStatus === 'all') return true;
    if (filterStatus === 'pending') return r.status === 'PENDING';
    if (filterStatus === 'counteroffer') return r.status === 'COUNTEROFFER';
    if (filterStatus === 'approved') return r.status === 'APPROVED';
    if (filterStatus === 'rejected') return r.status === 'REJECTED';
    return true;
  });

  return (
    <CustomerLayout pageTitle="Payment Term Extension Requests">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Payment Term Requests</h2>
          <p className="text-xs text-gray-400">
            Submit and track credit term extension requests directly with NovaCraft Manufacturing's finance team.
          </p>
        </div>

        <button
          onClick={() => setModalOpen(true)}
          disabled={invoices.length === 0}
          className="px-4 py-2.5 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2 self-start md:self-auto cursor-pointer"
        >
          <Plus size={16} />
          New Extension Request
        </button>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#171C2E] pb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'All Requests' },
          { key: 'pending', label: 'Under Review' },
          { key: 'counteroffer', label: 'Counteroffers' },
          { key: 'approved', label: 'Approved' },
          { key: 'rejected', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              filterStatus === tab.key
                ? 'bg-cyan-950/60 text-cyan-300 border border-cyan-500/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#121626]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests List */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading request history...
          </div>
        ) : filteredRequests.length > 0 ? (
          filteredRequests.map((req) => (
            <div
              key={req.id}
              className={`p-6 bg-[#0A0D18] border rounded-2xl transition space-y-4 shadow-xl ${
                req.status === 'COUNTEROFFER'
                  ? 'border-purple-500/50 bg-gradient-to-br from-[#0D1022] to-[#120E24]'
                  : 'border-[#182038] hover:border-cyan-500/30'
              }`}
            >
              {/* Header Line */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#141B30] pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-sm">
                    Request #{req.id}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400">
                    Invoice: <strong className="text-cyan-300 font-mono">{req.invoice_id}</strong>
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-500 font-mono">{req.created_at}</span>
                </div>

                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    req.status === 'APPROVED'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                      : req.status === 'COUNTEROFFER'
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40 animate-pulse'
                      : req.status === 'REJECTED'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-950/60 text-amber-300 border border-amber-500/40'
                  }`}
                >
                  {req.status === 'COUNTEROFFER' ? '⚡ Counteroffer Received' : req.status}
                </span>
              </div>

              {/* Term Comparison Flow */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3 bg-[#0E1322] border border-[#18233D] rounded-xl space-y-1">
                  <div className="text-gray-400">Original Invoice Term</div>
                  <div className="text-base font-mono font-bold text-gray-300">
                    {req.current_term} Days
                  </div>
                </div>

                <div className="p-3 bg-[#0E1322] border border-[#18233D] rounded-xl space-y-1">
                  <div className="text-gray-400">Your Requested Term</div>
                  <div className="text-base font-mono font-bold text-cyan-300">
                    {req.requested_term} Days (+{req.requested_term - req.current_term}d)
                  </div>
                </div>

                <div className="p-3 bg-[#0E1322] border border-[#18233D] rounded-xl space-y-1">
                  <div className="text-gray-400">Supplier Decision</div>
                  <div
                    className={`text-base font-mono font-bold ${
                      req.status === 'COUNTEROFFER'
                        ? 'text-purple-300'
                        : req.status === 'APPROVED'
                        ? 'text-emerald-400'
                        : req.status === 'REJECTED'
                        ? 'text-rose-400'
                        : 'text-amber-400'
                    }`}
                  >
                    {req.counter_term ? `${req.counter_term} Days (Counter)` : req.status}
                  </div>
                </div>
              </div>

              {/* Reason and Notes */}
              <div className="text-xs text-gray-400 space-y-1 bg-[#090C16] p-3.5 rounded-xl border border-[#141B30]">
                <div>
                  <strong className="text-gray-300">Reason:</strong> {req.reason}
                </div>
                {req.message && (
                  <div>
                    <strong className="text-gray-300">Your Context:</strong> "{req.message}"
                  </div>
                )}
                {req.counter_message && (
                  <div className="pt-2 mt-2 border-t border-[#141B30] text-purple-300">
                    <strong className="text-purple-200">Supplier Message:</strong> "{req.counter_message}"
                  </div>
                )}
              </div>

              {/* Counteroffer Action Bar */}
              {req.status === 'COUNTEROFFER' && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-purple-950/40 border border-purple-800/40 rounded-xl">
                  <div className="text-xs text-purple-200">
                    NovaCraft proposed <strong className="text-white font-mono">{req.counter_term} Days</strong>. Would you like to accept this compromise?
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => handleCounterResponse(req.id, 'REJECT')}
                      disabled={actionLoading === req.id}
                      className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/40 text-rose-300 text-xs font-bold rounded-lg transition"
                    >
                      Decline
                    </button>
                    <button
                      onClick={() => handleCounterResponse(req.id, 'ACCEPT')}
                      disabled={actionLoading === req.id}
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black rounded-lg shadow transition flex items-center gap-1"
                    >
                      <Check size={14} />
                      Accept ({req.counter_term}d)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 bg-[#0A0D18] border border-[#182038] rounded-2xl text-center text-gray-500 text-sm">
            <Clock size={32} className="mx-auto text-gray-600 mb-2" />
            No payment extension requests found in this view.
          </div>
        )}
      </div>

      {/* New Request Modal */}
      {modalOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D111E] border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#1A2238] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-cyan-400" />
                  Submit Payment Extension Request
                </h3>
                <p className="text-xs text-gray-400">
                  Negotiate flexible payment terms with NovaCraft Manufacturing
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
              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Select Open Invoice
                </label>
                <select
                  value={selectedInvoiceId}
                  onChange={(e) => handleInvoiceSelectChange(e.target.value)}
                  className="w-full bg-[#13182A] border border-[#212A48] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
                >
                  {invoices.map((inv) => (
                    <option key={inv.invoice_id} value={inv.invoice_id}>
                      {inv.invoice_id} — ₹{(inv.amount / 100000).toFixed(2)}L (Current: {inv.agreed_payment_days}d, Due: {inv.due_date})
                    </option>
                  ))}
                </select>
              </div>

              <div>
                <label className="block text-xs font-semibold text-cyan-300 mb-1.5">
                  Requested Payment Term (Days)
                </label>
                <input
                  type="number"
                  min={30}
                  max={180}
                  value={requestedDays}
                  onChange={(e) => setRequestedDays(parseInt(e.target.value) || 0)}
                  required
                  className="w-full bg-[#13182A] border border-cyan-500/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-cyan-400 focus:ring-1 focus:ring-cyan-400"
                />
              </div>

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Reason for Extension
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
                  Message / Context for NovaCraft Finance Team
                </label>
                <textarea
                  rows={3}
                  value={message}
                  onChange={(e) => setMessage(e.target.value)}
                  placeholder="Provide context regarding cash flow or scheduled settlement..."
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
                  {submitting ? 'Submitting...' : 'Submit Request'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
