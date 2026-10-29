import React from 'react';
import Link from 'next/link';
import {
  Gavel,
  Crown,
  Trophy,
  DollarSign,
  ArrowUpRight,
  AlertCircle,
  Flame,
} from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { getUserDashboardData } from '@/lib/db/repository';
import { StatCard } from '@/components/ui/StatCard';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

interface DashboardPageProps {
  searchParams: Promise<Record<string, string | string[] | undefined>>;
}

export default async function UserDashboardPage({ searchParams }: DashboardPageProps) {
  const sp = await searchParams;
  const adminDeniedError = sp.error === 'admin_access_required';

  const user = await requireAuthenticatedUser('/dashboard');
  const { summary, myAuctionStandings, biddingHistory } = await getUserDashboardData(user.id);

  return (
    <div className="space-y-8">
      {adminDeniedError && (
        <div
          role="alert"
          className="flex items-start gap-3 rounded-2xl border border-amber-500/50 bg-amber-950/30 p-4 text-xs text-amber-200"
        >
          <AlertCircle className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
          <div>
            <p className="font-bold text-white">Admin Access Restricted</p>
            <p className="mt-0.5">
              Your account has the standard <code>user</code> role. Only verified administrators can
              access the <code>/admin</code> command center.
            </p>
          </div>
        </div>
      )}

      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <span className="text-xs font-extrabold uppercase tracking-wider text-electric-400">
            Bidder Command Center
          </span>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
            Welcome, {user.full_name}
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Monitor your live highest-bidder standings, transfer commitments, and auction outcomes.
          </p>
        </div>

        <Link
          href="/auctions/live"
          className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-navy-950 shadow-electric-sm hover:bg-electric-400"
        >
          <Flame className="h-4 w-4" />
          <span>Browse Live Auctions</span>
        </Link>
      </div>

      {/* Summary Stats */}
      <div className="grid grid-cols-1 gap-4 sm:grid-cols-2 xl:grid-cols-4">
        <StatCard
          label="Total Bids Placed"
          value={summary.totalBidsPlaced}
          subtitle="Accepted permanent bids"
          icon={<Gavel className="h-5 w-5" />}
          accent="sky"
        />
        <StatCard
          label="Currently Leading"
          value={summary.currentlyLeadingCount}
          subtitle={`Out of ${summary.activeAuctionsParticipating} active auctions`}
          icon={<Crown className="h-5 w-5" />}
          accent="electric"
        />
        <StatCard
          label="Players Won"
          value={summary.auctionsWonCount}
          subtitle="Finalized winning auctions"
          icon={<Trophy className="h-5 w-5" />}
          accent="emerald"
        />
        <StatCard
          label="Committed Volume"
          value={formatCurrency(summary.totalCommittedAmount)}
          subtitle="Leading + won bid commitments"
          icon={<DollarSign className="h-5 w-5" />}
          accent="amber"
        />
      </div>

      {/* Active & Participated Auctions Standings */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">
            My Auction Standings ({myAuctionStandings.length})
          </h2>
          <Link
            href="/dashboard/my-bids"
            className="text-xs font-bold text-electric-400 hover:underline"
          >
            View All Active Bids →
          </Link>
        </div>

        {myAuctionStandings.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 py-12 text-center space-y-3">
            <p className="text-sm font-bold text-white">
              You have not placed any bids yet
            </p>
            <p className="text-xs text-slate-400 max-w-md mx-auto">
              Visit Live Auctions to inspect published football players and place your first official
              bid.
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
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Player</th>
                  <th className="py-3 px-4">Auction Status</th>
                  <th className="py-3 px-4">Your Highest Bid</th>
                  <th className="py-3 px-4">Current High Bid</th>
                  <th className="py-3 px-4">Your Standing</th>
                  <th className="py-3 pl-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {myAuctionStandings.slice(0, 6).map((item) => (
                  <tr key={item.player.id} className="hover:bg-navy-800/40">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-white">{item.player.full_name}</div>
                      <div className="text-xs text-slate-400">
                        {item.player.position} • {item.player.current_club}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <StatusBadge status={item.player.effective_status} size="sm" />
                    </td>
                    <td className="py-3.5 px-4 font-bold text-slate-200">
                      {formatCurrency(item.userHighestBid)}
                    </td>
                    <td className="py-3.5 px-4 font-extrabold text-electric-400">
                      {formatCurrency(item.player.current_highest_bid)}
                    </td>
                    <td className="py-3.5 px-4">
                      {item.isHighestBidder ? (
                        <span className="inline-flex items-center gap-1 rounded-full bg-electric-500/20 border border-electric-500/40 px-2.5 py-0.5 text-xs font-bold text-electric-400">
                          <Crown className="h-3.5 w-3.5" />
                          {item.player.effective_status === 'sold' ? 'Winner' : 'Highest Bidder'}
                        </span>
                      ) : (
                        <span className="inline-flex items-center gap-1 rounded-full bg-amber-500/15 border border-amber-500/35 px-2.5 py-0.5 text-xs font-bold text-amber-300">
                          Outbid
                        </span>
                      )}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Link
                        href={`/players/${item.player.id}`}
                        className="inline-flex items-center gap-1 rounded-lg border border-slate-700 bg-navy-800 px-3 py-1.5 text-xs font-bold text-white hover:border-electric-500/50"
                      >
                        <span>{item.player.effective_status === 'live' ? 'Bid Now' : 'View'}</span>
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

      {/* Recent Bids Feed */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <div className="flex items-center justify-between">
          <h2 className="text-lg font-extrabold text-white">Recent Bidding Activity</h2>
          <Link
            href="/dashboard/history"
            className="text-xs font-bold text-electric-400 hover:underline"
          >
            Full Audit History →
          </Link>
        </div>

        {biddingHistory.length === 0 ? (
          <p className="text-xs text-slate-400 py-4">No recent bidding activity recorded.</p>
        ) : (
          <div className="space-y-2.5">
            {biddingHistory.slice(0, 5).map((bid) => (
              <div
                key={bid.id}
                className="flex flex-col sm:flex-row sm:items-center justify-between gap-2 rounded-xl border border-slate-800/80 bg-navy-950/70 px-4 py-3 text-xs"
              >
                <div>
                  <span className="font-bold text-white">{bid.player_name}</span>
                  <span className="text-slate-400"> • Bid placed for </span>
                  <strong className="text-electric-400">{formatCurrency(bid.amount)}</strong>
                </div>
                <div className="flex items-center gap-3 text-slate-400">
                  <span>{formatDhakaDateTime(bid.created_at)}</span>
                  <Link
                    href={`/players/${bid.player_id}`}
                    className="font-bold text-sky-400 hover:underline"
                  >
                    Inspect
                  </Link>
                </div>
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
