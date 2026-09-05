import React, { createContext, useContext, useState, useCallback } from 'react';
import { CheckCircle2, AlertTriangle, XCircle, Info, X } from 'lucide-react';

type ToastType = 'success' | 'warning' | 'error' | 'info';

interface ToastItem {
  id: string;
  type: ToastType;
  title: string;
  message?: string;
  duration?: number;
}

interface ToastContextValue {
  showToast: (type: ToastType, title: string, message?: string, duration?: number) => void;
  success: (title: string, message?: string) => void;
  warning: (title: string, message?: string) => void;
  error: (title: string, message?: string) => void;
  info: (title: string, message?: string) => void;
}

const ToastContext = createContext<ToastContextValue | undefined>(undefined);

export const ToastProvider: React.FC<{ children: React.ReactNode }> = ({ children }) => {
  const [toasts, setToasts] = useState<ToastItem[]>([]);

  const removeToast = useCallback((id: string) => {
    setToasts((prev) => prev.filter((t) => t.id !== id));
  }, []);

  const showToast = useCallback(
    (type: ToastType, title: string, message?: string, duration = 4000) => {
      const id = `${Date.now()}-${Math.random()}`;
      setToasts((prev) => [...prev, { id, type, title, message, duration }]);

      if (duration > 0) {
        setTimeout(() => {
          removeToast(id);
        }, duration);
      }
    },
    [removeToast]
  );

  const success = useCallback((title: string, message?: string) => showToast('success', title, message), [showToast]);
  const warning = useCallback((title: string, message?: string) => showToast('warning', title, message), [showToast]);
  const error = useCallback((title: string, message?: string) => showToast('error', title, message), [showToast]);
  const info = useCallback((title: string, message?: string) => showToast('info', title, message), [showToast]);

  return (
    <ToastContext.Provider value={{ showToast, success, warning, error, info }}>
      {children}
      {/* Toast Render Viewport */}
      <div className="fixed bottom-5 right-5 z-50 flex flex-col gap-2.5 max-w-sm w-full pointer-events-none">
        {toasts.map((t) => (
          <div
            key={t.id}
            className={`pointer-events-auto p-4 rounded-2xl border shadow-2xl backdrop-blur-md animate-slideInRight flex items-start justify-between gap-3 text-left ${
              t.type === 'success'
                ? 'bg-[#0A1612]/95 border-emerald-500/40 text-emerald-300 shadow-emerald-950/40'
                : t.type === 'warning'
                ? 'bg-[#191307]/95 border-amber-500/40 text-amber-300 shadow-amber-950/40'
                : t.type === 'error'
                ? 'bg-[#19090D]/95 border-rose-500/40 text-rose-300 shadow-rose-950/40'
                : 'bg-[#0A111E]/95 border-cyan-500/40 text-cyan-300 shadow-cyan-950/40'
            }`}
          >
            <div className="flex items-start gap-3">
              <div className="shrink-0 mt-0.5">
                {t.type === 'success' && <CheckCircle2 size={18} className="text-emerald-400" />}
                {t.type === 'warning' && <AlertTriangle size={18} className="text-amber-400" />}
                {t.type === 'error' && <XCircle size={18} className="text-rose-400" />}
                {t.type === 'info' && <Info size={18} className="text-cyan-400" />}
              </div>
              <div className="space-y-0.5">
                <div className="text-xs font-bold text-white tracking-wide">{t.title}</div>
                {t.message && <div className="text-[11px] text-gray-300 leading-snug">{t.message}</div>}
              </div>
            </div>

            <button
              onClick={() => removeToast(t.id)}
              className="text-gray-400 hover:text-white p-1 transition"
            >
              <X size={14} />
            </button>
          </div>
        ))}
      </div>
    </ToastContext.Provider>
  );
};

export const useToast = () => {
  const context = useContext(ToastContext);
  if (!context) {
    throw new Error('useToast must be used within a ToastProvider');
  }
  return context;
};
