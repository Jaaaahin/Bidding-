import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { createServiceRoleSupabaseClient } from '@/lib/supabase/admin';
import { withPgLock } from './postgres-engine';
import { computeEffectiveAuctionStatus } from '@/lib/timezone';
import type {
  AdminSummaryStats,
  AuctionStatus,
  BidWithDetails,
  PaginatedPlayersResult,
  PlayerFilterParams,
  PlayerPosition,
  PlayerWithAuction,
  Profile,
  UserDashboardSummary,
} from '@/types/database';

function toNum(val: unknown, fallback = 0): number {
  if (val === null || val === undefined || val === '') return fallback;
  const n = Number(val);
  return Number.isNaN(n) ? fallback : n;
}

function toNullableNum(val: unknown): number | null {
  if (val === null || val === undefined || val === '') return null;
  const n = Number(val);
  return Number.isNaN(n) ? null : n;
}

function toIso(val: unknown): string {
  if (!val) return new Date().toISOString();
  if (val instanceof Date) return val.toISOString();
  return new Date(String(val)).toISOString();
}

function mapRowToPlayerWithAuction(row: Record<string, unknown>, serverNowMs: number): PlayerWithAuction {
  const startingBid = toNum(row.starting_bid);
  const minIncrement = toNum(row.minimum_bid_increment);
  const currentHighest = toNullableNum(row.current_highest_bid);
  const storedStatus = (row.auction_status || row.status || 'upcoming') as AuctionStatus;
  const isPublished = Boolean(row.is_published);
  const startTimeUtc = toIso(row.auction_start_time || row.start_time);
  const endTimeUtc = toIso(row.auction_end_time || row.end_time);

  const effectiveStatus = computeEffectiveAuctionStatus({
    storedStatus,
    isPublished,
    startTimeUtc,
    endTimeUtc,
    currentHighestBid: currentHighest,
    serverNowMs,
  });

  const nextMinimumBid =
    currentHighest === null ? startingBid : Number((currentHighest + minIncrement).toFixed(2));

  const hasResult = Boolean(row.result_id);

  return {
    id: String(row.id),
    auction_id: String(row.auction_id || row.id),
    full_name: String(row.full_name),
    photo_url: String(row.photo_url || '/players/default-player.svg'),
    photo_storage_path: row.photo_storage_path ? String(row.photo_storage_path) : null,
    age: Number(row.age),
    nationality: String(row.nationality),
    position: row.position as PlayerPosition,
    current_club: String(row.current_club),
    description: String(row.description),
    starting_bid: startingBid,
    minimum_bid_increment: minIncrement,
    current_highest_bid: currentHighest,
    auction_start_time: startTimeUtc,
    auction_end_time: endTimeUtc,
    auction_status: storedStatus,
    effective_status: effectiveStatus,
    is_published: isPublished,
    is_demo: Boolean(row.is_demo),
    created_by: row.created_by ? String(row.created_by) : null,
    created_at: toIso(row.created_at),
    updated_at: toIso(row.updated_at),
    highest_bidder_id: row.highest_bidder_id ? String(row.highest_bidder_id) : null,
    highest_bidder_name: row.highest_bidder_name ? String(row.highest_bidder_name) : null,
    bid_count: Number(row.bid_count || 0),
    next_minimum_bid: nextMinimumBid,
    result: hasResult
      ? {
          id: String(row.result_id),
          outcome: row.result_outcome as 'sold' | 'unsold' | 'pending_settlement',
          winner_id: row.result_winner_id ? String(row.result_winner_id) : null,
          winner_name: row.result_winner_name ? String(row.result_winner_name) : null,
          final_amount: toNullableNum(row.result_final_amount),
          transaction_completed: Boolean(row.result_transaction_completed),
          completed_at: row.result_completed_at ? toIso(row.result_completed_at) : null,
          finalized_at: toIso(row.result_finalized_at),
          notes: row.result_notes ? String(row.result_notes) : null,
        }
      : null,
  };
}

/**
 * Synchronizes auction statuses (upcoming -> live, live -> sold/unsold) using server UTC time.
 */
export async function syncAllAuctionStatuses(referenceTimeUtc?: string): Promise<void> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = createServiceRoleSupabaseClient() || (await createServerSupabaseClient());
    if (supabase) {
      await supabase.rpc('sync_auction_statuses', {
        p_reference_time: referenceTimeUtc || new Date().toISOString(),
      });
      return;
    }
  }

  await withPgLock(async (db) => {
    await db.query(`SELECT public.sync_auction_statuses($1::timestamptz)`, [
      referenceTimeUtc || new Date().toISOString(),
    ]);
  });
}

/**
 * Queries players with filtering, search, sorting, and pagination.
 */
