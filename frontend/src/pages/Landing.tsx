import { Link, useNavigate } from 'react-router-dom';
import {
  ArrowRight,
  Sparkles,
  Building2,
  Users,
  CheckCircle2,
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';

export default function Landing() {
  const navigate = useNavigate();
  const { loginAsAdmin, loginAsCustomer } = useAuth();

  const handleLaunchAdmin = async () => {
    try {
      await loginAsAdmin();
      navigate('/dashboard');
    } catch {
      navigate('/dashboard');
    }
  };

  const handleLaunchCustomer = async () => {
    try {
      await loginAsCustomer();
      navigate('/customer/dashboard');
    } catch {
      navigate('/customer/dashboard');
    }
  };

  const stages = [
    { num: '01', title: 'UNDERSTAND', desc: 'Behavioral payment profiling & buyer DSO stats' },
    { num: '02', title: 'PREDICT', desc: 'Monte Carlo & cash-flow gap forecasting' },
    { num: '03', title: 'PRIORITIZE', desc: 'Composite risk scoring & urgency rankings' },
    { num: '04', title: 'OPTIMIZE', desc: 'Target, fallback & maximum safe term math' },
    { num: '05', title: 'NEGOTIATE', desc: 'Human-in-the-loop AI negotiation copilot' },
    { num: '06', title: 'MEASURE', desc: 'DSO reduction, capital saved & audit trails' },
    { num: '07', title: 'LEARN', desc: 'Continuous buyer behavioral score updates' },
  ];

  return (
    <div className="min-h-screen bg-[#05060A] text-gray-200 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Dynamic Background Glows */}
      <div className="absolute top-[-10%] left-[-10%] w-[60%] h-[60%] rounded-full bg-indigo-900/15 blur-[140px] pointer-events-none" />
      <div className="absolute bottom-[-10%] right-[-10%] w-[60%] h-[60%] rounded-full bg-purple-900/15 blur-[140px] pointer-events-none" />
      <div className="absolute top-1/2 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[700px] h-[700px] bg-cyan-900/10 rounded-full blur-[160px] pointer-events-none" />

      {/* Top Brand Header */}
      <header className="p-6 md:p-8 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-[#141829]/60 z-10">
        <div className="flex items-center gap-3">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-base shadow-[0_0_30px_rgba(168,85,247,0.35)]">
            T
          </div>
          <div>
            <div className="flex items-center gap-2">
              <span className="font-bold text-white tracking-wider text-base">TERMWISE</span>
              <span className="text-xs text-purple-400 font-mono font-semibold">AI</span>
            </div>
            <div className="text-[10px] text-gray-400 hidden sm:block">Two-Role Financial Intelligence Platform</div>
          </div>
        </div>

        <div className="flex items-center gap-3">
          <Link
            to="/login"
            className="px-4 py-2 text-xs font-semibold text-gray-300 hover:text-white bg-[#0E1220] hover:bg-[#161C32] border border-[#1E2540] rounded-xl transition"
          >
            Sign In
          </Link>
          <Link
            to="/signup"
            className="px-4 py-2 text-xs font-bold text-white bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 rounded-xl shadow-lg shadow-purple-600/20 transition hidden sm:inline-flex"
          >
            Get Started
          </Link>
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-6xl mx-auto w-full z-10 text-center space-y-10 py-12 md:py-16">
        {/* Pitch Badge */}
        <div className="inline-flex items-center gap-2 px-4 py-1.5 rounded-full bg-gradient-to-r from-purple-950/40 to-cyan-950/40 border border-purple-500/30 text-purple-300 text-xs font-semibold shadow-inner">
          <Sparkles size={14} className="animate-pulse text-cyan-400" />
          <span>AI-Powered Working Capital & Payment Term Intelligence</span>
        </div>

        {/* Title & Tagline */}
        <div className="space-y-4 max-w-4xl mx-auto">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-tight">
            From Uncertain Receivables <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              To Predictable Cash Flow.
            </span>
          </h1>
          <p className="text-sm sm:text-base text-gray-400 max-w-2xl mx-auto leading-relaxed">
            A comprehensive dual-role platform built for SMEs and their corporate buyers. Understand behavioral payment patterns, predict cash-flow gaps, optimize net terms, and empower transparent collaborative extensions.
          </p>
        </div>

        {/* Dual Role Selector Cards (Admin vs Customer) */}
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6 w-full text-left pt-4">
          {/* Admin Portal Card */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[#110E24] to-[#0A0914] border border-purple-500/40 hover:border-purple-400/70 transition-all duration-300 shadow-2xl relative overflow-hidden group flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-purple-950/50 border border-purple-500/30 text-purple-400">
                  <Building2 size={24} />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-purple-950/80 text-purple-300 border border-purple-800/40">
                  SUPPLIER SME VIEW
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white group-hover:text-purple-300 transition">
                  Admin Portal
                </h3>
                <div className="text-xs text-purple-400 font-mono font-semibold mt-0.5">
                  NovaCraft Manufacturing (Supplier)
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Full control center for receivables management, cash-flow forecasting, risk scoring, AI term optimization, response analysis, and reviewing buyer extension requests.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#1F1B36]">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                  <span>3-Scenario Cash Flow Forecasting</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                  <span>AI Negotiation Copilot & Response Classifier</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 size={14} className="text-purple-400 shrink-0" />
                  <span>Live Payment Reconciliations & Audit Logs</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunchAdmin}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-purple-600 via-indigo-600 to-pink-600 hover:opacity-90 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-purple-600/30 transition cursor-pointer"
            >
              <span>Launch Admin Portal</span>
              <ArrowRight size={14} />
            </button>
          </div>

          {/* Customer Portal Card */}
          <div className="p-7 rounded-3xl bg-gradient-to-b from-[#0B1524] to-[#070D18] border border-cyan-500/40 hover:border-cyan-400/70 transition-all duration-300 shadow-2xl relative overflow-hidden group flex flex-col justify-between space-y-6">
            <div className="space-y-4">
              <div className="flex items-center justify-between">
                <div className="p-3 rounded-2xl bg-cyan-950/50 border border-cyan-500/30 text-cyan-400">
                  <Users size={24} />
                </div>
                <span className="px-3 py-1 rounded-full text-[10px] font-mono font-bold uppercase tracking-wider bg-cyan-950/80 text-cyan-300 border border-cyan-800/40">
                  BUYER CLIENT VIEW
                </span>
              </div>

              <div>
                <h3 className="text-xl font-black text-white group-hover:text-cyan-300 transition">
                  Customer Portal
                </h3>
                <div className="text-xs text-cyan-400 font-mono font-semibold mt-0.5">
                  ABC Industries (Corporate Buyer)
                </div>
                <p className="text-xs text-gray-400 mt-2 leading-relaxed">
                  Transparent, isolated customer interface to view open invoices, verified payment history, submit extension requests (*"Need more time to pay?"*), and accept counteroffers.
                </p>
              </div>

              <div className="space-y-2 pt-2 border-t border-[#15233D]">
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                  <span>Invoice Billing Statements & Settlement Receipts</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                  <span>Submit Payment Extension Requests in 1 Click</span>
                </div>
                <div className="flex items-center gap-2 text-xs text-gray-300">
                  <CheckCircle2 size={14} className="text-cyan-400 shrink-0" />
                  <span>Zero Internal Risk Leak (RLS Privacy Enforced)</span>
                </div>
              </div>
            </div>

            <button
              onClick={handleLaunchCustomer}
              className="w-full py-3.5 px-5 bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:opacity-90 text-white rounded-2xl font-bold text-xs flex items-center justify-center gap-2 shadow-lg shadow-cyan-600/30 transition cursor-pointer"
            >
              <span>Launch Customer Portal</span>
              <ArrowRight size={14} />
            </button>
          </div>
        </div>

        {/* 7-Stage Intelligence Pipeline */}
        <div className="w-full pt-10 text-left space-y-4">
          <div className="text-center">
            <h3 className="text-xs font-mono uppercase tracking-widest text-purple-400 font-bold">
              The 7-Stage Intelligence Loop
            </h3>
            <p className="text-xs text-gray-400 mt-1">End-to-end receivables optimization workflow</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-7 gap-3">
            {stages.map((st) => (
              <div
                key={st.num}
                className="p-3.5 bg-[#0A0D18] border border-[#171E33] rounded-2xl space-y-1.5 hover:border-purple-500/40 transition"
              >
                <div className="text-[10px] font-mono font-bold text-purple-400">{st.num}</div>
                <div className="text-xs font-bold text-white tracking-wide">{st.title}</div>
                <div className="text-[10px] text-gray-400 leading-normal">{st.desc}</div>
              </div>
            ))}
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-6 md:p-8 text-center text-xs text-gray-500 border-t border-[#141829]/60 z-10 flex flex-col sm:flex-row items-center justify-between gap-4 max-w-7xl mx-auto w-full">
        <div>
          © {new Date().getFullYear()} TermWise AI. Multi-Tenant SME Financial Intelligence.
        </div>
        <div className="flex items-center gap-4 text-[11px] font-mono text-gray-400">
          <span>Supabase Auth & RLS</span>
          <span>•</span>
          <span>FastAPI + SQLite Engine</span>
          <span>•</span>
          <span>React + Vite</span>
        </div>
      </footer>
    </div>
  );
}
