import React, { Suspense } from 'react';
import { Trophy } from 'lucide-react';
import { getPlayers } from '@/lib/db/repository';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { PlayerCard } from '@/components/players/PlayerCard';
import { PlayerSearchFilters } from '@/components/players/PlayerSearchFilters';
import type { PlayerFilterParams } from '@/types/database';

export const dynamic = 'force-dynamic';

interface CompletedAuctionsPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function CompletedAuctionsPage({ searchParams }: CompletedAuctionsPageProps) {
  const sp = await searchParams;
  const search = typeof sp.search === 'string' ? sp.search : '';
  const nationality = typeof sp.nationality === 'string' ? sp.nationality : 'all';
  const position = typeof sp.position === 'string' ? sp.position : 'all';
  const sortBy =
    (typeof sp.sortBy === 'string' ? sp.sortBy : 'highest_bid_desc') as PlayerFilterParams['sortBy'];
  const demoFilter =
    (typeof sp.demoFilter === 'string' ? sp.demoFilter : 'all') as PlayerFilterParams['demoFilter'];
  const page = typeof sp.page === 'string' ? Number(sp.page) || 1 : 1;

  const [user, result] = await Promise.all([
    getCurrentUserProfile(),
    getPlayers({
      search,
      nationality,
      position,
      status: 'completed',
      sortBy,
      demoFilter,
      page,
      pageSize: 9,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="border-b border-slate-800/80 pb-6">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
          <Trophy className="h-4 w-4" />
          <span>Historical Transfer Archive</span>
        </div>
        <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-white">
          Completed Auctions &amp; Results
        </h1>
        <p className="mt-1 text-sm text-slate-400">
          Review finalized player auctions, winning club bidders, sold valuations, and unsold
          listings.
        </p>
      </div>

      <Suspense fallback={<div className="h-28 rounded-2xl bg-navy-900 animate-pulse" />}>
        <PlayerSearchFilters
          nationalities={result.nationalities}
          totalCount={result.totalCount}
          page={result.page}
          totalPages={result.totalPages}
          hideStatusFilter
        />
      </Suspense>

      {result.players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-navy-900/50 py-16 px-4 text-center">
          <p className="text-lg font-bold text-white">No completed auctions found</p>
          <p className="mt-1 text-xs text-slate-400">
            Completed and sold auctions will appear here once their bidding windows conclude.
          </p>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
          {result.players.map((player) => (
            <PlayerCard
              key={player.id}
              player={player}
              serverTimeUtc={result.serverTimeUtc}
              currentUserId={user?.id}
            />
          ))}
        </div>
      )}
    </div>
  );
}
