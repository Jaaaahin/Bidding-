import React from 'react';
import Link from 'next/link';
import {
  Flame,
  Calendar,
  Trophy,
  ArrowRight,
  ShieldCheck,
  Clock,
  Gavel,
  Sparkles,
  Users,
} from 'lucide-react';
import { getPlayers } from '@/lib/db/repository';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { PlayerCard } from '@/components/players/PlayerCard';
import { formatCurrency } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export default async function HomePage() {
  const [user, liveResult, upcomingResult, completedResult, allPublished] = await Promise.all([
    getCurrentUserProfile(),
    getPlayers({ status: 'live', pageSize: 3, sortBy: 'ending_soon' }),
    getPlayers({ status: 'upcoming', pageSize: 3, sortBy: 'ending_soon' }),
    getPlayers({ status: 'completed', pageSize: 3, sortBy: 'highest_bid_desc' }),
    getPlayers({ pageSize: 50 }),
  ]);

  const serverTimeUtc = liveResult.serverTimeUtc;
  const totalVolume = allPublished.players.reduce(
    (sum, p) => sum + (p.current_highest_bid || 0),
    0
  );
  const totalBidsCount = allPublished.players.reduce((sum, p) => sum + p.bid_count, 0);

  return (
    <div className="space-y-16 pb-20">
      {/* HERO SECTION */}
      <section className="relative overflow-hidden border-b border-slate-800/80 pt-12 pb-16 sm:pt-16 sm:pb-24">
        <div className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 gap-12 lg:grid-cols-12 items-center">
            <div className="lg:col-span-7 space-y-6">
              <div className="inline-flex items-center gap-2 rounded-full border border-electric-500/40 bg-electric-500/10 px-4 py-1.5 text-xs font-extrabold uppercase tracking-wider text-electric-400 shadow-electric-sm">
                <Sparkles className="h-3.5 w-3.5" />
                <span>Official Football Transfer Bidding Marketplace</span>
              </div>

              <h1 className="text-4xl font-black tracking-tight text-white sm:text-5xl lg:text-6xl leading-[1.08]">
                Acquire Elite Football Talent in{' '}
                <span className="text-electric-500">Real-Time</span> Auctions.
              </h1>

              <p className="max-w-2xl text-base sm:text-lg text-slate-300 leading-relaxed">
                FootBid connects verified clubs and sporting directors with curated player listings.
                Every bid is validated on the server with PostgreSQL row-level locking and
                synchronized in <strong className="text-white">Bangladesh Standard Time (Asia/Dhaka)</strong>.
              </p>

              <div className="flex flex-wrap items-center gap-4 pt-2">
                <Link
                  href="/auctions/live"
                  className="inline-flex items-center gap-2.5 rounded-xl bg-electric-500 px-7 py-4 text-sm font-black uppercase tracking-wider text-navy-950 shadow-electric-glow hover:bg-electric-400 transition-all"
                >
                  <Flame className="h-5 w-5" />
                  <span>Enter Live Auctions ({liveResult.totalCount})</span>
                </Link>

                <Link
                  href="/players"
                  className="inline-flex items-center gap-2 rounded-xl border border-slate-700 bg-navy-900 px-6 py-4 text-sm font-bold text-white hover:border-electric-500/50 hover:bg-navy-800 transition-all"
                >
                  <Users className="h-4 w-4 text-electric-400" />
                  <span>Browse All Players</span>
                </Link>
              </div>

              {/* Key Trust Pillars */}
              <div className="grid grid-cols-1 sm:grid-cols-3 gap-4 pt-6 border-t border-slate-800/80">
                <div className="flex items-start gap-2.5">
                  <ShieldCheck className="h-5 w-5 text-electric-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">Concurrency-Safe Bids</p>
                    <p className="text-[11px] text-slate-400">PostgreSQL `FOR UPDATE` locks</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Clock className="h-5 w-5 text-sky-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">Server-Truth Timers</p>
                    <p className="text-[11px] text-slate-400">UTC stored, Asia/Dhaka displayed</p>
                  </div>
                </div>
                <div className="flex items-start gap-2.5">
                  <Gavel className="h-5 w-5 text-amber-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-xs font-bold text-white">Immutable Audit Log</p>
                    <p className="text-[11px] text-slate-400">Every accepted bid preserved</p>
                  </div>
                </div>
              </div>
            </div>

            {/* Right Column: Live Market Metrics Card */}
            <div className="lg:col-span-5">
              <div className="rounded-3xl border border-slate-800 bg-navy-900/95 p-6 sm:p-8 shadow-2xl space-y-6">
                <div className="flex items-center justify-between border-b border-slate-800 pb-4">
                  <div>
                    <span className="text-xs font-bold uppercase tracking-widest text-electric-400">
                      Transfer Window Pulse
                    </span>
                    <h2 className="text-xl font-black text-white mt-0.5">
                      Live Exchange Telemetry
                    </h2>
                  </div>
                  <span className="relative flex h-3 w-3">
                    <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-electric-400 opacity-75" />
                    <span className="relative inline-flex rounded-full h-3 w-3 bg-electric-500" />
                  </span>
                </div>

                <div className="grid grid-cols-2 gap-4">
                  <div className="rounded-2xl border border-slate-800 bg-navy-950/90 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Active Live Auctions
                    </p>
                    <p className="mt-1 text-3xl font-black text-electric-400">
                      {liveResult.totalCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-navy-950/90 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Upcoming Windows
                    </p>
                    <p className="mt-1 text-3xl font-black text-sky-400">
                      {upcomingResult.totalCount}
                    </p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-navy-950/90 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Total Bids Recorded
                    </p>
                    <p className="mt-1 text-2xl font-black text-white">{totalBidsCount}</p>
                  </div>
                  <div className="rounded-2xl border border-slate-800 bg-navy-950/90 p-4">
                    <p className="text-[11px] font-bold uppercase tracking-wider text-slate-400">
                      Active Bid Volume
                    </p>
                    <p className="mt-1 text-xl font-black text-emerald-400">
                      {formatCurrency(totalVolume)}
                    </p>
                  </div>
                </div>

                <div className="rounded-2xl border border-electric-500/30 bg-electric-500/10 p-4 text-xs text-slate-200 space-y-2">
                  <p className="font-bold text-electric-400 uppercase tracking-wider">
                    Club &amp; Scout Access
                  </p>
                  <p className="leading-relaxed">
                    {user
                      ? `Welcome back, ${user.full_name}. Your account is verified to place live bids.`
                      : 'Sign in or register a club account to participate in live player bidding and track your bidding history.'}
                  </p>
                  <div className="pt-1">
                    <Link
                      href={user ? '/dashboard' : '/register'}
                      className="inline-flex items-center gap-1.5 font-bold text-white hover:text-electric-400"
                    >
                      <span>{user ? 'Go to My Dashboard' : 'Create Bidder Account'}</span>
                      <ArrowRight className="h-3.5 w-3.5" />
                    </Link>
                  </div>
                </div>
              </div>
            </div>
          </div>
        </div>
      </section>

      {/* LIVE AUCTIONS SECTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
              <Flame className="h-4 w-4" />
              <span>Bidding Open Now</span>
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
              Live Player Auctions
            </h2>
          </div>
          <Link
            href="/auctions/live"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-electric-400 hover:text-electric-300"
          >
            <span>View All Live Auctions ({liveResult.totalCount})</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {liveResult.players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-navy-900/50 p-12 text-center">
            <p className="text-base font-bold text-white">No live auctions at this exact moment</p>
            <p className="mt-1 text-xs text-slate-400">
              Check upcoming scheduled auctions below or browse the full player directory.
            </p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {liveResult.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                serverTimeUtc={serverTimeUtc}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* UPCOMING AUCTIONS SECTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-sky-400">
              <Calendar className="h-4 w-4" />
              <span>Scheduled Windows</span>
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
              Upcoming Player Auctions
            </h2>
          </div>
          <Link
            href="/auctions/upcoming"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-sky-400 hover:text-sky-300"
          >
            <span>View All Upcoming ({upcomingResult.totalCount})</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {upcomingResult.players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-navy-900/50 p-10 text-center text-sm text-slate-400">
            No upcoming auctions are currently scheduled.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {upcomingResult.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                serverTimeUtc={serverTimeUtc}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </section>

      {/* COMPLETED AUCTIONS SECTION */}
      <section className="mx-auto max-w-7xl px-4 sm:px-6 lg:px-8 space-y-6">
        <div className="flex flex-col sm:flex-row sm:items-end justify-between gap-4">
          <div>
            <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-emerald-400">
              <Trophy className="h-4 w-4" />
              <span>Finalized Outcomes</span>
            </div>
            <h2 className="mt-1 text-2xl sm:text-3xl font-black text-white">
              Completed &amp; Settled Auctions
            </h2>
          </div>
          <Link
            href="/auctions/completed"
            className="inline-flex items-center gap-1.5 text-sm font-bold text-emerald-400 hover:text-emerald-300"
          >
            <span>View All Completed ({completedResult.totalCount})</span>
            <ArrowRight className="h-4 w-4" />
          </Link>
        </div>

        {completedResult.players.length === 0 ? (
          <div className="rounded-2xl border border-dashed border-slate-800 bg-navy-900/50 p-10 text-center text-sm text-slate-400">
            No completed auctions yet.
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6 md:grid-cols-2 lg:grid-cols-3">
            {completedResult.players.map((player) => (
              <PlayerCard
                key={player.id}
                player={player}
                serverTimeUtc={serverTimeUtc}
                currentUserId={user?.id}
              />
            ))}
          </div>
        )}
      </section>
    </div>
  );
}
