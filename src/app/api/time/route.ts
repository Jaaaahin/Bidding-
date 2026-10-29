import { NextResponse } from 'next/server';
import { DHAKA_TIMEZONE, formatDhakaDateTime } from '@/lib/timezone';

export const dynamic = 'force-dynamic';

export async function GET() {
  const now = new Date();
  return NextResponse.json({
    serverTimeUtc: now.toISOString(),
    serverEpochMs: now.getTime(),
    displayTimezone: DHAKA_TIMEZONE,
    dhakaFormatted: formatDhakaDateTime(now),
  });
}
