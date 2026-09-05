import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpDown, CheckCircle, Clock } from 'lucide-react';
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
  const [statusFilter, setStatusFilter] = useState<'ALL' | 'OUTSTANDING' | 'OVERDUE' | 'PAID' | 'HIGH_RISK' | 'HIGH_PRIORITY'>('ALL');
  const [sortField, setSortField] = useState<'invoice_id' | 'amount' | 'due_date' | 'priority_score'>('due_date');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('asc');

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const [invList, prioritiesResponse] = await Promise.all([
          api.getInvoices(),
          api.getPriorities()
        ]);
        
        setInvoices(invList);
        
        // Map queue items by invoice_id
        const pMap: Record<string, PriorityItem> = {};
        prioritiesResponse.queue.forEach(item => {
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
      <DashboardLayout pageTitle="Receivables Command">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Format currency
  const formatINR = (val: number) => {
    return `₹${val.toLocaleString('en-IN', { maximumFractionDigits: 0 })}`;
  };

  // Filter invoices
  const filteredInvoices = invoices.filter(inv => {
    const matchesSearch = 
      inv.invoice_id.toLowerCase().includes(searchTerm.toLowerCase()) ||
      inv.buyer_name.toLowerCase().includes(searchTerm.toLowerCase());
      
    if (!matchesSearch) return false;
    
    const pri = priorityMap[inv.invoice_id];
    
    switch (statusFilter) {
      case 'OUTSTANDING':
        return inv.payment_status === 'Outstanding';
      case 'OVERDUE':
        return inv.payment_status === 'Overdue';
      case 'PAID':
        return inv.payment_status === 'Paid';
      case 'HIGH_RISK':
        return pri && pri.risk_level === 'HIGH';
      case 'HIGH_PRIORITY':
        return pri && pri.priority_score >= 70;
      default:
        return true;
    }
  });

  // Sort invoices
  const sortedInvoices = [...filteredInvoices].sort((a, b) => {
    let aVal: any = a[sortField as keyof Invoice] || '';
    let bVal: any = b[sortField as keyof Invoice] || '';
    
    // Custom resolves for priority score
    if (sortField === 'priority_score') {
      aVal = priorityMap[a.invoice_id]?.priority_score || 0;
      bVal = priorityMap[b.invoice_id]?.priority_score || 0;
    }

    if (sortField === 'due_date') {
      aVal = new Date(aVal).getTime();
      bVal = new Date(bVal).getTime();
    }

    if (aVal < bVal) return sortOrder === 'asc' ? -1 : 1;
    if (aVal > bVal) return sortOrder === 'asc' ? 1 : -1;
    return 0;
  });

  const toggleSort = (field: typeof sortField) => {
    if (sortField === field) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortField(field);
      setSortOrder('asc');
    }
  };

  return (
    <DashboardLayout pageTitle="Accounts Receivable Asset Ledger">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight">Receivables Ledger</h2>
            <p className="text-xs text-gray-500 mt-0.5">Manage historical and current invoices, threat prioritization, and automated terms.</p>
          </div>
        </div>

        {/* Toolbar: Search, Filters */}
        <div className="p-4 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col lg:flex-row gap-4 items-center justify-between">
          {/* Search bar */}
          <div className="relative w-full lg:w-80">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search by buyer or invoice ID..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#12121A] border border-[#1C1D26] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          {/* Filters Row */}
          <div className="flex flex-wrap gap-2 w-full lg:w-auto">
            {(['ALL', 'OUTSTANDING', 'OVERDUE', 'PAID', 'HIGH_RISK', 'HIGH_PRIORITY'] as const).map(f => (
              <button
                key={f}
                onClick={() => setStatusFilter(f)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  statusFilter === f
                    ? 'bg-purple-600 border-purple-500 text-white shadow-[0_2px_10px_rgba(168,85,247,0.2)]'
                    : 'bg-[#12121A] border-[#1C1D26] text-gray-400 hover:text-gray-200'
                }`}
              >
                {f.replace('_', ' ')}
              </button>
            ))}
          </div>
        </div>

        {/* Table of Receivables */}
        {sortedInvoices.length > 0 ? (
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#161720] text-gray-500 pb-3">
                    <th className="py-3 font-bold cursor-pointer hover:text-white" onClick={() => toggleSort('invoice_id')}>
                      <div className="flex items-center gap-1">
                        Invoice ID
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3 font-bold">Buyer</th>
                    <th className="py-3 font-bold cursor-pointer hover:text-white" onClick={() => toggleSort('amount')}>
                      <div className="flex items-center gap-1">
                        Amount
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3 font-bold cursor-pointer hover:text-white" onClick={() => toggleSort('due_date')}>
                      <div className="flex items-center gap-1">
                        Due Date
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3 font-bold">Predicted Date</th>
                    <th className="py-3 font-bold text-center">Risk Level</th>
                    <th className="py-3 font-bold text-center cursor-pointer hover:text-white" onClick={() => toggleSort('priority_score')}>
                      <div className="flex items-center gap-1 justify-center">
                        Priority
                        <ArrowUpDown size={12} />
                      </div>
                    </th>
                    <th className="py-3 font-bold text-right">Status</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12121A]">
                  {sortedInvoices.map((inv) => {
                    const pri = priorityMap[inv.invoice_id];
                    return (
                      <tr 
                        key={inv.invoice_id}
                        onClick={() => navigate(`/receivables/${inv.invoice_id}`)}
                        className="hover:bg-[#12121A]/60 cursor-pointer transition"
                      >
                        <td className="py-4 font-mono font-semibold text-white">{inv.invoice_id}</td>
                        <td className="py-4 font-semibold text-gray-300">{inv.buyer_name}</td>
                        <td className="py-4 font-bold text-white font-mono">{formatINR(inv.amount)}</td>
                        <td className="py-4 text-gray-400">
                          {new Date(inv.due_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short', year: 'numeric' })}
                        </td>
                        <td className="py-4 text-gray-400 font-mono">
                          {pri ? (
                            new Date(pri.predicted_payment_date).toLocaleDateString('en-IN', { day: 'numeric', month: 'short' })
                          ) : inv.payment_status === 'Paid' ? (
                            'Settled'
                          ) : (
                            'Calculating...'
                          )}
                        </td>
                        <td className="py-4 text-center">
                          {pri ? <RiskBadge level={pri.risk_level} /> : <span className="text-gray-500 font-mono text-[10px]">LOW RISK</span>}
                        </td>
                        <td className="py-4 text-center">
                          <span className={`px-2 py-0.5 rounded font-mono font-bold ${
                            pri && pri.priority_score >= 70 ? 'text-rose-400 bg-rose-500/10' : pri ? 'text-amber-400 bg-amber-500/10' : 'text-gray-500'
                          }`}>
                            {pri ? pri.priority_score : '—'}
                          </span>
                        </td>
                        <td className="py-4 text-right">
                          <span className={`px-2.5 py-1 rounded-xl text-[10px] font-bold inline-flex items-center gap-1 ${
                            inv.payment_status === 'Paid' 
                              ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/15'
                              : inv.payment_status === 'Overdue'
                              ? 'bg-rose-500/10 text-rose-400 border border-rose-500/15'
                              : 'bg-amber-500/10 text-amber-400 border border-amber-500/15'
                          }`}>
                            {inv.payment_status === 'Paid' ? <CheckCircle size={10} /> : <Clock size={10} />}
                            {inv.payment_status.toUpperCase()}
                          </span>
                        </td>
                      </tr>
                    );
                  })}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState 
            title="No matching invoices found"
            description="Adjust your search criteria or filters to display receivables records."
          />
        )}
        
      </div>
    </DashboardLayout>
  );
}
