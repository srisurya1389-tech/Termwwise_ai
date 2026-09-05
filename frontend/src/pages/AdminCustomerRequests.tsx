import React, { useState, useEffect } from 'react';
import {
  ClipboardList,
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api/client';
import type { PaymentRequest } from '../types';

export default function AdminCustomerRequests() {
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');

  // Modal / Action State
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedRequest, setSelectedRequest] = useState<PaymentRequest | null>(null);
  const [actionType, setActionType] = useState<'APPROVE' | 'REJECT' | 'COUNTEROFFER'>('APPROVE');
  const [counterTerm, setCounterTerm] = useState(75);
  const [counterMessage, setCounterMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  const fetchRequests = async () => {
    try {
      setLoading(true);
      const res = await api.getAdminRequests(filterStatus === 'all' ? undefined : filterStatus);
      setRequests(res);
    } catch (err) {
      console.error('Failed to load admin customer requests', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchRequests();
  }, [filterStatus]);

  const openActionModal = (req: PaymentRequest, action: 'APPROVE' | 'REJECT' | 'COUNTEROFFER') => {
    setSelectedRequest(req);
    setActionType(action);
    const suggestedCounter = Math.round((req.current_term + req.requested_term) / 2);
    setCounterTerm(suggestedCounter);
    setCounterMessage(
      action === 'COUNTEROFFER'
        ? `We can offer ${suggestedCounter} days to support your working capital while maintaining our supply schedule.`
        : action === 'REJECT'
        ? 'Current supplier cash flow requirements prevent extending term beyond agreed policy.'
        : 'Approved payment term adjustment.'
    );
    setModalOpen(true);
  };

  const handleAdminSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedRequest) return;

    try {
      setSubmitting(true);
      await api.adminRespondRequest(selectedRequest.id, {
        action: actionType,
        counter_term: actionType === 'COUNTEROFFER' ? counterTerm : undefined,
        counter_message: counterMessage,
      });
      setModalOpen(false);
      fetchRequests();
    } catch (err: any) {
      alert(err.message || 'Failed to submit response.');
    } finally {
      setSubmitting(false);
    }
  };

  const pendingCount = requests.filter((r) => r.status === 'PENDING').length;

  return (
    <DashboardLayout pageTitle="Customer Extension Requests">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <ClipboardList className="text-purple-400" size={22} />
            Customer Term Extension Requests
          </h2>
          <p className="text-xs text-gray-400">
            Review incoming payment extension requests submitted by buyers through the Customer Portal.
          </p>
        </div>

        {pendingCount > 0 && (
          <div className="px-3 py-1.5 bg-amber-950/40 border border-amber-500/40 rounded-xl text-amber-300 text-xs font-semibold flex items-center gap-2 self-start md:self-auto">
            <span className="h-2 w-2 rounded-full bg-amber-400 animate-ping"></span>
            {pendingCount} Request{pendingCount > 1 ? 's' : ''} Pending Review
          </div>
        )}
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#1A1A24] pb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'All Requests' },
          { key: 'PENDING', label: 'Pending Review' },
          { key: 'COUNTEROFFER', label: 'Counteroffers Sent' },
          { key: 'APPROVED', label: 'Approved' },
          { key: 'REJECTED', label: 'Rejected' },
        ].map((tab) => (
          <button
            key={tab.key}
            onClick={() => setFilterStatus(tab.key)}
            className={`px-4 py-2 rounded-xl text-xs font-semibold transition cursor-pointer whitespace-nowrap ${
              filterStatus === tab.key
                ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40'
                : 'text-gray-400 hover:text-gray-200 hover:bg-[#12121A]'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {/* Requests Grid */}
      <div className="space-y-4">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading customer requests...
          </div>
        ) : requests.length > 0 ? (
          requests.map((req) => (
            <div
              key={req.id}
              className={`p-6 bg-[#0E0E14] border rounded-2xl transition space-y-4 shadow-xl ${
                req.status === 'PENDING'
                  ? 'border-amber-500/40 bg-gradient-to-br from-[#12101C] to-[#0E0E14]'
                  : 'border-[#1C1D28] hover:border-purple-500/30'
              }`}
            >
              {/* Request Header */}
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 border-b border-[#181824] pb-4">
                <div className="flex items-center gap-3">
                  <span className="font-mono font-bold text-white text-sm">
                    Request #{req.id}
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400">
                    Buyer: <strong className="text-purple-300 font-semibold">{req.buyer_name}</strong>
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-400">
                    Invoice: <strong className="text-white font-mono">{req.invoice_id}</strong>
                  </span>
                  <span className="text-gray-600">•</span>
                  <span className="text-xs text-gray-500 font-mono">{req.created_at}</span>
                </div>

                <span
                  className={`inline-flex items-center px-3 py-1 rounded-full text-xs font-mono font-bold uppercase tracking-wider ${
                    req.status === 'APPROVED'
                      ? 'bg-emerald-950/60 text-emerald-300 border border-emerald-500/40'
                      : req.status === 'COUNTEROFFER'
                      ? 'bg-purple-950/60 text-purple-300 border border-purple-500/40'
                      : req.status === 'REJECTED'
                      ? 'bg-rose-950/60 text-rose-300 border border-rose-500/40'
                      : 'bg-amber-950/60 text-amber-300 border border-amber-500/40 animate-pulse'
                  }`}
                >
                  {req.status}
                </span>
              </div>

              {/* Term Comparison Cards */}
              <div className="grid grid-cols-1 md:grid-cols-3 gap-4 text-xs">
                <div className="p-3.5 bg-[#14141E] border border-[#1F202B] rounded-xl space-y-1">
                  <div className="text-gray-400">Current Agreed Term</div>
                  <div className="text-base font-mono font-bold text-gray-300">
                    {req.current_term} Days
                  </div>
                </div>

                <div className="p-3.5 bg-[#14141E] border border-[#1F202B] rounded-xl space-y-1">
                  <div className="text-gray-400">Customer Requested Term</div>
                  <div className="text-base font-mono font-bold text-amber-300">
                    {req.requested_term} Days (+{req.requested_term - req.current_term}d)
                  </div>
                </div>

                <div className="p-3.5 bg-[#14141E] border border-[#1F202B] rounded-xl space-y-1">
                  <div className="text-gray-400">NovaCraft Decision / Counter</div>
                  <div className="text-base font-mono font-bold text-purple-300">
                    {req.counter_term ? `${req.counter_term} Days (Counter)` : req.status}
                  </div>
                </div>
              </div>

              {/* Customer Notes */}
              <div className="text-xs text-gray-300 space-y-1 bg-[#12121C] p-3.5 rounded-xl border border-[#1A1A28]">
                <div>
                  <strong className="text-gray-400">Reason:</strong> {req.reason}
                </div>
                {req.message && (
                  <div>
                    <strong className="text-gray-400">Customer Message:</strong> "{req.message}"
                  </div>
                )}
                {req.counter_message && (
                  <div className="pt-2 mt-2 border-t border-[#1C1D2C] text-purple-300">
                    <strong className="text-purple-200">Admin Response:</strong> "{req.counter_message}"
                  </div>
                )}
              </div>

              {/* Action Controls for Admin */}
              {req.status === 'PENDING' && (
                <div className="pt-2 flex flex-col sm:flex-row sm:items-center justify-between gap-4 p-4 bg-[#141422] border border-purple-500/30 rounded-xl">
                  <div className="text-xs text-gray-300">
                    Review and choose action to respond to <strong className="text-white">{req.buyer_name}</strong>:
                  </div>

                  <div className="flex items-center gap-2">
                    <button
                      onClick={() => openActionModal(req, 'REJECT')}
                      className="px-3.5 py-1.5 bg-rose-950/40 hover:bg-rose-900/60 border border-rose-700/40 text-rose-300 text-xs font-bold rounded-lg transition"
                    >
                      Reject
                    </button>
                    <button
                      onClick={() => openActionModal(req, 'COUNTEROFFER')}
                      className="px-3.5 py-1.5 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-300 text-xs font-bold rounded-lg transition"
                    >
                      Counteroffer
                    </button>
                    <button
                      onClick={() => openActionModal(req, 'APPROVE')}
                      className="px-4 py-1.5 bg-gradient-to-r from-emerald-500 to-teal-600 hover:from-emerald-400 hover:to-teal-500 text-slate-950 text-xs font-black rounded-lg shadow transition"
                    >
                      Approve ({req.requested_term}d)
                    </button>
                  </div>
                </div>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 bg-[#0E0E14] border border-[#1C1D28] rounded-2xl text-center text-gray-500 text-sm">
            <ClipboardList size={32} className="mx-auto text-gray-600 mb-2" />
            No customer extension requests matching this filter.
          </div>
        )}
      </div>

      {/* Admin Action Modal */}
      {modalOpen && selectedRequest && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#12121C] border border-purple-500/40 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#1F202F] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <ClipboardList size={18} className="text-purple-400" />
                  {actionType === 'APPROVE'
                    ? 'Approve Extension Request'
                    : actionType === 'COUNTEROFFER'
                    ? 'Propose Counteroffer'
                    : 'Reject Extension Request'}
                </h3>
                <p className="text-xs text-gray-400">
                  Buyer: <span className="text-purple-300 font-semibold">{selectedRequest.buyer_name}</span> • Invoice: <span className="font-mono text-white">{selectedRequest.invoice_id}</span>
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            <form onSubmit={handleAdminSubmit} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div className="p-3 bg-[#181826] border border-[#232438] rounded-xl text-xs">
                  <div className="text-gray-400">Current Invoice Term</div>
                  <div className="text-base font-mono font-bold text-gray-300">
                    {selectedRequest.current_term} Days
                  </div>
                </div>

                <div className="p-3 bg-[#181826] border border-[#232438] rounded-xl text-xs">
                  <div className="text-gray-400">Customer Requested</div>
                  <div className="text-base font-mono font-bold text-amber-300">
                    {selectedRequest.requested_term} Days
                  </div>
                </div>
              </div>

              {actionType === 'COUNTEROFFER' && (
                <div>
                  <label className="block text-xs font-semibold text-purple-300 mb-1.5">
                    Proposed Counter Term (Days)
                  </label>
                  <input
                    type="number"
                    min={selectedRequest.current_term}
                    max={selectedRequest.requested_term}
                    value={counterTerm}
                    onChange={(e) => setCounterTerm(parseInt(e.target.value) || 0)}
                    required
                    className="w-full bg-[#181826] border border-purple-500/40 rounded-xl px-3 py-2 text-xs font-mono text-white focus:outline-none focus:border-purple-400"
                  />
                  <div className="text-[11px] text-gray-500 mt-1">
                    Suggested compromise between current ({selectedRequest.current_term}d) and requested ({selectedRequest.requested_term}d).
                  </div>
                </div>
              )}

              <div>
                <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                  Response Message to Customer
                </label>
                <textarea
                  rows={3}
                  value={counterMessage}
                  onChange={(e) => setCounterMessage(e.target.value)}
                  placeholder="Explain your decision or conditions..."
                  className="w-full bg-[#181826] border border-[#232438] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-400"
                ></textarea>
              </div>

              <div className="pt-3 border-t border-[#1F202F] flex items-center justify-end gap-3">
                <button
                  type="button"
                  onClick={() => setModalOpen(false)}
                  className="px-4 py-2 bg-[#181826] hover:bg-[#232438] text-gray-300 text-xs font-semibold rounded-xl border border-[#232438] transition"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={submitting}
                  className={`px-5 py-2 text-xs font-bold rounded-xl shadow transition flex items-center gap-1.5 ${
                    actionType === 'APPROVE'
                      ? 'bg-emerald-500 hover:bg-emerald-400 text-slate-950'
                      : actionType === 'COUNTEROFFER'
                      ? 'bg-purple-600 hover:bg-purple-500 text-white'
                      : 'bg-rose-600 hover:bg-rose-500 text-white'
                  }`}
                >
                  {submitting
                    ? 'Submitting...'
                    : actionType === 'APPROVE'
                    ? 'Confirm Approval'
                    : actionType === 'COUNTEROFFER'
                    ? 'Send Counteroffer'
                    : 'Confirm Rejection'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </DashboardLayout>
  );
}
