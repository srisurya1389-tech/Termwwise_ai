import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight, Users, AlertTriangle, ShieldCheck, Zap, ArrowUpDown } from 'lucide-react';
import { api } from '../api/client';
import type { BuyerDetail } from '../types';
import DashboardLayout from '../components/DashboardLayout';
import RiskBadge from '../components/RiskBadge';
import EmptyState from '../components/EmptyState';
import LoadingSkeleton from '../components/LoadingSkeleton';

export default function Buyers() {
  const [loading, setLoading] = useState(true);
  const [buyers, setBuyers] = useState<BuyerDetail[]>([]);
  const [searchTerm, setSearchTerm] = useState('');
  const [riskFilter, setRiskFilter] = useState<'ALL' | 'LOW' | 'MEDIUM' | 'HIGH'>('ALL');
  const [sortBy, setSortBy] = useState<'outstanding' | 'days' | 'late' | 'name'>('outstanding');
  const [sortOrder, setSortOrder] = useState<'asc' | 'desc'>('desc');

  const navigate = useNavigate();

  useEffect(() => {
    async function loadData() {
      try {
        setLoading(true);
        const buyerList = await api.getBuyers();
        // Load details for all buyers
        const details = await Promise.all(
          buyerList.map((b) => api.getBuyer(b.id))
        );
        setBuyers(details);
      } catch (err) {
        console.error('Failed to load buyers', err);
      } finally {
        setLoading(false);
      }
    }
    loadData();
  }, []);

  if (loading) {
    return (
      <DashboardLayout pageTitle="Buyer Profiles">
        <LoadingSkeleton />
      </DashboardLayout>
    );
  }

  // Format currency
  const formatLakhs = (amount: number) => {
    const lakhs = amount / 100000;
    return `₹${lakhs.toFixed(2)}L`;
  };

  // High risk count & totals
  const highRiskCount = buyers.filter((b) => b.intelligence.risk_level === 'HIGH').length;
  const totalOutstanding = buyers.reduce((sum, b) => sum + (b.intelligence.outstanding_amount || 0), 0);
  const avgDays = buyers.length > 0 
    ? Math.round(buyers.reduce((sum, b) => sum + (b.intelligence.average_payment_days || 0), 0) / buyers.length)
    : 0;

  // Filter and sort buyers list
  const filteredBuyers = buyers
    .filter((b) => {
      const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
      const matchesRisk = riskFilter === 'ALL' || b.intelligence.risk_level === riskFilter;
      return matchesSearch && matchesRisk;
    })
    .sort((a, b) => {
      let comparison = 0;
      if (sortBy === 'outstanding') {
        comparison = (a.intelligence.outstanding_amount || 0) - (b.intelligence.outstanding_amount || 0);
      } else if (sortBy === 'days') {
        comparison = (a.intelligence.average_payment_days || 0) - (b.intelligence.average_payment_days || 0);
      } else if (sortBy === 'late') {
        comparison = (a.intelligence.late_payment_percentage || 0) - (b.intelligence.late_payment_percentage || 0);
      } else if (sortBy === 'name') {
        comparison = a.name.localeCompare(b.name);
      }
      return sortOrder === 'desc' ? -comparison : comparison;
    });

  const toggleSort = (col: 'outstanding' | 'days' | 'late' | 'name') => {
    if (sortBy === col) {
      setSortOrder(sortOrder === 'asc' ? 'desc' : 'asc');
    } else {
      setSortBy(col);
      setSortOrder('desc');
    }
  };

  return (
    <DashboardLayout pageTitle="Buyer Intelligence Profiles">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
          <div>
            <h2 className="text-xl font-bold text-white tracking-tight flex items-center gap-2">
              <Users size={20} className="text-purple-400" />
              Buyer Payment Intelligence Profiles
            </h2>
            <p className="text-xs text-gray-500 mt-0.5">
              Continuous empirical modeling of buyer payment speeds, delay ratios, and credit risk boundaries.
            </p>
          </div>
        </div>

        {/* Top Summary KPI Cards */}
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Tracked Accounts</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{buyers.length}</div>
            <div className="text-[10px] text-gray-400 mt-1 flex items-center gap-1">
              <ShieldCheck size={12} className="text-emerald-400" />
              <span>100% with empirical history</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">High Risk Accounts</div>
            <div className="text-2xl font-black text-rose-400 font-mono mt-1">{highRiskCount}</div>
            <div className="text-[10px] text-rose-400/80 mt-1 flex items-center gap-1">
              <AlertTriangle size={12} />
              <span>Requires proactive terms management</span>
            </div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Total Outstanding Exposure</div>
            <div className="text-2xl font-black text-white font-mono mt-1">{formatLakhs(totalOutstanding)}</div>
            <div className="text-[10px] text-gray-400 mt-1">Across all open receivable cycles</div>
          </div>

          <div className="p-4 rounded-2xl bg-[#0B0C14] border border-[#161726]">
            <div className="text-[10px] text-gray-500 font-bold uppercase tracking-wider">Average Portfolio DSO</div>
            <div className="text-2xl font-black text-purple-400 font-mono mt-1">{avgDays} Days</div>
            <div className="text-[10px] text-indigo-400 mt-1 flex items-center gap-1">
              <Zap size={12} />
              <span>Target benchmark: 45 Days</span>
            </div>
          </div>
        </div>

        {/* Filters and search toolbar */}
        <div className="p-4 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search by buyer name... (Press / for global search)"
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#12121A] border border-[#1C1D26] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500 transition"
            />
          </div>

          <div className="flex flex-wrap gap-2">
            {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const).map((r) => {
              const count = r === 'ALL' ? buyers.length : buyers.filter((b) => b.intelligence.risk_level === r).length;
              return (
                <button
                  key={r}
                  onClick={() => setRiskFilter(r)}
                  className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer flex items-center gap-1.5 ${
                    riskFilter === r
                      ? 'bg-purple-600 border-purple-500 text-white shadow-[0_2px_10px_rgba(168,85,247,0.2)]'
                      : 'bg-[#12121A] border-[#1C1D26] text-gray-400 hover:text-gray-200'
                  }`}
                >
                  <span>{r === 'ALL' ? 'ALL ACCOUNTS' : `${r} RISK`}</span>
                  <span className="px-1.5 py-0.2 rounded-full text-[10px] bg-black/40 font-mono">
                    {count}
                  </span>
                </button>
              );
            })}
          </div>
        </div>

        {/* Buyers table list */}
        {filteredBuyers.length > 0 ? (
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#161720] text-gray-500 pb-2">
                    <th 
                      onClick={() => toggleSort('name')}
                      className="py-2.5 font-bold cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center gap-1">
                        Buyer Company Name
                        <ArrowUpDown size={11} className={sortBy === 'name' ? 'text-purple-400' : 'text-gray-600'} />
                      </div>
                    </th>
                    <th className="py-2.5 font-bold text-center">Invoices</th>
                    <th 
                      onClick={() => toggleSort('days')}
                      className="py-2.5 font-bold text-center cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Avg. Payment Speed
                        <ArrowUpDown size={11} className={sortBy === 'days' ? 'text-purple-400' : 'text-gray-600'} />
                      </div>
                    </th>
                    <th 
                      onClick={() => toggleSort('late')}
                      className="py-2.5 font-bold text-center cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center justify-center gap-1">
                        Late Payment Rate
                        <ArrowUpDown size={11} className={sortBy === 'late' ? 'text-purple-400' : 'text-gray-600'} />
                      </div>
                    </th>
                    <th 
                      onClick={() => toggleSort('outstanding')}
                      className="py-2.5 font-bold cursor-pointer hover:text-white transition"
                    >
                      <div className="flex items-center gap-1">
                        Outstanding Liability
                        <ArrowUpDown size={11} className={sortBy === 'outstanding' ? 'text-purple-400' : 'text-gray-600'} />
                      </div>
                    </th>
                    <th className="py-2.5 font-bold text-center">Risk Level</th>
                    <th className="py-2.5 font-bold text-center">Confidence</th>
                    <th className="py-2.5 font-bold text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-[#12121A]">
                  {filteredBuyers.map((b) => (
                    <tr 
                      key={b.id}
                      id={b.name === "ABC Industries" ? "tour-buyer-profile" : undefined}
                      className="hover:bg-[#12121A]/60 cursor-pointer transition group"
                    >
                      <td 
                        onClick={() => navigate(`/buyers/${b.id}`)}
                        className="py-4 font-bold text-white group-hover:text-purple-300 transition"
                      >
                        {b.name}
                      </td>
                      <td 
                        onClick={() => navigate(`/buyers/${b.id}`)}
                        className="py-4 text-center text-gray-300 font-mono"
                      >
                        {b.intelligence.invoice_count} Invoices
                      </td>
                      <td 
                        onClick={() => navigate(`/buyers/${b.id}`)}
                        className="py-4 text-center text-gray-300 font-mono"
                      >
                        {b.intelligence.average_payment_days ? `${b.intelligence.average_payment_days.toFixed(0)} Days` : '—'}
                      </td>
                      <td 
                        onClick={() => navigate(`/buyers/${b.id}`)}
                        className="py-4 text-center font-mono"
                      >
                        <span className={b.intelligence.late_payment_percentage > 25 ? 'text-rose-400 font-bold' : 'text-gray-300'}>
                          {b.intelligence.late_payment_percentage ? `${b.intelligence.late_payment_percentage.toFixed(0)}%` : '0%'}
                        </span>
                      </td>
                      <td 
                        onClick={() => navigate(`/buyers/${b.id}`)}
                        className="py-4 font-bold text-white font-mono"
                      >
                        {formatLakhs(b.intelligence.outstanding_amount || 0)}
                      </td>
                      <td 
                        onClick={() => navigate(`/buyers/${b.id}`)}
                        className="py-4 text-center"
                      >
                        <RiskBadge level={b.intelligence.risk_level} />
                      </td>
                      <td 
                        onClick={() => navigate(`/buyers/${b.id}`)}
                        className="py-4 text-center"
                      >
                        <span className={`text-[10px] font-bold font-mono px-2 py-0.5 rounded-full ${
                          b.intelligence.confidence === 'HIGH' 
                            ? 'text-emerald-400 bg-emerald-500/10'
                            : b.intelligence.confidence === 'MEDIUM'
                            ? 'text-amber-400 bg-amber-500/10'
                            : 'text-rose-400 bg-rose-500/10'
                        }`}>
                          {b.intelligence.confidence || 'LOW'}
                        </span>
                      </td>
                      <td className="py-4 text-right">
                        <div className="flex items-center justify-end gap-2">
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/term-optimizer`);
                            }}
                            className="px-2.5 py-1 bg-[#12121A] hover:bg-[#1A1A28] border border-[#1E1F30] rounded-lg text-[10px] text-purple-300 font-semibold transition cursor-pointer"
                          >
                            Calibrate Terms
                          </button>
                          <button
                            onClick={(e) => {
                              e.stopPropagation();
                              navigate(`/buyers/${b.id}`);
                            }}
                            className="p-1 text-purple-400 hover:text-purple-300 cursor-pointer"
                          >
                            <ArrowUpRight size={15} />
                          </button>
                        </div>
                      </td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </div>
          </div>
        ) : (
          <EmptyState 
            title="No buyers match criteria"
            description="Try clearing search filters or changing risk criteria."
            actionLabel="Reset Filters"
            onAction={() => {
              setSearchTerm('');
              setRiskFilter('ALL');
            }}
          />
        )}

      </div>
    </DashboardLayout>
  );
}
