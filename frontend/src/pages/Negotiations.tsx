import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { MessageSquare, Sparkles, UserCheck, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { api } from '../api/client';
import type { Negotiation } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Negotiations() {
  const [loading, setLoading] = useState(true);
  const [negotiations, setNegotiations] = useState<Negotiation[]>([]);
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'PENDING' | 'ONGOING' | 'AGREED' | 'REJECTED'>('ALL');

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const data = await api.getNegotiations();
        setNegotiations(data);
      } catch (err) {
        console.error('Failed to load negotiations list', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Negotiation Workspace">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Filter negotiations
  const filteredNegotiations = negotiations.filter(neg => {
    if (statusFilter === 'PENDING') {
      return neg.approval_status === 'PENDING';
    }
    if (statusFilter === 'ONGOING') {
      return neg.status === 'INITIAL' || neg.status === 'WAITING_FOR_RESPONSE' || neg.status === 'COUNTEROFFER_RECEIVED';
    }
    if (statusFilter === 'AGREED') {
      return neg.status === 'AGREED';
    }
    if (statusFilter === 'REJECTED') {
      return neg.status === 'REJECTED';
    }
    return true;
  });

  const pendingApprovalsCount = negotiations.filter(n => n.approval_status === 'PENDING').length;
  const agreedCount = negotiations.filter(n => n.status === 'AGREED' || n.status === 'CLOSED').length;
  const ongoingCount = negotiations.filter(n => n.status === 'INITIAL' || n.status === 'WAITING_FOR_RESPONSE' || n.status === 'COUNTEROFFER_RECEIVED').length;

  return (
    <DashboardLayout pageTitle="AI Negotiation Workspace Command">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Sparkles size={20} className="text-purple-400" />
              AI Negotiation Workspaces
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Supervise AI negotiation copilot sessions, calibrate target term compromises, and audit buyer communication logs.
            </p>
          </div>

          <button
            onClick={() => navigate('/term-optimizer')}
            className="px-4 py-2 bg-[#12121A] hover:bg-[#1A1A28] border border-[#1E1F30] text-purple-300 rounded-xl text-xs font-semibold flex items-center gap-1.5 transition cursor-pointer self-start md:self-auto"
          >
            <Sparkles size={14} />
            Calibrate Terms
          </button>
        </div>

        {/* Top KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Workspaces</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{negotiations.length}</div>
            <div className="text-[10px] text-gray-400 mt-1">Initiated copilot sessions</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Pending Human Review</div>
            <div className="text-2xl font-black text-amber-400 font-mono mt-1">{pendingApprovalsCount}</div>
            <div className="text-[10px] text-amber-400/80 mt-1 flex items-center gap-1">
              <UserCheck size={12} />
              <span>Human-in-the-loop guardrail</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Active Dialogues</div>
            <div className="text-2xl font-black text-purple-400 font-mono mt-1">{ongoingCount}</div>
            <div className="text-[10px] text-gray-400 mt-1">In negotiation workflow</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Agreed & Closed</div>
            <div className="text-2xl font-black text-emerald-400 font-mono mt-1">{agreedCount}</div>
            <div className="text-[10px] text-emerald-400/80 mt-1 flex items-center gap-1">
              <CheckCircle2 size={12} />
              <span>Accelerated settlement terms</span>
            </div>
          </div>
        </div>

        {/* Toolbar Filters */}
        <div className="p-4 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-wrap gap-2">
          {(['ALL', 'PENDING', 'ONGOING', 'AGREED', 'REJECTED'] as const).map(f => (
            <button
              key={f}
              onClick={() => setStatusFilter(f)}
              className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                statusFilter === f
                  ? 'bg-purple-600 border-purple-500 text-white shadow-[0_2px_10px_rgba(168,85,247,0.2)]'
                  : 'bg-[#12121A] border-[#1C1D26] text-gray-400 hover:text-gray-200'
              }`}
            >
              {f === 'PENDING' ? `PENDING APPROVAL (${pendingApprovalsCount})` : f}
            </button>
          ))}
        </div>

        {/* Workspace Table */}
        {filteredNegotiations.length > 0 ? (
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#161720] text-gray-500 pb-2">
                    <th className="py-2.5 font-bold">Workspace ID</th>
                    <th className="py-2.5 font-bold">Invoice Reference</th>
                    <th className="py-2.5 font-bold text-center">Negotiation Round</th>
                    <th className="py-2.5 font-bold text-center">Optimized Target</th>
                    <th className="py-2.5 font-bold text-center">Latest Buyer Offer</th>
                    <th className="py-2.5 font-bold text-center">Approval State</th>
                    <th className="py-2.5 font-bold text-center">Negotiation Status</th>
                    <th className="py-2.5 font-bold text-right">Action</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12121A]">
                  {filteredNegotiations.map((neg) => (
                    <tr 
                      key={neg.id}
                      onClick={() => navigate(`/negotiations/${neg.id}`)}
                      className="hover:bg-[#12121A]/60 cursor-pointer transition group"
                    >
                      <td className="py-4 font-bold text-white font-mono flex items-center gap-2 group-hover:text-purple-300 transition">
                        <MessageSquare size={14} className="text-purple-400" />
                        Workspace #{neg.id}
                      </td>
                      <td className="py-4 font-mono text-gray-300">{neg.invoice_id}</td>
                      <td className="py-4 text-center text-gray-400 font-mono">Round {neg.round}</td>
                      <td className="py-4 text-center text-purple-300 font-mono font-bold">{neg.target_term} Days</td>
                      <td className="py-4 text-center text-white font-bold font-mono">
                        {neg.buyer_latest_offer ? `${neg.buyer_latest_offer} Days` : 'No Offer'}
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                          neg.approval_status === 'APPROVED' 
                            ? 'text-emerald-400 bg-emerald-500/10' 
                            : neg.approval_status === 'REJECTED'
                            ? 'text-rose-400 bg-rose-500/10'
                            : 'text-amber-400 bg-amber-500/10'
                        }`}>
                          {neg.approval_status}
                        </span>
                      </td>
                      <td className="py-4 text-center">
                        <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold ${
                          neg.status === 'AGREED' || neg.status === 'CLOSED'
                            ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                            : neg.status === 'REJECTED'
                            ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                            : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                        }`}>
                          {neg.status}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <span className="text-purple-400 font-semibold flex items-center justify-end gap-1 group-hover:text-purple-300">
                          Open Workspace
                          <ArrowUpRight size={13} />
                        </span>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState 
            title="No active negotiations match filter"
            description="Initiate a negotiation from the Receivable Detail view to open a workspace copilot."
            actionLabel="View Receivables"
            onAction={() => navigate('/receivables')}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
