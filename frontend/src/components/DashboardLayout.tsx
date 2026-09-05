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
  ArrowRightLeft
} from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { Invoice, Buyer, RazorpayStatus } from '../types';
import WalkthroughTour from './WalkthroughTour';


interface DashboardLayoutProps {
  children: ReactNode;
  pageTitle: string;
}

export default function DashboardLayout({ children, pageTitle }: DashboardLayoutProps) {
  const { user, logout } = useAuth();
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
  const [mobileMenuOpen, setMobileMenuOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchOpen, setSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<{
    invoices: Invoice[];
    buyers: Buyer[];
  }>({ invoices: [], buyers: [] });

  const [resetting, setResetting] = useState(false);
  const [razorpayStatus, setRazorpayStatus] = useState<RazorpayStatus | null>(null);
  const [pendingRequestsCount, setPendingRequestsCount] = useState<number>(0);

  const location = useLocation();
  const navigate = useNavigate();

  useEffect(() => {
    api.getRazorpayStatus().then(setRazorpayStatus).catch(() => {});
    api.getAdminRequests('PENDING').then(reqs => setPendingRequestsCount(reqs.length)).catch(() => {});
  }, []);

  const handleResetDemo = async () => {
    try {
      setResetting(true);
      await api.resetDemo();
      localStorage.removeItem('termwise_tour_step'); // Reset walkthrough state
      window.location.reload();
    } catch (err) {
      console.error('Failed to reset demo dataset', err);
      alert('Demo Reset failed. Please check if the FastAPI server is running.');
    } finally {
      setResetting(false);
    }
  };

  const navItems = [
    { name: 'Overview', path: '/dashboard', icon: LayoutDashboard },
    { name: 'Receivables', path: '/receivables', icon: FileSpreadsheet },
    { name: 'Buyers', path: '/buyers', icon: Users },
    { name: 'Cash Flow', path: '/cash-flow', icon: LineChart },
    { name: 'Priorities', path: '/priorities', icon: AlertTriangle },
    { name: 'Negotiations', path: '/negotiations', icon: MessageSquare },
    { name: 'Customer Requests', path: '/admin/customer-requests', icon: ClipboardList, badge: pendingRequestsCount },
    { name: 'Outcomes', path: '/outcomes', icon: Trophy },
    { name: 'Insights', path: '/insights', icon: Lightbulb },
    { name: 'Integrations', path: '/settings/integrations', icon: Zap },
  ];


  // Perform search across buyers and invoices
  useEffect(() => {
    if (!searchQuery.trim()) {
      setSearchResults({ invoices: [], buyers: [] });
      return;
    }
    const delayDebounceFn = setTimeout(async () => {
      try {
        const [invoices, buyers] = await Promise.all([
          api.getInvoices(undefined, undefined),
          api.getBuyers(),
        ]);
        
        const query = searchQuery.toLowerCase();
        const filteredInvoices = invoices.filter(
          (inv) =>
            inv.invoice_id.toLowerCase().includes(query) ||
            inv.buyer_name.toLowerCase().includes(query)
        );
        const filteredBuyers = buyers.filter((b) =>
          b.name.toLowerCase().includes(query)
        );
        setSearchResults({ invoices: filteredInvoices, buyers: filteredBuyers });
      } catch (err) {
        console.error('Search failed', err);
      }
    }, 200);

    return () => clearTimeout(delayDebounceFn);
  }, [searchQuery]);

  const handleSearchResultClick = (path: string) => {
    setSearchQuery('');
    setSearchOpen(false);
    navigate(path);
  };

  return (
    <div className="min-h-screen bg-[#060608] text-gray-200 flex flex-col md:flex-row">
      {/* Mobile Header */}
      <div className="md:hidden flex items-center justify-between p-4 bg-[#0A0A0E] border-b border-[#1A1A24] z-50">
        <div className="flex items-center gap-2">
          <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">TW</div>
          <span className="font-bold text-white text-sm tracking-wide">TERMWISE <span className="text-purple-400 text-xs font-mono font-normal">AI</span></span>
        </div>
        <button onClick={() => setMobileMenuOpen(!mobileMenuOpen)} className="text-gray-400 hover:text-white">
          {mobileMenuOpen ? <X size={24} /> : <Menu size={24} />}
        </button>
      </div>

      {/* Sidebar - Desktop */}
      <aside className={`hidden md:flex flex-col bg-[#0A0A0E] border-r border-[#15151F] transition-all duration-300 ${sidebarCollapsed ? 'w-20' : 'w-64'} shrink-0 relative`}>
        {/* Brand Header */}
        <div className="p-6 border-b border-[#15151F] flex items-center justify-between">
          {!sidebarCollapsed ? (
            <div className="flex items-center gap-3">
              <div className="h-8 w-8 rounded-xl bg-gradient-to-br from-indigo-500 via-purple-500 to-pink-500 flex items-center justify-center font-extrabold text-white text-sm shadow-[0_0_20px_rgba(168,85,247,0.4)]">T</div>
              <div>
                <span className="font-bold text-white tracking-wide text-base">TERMWISE</span>
                <div className="text-[9px] text-purple-400 font-mono tracking-wider font-semibold">NOVACRAFT MFG</div>
              </div>
            </div>
          ) : (
            <div className="h-8 w-8 mx-auto rounded-xl bg-gradient-to-br from-indigo-500 to-purple-500 flex items-center justify-center font-extrabold text-white text-sm">T</div>
          )}
          
          <button 
            onClick={() => setSidebarCollapsed(!sidebarCollapsed)}
            className="absolute -right-3 top-7 h-6 w-6 rounded-full bg-[#15151F] border border-[#232333] flex items-center justify-center text-gray-400 hover:text-white cursor-pointer z-30 transition-transform"
          >
            {sidebarCollapsed ? <ChevronRight size={14} /> : <ChevronLeft size={14} />}
          </button>
        </div>

        {/* Navigation Items */}
        <nav className="flex-1 px-4 py-6 space-y-1">
          {navItems.map((item) => {
            const Icon = item.icon;
            const isActive = location.pathname.startsWith(item.path);
            return (
              <Link
                key={item.name}
                to={item.path}
                className={`flex items-center justify-between px-4 py-3 rounded-xl transition-all duration-200 group text-sm ${
                  isActive
                    ? 'bg-gradient-to-r from-purple-950/40 to-indigo-950/20 text-purple-300 font-medium border-l-2 border-purple-500 pl-[14px]'
                    : 'text-gray-400 hover:text-gray-200 hover:bg-[#12121A]/60'
                }`}
              >
                <div className="flex items-center gap-3">
                  <Icon size={18} className={isActive ? 'text-purple-400' : 'text-gray-400 group-hover:text-gray-200'} />
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
        <div className="p-4 border-t border-[#15151F] space-y-3 bg-[#08080C]/40">
          {/* Data Source Indicator */}
          {!sidebarCollapsed ? (
            razorpayStatus?.mode === 'LIVE' ? (
              <div className="p-3 bg-emerald-950/20 border border-emerald-900/40 rounded-xl flex items-center gap-2">
                <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse shrink-0"></span>
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-emerald-300 font-bold uppercase tracking-wider">RAZORPAY LIVE</div>
                  <div className="text-[9px] text-gray-400 truncate">Live settlement sync active</div>
                </div>
              </div>
            ) : (
              <div className="p-3 bg-purple-950/20 border border-purple-900/40 rounded-xl flex items-center gap-2">
                <Database size={14} className="text-purple-400 shrink-0" />
                <div className="min-w-0">
                  <div className="text-[10px] font-mono text-purple-300 font-bold uppercase tracking-wider">DEMO DATA MODE</div>
                  <div className="text-[9px] text-gray-500 truncate">Synthetic active profiles loaded</div>
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
              title={razorpayStatus?.mode === 'LIVE' ? 'Razorpay Live Connected' : 'Demo Data Active'}
            >
              {razorpayStatus?.mode === 'LIVE' ? <span className="h-2 w-2 rounded-full bg-emerald-400 animate-pulse"></span> : <Database size={14} />}
            </div>
          )}


          {/* System Status */}
          {!sidebarCollapsed ? (
            <div className="flex items-center justify-between text-[11px] text-gray-500 px-2">
              <span className="flex items-center gap-1.5 font-mono">
                <span className="h-1.5 w-1.5 rounded-full bg-emerald-500 animate-pulse"></span>
                API Connected
              </span>
              <span>v1.0.0</span>
            </div>
          ) : (
            <div className="flex justify-center" title="API Status Healthy">
              <span className="h-2 w-2 rounded-full bg-emerald-500 animate-pulse"></span>
            </div>
          )}
        </div>
      </aside>

      {/* Mobile Drawer menu */}
      {mobileMenuOpen && (
        <div className="md:hidden fixed inset-0 z-40 flex">
          <div className="fixed inset-0 bg-black/60" onClick={() => setMobileMenuOpen(false)}></div>
          <div className="relative flex flex-col w-64 bg-[#0A0A0E] border-r border-[#15151F] h-full p-6 z-50">
            <div className="flex items-center justify-between mb-8">
              <div className="flex items-center gap-2">
                <div className="h-7 w-7 rounded-lg bg-gradient-to-br from-indigo-500 to-purple-600 flex items-center justify-center font-bold text-white text-xs">T</div>
                <span className="font-bold text-white text-sm">TERMWISE</span>
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
                      isActive
                        ? 'bg-purple-950/30 text-purple-300 font-semibold'
                        : 'text-gray-400 hover:text-gray-200'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <Icon size={18} />
                      <span>{item.name}</span>
                    </div>
                    {item.badge !== undefined && item.badge > 0 && (
                      <span className="px-2 py-0.5 text-[10px] font-bold bg-amber-500/20 text-amber-300 border border-amber-500/30 rounded-full">
                        {item.badge}
                      </span>
                    )}
                  </Link>
                );
              })}
            </nav>
            <div className="pt-4 border-t border-[#15151F] mt-auto space-y-2">
              <Link
                to="/customer/dashboard"
                onClick={() => setMobileMenuOpen(false)}
                className="w-full flex items-center justify-center gap-2 py-2 px-3 bg-indigo-950/40 hover:bg-indigo-900/50 border border-indigo-500/30 rounded-xl text-xs font-semibold text-indigo-300 transition"
              >
                <ArrowRightLeft size={14} />
                Switch to Customer Portal
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
        {/* Persistent Demo Mode Banner */}
        <div className="bg-[#130E26] border-b border-purple-500/20 py-2 px-6 flex items-center justify-between text-xs text-purple-300 shrink-0">
          <div className="flex items-center gap-2">
            <span className="h-1.5 w-1.5 rounded-full bg-purple-400 animate-ping"></span>
            <span className="font-bold tracking-wider font-mono text-[10px]">ADMIN PORTAL</span>
            <span className="text-gray-600">|</span>
            <span>Active Business: <strong className="text-white">NovaCraft Manufacturing</strong> • Logged in as: <strong className="text-purple-200">{user?.full_name || 'Admin'}</strong></span>
          </div>
          <div className="flex items-center gap-2">
            <Link
              to="/customer/dashboard"
              className="px-2.5 py-1 bg-indigo-950/60 hover:bg-indigo-900/80 border border-indigo-500/30 text-indigo-300 hover:text-white rounded-lg font-mono text-[10px] tracking-wider uppercase transition flex items-center gap-1.5"
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
        <header className="h-16 border-b border-[#15151F] bg-[#0A0A0E]/60 backdrop-blur-md px-6 flex items-center justify-between sticky top-0 z-20">
          <div className="flex items-center gap-4">
            <h1 className="text-lg font-bold text-white tracking-tight">{pageTitle}</h1>
          </div>

          <div className="flex items-center gap-3">
            {/* Search Trigger */}
            <div className="relative">
              <button 
                onClick={() => setSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 rounded-xl bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] text-xs text-gray-400 hover:text-gray-200 transition duration-150 cursor-pointer"
              >
                <Search size={14} />
                <span className="hidden md:inline">Search records...</span>
              </button>

              {/* Search Dropdown Modal */}
              {searchOpen && (
                <>
                  <div className="fixed inset-0 z-40 cursor-default" onClick={() => setSearchOpen(false)}></div>
                  <div className="absolute right-0 mt-2 w-80 bg-[#0E0E14] border border-[#1F202B] rounded-2xl shadow-2xl p-4 z-50 text-left">
                    <div className="relative mb-3">
                      <Search className="absolute left-3 top-2.5 text-gray-500" size={14} />
                      <input
                        type="text"
                        placeholder="Search invoices or buyers..."
                        value={searchQuery}
                        onChange={(e) => setSearchQuery(e.target.value)}
                        className="w-full bg-[#14141E] border border-[#1C1D28] rounded-xl pl-9 pr-4 py-2 text-xs text-gray-200 focus:outline-none focus:border-purple-500 focus:ring-1 focus:ring-purple-500"
                        autoFocus
                      />
                    </div>

                    <div className="max-h-60 overflow-y-auto space-y-3">
                      {searchQuery ? (
                        <>
                          {searchResults.buyers.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-1">Buyers</div>
                              {searchResults.buyers.map((buyer) => (
                                <button
                                  key={buyer.id}
                                  onClick={() => handleSearchResultClick(`/buyers/${buyer.id}`)}
                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-950/20 text-xs text-gray-300 hover:text-purple-300 transition"
                                >
                                  {buyer.name}
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.invoices.length > 0 && (
                            <div>
                              <div className="text-[10px] font-bold text-gray-500 uppercase tracking-wider px-2 mb-1">Invoices</div>
                              {searchResults.invoices.map((inv) => (
                                <button
                                  key={inv.invoice_id}
                                  onClick={() => handleSearchResultClick(`/receivables/${inv.invoice_id}`)}
                                  className="w-full text-left px-2 py-1.5 rounded-lg hover:bg-purple-950/20 text-xs text-gray-300 hover:text-purple-300 transition"
                                >
                                  <div className="font-medium">{inv.invoice_id}</div>
                                  <div className="text-[10px] text-gray-500 flex justify-between">
                                    <span>{inv.buyer_name}</span>
                                    <span>₹{(inv.amount / 100000).toFixed(2)}L</span>
                                  </div>
                                </button>
                              ))}
                            </div>
                          )}

                          {searchResults.buyers.length === 0 && searchResults.invoices.length === 0 && (
                            <div className="text-center py-4 text-xs text-gray-500">No matching records found.</div>
                          )}
                        </>
                      ) : (
                        <div className="text-center py-4 text-xs text-gray-500">Type to search databases.</div>
                      )}
                    </div>
                  </div>
                </>
              )}
            </div>

            {/* Notification alert Bell */}
            <button className="p-2 rounded-xl bg-[#12121A] hover:bg-[#1A1A26] border border-[#1C1D26] text-gray-400 hover:text-gray-200 transition relative">
              <Bell size={14} />
              {pendingRequestsCount > 0 && (
                <span className="absolute top-1 right-1 h-2 w-2 rounded-full bg-amber-400 animate-pulse"></span>
              )}
            </button>

            {/* User Profile & Logout */}
            <div className="flex items-center gap-2 pl-2 border-l border-[#15151F]">
              <div className="h-8 w-8 rounded-xl bg-purple-950/60 border border-purple-500/40 flex items-center justify-center text-purple-300 font-bold text-xs shadow-inner">
                {user?.full_name ? user.full_name.slice(0, 2).toUpperCase() : 'AD'}
              </div>
              <div className="hidden lg:block text-left">
                <div className="text-xs font-semibold text-white truncate max-w-[130px]">
                  {user?.full_name || 'Admin User'}
                </div>
                <div className="text-[10px] text-purple-400 font-mono flex items-center gap-1">
                  <span className="h-1.5 w-1.5 rounded-full bg-purple-400"></span>
                  ADMIN ROLE
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

        {/* Content Box */}
        <main className="flex-1 p-6 md:p-8">
          {children}
        </main>
        
        {/* Guided Walkthrough Tour Assistant overlay */}
        <WalkthroughTour />
      </div>
    </div>
  );
}
