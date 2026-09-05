import { type ReactNode } from 'react';
import { Link } from 'react-router-dom';
import { Inbox, Plus } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
  icon?: ReactNode;
  actionLabel?: string;
  actionTo?: string;
  onActionClick?: () => void;
  onAction?: () => void;
}

export default function EmptyState({
  title,
  description,
  icon,
  actionLabel,
  actionTo,
  onActionClick,
  onAction,
}: EmptyStateProps) {
  const handleAction = onActionClick || onAction;

  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#090C16] border border-[#161D32] rounded-2xl space-y-3">
      <div className="h-12 w-12 rounded-2xl bg-[#12172A] flex items-center justify-center text-gray-400 border border-[#1E2744]">
        {icon || <Inbox size={22} className="text-gray-500" />}
      </div>
      <div className="space-y-1">
        <h3 className="text-sm font-bold text-white">{title}</h3>
        <p className="text-xs text-gray-400 max-w-sm leading-relaxed">{description}</p>
      </div>

      {actionLabel && actionTo && (
        <Link
          to={actionTo}
          className="mt-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow transition inline-flex items-center gap-1.5"
        >
          <Plus size={14} />
          {actionLabel}
        </Link>
      )}

      {actionLabel && handleAction && !actionTo && (
        <button
          onClick={handleAction}
          className="mt-2 px-4 py-2 bg-gradient-to-r from-indigo-600 to-purple-600 hover:from-indigo-500 hover:to-purple-500 text-white font-bold text-xs rounded-xl shadow transition inline-flex items-center gap-1.5 cursor-pointer"
        >
          <Plus size={14} />
          {actionLabel}
        </button>
      )}
    </div>
  );
}
