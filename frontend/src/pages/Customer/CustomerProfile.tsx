import {
  Building2,
  ShieldCheck,
  User,
  Mail,
  Phone,
  MapPin,
  FileCheck,
  Lock,
  Globe
} from 'lucide-react';
import CustomerLayout from '../../components/CustomerLayout';
import { useAuth } from '../../context/AuthContext';

export default function CustomerProfile() {
  const { user, isSupabaseActive } = useAuth();

  return (
    <CustomerLayout pageTitle="Company Profile & Security">
      <div className="max-w-4xl space-y-8">
        {/* Header */}
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Buyer Profile & Commercial Terms</h2>
          <p className="text-xs text-gray-400">
            Account identity, commercial credentials, and Row-Level Security verification.
          </p>
        </div>

        {/* Company Card */}
        <div className="p-6 bg-[#0A0D18] border border-[#182038] rounded-2xl space-y-6 shadow-xl">
          <div className="flex items-center gap-4 border-b border-[#141B30] pb-5">
            <div className="h-14 w-14 rounded-2xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-black text-white text-xl shadow-lg shadow-cyan-500/20">
              ABC
            </div>
            <div>
              <h3 className="text-lg font-bold text-white">
                {user?.buyer_name || 'ABC Industries Private Limited'}
              </h3>
              <p className="text-xs text-cyan-400 font-mono">
                Verified Industrial Buyer • Tier 1 Client
              </p>
            </div>
          </div>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-6 text-xs">
            <div className="space-y-4">
              <div className="flex items-start gap-3 text-gray-300">
                <Building2 size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[11px]">Corporate Entity</div>
                  <div className="font-semibold text-white">ABC Industries Pvt. Ltd.</div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <FileCheck size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[11px]">GSTIN Registration</div>
                  <div className="font-mono text-cyan-300 font-bold">29AABCA1234F1Z8</div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <MapPin size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[11px]">Registered Billing Address</div>
                  <div>Plot 42, Industrial Area Phase II, Peenya, Bengaluru, Karnataka 560058</div>
                </div>
              </div>
            </div>

            <div className="space-y-4">
              <div className="flex items-start gap-3 text-gray-300">
                <Mail size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[11px]">Accounts Payable Email</div>
                  <div className="font-mono text-white">{user?.email || 'customer@abcindustries.com'}</div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <Phone size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[11px]">Finance Contact</div>
                  <div>+91 (80) 4129-8890 (Ext: 402)</div>
                </div>
              </div>

              <div className="flex items-start gap-3 text-gray-300">
                <Globe size={16} className="text-gray-500 mt-0.5" />
                <div>
                  <div className="text-gray-500 text-[11px]">Supplier Partnership</div>
                  <div className="text-white font-semibold">NovaCraft Manufacturing</div>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* User Session & Security Details */}
        <div className="p-6 bg-[#0A0D18] border border-[#182038] rounded-2xl space-y-4 shadow-xl">
          <h3 className="text-sm font-bold text-white flex items-center gap-2">
            <Lock size={16} className="text-cyan-400" />
            Security & Data Isolation (Row-Level Security)
          </h3>

          <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-xs">
            <div className="p-4 bg-[#0E1322] border border-[#192138] rounded-xl space-y-2">
              <div className="text-gray-400 font-semibold">Row-Level Security (RLS)</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                All database queries and API endpoints are strictly scoped to <strong className="text-white">ABC Industries (buyer_id: 1)</strong>.
                Internal risk analytics, priority rankings, and supplier margins are isolated and never exposed.
              </p>
              <div className="flex items-center gap-1.5 text-emerald-400 font-mono text-[11px] font-bold">
                <ShieldCheck size={14} />
                RLS ACTIVE & ENFORCED
              </div>
            </div>

            <div className="p-4 bg-[#0E1322] border border-[#192138] rounded-xl space-y-2">
              <div className="text-gray-400 font-semibold">Authentication Engine</div>
              <p className="text-gray-400 text-[11px] leading-relaxed">
                {isSupabaseActive
                  ? 'Authenticated via Supabase Auth with JWT and PostgreSQL Row-Level Security policies.'
                  : 'Operating in Demo Authentication Mode with automatic offline session storage.'}
              </p>
              <div className="flex items-center gap-1.5 text-cyan-400 font-mono text-[11px] font-bold">
                <User size={14} />
                ROLE: {user?.role || 'CUSTOMER'}
              </div>
            </div>
          </div>
        </div>
      </div>
    </CustomerLayout>
  );
}
