import React from 'react';
import Link from 'next/link';
import { Trophy, CheckCircle2, ArrowUpRight } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getUserDashboardData } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function UserAuctionResultsPage() {
  const user = await requireAuthenticatedUser('/dashboard/results');
  const { wonAuctions, myAuctionStandings } = await getUserDashboardData(user.id);

  const completedParticipated = myAuctionStandings.filter((item) =>
    ['ended', 'sold', 'unsold'].includes(item.player.effective_status)
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
          <Trophy className="h-4 w-4" />
          <span>Finalized Outcomes</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          My Auction Results &amp; Won Players
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Review players you have won at auction and the final outcome of completed auctions you
          participated in.
        </p>
      </div>

      {/* Won Players Section */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <h2 className="text-lg font-extrabold text-white">
          Players Won By Your Account ({wonAuctions.length})
        </h2>

        {wonAuctions.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">
            You have not won a finalized player auction yet.
          </p>
        ) : (
          <div className="grid grid-cols-1 gap-4 md:grid-cols-2">
            {wonAuctions.map((item) => (
              <div
                key={item.player.id}
                className="flex items-start justify-between gap-4 rounded-2xl border border-emerald-500/40 bg-emerald-950/20 p-5"
              >
                <div className="space-y-1.5">
                  <div className="inline-flex items-center gap-1.5 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
                    <Trophy className="h-4 w-4" />
                    <span>Winning Club Bid</span>
                  </div>
                  <h3 className="text-xl font-black text-white">{item.player.full_name}</h3>
                  <p className="text-xs text-slate-300">
                    {item.player.position} • {item.player.nationality} • {item.player.current_club}
                  </p>
                  <p className="text-sm font-bold text-electric-400 pt-1">
                    Final Transfer Price:{' '}
                    {formatCurrency(
                      item.player.result?.final_amount || item.player.current_highest_bid
                    )}
                  </p>
                  {item.player.result?.transaction_completed ? (
                    <p className="inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                      <CheckCircle2 className="h-3.5 w-3.5" />
                      Transaction Verified &amp; Completed
                    </p>
                  ) : (
                    <p className="text-[11px] text-amber-300">
                      Pending Admin Settlement Confirmation
                    </p>
                  )}
                </div>

                <Link
                  href={`/players/${item.player.id}`}
                  className="rounded-xl bg-electric-500 px-3.5 py-2 text-xs font-bold text-navy-950 hover:bg-electric-400 shrink-0"
                >
                  View Certificate
                </Link>
              </div>
            ))}
          </div>
        )}
      </div>

      {/* All Completed Auctions Participated In */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <h2 className="text-lg font-extrabold text-white">
          Completed Auctions You Participated In ({completedParticipated.length})
        </h2>

        {completedParticipated.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">
            No completed auctions found in your participation history.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 px-4">Your Max Bid</th>
                  <th className="py-3 px-4">Winning Bid</th>
                  <th className="py-3 px-4">Outcome for You</th>
                  <th className="py-3 px-4">Closed (BST)</th>
                  <th className="py-3 pl-4 text-right">Details</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {completedParticipated.map((item) => (
                  <tr key={item.player.id} className="hover:bg-navy-800/40">
                    <td className="py-3.5 pr-4 font-bold text-white">{item.player.full_name}</td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.player.effective_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 text-slate-300">
                      {formatCurrency(item.userHighestBid)}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-electric-400">
                      {formatCurrency(item.player.current_highest_bid)}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isHighestBidder ? (
                        <span className="font-bold text-emerald-400">WON</span>
                      ) : (
                        <span className="text-slate-400">Outbid</span>
                      )}
                    </td>
                    <td className="py-3.5 px-4 text-xs text-slate-400">
                      {formatDhakaDateTime(item.player.auction_end_time)}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Link
                        href={`/players/${item.player.id}`}
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