export async function getPlayers(params: PlayerFilterParams = {}): Promise<PaginatedPlayersResult> {
  await syncAllAuctionStatuses();

  const {
    search = '',
    nationality = '',
    position = '',
    status = '',
    sortBy = 'ending_soon',
    page = 1,
    pageSize = 9,
    includeUnpublished = false,
    demoFilter = 'all',
  } = params;

  const safePage = Math.max(1, Number(page) || 1);
  const safePageSize = Math.min(50, Math.max(1, Number(pageSize) || 9));
  const offset = (safePage - 1) * safePageSize;
  const serverNow = new Date();
  const serverNowMs = serverNow.getTime();

  return withPgLock(async (db) => {
    const conditions: string[] = [];
    const values: unknown[] = [];

    if (!includeUnpublished) {
      conditions.push(`p.is_published = true`);
    }

    if (demoFilter === 'real_only') {
      conditions.push(`p.is_demo = false`);
    } else if (demoFilter === 'demo_only') {
      conditions.push(`p.is_demo = true`);
    }

    if (search.trim()) {
      values.push(`%${search.trim()}%`);
      const idx = values.length;
      conditions.push(`(p.full_name ILIKE $${idx} OR p.current_club ILIKE $${idx} OR p.nationality ILIKE $${idx})`);
    }

    if (nationality.trim() && nationality !== 'all') {
      values.push(nationality.trim());
      conditions.push(`p.nationality = $${values.length}`);
    }

    if (position.trim() && position !== 'all') {
      values.push(position.trim());
      conditions.push(`p.position = $${values.length}`);
    }

    if (status.trim() && status !== 'all') {
      if (status === 'completed') {
        conditions.push(`p.auction_status IN ('ended', 'sold', 'unsold')`);
      } else {
        values.push(status.trim());
        conditions.push(`p.auction_status = $${values.length}`);
      }
    }

    const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

    let orderByClause = `ORDER BY p.auction_end_time ASC`;
    switch (sortBy) {
      case 'starting_price_asc':
        orderByClause = `ORDER BY p.starting_bid ASC, p.auction_end_time ASC`;
        break;
      case 'starting_price_desc':
        orderByClause = `ORDER BY p.starting_bid DESC, p.auction_end_time ASC`;
        break;
      case 'highest_bid_desc':
        orderByClause = `ORDER BY COALESCE(p.current_highest_bid, 0) DESC, p.starting_bid DESC`;
        break;
      case 'newest':
        orderByClause = `ORDER BY p.created_at DESC`;
        break;
      case 'ending_soon':
      default:
        orderByClause = `ORDER BY
          CASE
            WHEN p.auction_status = 'live' THEN 1
            WHEN p.auction_status = 'upcoming' THEN 2
            ELSE 3
          END ASC,
          p.auction_end_time ASC`;
        break;
    }

    const countQuery = `
      SELECT COUNT(*)::int AS total
      FROM public.players p
      ${whereClause}
    `;
    const countRes = await db.query<{ total: number }>(countQuery, values);
    const totalCount = countRes.rows[0]?.total || 0;

    const queryValues = [...values, safePageSize, offset];
    const limitIdx = values.length + 1;
    const offsetIdx = values.length + 2;

    const dataQuery = `
      SELECT
        p.*,
        a.id AS auction_id,
        a.highest_bidder_id,
        a.bid_count,
        hb.full_name AS highest_bidder_name,
        ar.id AS result_id,
        ar.outcome AS result_outcome,
        ar.winner_id AS result_winner_id,
        w.full_name AS result_winner_name,
        ar.final_amount AS result_final_amount,
        ar.transaction_completed AS result_transaction_completed,
        ar.completed_at AS result_completed_at,
        ar.finalized_at AS result_finalized_at,
        ar.notes AS result_notes
      FROM public.players p
      LEFT JOIN public.auctions a ON a.player_id = p.id
      LEFT JOIN public.profiles hb ON hb.id = a.highest_bidder_id
      LEFT JOIN public.auction_results ar ON ar.player_id = p.id
      LEFT JOIN public.profiles w ON w.id = ar.winner_id
      ${whereClause}
      ${orderByClause}
      LIMIT $${limitIdx} OFFSET $${offsetIdx}
    `;

    const dataRes = await db.query<Record<string, unknown>>(dataQuery, queryValues);
    const players = dataRes.rows.map((r) => mapRowToPlayerWithAuction(r, serverNowMs));

    const natQuery = includeUnpublished
      ? `SELECT DISTINCT nationality FROM public.players ORDER BY nationality ASC`
      : `SELECT DISTINCT nationality FROM public.players WHERE is_published = true ORDER BY nationality ASC`;
    const natRes = await db.query<{ nationality: string }>(natQuery);

    return {
      players,
      totalCount,
      page: safePage,
      pageSize: safePageSize,
      totalPages: Math.max(1, Math.ceil(totalCount / safePageSize)),
      nationalities: natRes.rows.map((r) => r.nationality),
      serverTimeUtc: serverNow.toISOString(),
    };
  });
}

/**
 * Fetches a single player and its auction + result details by ID (or auction ID).
 */
