import React from 'react';
import type { AuctionStatus } from '@/types/database';

interface StatusBadgeProps {
  status: AuctionStatus;
  size?: 'sm' | 'md' | 'lg';
  className?: string;
}

const STATUS_CONFIG: Record<
  AuctionStatus,
  {
    label: string;
    classes: string;
    dotClasses: string;
    pulse?: boolean;
  }
> = {
  live: {
    label: 'LIVE AUCTION',
    classes: 'bg-electric-500/15 text-electric-400 border-electric-500/50 shadow-electric-sm',
    dotClasses: 'bg-electric-500',
    pulse: true,
  },
  upcoming: {
    label: 'UPCOMING',
    classes: 'bg-sky-500/15 text-sky-300 border-sky-500/40',
    dotClasses: 'bg-sky-400',
  },
  ended: {
    label: 'ENDED',
    classes: 'bg-amber-500/15 text-amber-300 border-amber-500/40',
    dotClasses: 'bg-amber-400',
  },
  sold: {
    label: 'SOLD',
    classes: 'bg-emerald-500/20 text-emerald-300 border-emerald-400/50',
    dotClasses: 'bg-emerald-400',
  },
  unsold: {
    label: 'UNSOLD',
    classes: 'bg-rose-500/15 text-rose-300 border-rose-500/40',
    dotClasses: 'bg-rose-400',
  },
  draft: {
    label: 'DRAFT (UNPUBLISHED)',
    classes: 'bg-slate-700/40 text-slate-300 border-slate-600',
    dotClasses: 'bg-slate-400',
  },
  cancelled: {
    label: 'CANCELLED',
    classes: 'bg-red-900/30 text-red-300 border-red-700/50',
    dotClasses: 'bg-red-500',
  },
};

export function StatusBadge({ status, size = 'md', className = '' }: StatusBadgeProps) {
  const cfg = STATUS_CONFIG[status] || STATUS_CONFIG.upcoming;

  const sizeStyles =
    size === 'sm'
      ? 'px-2.5 py-0.5 text-[11px]'
      : size === 'lg'
      ? 'px-4 py-1.5 text-xs'
      : 'px-3 py-1 text-xs';

  return (
    <span
      className={`inline-flex items-center gap-1.5 rounded-full border font-bold tracking-wider uppercase ${cfg.classes} ${sizeStyles} ${className}`}
    >
      <span className="relative flex h-2 w-2">
        {cfg.pulse && (
          <span
            className={`animate-ping absolute inline-flex h-full w-full rounded-full opacity-75 ${cfg.dotClasses}`}
          />
        )}
        <span className={`relative inline-flex rounded-full h-2 w-2 ${cfg.dotClasses}`} />
      </span>
      {cfg.label}
    </span>
  );
}
