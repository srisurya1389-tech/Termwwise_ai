import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { ArrowUpRight } from 'lucide-react';

interface StatCardProps {
  title: string;
  value: string | number;
  subtitle?: string;
  icon: ReactNode;
  variant?: 'default' | 'success' | 'warning' | 'danger' | 'info';
  actionLabel?: string;
  actionTo?: string;
  onActionClick?: () => void;
  badge?: string;
}

export default function StatCard({
  title,
  value,
  subtitle,
  icon,
  variant = 'default',
  actionLabel,
  actionTo,
  onActionClick,
  badge,
}: StatCardProps) {
  const getVariantStyles = () => {
    switch (variant) {
      case 'success':
        return {
          border: 'hover:border-emerald-500/40',
          iconBg: 'bg-emerald-950/40 text-emerald-400 border-emerald-500/20',
          valColor: 'text-emerald-400',
        };
      case 'warning':
        return {
          border: 'hover:border-amber-500/40',
          iconBg: 'bg-amber-950/40 text-amber-400 border-amber-500/20',
          valColor: 'text-amber-300',
        };
      case 'danger':
        return {
          border: 'hover:border-rose-500/40',
          iconBg: 'bg-rose-950/40 text-rose-400 border-rose-500/20',
          valColor: 'text-rose-400',
        };
      case 'info':
        return {
          border: 'hover:border-cyan-500/40',
          iconBg: 'bg-cyan-950/40 text-cyan-400 border-cyan-500/20',
          valColor: 'text-cyan-300',
        };
      default:
        return {
          border: 'hover:border-purple-500/40',
          iconBg: 'bg-purple-950/40 text-purple-400 border-purple-500/20',
          valColor: 'text-white',
        };
    }
  };

  const styles = getVariantStyles();

  return (
    <div
      className={`p-5 rounded-2xl bg-[#0B0E17] border border-[#1A2238] ${styles.border} transition-all duration-200 flex flex-col justify-between space-y-3 relative overflow-hidden shadow-lg group`}
    >
      <div className="flex items-start justify-between">
        <div className="space-y-1">
          <div className="text-[11px] font-medium uppercase tracking-wider text-gray-400">
            {title}
          </div>
          <div className={`text-2xl font-black tracking-tight font-mono ${styles.valColor}`}>
            {value}
          </div>
        </div>

        <div className="flex items-center gap-2">
          {badge && (
            <span className="px-2 py-0.5 rounded-full text-[10px] font-bold font-mono uppercase bg-[#141A2E] text-gray-300 border border-[#212A48]">
              {badge}
            </span>
          )}
          <div className={`p-2.5 rounded-xl border ${styles.iconBg} shrink-0`}>
            {icon}
          </div>
        </div>
      </div>

      <div className="pt-2 border-t border-[#141B30] flex items-center justify-between text-xs">
        {subtitle && <span className="text-gray-400 text-[11px] truncate max-w-[200px]">{subtitle}</span>}

        {actionLabel && actionTo && (
          <Link
            to={actionTo}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition ml-auto whitespace-nowrap"
          >
            {actionLabel} <ArrowUpRight size={13} />
          </Link>
        )}

        {actionLabel && onActionClick && !actionTo && (
          <button
            onClick={onActionClick}
            className="text-[11px] font-bold text-indigo-400 hover:text-indigo-300 flex items-center gap-1 transition ml-auto cursor-pointer whitespace-nowrap"
          >
            {actionLabel} <ArrowUpRight size={13} />
          </button>
        )}
      </div>
    </div>
  );
}
