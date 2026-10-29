import React from 'react';

export default function GlobalLoading() {
  return (
    <div className="mx-auto max-w-7xl px-4 py-16 sm:px-6 lg:px-8">
      <div className="flex flex-col items-center justify-center py-20 space-y-4">
        <div className="h-12 w-12 animate-spin rounded-full border-4 border-slate-800 border-t-electric-500" />
        <p className="text-xs font-bold uppercase tracking-widest text-slate-400">
          Synchronizing Live Auction Data...
        </p>
      </div>
    </div>
  );
}