export async function getPlayerById(
  playerOrAuctionId: string,
  includeUnpublished = false
): Promise<{ player: PlayerWithAuction | null; serverTimeUtc: string }> {
  await syncAllAuctionStatuses();
  const serverNow = new Date();
  const serverNowMs = serverNow.getTime();

  return withPgLock(async (db) => {
    const publishCond = includeUnpublished ? '' : 'AND p.is_published = true';
    const res = await db.query<Record<string, unknown>>(
      `
      SELECT
        p.*,
        a.id AS auction_id,
        a.highest_bidder_id,
        a.bid_count,
        hb.full_name AS highest_bidder_name,
        ar.id AS result_id,
        ar.outcome AS result_outcome,
        ar.winner_id AS result_winner_id,
        w.full_name AS result_winner_name,
        ar.final_amount AS result_final_amount,
        ar.transaction_completed AS result_transaction_completed,
        ar.completed_at AS result_completed_at,
        ar.finalized_at AS result_finalized_at,
        ar.notes AS result_notes
      FROM public.players p
      LEFT JOIN public.auctions a ON a.player_id = p.id
      LEFT JOIN public.profiles hb ON hb.id = a.highest_bidder_id
      LEFT JOIN public.auction_results ar ON ar.player_id = p.id
      LEFT JOIN public.profiles w ON w.id = ar.winner_id
      WHERE (p.id::text = $1 OR a.id::text = $1)
      ${publishCond}
      LIMIT 1
      `,
      [playerOrAuctionId]
    );

    if (!res.rows[0]) {
      return { player: null, serverTimeUtc: serverNow.toISOString() };
    }

    return {
      player: mapRowToPlayerWithAuction(res.rows[0], serverNowMs),
      serverTimeUtc: serverNow.toISOString(),
    };
  });
}

/**
 * Returns the complete chronological bid history for a player/auction.
 */
export async function getBidsForPlayer(playerOrAuctionId: string): Promise<BidWithDetails[]> {
  return withPgLock(async (db) => {
    const res = await db.query<Record<string, unknown>>(
      `
      SELECT
        b.*,
        pr.full_name AS bidder_name,
        pr.email AS bidder_email,
        p.full_name AS player_name,
        p.photo_url AS player_photo,
        p.position AS player_position,
        p.current_club AS player_club,
        p.auction_status,
        a.current_highest_bid,
        a.highest_bidder_id
      FROM public.bids b
      JOIN public.profiles pr ON pr.id = b.bidder_id
      JOIN public.players p ON p.id = b.player_id
      JOIN public.auctions a ON a.id = b.auction_id
      WHERE b.player_id::text = $1 OR b.auction_id::text = $1
      ORDER BY b.amount DESC, b.created_at ASC
      `,
      [playerOrAuctionId]
    );

    return res.rows.map((r, index) => ({
      id: String(r.id),
      auction_id: String(r.auction_id),
      player_id: String(r.player_id),
      bidder_id: String(r.bidder_id),
      amount: toNum(r.amount),
      previous_highest_bid: toNullableNum(r.previous_highest_bid),
      idempotency_key: r.idempotency_key ? String(r.idempotency_key) : null,
      created_at: toIso(r.created_at),
      bidder_name: String(r.bidder_name),
      bidder_email: r.bidder_email ? String(r.bidder_email) : undefined,
      player_name: r.player_name ? String(r.player_name) : undefined,
      player_photo: r.player_photo ? String(r.player_photo) : undefined,
      player_position: r.player_position as PlayerPosition | undefined,
      player_club: r.player_club ? String(r.player_club) : undefined,
      auction_status: r.auction_status as AuctionStatus | undefined,
      current_highest_bid: toNullableNum(r.current_highest_bid),
      highest_bidder_id: r.highest_bidder_id ? String(r.highest_bidder_id) : null,
      is_winning_bid: index === 0,
    }));
  });
}

/**
 * Places a bid using the concurrency-safe PostgreSQL function `public.place_bid`.
 */
export async function placeBidTransaction(params: {
  auctionOrPlayerId: string;
  userId: string;
  amount: number;
  idempotencyKey?: string;
  referenceTimeUtc?: string;
}): Promise<{
  bid_id: string;
  auction_id: string;
  player_id: string;
  bidder_id: string;
  bidder_name: string;
  amount: number;
  previous_highest_bid: number | null;
  next_minimum_bid: number;
  created_at: string;
}> {
  const { auctionOrPlayerId, userId, amount, idempotencyKey, referenceTimeUtc } = params;

  const { isConfigured } = getSupabasePublicConfig();
  if (isConfigured) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      const { data, error } = await supabase.rpc('place_bid', {
        p_auction_id: auctionOrPlayerId,
        p_bid_amount: amount,
        p_idempotency_key: idempotencyKey || null,
        p_caller_id: userId,
        p_reference_time: referenceTimeUtc || null,
      });
      if (error) {
        throw new Error(error.message);
      }
      return data;
    }
  }

  return withPgLock(async (db) => {
    const res = await db.query<{ result: Record<string, unknown> }>(
      `
      SELECT public.place_bid(
        $1::uuid,
        $2::numeric,
        $3::text,
        $4::uuid,
        $5::timestamptz
      ) AS result
      `,
      [
        auctionOrPlayerId,
        amount,
        idempotencyKey || null,
        userId,
        referenceTimeUtc || new Date().toISOString(),
      ]
    );

    const payload = res.rows[0]?.result;
    if (!payload) {
      throw new Error('Failed to record bid.');
    }

    return {
      bid_id: String(payload.bid_id),
      auction_id: String(payload.auction_id),
      player_id: String(payload.player_id),
      bidder_id: String(payload.bidder_id),
      bidder_name: String(payload.bidder_name),
      amount: toNum(payload.amount),
      previous_highest_bid: toNullableNum(payload.previous_highest_bid),
      next_minimum_bid: toNum(payload.next_minimum_bid),
      created_at: toIso(payload.created_at),
    };
  });
}

