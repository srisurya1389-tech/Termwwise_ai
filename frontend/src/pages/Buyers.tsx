import { useEffect, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, ArrowUpRight } from 'lucide-react';
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

  // Filter buyers list
  const filteredBuyers = buyers.filter((b) => {
    const matchesSearch = b.name.toLowerCase().includes(searchTerm.toLowerCase());
    const matchesRisk = riskFilter === 'ALL' || b.intelligence.risk_level === riskFilter;
    return matchesSearch && matchesRisk;
  });

  return (
    <DashboardLayout pageTitle="Buyer payment Intelligence profiles">
      <div className="space-y-6 text-left">
        
        {/* Header Summary */}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Buyer Intelligence Profiles</h2>
          <p className="text-xs text-gray-500 mt-0.5">
            Audit historical payment speed, late ratios, outstanding liability, and predict payment behaviors.
          </p>
        </div>

        {/* Filters and search toolbar */}
        <div className="p-4 rounded-2xl bg-[#08080C] border border-[#15151F] flex flex-col md:flex-row gap-4 items-center justify-between">
          <div className="relative w-full md:w-80">
            <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
            <input
              type="text"
              placeholder="Search by buyer name..."
              value={searchTerm}
              onChange={(e) => setSearchTerm(e.target.value)}
              className="w-full bg-[#12121A] border border-[#1C1D26] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500"
            />
          </div>

          <div className="flex gap-2">
            {(['ALL', 'LOW', 'MEDIUM', 'HIGH'] as const).map((r) => (
              <button
                key={r}
                onClick={() => setRiskFilter(r)}
                className={`px-3 py-1.5 rounded-xl text-xs font-semibold border transition cursor-pointer ${
                  riskFilter === r
                    ? 'bg-purple-600 border-purple-500 text-white shadow-[0_2px_10px_rgba(168,85,247,0.2)]'
                    : 'bg-[#12121A] border-[#1C1D26] text-gray-400 hover:text-gray-200'
                }`}
              >
                {r === 'ALL' ? 'ALL RISKS' : `${r} RISK`}
              </button>
            ))}
          </div>
        </div>

        {/* Buyers table list */}
        {filteredBuyers.length > 0 ? (
          <div className="p-6 rounded-2xl bg-[#08080C] border border-[#15151F]">
            <div className="overflow-x-auto">
              <table className="w-full text-xs text-left">
                <thead>
                  <tr className="border-b border-[#161720] text-gray-500 pb-2">
                    <th className="py-2.5 font-bold">Buyer Company Name</th>
                    <th className="py-2.5 font-bold text-center">Invoices</th>
                    <th className="py-2.5 font-bold text-center">Avg. Payment Days</th>
                    <th className="py-2.5 font-bold text-center">Late Payment Rate</th>
                    <th className="py-2.5 font-bold">Outstanding Amount</th>
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
                      onClick={() => navigate(`/buyers/${b.id}`)}
                      className="hover:bg-[#12121A]/60 cursor-pointer transition"
                    >
                      <td className="py-4 font-bold text-white">{b.name}</td>
                      <td className="py-4 text-center text-gray-300 font-mono">{b.intelligence.invoice_count} Invoices</td>
                      <td className="py-4 text-center text-gray-300 font-mono">{b.intelligence.average_payment_days?.toFixed(0)} Days</td>
                      <td className="py-4 text-center font-mono">
                        <span className={b.intelligence.late_payment_percentage > 25 ? 'text-rose-400' : 'text-gray-300'}>
                          {b.intelligence.late_payment_percentage?.toFixed(0)}%
                        </span>
                      </td>
                      <td className="py-4 font-bold text-white font-mono">{formatLakhs(b.intelligence.outstanding_amount)}</td>
                      <td className="py-4 text-center">
                        <RiskBadge level={b.intelligence.risk_level} />
                      </td>
                      <td className="py-4 text-center">
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
                        <span className="text-purple-400 font-semibold flex items-center justify-end gap-1 hover:text-purple-300">
                          View Profile
                          <ArrowUpRight size={12} />
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
            title="No buyers matching filters"
            description="Adjust your search query or risk filters to view company profiles."
          />
        )}
        
      </div>
    </DashboardLayout>
  );
}
