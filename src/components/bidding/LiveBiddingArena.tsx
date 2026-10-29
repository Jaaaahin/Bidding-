'use client';

import React, { useCallback, useEffect, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import {
  Gavel,
  Crown,
  AlertCircle,
  Lock,
  ShieldCheck,
  RefreshCw,
  Trophy,
  History,
  CheckCircle2,
} from 'lucide-react';
import { submitBidAction } from '@/app/actions/bidding';
import { createBrowserSupabaseClient } from '@/lib/supabase/client';
import { PriceDisplay } from '@/components/ui/PriceDisplay';
import { AuctionCountdown } from '@/components/ui/AuctionCountdown';
import { useToast } from '@/components/ui/ToastProvider';
import {
  formatCurrency,
  formatDhakaDateTime,
  formatDhakaTimestampWithSeconds,
} from '@/lib/timezone';
import type { BidWithDetails, PlayerWithAuction, Profile } from '@/types/database';

interface LiveBiddingArenaProps {
  initialPlayer: PlayerWithAuction;
  initialBids: BidWithDetails[];
  initialServerTimeUtc: string;
  currentUser: Profile | null;
}

export function LiveBiddingArena({
  initialPlayer,
  initialBids,
  initialServerTimeUtc,
  currentUser,
}: LiveBiddingArenaProps) {
  const router = useRouter();
  const { showToast } = useToast();

  const [player, setPlayer] = useState<PlayerWithAuction>(initialPlayer);
  const [bids, setBids] = useState<BidWithDetails[]>(initialBids);
  const [serverTimeUtc, setServerTimeUtc] = useState<string>(initialServerTimeUtc);
  const [bidAmountInput, setBidAmountInput] = useState<string>(
    String(initialPlayer.next_minimum_bid)
  );
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [isRefreshing, setIsRefreshing] = useState(false);
  const [formError, setFormError] = useState<string | null>(null);
  const [idempotencySeed, setIdempotencySeed] = useState< string>(() =>
    `${Date.now()}-${Math.random().toString(36).slice(2, 9)}`
  );

  const fetchLiveAuctionState = useCallback(async (showSpinner = false) => {
    if (showSpinner) setIsRefreshing(true);
    try {
      const res = await fetch(`/api/auctions/${initialPlayer.id}/live`, {
        cache: 'no-store',
      });
      if (!res.ok) return;
      const data = await res.json();
      if (data.player) {
        setPlayer(data.player);
        setBids(data.bids || []);
        setServerTimeUtc(data.serverTimeUtc);
        setBidAmountInput((prev) => {
          const currentVal = Number(prev);
          if (Number.isNaN(currentVal) || currentVal < data.player.next_minimum_bid) {
            return String(data.player.next_minimum_bid);
          }
          return prev;
        });
      }
    } catch {
      // Ignore transient network poll errors
    } finally {
      if (showSpinner) setIsRefreshing(false);
    }
  }, [initialPlayer.id]);

  // Subscribe to Supabase Realtime if configured + periodic server synchronization
  useEffect(() => {
    const supabase = createBrowserSupabaseClient();
    let channel: ReturnType<NonNullable<typeof supabase>['channel']> | null = null;

    if (supabase) {
      channel = supabase
        .channel(`auction-room-${initialPlayer.id}`)
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'bids',
            filter: `player_id=eq.${initialPlayer.id}`,
          },
          () => {
            fetchLiveAuctionState(false);
          }
        )
        .on(
          'postgres_changes',
          {
            event: '*',
            schema: 'public',
            table: 'players',
            filter: `id=eq.${initialPlayer.id}`,
          },
          () => {
            fetchLiveAuctionState(false);
          }
        )
        .subscribe();
    }

    const pollInterval = setInterval(() => {
      if (player.effective_status === 'live' || player.effective_status === 'upcoming') {
        fetchLiveAuctionState(false);
      }
    }, 6000);

    return () => {
      clearInterval(pollInterval);
      if (supabase && channel) {
        supabase.removeChannel(channel);
      }
    };
  }, [initialPlayer.id, player.effective_status, fetchLiveAuctionState]);

  const isUserHighestBidder =
    Boolean(currentUser) && player.highest_bidder_id === currentUser?.id;
  const hasUserParticipated =
    Boolean(currentUser) && bids.some((b) => b.bidder_id === currentUser?.id);

  const handleQuickAmount = (targetAmount: number) => {
    setFormError(null);
    setBidAmountInput(String(targetAmount));
  };

  const handleBidSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setFormError(null);

    if (!currentUser) {
      router.push(`/login?next=/players/${player.id}`);
      return;
    }

    const numericBid = Number(bidAmountInput);
    if (!Number.isFinite(numericBid) || numericBid <= 0) {
      setFormError('Please enter a valid positive bid amount.');
      return;
    }

    if (numericBid < player.next_minimum_bid) {
      setFormError(
        `Minimum valid bid is ${formatCurrency(player.next_minimum_bid)} (Starting/Current + ${formatCurrency(player.minimum_bid_increment)} increment).`
      );
      return;
    }

    setIsSubmitting(true);
    try {
      const response = await submitBidAction({
        auctionOrPlayerId: player.auction_id || player.id,
        amount: numericBid,
        idempotencyKey: `bid-${currentUser.id}-${player.id}-${numericBid}-${idempotencySeed}`,
      });

      if (!response.success) {
        setFormError(response.error || 'Bid was rejected by server validation.');
        showToast({
          title: 'Bid Rejected',
          description: response.error || 'Could not place bid.',
          variant: 'error',
        });
        await fetchLiveAuctionState(false);
        return;
      }

      // Generate a fresh idempotency seed for the next intentional bid
      setIdempotencySeed(`${Date.now()}-${Math.random().toString(36).slice(2, 9)}`);

      showToast({
        title: 'Bid Accepted & Recorded!',
        description: `Your bid of ${formatCurrency(numericBid)} for ${player.full_name} is now the highest bid.`,
        variant: 'success',
      });

      await fetchLiveAuctionState(false);
      if (response.data?.next_minimum_bid) {
        setBidAmountInput(String(response.data.next_minimum_bid));
      }
      router.refresh();
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* 1. Price Valuation Summary */}
      <PriceDisplay
        startingBid={player.starting_bid}
        currentHighestBid={player.current_highest_bid}
        minimumBidIncrement={player.minimum_bid_increment}
        bidCount={player.bid_count}
      />

      {/* 2. Authoritative Countdown Timer */}
      <AuctionCountdown
        playerId={player.id}
        startTimeUtc={player.auction_start_time}
        endTimeUtc={player.auction_end_time}
        serverTimeUtc={serverTimeUtc}
        status={player.effective_status}
        winnerName={player.result?.winner_name || player.highest_bidder_name}
        finalAmount={player.result?.final_amount || player.current_highest_bid}
        variant="detail"
        onBoundaryReached={() => {
          fetchLiveAuctionState(false);
          router.refresh();
        }}
      />

      {/* 3. Bidder Standing Banner */}
      {currentUser && isUserHighestBidder && (
        <div className="flex items-center gap-3 rounded-2xl border border-electric-500/60 bg-electric-500/15 p-4 text-electric-400 shadow-electric-sm">
          <Crown className="h-6 w-6 shrink-0" />
          <div>
            <p className="text-sm font-extrabold uppercase tracking-wider text-white">
              {player.effective_status === 'sold'
                ? 'Congratulations! You Won This Auction'
                : 'You Are Currently The Highest Bidder'}
            </p>
            <p className="text-xs text-slate-200 mt-0.5">
              Leading bid: <strong>{formatCurrency(player.current_highest_bid)}</strong>. Live updates
              will notify you immediately if another club outbids you.
            </p>
          </div>
        </div>
      )}

      {currentUser && !isUserHighestBidder && hasUserParticipated && player.effective_status === 'live' && (
        <div className="flex items-center gap-3 rounded-2xl border border-amber-500/50 bg-amber-950/30 p-4 text-amber-300">
          <AlertCircle className="h-6 w-6 shrink-0 text-amber-400" />
          <div>
            <p className="text-sm font-bold uppercase tracking-wider text-white">
              You Have Been Outbid
            </p>
            <p className="text-xs text-slate-300 mt-0.5">
              Another bidder currently leads at{' '}
              <strong className="text-white">{formatCurrency(player.current_highest_bid)}</strong>.
              Place at least{' '}
              <strong className="text-electric-400">{formatCurrency(player.next_minimum_bid)}</strong>{' '}
              to reclaim the top spot.
            </p>
          </div>
        </div>
      )}

      {/* 4. Interactive Bidding Console */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/95 p-6 shadow-card-dark">
        <div className="flex items-center justify-between border-b border-slate-800 pb-4 mb-5">
          <div className="flex items-center gap-2.5">
            <div className="rounded-xl bg-electric-500/15 p-2 text-electric-400 border border-electric-500/30">
              <Gavel className="h-5 w-5" />
            </div>
            <div>
              <h2 className="text-lg font-extrabold text-white">Official Bidding Desk</h2>
              <p className="text-xs text-slate-400">
                Protected by PostgreSQL row-level locking &amp; server UTC verification
              </p>
            </div>
          </div>

          <button
            type="button"
            onClick={() => fetchLiveAuctionState(true)}
            disabled={isRefreshing}
            title="Refresh live state from server"
            className="inline-flex items-center gap-1.5 rounded-xl border border-slate-700 bg-navy-800 px-3 py-1.5 text-xs font-semibold text-slate-300 hover:text-white"
          >
            <RefreshCw className={`h-3.5 w-3.5 ${isRefreshing ? 'animate-spin text-electric-400' : ''}`} />
            <span>Sync</span>
          </button>
        </div>

        {/* Case A: Auction is LIVE */}
        {player.effective_status === 'live' ? (
          currentUser ? (
            <form onSubmit={handleBidSubmit} className="space-y-4">
              <div>
                <div className="flex items-center justify-between text-xs mb-2">
                  <label htmlFor="bid-amount-input" className="font-bold uppercase tracking-wider text-slate-300">
                    Your Bid Offer (USD)
                  </label>
                  <span className="text-slate-400">
                    Minimum Required:{' '}
                    <strong className="text-electric-400">
                      {formatCurrency(player.next_minimum_bid)}
                    </strong>
                  </span>
                </div>

                <div className="relative flex flex-col sm:flex-row gap-3">
                  <div className="relative flex-1">
                    <span className="pointer-events-none absolute left-4 top-1/2 -translate-y-1/2 text-lg font-bold text-slate-400">
                      $
                    </span>
                    <input
                      id="bid-amount-input"
                      type="number"
                      step="0.01"
                      min={player.next_minimum_bid}
                      required
                      value={bidAmountInput}
                      onChange={(e) => {
                        setFormError(null);
                        setBidAmountInput(e.target.value);
                      }}
                      disabled={isSubmitting}
                      className="w-full rounded-xl border border-slate-700 bg-navy-950 pl-9 pr-4 py-3.5 text-lg font-black text-white focus:border-electric-500 focus:outline-none"
                    />
                  </div>

                  <button
                    type="submit"
                    disabled={isSubmitting}
                    className="inline-flex items-center justify-center gap-2 rounded-xl bg-electric-500 px-7 py-3.5 text-sm font-black uppercase tracking-wider text-navy-950 shadow-electric-glow hover:bg-electric-400 transition-all disabled:opacity-50"
                  >
                    <Gavel className="h-4 w-4" />
                    <span>{isSubmitting ? 'Verifying Bid...' : 'Submit Official Bid'}</span>
                  </button>
                </div>
              </div>

              {/* Quick Increment Buttons */}
              <div className="flex flex-wrap items-center gap-2">
                <span className="text-xs font-semibold text-slate-400 mr-1">Quick Select:</span>
                {[
                  {
                    label: `Min (${formatCurrency(player.next_minimum_bid)})`,
                    val: player.next_minimum_bid,
                  },
                  {
                    label: `+2x Inc (${formatCurrency(player.next_minimum_bid + player.minimum_bid_increment)})`,
                    val: player.next_minimum_bid + player.minimum_bid_increment,
                  },
                  {
                    label: `+4x Inc (${formatCurrency(player.next_minimum_bid + player.minimum_bid_increment * 3)})`,
                    val: player.next_minimum_bid + player.minimum_bid_increment * 3,
                  },
                ].map((preset) => (
                  <button
                    key={preset.val}
                    type="button"
                    onClick={() => handleQuickAmount(preset.val)}
                    className="rounded-lg border border-slate-700 bg-navy-800 px-3 py-1.5 text-xs font-bold text-slate-200 hover:border-electric-500/50 hover:text-electric-400 transition-colors"
                  >
                    {preset.label}
                  </button>
                ))}
              </div>

              {formError && (
                <div
                  role="alert"
                  className="flex items-start gap-2.5 rounded-xl border border-red-500/50 bg-red-950/30 p-3.5 text-xs text-red-200"
                >
                  <AlertCircle className="h-4 w-4 text-red-400 shrink-0 mt-0.5" />
                  <span>{formError}</span>
                </div>
              )}

              <div className="flex items-center gap-2 text-[11px] text-slate-400 pt-1">
                <ShieldCheck className="h-4 w-4 text-electric-400 shrink-0" />
                <span>
                  All accepted bids are permanent, immutable, and bound by FootBid auction rules.
                </span>
              </div>
            </form>
          ) : (
            <div className="rounded-xl border border-slate-800 bg-navy-950/80 p-6 text-center space-y-4">
              <div className="mx-auto flex h-12 w-12 items-center justify-center rounded-full bg-electric-500/15 text-electric-400">
                <Lock className="h-6 w-6" />
              </div>
              <div>
                <h3 className="text-base font-bold text-white">
                  Sign In Required to Place a Bid
                </h3>
                <p className="mt-1 text-xs text-slate-400 max-w-md mx-auto">
                  Public visitors can monitor live auctions and countdowns in real time. Please sign
                  in or register an account to submit official bids.
                </p>
              </div>
              <div className="flex flex-wrap items-center justify-center gap-3">
                <Link
                  href={`/login?next=/players/${player.id}`}
                  className="rounded-xl bg-electric-500 px-6 py-2.5 text-sm font-bold text-navy-950 shadow-electric-sm hover:bg-electric-400"
                >
                  Sign In to Bid
                </Link>
                <Link
                  href="/register"
                  className="rounded-xl border border-slate-700 bg-navy-800 px-6 py-2.5 text-sm font-semibold text-white hover:bg-navy-700"
                >
                  Create Bidder Account
                </Link>
              </div>
            </div>
          )
        ) : player.effective_status === 'upcoming' ? (
          /* Case B: Auction is UPCOMING */
          <div className="rounded-xl border border-sky-500/30 bg-sky-950/20 p-5 text-center space-y-2">
            <p className="text-sm font-bold text-sky-300">
              Bidding Has Not Opened Yet
            </p>
            <p className="text-xs text-slate-300">
              This auction is scheduled to start on{' '}
              <strong className="text-white">{formatDhakaDateTime(player.auction_start_time)}</strong>.
              Bids placed before the official start time are automatically blocked by the server.
            </p>
          </div>
        ) : (
          /* Case C: Auction is ENDED / SOLD / UNSOLD */
          <div className="rounded-xl border border-slate-800 bg-navy-950/90 p-5 space-y-3">
            <div className="flex items-center justify-between">
              <span className="text-xs font-bold uppercase tracking-wider text-slate-400">
                Final Auction Status
              </span>
              <span className="text-xs font-semibold text-slate-300">
                Closed: {formatDhakaDateTime(player.auction_end_time)}
              </span>
            </div>

            {player.effective_status === 'sold' ? (
              <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 rounded-xl border border-emerald-500/30 bg-emerald-950/20 p-4">
                <div className="flex items-start gap-3">
                  <Trophy className="h-6 w-6 text-emerald-400 shrink-0 mt-0.5" />
                  <div>
                    <p className="text-sm font-extrabold text-white">
                      Winning Bidder:{' '}
                      <span className="text-electric-400">
                        {player.result?.winner_name || player.highest_bidder_name || 'Verified Club Bidder'}
                      </span>
                    </p>
                    <p className="text-xs text-slate-300 mt-0.5">
                      Final Winning Bid:{' '}
                      <strong className="text-white">
                        {formatCurrency(player.result?.final_amount || player.current_highest_bid)}
                      </strong>
                    </p>
                    {player.result?.transaction_completed && (
                      <p className="mt-1.5 inline-flex items-center gap-1 text-[11px] font-semibold text-emerald-300">
                        <CheckCircle2 className="h-3.5 w-3.5" />
                        Transfer Transaction Verified &amp; Completed by Admin
                      </p>
                    )}
                  </div>
                </div>
              </div>
            ) : (
              <div className="rounded-xl border border-rose-500/30 bg-rose-950/20 p-4 text-xs text-rose-200">
                <strong>Player Unsold:</strong> No valid bid meeting the starting valuation of{' '}
                {formatCurrency(player.starting_bid)} was received before the auction deadline.
              </div>
            )}
          </div>
        )}
      </div>

      {/* 5. Complete Bid Audit History */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 shadow-card-dark">
        <div className="flex items-center justify-between mb-4">
          <div className="flex items-center gap-2">
            <History className="h-5 w-5 text-electric-400" />
            <h3 className="text-base font-extrabold text-white">
              Official Bid History ({bids.length})
            </h3>
          </div>
          <span className="text-xs text-slate-400">Timestamps in Asia/Dhaka (BST)</span>
        </div>

        {bids.length === 0 ? (
          <div className="rounded-xl border border-dashed border-slate-800 py-10 text-center">
            <p className="text-sm font-semibold text-slate-300">No bids have been recorded yet</p>
            <p className="mt-1 text-xs text-slate-500">
              {player.effective_status === 'live'
                ? `Be the first to bid at the starting valuation of ${formatCurrency(player.starting_bid)}.`
                : 'Bid history will appear here once active bidding begins.'}
            </p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="border-b border-slate-800 text-[11px] font-bold uppercase tracking-wider text-slate-400">
                  <th className="py-3 pr-4">Rank</th>
                  <th className="py-3 px-4">Bidder</th>
                  <th className="py-3 px-4">Bid Amount</th>
                  <th className="py-3 px-4">Previous High</th>
                  <th className="py-3 pl-4 text-right">Timestamp (BST)</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-slate-800/70 text-sm">
                {bids.map((bid, idx) => {
                  const isTop = idx === 0;
                  const isOwn = currentUser?.id === bid.bidder_id;
                  return (
                    <tr
                      key={bid.id}
                      className={isTop ? 'bg-electric-500/5' : 'hover:bg-navy-800/40'}
                    >
                      <td className="py-3.5 pr-4">
                        {isTop ? (
                          <span className="inline-flex items-center gap-1 rounded-full bg-electric-500/20 border border-electric-500/40 px-2.5 py-0.5 text-[11px] font-bold text-electric-400">
                            <Crown className="h-3 w-3" />
                            {player.effective_status === 'sold' ? 'Winner' : '#1 High'}
                          </span>
                        ) : (
                          <span className="text-xs font-mono text-slate-500">#{idx + 1}</span>
                        )}
                      </td>
                      <td className="py-3.5 px-4 font-semibold text-white">
                        {bid.bidder_name}
                        {isOwn && (
                          <span className="ml-2 rounded bg-sky-500/20 px-1.5 py-0.5 text-[10px] font-bold text-sky-300">
                            YOU
                          </span>
                        )}
                      </td>
                      <td
                        className={`py-3.5 px-4 font-extrabold ${
                          isTop ? 'text-electric-400' : 'text-slate-200'
                        }`}
                      >
                        {formatCurrency(bid.amount)}
                      </td>
                      <td className="py-3.5 px-4 text-xs text-slate-400">
                        {bid.previous_highest_bid
                          ? formatCurrency(bid.previous_highest_bid)
                          : 'Opening Bid'}
                      </td>
                      <td className="py-3.5 pl-4 text-right text-xs font-mono text-slate-300">
                        {formatDhakaTimestampWithSeconds(bid.created_at)}
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
