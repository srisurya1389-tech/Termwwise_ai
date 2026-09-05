import { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { Search, FileText, Users, CreditCard, Clock, ArrowRight } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Invoice, Buyer, CustomerInvoiceItem } from '../types';

interface GlobalSearchModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function GlobalSearchModal({ isOpen, onClose }: GlobalSearchModalProps) {
  const { role, user } = useAuth();
  const [query, setQuery] = useState('');
  const [invoices, setInvoices] = useState<any[]>([]);
  const [buyers, setBuyers] = useState<Buyer[]>([]);
  const [loading, setLoading] = useState(false);
  const inputRef = useRef<HTMLInputElement>(null);
  const navigate = useNavigate();

  useEffect(() => {
    if (isOpen) {
      setTimeout(() => inputRef.current?.focus(), 50);
    } else {
      setQuery('');
    }
  }, [isOpen]);

  useEffect(() => {
    if (!query.trim()) {
      setInvoices([]);
      setBuyers([]);
      return;
    }

    const timer = setTimeout(async () => {
      setLoading(true);
      try {
        if (role === 'ADMIN') {
          const [allInvs, allBuyers] = await Promise.all([
            api.getInvoices(),
            api.getBuyers(),
          ]);
          const q = query.toLowerCase();
          setInvoices(
            allInvs.filter(
              (i: Invoice) =>
                i.invoice_id.toLowerCase().includes(q) ||
                i.buyer_name.toLowerCase().includes(q)
            ).slice(0, 5)
          );
          setBuyers(
            allBuyers.filter((b: Buyer) => b.name.toLowerCase().includes(q)).slice(0, 4)
          );
        } else {
          const custInvs = await api.getCustomerInvoices(undefined, user?.email);
          const q = query.toLowerCase();
          setInvoices(
            custInvs.filter((i: CustomerInvoiceItem) =>
              i.invoice_id.toLowerCase().includes(q)
            ).slice(0, 6)
          );
        }
      } catch (err) {
        console.error('Search error', err);
      } finally {
        setLoading(false);
      }
    }, 150);

    return () => clearTimeout(timer);
  }, [query, role, user?.email]);

  const handleSelect = (path: string) => {
    onClose();
    navigate(path);
  };

