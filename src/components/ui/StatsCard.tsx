import type { LucideProps } from 'lucide-react';

interface StatsCardProps {
  label: string;
  value: string | number;
  change?: string;
  changeType?: 'positive' | 'negative' | 'neutral';
  icon?: React.ComponentType<LucideProps>;
}

export function StatsCard({ label, value, change, changeType = 'neutral', icon: Icon }: StatsCardProps) {
  const changeColors = {
    positive: 'text-green-600',
    negative: 'text-red-600',
    neutral: 'text-slate',
  };

  return (
    <div className="bg-paper rounded-2xl p-6 border border-graphite-hairline shadow-xl-3 transition-colors duration-200">
      <div className="flex items-center justify-between">
        <p className="text-sm text-slate">{label}</p>
        {Icon && <Icon className="w-5 h-5 text-ash" />}
      </div>
      <p className="text-2xl font-display font-normal text-ink mt-2">
        {value}
      </p>
      {change && (
        <span className={`text-xs font-normal ${changeColors[changeType]}`}>
          {change}
        </span>
      )}
    </div>
  );
}
