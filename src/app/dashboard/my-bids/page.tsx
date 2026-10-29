import React from 'react';
import Link from 'next/link';
import { Gavel, Crown, AlertCircle, ArrowUpRight } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getUserDashboardData } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AuctionCountdown } from '@/components/ui/AuctionCountdown';
import { formatCurrency } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function MyBidsPage() {
  const user = await requireAuthenticatedUser('/dashboard/my-bids');
  const { myAuctionStandings, serverTimeUtc } = await getUserDashboardData(user.id);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <Gavel className="h-4 w-4" />
          <span>Active &amp; Participated Auctions</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">My Bids &amp; Standings</h1>
        <p className="mt-1 text-xs text-slate-400">
          Track every player auction you have bid on and verify whether you are currently the
          highest bidder.
        </p>
      </div>

      {myAuctionStandings.length === 0 ? (
        <div className="rounded-2xl border border-dashed border-slate-800 bg-navy-900/50 py-16 px-4 text-center space-y-3">
          <p className="text-base font-bold text-white">No bids placed yet</p>
          <p className="text-xs text-slate-400 max-w-md mx-auto">
            Browse live player auctions to submit your first bid.
          </p>
          <Link
            href="/auctions/live"
            className="inline-flex items-center gap-1.5 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-bold text-navy-950"
          >
            <span>Explore Live Auctions</span>
            <ArrowUpRight className="h-4 w-4" />
          </Link>
        </div>
      ) : (
        <div className="grid grid-cols-1 gap-6 md:grid-cols-2">
          {myAuctionStandings.map((item) => (
            <div
              key={item.player.id}
              className="flex flex-col justify-between rounded-2xl border border-slate-800 bg-navy-900/90 p-5 shadow-card-dark space-y-4"
            >
              <div className="flex items-start gap-4">
                {/* eslint-disable-next-line @next/next/no-img-element */}
                <img
                  src={item.player.photo_url || '/players/default-player.svg'}
                  alt={item.player.full_name}
                  className="h-20 w-20 rounded-xl object-cover object-top border border-slate-700 shrink-0 bg-navy-950"
                />
                <div className="flex-1 min-w-0">
                  <div className="flex items-center justify-between gap-2">
                    <StatusBadge status={item.player.effective_status} size="sm" />
                    <span className="text-xs text-slate-400">
                      {item.userBidCount} {item.userBidCount === 1 ? 'bid' : 'bids'} by you
                    </span>
                  </div>
                  <Link
                    href={`/players/${item.player.id}`}
                    className="mt-2 block text-lg font-black text-white hover:text-electric-400 truncate"
                  >
                    {item.player.full_name}
                  </Link>
                  <p className="text-xs text-slate-400">
                    {item.player.position} • {item.player.nationality} • {item.player.current_club}
                  </p>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-xl bg-navy-950/90 border border-slate-800 p-3 text-xs">
                <div>
                  <span className="text-slate-400 block">Your Highest Bid</span>
                  <strong className="text-base font-extrabold text-white">
                    {formatCurrency(item.userHighestBid)}
                  </strong>
                </div>
                <div className="border-l border-slate-800 pl-3">
                  <span className="text-slate-400 block">Current Highest Bid</span>
                  <strong className="text-base font-extrabold text-electric-400">
                    {formatCurrency(item.player.current_highest_bid)}
                  </strong>
                </div>
              </div>

              {item.isHighestBidder ? (
                <div className="flex items-center gap-2 rounded-xl border border-electric-500/40 bg-electric-500/15 px-3.5 py-2.5 text-xs font-bold text-electric-400">
                  <Crown className="h-4 w-4 shrink-0" />
                  <span>
                    {item.player.effective_status === 'sold'
                      ? 'You Won This Player!'
                      : 'You are currently the Highest Bidder!'}
                  </span>
                </div>
              ) : (
                <div className="flex items-center gap-2 rounded-xl border border-amber-500/40 bg-amber-950/30 px-3.5 py-2.5 text-xs font-bold text-amber-300">
                  <AlertCircle className="h-4 w-4 shrink-0" />
                  <span>
                    Outbid — Next minimum bid is {formatCurrency(item.player.next_minimum_bid)}
                  </span>
                </div>
              )}

              <AuctionCountdown
                playerId={item.player.id}
                startTimeUtc={item.player.auction_start_time}
                endTimeUtc={item.player.auction_end_time}
                serverTimeUtc={serverTimeUtc}
                status={item.player.effective_status}
                winnerName={item.player.result?.winner_name || item.player.highest_bidder_name}
                finalAmount={item.player.result?.final_amount || item.player.current_highest_bid}
                variant="card"
              />

              <Link
                href={`/players/${item.player.id}`}
                className="flex w-full items-center justify-center gap-2 rounded-xl bg-electric-500 py-2.5 text-xs font-black uppercase tracking-wider text-navy-950 hover:bg-electric-400"
              >
                <span>
                  {item.player.effective_status === 'live'
                    ? item.isHighestBidder
                      ? 'Monitor Live Auction'
                      : 'Place Higher Bid Now'
                    : 'View Final Result'}
                </span>
                <ArrowUpRight className="h-4 w-4" />
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
