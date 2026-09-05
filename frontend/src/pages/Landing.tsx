import { useNavigate } from 'react-router-dom';
import { ArrowRight, Sparkles, TrendingUp, ShieldCheck } from 'lucide-react';

export default function Landing() {
  const navigate = useNavigate();

  const handleEnterDemo = () => {
    navigate('/dashboard');
  };

  return (
    <div className="min-h-screen bg-[#050507] text-gray-200 flex flex-col justify-between relative overflow-hidden select-none">
      {/* Background Gradients */}
      <div className="absolute top-[-10%] left-[-10%] w-[50%] h-[50%] rounded-full bg-indigo-900/10 blur-[120px] pointer-events-none"></div>
      <div className="absolute bottom-[-10%] right-[-10%] w-[50%] h-[50%] rounded-full bg-purple-900/10 blur-[120px] pointer-events-none"></div>

      {/* Top Brand Header */}
      <header className="p-8 max-w-7xl mx-auto w-full flex items-center justify-between border-b border-[#13141C]/40 z-10">
        <div className="flex items-center gap-3">
          <div className="h-9 w-9 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-black text-white text-base shadow-[0_0_30px_rgba(168,85,247,0.3)]">
            T
          </div>
          <div>
            <span className="font-bold text-white tracking-wider text-base">TERMWISE</span>
            <span className="ml-1.5 text-xs text-purple-400 font-mono font-semibold">AI</span>
          </div>
        </div>
        <div className="flex items-center gap-1.5 px-3 py-1 bg-[#0F0F16] border border-[#1E1F29] rounded-full text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">
          HACKATHON DEMO BUILD
        </div>
      </header>

      {/* Hero Section */}
      <main className="flex-1 flex flex-col items-center justify-center px-6 max-w-4xl mx-auto w-full z-10 text-center space-y-8 py-16">
        {/* Pitch Badge */}
        <div className="inline-flex items-center gap-2 px-3.5 py-1.5 rounded-full bg-purple-950/20 border border-purple-500/20 text-purple-300 text-xs font-semibold">
          <Sparkles size={14} className="animate-pulse" />
          AI-Powered Cash-Flow Protection
        </div>

        {/* Title */}
        <div className="space-y-4">
          <h1 className="text-4xl sm:text-6xl font-black text-white tracking-tight leading-none">
            Turn Payment Uncertainty <br />
            <span className="bg-gradient-to-r from-indigo-400 via-purple-400 to-pink-400 bg-clip-text text-transparent">
              Into Predictable Cash Flow.
            </span>
          </h1>
          <p className="text-base sm:text-lg text-gray-400 max-w-2xl mx-auto leading-relaxed">
            TermWise helps SMEs understand buyer payment behaviors, forecast cash-flow gaps, optimize net terms, and orchestrate automated, polite negotiations.
          </p>
        </div>

        {/* Interactive Launcher Button */}
        <div>
          <button
            onClick={handleEnterDemo}
            className="group px-8 py-4 bg-gradient-to-r from-purple-600 to-indigo-600 hover:from-purple-500 hover:to-indigo-500 text-white rounded-2xl font-bold text-sm flex items-center gap-3 transition-all duration-300 shadow-[0_4px_30px_rgba(168,85,247,0.35)] hover:shadow-[0_4px_40px_rgba(168,85,247,0.5)] cursor-pointer"
          >
            Enter Demo Command Center
            <ArrowRight size={16} className="group-hover:translate-x-1.5 transition-transform" />
          </button>
          <div className="text-[10px] text-gray-500 font-mono mt-3.5 uppercase tracking-widest">
            NO CREDIT CARD REQUIRED • DEMO DATA LOADED
          </div>
        </div>

        {/* Core Value Props Grid */}
        <div className="grid grid-cols-1 md:grid-cols-3 gap-6 pt-12 text-left w-full">
          <div className="p-5 rounded-2xl bg-[#0B0B0F] border border-[#161720]/80">
            <TrendingUp className="text-purple-400 mb-3" size={20} />
            <h3 className="text-sm font-bold text-white mb-1.5">Cash Flow Forecasts</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Estimate arrival windows under optimistic, base, and pessimistic scenarios. Identify cash-flow gaps before they occur.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#0B0B0F] border border-[#161720]/80">
            <Sparkles className="text-purple-400 mb-3" size={20} />
            <h3 className="text-sm font-bold text-white mb-1.5">Term Optimizer</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Calculate tailored target, fallback, and maximum terms using percentile math and cash-gap requirements.
            </p>
          </div>
          <div className="p-5 rounded-2xl bg-[#0B0B0F] border border-[#161720]/80">
            <ShieldCheck className="text-purple-400 mb-3" size={20} />
            <h3 className="text-sm font-bold text-white mb-1.5">Negotiation Copilot</h3>
            <p className="text-xs text-gray-400 leading-relaxed">
              Generate strategies and polite messages. Analyze buyer responses with guardrails preventing self-approval.
            </p>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="p-8 text-center text-xs text-gray-600 border-t border-[#13141C]/40 z-10">
        © {new Date().getFullYear()} TermWise AI. Developed for SME Financial Security. All Demo calculations are statistical.
      </footer>
    </div>
  );
}
