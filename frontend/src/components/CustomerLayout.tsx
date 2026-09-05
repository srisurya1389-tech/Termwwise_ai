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
  ShieldCheck,
  Search,
  HelpCircle
} from 'lucide-react';
import { useAuth } from '../context/AuthContext';
import { api } from '../api/client';
import GlobalSearchModal from './GlobalSearchModal';
import NotificationDrawer from './NotificationDrawer';
import CustomerSupportModal from './CustomerSupportModal';

interface CustomerLayoutProps {
  children: ReactNode;
  pageTitle: string;
}

export default function CustomerLayout({ children, pageTitle }: CustomerLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState<boolean>(() => {
    return localStorage.getItem('termwise_customer_sidebar_collapsed') === 'true';
  });
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [unreadCount, setUnreadCount] = useState(0);
  const [pendingRequestsCount, setPendingRequestsCount] = useState(0);
  const [searchOpen, setSearchOpen] = useState(false);
  const [notifsOpen, setNotifsOpen] = useState(false);
  const [supportOpen, setSupportOpen] = useState(false);

  const location = useLocation();
  const navigate = useNavigate();

  const toggleSidebar = () => {
    setSidebarCollapsed((prev) => {
      const next = !prev;
      localStorage.setItem('termwise_customer_sidebar_collapsed', String(next));
      return next;
    });
  };

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
    const fetchCustomerMeta = async () => {
      try {
        const [notifs, reqs] = await Promise.all([
          api.getCustomerNotifications(user?.email),
          api.getCustomerRequests(user?.email),
        ]);
        setUnreadCount(notifs.filter((n) => !n.read).length);
        setPendingRequestsCount(
          reqs.filter((r) => r.status === 'PENDING' || r.status === 'COUNTEROFFER').length
        );
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
    <div className="min-h-screen bg-[#07090E] text-gray-200 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0B0E17] border-b border-[#1A2035] z-50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs shadow-md">
            CP
          </div>
          <div>
            <span className="font-bold text-white text-sm tracking-wide">CUSTOMER PORTAL</span>
            <div className="text-[9px] text-cyan-400 font-mono">ABC INDUSTRIES</div>
          </div>
        </div>
        <div className="flex items-center gap-2">
          <button onClick={() => setSearchOpen(true)} className="p-2 rounded-lg bg-[#141A2E] text-gray-400">
            <Search size={16} />
          </button>
          <button onClick={() => setNotifsOpen(true)} className="p-2 rounded-lg bg-[#141A2E] text-gray-400 relative">
            <Bell size={16} />
            {unreadCount > 0 && <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />}
          </button>
          <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white p-2">
            {mobileMenuOpen ? <X size={20} /> : <Menu size={20} />}
          </button>
        </div>
      </div>

      {/* Sidebar - Desktop */}
      <aside
        className={`hidden md:flex flex-col bg-[#090C16] border-r border-[#161D32] transition-all duration-300 ${
          sidebarCollapsed ? 'w-20' : 'w-64'
        } shrink-0 relative select-none`}
      >
        {/* Brand Header */}
        <div className="p-5 border-b border-[#161D32] flex items-center justify-between">
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
              (item.path !== '/customer/dashboard' && location.pathname.startsWith(item.path));
            return (
              <Link
                key={item.name}
                to={item.path}
                title={sidebarCollapsed ? item.name : undefined}
                className={`flex items-center justify-between px-3.5 py-2.5 rounded-xl transition-all duration-150 group text-xs ${
                  isActive
                    ? 'bg-gradient-to-r from-cyan-950/50 to-blue-950/30 text-cyan-200 font-bold border-l-2 border-cyan-400 pl-[12px]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#12172A]/70'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon
                    size={17}
                    className={isActive ? 'text-cyan-400' : 'text-gray-400 group-hover:text-gray-200'}
                  />
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

        {/* Support CTA & Supplier Box */}
        <div className="p-3.5 border-t border-[#161D32] space-y-2 bg-[#080B14]/60">
          {!sidebarCollapsed ? (
            <>
              <button
                onClick={() => setSupportOpen(true)}
                className="w-full py-2 px-3 bg-[#12172A] hover:bg-[#1A223E] border border-[#1E2744] text-xs font-semibold text-cyan-300 hover:text-cyan-200 rounded-xl transition flex items-center justify-center gap-2 cursor-pointer"
              >
                <HelpCircle size={14} />
                <span>Contact Supplier</span>
              </button>
              <div className="p-2.5 bg-cyan-950/20 border border-cyan-900/30 rounded-xl flex items-center gap-2">
                <ShieldCheck size={15} className="text-cyan-400 shrink-0" />
                <div className="min-w-0 text-left">
                  <div className="text-[10px] font-mono text-cyan-300 font-bold uppercase">SUPPLIER CONNECT</div>
                  <div className="text-[9px] text-gray-400 truncate">NovaCraft Manufacturing</div>
                </div>
              </div>
            </>
          ) : (
            <button
              onClick={() => setSupportOpen(true)}
              title="Contact Supplier Support"
              className="mx-auto h-8 w-8 rounded-lg flex items-center justify-center bg-cyan-950/30 text-cyan-400 border border-cyan-900/30 hover:bg-cyan-900/50 transition cursor-pointer"
            >
              <HelpCircle size={15} />
            </button>
          )}

          {!sidebarCollapsed && (
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-1 pt-1">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-400 animate-pulse" />
                Secure Portal
              </span>
              <span className="text-[10px] font-mono">RLS Active</span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex animate-fadeIn">
          <div className="fixed inset-0 bg-black/70" onClick={() => setMobileMenuOpen(false)} />
          <div className="relative flex flex-col w-64 bg-[#090C16] border-r border-[#161D32] h-full p-5 z-50 animate-slideInRight">
            <div className="flex items-center justify-between mb-6">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-cyan-500 to-blue-600 flex items-center justify-center font-bold text-white text-xs">
                  CP
                </div>
                <span className="font-bold text-white text-sm">CUSTOMER PORTAL</span>
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
                      isActive ? 'bg-cyan-950/40 text-cyan-300 font-bold' : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={16} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-cyan-500/20 text-cyan-300 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-[#161D32] mt-auto space-y-2">
              <button
                onClick={() => {
                  setMobileMenuOpen(false);
                  setSupportOpen(true);
                }}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-[#12172A] border border-[#1E2744] rounded-xl text-xs font-semibold text-cyan-300 transition"
              >
                <HelpCircle size={13} />
                Contact Supplier
              </button>
              <Link
                to="/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-purple-950/40 hover:bg-purple-900/50 border border-purple-500/30 rounded-xl text-xs font-semibold text-purple-300 transition"
              >
                <ArrowRightLeft size={13} />
                Switch to Admin View
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
        {/* Top Info Banner */}
        <div className="bg-[#091522] border-b border-cyan-500/20 py-2 px-6 flex items-center justify-between text-xs text-cyan-300 shrink-0">
          <div className="flex items-center gap-2 truncate">
            <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-ping shrink-0" />
            <span className="font-bold tracking-wider font-mono text-[10px]">CUSTOMER PORTAL</span>
            <span className="text-gray-600 hidden sm:inline">|</span>
            <span className="truncate hidden sm:inline">
              Buyer Account: <strong className="text-white">{user?.buyer_name || 'ABC Industries'}</strong> •
              Supplier: <strong className="text-cyan-200">NovaCraft Manufacturing</strong>
            </span>
          </div>
          <div className="flex items-center gap-2 shrink-0">
            <button
              onClick={() => setSupportOpen(true)}
              className="px-2.5 py-1 bg-cyan-950/60 hover:bg-cyan-900/80 border border-cyan-500/30 text-cyan-300 hover:text-white rounded-lg font-mono text-[10px] tracking-wider uppercase transition flex items-center gap-1.5 cursor-pointer"
            >
              <HelpCircle size={11} />
              Help Desk
            </button>
            <Link
              to="/dashboard"
              className="px-2.5 py-1 bg-purple-950/60 hover:bg-purple-900/80 border border-purple-500/30 text-purple-300 hover:text-white rounded-lg font-mono text-[10px] tracking-wider uppercase transition flex items-center gap-1.5"
            >
              <ArrowRightLeft size={11} />
              Admin View
            </Link>
          </div>
        </div>

        {/* Topbar */}
        <header className="h-16 border-b border-[#161D32] bg-[#090C16]/80 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-base sm:text-lg font-black text-white tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Quick Search */}
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
              {unreadCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-cyan-400 animate-pulse" />
              )}
            </button>

            {/* User Profile */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#161D32]">
              <div className="h-8 w-8 rounded-xl bg-cyan-950/60 border border-cyan-500/40 flex items-center justify-center text-cyan-300 font-bold text-xs shadow-inner">
                {user?.buyer_name ? user.buyer_name.slice(0, 2).toUpperCase() : 'CU'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-bold text-white truncate max-w-[140px]">
                  {user?.full_name || 'Customer User'}
                </div>
                <div className="text-[10px] text-cyan-400 font-mono flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-cyan-400" />
                  CUSTOMER ROLE
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

        {/* Content Body */}
        <main className="flex-1 p-5 md:p-8">{children}</main>

        {/* Modals */}
        <GlobalSearchModal isOpen={searchOpen} onClose={() => setSearchOpen(false)} />
        <NotificationDrawer isOpen={notifsOpen} onClose={() => setNotifsOpen(false)} />
        <CustomerSupportModal isOpen={supportOpen} onClose={() => setSupportOpen(false)} />
      </div>
    </div>
  );
}
