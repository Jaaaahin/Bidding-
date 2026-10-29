import React from 'react';
import Link from 'next/link';
import { Users, UserPlus, Sparkles } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getAdminDashboardData } from '@/lib/db/repository';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { AdminPlayerRowActions } from '@/components/admin/AdminPlayerRowActions';
import { formatCurrency, formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function AdminManagePlayersPage() {
  await requireAdminUser();
  const { allPlayers } = await getAdminDashboardData();

  return (
    <div className="space-y-6">
      <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4 border-b border-slate-800/80 pb-5">
        <div>
          <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
            <Users className="h-4 w-4" />
            <span>Roster Administration</span>
          </div>
          <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
            Manage Player Listings ({allPlayers.length})
          </h1>
          <p className="mt-1 text-xs text-slate-400">
            Add, edit, publish, unpublish, or remove player listings. Unpublished drafts remain
            private to administrators.
          </p>
        </div>

        <Link
          href="/admin/players/new"
          className="inline-flex items-center gap-2 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-navy-950 shadow-electric-sm hover:bg-electric-400"
        >
          <UserPlus className="h-4 w-4" />
          <span>Add New Player</span>
        </Link>
      </div>

      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                <th className="py-3 pr-4">Player</th>
                <th className="py-3 px-4">Position / Club</th>
                <th className="py-3 px-4">Valuation Rules</th>
                <th className="py-3 px-4">Schedule (BST)</th>
                <th className="py-3 px-4">Status</th>
                <th className="py-3 pl-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-slate-800/70 text-sm">
              {allPlayers.map((player) => (
                <tr key={player.id} className="hover:bg-navy-800/40">
                  <td className="py-4 pr-4">
                    <div className="flex items-center gap-3">
                      {/* eslint-disable-next-line @next/next/no-img-element */}
                      <img
                        src={player.photo_url || '/players/default-player.svg'}
                        alt={player.full_name}
                        className="h-12 w-12 rounded-xl object-cover object-top border border-slate-700 bg-navy-950 shrink-0"
                      />
                      <div>
                        <div className="font-bold text-white flex items-center gap-2">
                          <Link
                            href={`/players/${player.id}`}
                            className="hover:text-electric-400 transition-colors"
                          >
                            {player.full_name}
                          </Link>
                          {player.is_demo && (
                            <span className="inline-flex items-center gap-0.5 rounded bg-slate-800 px-1.5 py-0.5 text-[10px] font-semibold text-amber-300">
                              <Sparkles className="h-2.5 w-2.5" />
                              DEMO
                            </span>
                          )}
                        </div>
                        <div className="text-xs text-slate-400">
                          Age {player.age} • {player.nationality}
                        </div>
                      </div>
                    </div>
                  </td>
                  <td className="py-4 px-4">
                    <div className="font-semibold text-slate-200">{player.position}</div>
                    <div className="text-xs text-slate-400">{player.current_club}</div>
                  </td>
                  <td className="py-4 px-4 text-xs">
                    <div className="text-slate-300">
                      Start: <strong>{formatCurrency(player.starting_bid)}</strong>
                    </div>
                    <div className="text-sky-300">
                      Min Inc: +{formatCurrency(player.minimum_bid_increment)}
                    </div>
                    <div className="text-electric-400 font-bold">
                      High: {formatCurrency(player.current_highest_bid)} ({player.bid_count})
                    </div>
                  </td>
                  <td className="py-4 px-4 text-xs text-slate-300">
                    <div>Opens: {formatDhakaDateTime(player.auction_start_time)}</div>
                    <div className="text-slate-400 mt-0.5">
                      Ends: {formatDhakaDateTime(player.auction_end_time)}
                    </div>
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
      </div>
    </div>
  );
}
