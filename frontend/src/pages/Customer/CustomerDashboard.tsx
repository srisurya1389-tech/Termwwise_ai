import React, { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  FileText,
  Clock,
  AlertCircle,
  CheckCircle2,
  Calendar,
  ArrowUpRight,
  Shield,
  Building2,
  DollarSign
} from 'lucide-react';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { CustomerDashboardSummary, CustomerInvoiceItem } from '../../types';

export default function CustomerDashboard() {
  const { user } = useAuth();
  const [data, setData] = useState<CustomerDashboardSummary | null>(null);
  const [loading, setLoading] = useState(true);

  // Request modal state
  const [modalOpen, setModalOpen] = useState(false);
  const [selectedInvoice, setSelectedInvoice] = useState<CustomerInvoiceItem | null>(null);
  const [requestedDays, setRequestedDays] = useState(60);
  const [reason, setReason] = useState('Working Capital Optimization');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);
  const [requestSuccess, setRequestSuccess] = useState<string | null>(null);

  const loadDashboard = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerDashboard(user?.email);
      setData(res);
    } catch (err: any) {
      console.error('Failed to load customer dashboard', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadDashboard();
  }, [user?.email]);

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
        loadDashboard();
      }, 1500);
    } catch (err: any) {
      alert(err.message || 'Failed to submit extension request.');
    } finally {
      setSubmitting(false);
    }
  };

  if (loading && !data) {
    return (
      <CustomerLayout pageTitle="Customer Dashboard">
        <div className="flex flex-col items-center justify-center py-24 text-gray-400 space-y-4">
          <div className="w-10 h-10 border-4 border-cyan-500 border-t-transparent rounded-full animate-spin"></div>
          <p className="font-mono text-sm">Loading your account summary...</p>
        </div>
      </CustomerLayout>
    );
  }

  return (
    <CustomerLayout pageTitle="Buyer Account Overview">
      {/* Supplier & Privacy Header */}
      <div className="mb-8 p-6 bg-gradient-to-r from-[#0C1424] via-[#0E1B33] to-[#0A1020] border border-cyan-500/20 rounded-2xl flex flex-col lg:flex-row lg:items-center justify-between gap-6 relative overflow-hidden shadow-xl">
        <div className="absolute top-0 right-0 w-80 h-80 bg-cyan-500/5 rounded-full blur-3xl pointer-events-none"></div>

        <div className="space-y-1 relative z-10">
          <div className="flex items-center gap-2">
            <span className="px-2.5 py-0.5 rounded-full bg-cyan-500/10 border border-cyan-500/30 text-cyan-300 text-xs font-mono font-semibold">
              ACTIVE VENDOR RELATIONSHIP
            </span>
            <span className="text-gray-500">•</span>
            <span className="text-xs text-gray-400 font-mono">SUPPLIER: NOVACRAFT MANUFACTURING</span>
          </div>
          <h2 className="text-2xl font-black text-white tracking-tight">
            Welcome back, {data?.customer_name || 'ABC Industries'}
          </h2>
          <p className="text-sm text-gray-400 max-w-2xl">
            Manage your open invoices, view verified payment history, and request flexible payment term adjustments directly with NovaCraft Manufacturing.
          </p>
        </div>

        <div className="flex flex-wrap items-center gap-3 relative z-10">
          <Link
            to="/customer/invoices"
            className="px-4 py-2.5 bg-cyan-500 hover:bg-cyan-400 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-2"
          >
            <FileText size={16} />
            View Invoices
          </Link>
          <Link
            to="/customer/requests"
            className="px-4 py-2.5 bg-[#141A2E] hover:bg-[#1B233D] border border-cyan-500/30 text-cyan-300 font-semibold text-xs rounded-xl transition flex items-center gap-2"
          >
            <Clock size={16} />
            Extension Requests
            {data?.pending_requests_count ? (
              <span className="px-1.5 py-0.2 text-[10px] bg-cyan-400 text-slate-950 rounded-full font-bold">
                {data.pending_requests_count}
              </span>
            ) : null}
          </Link>
        </div>
      </div>

      {/* KPI Cards */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-5 mb-8">
        {/* Total Outstanding */}
        <div className="p-5 bg-[#0C0F1A] border border-[#1A2035] rounded-2xl relative overflow-hidden group hover:border-cyan-500/40 transition">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Outstanding</span>
            <div className="p-2 rounded-xl bg-cyan-950/40 text-cyan-400 border border-cyan-500/20">
              <DollarSign size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-white tracking-tight">
            ₹{((data?.total_outstanding || 0) / 100000).toFixed(2)} Lakhs
          </div>
          <div className="mt-2 text-xs text-gray-400 flex items-center gap-1.5">
            <span className="text-cyan-400 font-semibold">{data?.open_invoices_count || 0} Open Invoices</span>
            <span>across billing cycles</span>
          </div>
        </div>

        {/* Due in 30 Days */}
        <div className="p-5 bg-[#0C0F1A] border border-[#1A2035] rounded-2xl relative overflow-hidden group hover:border-amber-500/40 transition">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Due within 30 Days</span>
            <div className="p-2 rounded-xl bg-amber-950/40 text-amber-400 border border-amber-500/20">
              <Calendar size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-amber-300 tracking-tight">
            ₹{((data?.upcoming_due_30d || 0) / 100000).toFixed(2)} Lakhs
          </div>
          <div className="mt-2 text-xs text-amber-400/80 flex items-center gap-1">
            <AlertCircle size={13} />
            <span>Planned upcoming settlements</span>
          </div>
        </div>

        {/* Overdue Count */}
        <div className="p-5 bg-[#0C0F1A] border border-[#1A2035] rounded-2xl relative overflow-hidden group hover:border-rose-500/40 transition">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Overdue Invoices</span>
            <div className="p-2 rounded-xl bg-rose-950/40 text-rose-400 border border-rose-500/20">
              <AlertCircle size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-rose-400 tracking-tight">
            {data?.overdue_count || 0}
          </div>
          <div className="mt-2 text-xs text-rose-400/80">
            {data?.overdue_count ? 'Action or term extension required' : 'All invoices are within terms'}
          </div>
        </div>

        {/* Total Paid */}
        <div className="p-5 bg-[#0C0F1A] border border-[#1A2035] rounded-2xl relative overflow-hidden group hover:border-emerald-500/40 transition">
          <div className="flex items-center justify-between text-gray-400 mb-2">
            <span className="text-xs font-medium uppercase tracking-wider">Total Paid to Date</span>
            <div className="p-2 rounded-xl bg-emerald-950/40 text-emerald-400 border border-emerald-500/20">
              <CheckCircle2 size={16} />
            </div>
          </div>
          <div className="text-2xl font-black text-emerald-400 tracking-tight">
            ₹{((data?.total_paid || 0) / 100000).toFixed(2)} Lakhs
          </div>
          <div className="mt-2 text-xs text-emerald-400/80 flex items-center gap-1">
            <Shield size={13} />
            <span>Verified reconciliation sync</span>
          </div>
        </div>
      </div>

      {/* Main Grid: Open Invoices & Payment History */}
      <div className="grid grid-cols-1 lg:grid-cols-3 gap-8 mb-8">
        {/* Open Invoices Requiring Attention (2 Cols) */}
        <div className="lg:col-span-2 space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Upcoming & Open Invoices</h3>
              <p className="text-xs text-gray-400">Invoices awaiting payment or schedule adjustment</p>
            </div>
            <Link
              to="/customer/invoices"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
            >
              View All <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.upcoming_invoices && data.upcoming_invoices.length > 0 ? (
              data.upcoming_invoices.map((inv) => (
                <div
                  key={inv.invoice_id}
                  className="p-5 bg-[#0C0F1A] border border-[#1A2035] hover:border-cyan-500/30 rounded-2xl transition flex flex-col md:flex-row md:items-center justify-between gap-4"
                >
                  <div className="space-y-1">
                    <div className="flex items-center gap-2.5">
                      <span className="font-mono font-bold text-white text-sm">{inv.invoice_id}</span>
                      <span
                        className={`px-2 py-0.5 rounded-full text-[10px] font-bold uppercase tracking-wider ${
                          inv.payment_status === 'Overdue'
                            ? 'bg-rose-950/50 text-rose-300 border border-rose-800/40'
                            : 'bg-amber-950/50 text-amber-300 border border-amber-800/40'
                        }`}
                      >
                        {inv.payment_status}
                      </span>
                      {inv.has_active_request && (
                        <span className="px-2 py-0.5 rounded-full text-[10px] font-bold bg-cyan-950/60 text-cyan-300 border border-cyan-800/40">
                          Request Pending
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-gray-400 flex flex-wrap items-center gap-x-4 gap-y-1">
                      <span>Invoice Date: <strong className="text-gray-300 font-mono">{inv.invoice_date}</strong></span>
                      <span>Due Date: <strong className="text-gray-300 font-mono">{inv.due_date}</strong></span>
                      <span>Agreed Term: <strong className="text-cyan-300 font-mono">{inv.agreed_payment_days} Days</strong></span>
                    </div>
                  </div>

                  <div className="flex items-center gap-4 justify-between md:justify-end">
                    <div className="text-right">
                      <div className="text-xs text-gray-400">Outstanding</div>
                      <div className="text-base font-black text-white font-mono">
                        ₹{(inv.outstanding_amount / 100000).toFixed(2)}L
                      </div>
                    </div>

                    <div className="flex items-center gap-2">
                      <Link
                        to={`/customer/invoices/${inv.invoice_id}`}
                        className="px-3 py-1.5 bg-[#141A2E] hover:bg-[#1E2644] text-gray-300 text-xs font-semibold rounded-xl border border-[#222B48] transition"
                      >
                        Details
                      </Link>
                      {!inv.has_active_request && (
                        <button
                          onClick={() => openRequestModal(inv)}
                          className="px-3 py-1.5 bg-gradient-to-r from-cyan-600 to-blue-600 hover:from-cyan-500 hover:to-blue-500 text-white text-xs font-bold rounded-xl shadow transition whitespace-nowrap"
                        >
                          Need more time?
                        </button>
                      )}
                    </div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-8 bg-[#0C0F1A] border border-[#1A2035] rounded-2xl text-center text-gray-400 text-sm">
                <CheckCircle2 size={24} className="mx-auto text-emerald-400 mb-2" />
                No outstanding invoices pending at this time!
              </div>
            )}
          </div>
        </div>

        {/* Recent Payment Receipts (1 Col) */}
        <div className="space-y-4">
          <div className="flex items-center justify-between">
            <div>
              <h3 className="text-base font-bold text-white tracking-wide">Recent Settlements</h3>
              <p className="text-xs text-gray-400">Verified payment receipts</p>
            </div>
            <Link
              to="/customer/payments"
              className="text-xs text-cyan-400 hover:text-cyan-300 font-semibold flex items-center gap-1 transition"
            >
              All Receipts <ArrowUpRight size={14} />
            </Link>
          </div>

          <div className="space-y-3">
            {data?.recent_payments && data.recent_payments.length > 0 ? (
              data.recent_payments.slice(0, 4).map((pmt) => (
                <div
                  key={pmt.payment_id}
                  className="p-4 bg-[#0C0F1A] border border-[#1A2035] rounded-2xl flex items-center justify-between gap-3"
                >
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-2">
                      <span className="font-mono font-bold text-xs text-white">{pmt.payment_id}</span>
                      <span className="px-1.5 py-0.2 text-[9px] font-bold bg-emerald-950/60 text-emerald-300 border border-emerald-800/40 rounded">
                        {pmt.status}
                      </span>
                    </div>
                    <div className="text-[11px] text-gray-400">
                      Invoice: <span className="font-mono text-gray-300">{pmt.invoice_id}</span> • {pmt.payment_date}
                    </div>
                  </div>

                  <div className="text-right">
                    <div className="font-bold font-mono text-emerald-400 text-sm">
                      +₹{(pmt.amount / 100000).toFixed(2)}L
                    </div>
                    <div className="text-[10px] text-gray-500 uppercase">{pmt.source}</div>
                  </div>
                </div>
              ))
            ) : (
              <div className="p-6 bg-[#0C0F1A] border border-[#1A2035] rounded-2xl text-center text-gray-400 text-xs">
                No payment transactions recorded yet.
              </div>
            )}

            {/* Wire Transfer / Banking Info Box */}
            <div className="p-4 bg-gradient-to-br from-[#0B1324] to-[#0A0D18] border border-cyan-500/20 rounded-2xl text-xs space-y-2">
              <div className="flex items-center gap-2 text-cyan-300 font-bold">
                <Building2 size={15} />
                <span>Supplier Settlement Account</span>
              </div>
              <p className="text-gray-400 text-[11px]">
                Wire transfers to NovaCraft Manufacturing:
              </p>
              <div className="font-mono text-[11px] space-y-0.5 text-gray-300 bg-[#070B14] p-2.5 rounded-xl border border-[#151E32]">
                <div>Bank: <strong className="text-white">HDFC Bank Ltd</strong></div>
                <div>Account: <strong className="text-white">99201488102394</strong></div>
                <div>IFSC: <strong className="text-white">HDFC0001842</strong></div>
              </div>
            </div>
          </div>
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
