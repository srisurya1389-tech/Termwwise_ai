import { useState, useEffect, type ReactNode } from 'react';
import { Link, useLocation, useNavigate } from 'react-router-dom';
import {
  LayoutDashboard,
  FileSpreadsheet,
  Users,
  LineChart,
  AlertTriangle,
  MessageSquare,
  Trophy,
  Lightbulb,
  Search,
  Menu,
  X,
  Database,
  ChevronLeft,
  ChevronRight,
  Bell,
  Zap,
  ClipboardList,
  LogOut,
  ArrowRightLeft,
  Sliders,
  Clock
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import { useToast } from '../context/ToastContext';
import type { RazorpayStatus } from '../types';
import WalkthroughTour from './WalkthroughTour';
import GlobalSearchModal from './GlobalSearchModal';
import NotificationDrawer from './NotificationDrawer';

interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle: string;
}

export default function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const toast = useToast();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('termwise_admin_sidebar_collapsed') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);

  const [resetting, setResetting] = useState(false);
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayStatus | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  const location = useLocation();
  const navigate = useNavigate();

  // Persist sidebar collapsed mode
  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('termwise_admin_sidebar_collapsed', String(next));
      return next;
    });
  };

  // Keyboard shortcut listener: "/" or "Ctrl+K" for search
  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.key === '/' || (e.ctrlKey && e.key.toLowerCase() === 'k')) && !['INPUT', 'TEXTAREA'].includes((e.target as HTMLElement).tagName)) {
        e.preventDefault();
        setSearchOpen(true);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    api.getRazorpayStatus().then(setRazorpayStatus).catch(() => {});
    api.getAdminRequests('PENDING').then((reqs) => setPendingRequestsCount(reqs.length)).catch(() => {});
  }, [location.pathname]);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await api.resetDemo();
      localStorage.removeItem('termwise_tour_step');
      toast.success('Demo Reset', 'Database reset to default SME demo state.');
      setTimeout(() => window.location.reload(), 600);
    } catch (err) {
      toast.error('Reset Failed', 'Unable to reset demo dataset.');
    } finally {
      setResetting(false);
    }
  };

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Action Center', path: '/action-center', icon: Clock, badge: pendingRequestsCount },
    { name: 'Receivables', path: '/receivables', icon: FileSpreadsheet },
    { name: 'Customers', path: '/buyers', icon: Users },
    { name: 'Cash Flow', path: '/cash-flow', icon: LineChart },
    { name: 'Risk & Priority', path: '/priorities', icon: AlertTriangle },
    { name: 'Term Optimizer', path: '/term-optimizer', icon: Sliders },
    { name: 'Negotiations', path: '/negotiations', icon: MessageSquare },
    { name: 'Customer Requests', path: '/admin/customer-requests', icon: ClipboardList, badge: pendingRequestsCount },
    { name: 'Outcomes', path: '/outcomes', icon: Trophy },
    { name: 'AI Insights', path: '/insights', icon: Lightbulb },
    { name: 'Integrations', path: '/settings/integrations', icon: Zap },
  ];

  return (
    <div className="min-h-screen bg-[#07090E] text-gray-200 flex flex-col md:flex-row">
      {/* Mobile Top Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0B0E17] border-b border-[#1A2035] z-50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-bold text-white text-xs shadow-md">
            TW
          </div>
          <span className="font-bold text-white text-sm tracking-wide">
            TERMWISE <span className="text-purple-400 text-xs font-mono font-normal">AI</span>
          </span>
        </div>
        <div className="flex items-center gap-2">
          <button
            onClick={() => setSearchOpen(true)}
            className="p-2 rounded-lg bg-[#141A2E] text-gray-400"
          >
            <Search size={16} />
          </button>
          <button
            onClick={() => setNotifsOpen(true)}
            className="p-2 rounded-lg bg-[#141A2E] text-gray-400 relative"
          >
            <Bell size={16} />
            {pendingRequestsCount > 0 && (
              <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
            )}
          </button>
          <button
            onClick={() => setMobileMenuOpen(!mobileMenuOpen)}
            className="p-2 text-gray-400 hover:text-white"
          >
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Desktop Sidebar */}
      <aside
        className={`hidden md:flex flex-col bg-[#090C16] border-r border-[#161D32] transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } shrink-0 relative select-none`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#161D32] flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-extrabold text-white text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)]">
                T
              </div>
              <div>
                <span className="font-bold text-white tracking-wide text-sm">TERMWISE</span>
                <div className="text-[9px] text-purple-400 font-mono tracking-wider font-semibold">
                  NOVACRAFT MFG
                </div>
              </div>
            </div>
          ) : (
            <div className="h-8 w-8 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-extrabold text-white text-sm">
              T
            </div>
          )}

          <button
            onClick={toggleSidebar}
            title={sidebarCollapsed ? 'Expand Sidebar' : 'Collapse Sidebar'}
            className="absolute -right-3 top-6 h-6 w-6 rounded-full bg-[#161D32] border border-[#263152] flex items-center justify-center text-gray-400 hover:text-white cursor-pointer z-30 transition-transform"
          >
            {sidebarCollapsed ? <ChevronRight size={13} /> : <ChevronLeft size={13} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-3 py-4 space-y-1 overflow-y-auto">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive =
              location.pathname === item.path ||
              (item.path !== '/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 group text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-950/50 to-indigo-950/30 text-purple-200 font-bold border-l-2 border-purple-500 pl-[12px]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#12172A]/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={17}
                    className={isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-200'}
                  />
                  {!sidebarCollapsed && <span>{item.name}</span>}
                </div>
                {!sidebarCollapsed && item.badge !== undefined && item.badge > 0 && (
                  <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full animate-pulse">
                    {item.badge}
                  </span>
                )}
              </Link>
            );
          })}
        </nav>

        {/* Bottom Section */}
        <div className="p-3.5 border-t border-[#161D32] space-y-2 bg-[#080B14]/60">
          {!sidebarCollapsed ? (
            razorpayStatus?.mode === 'LIVE' ? (
              <div className="p-2.5 bg-emerald-950/30 border border-emerald-900/40 rounded-xl flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0" />
                <div className="min-w-0 text-left">
                  <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase">RAZORPAY LIVE</div>
                  <div className="text-[9px] text-gray-400 truncate">Gateway sync active</div>
                </div>
              </div>
            ) : (
              <div className="p-2.5 bg-purple-950/20 border border-purple-900/40 rounded-xl flex items-center gap-2">
                <Database size={14} className="text-purple-400 shrink-0" />
                <div className="min-w-0 text-left">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase">DEMO MODE ACTIVE</div>
                  <div className="text-[9px] text-gray-400 truncate">Synthetic active SME profile</div>
                </div>
              </div>
            )
          ) : (
            <div
              className={`mx-auto h-8 w-8 rounded-lg flex items-center justify-center border ${
                razorpayStatus?.mode === 'LIVE'
                  ? 'bg-emerald-950/30 text-emerald-400 border-emerald-900/30'
                  : 'bg-purple-950/30 text-purple-400 border-purple-900/30'
              }`}
            >
              {razorpayStatus?.mode === 'LIVE' ? (
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse" />
              ) : (
                <Database size={14} />
              )}
            </div>
          )}

          {!sidebarCollapsed && (
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 pt-1">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                API Connected
              </span>
              <span className="text-[10px] font-mono">v1.2</span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex animate-fadeIn">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-64 bg-[#090C16] border-r border-[#161D32] h-full p-5 z-50 animate-slideInRight">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">
                  T
                </div>
                <span className="font-bold text-white text-sm">TERMWISE AI</span>
              </div>
              <button onClick={() => setMobileMenuOpen(false)} className="text-gray-400 hover:text-white">
                <X size={18} />
              </button>
            </div>
            <nav className="flex-1 space-y-1 overflow-y-auto">
              {navItems.map((item) => {
                const Icon = item.icon;
                const isActive = location.pathname.startsWith(item.path);
                return (
                  <Link
                    key={item.name}
                    to={item.path}
                    onClick={() => setMobileMenuOpen(false)}
                    className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition text-xs ${
                      isActive
                        ? 'bg-purple-950/40 text-purple-300 font-bold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-[#161D32] mt-auto space-y-2">
              <Link
                to="/customer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-cyan-950/40 hover:bg-cyan-900/50 border border-cyan-500/30 rounded-xl text-xs font-semibold text-cyan-300 transition"
              >
                <ArrowRightLeft size={13} />
                Switch to Customer View
              </Link>
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  logout().then(() => navigate('/login'));
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-red-950/20 hover:bg-red-900/30 border border-red-900/30 rounded-xl text-xs font-semibold text-red-400 transition"
              >
                <LogOut size={13} />
                Sign Out
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Main Content Pane */}
      <div className="flex-1 flex flex-col min-w-0 overflow-y-auto">
        {/* Persistent Banner */}
        <div className="bg-[#0D0B1A] border-b border-purple-500/20 py-2 px-6 flex items-center justify-between text-xs text-purple-300 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping shrink-0" />
            <span className="font-bold tracking-wider font-mono text-[10px]">ADMIN PORTAL</span>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <span className="truncate hidden sm:inline">
              Company: <strong className="text-white">NovaCraft Manufacturing</strong> • Logged in as:{' '}
              <strong className="text-purple-200">{user?.full_name || 'Admin'}</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <Link
              to="/customer/dashboard"
              className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 hover:text-white rounded-lg font-mono text-[10px] tracking-wider uppercase transition flex items-center gap-1.5"
            >
              <ArrowRightLeft size={11} />
              Customer View
            </Link>
            <button
              onClick={handleResetDemo}
              disabled={resetting}
              className="px-2.5 py-1 bg-purple-900 hover:bg-purple-800 disabled:opacity-50 text-white rounded-lg font-bold font-mono text-[9px] tracking-wider uppercase cursor-pointer transition shadow"
            >
              {resetting ? 'Resetting...' : 'Reset Demo'}
            </button>
          </div>
        </div>

        {/* Topbar */}
        <header className="h-16 border-b border-[#161D32] bg-[#090C16]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Global Search Button */}
            <button
              onClick={() => setSearchOpen(true)}
              className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2744] text-xs text-gray-400 hover:text-gray-200 transition duration-150 cursor-pointer"
            >
              <Search size={14} />
              <span className="hidden md:inline">Quick Search...</span>
              <kbd className="hidden md:inline px-1.5 py-0.2 bg-[#090C16] border border-[#1C233C] rounded text-[10px] font-mono text-gray-400">
                /
              </kbd>
            </button>

            {/* Notification Bell */}
            <button
              onClick={() => setNotifsOpen(true)}
              className="p-2 rounded-xl bg-[#121626] hover:bg-[#1A2036] border border-[#1E2744] text-gray-400 hover:text-gray-200 transition relative cursor-pointer"
            >
              <Bell size={15} />
              {pendingRequestsCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse" />
              )}
            </button>

            {/* User Profile Info */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#161D32]">
              <div className="h-8 w-8 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-xs shadow-inner">
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-white truncate max-w-[130px]">
                  {user?.full_name || 'Admin User'}
                </div>
                <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400" />
                  ADMIN ROLE
                </div>
              </div>
              <button
                onClick={() => logout().then(() => navigate('/login'))}
                title="Sign Out"
                className="p-1.5 ml-1 text-gray-400 hover:text-red-400 hover:bg-red-950/20 rounded-lg transition"
              >
                <LogOut size={15} />
              </button>
            </div>
          </div>
        </header>

        {/* Content Box */}
        <main className="flex-1 p-5 md:p-8">{children}</main>

        {/* Guided Walkthrough Tour Assistant overlay */}
        <WalkthroughTour />

        {/* Global Modals */}
        <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <NotificationDrawer isOpen={notifsOpen} onClose={() => setNotifsOpen(false)} />
      </div>
    </div>
  );
}
