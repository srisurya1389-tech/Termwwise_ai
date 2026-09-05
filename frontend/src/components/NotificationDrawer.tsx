import { useState, useEffect } from 'react';
import { Bell, CheckCheck, CheckCircle2, FileText, CreditCard, Clock, AlertCircle, X } from 'lucide-react';
import { api } from '../api/client';
import { useAuth } from '../context/AuthContext';
import type { CustomerNotification } from '../types';

interface NotificationDrawerProps {
  isOpen: boolean;
  onClose: () => void;
}

export default function NotificationDrawer({ isOpen, onClose }: NotificationDrawerProps) {
  const { user, role } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(false);

  const fetchNotifs = async () => {
    try {
      setLoading(true);
      if (role === 'CUSTOMER') {
        const res = await api.getCustomerNotifications(user?.email);
        setNotifications(res);
      } else {
        // For admin, pull notifications or pending requests as notification stream
        const reqs = await api.getAdminRequests();
        const generated: CustomerNotification[] = reqs.map((r) => ({
          id: r.id,
          title: `Extension Request: ${r.invoice_id}`,
          message: `${r.buyer_name} requested ${r.requested_term} days (Current: ${r.current_term}d).`,
          type: 'REQUEST',
          read: r.status !== 'PENDING',
          created_at: r.created_at,
        }));
        setNotifications(generated);
      }
    } catch (err) {
      console.error('Failed to load notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    if (isOpen) {
      fetchNotifs();
    }
  }, [isOpen]);

  const handleMarkRead = async (id: number) => {
    try {
      if (role === 'CUSTOMER') {
        await api.markNotificationRead(id, user?.email);
      }
      setNotifications((prev) => prev.map((n) => (n.id === id ? { ...n, read: true } : n)));
    } catch (err) {
      console.error('Error marking notification read', err);
    }
  };

  const handleMarkAllRead = async () => {
    try {
      if (role === 'CUSTOMER') {
        await Promise.all(
          notifications.filter((n) => !n.read).map((n) => api.markNotificationRead(n.id, user?.email))
        );
      }
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Error marking all read', err);
    }
  };

  if (!isOpen) return null;

  const unreadCount = notifications.filter((n) => !n.read).length;

  return (
    <div className="fixed inset-0 z-50 flex justify-end bg-black/60 backdrop-blur-sm animate-fadeIn">
      <div className="fixed inset-0" onClick={onClose} />
      <div className="relative w-full max-w-md bg-[#0D101C] border-l border-[#1F2642] h-full shadow-2xl flex flex-col z-10 animate-slideInRight text-left">
        {/* Header */}
        <div className="p-5 border-b border-[#1A2035] flex items-center justify-between bg-[#090C16]">
          <div className="flex items-center gap-2.5">
            <div className="p-2 rounded-xl bg-indigo-950/40 text-indigo-400 border border-indigo-500/20">
              <Bell size={16} />
            </div>
            <div>
              <h3 className="text-sm font-bold text-white">Notifications</h3>
              <p className="text-[11px] text-gray-400">
                {unreadCount > 0 ? `${unreadCount} unread update${unreadCount > 1 ? 's' : ''}` : 'All caught up'}
              </p>
            </div>
          </div>

          <div className="flex items-center gap-2">
            {unreadCount > 0 && (
              <button
                onClick={handleMarkAllRead}
                className="px-2.5 py-1 text-[11px] font-semibold text-cyan-300 hover:text-white bg-[#141A2E] hover:bg-[#1C233C] rounded-lg border border-[#222A48] transition flex items-center gap-1"
              >
                <CheckCheck size={13} />
                Mark all read
              </button>
            )}
            <button
              onClick={onClose}
              className="p-1.5 text-gray-400 hover:text-white rounded-lg hover:bg-[#141A2E] transition"
            >
              <X size={16} />
            </button>
          </div>
        </div>

        {/* List */}
        <div className="flex-1 overflow-y-auto p-4 space-y-3">
          {loading ? (
            <div className="py-16 text-center text-gray-500 text-xs">
              <div className="w-5 h-5 border-2 border-indigo-500 border-t-transparent rounded-full animate-spin mx-auto mb-2" />
              Loading notifications...
            </div>
          ) : notifications.length > 0 ? (
            notifications.map((n) => (
              <div
                key={n.id}
                onClick={() => !n.read && handleMarkRead(n.id)}
                className={`p-3.5 rounded-xl border transition flex items-start justify-between gap-3 cursor-pointer ${
                  n.read
                    ? 'bg-[#0E1220]/50 border-[#171E34] opacity-75 hover:opacity-100'
                    : 'bg-[#11172A] border-indigo-500/30 shadow-md shadow-indigo-950/20'
                }`}
              >
                <div className="flex items-start gap-3">
                  <div className="p-2 rounded-lg bg-[#161D32] border border-[#202946] shrink-0 mt-0.5">
                    {n.type === 'INVOICE' && <FileText size={15} className="text-cyan-400" />}
                    {n.type === 'PAYMENT' && <CreditCard size={15} className="text-emerald-400" />}
                    {n.type === 'REQUEST' && <Clock size={15} className="text-purple-400" />}
                    {n.type === 'SYSTEM' && <AlertCircle size={15} className="text-amber-400" />}
                  </div>
                  <div className="space-y-0.5">
                    <div className="flex items-center gap-1.5">
                      <span className="text-xs font-bold text-white">{n.title}</span>
                      {!n.read && <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse" />}
                    </div>
                    <p className="text-[11px] text-gray-300 leading-relaxed">{n.message}</p>
                    <div className="text-[10px] text-gray-500 font-mono pt-1">{n.created_at}</div>
                  </div>
                </div>

                {!n.read && (
                  <button
                    onClick={(e) => {
                      e.stopPropagation();
                      handleMarkRead(n.id);
                    }}
                    className="text-gray-500 hover:text-cyan-300 p-1"
                    title="Mark as read"
                  >
                    <CheckCircle2 size={15} />
                  </button>
                )}
              </div>
            ))
          ) : (
            <div className="py-16 text-center text-gray-500 text-xs">
              <Bell size={28} className="mx-auto text-gray-600 mb-2" />
              No notifications at this moment.
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
