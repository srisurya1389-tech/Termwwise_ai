import { ShieldCheck, ShieldAlert, ShieldMinus } from 'lucide-react';

interface ConfidenceIndicatorProps {
  confidence: 'LOW' | 'MEDIUM' | 'HIGH' | null;
  historyCount?: number;
}

export default function ConfidenceIndicator({ confidence, historyCount }: ConfidenceIndicatorProps) {
  if (!confidence) return null;

  const config = {
    HIGH: {
      text: 'HIGH CONFIDENCE',
      style: 'text-emerald-400 bg-emerald-500/10 border-emerald-500/20',
      icon: ShieldCheck,
      desc: historyCount ? `Based on ${historyCount} historical payments.` : 'Consistent payment timing behavior.'
    },
    MEDIUM: {
      text: 'MEDIUM CONFIDENCE',
      style: 'text-amber-400 bg-amber-500/10 border-amber-500/20',
      icon: ShieldMinus,
      desc: historyCount ? `Based on ${historyCount} historical payments.` : 'Moderate timing variations observed.'
    },
    LOW: {
      text: 'LOW CONFIDENCE',
      style: 'text-rose-400 bg-rose-500/10 border-rose-500/20',
      icon: ShieldAlert,
      desc: 'Insufficient payment history to establish high confidence.'
    }
  }[confidence];

  const Icon = config.icon;

  return (
    <div className={`p-3 rounded-xl border ${config.style} flex gap-2.5 items-start`}>
      <Icon size={16} className="shrink-0 mt-0.5" />
      <div>
        <div className="text-xs font-bold font-mono tracking-wider">{config.text}</div>
        <div className="text-[10px] opacity-75 mt-0.5">{config.desc}</div>
      </div>
    </div>
  );
}
