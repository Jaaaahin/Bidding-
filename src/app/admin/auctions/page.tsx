import React from 'react';
import Link from 'next/link';
import { CalendarClock, Crown } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getAdminDashboardData } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AuctionCountdown } from '@/components/ui/AuctionCountdown';
import { AdminPlayerRowActions } from '@/components/admin/AdminPlayerRowActions';
import { formatCurrency, formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function AdminManageAuctionsPage() {
  await requireAdminUser();
  const { allPlayers, serverTimeUtc } = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <CalendarClock className="h-4 w-4" />
          <span>Auction Schedule &amp; Lifecycle</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          Manage Auctions ({allPlayers.length})
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Monitor live countdowns, highest bidders, start/end schedules in Asia/Dhaka, and finalize
          or settle completed auctions.
        </p>
      </div>

      <div className="grid grid-cols-1 gap-6">
        {allPlayers.map((player) => (
          <div
            key={player.id}
            className="rounded-2xl border border-slate-800 bg-navy-900/90 p-5 shadow-card-dark space-y-4"
          >
            <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={player.photo_url || '/players/default-player.svg'}
                  alt={player.full_name}
                  className="h-16 w-16 rounded-xl object-cover object-top border border-slate-700 bg-navy-950 shrink-0"
                />
                <div>
                  <div className="flex flex-wrap items-center gap-2">
                    <StatusBadge status={player.effective_status} size="sm" />
                    <span className="text-xs text-slate-400">
                      Auction ID: <code className="text-slate-300">{player.auction_id.slice(0, 8)}</code>
                    </span>
                  </div>
                  <Link
                    href={`/admin/auctions/${player.id}`}
                    className="mt-1 block text-lg font-black text-white hover:text-electric-400"
                  >
                    {player.full_name}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {player.position} • {player.nationality} • {player.current_club}
                  </p>
                </div>
              </div>

              <AdminPlayerRowActions player={player} showSettlementActions />
            </div>

            <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 lg:grid-cols-4 rounded-xl bg-navy-950/90 border border-slate-800 p-4 text-xs">
              <div>
                <span className="text-slate-400 block">Starting / Min Increment</span>
                <strong className="text-white text-sm">
                  {formatCurrency(player.starting_bid)} (+{formatCurrency(player.minimum_bid_increment)})
                </strong>
              </div>
              <div>
                <span className="text-slate-400 block">Current Highest Bid ({player.bid_count})</span>
                <strong className="text-electric-400 text-sm font-extrabold">
                  {formatCurrency(player.current_highest_bid)}
                </strong>
                {player.highest_bidder_name && (
                  <span className="block text-[11px] text-slate-300 mt-0.5 flex items-center gap-1">
                    <Crown className="h-3 w-3 text-electric-400" />
                    {player.highest_bidder_name}
                  </span>
                )}
              </div>
              <div>
                <span className="text-slate-400 block">Schedule Window (BST)</span>
                <span className="block text-slate-200">
                  Start: {formatDhakaDateTime(player.auction_start_time)}
                </span>
                <span className="block text-slate-200 mt-0.5">
                  End: {formatDhakaDateTime(player.auction_end_time)}
                </span>
              </div>
              <div>
                <AuctionCountdown
                  playerId={player.id}
                  startTimeUtc={player.auction_start_time}
                  endTimeUtc={player.auction_end_time}
                  serverTimeUtc={serverTimeUtc}
                  status={player.effective_status}
                  winnerName={player.result?.winner_name || player.highest_bidder_name}
                  finalAmount={player.result?.final_amount || player.current_highest_bid}
                  variant="card"
                />
              </div>
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
