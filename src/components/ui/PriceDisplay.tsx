import React from 'react';
import { formatCurrency } from '@/lib/timezone';

interface PriceDisplayProps {
  startingBid: number;
  currentHighestBid: number | null;
  minimumBidIncrement?: number;
  bidCount?: number;
  compact?: boolean;
}

export function PriceDisplay({
  startingBid,
  currentHighestBid,
  minimumBidIncrement,
  bidCount = 0,
  compact = false,
}: PriceDisplayProps) {
  const hasBid = currentHighestBid !== null && currentHighestBid > 0;

  if (compact) {
    return (
      <div className="grid grid-cols-2 gap-3 rounded-xl bg-navy-950/80 border border-slate-800/80 p-3">
        <div>
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            Starting Price
          </p>
          <p className="mt-0.5 text-sm font-bold text-slate-200">{formatCurrency(startingBid)}</p>
        </div>
        <div className="border-l border-slate-800 pl-3">
          <p className="text-[11px] font-semibold uppercase tracking-wider text-slate-400">
            {hasBid ? 'Highest Bid' : 'Opening Bid'}
          </p>
          <p
            className={`mt-0.5 text-base font-extrabold ${
              hasBid ? 'text-electric-400' : 'text-white'
            }`}
          >
            {hasBid ? formatCurrency(currentHighestBid) : formatCurrency(startingBid)}
          </p>
        </div>
      </div>
    );
  }

  return (
    <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 rounded-2xl bg-navy-950/90 border border-slate-800 p-5">
      <div>
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          Starting Valuation
        </p>
        <p className="mt-1 text-xl font-bold text-slate-200">{formatCurrency(startingBid)}</p>
      </div>
      <div className="sm:border-l sm:border-slate-800 sm:pl-4">
        <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
          {hasBid ? `Current Highest Bid (${bidCount})` : 'No Bids Yet — Opening At'}
        </p>
        <p
          className={`mt-1 text-2xl font-black tracking-tight ${
            hasBid ? 'text-electric-400' : 'text-white'
          }`}
        >
          {hasBid ? formatCurrency(currentHighestBid) : formatCurrency(startingBid)}
        </p>
      </div>
      {minimumBidIncrement !== undefined && (
        <div className="sm:border-l sm:border-slate-800 sm:pl-4">
          <p className="text-xs font-semibold uppercase tracking-wider text-slate-400">
            Min. Bid Increment
          </p>
          <p className="mt-1 text-lg font-bold text-sky-300">
            +{formatCurrency(minimumBidIncrement)}
          </p>
        </div>
      )}
    </div>
  );
}
