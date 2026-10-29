import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  Gavel,
  Crown,
  CheckCircle2,
  ExternalLink,
  CalendarClock,
} from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getBidsForPlayer, getPlayerById } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { AuctionCountdown } from '@/components/ui/AuctionCountdown';
import { AdminPlayerRowActions } from '@/components/admin/AdminPlayerRowActions';
import {
  formatCurrency,
  formatDhakaDateTime,
  formatDhakaTimestampWithSeconds,
} from '@/lib/timezone';

export const dynamic = 'force-dynamic';

interface AdminAuctionDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function AdminAuctionDetailPage({
  params,
}: AdminAuctionDetailPageProps) {
  await requireAdminUser();
  const { id } = await params;
  const { player, serverTimeUtc } = await getPlayerById(id, true);

  if (!player) {
    notFound();
  }

  const bids = await getBidsForPlayer(player.id);

  return (
    <div className="space-y-8">
      <div className="flex flex-wrap items-center justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div className="space-y-1">
          <Link
            href="/admin/auctions"
            className="inline-flex items-center gap-1.5 text-xs font-bold text-slate-400 hover:text-white"
          >
            <ArrowLeft className="h-3.5 w-3.5" />
            <span>Back to Manage Auctions</span>
          </Link>
          <div className="flex items-center gap-3 pt-1">
            <h1 className="text-2xl sm:text-3xl font-black text-white">
              Auction Inspection: {player.full_name}
            </h1>
            <StatusBadge status={player.effective_status} />
          </div>
        </div>

        <div className="flex flex-wrap items-center gap-2">
          <Link
            href={`/players/${player.id}`}
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-navy-800 px-3.5 py-2 text-xs font-bold text-white hover:bg-navy-700"
          >
            <ExternalLink className="h-3.5 w-3.5 text-electric-400" />
            <span>Public Listing View</span>
          </Link>
          <AdminPlayerRowActions player={player} showSettlementActions />
        </div>
      </div>

      {/* Valuation & Countdown */}
      <div className="grid grid-cols-1 gap-6 lg:grid-cols-12">
        <div className="lg:col-span-7 space-y-4">
          <PriceDisplay
            startingBid={player.starting_bid}
            currentHighestBid={player.current_highest_bid}
            minimumBidIncrement={player.minimum_bid_increment}
            bidCount={player.bid_count}
          />

          <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-5 space-y-3 text-xs">
            <h2 className="flex items-center gap-2 text-sm font-bold text-white">
              <CalendarClock className="h-4 w-4 text-electric-400" />
              <span>Schedule &amp; Settlement Metadata</span>
            </h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 gap-3 pt-1">
              <div className="rounded-xl bg-navy-950 p-3 border border-slate-800">
                <span className="text-slate-400 block">Scheduled Start (BST)</span>
                <strong className="text-white">
                  {formatDhakaDateTime(player.auction_start_time)}
                </strong>
              </div>
              <div className="rounded-xl bg-navy-950 p-3 border border-slate-800">
                <span className="text-slate-400 block">Scheduled End (BST)</span>
                <strong className="text-white">
                  {formatDhakaDateTime(player.auction_end_time)}
                </strong>
              </div>
              <div className="rounded-xl bg-navy-950 p-3 border border-slate-800">
                <span className="text-slate-400 block">Highest / Winning Bidder</span>
                <strong className="text-electric-400">
                  {player.result?.winner_name || player.highest_bidder_name || 'No Valid Bids'}
                </strong>
              </div>
              <div className="rounded-xl bg-navy-950 p-3 border border-slate-800">
                <span className="text-slate-400 block">Transaction Settlement</span>
                {player.result?.transaction_completed ? (
                  <strong className="text-emerald-400 inline-flex items-center gap-1">
                    <CheckCircle2 className="h-3.5 w-3.5" />
                    Completed ({formatDhakaDateTime(player.result.completed_at)})
                  </strong>
                ) : (
                  <strong className="text-amber-300">
                    {player.effective_status === 'sold'
                      ? 'Awaiting Settlement Confirmation'
                      : 'Not Applicable'}
                  </strong>
                )}
              </div>
            </div>
            {player.result?.notes && (
              <div className="rounded-xl bg-navy-950 p-3 border border-slate-800">
                <span className="text-slate-400 block">Settlement Notes:</span>
                <p className="text-slate-200 mt-0.5">{player.result.notes}</p>
              </div>
            )}
          </div>
        </div>

        <div className="lg:col-span-5">
          <AuctionCountdown
            playerId={player.id}
            startTimeUtc={player.auction_start_time}
            endTimeUtc={player.auction_end_time}
            serverTimeUtc={serverTimeUtc}
            status={player.effective_status}
            winnerName={player.result?.winner_name || player.highest_bidder_name}
            finalAmount={player.result?.final_amount || player.current_highest_bid}
            variant="detail"
          />
        </div>
      </div>

      {/* Complete Bid Audit Log for this Auction */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
            <Gavel className="h-5 w-5 text-electric-400" />
            <span>Complete Bidder Audit Trail ({bids.length})</span>
          </h2>
          <span className="text-xs text-slate-400">Sorted Highest → Lowest</span>
        </div>

        {bids.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">
            No bids have been placed on this auction.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Rank</th>
                  <th className="py-3 px-4">Bidder Name</th>
                  <th className="py-3 px-4">Bidder Email</th>
                  <th className="py-3 px-4">Bid Amount</th>
                  <th className="py-3 px-4">Previous High</th>
                  <th className="py-3 pl-4 text-right">Timestamp (BST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {bids.map((bid, idx) => (
                  <tr key={bid.id} className={idx === 0 ? 'bg-electric-500/5' : ''}>
                    <td className="py-3.5 pr-4">
                      {idx === 0 ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-electric-500/20 border border-electric-500/40 px-2.5 py-0.5 text-[11px] font-bold text-electric-400">
                          <Crown className="h-3 w-3" />
                          #1 Top Bid
                        </span>
                      ) : (
                        <span className="text-xs font-mono text-slate-400">#{idx + 1}</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-bold text-white">{bid.bidder_name}</td>
                    <td className="py-3.5 px-4 text-xs text-slate-300">{bid.bidder_email}</td>
                    <td className="py-3.5 px-4 font-extrabold text-electric-400">
                      {formatCurrency(bid.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {bid.previous_highest_bid
                        ? formatCurrency(bid.previous_highest_bid)
                        : 'Opening Bid'}
                    </td>
                    <td className="py-3.5 pl-4 text-right font-mono text-xs text-slate-300">
                      {formatDhakaTimestampWithSeconds(bid.created_at)}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