/**
 * Finalizes an auction idempotently via `public.finalize_auction`.
 */
export async function finalizeAuctionTransaction(params: {
  auctionOrPlayerId: string;
  forceAdmin?: boolean;
  referenceTimeUtc?: string;
}) {
  const { auctionOrPlayerId, forceAdmin = false, referenceTimeUtc } = params;

  return withPgLock(async (db) => {
    const findAuction = await db.query<{ id: string }>(
      `SELECT id FROM public.auctions WHERE id::text = $1 OR player_id::text = $1 LIMIT 1`,
      [auctionOrPlayerId]
    );
    const auctionId = findAuction.rows[0]?.id;
    if (!auctionId) {
      throw new Error('Auction not found.');
    }

    const res = await db.query<{ result: Record<string, unknown> }>(
      `SELECT public.finalize_auction($1::uuid, $2::boolean, $3::timestamptz) AS result`,
      [auctionId, forceAdmin, referenceTimeUtc || new Date().toISOString()]
    );

    return res.rows[0]?.result;
  });
}

/**
 * Admin operation: Mark a finalized auction transaction as completed & sold.
 */
export async function adminMarkTransactionSold(params: {
  auctionOrPlayerId: string;
  adminId: string;
  notes?: string;
}) {
  const { auctionOrPlayerId, adminId, notes } = params;

  return withPgLock(async (db) => {
    const adminCheck = await db.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1 LIMIT 1`,
      [adminId]
    );
    if (adminCheck.rows[0]?.role !== 'admin') {
      throw new Error('Unauthorized: Admin permissions required.');
    }

    const findAuction = await db.query<{ id: string; player_id: string; status: string }>(
      `SELECT id, player_id, status FROM public.auctions WHERE id::text = $1 OR player_id::text = $1 LIMIT 1`,
      [auctionOrPlayerId]
    );
    const auction = findAuction.rows[0];
    if (!auction) {
      throw new Error('Auction not found.');
    }

    // Ensure auction is finalized first
    await db.query(`SELECT public.finalize_auction($1::uuid, true, now())`, [auction.id]);

    const resCheck = await db.query<{ id: string; outcome: string; winner_id: string | null }>(
      `SELECT id, outcome, winner_id FROM public.auction_results WHERE auction_id = $1 LIMIT 1`,
      [auction.id]
    );
    const resultRow = resCheck.rows[0];
    if (!resultRow || !resultRow.winner_id) {
      throw new Error('Cannot mark transaction as sold: No winning bid exists for this auction.');
    }

    await db.query(
      `
      UPDATE public.auction_results
      SET
        outcome = 'sold',
        transaction_completed = true,
        completed_by = $1,
        completed_at = now(),
        notes = COALESCE($2, notes)
      WHERE auction_id = $3
      `,
      [adminId, notes || null, auction.id]
    );

    await db.query(
      `UPDATE public.players SET auction_status = 'sold', updated_at = now() WHERE id = $1`,
      [auction.player_id]
    );
    await db.query(
      `UPDATE public.auctions SET status = 'sold', updated_at = now() WHERE id = $1`,
      [auction.id]
    );

    return { success: true };
  });
}

export interface SavePlayerInput {
  id?: string;
  full_name: string;
  photo_url: string;
  photo_storage_path?: string | null;
  age: number;
  nationality: string;
  position: PlayerPosition;
  current_club: string;
  description: string;
  starting_bid: number;
  minimum_bid_increment: number;
  auction_start_time: string;
  auction_end_time: string;
  is_published: boolean;
  is_demo?: boolean;
  admin_id: string;
}

/**
 * Admin operation: Create or update a player listing and its auction schedule.
 */
export async function adminUpsertPlayer(input: SavePlayerInput): Promise<{ id: string }> {
  return withPgLock(async (db) => {
    const adminCheck = await db.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1 LIMIT 1`,
      [input.admin_id]
    );
    if (adminCheck.rows[0]?.role !== 'admin') {
      throw new Error('Unauthorized: Only administrators can manage player listings.');
    }

    if (input.full_name.trim().length < 2) {
      throw new Error('Player full name must be at least 2 characters.');
    }
    if (input.age < 15 || input.age > 55) {
      throw new Error('Player age must be between 15 and 55.');
    }
    if (input.starting_bid <= 0) {
      throw new Error('Starting bid must be greater than 0.');
    }
    if (input.minimum_bid_increment <= 0) {
      throw new Error('Minimum bid increment must be greater than 0.');
    }

    const startMs = new Date(input.auction_start_time).getTime();
    const endMs = new Date(input.auction_end_time).getTime();
    if (Number.isNaN(startMs) || Number.isNaN(endMs)) {
      throw new Error('Valid auction start and end dates are required.');
    }
    if (endMs <= startMs) {
      throw new Error('Auction end time must be after the start time.');
    }

    const nowMs = Date.now();
    let computedStatus: AuctionStatus = 'draft';
    if (input.is_published) {
      if (nowMs < startMs) {
        computedStatus = 'upcoming';
      } else if (nowMs >= startMs && nowMs < endMs) {
        computedStatus = 'live';
      } else {
        computedStatus = 'ended';
      }
    }

    if (input.id) {
      // Check existing player
      const existing = await db.query<{
        id: string;
        current_highest_bid: string | null;
        auction_status: AuctionStatus;
      }>(`SELECT id, current_highest_bid, auction_status FROM public.players WHERE id = $1 LIMIT 1`, [
        input.id,
      ]);

      if (!existing.rows[0]) {
        throw new Error('Player listing not found.');
      }

      const hasBids = existing.rows[0].current_highest_bid !== null;
      if (hasBids && input.starting_bid > Number(existing.rows[0].current_highest_bid)) {
        throw new Error(
          'Cannot raise starting bid above the current highest accepted bid on an active auction.'
        );
      }

      // Preserve sold/unsold status if already finalized, unless explicitly rescheduled into the future
      if (
        (existing.rows[0].auction_status === 'sold' || existing.rows[0].auction_status === 'unsold') &&
        endMs <= nowMs
      ) {
        computedStatus = existing.rows[0].auction_status;
      }

      await db.query(
        `
        UPDATE public.players
        SET
          full_name = $1,
          photo_url = $2,
          photo_storage_path = $3,
          age = $4,
          nationality = $5,
          position = $6,
          current_club = $7,
          description = $8,
          starting_bid = $9,
          minimum_bid_increment = $10,
          auction_start_time = $11::timestamptz,
          auction_end_time = $12::timestamptz,
          auction_status = $13,
          is_published = $14,
          updated_at = now()
        WHERE id = $15
        `,
        [
          input.full_name.trim(),
          input.photo_url.trim() || '/players/default-player.svg',
          input.photo_storage_path || null,
          input.age,
          input.nationality.trim(),
          input.position,
          input.current_club.trim(),
          input.description.trim(),
          input.starting_bid,
          input.minimum_bid_increment,
          input.auction_start_time,
          input.auction_end_time,
          computedStatus,
          input.is_published,
          input.id,
        ]
      );

      return { id: input.id };
    } else {
      const insertRes = await db.query<{ id: string }>(
        `
        INSERT INTO public.players (
          full_name,
          photo_url,
          photo_storage_path,
          age,
          nationality,
          position,
          current_club,
          description,
          starting_bid,
          minimum_bid_increment,
          auction_start_time,
          auction_end_time,
          auction_status,
          is_published,
          is_demo,
          created_by
        ) VALUES (
          $1, $2, $3, $4, $5, $6, $7, $8, $9, $10,
          $11::timestamptz, $12::timestamptz, $13, $14, $15, $16
        )
        RETURNING id
        `,
        [
          input.full_name.trim(),
          input.photo_url.trim() || '/players/default-player.svg',
          input.photo_storage_path || null,
          input.age,
          input.nationality.trim(),
          input.position,
          input.current_club.trim(),
          input.description.trim(),
          input.starting_bid,
          input.minimum_bid_increment,
          input.auction_start_time,
          input.auction_end_time,
          computedStatus,
          input.is_published,
          Boolean(input.is_demo),
          input.admin_id,
        ]
      );

      return { id: insertRes.rows[0].id };
    }
  });
}

