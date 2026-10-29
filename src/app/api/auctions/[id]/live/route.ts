import { NextResponse } from 'next/server';
import { getBidsForPlayer, getPlayerById } from '@/lib/db/repository';
import { getCurrentUserProfile } from '@/lib/auth/session';

export const dynamic = 'force-dynamic';

export async function GET(
  _request: Request,
  context: { params: Promise<{ id: string }> }
) {
  try {
    const { id } = await context.params;
    const profile = await getCurrentUserProfile();
    const isAdmin = profile?.role === 'admin';

    const { player, serverTimeUtc } = await getPlayerById(id, isAdmin);
    if (!player) {
      return NextResponse.json({ error: 'Auction not found.' }, { status: 404 });
    }

    const bids = await getBidsForPlayer(player.id);

    return NextResponse.json({
      player,
      bids,
      serverTimeUtc,
      currentUserId: profile?.id || null,
    });
  } catch (err) {
    return NextResponse.json(
      { error: err instanceof Error ? err.message : 'Failed to fetch live auction state.' },
      { status: 500 }
    );
  }
}
