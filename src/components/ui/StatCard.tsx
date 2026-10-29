import React from 'react';

interface StatCardProps {
  label: string;
  value: string | number;
  subtitle?: string;
  icon?: React.ReactNode;
  accent?: 'electric' | 'sky' | 'amber' | 'emerald' | 'rose';
}

export function StatCard({
  label,
  value,
  subtitle,
  icon,
  accent = 'electric',
}: StatCardProps) {
  const accentStyles = {
    electric: 'border-electric-500/30 bg-electric-500/10 text-electric-400',
    sky: 'border-sky-500/30 bg-sky-500/10 text-sky-400',
    amber: 'border-amber-500/30 bg-amber-500/10 text-amber-400',
    emerald: 'border-emerald-500/30 bg-emerald-500/10 text-emerald-400',
    rose: 'border-rose-500/30 bg-rose-500/10 text-rose-400',
  }[accent];

  return (
    <div className="rounded-2xl border border-slate-800/90 bg-navy-900/90 p-5 shadow-card-dark transition-all hover:border-slate-700">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-xs font-bold uppercase tracking-wider text-slate-400">{label}</p>
          <p className="mt-2 text-2xl sm:text-3xl font-black tracking-tight text-white">{value}</p>
        </div>
        {icon && <div className={`rounded-xl border p-2.5 ${accentStyles}`}>{icon}</div>}
      </div>
      {subtitle && <p className="mt-2.5 text-xs text-slate-400">{subtitle}</p>}
    </div>
  );
}