/**
 * Admin operation: Publish or unpublish a player listing.
 */
export async function adminTogglePublishPlayer(params: {
  playerId: string;
  isPublished: boolean;
  adminId: string;
}) {
  const { playerId, isPublished, adminId } = params;

  return withPgLock(async (db) => {
    const adminCheck = await db.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1 LIMIT 1`,
      [adminId]
    );
    if (adminCheck.rows[0]?.role !== 'admin') {
      throw new Error('Unauthorized: Admin permissions required.');
    }

    const rowRes = await db.query<{
      auction_start_time: string;
      auction_end_time: string;
      current_highest_bid: string | null;
      auction_status: AuctionStatus;
    }>(
      `SELECT auction_start_time, auction_end_time, current_highest_bid, auction_status
       FROM public.players WHERE id = $1 LIMIT 1`,
      [playerId]
    );
    const player = rowRes.rows[0];
    if (!player) {
      throw new Error('Player listing not found.');
    }

    let nextStatus: AuctionStatus = 'draft';
    if (isPublished) {
      nextStatus = computeEffectiveAuctionStatus({
        storedStatus: player.auction_status === 'draft' ? 'upcoming' : player.auction_status,
        isPublished: true,
        startTimeUtc: toIso(player.auction_start_time),
        endTimeUtc: toIso(player.auction_end_time),
        currentHighestBid: toNullableNum(player.current_highest_bid),
      });
    }

    await db.query(
      `UPDATE public.players SET is_published = $1, auction_status = $2, updated_at = now() WHERE id = $3`,
      [isPublished, nextStatus, playerId]
    );

    return { id: playerId, isPublished, status: nextStatus };
  });
}

/**
 * Admin operation: Delete a player listing.
 */
export async function adminDeletePlayer(params: { playerId: string; adminId: string }) {
  const { playerId, adminId } = params;

  return withPgLock(async (db) => {
    const adminCheck = await db.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1 LIMIT 1`,
      [adminId]
    );
    if (adminCheck.rows[0]?.role !== 'admin') {
      throw new Error('Unauthorized: Admin permissions required.');
    }

    await db.query(`SELECT set_config('app.allow_cascade_delete', 'true', true)`);
    try {
      await db.query(`DELETE FROM public.players WHERE id = $1`, [playerId]);
    } finally {
      await db.query(`SELECT set_config('app.allow_cascade_delete', 'false', true)`);
    }
    return { deleted: true };
  });
}

