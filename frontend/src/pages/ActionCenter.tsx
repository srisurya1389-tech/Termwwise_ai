import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import {
  CheckCircle2,
  ArrowRight,
  Check,
  Building2,
  Layers
} from 'lucide-react';
import DashboardLayout from '../components/DashboardLayout';
import { api } from '../api/client';
import { useToast } from '../context/ToastContext';
import type { Invoice, PaymentRequest, PrioritiesResponse } from '../types';
import RiskBadge from '../components/RiskBadge';

export default function ActionCenter() {
  const [tab, setTab] = useState<'urgent' | 'today' | 'upcoming' | 'completed'>('urgent');
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [requests, setRequests] = useState<PaymentRequest[]>([]);
  const [priorities, setPriorities] = useState<PrioritiesResponse | null>(null);
  const [loading, setLoading] = useState(true);
  const toast = useToast();

  const loadActionCenter = async () => {
    try {
      setLoading(true);
      const [invs, reqs, pri] = await Promise.all([
        api.getInvoices(),
        api.getAdminRequests(),
        api.getPriorities(),
      ]);
      setInvoices(invs);
      setRequests(reqs);
      setPriorities(pri);
    } catch (err) {
      console.error('Failed to load Action Center items', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadActionCenter();
  }, []);

  // Classify items into queues
  const overdueInvoices = invoices.filter((i) => i.payment_status === 'Overdue');
  const pendingRequests = requests.filter((r) => r.status === 'PENDING');
  const dueSoonInvoices = invoices.filter((i) => i.payment_status === 'Outstanding');
  const approvedRequests = requests.filter((r) => r.status === 'APPROVED');
  const paidInvoices = invoices.filter((i) => i.payment_status === 'Paid');

  const urgentCount = overdueInvoices.length + pendingRequests.length;
  const todayCount = (priorities?.queue?.length || 0);
  const upcomingCount = dueSoonInvoices.length;
  const completedCount = approvedRequests.length + paidInvoices.length;

  const handleQuickApprove = async (requestId: number) => {
    try {
      await api.adminRespondRequest(requestId, { action: 'APPROVE' });
      toast.success('Request Approved', 'Payment term extension approved and invoice updated.');
      loadActionCenter();
    } catch (err: any) {
      toast.error('Approval Failed', err.message);
    }
  };

  const handleSendReminder = (invoiceId: string) => {
    toast.success('Reminder Dispatched', `Automated payment reminder scheduled for invoice ${invoiceId}.`);
  };

  return (
    <DashboardLayout pageTitle="Action Center">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6 text-left">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
            <Layers size={22} className="text-purple-400" />
            Operational Action Center
          </h2>
          <p className="text-xs text-gray-400">
            Unified operational inbox. Execute 1-click approvals, automated reminders, and term optimizations.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <span className="text-xs text-gray-400">Live Active Queue:</span>
          <span className="px-2.5 py-1 rounded-full text-xs font-mono font-bold bg-rose-950/60 text-rose-300 border border-rose-800/40">
            {urgentCount} Urgent Action{urgentCount === 1 ? '' : 's'}
          </span>
        </div>
      </div>

      {/* Queue Tabs */}
      <div className="grid grid-cols-2 sm:grid-cols-4 gap-3 mb-6">
        {[
          {
            key: 'urgent',
            label: 'Urgent Queue',
            count: urgentCount,
            color: 'text-rose-400',
            bg: 'bg-rose-950/40 border-rose-500/30',
          },
          {
            key: 'today',
            label: 'Priority Actions',
            count: todayCount,
            color: 'text-amber-400',
            bg: 'bg-amber-950/40 border-amber-500/30',
          },
          {
            key: 'upcoming',
            label: 'Upcoming Invoices',
            count: upcomingCount,
            color: 'text-cyan-400',
            bg: 'bg-cyan-950/40 border-cyan-500/30',
          },
          {
            key: 'completed',
            label: 'Completed / Settled',
            count: completedCount,
            color: 'text-emerald-400',
            bg: 'bg-emerald-950/40 border-emerald-500/30',
          },
        ].map((t) => (
          <button
            key={t.key}
            onClick={() => setTab(t.key as any)}
            className={`p-4 rounded-2xl border text-left transition cursor-pointer flex items-center justify-between ${
              tab === t.key
                ? `${t.bg} border-2 shadow-lg`
                : 'bg-[#0B0E17] border-[#182038] hover:border-[#222B48]'
            }`}
          >
            <div>
              <div className="text-[11px] font-medium text-gray-400 uppercase tracking-wider">
                {t.label}
              </div>
              <div className={`text-xl font-black font-mono mt-0.5 ${t.color}`}>
                {t.count}
              </div>
            </div>
            <div className={`h-2.5 w-2.5 rounded-full ${tab === t.key ? t.color.replace('text', 'bg') : 'bg-gray-700'}`} />
          </button>
        ))}
      </div>

      {/* Main Queue List */}
      <div className="space-y-4 text-left">
        {loading ? (
          <div className="py-20 text-center text-gray-500">
            <div className="w-8 h-8 border-2 border-purple-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
            Loading Action Center items...
          </div>
        ) : (
          <div>
            {/* URGENT QUEUE */}
            {tab === 'urgent' && (
              <div className="space-y-4">
                {/* Pending Buyer Extension Requests */}
                {pendingRequests.map((req) => (
                  <div
                    key={`urgent-req-${req.id}`}
                    className="p-5 rounded-2xl bg-gradient-to-br from-[#120F24] to-[#0A0D18] border border-amber-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-lg"
                  >
                    <div className="space-y-1.5">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-amber-950/60 text-amber-300 border border-amber-800/40">
                          BUYER EXTENSION REQUEST
                        </span>
                        <span className="font-mono font-bold text-white text-sm">
                          Invoice {req.invoice_id}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white flex items-center gap-2">
                        <Building2 size={15} className="text-purple-400" />
                        {req.buyer_name} requests {req.requested_term} days (Current: {req.current_term}d)
                      </h4>
                      <p className="text-xs text-gray-400">
                        Reason: <strong className="text-gray-300">{req.reason}</strong>
                        {req.message && ` • "${req.message}"`}
                      </p>
                    </div>

                    <div className="flex items-center gap-2.5 self-end md:self-auto">
                      <button
                        onClick={() => handleQuickApprove(req.id)}
                        className="px-4 py-2 bg-emerald-600 hover:bg-emerald-500 text-white font-bold text-xs rounded-xl shadow transition flex items-center gap-1.5 cursor-pointer"
                      >
                        <Check size={14} />
                        Approve ({req.requested_term}d)
                      </button>

                      <Link
                        to="/admin/customer-requests"
                        className="px-4 py-2 bg-[#141A2E] hover:bg-[#1E2644] text-purple-300 font-semibold text-xs rounded-xl border border-[#222B48] transition flex items-center gap-1.5"
                      >
                        Review / Counter
                        <ArrowRight size={13} />
                      </Link>
                    </div>
                  </div>
                ))}

                {/* Overdue Invoices */}
                {overdueInvoices.map((inv) => (
                  <div
                    key={`urgent-inv-${inv.invoice_id}`}
                    className="p-5 rounded-2xl bg-[#0B0E17] border border-rose-500/30 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-lg"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <span className="px-2 py-0.5 rounded text-[10px] font-bold uppercase font-mono bg-rose-950/60 text-rose-300 border border-rose-800/40">
                          OVERDUE MATURITY
                        </span>
                        <span className="font-mono font-bold text-white text-sm">
                          {inv.invoice_id}
                        </span>
                        <span className="text-xs text-gray-400 font-mono">
                          Due on {inv.due_date}
                        </span>
                      </div>
                      <h4 className="text-sm font-bold text-white">{inv.buyer_name}</h4>
                      <p className="text-xs text-rose-400/90 font-medium">
                        Exceeds contractual agreement of {inv.agreed_payment_days} days. Action required to prevent cash-flow gap.
                      </p>
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div className="text-right">
                        <div className="text-xs text-gray-400 uppercase">Outstanding</div>
                        <div className="text-lg font-mono font-black text-rose-400">
                          ₹{(inv.amount / 100000).toFixed(2)}L
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReminder(inv.invoice_id)}
                          className="px-3.5 py-2 bg-[#141A2E] hover:bg-[#1E2644] text-cyan-300 text-xs font-semibold rounded-xl border border-[#222B48] transition cursor-pointer"
                        >
                          Send Reminder
                        </button>
                        <Link
                          to={`/term-optimizer/${inv.invoice_id}`}
                          className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow transition"
                        >
                          Calibrate Terms
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}

                {urgentCount === 0 && (
                  <div className="p-12 text-center text-gray-500 bg-[#0B0E17] border border-[#182038] rounded-2xl">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                    <h3 className="text-sm font-bold text-white">No Urgent Action Items</h3>
                    <p className="text-xs text-gray-400 mt-1">All receivables and buyer requests are currently under control.</p>
                  </div>
                )}
              </div>
            )}

            {/* PRIORITY ACTIONS QUEUE */}
            {tab === 'today' && (
              <div className="space-y-4">
                {priorities?.queue && priorities.queue.length > 0 ? (
                  priorities.queue.map((item, idx) => (
                    <div
                      key={`today-pri-${item.invoice_id}`}
                      className="p-5 rounded-2xl bg-[#0B0E17] border border-[#1A2238] hover:border-purple-500/40 flex flex-col md:flex-row md:items-center justify-between gap-4 transition shadow-lg"
                    >
                      <div className="space-y-1">
                        <div className="flex items-center gap-2.5">
                          <span className="font-mono font-bold text-purple-400 text-xs">#{idx + 1}</span>
                          <span className="font-mono font-bold text-white text-sm">{item.invoice_id}</span>
                          <RiskBadge level={item.risk_level} />
                          <span className="text-xs text-purple-300 font-semibold">{item.buyer_name}</span>
                        </div>
                        <p className="text-xs text-gray-400">
                          Priority score {item.priority_score}/100 • Recommended Action:{' '}
                          <strong className="text-amber-300">{item.recommended_action}</strong>
                        </p>
                      </div>

                      <div className="flex items-center gap-4 justify-between md:justify-end">
                        <div className="text-right">
                          <div className="text-xs text-gray-400 uppercase">Amount</div>
                          <div className="text-base font-mono font-black text-white">
                            ₹{(item.invoice_amount / 100000).toFixed(2)}L
                          </div>
                        </div>

                        <div className="flex items-center gap-2">
                          <Link
                            to={`/term-optimizer/${item.invoice_id}`}
                            className="px-3.5 py-2 bg-[#141A2E] hover:bg-[#1E2644] text-purple-300 text-xs font-semibold rounded-xl border border-[#222B48] transition"
                          >
                            Optimize Terms
                          </Link>
                          <Link
                            to={`/receivables/${item.invoice_id}`}
                            className="px-3.5 py-2 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold text-xs rounded-xl shadow transition"
                          >
                            Execute
                          </Link>
                        </div>
                      </div>
                    </div>
                  ))
                ) : (
                  <div className="p-12 text-center text-gray-500 bg-[#0B0E17] border border-[#182038] rounded-2xl">
                    <CheckCircle2 size={32} className="mx-auto text-emerald-400 mb-2" />
                    <h3 className="text-sm font-bold text-white">No Priority Tasks Outstanding</h3>
                    <p className="text-xs text-gray-400 mt-1">All receivables are moving along predicted cash flow timelines.</p>
                  </div>
                )}
              </div>
            )}

            {/* UPCOMING QUEUE */}
            {tab === 'upcoming' && (
              <div className="space-y-4">
                {dueSoonInvoices.map((inv) => (
                  <div
                    key={`up-${inv.invoice_id}`}
                    className="p-5 rounded-2xl bg-[#0B0E17] border border-[#1A2238] flex flex-col md:flex-row md:items-center justify-between gap-4 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2">
                        <span className="font-mono font-bold text-white text-sm">{inv.invoice_id}</span>
                        <span className="text-xs text-gray-400">({inv.buyer_name})</span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-3">
                        <span>Due Date: <strong className="text-gray-300 font-mono">{inv.due_date}</strong></span>
                        <span>Contract Term: <strong className="text-purple-300 font-mono">{inv.agreed_payment_days}d</strong></span>
                      </div>
                    </div>

                    <div className="flex items-center gap-4 justify-between md:justify-end">
                      <div className="text-right">
                        <div className="text-xs text-gray-400 uppercase">Amount</div>
                        <div className="text-base font-mono font-black text-white">
                          ₹{(inv.amount / 100000).toFixed(2)}L
                        </div>
                      </div>

                      <div className="flex items-center gap-2">
                        <button
                          onClick={() => handleSendReminder(inv.invoice_id)}
                          className="px-3 py-1.5 bg-[#141A2E] hover:bg-[#1E2644] text-gray-300 text-xs font-semibold rounded-xl border border-[#222B48] transition cursor-pointer"
                        >
                          Schedule Alert
                        </button>
                        <Link
                          to={`/receivables/${inv.invoice_id}`}
                          className="px-3 py-1.5 bg-[#121626] hover:bg-[#182038] text-purple-300 text-xs font-semibold rounded-xl border border-[#1E2644] transition"
                        >
                          View Details
                        </Link>
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}

            {/* COMPLETED QUEUE */}
            {tab === 'completed' && (
              <div className="space-y-4">
                {paidInvoices.map((inv) => (
                  <div
                    key={`comp-inv-${inv.invoice_id}`}
                    className="p-5 rounded-2xl bg-[#090C16] border border-[#161D32] flex flex-col md:flex-row md:items-center justify-between gap-4 opacity-80 hover:opacity-100 transition"
                  >
                    <div className="space-y-1">
                      <div className="flex items-center gap-2.5">
                        <CheckCircle2 size={16} className="text-emerald-400" />
                        <span className="font-mono font-bold text-white text-sm">{inv.invoice_id}</span>
                        <span className="text-xs text-purple-300">{inv.buyer_name}</span>
                      </div>
                      <div className="text-xs text-gray-400 flex items-center gap-3">
                        <span>Paid: <strong className="text-emerald-400 font-mono">₹{(inv.amount / 100000).toFixed(2)}L</strong></span>
                        {inv.actual_payment_date && (
                          <span>Settled on {inv.actual_payment_date}</span>
                        )}
                      </div>
                    </div>

                    <Link
                      to={`/receivables/${inv.invoice_id}`}
                      className="px-3 py-1.5 bg-[#121626] hover:bg-[#182038] text-gray-400 hover:text-white text-xs font-semibold rounded-xl border border-[#1E2644] transition self-end md:self-auto"
                    >
                      Audit Trail
                    </Link>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </DashboardLayout>
  );
}
