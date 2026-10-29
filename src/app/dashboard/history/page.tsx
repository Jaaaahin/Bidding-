import React from 'react';
import Link from 'next/link';
import { History, Crown, ArrowUpRight } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getUserDashboardData } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDhakaTimestampWithSeconds } from '@/lib/timezone';
import type { AuctionStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function BiddingHistoryPage() {
  const user = await requireAuthenticatedUser('/dashboard/history');
  const { biddingHistory } = await getUserDashboardData(user.id);

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <History className="h-4 w-4" />
          <span>Immutable Audit Trail</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          Personal Bidding History
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Complete chronological log of all accepted bids submitted by your account, displayed in
          Bangladesh Standard Time (Asia/Dhaka).
        </p>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark">
        {biddingHistory.length === 0 ? (
          <div className="py-12 text-center space-y-2">
            <p className="text-base font-bold text-white">No bidding records yet</p>
            <p className="text-xs text-slate-400">
              Every accepted bid you place during live auctions will be permanently recorded here.
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 px-4">Bid Amount</th>
                  <th className="py-3 px-4">Previous High</th>
                  <th className="py-3 px-4">Auction Status</th>
                  <th className="py-3 px-4">Standing</th>
                  <th className="py-3 px-4">Timestamp (BST)</th>
                  <th className="py-3 pl-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {biddingHistory.map((bid) => (
                  <tr key={bid.id} className="hover:bg-navy-800/40">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-white">{bid.player_name}</div>
                      <div className="text-xs text-slate-400">
                        {bid.player_position} • {bid.player_club}
                      </div>
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-electric-400">
                      {formatCurrency(bid.amount)}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {bid.previous_highest_bid
                        ? formatCurrency(bid.previous_highest_bid)
                        : 'Opening Bid'}
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge
                        status={(bid.auction_status || 'live') as AuctionStatus}
                        size="sm"
                      />
                    </td>
                    <td className="py-3.5 px-4">
                      {bid.is_winning_bid ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-electric-500/20 border border-electric-500/40 px-2.5 py-0.5 text-[11px] font-bold text-electric-400">
                          <Crown className="h-3 w-3" />
                          Leading Bid
                        </span>
                      ) : (
                        <span className="text-xs text-slate-400">Surpassed</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {formatDhakaTimestampWithSeconds(bid.created_at)}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Link
                        href={`/players/${bid.player_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:underline"
                      >
                        <span>View</span>
                        <ArrowUpRight className="h-3.5 w-3.5" />
                      </Link>
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
