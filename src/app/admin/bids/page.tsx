import React from 'react';
import Link from 'next/link';
import { Gavel, Crown, Users, ArrowUpRight } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getAdminDashboardData } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { formatCurrency, formatDhakaTimestampWithSeconds } from '@/lib/timezone';
import type { AuctionStatus } from '@/types/database';

export const dynamic = 'force-dynamic';

export default async function AdminBidsAndBiddersPage() {
  await requireAdminUser();
  const { allBids, profiles } = await getAdminDashboardData();

  return (
    <div className="space-y-8">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <Gavel className="h-4 w-4" />
          <span>Audit &amp; Compliance</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          All Bids &amp; Registered Bidders
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Review the complete immutable bid history across all auctions and inspect registered
          bidder accounts.
        </p>
      </div>

      {/* All Bids Table */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark space-y-4">
        <h2 className="text-lg font-extrabold text-white">
          Complete Platform Bid Ledger ({allBids.length})
        </h2>

        {allBids.length === 0 ? (
          <p className="text-xs text-slate-400 py-8 text-center">No bids recorded yet.</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Bidder</th>
                  <th className="py-3 px-4">Player</th>
                  <th className="py-3 px-4">Bid Amount</th>
                  <th className="py-3 px-4">Previous High</th>
                  <th className="py-3 px-4">Auction Status</th>
                  <th className="py-3 px-4">Timestamp (BST)</th>
                  <th className="py-3 pl-4 text-right">Inspect</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {allBids.map((bid) => (
                  <tr key={bid.id} className="hover:bg-navy-800/40">
                    <td className="py-3.5 pr-4">
                      <div className="font-bold text-white">{bid.bidder_name}</div>
                      <div className="text-xs text-slate-400">{bid.bidder_email}</div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-semibold text-white">{bid.player_name}</div>
                      <div className="text-xs text-slate-400">
                        {bid.player_position} • {bid.player_club}
                      </div>
                    </td>
                    <td className="py-3.5 px-4">
                      <div className="font-extrabold text-electric-400">
                        {formatCurrency(bid.amount)}
                      </div>
                      {bid.is_winning_bid && (
                        <span className="inline-flex items-center gap-1 text-[10px] font-bold text-electric-400">
                          <Crown className="h-3 w-3" />
                          Highest Bid
                        </span>
                      )}
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
                    <td className="py-3.5 px-4 font-mono text-xs text-slate-300">
                      {formatDhakaTimestampWithSeconds(bid.created_at)}
                    </td>
                    <td className="py-3.5 pl-4 text-right">
                      <Link
                        href={`/admin/auctions/${bid.player_id}`}
                        className="inline-flex items-center gap-1 text-xs font-bold text-sky-400 hover:underline"
                      >
                        <span>Auction</span>
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

      {/* Registered Users & Bidders Directory */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
          <Users className="h-5 w-5 text-electric-400" />
          <span>Registered Accounts ({profiles.length})</span>
        </h2>

        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-4">Full Name</th>
                <th className="py-3 px-4">Email</th>
                <th className="py-3 px-4">Club / Organization</th>
                <th className="py-3 px-4">Phone</th>
                <th className="py-3 pl-4 text-right">Role</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {profiles.map((p) => (
                <tr key={p.id} className="hover:bg-navy-800/40">
                  <td className="py-3 pr-4 font-bold text-white">{p.full_name}</td>
                  <td className="py-3 px-4 text-slate-300">{p.email}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{p.favorite_club || '—'}</td>
                  <td className="py-3 px-4 text-xs text-slate-400">{p.phone || '—'}</td>
                  <td className="py-3 pl-4 text-right">
                    <span
                      className={`rounded-full border px-2.5 py-0.5 text-[11px] font-bold uppercase ${
                        p.role === 'admin'
                          ? 'border-electric-500/40 bg-electric-500/15 text-electric-400'
                          : 'border-slate-700 bg-navy-800 text-slate-300'
                      }`}
                    >
                      {p.role}
                    </span>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>
    </div>
  );
}
