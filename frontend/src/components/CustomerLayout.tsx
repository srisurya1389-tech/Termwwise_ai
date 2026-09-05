import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileText,
  CreditCard,
  Clock,
  Bell,
  Building2,
  Menu,
  X,
  LogOut,
  ChevronLeft,
  ChevronRight,
  ArrowRightLeft,
  ShieldCheck
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';

interface CustomerLayoutProps {
  children: ReactNode;
  pageTitle: string;
}

export default function CustomerLayout({ children, pageTitle }: CustomerLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    const fetchCustomerMeta = async () => {
      try {
        const [notifs, reqs] = await Promise.all([
          api.getCustomerNotifications(user?.email),
          api.getCustomerRequests(user?.email),
        ]);
        setUnreadCount(notifs.filter(n => !n.read).length);
        setPendingRequestsCount(reqs.filter(r => r.status === 'PENDING' || r.status === 'COUNTEROFFER').length);
      } catch (err) {
        console.error('Failed to load customer layout metadata', err);
      }
    };
    fetchCustomerMeta();
  }, [user?.email, location.pathname]);

  const navItems = [
    { name: 'Dashboard', path: '/customer/dashboard', icon: LayoutDashboard },
    { name: 'Invoices', path: '/customer/invoices', icon: FileText },
    { name: 'Payment History', path: '/customer/payments', icon: CreditCard },
    { name: 'Payment Requests', path: '/customer/requests', icon: Clock, badge: pendingRequestsCount },
    { name: 'Notifications', path: '/customer/notifications', icon: Bell, badge: unreadCount },
    { name: 'Company Profile', path: '/customer/profile', icon: Building2 },
  ];

  return (
    <div className="min-h-screen bg-[#07080D] text-gray-200 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0B0D14] border-b border-[#1A1D2C] z-50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
            CP
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-wide">CUSTOMER PORTAL</span>
            <div className="text-[9px] text-cyan-400 font-mono">ABC INDUSTRIES</div>
          </div>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-[#0A0C14] border-r border-[#151928] transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } shrink-0 relative`}
      >
        {/* Brand Header */}
        <div className="p-6 border-b border-[#151928] flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-cyan-500 via-blue-600 to-indigo-600 flex items-center justify-center font-extrabold text-white text-sm shadow-[0_0_20px_rgba(6,182,212,0.35)]">
                C
              </div>
              <div>
                <span className="font-bold text-white tracking-wide text-sm">CUSTOMER PORTAL</span>
                <div className="text-[9px] text-cyan-400 font-mono tracking-wider font-semibold">
                  {user?.buyer_name || 'ABC INDUSTRIES'}
                </div>
              </div>
            </div>
          ) : (
            <div className="h-8 w-8 mx-auto rounded-xl bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-extrabold text-white text-sm">
              C
            </div>
          )}

          <button
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-7 h-6 w-6 rounded-full bg-[#151928] border border-[#242A42] flex items-center justify-center text-gray-400 hover:text-white cursor-pointer z-30 transition-transform"
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname === item.path || (item.path !== '/customer/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/40 to-blue-950/20 text-cyan-300 font-medium border-l-2 border-cyan-400 pl-[14px]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#121626]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-200'} />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </div>
                {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Vendor Status Box */}
        <div className="p-4 border-t border-[#151928] space-y-3 bg-[#080A10]/50">
          {!sidebarCollapsed ? (
            <div className="p-3 bg-cyan-950/20 border border-cyan-900/30 rounded-xl flex items-center gap-2.5">
              <ShieldCheck size={16} className="text-cyan-400 shrink-0" />
              <div className="min-w-0">
                <div className="text-[10px] font-mono text-cyan-300 font-bold uppercase tracking-wider">SUPPLIER CONNECT</div>
                <div className="text-[9px] text-gray-400 truncate">NovaCraft Manufacturing</div>
              </div>
            </div>
          ) : (
            <div className="mx-auto h-8 w-8 rounded-lg flex items-center justify-center bg-cyan-950/30 text-cyan-400 border border-cyan-900/30">
              <ShieldCheck size={16} />
            </div>
          )}

          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-2">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse"></span>
                Secure Portal
              </span>
              <span className="text-[10px] font-mono">RLS Enabled</span>
            </div>
          ) : (
            <div className="flex justify-center" title="RLS Protected">
              <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-64 bg-[#0A0C14] border-r border-[#151928] h-full p-6 z-50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  CP
                </div>
                <span className="font-bold text-white text-sm">CUSTOMER PORTAL</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X size={20} />
              </button>
            </div>
            <nav className="flex-1 space-y-1">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 text-sm ${
                      isActive ? 'bg-cyan-950/40 text-cyan-300 font-semibold' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 border border-cyan-500/30 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-[#151928] mt-auto space-y-2">
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-300 transition"
              >
                <ArrowRightLeft size={14} />
                Switch to Admin Portal
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout().then(() => navigate('/login'));
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 rounded-xl text-xs font-semibold text-red-400 transition"
              >
                <LogOut size={14} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Top Info Banner */}
        <div className="bg-[#091522] border-b border-cyan-500/20 py-2 px-6 flex items-center justify-between text-xs text-cyan-300 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping"></span>
            <span className="font-bold tracking-wider font-mono text-[10px]">CUSTOMER PORTAL</span>
            <span className="text-gray-600">|</span>
            <span>Buyer Account: <strong className="text-white">{user?.buyer_name || 'ABC Industries'}</strong> • Supplier: <strong className="text-cyan-200">NovaCraft Manufacturing</strong></span>
          </div>
          <div className="flex items-center gap-3">
            <Link
              to="/dashboard"
              className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-purple-300 hover:text-white rounded-lg font-mono text-[10px] tracking-wider uppercase transition flex items-center gap-1.5"
            >
              <ArrowRightLeft size={11} />
              Admin Portal
            </Link>
          </div>
        </div>

        {/* Topbar */}
        <header className="h-16 border-b border-[#151928] bg-[#0A0C14]/70 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Notification Bell */}
            <Link
              to="/customer/notifications"
              className="p-2 rounded-xl bg-[#111422] hover:bg-[#181D30] border border-[#1A2036] text-gray-400 hover:text-gray-200 transition relative"
            >
              <Bell size={16} />
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-400 animate-pulse"></span>
              )}
            </Link>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#151928]">
              <div className="h-8 w-8 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs shadow-inner">
                {user?.buyer_name ? user.buyer_name.slice(0, 2).toUpperCase() : 'CU'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-white truncate max-w-[140px]">
                  {user?.full_name || 'Customer User'}
                </div>
                <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400"></span>
                  CUSTOMER ROLE
                </div>
              </div>
              <button
                onClick={() => logout().then(() => navigate('/login'))}
                title="Sign Out"
                className="p-1.5 ml-1 text-gray-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition"
              >
                <LogOut size={16} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Body */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
      </div>
    </div>
  );
}
