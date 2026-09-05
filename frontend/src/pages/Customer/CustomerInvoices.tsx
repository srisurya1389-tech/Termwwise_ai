import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  Clock,
  CheckCircle2,
  Eye,
} from 'lucide-react';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { CustomerInvoiceItem } from '../../types';

export default function CustomerInvoices() {
  const { user } = useAuth();
  const [invoices, setInvoices] = useState<CustomerInvoiceItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [filterStatus, setFilterStatus] = useState<string>('all');
  const [searchQuery, setSearchQuery] = useState('');

  // Modal
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoiceItem | null>(null);
  const [requestedDays, setRequestedDays] = useState(60);
  const [reason, setReason] = useState('Working Capital Optimization');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const fetchInvoices = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerInvoices(
        filterStatus === 'all' ? undefined : filterStatus,
        user?.email
      );
      setInvoices(res);
    } catch (err) {
      console.error('Failed to load invoices', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchInvoices();
  }, [filterStatus, user?.email]);

  const openRequestModal = (invoice: CustomerInvoiceItem) => {
    setSelectedInvoice(invoice);
    setRequestedDays(Math.max(invoice.agreed_payment_days + 15, 60));
    setReason('Working Capital Optimization');
    setMessage('');
    setRequestSuccess(null);
    setModalOpen(true);
  };

  const handleCreateRequest = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedInvoice) return;

    try {
      setSubmitting(true);
      await api.createPaymentRequest(
        {
          invoice_id: selectedInvoice.invoice_id,
          requested_term: requestedDays,
          reason,
          message,
        },
        user?.email
      );
      setRequestSuccess(`Extension request submitted for invoice ${selectedInvoice.invoice_id}!`);
      setTimeout(() => {
        setModalOpen(false);
        fetchInvoices();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit request.');
    } finally {
      setSubmitting(false);
    }
  };

  const filteredInvoices = invoices.filter((inv) =>
    inv.invoice_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CustomerLayout pageTitle="Invoices & Billing">
      {/* Header controls */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Billing & Invoices</h2>
          <p className="text-xs text-gray-400">
            View invoiced orders from NovaCraft Manufacturing, settlement statuses, and schedules.
          </p>
        </div>

        <div className="flex items-center gap-3">
          {/* Search input */}
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0D111E] border border-[#1C233C] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="flex items-center gap-2 mb-6 border-b border-[#171C2E] pb-3 overflow-x-auto">
        {[
          { key: 'all', label: 'All Invoices' },
          { key: 'open', label: 'Outstanding' },
          { key: 'overdue', label: 'Overdue' },
          { key: 'paid', label: 'Fully Paid' },
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

      {/* Invoices Table */}
      <div className="bg-[#0A0D18] border border-[#182038] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0E1322] border-b border-[#182038] text-[11px] uppercase tracking-wider text-gray-400 font-mono">
              <tr>
                <th className="py-3.5 px-5">Invoice ID</th>
                <th className="py-3.5 px-4">Invoice Date</th>
                <th className="py-3.5 px-4">Agreed Term</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4 text-right">Invoice Amount</th>
                <th className="py-3.5 px-4 text-right">Outstanding</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141B30]">
              {loading ? (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading invoice records...
                  </td>
                </tr>
              ) : filteredInvoices.length > 0 ? (
                filteredInvoices.map((inv) => (
                  <tr key={inv.invoice_id} className="hover:bg-[#10162A] transition">
                    <td className="py-4 px-5 font-mono font-bold text-white">
                      {inv.invoice_id}
                    </td>
                    <td className="py-4 px-4 font-mono text-gray-400">
                      {inv.invoice_date}
                    </td>
                    <td className="py-4 px-4 font-mono text-cyan-300 font-semibold">
                      {inv.agreed_payment_days} Days
                    </td>
                    <td className="py-4 px-4 font-mono text-gray-300">
                      {inv.due_date}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-white">
                      ₹{(inv.amount / 100000).toFixed(2)}L
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-cyan-200">
                      ₹{(inv.outstanding_amount / 100000).toFixed(2)}L
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span
                        className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.payment_status === 'Paid'
                            ? 'bg-emerald-950/50 text-emerald-300 border border-emerald-800/40'
                            : inv.payment_status === 'Overdue'
                            ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                            : 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right space-x-2">
                      <Link
                        to={`/customer/invoices/${inv.invoice_id}`}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#141A2E] hover:bg-[#1E2644] text-gray-300 hover:text-white rounded-lg border border-[#222B48] transition text-xs"
                      >
                        <Eye size={12} />
                        View
                      </Link>

                      {inv.payment_status !== 'Paid' && (
                        inv.has_active_request ? (
                          <span className="inline-block px-2.5 py-1 bg-cyan-950/30 text-cyan-400 border border-cyan-800/30 rounded-lg text-[11px] font-semibold">
                            Request Pending
                          </span>
                        ) : (
                          <button
                            onClick={() => openRequestModal(inv)}
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white font-bold rounded-lg transition text-xs shadow-sm"
                          >
                            <Clock size={12} />
                            Need more time?
                          </button>
                        )
                      )}
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={8} className="text-center py-12 text-gray-500">
                    No invoices match your selected filter criteria.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>

      {/* Extension Request Modal */}
      {modalOpen && selectedInvoice && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/70 backdrop-blur-sm animate-fadeIn">
          <div className="bg-[#0D111E] border border-cyan-500/30 rounded-2xl w-full max-w-lg p-6 shadow-2xl space-y-5 text-left">
            <div className="flex items-center justify-between border-b border-[#1A2238] pb-4">
              <div>
                <h3 className="text-base font-bold text-white flex items-center gap-2">
                  <Clock size={18} className="text-cyan-400" />
                  Request Payment Extension
                </h3>
                <p className="text-xs text-gray-400">
                  Invoice <span className="font-mono text-cyan-300 font-semibold">{selectedInvoice.invoice_id}</span> (₹{(selectedInvoice.amount / 100000).toFixed(2)}L)
                </p>
              </div>
              <button
                onClick={() => setModalOpen(false)}
                className="text-gray-400 hover:text-white text-lg font-bold"
              >
                ✕
              </button>
            </div>

            {requestSuccess ? (
              <div className="p-4 bg-emerald-950/40 border border-emerald-500/30 rounded-xl text-emerald-300 text-sm flex items-center gap-2">
                <CheckCircle2 size={18} />
                <span>{requestSuccess}</span>
              </div>
            ) : (
              <form onSubmit={handleCreateRequest} className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                      Current Agreed Term
                    </label>
                    <div className="w-full bg-[#13182A] border border-[#212A48] rounded-xl px-3 py-2 text-xs font-mono text-gray-300">
                      {selectedInvoice.agreed_payment_days} Days
                    </div>
                  </div>

                  <div>
                    <label className="block text-xs font-semibold text-cyan-300 mb-1.5">
                      Requested Term (Days)
                    </label>
                    <input
                      type="number"
                      min={selectedInvoice.agreed_payment_days + 1}
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
            )}
          </div>
        </div>
      )}
    </CustomerLayout>
  );
}
