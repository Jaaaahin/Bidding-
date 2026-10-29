import React from 'react';
import Link from 'next/link';
import { MapPin, Building2, ArrowUpRight, Crown, Sparkles, Gavel } from 'lucide-react';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { AuctionCountdown } from '@/components/ui/AuctionCountdown';
import { formatDhakaDateTime } from '@/lib/timezone';
import type { PlayerWithAuction } from '@/types/database';

interface PlayerCardProps {
  player: PlayerWithAuction;
  serverTimeUtc: string;
  currentUserId?: string | null;
}

const POSITION_COLORS: Record<string, string> = {
  Forward: 'bg-rose-500/20 text-rose-300 border-rose-500/30',
  Midfielder: 'bg-sky-500/20 text-sky-300 border-sky-500/30',
  Defender: 'bg-amber-500/20 text-amber-300 border-amber-500/30',
  Goalkeeper: 'bg-emerald-500/20 text-emerald-300 border-emerald-500/30',
};

export function PlayerCard({ player, serverTimeUtc, currentUserId }: PlayerCardProps) {
  const isUserLeading =
    Boolean(currentUserId) && player.highest_bidder_id === currentUserId;
  const posClass =
    POSITION_COLORS[player.position] || 'bg-slate-800 text-slate-200 border-slate-700';

  return (
    <article className="group relative flex flex-col overflow-hidden rounded-2xl border border-slate-800/90 bg-navy-900/90 shadow-card-dark transition-all duration-300 hover:-translate-y-1 hover:border-electric-500/50 hover:shadow-electric-sm">
      {/* Top Visual / Portrait */}
      <div className="relative h-64 w-full overflow-hidden bg-navy-950">
        {/* eslint-disable-next-line @next/next/no-img-element */}
        <img
          src={player.photo_url || '/players/default-player.svg'}
          alt={player.full_name}
          className="h-full w-full object-cover object-top transition-transform duration-500 group-hover:scale-105"
        />
        <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-navy-900/25 to-transparent" />

        {/* Status & Demo Badges */}
        <div className="absolute left-3.5 right-3.5 top-3.5 flex items-center justify-between gap-2">
          <StatusBadge status={player.effective_status} size="sm" />
          {player.is_demo && (
            <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-navy-950/85 px-2.5 py-0.5 text-[10px] font-semibold uppercase tracking-wider text-slate-300 backdrop-blur-md">
              <Sparkles className="h-3 w-3 text-amber-400" />
              Sample Demo
            </span>
          )}
        </div>

        {/* Leading Bidder Ribbon */}
        {isUserLeading && (
          <div className="absolute bottom-3 left-3.5 inline-flex items-center gap-1.5 rounded-full border border-electric-400 bg-electric-500 px-3 py-1 text-[11px] font-extrabold uppercase tracking-wider text-navy-950 shadow-electric-sm">
            <Crown className="h-3.5 w-3.5" />
            {player.effective_status === 'sold' ? 'You Won This Player' : 'You Are Highest Bidder'}
          </div>
        )}

        {/* Position & Age Pill */}
        <div className="absolute bottom-3 right-3.5 flex items-center gap-1.5">
          <span
            className={`rounded-lg border px-2.5 py-1 text-xs font-bold backdrop-blur-md ${posClass}`}
          >
            {player.position}
          </span>
          <span className="rounded-lg border border-slate-700 bg-navy-950/90 px-2.5 py-1 text-xs font-bold text-slate-200">
            Age {player.age}
          </span>
        </div>
      </div>

      {/* Card Body */}
      <div className="flex flex-1 flex-col justify-between p-5 space-y-4">
        <div>
          <div className="flex items-start justify-between gap-2">
            <Link
              href={`/players/${player.id}`}
              className="text-xl font-black tracking-tight text-white group-hover:text-electric-400 transition-colors"
            >
              {player.full_name}
            </Link>
            <span className="shrink-0 rounded-md bg-navy-800 px-2 py-0.5 text-[11px] font-semibold text-slate-300">
              {player.bid_count} {player.bid_count === 1 ? 'bid' : 'bids'}
            </span>
          </div>

          <div className="mt-2 flex flex-wrap items-center gap-x-4 gap-y-1 text-xs text-slate-300">
            <span className="inline-flex items-center gap-1.5">
              <MapPin className="h-3.5 w-3.5 text-electric-400" />
              {player.nationality}
            </span>
            <span className="inline-flex items-center gap-1.5">
              <Building2 className="h-3.5 w-3.5 text-sky-400" />
              {player.current_club}
            </span>
          </div>

          <p className="mt-2.5 line-clamp-2 text-xs leading-relaxed text-slate-400">
            {player.description}
          </p>
        </div>

        <div className="space-y-3 pt-1">
          <PriceDisplay
            startingBid={player.starting_bid}
            currentHighestBid={player.current_highest_bid}
            compact
          />

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

          <div className="flex items-center justify-between text-[11px] text-slate-400 px-0.5">
            <span>
              {player.effective_status === 'upcoming' ? 'Starts (BST):' : 'Ends (BST):'}
            </span>
            <span className="font-medium text-slate-300">
              {formatDhakaDateTime(
                player.effective_status === 'upcoming'
                  ? player.auction_start_time
                  : player.auction_end_time
              )}
            </span>
          </div>

          <Link
            href={`/players/${player.id}`}
            className={`flex w-full items-center justify-center gap-2 rounded-xl py-2.5 px-4 text-sm font-bold transition-all ${
              player.effective_status === 'live'
                ? 'bg-electric-500 text-navy-950 hover:bg-electric-400 shadow-electric-sm'
                : 'border border-slate-700 bg-navy-800 text-white hover:border-electric-500/50 hover:bg-navy-700'
            }`}
          >
            {player.effective_status === 'live' ? (
              <>
                <Gavel className="h-4 w-4" />
                <span>Place Bid — Min. ${player.next_minimum_bid.toLocaleString()}</span>
              </>
            ) : player.effective_status === 'upcoming' ? (
              <>
                <span>View Auction Schedule</span>
                <ArrowUpRight className="h-4 w-4" />
              </>
            ) : (
              <>
                <span>View Final Auction Result</span>
                <ArrowUpRight className="h-4 w-4" />
              </>
            )}
          </Link>
        </div>
      </div>
    </article>
  );
}
