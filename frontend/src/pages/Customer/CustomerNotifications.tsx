import { useState, useEffect } from 'react';
import {
  Bell,
  CheckCircle2,
  FileText,
  CreditCard,
  Clock,
  CheckCheck,
  AlertCircle
} from 'lucide-react';
import CustomerLayout from '../../components/CustomerLayout';
import { api } from '../../api/client';
import { useAuth } from '../../context/AuthContext';
import type { CustomerNotification } from '../../types';

export default function CustomerNotifications() {
  const { user } = useAuth();
  const [notifications, setNotifications] = useState<CustomerNotification[]>([]);
  const [loading, setLoading] = useState(true);

  const loadNotifications = async () => {
    try {
      setLoading(true);
      const res = await api.getCustomerNotifications(user?.email);
      setNotifications(res);
    } catch (err) {
      console.error('Failed to load customer notifications', err);
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    loadNotifications();
  }, [user?.email]);

  const handleMarkAsRead = async (id: number) => {
    try {
      await api.markNotificationRead(id, user?.email);
      setNotifications((prev) =>
        prev.map((n) => (n.id === id ? { ...n, read: true } : n))
      );
    } catch (err) {
      console.error('Failed to mark notification as read', err);
    }
  };

  const handleMarkAllAsRead = async () => {
    try {
      const unread = notifications.filter((n) => !n.read);
      await Promise.all(unread.map((n) => api.markNotificationRead(n.id, user?.email)));
      setNotifications((prev) => prev.map((n) => ({ ...n, read: true })));
    } catch (err) {
      console.error('Failed to mark all notifications as read', err);
    }
  };

  const getIcon = (type: string) => {
    switch (type) {
      case 'INVOICE':
        return <FileText size={18} className="text-cyan-400" />;
      case 'PAYMENT':
        return <CreditCard size={18} className="text-emerald-400" />;
      case 'REQUEST':
        return <Clock size={18} className="text-purple-400" />;
      default:
        return <AlertCircle size={18} className="text-amber-400" />;
    }
  };

  return (
    <CustomerLayout pageTitle="Notifications & Alerts">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4 mb-6">
        <div>
          <h2 className="text-xl font-bold text-white tracking-tight">Notification Center</h2>
          <p className="text-xs text-gray-400">
            Real-time updates regarding invoices, payments, and credit term request decisions.
          </p>
        </div>

        {notifications.some((n) => !n.read) && (
          <button
            onClick={handleMarkAllAsRead}
            className="px-3 py-1.5 bg-[#141A2E] hover:bg-[#1E2644] border border-[#222B48] text-cyan-300 text-xs font-semibold rounded-xl transition flex items-center gap-1.5 self-start md:self-auto cursor-pointer"
          >
            <CheckCheck size={14} />
            Mark all as read
          </button>
        )}
      </div>

      {/* Notifications List */}
      <div className="space-y-3">
        {loading ? (
          <div className="p-12 text-center text-gray-500">
            <div className="w-8 h-8 border-2 border-cyan-500 border-t-transparent rounded-full animate-spin mx-auto mb-2"></div>
            Loading notifications...
          </div>
        ) : notifications.length > 0 ? (
          notifications.map((notif) => (
            <div
              key={notif.id}
              onClick={() => !notif.read && handleMarkAsRead(notif.id)}
              className={`p-4 rounded-2xl border transition flex items-start justify-between gap-4 cursor-pointer ${
                notif.read
                  ? 'bg-[#0A0D18] border-[#161D32] opacity-75 hover:opacity-100'
                  : 'bg-[#0E1424] border-cyan-500/40 shadow-lg shadow-cyan-950/20'
              }`}
            >
              <div className="flex items-start gap-3.5">
                <div className="p-2.5 rounded-xl bg-[#141A2E] border border-[#212A48] shrink-0 mt-0.5">
                  {getIcon(notif.type)}
                </div>
                <div className="space-y-1">
                  <div className="flex items-center gap-2">
                    <h4 className="text-xs font-bold text-white tracking-wide">
                      {notif.title}
                    </h4>
                    {!notif.read && (
                      <span className="h-1.5 w-1.5 rounded-full bg-cyan-400 animate-pulse"></span>
                    )}
                  </div>
                  <p className="text-xs text-gray-300 leading-relaxed max-w-2xl">
                    {notif.message}
                  </p>
                  <div className="text-[10px] text-gray-500 font-mono pt-1">
                    {notif.created_at}
                  </div>
                </div>
              </div>

              {!notif.read && (
                <button
                  onClick={(e) => {
                    e.stopPropagation();
                    handleMarkAsRead(notif.id);
                  }}
                  title="Mark as read"
                  className="text-gray-500 hover:text-cyan-300 p-1.5 transition"
                >
                  <CheckCircle2 size={16} />
                </button>
              )}
            </div>
          ))
        ) : (
          <div className="p-12 bg-[#0A0D18] border border-[#182038] rounded-2xl text-center text-gray-500 text-sm">
            <Bell size={32} className="mx-auto text-gray-600 mb-2" />
            No notifications available. You are all caught up!
          </div>
        )}
      </div>
    </CustomerLayout>
  );
}
