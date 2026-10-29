import React from 'react';
import Link from 'next/link';
import {
  Users,
  Flame,
  Gavel,
  Trophy,
  UserPlus,
  DollarSign,
  CheckCircle2,
  Calendar,
} from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getAdminDashboardData } from '@/lib/db/repository';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AdminPlayerRowActions } from '@/components/admin/AdminPlayerRowActions';
import { formatCurrency, formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function AdminDashboardPage() {
  await requireAdminUser();
  const { stats, allPlayers, allBids } = await getAdminDashboardData();

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-electric-400">
            Executive Overview
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
            Admin Command Dashboard
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Real-time statistics across player listings, active auctions, bidding volume, and
            finalized outcomes.
          </p>
        </div>

        <Link
          href="/admin/players/new"
          className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-navy-950 shadow-electric-sm hover:bg-electric-400"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Player Listing</span>
        </Link>
      </div>

      {/* Summary Statistics Grid */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Player Listings"
          value={stats.totalPlayers}
          subtitle={`${stats.publishedPlayers} published • ${stats.draftPlayers} drafts`}
          icon={<Users className="h-5 w-5" />}
          accent="sky"
        />
        <StatCard
          label="Active Live Auctions"
          value={stats.liveAuctions}
          subtitle={`${stats.upcomingAuctions} upcoming scheduled`}
          icon={<Flame className="h-5 w-5" />}
          accent="electric"
        />
        <StatCard
          label="Total Accepted Bids"
          value={stats.totalBids}
          subtitle={`Volume: ${formatCurrency(stats.totalBidVolume)}`}
          icon={<Gavel className="h-5 w-5" />}
          accent="amber"
        />
        <StatCard
          label="Completed Auctions"
          value={stats.completedAuctions}
          subtitle={`${stats.soldPlayers} sold • ${stats.unsoldPlayers} unsold`}
          icon={<Trophy className="h-5 w-5" />}
          accent="emerald"
        />
      </div>

      {/* Secondary Stats Row */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-3">
        <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Completed Settlements
            </p>
            <p className="mt-1 text-xl font-black text-emerald-400">
              {stats.completedTransactions} / {stats.soldPlayers} Sold
            </p>
          </div>
          <CheckCircle2 className="h-7 w-7 text-emerald-400/70" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Real vs Demo Separation
            </p>
            <p className="mt-1 text-xl font-black text-white">
              {stats.totalPlayers - stats.demoPlayers} Real • {stats.demoPlayers} Demo
            </p>
          </div>
          <Calendar className="h-7 w-7 text-sky-400/70" />
        </div>

        <div className="rounded-2xl border border-slate-800 bg-navy-900/80 p-4 flex items-center justify-between">
          <div>
            <p className="text-xs font-bold uppercase tracking-wider text-slate-400">
              Aggregate High Bids
            </p>
            <p className="mt-1 text-xl font-black text-electric-400">
              {formatCurrency(stats.totalBidVolume)}
            </p>
          </div>
          <DollarSign className="h-7 w-7 text-electric-400/70" />
        </div>
      </div>

      {/* Recent Player Listings & Quick Controls */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">
            Player Listings &amp; Auction Controls
          </h2>
          <Link
            href="/admin/players"
            className="text-xs font-bold text-electric-400 hover:underline"
          >
            Manage All Players →
          </Link>
        </div>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-4">Player</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 px-4">Starting / Current Bid</th>
                <th className="py-3 px-4">Ends (BST)</th>
                <th className="py-3 pl-4 text-right">Admin Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {allPlayers.slice(0, 6).map((player) => (
                <tr key={player.id} className="hover:bg-navy-800/40">
                  <td className="py-3.5 pr-4">
                    <div className="font-bold text-white flex items-center gap-2">
                      <span>{player.full_name}</span>
                      {player.is_demo && (
                        <span className="rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                          DEMO
                        </span>
                      )}
                    </div>
                    <div className="text-xs text-slate-400">
                      {player.position} • {player.nationality} • {player.current_club}
                    </div>
                  </td>
                  <td className="py-3.5 px-4">
                    <StatusBadge status={player.effective_status} size="sm" />
                  </td>
                  <td className="py-3.5 px-4">
                    <div className="text-xs text-slate-400">
                      Start: {formatCurrency(player.starting_bid)}
                    </div>
                    <div className="font-extrabold text-electric-400">
                      High: {formatCurrency(player.current_highest_bid)} ({player.bid_count} bids)
                    </div>
                  </td>
                  <td className="py-3.5 px-4 text-xs text-slate-300">
                    {formatDhakaDateTime(player.auction_end_time)}
                  </td>
                  <td className="py-3.5 pl-4 text-right">
                    <AdminPlayerRowActions player={player} showSettlementActions />
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* Recent Bids Across All Auctions */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">
            Latest Platform Bids ({allBids.length})
          </h2>
          <Link href="/admin/bids" className="text-xs font-bold text-electric-400 hover:underline">
            View All Bids &amp; Bidders →
          </Link>
        </div>

        {allBids.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No bids recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Bidder</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Bid Amount</th>
                  <th className="py-3 pl-4 text-right">Timestamp (BST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {allBids.slice(0, 6).map((bid) => (
                  <tr key={bid.id} className="hover:bg-navy-800/40">
                    <td className="py-3 pr-4">
                      <div className="font-bold text-white">{bid.bidder_name}</div>
                      <div className="text-xs text-slate-400">{bid.bidder_email}</div>
                    </td>
                    <td className="py-3 px-4 font-semibold text-slate-200">{bid.player_name}</td>
                    <td className="py-3 px-4 font-extrabold text-electric-400">
                      {formatCurrency(bid.amount)}
                    </td>
                    <td className="py-3 pl-4 text-right text-xs font-mono text-slate-300">
                      {formatDhakaDateTime(bid.created_at)}
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
