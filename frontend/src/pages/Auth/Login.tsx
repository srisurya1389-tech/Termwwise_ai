import React, { useState } from 'react';
import { Link, useNavigate, useLocation } from 'react-router-dom';
import {
  Shield,
  Lock,
  Mail,
  ArrowRight,
  Sparkles,
  Building2,
  Users,
  AlertCircle
} from 'lucide-react';
import { useAuth } from '../../context/AuthContext';
import type { UserRole } from '../../types';

export default function Login() {
  const { login, loginAsAdmin, loginAsCustomer } = useAuth();
  const [selectedRole, setSelectedRole] = useState<UserRole>('ADMIN');
  const [email, setEmail] = useState('admin@novacraft.com');
  const [password, setPassword] = useState('password123');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const navigate = useNavigate();
  const location = useLocation();

  const handleRoleSelect = (role: UserRole) => {
    setSelectedRole(role);
    if (role === 'ADMIN') {
      setEmail('admin@novacraft.com');
    } else {
      setEmail('customer@abcindustries.com');
    }
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setError(null);
    setLoading(true);

    try {
      const profile = await login(email, password, selectedRole);
      const redirectPath = profile.role === 'ADMIN' ? '/dashboard' : '/customer/dashboard';
      const from = (location.state as any)?.from?.pathname || redirectPath;
      navigate(from, { replace: true });
    } catch (err: any) {
      setError(err.message || 'Login failed. Please check credentials.');
    } finally {
      setLoading(false);
    }
  };

  const handleQuickAdmin = async () => {
    setLoading(true);
    try {
      await loginAsAdmin();
      navigate('/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const handleQuickCustomer = async () => {
    setLoading(true);
    try {
      await loginAsCustomer();
      navigate('/customer/dashboard');
    } catch (err: any) {
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-[#06070B] text-gray-200 flex flex-col justify-center py-12 sm:px-6 lg:px-8 relative overflow-hidden">
      {/* Background glow effects */}
      <div className="absolute top-1/4 left-1/2 -translate-x-1/2 -translate-y-1/2 w-[600px] h-[600px] bg-gradient-to-tr from-purple-600/10 via-indigo-600/10 to-cyan-500/10 rounded-full blur-3xl pointer-events-none" />

      {/* Brand Header */}
      <div className="sm:mx-auto sm:w-full sm:max-w-md text-center z-10">
        <Link to="/" className="inline-flex items-center gap-3 mb-4 group">
          <div className="h-10 w-10 rounded-2xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-extrabold text-white text-base shadow-[0_0_25px_rgba(168,85,247,0.4)] group-hover:scale-105 transition">
            T
          </div>
          <span className="font-bold text-white text-xl tracking-wide">
            TERMWISE <span className="text-purple-400 text-sm font-mono font-normal">AI</span>
          </span>
        </Link>
        <h2 className="text-2xl font-black text-white tracking-tight">
          Sign in to your account
        </h2>
        <p className="mt-1 text-xs text-gray-400">
          "From uncertain receivables to predictable cash flow."
        </p>
      </div>

      <div className="mt-8 sm:mx-auto sm:w-full sm:max-w-md z-10 px-4 sm:px-0">
        <div className="bg-[#0C0E17] border border-[#1B1F32] py-8 px-6 sm:px-8 rounded-3xl shadow-2xl space-y-6">
          {/* Role Toggle Selector */}
          <div className="grid grid-cols-2 gap-2 p-1 bg-[#121524] rounded-2xl border border-[#1F253E]">
            <button
              type="button"
              onClick={() => handleRoleSelect('ADMIN')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedRole === 'ADMIN'
                  ? 'bg-purple-600 text-white shadow-lg shadow-purple-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Building2 size={15} />
              Admin Portal
            </button>

            <button
              type="button"
              onClick={() => handleRoleSelect('CUSTOMER')}
              className={`flex items-center justify-center gap-2 py-2.5 rounded-xl text-xs font-bold transition cursor-pointer ${
                selectedRole === 'CUSTOMER'
                  ? 'bg-cyan-600 text-white shadow-lg shadow-cyan-600/30'
                  : 'text-gray-400 hover:text-gray-200'
              }`}
            >
              <Users size={15} />
              Customer Portal
            </button>
          </div>

          {/* Quick Demo Access Bar */}
          <div className="p-3.5 bg-[#121422] border border-[#20253D] rounded-2xl space-y-2 text-left">
            <div className="flex items-center justify-between text-[11px] font-mono">
              <span className="text-purple-300 font-bold uppercase flex items-center gap-1.5">
                <Sparkles size={12} />
                Quick Demo 1-Click Login
              </span>
              <span className="text-gray-500 text-[10px]">Judges & Reviewers</span>
            </div>
            <div className="grid grid-cols-2 gap-2 pt-1">
              <button
                type="button"
                onClick={handleQuickAdmin}
                disabled={loading}
                className="py-2 px-3 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/40 text-purple-200 text-xs font-semibold rounded-xl transition text-center"
              >
                Admin (NovaCraft)
              </button>
              <button
                type="button"
                onClick={handleQuickCustomer}
                disabled={loading}
                className="py-2 px-3 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/40 text-cyan-200 text-xs font-semibold rounded-xl transition text-center"
              >
                Customer (ABC Ind.)
              </button>
            </div>
          </div>

          {error && (
            <div className="p-3 bg-rose-950/40 border border-rose-500/30 rounded-xl text-rose-300 text-xs flex items-center gap-2">
              <AlertCircle size={16} className="shrink-0" />
              <span>{error}</span>
            </div>
          )}

          {/* Standard Form */}
          <form onSubmit={handleSubmit} className="space-y-4 text-left">
            <div>
              <label className="block text-xs font-semibold text-gray-300 mb-1.5">
                Email Address
              </label>
              <div className="relative">
                <Mail size={15} className="absolute left-3.5 top-3 text-gray-500" />
                <input
                  type="email"
                  required
                  value={email}
                  onChange={(e) => setEmail(e.target.value)}
                  placeholder="name@company.com"
                  className="w-full bg-[#131626] border border-[#212742] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <div>
              <div className="flex items-center justify-between mb-1.5">
                <label className="block text-xs font-semibold text-gray-300">
                  Password
                </label>
                <Link
                  to="/forgot-password"
                  className="text-[11px] text-purple-400 hover:text-purple-300"
                >
                  Forgot password?
                </Link>
              </div>
              <div className="relative">
                <Lock size={15} className="absolute left-3.5 top-3 text-gray-500" />
                <input
                  type="password"
                  required
                  value={password}
                  onChange={(e) => setPassword(e.target.value)}
                  placeholder="••••••••"
                  className="w-full bg-[#131626] border border-[#212742] rounded-xl pl-10 pr-4 py-2.5 text-xs text-white placeholder-gray-500 focus:outline-none focus:border-purple-500"
                />
              </div>
            </div>

            <button
              type="submit"
              disabled={loading}
              className={`w-full py-3 px-4 rounded-xl text-xs font-bold text-white shadow-lg transition flex items-center justify-center gap-2 cursor-pointer ${
                selectedRole === 'ADMIN'
                  ? 'bg-gradient-to-r from-indigo-600 via-purple-600 to-pink-600 hover:opacity-90 shadow-purple-600/30'
                  : 'bg-gradient-to-r from-cyan-600 via-blue-600 to-indigo-600 hover:opacity-90 shadow-cyan-600/30'
              }`}
            >
              {loading ? (
                <span>Authenticating...</span>
              ) : (
                <>
                  <span>Sign in as {selectedRole === 'ADMIN' ? 'Supplier Admin' : 'Customer'}</span>
                  <ArrowRight size={14} />
                </>
              )}
            </button>
          </form>

          {/* Footer Auth Switch */}
          <div className="pt-2 border-t border-[#181C2E] text-center text-xs text-gray-400">
            Don't have an account?{' '}
            <Link to="/signup" className="text-purple-400 hover:text-purple-300 font-semibold">
              Create an account
            </Link>
          </div>
        </div>

        {/* Security / System Footer */}
        <div className="mt-6 text-center text-[11px] text-gray-500 space-y-1">
          <div className="flex items-center justify-center gap-1.5">
            <Shield size={12} className="text-emerald-400" />
            <span>Supabase RLS Protected • Dual Role Multi-Tenant System</span>
          </div>
        </div>
      </div>
    </div>
  );
}
