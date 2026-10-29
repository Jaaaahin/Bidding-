'use client';

import React, { useState, useTransition } from 'react';
import { usePathname, useRouter, useSearchParams } from 'next/navigation';
import { Search, SlidersHorizontal, RotateCcw, ChevronLeft, ChevronRight } from 'lucide-react';

interface PlayerSearchFiltersProps {
  nationalities: string[];
  totalCount: number;
  page: number;
  totalPages: number;
  hideStatusFilter?: boolean;
}

export function PlayerSearchFilters({
  nationalities,
  totalCount,
  page,
  totalPages,
  hideStatusFilter = false,
}: PlayerSearchFiltersProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const [isPending, startTransition] = useTransition();

  const [searchInput, setSearchInput] = useState(searchParams.get('search') || '');

  const currentNationality = searchParams.get('nationality') || 'all';
  const currentPosition = searchParams.get('position') || 'all';
  const currentStatus = searchParams.get('status') || 'all';
  const currentSort = searchParams.get('sortBy') || 'ending_soon';
  const currentDemoFilter = searchParams.get('demoFilter') || 'all';

  const updateQueryParams = (updates: Record<string, string | null>) => {
    const params = new URLSearchParams(searchParams.toString());
    Object.entries(updates).forEach(([key, val]) => {
      if (!val || val === 'all') {
        params.delete(key);
      } else {
        params.set(key, val);
      }
    });
    if (!('page' in updates)) {
      params.delete('page');
    }
    const qs = params.toString();
    startTransition(() => {
      router.push(qs ? `${pathname}?${qs}` : pathname);
    });
  };

  const handleSearchSubmit = (e: React.FormEvent) => {
    e.preventDefault();
    updateQueryParams({ search: searchInput.trim() || null });
  };

  const handleReset = () => {
    setSearchInput('');
    startTransition(() => {
      router.push(pathname);
    });
  };

  return (
    <div className="space-y-4">
      <div className="rounded-2xl border border-slate-800/90 bg-navy-900/90 p-5 shadow-card-dark">
        <form onSubmit={handleSearchSubmit} className="grid grid-cols-1 gap-4 lg:grid-cols-12">
          {/* Search Input */}
          <div className="lg:col-span-4">
            <label
              htmlFor="player-search-input"
              className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Search Player or Club
            </label>
            <div className="relative flex">
              <Search className="pointer-events-none absolute left-3.5 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
              <input
                id="player-search-input"
                type="text"
                value={searchInput}
                onChange={(e) => setSearchInput(e.target.value)}
                placeholder="Search by player name, club..."
                className="w-full rounded-l-xl border border-slate-700 bg-navy-950 pl-10 pr-3 py-2.5 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
              />
              <button
                type="submit"
                disabled={isPending}
                className="rounded-r-xl bg-electric-500 px-4 py-2.5 text-xs font-extrabold uppercase tracking-wider text-navy-950 hover:bg-electric-400 transition-colors"
              >
                Search
              </button>
            </div>
          </div>

          {/* Position Filter */}
          <div className="lg:col-span-2">
            <label
              htmlFor="filter-position"
              className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Playing Position
            </label>
            <select
              id="filter-position"
              value={currentPosition}
              onChange={(e) => updateQueryParams({ position: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-navy-950 px-3 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
            >
              <option value="all">All Positions</option>
              <option value="Forward">Forward</option>
              <option value="Midfielder">Midfielder</option>
              <option value="Defender">Defender</option>
              <option value="Goalkeeper">Goalkeeper</option>
            </select>
          </div>

          {/* Nationality Filter */}
          <div className="lg:col-span-2">
            <label
              htmlFor="filter-nationality"
              className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Nationality
            </label>
            <select
              id="filter-nationality"
              value={currentNationality}
              onChange={(e) => updateQueryParams({ nationality: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-navy-950 px-3 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
            >
              <option value="all">All Nationalities</option>
              {nationalities.map((nat) => (
                <option key={nat} value={nat}>
                  {nat}
                </option>
              ))}
            </select>
          </div>

          {/* Auction Status Filter */}
          {!hideStatusFilter && (
            <div className="lg:col-span-2">
              <label
                htmlFor="filter-status"
                className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
              >
                Auction Status
              </label>
              <select
                id="filter-status"
                value={currentStatus}
                onChange={(e) => updateQueryParams({ status: e.target.value })}
                className="w-full rounded-xl border border-slate-700 bg-navy-950 px-3 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
              >
                <option value="all">All Statuses</option>
                <option value="live">Live Now</option>
                <option value="upcoming">Upcoming</option>
                <option value="completed">Completed (All)</option>
                <option value="sold">Sold Only</option>
                <option value="unsold">Unsold Only</option>
              </select>
            </div>
          )}

          {/* Sort Order */}
          <div className={hideStatusFilter ? 'lg:col-span-4' : 'lg:col-span-2'}>
            <label
              htmlFor="filter-sort"
              className="block text-xs font-bold uppercase tracking-wider text-slate-400 mb-1.5"
            >
              Sort Listings By
            </label>
            <select
              id="filter-sort"
              value={currentSort}
              onChange={(e) => updateQueryParams({ sortBy: e.target.value })}
              className="w-full rounded-xl border border-slate-700 bg-navy-950 px-3 py-2.5 text-sm text-white focus:border-electric-500 focus:outline-none"
            >
              <option value="ending_soon">Ending Time (Soonest First)</option>
              <option value="highest_bid_desc">Current Highest Bid (High → Low)</option>
              <option value="starting_price_asc">Starting Price (Low → High)</option>
              <option value="starting_price_desc">Starting Price (High → Low)</option>
              <option value="newest">Recently Added</option>
            </select>
          </div>
        </form>

        {/* Bottom Filter Metadata Bar */}
        <div className="mt-4 flex flex-wrap items-center justify-between gap-3 border-t border-slate-800/80 pt-3.5 text-xs">
          <div className="flex flex-wrap items-center gap-3 text-slate-300">
            <span className="inline-flex items-center gap-1.5 font-semibold">
              <SlidersHorizontal className="h-3.5 w-3.5 text-electric-400" />
              Showing <strong className="text-white">{totalCount}</strong> matching{' '}
              {totalCount === 1 ? 'player' : 'players'}
            </span>

            <div className="flex items-center gap-1.5">
              <span className="text-slate-400">Data Source:</span>
              <select
                aria-label="Filter by data source"
                value={currentDemoFilter}
                onChange={(e) => updateQueryParams({ demoFilter: e.target.value })}
                className="rounded-lg border border-slate-700 bg-navy-950 px-2 py-1 text-xs text-slate-200"
              >
                <option value="all">All Listings (Real + Sample Demo)</option>
                <option value="real_only">Real Database Records Only</option>
                <option value="demo_only">Sample Demo Players Only</option>
              </select>
            </div>
          </div>

          <button
            type="button"
            onClick={handleReset}
            className="inline-flex items-center gap-1.5 rounded-lg border border-slate-700 bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <RotateCcw className="h-3.5 w-3.5" />
            Reset Filters
          </button>
        </div>
      </div>

      {/* Pagination Bar (if multiple pages) */}
      {totalPages > 1 && (
        <div className="flex items-center justify-between rounded-xl border border-slate-800 bg-navy-900/75 px-4 py-3 text-xs">
          <span className="text-slate-400">
            Page <strong className="text-white">{page}</strong> of{' '}
            <strong className="text-white">{totalPages}</strong>
          </span>
          <div className="flex items-center gap-2">
            <button
              type="button"
              disabled={page <= 1 || isPending}
              onClick={() => updateQueryParams({ page: String(page - 1) })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-800 px-3 py-1.5 font-semibold text-white hover:bg-navy-700 disabled:opacity-40"
            >
              <ChevronLeft className="h-4 w-4" />
              Previous
            </button>
            <button
              type="button"
              disabled={page >= totalPages || isPending}
              onClick={() => updateQueryParams({ page: String(page + 1) })}
              className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-800 px-3 py-1.5 font-semibold text-white hover:bg-navy-700 disabled:opacity-40"
            >
              Next
              <ChevronRight className="h-4 w-4" />
            </button>
          </div>
        </div>
      )}
    </div>
  );
}
