import React from 'react';
import { Trophy, Ban, CheckCircle2 } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getAdminDashboardData } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AdminPlayerRowActions } from '@/components/admin/AdminPlayerRowActions';
import { formatCurrency, formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function AdminAuctionResultsPage() {
  await requireAdminUser();
  const { allPlayers } = await getAdminDashboardData();

  const soldOrEndedWithBids = allPlayers.filter(
    (p) =>
      p.effective_status === 'sold' ||
      (p.effective_status === 'ended' && p.current_highest_bid !== null)
  );
  const unsoldPlayers = allPlayers.filter(
    (p) =>
      p.effective_status === 'unsold' ||
      (p.effective_status === 'ended' && p.current_highest_bid === null)
  );

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
          <Trophy className="h-4 w-4" />
          <span>Settlement &amp; Outcomes</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          Auction Results, Winners &amp; Unsold Players
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Review winning club bidders, verify completed transfer transactions, and inspect unsold
          listings.
        </p>
      </div>

      {/* Winners & Sold Players Table */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
          <Trophy className="h-5 w-5 text-emerald-400" />
          <span>Winning Bidders &amp; Sold Players ({soldOrEndedWithBids.length})</span>
        </h2>

        {soldOrEndedWithBids.length === 0 ? (
          <p className="text-xs text-slate-400 py-6">No sold players recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 px-4">Winning Bidder</th>
                  <th className="py-3 px-4">Winning Amount</th>
                  <th className="py-3 px-4">Settlement Status</th>
                  <th className="py-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {soldOrEndedWithBids.map((player) => (
                  <tr key={player.id} className="hover:bg-navy-800/40">
                    <td className="py-4 pr-4">
                      <div className="font-bold text-white">{player.full_name}</div>
                      <div className="text-xs text-slate-400">
                        {player.position} • {player.current_club}
                      </div>
                    </td>
                    <td className="py-4 px-4">
                      <div className="font-bold text-electric-400">
                        {player.result?.winner_name || player.highest_bidder_name || 'Verified Bidder'}
                      </div>
                      <div className="text-xs text-slate-400">{player.bid_count} total bids</div>
                    </td>
                    <td className="py-4 px-4 font-extrabold text-white">
                      {formatCurrency(player.result?.final_amount || player.current_highest_bid)}
                    </td>
                    <td className="py-4 px-4">
                      {player.result?.transaction_completed ? (
                        <div className="space-y-0.5">
                          <span className="inline-flex items-center gap-1 rounded-full bg-emerald-500/20 border border-emerald-500/40 px-2.5 py-0.5 text-xs font-bold text-emerald-300">
                            <CheckCircle2 className="h-3.5 w-3.5" />
                            Transaction Completed
                          </span>
                          {player.result.completed_at && (
                            <p className="text-[11px] text-slate-400">
                              {formatDhakaDateTime(player.result.completed_at)}
                            </p>
                          )}
                        </div>
                      ) : (
                        <span className="rounded-full bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                          Awaiting Settlement Confirmation
                        </span>
                      )}
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <AdminPlayerRowActions player={player} showSettlementActions />
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* Unsold Players Table */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
          <Ban className="h-5 w-5 text-rose-400" />
          <span>Unsold Players ({unsoldPlayers.length})</span>
        </h2>

        {unsoldPlayers.length === 0 ? (
          <p className="text-xs text-slate-400 py-6">No unsold players recorded.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 px-4">Starting Price</th>
                  <th className="py-3 px-4">Ended At (BST)</th>
                  <th className="py-3 px-4">Status</th>
                  <th className="py-3 pl-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {unsoldPlayers.map((player) => (
                  <tr key={player.id} className="hover:bg-navy-800/40">
                    <td className="py-4 pr-4">
                      <div className="font-bold text-white">{player.full_name}</div>
                      <div className="text-xs text-slate-400">
                        {player.position} • {player.current_club}
                      </div>
                    </td>
                    <td className="py-4 px-4 text-slate-300">
                      {formatCurrency(player.starting_bid)}
                    </td>
                    <td className="py-4 px-4 text-xs text-slate-300">
                      {formatDhakaDateTime(player.auction_end_time)}
                    </td>
                    <td className="py-4 px-4">
                      <StatusBadge status={player.effective_status} size="sm" />
                    </td>
                    <td className="py-4 pl-4 text-right">
                      <AdminPlayerRowActions player={player} />
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
