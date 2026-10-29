'use server';

import { revalidatePath } from 'next/cache';
import { getCurrentUserProfile } from '@/lib/auth/session';
import { placeBidTransaction, syncAllAuctionStatuses } from '@/lib/db/repository';

export interface PlaceBidActionResult {
  success: boolean;
  error?: string;
  data?: {
    bid_id: string;
    auction_id: string;
    player_id: string;
    amount: number;
    next_minimum_bid: number;
    created_at: string;
  };
}

export async function submitBidAction(input: {
  auctionOrPlayerId: string;
  amount: number;
  idempotencyKey: string;
}): Promise<PlaceBidActionResult> {
  try {
    const profile = await getCurrentUserProfile();
    if (!profile) {
      return {
        success: false,
        error: 'Authentication required: Please sign in before placing a bid.',
      };
    }

    const numericAmount = Number(input.amount);
    if (! Number.isFinite(numericAmount) || numericAmount <= 0) {
      return {
        success: false,
        error: 'Please enter a valid positive bid amount.',
      };
    }

    const result = await placeBidTransaction({
      auctionOrPlayerId: input.auctionOrPlayerId,
      userId: profile.id,
      amount: numericAmount,
      idempotencyKey: input.idempotencyKey,
    });

    revalidatePath('/');
    revalidatePath('/players');
    revalidatePath(`/players/${result.player_id}`);
    revalidatePath('/auctions/live');
    revalidatePath('/auctions/completed');
    revalidatePath('/dashboard');
    revalidatePath('/dashboard/my-bids');
    revalidatePath('/dashboard/history');
    revalidatePath('/dashboard/results');
    revalidatePath('/admin');
    revalidatePath('/admin/bids');
    revalidatePath('/admin/auctions');

    return {
      success: true,
      data: {
        bid_id: result.bid_id,
        auction_id: result.auction_id,
        player_id: result.player_id,
        amount: result.amount,
        next_minimum_bid: result.next_minimum_bid,
        created_at: result.created_at,
      },
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Bid could not be processed.',
    };
  }
}

/**
 * Invoked when a countdown reaches zero or when verifying server auction state.
 * Synchronizes auction statuses using authoritative server UTC time.
 */
export async function syncServerAuctionStateAction(playerId?: string): Promise<{
  synchronized: boolean;
  serverTimeUtc: string;
}> {
  await syncAllAuctionStatuses();
  revalidatePath('/');
  revalidatePath('/players');
  if (playerId) {
    revalidatePath(`/players/${playerId}`);
  }
  revalidatePath('/auctions/upcoming');
  revalidatePath('/auctions/live');
  revalidatePath('/auctions/completed');
  revalidatePath('/dashboard');
  revalidatePath('/admin');

  return {
    synchronized: true,
    serverTimeUtc: new Date().toISOString(),
  };
}
