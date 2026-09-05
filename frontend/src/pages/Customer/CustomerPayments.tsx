import { useState, useEffect } from 'react';
import {
  Search,
  Receipt,
  Download,
  ShieldCheck
} from 'lucide-react';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { CustomerPaymentItem } from '../../types';

export default function CustomerPayments() {
  const { user } = useAuth();
  const [payments, setPayments] = useState<CustomerPaymentItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [searchQuery, setSearchQuery] = useState('');

  useEffect(() => {
    const loadPayments = async () => {
      try {
        setLoading(true);
        const res = await api.getCustomerPayments(user?.email);
        setPayments(res);
      } catch (err) {
        console.error('Failed to load payments', err);
      } finally {
        setLoading(false);
      }
    };
    loadPayments();
  }, [user?.email]);

  const totalPaid = payments.reduce((acc, p) => acc + p.amount, 0);

  const filteredPayments = payments.filter(
    (p) =>
      p.payment_id.toLowerCase().includes(searchQuery.toLowerCase()) ||
      p.invoice_id.toLowerCase().includes(searchQuery.toLowerCase())
  );

  return (
    <CustomerLayout pageTitle="Payment History & Receipts">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Payment Receipts & History</h2>
          <p className="text-xs text-gray-400">
            Verified financial receipts for payments made to NovaCraft Manufacturing.
          </p>
        </div>

        <div className="flex items-center gap-3">
          <div className="relative">
            <Search size={14} className="absolute left-3 top-3 text-gray-500" />
            <input
              type="text"
              placeholder="Search payment or invoice ID..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="bg-[#0D111E] border border-[#1C233C] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 placeholder-gray-500 focus:outline-none focus:border-cyan-500"
            />
          </div>
        </div>
      </div>

      {/* Stats Summary */}
      <div className="grid grid-cols-1 sm:grid-cols-3 gap-5 mb-8">
        <div className="p-5 bg-[#0C101E] border border-[#1A223A] rounded-2xl">
          <div className="text-xs text-gray-400 uppercase font-medium">Total Settlements Verified</div>
          <div className="text-2xl font-black font-mono text-emerald-400 mt-1">
            ₹{(totalPaid / 100000).toFixed(2)} Lakhs
          </div>
          <div className="text-xs text-emerald-500/80 mt-1 flex items-center gap-1">
            <ShieldCheck size={13} />
            <span>100% reconciled across accounts</span>
          </div>
        </div>

        <div className="p-5 bg-[#0C101E] border border-[#1A223A] rounded-2xl">
          <div className="text-xs text-gray-400 uppercase font-medium">Completed Transactions</div>
          <div className="text-2xl font-black font-mono text-white mt-1">
            {payments.length}
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Successful payment cycles
          </div>
        </div>

        <div className="p-5 bg-[#0C101E] border border-[#1A223A] rounded-2xl">
          <div className="text-xs text-gray-400 uppercase font-medium">Settlement Partner</div>
          <div className="text-base font-bold text-cyan-300 mt-1">
            NovaCraft Manufacturing
          </div>
          <div className="text-xs text-gray-400 mt-1">
            Corporate Vendor Account
          </div>
        </div>
      </div>

      {/* Payments Table */}
      <div className="bg-[#0A0D18] border border-[#182038] rounded-2xl overflow-hidden shadow-xl">
        <div className="overflow-x-auto">
          <table className="w-full text-left text-xs text-gray-300">
            <thead className="bg-[#0E1322] border-b border-[#182038] text-[11px] uppercase tracking-wider text-gray-400 font-mono">
              <tr>
                <th className="py-3.5 px-5">Receipt ID</th>
                <th className="py-3.5 px-4">Invoice ID</th>
                <th className="py-3.5 px-4">Payment Date</th>
                <th className="py-3.5 px-4 text-right">Settled Amount</th>
                <th className="py-3.5 px-4">Channel / Source</th>
                <th className="py-3.5 px-4 text-center">Status</th>
                <th className="py-3.5 px-5 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-[#141B30]">
              {loading ? (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
                    Loading payment records...
                  </td>
                </tr>
              ) : filteredPayments.length > 0 ? (
                filteredPayments.map((pmt) => (
                  <tr key={pmt.payment_id} className="hover:bg-[#10162A] transition">
                    <td className="py-4 px-5 font-mono font-bold text-white flex items-center gap-2">
                      <Receipt size={14} className="text-cyan-400" />
                      {pmt.payment_id}
                    </td>
                    <td className="py-4 px-4 font-mono text-cyan-300 font-semibold">
                      {pmt.invoice_id}
                    </td>
                    <td className="py-4 px-4 font-mono text-gray-300">
                      {pmt.payment_date}
                    </td>
                    <td className="py-4 px-4 text-right font-mono font-bold text-emerald-400">
                      +₹{(pmt.amount / 100000).toFixed(2)}L
                    </td>
                    <td className="py-4 px-4 uppercase font-mono text-gray-400">
                      {pmt.source}
                    </td>
                    <td className="py-4 px-4 text-center">
                      <span className="inline-flex items-center px-2.5 py-0.5 rounded-full text-[10px] font-bold uppercase bg-emerald-950/50 text-emerald-300 border border-emerald-800/40">
                        {pmt.status}
                      </span>
                    </td>
                    <td className="py-4 px-5 text-right">
                      <button
                        onClick={() => alert(`Official Receipt for ${pmt.payment_id}:\n\nInvoice: ${pmt.invoice_id}\nAmount: ₹${pmt.amount.toLocaleString('en-IN')}\nStatus: ${pmt.status}\nDate: ${pmt.payment_date}\nBeneficiary: NovaCraft Manufacturing`)}
                        className="inline-flex items-center gap-1 px-2.5 py-1 bg-[#141A2E] hover:bg-[#1E2644] text-gray-300 hover:text-white rounded-lg border border-[#222B48] transition text-xs"
                      >
                        <Download size={12} />
                        Receipt
                      </button>
                    </td>
                  </tr>
                ))
              ) : (
                <tr>
                  <td colSpan={7} className="text-center py-12 text-gray-500">
                    No payment records match your search.
                  </td>
                </tr>
              )}
            </tbody>
          </table>
        </div>
      </div>
    </CustomerLayout>
  );
}