/**
 * Fetches complete dashboard metrics, active bids, bidding history, and won results for a user.
 */
export async function getUserDashboardData(userId: string) {
  await syncAllAuctionStatuses();
  const serverNowMs = Date.now();

  return withPgLock(async (db) => {
    // 1. All bids by this user
    const bidsRes = await db.query<Record<string, unknown>>(
      `
      SELECT
        b.*,
        p.full_name AS player_name,
        p.photo_url AS player_photo,
        p.position AS player_position,
        p.current_club AS player_club,
        p.nationality AS player_nationality,
        p.auction_start_time,
        p.auction_end_time,
        p.auction_status,
        p.is_published,
        a.current_highest_bid,
        a.highest_bidder_id,
        a.minimum_bid_increment
      FROM public.bids b
      JOIN public.players p ON p.id = b.player_id
      JOIN public.auctions a ON a.id = b.auction_id
      WHERE b.bidder_id = $1
      ORDER BY b.created_at DESC
      `,
      [userId]
    );

    const biddingHistory: BidWithDetails[] = bidsRes.rows.map((r) => ({
      id: String(r.id),
      auction_id: String(r.auction_id),
      player_id: String(r.player_id),
      bidder_id: String(r.bidder_id),
      amount: toNum(r.amount),
      previous_highest_bid: toNullableNum(r.previous_highest_bid),
      idempotency_key: r.idempotency_key ? String(r.idempotency_key) : null,
      created_at: toIso(r.created_at),
      bidder_name: 'You',
      player_name: String(r.player_name),
      player_photo: String(r.player_photo),
      player_position: r.player_position as PlayerPosition,
      player_club: String(r.player_club),
      auction_status: computeEffectiveAuctionStatus({
        storedStatus: r.auction_status as AuctionStatus,
        isPublished: Boolean(r.is_published),
        startTimeUtc: toIso(r.auction_start_time),
        endTimeUtc: toIso(r.auction_end_time),
        currentHighestBid: toNullableNum(r.current_highest_bid),
        serverNowMs,
      }),
      current_highest_bid: toNullableNum(r.current_highest_bid),
      highest_bidder_id: r.highest_bidder_id ? String(r.highest_bidder_id) : null,
      is_winning_bid:
        String(r.highest_bidder_id) === userId &&
        toNum(r.amount) === toNum(r.current_highest_bid),
    }));

    // 2. Group by distinct player/auction for "My Active & Participated Auctions"
    const distinctPlayerIds = Array.from(new Set(biddingHistory.map((b) => b.player_id)));
    const myAuctionStandings: Array<{
      player: PlayerWithAuction;
      userHighestBid: number;
      userBidCount: number;
      isHighestBidder: boolean;
      lastBidAt: string;
    }> = [];

    for (const pid of distinctPlayerIds) {
      const playerRes = await db.query<Record<string, unknown>>(
        `
        SELECT
          p.*,
          a.id AS auction_id,
          a.highest_bidder_id,
          a.bid_count,
          hb.full_name AS highest_bidder_name,
          ar.id AS result_id,
          ar.outcome AS result_outcome,
          ar.winner_id AS result_winner_id,
          w.full_name AS result_winner_name,
          ar.final_amount AS result_final_amount,
          ar.transaction_completed AS result_transaction_completed,
          ar.completed_at AS result_completed_at,
          ar.finalized_at AS result_finalized_at,
          ar.notes AS result_notes
        FROM public.players p
        LEFT JOIN public.auctions a ON a.player_id = p.id
        LEFT JOIN public.profiles hb ON hb.id = a.highest_bidder_id
        LEFT JOIN public.auction_results ar ON ar.player_id = p.id
        LEFT JOIN public.profiles w ON w.id = ar.winner_id
        WHERE p.id::text = $1 AND p.is_published = true
        LIMIT 1
        `,
        [pid]
      );
      if (!playerRes.rows[0]) continue;
      const player = mapRowToPlayerWithAuction(playerRes.rows[0], serverNowMs);
      const userBidsForPlayer = biddingHistory.filter((b) => b.player_id === pid);
      const userMax = Math.max(...userBidsForPlayer.map((b) => b.amount));
      myAuctionStandings.push({
        player,
        userHighestBid: userMax,
        userBidCount: userBidsForPlayer.length,
        isHighestBidder: player.highest_bidder_id === userId,
        lastBidAt: userBidsForPlayer[0].created_at,
      });
    }

    // 3. Won Auctions
    const wonAuctions = myAuctionStandings.filter(
      (item) =>
        item.player.effective_status === 'sold' &&
        (item.player.result?.winner_id === userId || item.player.highest_bidder_id === userId)
    );

    const activeParticipating = myAuctionStandings.filter(
      (item) => item.player.effective_status === 'live'
    );
    const currentlyLeading = activeParticipating.filter((item) => item.isHighestBidder);

    const totalCommittedAmount =
      currentlyLeading.reduce((sum, item) => sum + item.userHighestBid, 0) +
      wonAuctions.reduce((sum, item) => sum + item.userHighestBid, 0);

    const summary: UserDashboardSummary = {
      totalBidsPlaced: biddingHistory.length,
      activeAuctionsParticipating: activeParticipating.length,
      currentlyLeadingCount: currentlyLeading.length,
      auctionsWonCount: wonAuctions.length,
      totalCommittedAmount,
    };

    return {
      summary,
      myAuctionStandings,
      biddingHistory,
      wonAuctions,
      serverTimeUtc: new Date(serverNowMs).toISOString(),
    };
  });
}