  if (!isOpen) return null;

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center p-4 pt-20 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-2xl bg-[#0D101C] border border-[#202742] rounded-2xl shadow-2xl overflow-hidden z-10 text-left">
        {/* Search Input Bar */}
        <div className="flex items-center px-4 py-3.5 border-b border-[#1A2035] gap-3 bg-[#090C16]">
          <Search size={18} className="text-gray-400 shrink-0" />
          <input
            ref={inputRef}
            type="text"
            value={query}
            onChange={(e) => setQuery(e.target.value)}
            placeholder={
              role === 'ADMIN'
                ? "Type to search invoices, buyers, or navigation..."
                : "Type to search your billing invoices..."
            }
            className="flex-1 bg-transparent text-sm text-white placeholder-gray-500 focus:outline-none font-medium"
          />
          {query && (
            <button
              onClick={() => setQuery('')}
              className="text-gray-500 hover:text-gray-300 text-xs p-1"
            >
              Clear
            </button>
          )}
          <kbd className="hidden sm:inline-flex items-center gap-1 px-2 py-0.5 text-[10px] font-mono text-gray-400 bg-[#141A2E] border border-[#212A48] rounded">
            ESC
          </kbd>
        </div>

        {/* Results Container */}
        <div className="max-h-96 overflow-y-auto p-3 space-y-4">
          {loading && (
            <div className="py-8 text-center text-gray-500 text-xs flex items-center justify-center gap-2">
              <div className="w-4 h-4 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin" />
              Searching records...
            </div>
          )}

          {!loading && query && invoices.length === 0 && buyers.length === 0 && (
            <div className="py-8 text-center text-gray-500 text-xs">
              No matching records found for "{query}".
            </div>
          )}

          {!query && (
            <div className="py-6 px-3 text-left space-y-3">
              <div className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider">
                Quick Navigation
              </div>
              <div className="grid grid-cols-2 gap-2">
                {role === 'ADMIN' ? (
                  <>
                    <button
                      onClick={() => handleSelect('/receivables')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <FileText size={14} className="text-purple-400" />
                      <span>Receivables Ledger</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/action-center')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <Clock size={14} className="text-amber-400" />
                      <span>Action Center</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/cash-flow')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <CreditCard size={14} className="text-cyan-400" />
                      <span>Cash Flow Command</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/buyers')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <Users size={14} className="text-emerald-400" />
                      <span>Buyer Intelligence</span>
                    </button>
                  </>
                ) : (
                  <>
                    <button
                      onClick={() => handleSelect('/customer/invoices')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <FileText size={14} className="text-cyan-400" />
                      <span>My Invoices</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/customer/payments')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <CreditCard size={14} className="text-emerald-400" />
                      <span>Payment History</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/customer/requests')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <Clock size={14} className="text-purple-400" />
                      <span>Extension Requests</span>
                    </button>
                    <button
                      onClick={() => handleSelect('/customer/profile')}
                      className="p-2.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2540] text-xs text-gray-300 flex items-center gap-2 transition"
                    >
                      <Users size={14} className="text-blue-400" />
                      <span>Company Profile</span>
                    </button>
                  </>
                )}
              </div>
            </div>
          )}

          {/* Invoices List */}
          {invoices.length > 0 && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider px-2">
                Invoices ({invoices.length})
              </div>
              {invoices.map((inv) => {
                const targetUrl =
                  role === 'ADMIN'
                    ? `/receivables/${inv.invoice_id}`
                    : `/customer/invoices/${inv.invoice_id}`;
                return (
                  <button
                    key={inv.invoice_id}
                    onClick={() => handleSelect(targetUrl)}
                    className="w-full p-2.5 rounded-xl bg-[#121626]/50 hover:bg-[#1A2038] border border-transparent hover:border-cyan-500/30 flex items-center justify-between transition text-left group"
                  >
                    <div className="flex items-center gap-3">
                      <FileText size={15} className="text-cyan-400 shrink-0" />
                      <div>
                        <div className="text-xs font-bold text-white font-mono group-hover:text-cyan-300 transition">
                          {inv.invoice_id}
                        </div>
                        <div className="text-[11px] text-gray-400">
                          {inv.buyer_name || 'ABC Industries'} • Due: {inv.due_date}
                        </div>
                      </div>
                    </div>
                    <div className="text-right font-mono text-xs font-bold text-gray-200">
                      ₹{((inv.amount || 0) / 100000).toFixed(2)}L
                    </div>
                  </button>
                );
              })}
            </div>
          )}

          {/* Buyers List */}
          {buyers.length > 0 && role === 'ADMIN' && (
            <div className="space-y-1.5">
              <div className="text-[10px] font-mono font-bold text-gray-500 uppercase tracking-wider px-2">
                Buyers ({buyers.length})
              </div>
              {buyers.map((buyer) => (
                <button
                  key={buyer.id}
                  onClick={() => handleSelect(`/buyers/${buyer.id}`)}
                  className="w-full p-2.5 rounded-xl bg-[#121626]/50 hover:bg-[#1A2038] border border-transparent hover:border-purple-500/30 flex items-center justify-between transition text-left group"
                >
                  <div className="flex items-center gap-3">
                    <Users size={15} className="text-purple-400 shrink-0" />
                    <div>
                      <div className="text-xs font-bold text-white group-hover:text-purple-300 transition">
                        {buyer.name}
                      </div>
                      <div className="text-[11px] text-gray-400 font-mono">
                        Account #{buyer.id} • Registered Enterprise
                      </div>
                    </div>
                  </div>
                  <ArrowRight size={14} className="text-gray-500 group-hover:text-purple-400 transition" />
                </button>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
