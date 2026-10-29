import React, { Suspense } from 'react';
import { Users } from 'lucide-react';
import { getPlayers } from '@/lib/db/repository';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { PlayerCard } from '@/components/players/PlayerCard';
import { PlayerSearchFilters } from '@/components/players/PlayerSearchFilters';
import type { PlayerFilterParams } from '@/types/database';

export const dynamic = 'force-dynamic';

interface PlayersPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function AllPlayersPage({ searchParams }: PlayersPageProps) {
  const sp = await searchParams;
  const search = typeof sp.search === 'string' ? sp.search : '';
  const nationality = typeof sp.nationality === 'string' ? sp.nationality : 'all';
  const position = typeof sp.position === 'string' ? sp.position : 'all';
  const status = typeof sp.status === 'string' ? sp.status : 'all';
  const sortBy =
    (typeof sp.sortBy === 'string' ? sp.sortBy : 'ending_soon') as PlayerFilterParams['sortBy'];
  const demoFilter =
    (typeof sp.demoFilter === 'string' ? sp.demoFilter : 'all') as PlayerFilterParams['demoFilter'];
  const page = typeof sp.page === 'string' ? Number(sp.page) || 1 : 1;

  const [user, result] = await Promise.all([
    getCurrentUserProfile(),
    getPlayers({
      search,
      nationality,
      position,
      status,
      sortBy,
      demoFilter,
      page,
      pageSize: 9,
    }),
  ]);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-6">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
            <Users className="h-4 w-4" />
            <span>Player Directory</span>
          </div>
          <h1 className="mt-1 text-3xl sm:text-4xl font-black tracking-tight text-white">
            All Published Players
          </h1>
          <p className="mt-1 text-sm text-slate-400">
            Search, filter, and sort published football players across live, upcoming, and completed
            auctions.
          </p>
        </div>
      </div>

      <Suspense fallback={<div className="h-28 rounded-2xl bg-navy-900 animate-pulse" />}>
        <PlayerSearchFilters
          nationalities={result.nationalities}
          totalCount={result.totalCount}
          page={result.page}
          totalPages={result.totalPages}
        />
      </Suspense>

      {result.players.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-navy-900/50 py-16 px-4 text-center">
          <p className="text-lg font-bold text-white">No players match your filter criteria</p>
          <p className="mt-1 text-xs text-slate-400">
            Try clearing your search term or selecting &ldquo;All Statuses&rdquo; and &ldquo;All
            Positions&rdquo;.
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
