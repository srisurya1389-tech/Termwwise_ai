import { useState } from 'react';
import { HelpCircle, X, Building2 } from 'lucide-react';
import { useToast } from '../context/ToastContext';

interface CustomerSupportModalProps {
  isOpen: boolean;
  onClose: () => void;
  defaultInvoiceId?: string;
}

export default function CustomerSupportModal({
  isOpen,
  onClose,
  defaultInvoiceId,
}: CustomerSupportModalProps) {
  const toast = useToast();
  const [subject, setSubject] = useState('Payment Schedule Inquiry');
  const [invoiceId, setInvoiceId] = useState(defaultInvoiceId || '');
  const [message, setMessage] = useState('');
  const [submitting, setSubmitting] = useState(false);

  if (!isOpen) return null;

  const handleSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    setSubmitting(true);

    setTimeout(() => {
      setSubmitting(false);
      toast.success(
        'Inquiry Sent',
        'Your message has been sent to NovaCraft Manufacturing accounts payable desk.'
      );
      setMessage('');
      onClose();
    }, 600);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-lg bg-[#0D101C] border border-[#202742] rounded-2xl p-6 shadow-2xl space-y-5 text-left z-10">
        <div className="flex items-center justify-between border-b border-[#1A2035] pb-4">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-cyan-950/50 text-cyan-400 border border-cyan-500/20">
              <HelpCircle size={18} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Contact Supplier Support</h3>
              <p className="text-[11px] text-gray-400">NovaCraft Manufacturing Finance Desk</p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="text-gray-400 hover:text-white p-1 rounded-lg hover:bg-[#141A2E]"
          >
            <X size={16} />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="space-y-4">
          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Subject
            </label>
            <select
              value={subject}
              onChange={(e) => setSubject(e.target.value)}
              className="w-full bg-[#131626] border border-[#212742] rounded-xl px-3 py-2 text-xs text-white focus:outline-none focus:border-cyan-400"
            >
              <option value="Payment Schedule Inquiry">Payment Schedule Inquiry</option>
              <option value="Tax Invoice Statement Request">Tax Invoice Statement Request</option>
              <option value="Wire Transfer Confirmation">Wire Transfer Confirmation</option>
              <option value="Billing Discrepancy Clarification">Billing Discrepancy Clarification</option>
              <option value="Other Commercial Query">Other Commercial Query</option>
            </select>
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Invoice Reference (Optional)
            </label>
            <input
              type="text"
              placeholder="e.g. INV-101"
              value={invoiceId}
              onChange={(e) => setInvoiceId(e.target.value)}
              className="w-full bg-[#131626] border border-[#212742] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 font-mono focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div>
            <label className="block text-xs font-semibold text-gray-300 mb-1.5">
              Message
            </label>
            <textarea
              rows={4}
              required
              value={message}
              onChange={(e) => setMessage(e.target.value)}
              placeholder="Detail your inquiry or request regarding payment processing..."
              className="w-full bg-[#131626] border border-[#212742] rounded-xl px-3 py-2 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-cyan-400"
            />
          </div>

          <div className="p-3 bg-[#0A0E18] border border-[#161F34] rounded-xl text-[11px] text-gray-400 flex items-center gap-2">
            <Building2 size={15} className="text-cyan-400 shrink-0" />
            <span>
              Inquiries are routed directly to <strong className="text-white">finance@novacraft.com</strong>.
            </span>
          </div>

          <div className="pt-2 border-t border-[#1A2035] flex items-center justify-end gap-3">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 bg-[#131626] hover:bg-[#1A1F36] text-gray-300 text-xs font-semibold rounded-xl border border-[#212742] transition"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={submitting}
              className="px-5 py-2 bg-gradient-to-r from-cyan-500 to-blue-600 hover:from-cyan-400 hover:to-blue-500 disabled:opacity-50 text-slate-950 font-bold text-xs rounded-xl shadow-lg shadow-cyan-500/20 transition flex items-center gap-1.5"
            >
              {submitting ? 'Sending...' : 'Send Message'}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
