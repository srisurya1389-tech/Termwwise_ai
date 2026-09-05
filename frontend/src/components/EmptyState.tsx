import { Inbox } from 'lucide-react';

interface EmptyStateProps {
  title: string;
  description: string;
}

export default function EmptyState({ title, description }: EmptyStateProps) {
  return (
    <div className="flex flex-col items-center justify-center p-12 text-center bg-[#0C0C12] border border-[#171822] rounded-2xl">
      <div className="h-12 w-12 rounded-full bg-[#12121B] flex items-center justify-center text-gray-500 mb-4 border border-[#1A1A26]">
        <Inbox size={20} />
      </div>
      <h3 className="text-sm font-semibold text-white mb-1">{title}</h3>
      <p className="text-xs text-gray-500 max-w-xs">{description}</p>
    </div>
  );
}
