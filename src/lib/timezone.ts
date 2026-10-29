import type { AuctionStatus } from '@/types/database';

export const DHAKA_TIMEZONE = 'Asia/Dhaka';

/**
 * Formats a UTC ISO timestamp or Date into Bangladesh Standard Time (Asia/Dhaka).
 * Example output: "29 Oct 2026, 06:30 PM BST"
 */
export function formatDhakaDateTime(utcInput: string | Date | null | undefined): string {
  if (!utcInput) return '—';
  const date = typeof utcInput === 'string' ? new Date(utcInput) : utcInput;
  if (Number.isNaN(date.getTime())) return 'Invalid Date';

  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    hour12: true,
  }).format(date);

  return `${formatted.toUpperCase()} BST`;
}

/**
 * Formats a UTC ISO timestamp with seconds in Asia/Dhaka for audit logs and bid histories.
 * Example output: "29 Oct 2026, 06:30:15 PM BST"
 */
export function formatDhakaTimestampWithSeconds(utcInput: string | Date | null | undefined): string {
  if (!utcInput) return '—';
  const date = typeof utcInput === 'string' ? new Date(utcInput) : utcInput;
  if (Number.isNaN(date.getTime())) return 'Invalid Date';

  const formatted = new Intl.DateTimeFormat('en-GB', {
    timeZone: DHAKA_TIMEZONE,
    day: '2-digit',
    month: 'short',
    year: 'numeric',
    hour: '2-digit',
    minute: '2-digit',
    second: '2-digit',
    hour12: true,
  }).format(date);

  return `${formatted.toUpperCase()} BST`;
}

/**
 * Converts a UTC ISO string into a `YYYY-MM-DDTHH:mm` string in Asia/Dhaka time
 * suitable for `<input type="datetime-local" />`.
 */
export function utcToDhakaInputString(utcInput: string | Date | null | undefined): string {
  if (!utcInput) return '';
  const date = typeof utcInput === 'string' ? new Date(utcInput) : utcInput;
  if (Number.isNaN(date.getTime())) return '';

  const parts = new Intl.DateTimeFormat('en-CA', {
    timeZone: DHAKA_TIMEZONE,
    year: 'numeric',
    month: '2-digit',
    day: '2-digit',
    hour: '2-digit',
    minute: '2-digit',
    hour12: false,
  }).formatToParts(date);

  const getPart = (type: string) => parts.find((p) => p.type === type)?.value || '00';
  const year = getPart('year');
  const month = getPart('month');
  const day = getPart('day');
  let hour = getPart('hour');
  if (hour === '24') hour = '00';
  const minute = getPart('minute');

  return `${year}-${month}-${day}T${hour}:${minute}`;
}

/**
 * Converts a `YYYY-MM-DDTHH:mm` string entered in Bangladesh Standard Time (Asia/Dhaka, +06:00)
 * into a canonical UTC ISO-8601 timestamp (`...Z`) for database storage.
 */
export function dhakaInputStringToUtcIso(dhakaInput: string): string {
  const trimmed = dhakaInput.trim();
  if (!trimmed) {
    throw new Error('Date and time are required.');
  }
  // If already has timezone offset or Z, parse directly
  if (trimmed.endsWith('Z') || /[+-]\d{2}:\d{2}$/.test(trimmed)) {
    const parsed = new Date(trimmed);
    if (Number.isNaN(parsed.getTime())) {
      throw new Error('Invalid date/time format.');
    }
    return parsed.toISOString();
  }

  // Append +06:00 for Asia/Dhaka (Bangladesh Standard Time does not observe DST)
  const withSeconds = /^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}$/.test(trimmed)
    ? `${trimmed}:00+06:00`
    : `${trimmed}+06:00`;

  const parsed = new Date(withSeconds);
  if (Number.isNaN(parsed.getTime())) {
    throw new Error('Invalid Asia/Dhaka date/time input.');
  }
  return parsed.toISOString();
}

/**
 * Computes the authoritative auction status given stored status, schedule, bids, and server UTC time.
 */
export function computeEffectiveAuctionStatus(params: {
  storedStatus: AuctionStatus;
  isPublished: boolean;
  startTimeUtc: string;
  endTimeUtc: string;
  currentHighestBid: number | null;
  serverNowMs?: number;
}): AuctionStatus {
  const {
    storedStatus,
    isPublished,
    startTimeUtc,
    endTimeUtc,
    currentHighestBid,
    serverNowMs = Date.now(),
  } = params;

  if (!isPublished || storedStatus === 'draft') {
    return 'draft';
  }
  if (storedStatus === 'cancelled') {
    return 'cancelled';
  }
  if (storedStatus === 'sold' || storedStatus === 'unsold') {
    return storedStatus;
  }

  const startMs = new Date(startTimeUtc).getTime();
  const endMs = new Date(endTimeUtc).getTime();

  if (serverNowMs < startMs) {
    return 'upcoming';
  }
  if (serverNowMs >= startMs && serverNowMs < endMs) {
    return 'live';
  }
  // Past end time
  if (storedStatus === 'ended') {
    return 'ended';
  }
  return currentHighestBid !== null && currentHighestBid > 0 ? 'sold' : 'unsold';
}

export interface CountdownBreakdown {
  totalMs: number;
  days: number;
  hours: number;
  minutes: number;
  seconds: number;
  isExpired: boolean;
  phase: 'before_start' | 'active' | 'ended';
  targetTimeUtc: string;
}

/**
 * Calculates countdown breakdown relative to authoritative server time.
 */
export function calculateAuctionCountdown(params: {
  startTimeUtc: string;
  endTimeUtc: string;
  serverNowMs: number;
}): CountdownBreakdown {
  const { startTimeUtc, endTimeUtc, serverNowMs } = params;
  const startMs = new Date(startTimeUtc).getTime();
  const endMs = new Date(endTimeUtc).getTime();

  if (serverNowMs < startMs) {
    const diff = Math.max(0, startMs - serverNowMs);
    return {
      ...splitMilliseconds(diff),
      isExpired: false,
      phase: 'before_start',
      targetTimeUtc: startTimeUtc,
    };
  }

  if (serverNowMs < endMs) {
    const diff = Math.max(0, endMs - serverNowMs);
    return {
      ...splitMilliseconds(diff),
      isExpired: false,
      phase: 'active',
      targetTimeUtc: endTimeUtc,
    };
  }

  return {
    totalMs: 0,
    days: 0,
    hours: 0,
    minutes: 0,
    seconds: 0,
    isExpired: true,
    phase: 'ended',
    targetTimeUtc: endTimeUtc,
  };
}

function splitMilliseconds(ms: number) {
  const totalSeconds = Math.floor(ms / 1000);
  const days = Math.floor(totalSeconds / 86400);
  const hours = Math.floor((totalSeconds % 86400) / 3600);
  const minutes = Math.floor((totalSeconds % 3600) / 60);
  const seconds = totalSeconds % 60;
  return { totalMs: ms, days, hours, minutes, seconds };
}

/**
 * Formats monetary amounts consistently in USD transfer valuation format.
 */
export function formatCurrency(amount: number | string | null | undefined): string {
  if (amount === null || amount === undefined || amount === '') return '—';
  const num = typeof amount === 'string' ? Number(amount) : amount;
  if (Number.isNaN(num)) return '—';

  return new Intl.NumberFormat('en-US', {
    style: 'currency',
    currency: 'USD',
    minimumFractionDigits: num % 1 === 0 ? 0 : 2,
    maximumFractionDigits: 2,
  }).format(num);
}
