import React from 'react';
import Link from 'next/link';
import { notFound } from 'next/navigation';
import {
  ArrowLeft,
  MapPin,
  Building2,
  UserCheck,
  Calendar,
  Edit3,
  Sparkles,
  FileText,
} from 'lucide-react';
import { getBidsForPlayer, getPlayerById } from '@/lib/db/repository';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { StatusBadge } from '@/components/ui/StatusBadge';
import { LiveBiddingArena } from '@/components/bidding/LiveBiddingArena';
import { formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

interface PlayerDetailPageProps {
  params: Promise<{ id: string }>;
}

export default async function PlayerDetailPage({ params }: PlayerDetailPageProps) {
  const { id } = await params;
  const user = await getCurrentUserProfile();
  const isAdmin = user?.role === 'admin';

  const { player, serverTimeUtc } = await getPlayerById(id, isAdmin);
  if (!player) {
    notFound();
  }

  const bids = await getBidsForPlayer(player.id);

  return (
    <div className="mx-auto max-w-7xl px-4 py-10 sm:px-6 lg:px-8 space-y-8">
      {/* Top Bar */}
      <div className="flex flex-wrap items-center justify-between gap-4">
        <Link
          href="/players"
          className="inline-flex items-center gap-2 rounded-xl border border-slate-800 bg-navy-900 px-4 py-2 text-xs font-bold uppercase tracking-wider text-slate-300 hover:border-slate-700 hover:text-white"
        >
          <ArrowLeft className="h-4 w-4" />
          <span>Back to All Players</span>
        </Link>

        {isAdmin && (
          <div className="flex items-center gap-2">
            <Link
              href={`/admin/players/${player.id}/edit`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-electric-500/40 bg-electric-500/15 px-4 py-2 text-xs font-bold text-electric-400 hover:bg-electric-500/25"
            >
              <Edit3 className="h-4 w-4" />
              <span>Admin: Edit Listing</span>
            </Link>
            <Link
              href={`/admin/auctions/${player.id}`}
              className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-navy-800 px-4 py-2 text-xs font-bold text-white hover:bg-navy-700"
            >
              <span>Admin Auction Control</span>
            </Link>
          </div>
        )}
      </div>

      {/* Main Grid */}
      <div className="grid grid-cols-1 gap-8 lg:grid-cols-12">
        {/* Left Column: Portrait & Scouting Profile */}
        <div className="lg:col-span-5 space-y-6">
          <div className="overflow-hidden rounded-3xl border border-slate-800 bg-navy-900/95 shadow-2xl">
            <div className="relative h-96 w-full bg-navy-950">
              {/* eslint-disable-next-line @next/next/no-img-element */}
              <img
                src={player.photo_url || '/players/default-player.svg'}
                alt={player.full_name}
                className="h-full w-full object-cover object-top"
              />
              <div className="absolute inset-0 bg-gradient-to-t from-navy-900 via-transparent to-transparent" />

              <div className="absolute left-4 right-4 top-4 flex items-center justify-between gap-2">
                <StatusBadge status={player.effective_status} size="lg" />
                {player.is_demo && (
                  <span className="inline-flex items-center gap-1 rounded-full border border-slate-700 bg-navy-950/90 px-3 py-1 text-xs font-semibold text-amber-300">
                    <Sparkles className="h-3.5 w-3.5" />
                    Sample Demo Record
                  </span>
                )}
              </div>
            </div>

            <div className="p-6 space-y-5">
              <div>
                <div className="flex flex-wrap items-center gap-2 mb-2">
                  <span className="rounded-lg bg-electric-500/15 border border-electric-500/30 px-3 py-1 text-xs font-extrabold uppercase tracking-wider text-electric-400">
                    {player.position}
                  </span>
                  <span className="rounded-lg bg-navy-800 border border-slate-700 px-3 py-1 text-xs font-bold text-slate-200">
                    Age {player.age}
                  </span>
                </div>
                <h1 className="text-3xl font-black tracking-tight text-white">
                  {player.full_name}
                </h1>
              </div>

              <div className="grid grid-cols-2 gap-3 rounded-2xl bg-navy-950/90 border border-slate-800/80 p-4 text-xs">
                <div className="flex items-start gap-2.5">
                  <MapPin className="h-4 w-4 text-electric-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-slate-400">Nationality</span>
                    <strong className="text-white text-sm">{player.nationality}</strong>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Building2 className="h-4 w-4 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <span className="block text-slate-400">Current Club</span>
                    <strong className="text-white text-sm">{player.current_club}</strong>
                  </div>
                </div>
              </div>

              <div>
                <h2 className="flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-slate-400 mb-2">
                  <FileText className="h-4 w-4 text-electric-400" />
                  <span>Scouting Report &amp; Player Profile</span>
                </h2>
                <p className="text-sm leading-relaxed text-slate-200">{player.description}</p>
              </div>

              {/* Schedule & Metadata */}
              <div className="border-t border-slate-800 pt-4 space-y-2.5 text-xs">
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-sky-400" />
                    Auction Starts (BST):
                  </span>
                  <span className="font-semibold text-white">
                    {formatDhakaDateTime(player.auction_start_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between">
                  <span className="text-slate-400 inline-flex items-center gap-1.5">
                    <Calendar className="h-3.5 w-3.5 text-electric-400" />
                    Auction Ends (BST):
                  </span>
                  <span className="font-semibold text-white">
                    {formatDhakaDateTime(player.auction_end_time)}
                  </span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500 pt-1">
                  <span>Listing Created: {formatDhakaDateTime(player.created_at)}</span>
                </div>
                <div className="flex items-center justify-between text-[11px] text-slate-500">
                  <span>Last Updated: {formatDhakaDateTime(player.updated_at)}</span>
                </div>
              </div>
            </div>
          </div>
        </div>

        {/* Right Column: Live Bidding Arena & Bid History */}
        <div className="lg:col-span-7">
          <LiveBiddingArena
            initialPlayer={player}
            initialBids={bids}
            initialServerTimeUtc={serverTimeUtc}
            currentUser={user}
          />
        </div>
      </div>
    </div>
  );
}