/**
 * Fetches comprehensive summary statistics, all bids, and all auction results for the Admin Dashboard.
 */
export async function getAdminDashboardData() {
  await syncAllAuctionStatuses();
  const serverNowMs = Date.now();

  return withPgLock(async (db) => {
    const playersRes = await db.query<Record<string, unknown>>(`
      SELECT
        p.*,
        a.id AS auction_id,
        a.highest_bidder_id,
        a.bid_count,
        hb.full_name AS highest_bidder_name,
        ar.id AS result_id,
        ar.outcome AS result_outcome,
        ar.winner_id AS result_winner_id,
        w.full_name AS result_winner_name,
        ar.final_amount AS result_final_amount,
        ar.transaction_completed AS result_transaction_completed,
        ar.completed_at AS result_completed_at,
        ar.finalized_at AS result_finalized_at,
        ar.notes AS result_notes
      FROM public.players p
      LEFT JOIN public.auctions a ON a.player_id = p.id
      LEFT JOIN public.profiles hb ON hb.id = a.highest_bidder_id
      LEFT JOIN public.auction_results ar ON ar.player_id = p.id
      LEFT JOIN public.profiles w ON w.id = ar.winner_id
      ORDER BY p.created_at DESC
    `);

    const allPlayers = playersRes.rows.map((r) => mapRowToPlayerWithAuction(r, serverNowMs));

    const bidsRes = await db.query<Record<string, unknown>>(`
      SELECT
        b.*,
        pr.full_name AS bidder_name,
        pr.email AS bidder_email,
        p.full_name AS player_name,
        p.photo_url AS player_photo,
        p.position AS player_position,
        p.current_club AS player_club,
        p.auction_status,
        a.current_highest_bid,
        a.highest_bidder_id
      FROM public.bids b
      JOIN public.profiles pr ON pr.id = b.bidder_id
      JOIN public.players p ON p.id = b.player_id
      JOIN public.auctions a ON a.id = b.auction_id
      ORDER BY b.created_at DESC
    `);

    const allBids: BidWithDetails[] = bidsRes.rows.map((r) => ({
      id: String(r.id),
      auction_id: String(r.auction_id),
      player_id: String(r.player_id),
      bidder_id: String(r.bidder_id),
      amount: toNum(r.amount),
      previous_highest_bid: toNullableNum(r.previous_highest_bid),
      idempotency_key: r.idempotency_key ? String(r.idempotency_key) : null,
      created_at: toIso(r.created_at),
      bidder_name: String(r.bidder_name),
      bidder_email: String(r.bidder_email),
      player_name: String(r.player_name),
      player_photo: String(r.player_photo),
      player_position: r.player_position as PlayerPosition,
      player_club: String(r.player_club),
      auction_status: r.auction_status as AuctionStatus,
      current_highest_bid: toNullableNum(r.current_highest_bid),
      highest_bidder_id: r.highest_bidder_id ? String(r.highest_bidder_id) : null,
      is_winning_bid:
        String(r.highest_bidder_id) === String(r.bidder_id) &&
        toNum(r.amount) === toNum(r.current_highest_bid),
    }));

    const profilesRes = await db.query<Profile>(`
      SELECT id, email, full_name, avatar_url, phone, favorite_club, role, created_at, updated_at
      FROM public.profiles
      ORDER BY created_at DESC
    `);

    const stats: AdminSummaryStats = {
      totalPlayers: allPlayers.length,
      publishedPlayers: allPlayers.filter((p) => p.is_published).length,
      draftPlayers: allPlayers.filter((p) => !p.is_published || p.effective_status === 'draft')
        .length,
      demoPlayers: allPlayers.filter((p) => p.is_demo).length,
      upcomingAuctions: allPlayers.filter((p) => p.effective_status === 'upcoming').length,
      liveAuctions: allPlayers.filter((p) => p.effective_status === 'live').length,
      completedAuctions: allPlayers.filter((p) =>
        ['ended', 'sold', 'unsold'].includes(p.effective_status)
      ).length,
      soldPlayers: allPlayers.filter((p) => p.effective_status === 'sold').length,
      unsoldPlayers: allPlayers.filter((p) => p.effective_status === 'unsold').length,
      totalBids: allBids.length,
      totalBidVolume: allPlayers
        .filter((p) => p.current_highest_bid !== null)
        .reduce((acc, p) => acc + (p.current_highest_bid || 0), 0),
      completedTransactions: allPlayers.filter((p) => p.result?.transaction_completed).length,
    };

    return {
      stats,
      allPlayers,
      allBids,
      profiles: profilesRes.rows,
      serverTimeUtc: new Date(serverNowMs).toISOString(),
    };
  });
}

