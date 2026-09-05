
interface RiskBadgeProps {
  level: 'LOW' | 'MEDIUM' | 'HIGH';
}

export default function RiskBadge({ level }: RiskBadgeProps) {
  const styles = {
    LOW: 'bg-emerald-500/10 text-emerald-400 border-emerald-500/20',
    MEDIUM: 'bg-amber-500/10 text-amber-400 border-amber-500/20',
    HIGH: 'bg-rose-500/10 text-rose-400 border-rose-500/20',
  }[level] || 'bg-gray-500/10 text-gray-400 border-gray-500/20';

  return (
    <span className={`px-2 py-0.5 rounded-full text-[10px] font-semibold border ${styles}`}>
      {level} RISK
    </span>
  );
}
