import { useState, useEffect } from 'react';
import DashboardLayout from '../components/DashboardLayout';
import {
  ShieldCheck,
  Zap,
  RefreshCw,
  Server,
  FileCheck,
  Database,
  Lock,
  Terminal,
  Activity
} from 'lucide-react';
import { api } from '../api/client';
import type { RazorpayStatus, AuditLog, Payment } from '../types';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Integrations() {
  const [status, setStatus] = useState<RazorpayStatus | null>(null);
  const [auditLogs, setAuditLogs] = useState<AuditLog[]>([]);
  const [recentPayments, setRecentPayments] = useState<Payment[]>([]);
  const [loading, setLoading] = useState(true);
  const [syncing, setSyncing] = useState(false);
  const [syncMessage, setSyncMessage] = useState<string | null>(null);


  const fetchData = async () => {
    try {
      setLoading(true);
      const [statusRes, logsRes, paymentsRes] = await Promise.all([
        api.getRazorpayStatus(),
        api.getAuditLogs(15),
        api.getPayments({ limit: 5 }),
      ]);
      setStatus(statusRes);
      setAuditLogs(logsRes);
      setRecentPayments(paymentsRes);
    } catch (err) {
      console.error('Failed to load integration data:', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    fetchData();
  }, []);

  const handleSyncPayments = async () => {
    try {
      setSyncing(true);
      setSyncMessage(null);
      const res = await api.importPayments();
      setSyncMessage(res.message);
      await fetchData();
    } catch (err: any) {
      console.error('Failed to sync payments:', err);
      setSyncMessage(`Sync failed: ${err.message || 'Server error'}`);
    } finally {
      setSyncing(false);
    }
  };

  const isLive = status?.mode === 'LIVE';

  if (loading && !status) {
    return (
      <DashboardLayout pageTitle="Payment Integrations">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  return (
    <DashboardLayout pageTitle="Payment Integrations">

      <div className="p-6 md:p-8 max-w-7xl mx-auto space-y-8 animate-fadeIn">
        {/* Header Title Banner */}
        <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4 border-b border-[#1A1A24] pb-6">
          <div>
            <div className="flex items-center gap-3">
              <div className="h-10 w-10 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-600 to-pink-500 flex items-center justify-center text-white shadow-lg shadow-purple-900/30">
                <Zap size={22} className="text-white" />
              </div>
              <div>
                <h1 className="text-2xl font-extrabold text-white tracking-tight">Payment Gateways & Integrations</h1>
                <p className="text-sm text-gray-400">Manage Razorpay settlement data, webhook ingestion, and demo simulation layers.</p>
              </div>
            </div>
          </div>

          <div className="flex items-center gap-3">
            <button
              onClick={handleSyncPayments}
              disabled={syncing}
              className={`flex items-center gap-2 px-4 py-2.5 rounded-xl text-sm font-semibold transition-all duration-200 shadow-md ${
                syncing
                  ? 'bg-purple-900/40 text-purple-300 cursor-wait'
                  : 'bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white shadow-purple-900/40 active:scale-95'
              }`}
            >
              <RefreshCw size={16} className={syncing ? 'animate-spin' : ''} />
              <span>{syncing ? 'Synchronizing...' : 'Import / Sync Payments'}</span>
            </button>
          </div>
        </div>

        {syncMessage && (
          <div className="p-4 bg-purple-950/30 border border-purple-800/40 rounded-2xl flex items-center justify-between text-sm text-purple-200">
            <div className="flex items-center gap-2">
              <FileCheck size={18} className="text-purple-400 shrink-0" />
              <span>{syncMessage}</span>
            </div>
            <button onClick={() => setSyncMessage(null)} className="text-gray-400 hover:text-white text-xs">Dismiss</button>
          </div>
        )}

        {/* Razorpay Integration Status Card */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Main Status Panel */}
          <div className="lg:col-span-2 bg-[#0E0E14] border border-[#1C1C28] rounded-2xl p-6 shadow-xl relative overflow-hidden">
            <div className="absolute -top-24 -right-24 w-60 h-60 bg-purple-600/10 rounded-full blur-3xl pointer-events-none"></div>

            <div className="flex items-start justify-between">
              <div className="flex items-center gap-4">
                <div className="h-14 w-14 rounded-2xl bg-[#14141E] border border-[#262638] flex items-center justify-center text-blue-400 font-extrabold text-lg shadow-inner">
                  <span className="text-transparent bg-clip-text bg-gradient-to-r from-blue-400 to-indigo-300">RzP</span>
                </div>
                <div>
                  <div className="flex items-center gap-2">
                    <h2 className="text-xl font-bold text-white">Razorpay Payments Layer</h2>
                    {isLive ? (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 flex items-center gap-1">
                        <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                        LIVE CONNECTED
                      </span>
                    ) : (
                      <span className="px-2.5 py-0.5 rounded-full text-xs font-mono font-bold bg-purple-500/10 text-purple-300 border border-purple-500/20 flex items-center gap-1">
                        <Database size={11} />
                        DEMO MODE ACTIVE
                      </span>
                    )}
                  </div>
                  <p className="text-xs text-gray-400 mt-1">
                    Synchronizes settlement records, partial payments, and transaction webhooks into TermWise risk intelligence.
                  </p>
                </div>
              </div>
            </div>

            <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 mt-6 pt-6 border-t border-[#181822]">
              <div className="bg-[#12121A] p-3.5 rounded-xl border border-[#1F1F2C]">
                <div className="text-xs text-gray-400">Environment Mode</div>
                <div className="text-base font-bold text-white mt-1 font-mono">{status?.mode || 'DEMO'}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">{isLive ? 'Live API calls permitted' : 'Synthetic simulation dataset'}</div>
              </div>

              <div className="bg-[#12121A] p-3.5 rounded-xl border border-[#1F1F2C]">
                <div className="text-xs text-gray-400">Public Key ID</div>
                <div className="text-base font-bold text-white mt-1 font-mono truncate">{status?.key_id || 'DEMO_KEY_MOCK'}</div>
                <div className="text-[10px] text-gray-500 mt-0.5">Secrets remain on backend</div>
              </div>

              <div className="bg-[#12121A] p-3.5 rounded-xl border border-[#1F1F2C]">
                <div className="text-xs text-gray-400">Signature Verification</div>
                <div className="text-base font-bold text-emerald-400 mt-1 flex items-center gap-1.5 font-mono">
                  <ShieldCheck size={16} /> HMAC-SHA256
                </div>
                <div className="text-[10px] text-gray-500 mt-0.5">Official Razorpay standard</div>
              </div>
            </div>

            {/* Backend Security Notice */}
            <div className="mt-6 p-4 rounded-xl bg-[#09090D] border border-[#1F1F2C] text-xs text-gray-300 flex items-start gap-3">
              <Lock size={18} className="text-amber-400 shrink-0 mt-0.5" />
              <div>
                <span className="font-semibold text-white">Security-First Architecture:</span> Never enter secret API keys into client browser forms. To connect live Razorpay credentials, configure <code className="text-purple-300 font-mono">RAZORPAY_KEY_ID</code> and <code className="text-purple-300 font-mono">RAZORPAY_KEY_SECRET</code> in the backend <code className="text-purple-300 font-mono">.env</code> file.
              </div>
            </div>
          </div>

          {/* Webhook Configuration Guide */}
          <div className="bg-[#0E0E14] border border-[#1C1C28] rounded-2xl p-6 shadow-xl flex flex-col justify-between">
            <div>
              <div className="flex items-center gap-2 mb-3">
                <Server size={18} className="text-purple-400" />
                <h3 className="text-base font-bold text-white">Webhook Ingestion Endpoint</h3>
              </div>
              <p className="text-xs text-gray-400 mb-4">
                Configured to automatically ingest payment events and reconcile buyer invoices in real-time.
              </p>

              <div className="p-3 bg-[#08080C] rounded-xl border border-[#1A1A26] font-mono text-xs text-purple-300 break-all select-all">
                POST /api/webhooks/razorpay
              </div>

              <div className="mt-4 space-y-2">
                <div className="text-[11px] font-semibold uppercase text-gray-500 tracking-wider">Supported Lifecycle Events</div>
                <div className="flex flex-wrap gap-1.5">
                  {['payment.captured', 'payment.failed', 'refund.processed', 'payment.authorized', 'order.paid'].map((ev) => (
                    <span key={ev} className="px-2 py-0.5 rounded-md bg-[#161622] border border-[#242436] text-[11px] font-mono text-gray-300">
                      {ev}
                    </span>
                  ))}
                </div>
              </div>
            </div>

            <div className="mt-6 pt-4 border-t border-[#181822] text-[11px] text-gray-500 flex items-center gap-1">
              <ShieldCheck size={14} className="text-purple-400" /> Idempotent processing prevents duplicate records.
            </div>
          </div>
        </div>

        {/* Audit & Activity Logs Section */}
        <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
          {/* Audit Logs Table */}
          <div className="lg:col-span-2 bg-[#0E0E14] border border-[#1C1C28] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Activity size={18} className="text-indigo-400" />
                <h3 className="text-lg font-bold text-white">Payment & Integration Audit Log</h3>
              </div>
              <span className="text-xs text-gray-500 font-mono">Last {auditLogs.length} events</span>
            </div>

            <div className="overflow-x-auto">
              <table className="w-full text-left text-xs text-gray-300">
                <thead className="bg-[#12121A] text-gray-400 uppercase font-mono text-[10px] tracking-wider border-b border-[#1C1C28]">
                  <tr>
                    <th className="p-3">Event Type</th>
                    <th className="p-3">Message</th>
                    <th className="p-3">Status</th>
                    <th className="p-3">Timestamp</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#161622]">
                  {auditLogs.length === 0 ? (
                    <tr>
                      <td colSpan={4} className="p-6 text-center text-gray-500">
                        No audit events recorded yet. Click "Import / Sync Payments" to generate activity.
                      </td>
                    </tr>
                  ) : (
                    auditLogs.map((log) => (
                      <tr key={log.id} className="hover:bg-[#12121C]/60 transition-colors">
                        <td className="p-3 font-mono font-semibold text-purple-300">
                          {log.event_type}
                        </td>
                        <td className="p-3 text-gray-300 max-w-xs truncate" title={log.message}>
                          {log.message}
                        </td>
                        <td className="p-3">
                          <span
                            className={`px-2 py-0.5 rounded-full text-[10px] font-mono font-bold ${
                              log.status === 'SUCCESS'
                                ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                                : log.status === 'ERROR'
                                ? 'bg-rose-500/10 text-rose-400 border border-rose-500/20'
                                : 'bg-blue-500/10 text-blue-400 border border-blue-500/20'
                            }`}
                          >
                            {log.status}
                          </span>
                        </td>
                        <td className="p-3 text-gray-500 font-mono whitespace-nowrap">
                          {new Date(log.created_at).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit', second: '2-digit' })}
                        </td>
                      </tr>
                    ))
                  )}
                </tbody>
              </table>
            </div>
          </div>

          {/* Quick Stats / Recent Transactions Preview */}
          <div className="bg-[#0E0E14] border border-[#1C1C28] rounded-2xl p-6 shadow-xl space-y-4">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-2">
                <Terminal size={18} className="text-purple-400" />
                <h3 className="text-lg font-bold text-white">Recent Payments</h3>
              </div>
            </div>

            <div className="space-y-3">
              {recentPayments.length === 0 ? (
                <div className="p-6 text-center text-xs text-gray-500">No payment records found.</div>
              ) : (
                recentPayments.map((p) => (
                  <div key={p.id} className="p-3 bg-[#12121A] border border-[#1E1E2C] rounded-xl flex items-center justify-between">
                    <div>
                      <div className="text-xs font-bold text-white">{p.buyer_name || p.invoice_id}</div>
                      <div className="text-[10px] text-gray-400 font-mono">
                        {p.invoice_id} • {p.payment_date}
                      </div>
                    </div>
                    <div className="text-right">
                      <div className="text-xs font-bold text-white font-mono">₹{p.amount.toLocaleString('en-IN')}</div>
                      <span
                        className={`text-[9px] font-mono px-1.5 py-0.5 rounded font-semibold ${
                          p.status === 'SUCCESS' ? 'text-emerald-400 bg-emerald-950/40' : 'text-rose-400 bg-rose-950/40'
                        }`}
                      >
                        {p.status}
                      </span>
                    </div>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </DashboardLayout>
  );
}
