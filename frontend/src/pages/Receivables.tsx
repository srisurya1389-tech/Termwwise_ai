import { useEffect, useState } from 'react';
import { Link } from 'react-router-dom';
import {
  Search,
  ArrowUpDown,
  Sparkles,
  Eye
} from 'lucide-react';
import { api } from '../api/client';
import type { Invoice, PriorityItem } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Receivables() {
  const [loading, setLoading] = useState(true);
  const [invoices, setInvoices] = useState<Invoice[]>([]);
  const [priorityMap, setPriorityMap] = useState<Record<string, PriorityItem>>({});

  // Filters & Sorting state
  const [searchTerm, setSearchTerm] = useState('');
  const [smartFilter, setSmartFilter] = useState<
    'ALL' | 'HEALTHY' | 'AT_RISK' | 'OVERDUE' | 'HIGH_VALUE' | 'DUE_7D' | 'NEGOTIATION_REQUIRED'
  >('ALL');
  const [sortField, setSortField] = useState<'priority_score' | 'amount' | 'due_date' | 'risk_score'>('priority_score');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [invList, prioritiesResponse] = await Promise.all([
          api.getInvoices(),
          api.getPriorities(),
        ]);

        setInvoices(invList);

        const pMap: Record<string, PriorityItem> = {};
        prioritiesResponse.queue.forEach((item) => {
          pMap[item.invoice_id] = item;
        });
        setPriorityMap(pMap);
      } catch (err) {
        console.error('Failed to load receivables', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Receivables Ledger">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // KPI Calculations
  const totalAmount = invoices.reduce((acc, i) => acc + i.amount, 0);
  const outstandingInvoices = invoices.filter((i) => i.payment_status !== 'Paid');
  const totalOutstanding = outstandingInvoices.reduce((acc, i) => acc + i.amount, 0);
  const overdueInvoices = invoices.filter((i) => i.payment_status === 'Overdue');
  const totalOverdue = overdueInvoices.reduce((acc, i) => acc + i.amount, 0);
  const highRiskCount = Object.values(priorityMap).filter((p) => p.risk_level === 'HIGH').length;

  // Filter invoices
  const filteredInvoices = invoices.filter((inv) => {
    const matchesSearch =
      inv.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.buyer_name.toLowerCase().includes(searchTerm.toLowerCase());

    if (!matchesSearch) return false;

    const pri = priorityMap[inv.invoice_id];

    switch (smartFilter) {
      case 'HEALTHY':
        return inv.payment_status === 'Paid' || (pri && pri.risk_level === 'LOW');
      case 'AT_RISK':
        return pri && (pri.risk_level === 'HIGH' || pri.risk_level === 'MEDIUM');
      case 'OVERDUE':
        return inv.payment_status === 'Overdue';
      case 'HIGH_VALUE':
        return inv.amount >= 300000;
      case 'DUE_7D': {
        const dueDate = new Date(inv.due_date).getTime();
        const now = new Date('2026-09-05').getTime();
        const diffDays = (dueDate - now) / (1000 * 60 * 60 * 24);
        return diffDays >= 0 && diffDays <= 7 && inv.payment_status !== 'Paid';
      }
      case 'NEGOTIATION_REQUIRED':
        return pri && pri.priority_score >= 60 && inv.payment_status !== 'Paid';
      default:
        return true;
    }
  });

  // Sort invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let aVal: any = a.amount;
    let bVal: any = b.amount;

    if (sortField === 'priority_score') {
      aVal = priorityMap[a.invoice_id]?.priority_score || 0;
      bVal = priorityMap[b.invoice_id]?.priority_score || 0;
    } else if (sortField === 'due_date') {
      aVal = new Date(a.due_date).getTime();
      bVal = new Date(b.due_date).getTime();
    } else if (sortField === 'risk_score') {
      const riskScores: Record<string, number> = { HIGH: 3, MEDIUM: 2, LOW: 1 };
      aVal = riskScores[priorityMap[a.invoice_id]?.risk_level || 'LOW'] || 1;
      bVal = riskScores[priorityMap[b.invoice_id]?.risk_level || 'LOW'] || 1;
    }

    if (sortOrder === 'asc') {
      return aVal > bVal ? 1 : -1;
    } else {
      return aVal < bVal ? 1 : -1;
    }
  });

  const handleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('desc');
    }
  };

  return (
    <DashboardLayout pageTitle="Receivables Ledger">
      {/* Top Ledger KPIs */}
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-4 mb-6">
        <div className="p-4 rounded-2xl bg-[#0B0E17] border border-[#1A2238] space-y-1 text-left">
          <div className="text-[11px] font-medium uppercase text-gray-400">Total Billed Ledger</div>
          <div className="text-2xl font-mono font-black text-white">
            ₹{(totalAmount / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-gray-400">{invoices.length} Total Invoices</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B0E17] border border-[#1A2238] space-y-1 text-left">
          <div className="text-[11px] font-medium uppercase text-gray-400">Outstanding Uncollected</div>
          <div className="text-2xl font-mono font-black text-purple-400">
            ₹{(totalOutstanding / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-gray-400">{outstandingInvoices.length} Invoices Active</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B0E17] border border-[#1A2238] space-y-1 text-left">
          <div className="text-[11px] font-medium uppercase text-gray-400">Overdue Balances</div>
          <div className="text-2xl font-mono font-black text-rose-400">
            ₹{(totalOverdue / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-rose-400/80">{overdueInvoices.length} Past Maturity</div>
        </div>

        <div className="p-4 rounded-2xl bg-[#0B0E17] border border-[#1A2238] space-y-1 text-left">
          <div className="text-[11px] font-medium uppercase text-gray-400">High Risk Threat Count</div>
          <div className="text-2xl font-mono font-black text-amber-400">{highRiskCount} Accounts</div>
          <div className="text-xs text-amber-400/80">Requires Active Term Tuning</div>
        </div>
      </div>

      {/* Filter Toolbar & Smart Tabs */}
      <div className="p-5 bg-[#0A0D18] border border-[#182038] rounded-2xl space-y-4 mb-6 shadow-xl text-left">
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div className="relative flex-1 max-w-md">
            <Search size={14} className="absolute left-3.5 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search by invoice ID or buyer name... (Press / for global search)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#0E1220] border border-[#1A233D] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="flex items-center gap-2 text-xs text-gray-400">
            <span>Sort by:</span>
            <button
              onClick={() => handleSort('priority_score')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                sortField === 'priority_score'
                  ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                  : 'bg-[#0E1220] border-[#1A233D] text-gray-400 hover:text-white'
              }`}
            >
              Priority Score
              <ArrowUpDown size={12} />
            </button>
            <button
              onClick={() => handleSort('amount')}
              className={`px-3 py-1.5 rounded-lg border text-xs font-semibold flex items-center gap-1 transition cursor-pointer ${
                sortField === 'amount'
                  ? 'bg-purple-950/60 border-purple-500 text-purple-300'
                  : 'bg-[#0E1220] border-[#1A233D] text-gray-400 hover:text-white'
              }`}
            >
              Amount
              <ArrowUpDown size={12} />
            </button>
          </div>
        </div>

        {/* Smart Filter Tabs */}
        <div className="flex items-center gap-2 overflow-x-auto pb-1 border-t border-[#141B30] pt-3">
          {[
            { key: 'ALL', label: `All Invoices (${invoices.length})` },
            { key: 'AT_RISK', label: 'At-Risk Invoices' },
            { key: 'OVERDUE', label: `Overdue (${overdueInvoices.length})` },
            { key: 'NEGOTIATION_REQUIRED', label: 'Actionable Negotiations' },
            { key: 'HIGH_VALUE', label: 'High Value (≥₹3L)' },
            { key: 'DUE_7D', label: 'Due within 7 Days' },
            { key: 'HEALTHY', label: 'Healthy & Paid' },
          ].map((tab) => (
            <button
              key={tab.key}
              onClick={() => setSmartFilter(tab.key as any)}
              className={`px-3.5 py-1.5 rounded-xl text-xs font-semibold whitespace-nowrap transition cursor-pointer ${
                smartFilter === tab.key
                  ? 'bg-purple-950/60 text-purple-200 border border-purple-500/40 shadow-sm'
                  : 'text-gray-400 hover:text-gray-200 hover:bg-[#121626]'
              }`}
            >
              {tab.label}
            </button>
          ))}
        </div>
      </div>

      {/* Invoices Ledger Table */}
      <div className="bg-[#0A0D18] border border-[#182038] rounded-2xl overflow-hidden shadow-xl text-left">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0E1322] border-b border-[#182038] text-[11px] uppercase tracking-wider text-gray-400 font-mono">
              <tr>
                <th className="py-3.5 px-5">Invoice ID</th>
                <th className="py-3.5 px-4">Buyer Entity</th>
                <th className="py-3.5 px-4 text-right">Amount</th>
                <th className="py-3.5 px-4">Due Date</th>
                <th className="py-3.5 px-4">Contract Term</th>
                <th className="py-3.5 px-4 text-center">Risk Level</th>
                <th className="py-3.5 px-4 text-center">Priority</th>
                <th className="py-3.5 px-5 text-right">Recommended Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141B30]">
              {sortedInvoices.length > 0 ? (
                sortedInvoices.map((inv) => {
                  const pri = priorityMap[inv.invoice_id];
                  const priorityScore = pri?.priority_score || 45;

                  return (
                    <tr
                      key={inv.invoice_id}
                      className="hover:bg-[#101528] transition group"
                    >
                      <td className="py-4 px-5 font-mono font-bold text-white">
                        <Link
                          to={`/receivables/${inv.invoice_id}`}
                          className="hover:text-purple-300 transition flex items-center gap-1.5"
                        >
                          {inv.invoice_id}
                        </Link>
                      </td>

                      <td className="py-4 px-4 font-semibold text-gray-200">
                        <Link
                          to={`/buyers/${inv.buyer_id}`}
                          className="hover:text-purple-300 transition"
                        >
                          {inv.buyer_name}
                        </Link>
                      </td>

                      <td className="py-4 px-4 text-right font-mono font-bold text-white">
                        ₹{(inv.amount / 100000).toFixed(2)}L
                      </td>

                      <td className="py-4 px-4 font-mono text-gray-300">
                        {inv.due_date}
                      </td>

                      <td className="py-4 px-4 font-mono text-purple-300 font-semibold">
                        {inv.agreed_payment_days} Days
                      </td>

                      <td className="py-4 px-4 text-center">
                        <RiskBadge level={pri?.risk_level || 'LOW'} />
                      </td>

                      <td className="py-4 px-4 text-center">
                        <span
                          className={`font-mono font-bold text-xs ${
                            priorityScore >= 70
                              ? 'text-rose-400'
                              : priorityScore >= 50
                              ? 'text-amber-400'
                              : 'text-gray-400'
                          }`}
                        >
                          {priorityScore}
                        </span>
                      </td>

                      <td className="py-4 px-5 text-right space-x-2">
                        <Link
                          to={`/receivables/${inv.invoice_id}`}
                          className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#141A2E] hover:bg-[#1E2644] text-gray-300 hover:text-white rounded-lg border border-[#212A48] transition text-xs"
                        >
                          <Eye size={12} />
                          Details
                        </Link>

                        {inv.payment_status !== 'Paid' && (
                          <Link
                            to="/negotiations"
                            className="inline-flex items-center gap-1 px-2.5 py-1 bg-gradient-to-r from-purple-600 to-indigo-600 hover:opacity-90 text-white font-bold rounded-lg transition text-xs shadow-sm"
                          >
                            <Sparkles size={12} />
                            Negotiate
                          </Link>
                        )}
                      </td>
                    </tr>
                  );
                })
              ) : (
                <tr>
                  <td colSpan={8} className="py-12 text-center text-gray-500">
                    <EmptyState
                      title="No invoices found"
                      description="No invoice records match your active smart filter or search criteria."
                    />
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </DashboardLayout>
  );
}