/**
 * Updates a user's own profile information (never allowing role escalation).
 */
export async function updateUserProfile(params: {
  userId: string;
  fullName: string;
  phone?: string;
  favoriteClub?: string;
}): Promise<Profile> {
  const { userId, fullName, phone, favoriteClub } = params;
  if (fullName.trim().length < 2) {
    throw new Error('Full name must be at least 2 characters.');
  }

  return withPgLock(async (db) => {
    const res = await db.query<Profile>(
      `
      UPDATE public.profiles
      SET
        full_name = $1,
        phone = $2,
        favorite_club = $3,
        updated_at = now()
      WHERE id = $4
      RETURNING id, email, full_name, avatar_url, phone, favorite_club, role, created_at, updated_at
      `,
      [fullName.trim(), phone?.trim() || null, favoriteClub?.trim() || null, userId]
    );

    if (!res.rows[0]) {
      throw new Error('Profile not found.');
    }
    return res.rows[0];
  });
}

/**
 * Securely promotes an account to admin ONLY when valid `ADMIN_BOOTSTRAP_SECRET` is provided
 * on the server side or invoked by an existing verified admin.
 */
export async function promoteUserToAdminServerSide(params: {
  targetEmailOrId: string;
  bootstrapSecret?: string;
  actingAdminId?: string;
}): Promise<Profile> {
  const { targetEmailOrId, bootstrapSecret, actingAdminId } = params;

  return withPgLock(async (db) => {
    let authorized = false;

    if (actingAdminId) {
      const checkAdmin = await db.query<{ role: string }>(
        `SELECT role FROM public.profiles WHERE id = $1 LIMIT 1`,
        [actingAdminId]
      );
      if (checkAdmin.rows[0]?.role === 'admin') {
        authorized = true;
      }
    }

    const expectedSecret = process.env.ADMIN_BOOTSTRAP_SECRET?.trim();
    if (
      !authorized &&
      bootstrapSecret &&
      expectedSecret &&
      expectedSecret !== 'replace-with-a-strong-random-32-char-secret' &&
      bootstrapSecret.trim() === expectedSecret
    ) {
      authorized = true;
    }

    if (!authorized) {
      throw new Error('Unauthorized: Invalid admin bootstrap secret or insufficient permissions.');
    }

    await db.query(`SELECT set_config('app.allow_role_change', 'true', true)`);
    try {
      const res = await db.query<Profile>(
        `
        UPDATE public.profiles
        SET role = 'admin', updated_at = now()
        WHERE id::text = $1 OR lower(email) = lower($1)
        RETURNING id, email, full_name, avatar_url, phone, favorite_club, role, created_at, updated_at
        `,
        [targetEmailOrId.trim()]
      );

      if (!res.rows[0]) {
        throw new Error('Target user profile not found.');
      }
      return res.rows[0];
    } finally {
      await db.query(`SELECT set_config('app.allow_role_change', 'false', true)`);
    }
  });
}
