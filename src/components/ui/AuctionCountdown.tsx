'use client';

import React, { useEffect, useRef, useState } from 'react';
import { Clock, Trophy, Ban, CalendarClock } from 'lucide-react';
import {
  calculateAuctionCountdown,
  formatCurrency,
  formatDhakaDateTime,
} from '@/lib/timezone';
import { syncServerAuctionStateAction } from '@/app/actions/bidding';
import type { AuctionStatus } from '@/types/database';

interface AuctionCountdownProps {
  playerId?: string;
  startTimeUtc: string;
  endTimeUtc: string;
  serverTimeUtc: string;
  status: AuctionStatus;
  winnerName?: string | null;
  finalAmount?: number | null;
  variant?: 'card' | 'detail';
  onBoundaryReached?: () => void;
}

export function AuctionCountdown({
  playerId,
  startTimeUtc,
  endTimeUtc,
  serverTimeUtc,
  status,
  winnerName,
  finalAmount,
  variant = 'card',
  onBoundaryReached,
}: AuctionCountdownProps) {
  // Compute initial offset between authoritative server UTC time and client clock
  const initialServerMs = new Date(serverTimeUtc).getTime();
  const mountClientMsRef = useRef<number>(Date.now());
  const clockOffsetMsRef = useRef<number>(
    Number.isNaN(initialServerMs) ? 0 : initialServerMs - Date.now()
  );
  const syncedTransitionRef = useRef<string | null>(null);

  const [nowServerMs, setNowServerMs] = useState<number>(() =>
    Number.isNaN(initialServerMs) ? Date.now() : initialServerMs
  );

  // Update offset whenever a fresh serverTimeUtc prop arrives from server or API
  useEffect(() => {
    const parsedServer = new Date(serverTimeUtc).getTime();
    if (!Number.isNaN(parsedServer)) {
      clockOffsetMsRef.current = parsedServer - Date.now();
      mountClientMsRef.current = Date.now();
      setNowServerMs(parsedServer);
    }
  }, [serverTimeUtc]);

  useEffect(() => {
    if (status === 'sold' || status === 'unsold' || status === 'cancelled' || status === 'draft') {
      return;
    }

    const interval = setInterval(() => {
      const authoritativeNow = Date.now() + clockOffsetMsRef.current;
      setNowServerMs(authoritativeNow);

      const startMs = new Date(startTimeUtc).getTime();
      const endMs = new Date(endTimeUtc).getTime();

      // Check if an upcoming auction just crossed its start time or a live auction crossed its end time
      if (status === 'upcoming' && authoritativeNow >= startMs && syncedTransitionRef.current !== 'started') {
        syncedTransitionRef.current = 'started';
        syncServerAuctionStateAction(playerId).then(() => {
          onBoundaryReached?.();
        });
      } else if (
        (status === 'live' || status === 'upcoming') &&
        authoritativeNow >= endMs &&
        syncedTransitionRef.current !== 'ended'
      ) {
        syncedTransitionRef.current = 'ended';
        syncServerAuctionStateAction(playerId).then(() => {
          onBoundaryReached?.();
        });
      }
    }, 1000);

    return () => clearInterval(interval);
  }, [status, startTimeUtc, endTimeUtc, playerId, onBoundaryReached]);

  const breakdown = calculateAuctionCountdown({
    startTimeUtc,
    endTimeUtc,
    serverNowMs: nowServerMs,
  });

  const pad = (n: number) => String(n).padStart(2, '0');

  // 1. SOLD STATE
  if (status === 'sold') {
    return (
      <div
        className={`rounded-xl border border-emerald-500/40 bg-emerald-950/30 ${
          variant === 'detail' ? 'p-4' : 'px-3 py-2.5'
        }`}
      >
        <div className="flex items-center gap-2 text-emerald-300 font-bold text-xs uppercase tracking-wider">
          <Trophy className="h-4 w-4 text-emerald-400 shrink-0" />
          <span>Auction Ended — Player Sold</span>
        </div>
        <p className="mt-1 text-xs text-slate-200">
          {winnerName ? (
            <>
              Won by <span className="font-bold text-white">{winnerName}</span> for{' '}
              <span className="font-bold text-electric-400">{formatCurrency(finalAmount)}</span>
            </>
          ) : (
            <>
              Winning Bid:{' '}
              <span className="font-bold text-electric-400">{formatCurrency(finalAmount)}</span>
            </>
          )}
        </p>
      </div>
    );
  }

  // 2. UNSOLD STATE
  if (status === 'unsold') {
    return (
      <div
        className={`rounded-xl border border-rose-500/35 bg-rose-950/25 ${
          variant === 'detail' ? 'p-4' : 'px-3 py-2.5'
        }`}
      >
        <div className="flex items-center gap-2 text-rose-300 font-bold text-xs uppercase tracking-wider">
          <Ban className="h-4 w-4 text-rose-400 shrink-0" />
          <span>Auction Ended — Unsold</span>
        </div>
        <p className="mt-1 text-xs text-slate-300">
          No valid bid was received during the scheduled bidding period.
        </p>
      </div>
    );
  }

  // 3. ENDED / PENDING VERIFICATION STATE
  if (status === 'ended' || breakdown.phase === 'ended') {
    return (
      <div
        className={`rounded-xl border border-amber-500/40 bg-amber-950/25 ${
          variant === 'detail' ? 'p-4' : 'px-3 py-2.5'
        }`}
      >
        <div className="flex items-center gap-2 text-amber-300 font-bold text-xs uppercase tracking-wider">
          <Clock className="h-4 w-4 text-amber-400 shrink-0" />
          <span>Auction Period Ended</span>
        </div>
        <p className="mt-1 text-xs text-slate-300">
          Closed on {formatDhakaDateTime(endTimeUtc)}
        </p>
      </div>
    );
  }

  // 4. UPCOMING AUCTION COUNTDOWN
  if (status === 'upcoming' || breakdown.phase === 'before_start') {
    return (
      <div
        className={`rounded-xl border border-sky-500/35 bg-sky-950/25 ${
          variant === 'detail' ? 'p-4' : 'px-3 py-2.5'
        }`}
      >
        <div className="flex items-center justify-between gap-2">
          <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-sky-300">
            <CalendarClock className="h-3.5 w-3.5 text-sky-400" />
            Starts In
          </span>
          <span className="font-mono text-sm font-extrabold tracking-wider text-white">
            {breakdown.days > 0 ? `${breakdown.days}d ` : ''}
            {pad(breakdown.hours)}h : {pad(breakdown.minutes)}m : {pad(breakdown.seconds)}s
          </span>
        </div>
        {variant === 'detail' && (
          <p className="mt-2 text-xs text-slate-300">
            Opens: <span className="text-sky-200 font-medium">{formatDhakaDateTime(startTimeUtc)}</span>
          </p>
        )}
      </div>
    );
  }

  // 5. ACTIVE (LIVE) AUCTION COUNTDOWN
  const isUrgent = breakdown.totalMs < 1000 * 60 * 60; // < 1 hour remaining

  if (variant === 'detail') {
    return (
      <div
        className={`rounded-2xl border p-4 ${
          isUrgent
            ? 'border-amber-500/60 bg-amber-950/30'
            : 'border-electric-500/40 bg-navy-900/90 shadow-electric-sm'
        }`}
      >
        <div className="flex items-center justify-between gap-2 mb-3">
          <span className="inline-flex items-center gap-2 text-xs font-bold uppercase tracking-wider text-electric-400">
            <Clock className="h-4 w-4 animate-pulse" />
            Time Remaining Until Auction Close
          </span>
          <span className="text-[11px] font-medium text-slate-400">Asia/Dhaka (BST)</span>
        </div>

        <div className="grid grid-cols-4 gap-2 text-center">
          <div className="rounded-xl bg-navy-950/90 border border-slate-800 py-2.5 px-2">
            <div className="font-mono text-2xl font-black text-white">{pad(breakdown.days)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Days
            </div>
          </div>
          <div className="rounded-xl bg-navy-950/90 border border-slate-800 py-2.5 px-2">
            <div className="font-mono text-2xl font-black text-white">{pad(breakdown.hours)}</div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Hours
            </div>
          </div>
          <div className="rounded-xl bg-navy-950/90 border border-slate-800 py-2.5 px-2">
            <div className="font-mono text-2xl font-black text-electric-400">
              {pad(breakdown.minutes)}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Mins
            </div>
          </div>
          <div className="rounded-xl bg-navy-950/90 border border-slate-800 py-2.5 px-2">
            <div className="font-mono text-2xl font-black text-electric-400">
              {pad(breakdown.seconds)}
            </div>
            <div className="text-[10px] font-semibold uppercase tracking-widest text-slate-400">
              Secs
            </div>
          </div>
        </div>

        <p className="mt-3 text-xs text-slate-300 flex items-center justify-between">
          <span>Deadline:</span>
          <span className="font-semibold text-white">{formatDhakaDateTime(endTimeUtc)}</span>
        </p>
      </div>
    );
  }

  return (
    <div
      className={`rounded-xl border px-3 py-2.5 ${
        isUrgent
          ? 'border-amber-500/50 bg-amber-950/30'
          : 'border-electric-500/35 bg-electric-500/10'
      }`}
    >
      <div className="flex items-center justify-between gap-2">
        <span className="inline-flex items-center gap-1.5 text-[11px] font-bold uppercase tracking-wider text-electric-400">
          <Clock className="h-3.5 w-3.5" />
          Ends In
        </span>
        <span className="font-mono text-sm font-extrabold tracking-wider text-white">
          {breakdown.days > 0 ? `${breakdown.days}d ` : ''}
          {pad(breakdown.hours)}h : {pad(breakdown.minutes)}m : {pad(breakdown.seconds)}s
        </span>
      </div>
    </div>
  );
}
