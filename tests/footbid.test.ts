import { describe, expect, it } from 'vitest';
import { createIsolatedTestPostgresEngine } from '@/lib/db/postgres-engine';
import {
  calculateAuctionCountdown,
  computeEffectiveAuctionStatus,
  dhakaInputStringToUtcIso,
  formatDhakaDateTime,
  utcToDhakaInputString,
} from '@/lib/timezone';
import {
  createSignedSessionToken,
  hashPassword,
  verifyPassword,
  verifySignedSessionToken,
} from '@/lib/auth/session';
import {
  adminDeletePlayer,
  adminMarkTransactionSold,
  adminTogglePublishPlayer,
  adminUpsertPlayer,
  finalizeAuctionTransaction,
  getAdminDashboardData,
  getBidsForPlayer,
  getPlayerById,
  getPlayers,
  getUserDashboardData,
  placeBidTransaction,
} from '@/lib/db/repository';

const ADMIN_ID = '00000000-0000-4000-a000-000000000001';
const USER1_ID = '00000000-0000-4000-a000-000000000002';
const USER2_ID = '00000000-0000-4000-a000-000000000003';

describe('FootBid — Comprehensive Full-Stack & Database Verification Suite', () => {
  it('1. Formats and round-trips UTC and Bangladesh Standard Time (Asia/Dhaka) accurately', () => {
    const utcIso = '2026-10-29T12:30:00.000Z'; // 18:30 in Asia/Dhaka (+06:00)
    const dhakaDisplay = formatDhakaDateTime(utcIso);
    expect(dhakaDisplay).toContain('29 OCT 2026');
    expect(dhakaDisplay).toContain('06:30 PM BST');

    const inputStr = utcToDhakaInputString(utcIso);
    expect(inputStr).toBe('2026-10-29T18:30');

    const roundTripUtc = dhakaInputStringToUtcIso(inputStr);
    expect(roundTripUtc).toBe(utcIso);
  });

  it('2. Calculates authoritative server-time countdowns for upcoming, active, and ended auctions', () => {
    const startUtc = '2026-11-01T10:00:00.000Z';
    const endUtc = '2026-11-02T10:00:00.000Z';

    // 2 hours before start
    const beforeStart = calculateAuctionCountdown({
      startTimeUtc: startUtc,
      endTimeUtc: endUtc,
      serverNowMs: new Date('2026-11-01T08:00:00.000Z').getTime(),
    });
    expect(beforeStart.phase).toBe('before_start');
    expect(beforeStart.hours).toBe(2);
    expect(beforeStart.isExpired).toBe(false);

    // 5 hours before end (active)
    const duringActive = calculateAuctionCountdown({
      startTimeUtc: startUtc,
      endTimeUtc: endUtc,
      serverNowMs: new Date('2026-11-02T05:00:00.000Z').getTime(),
    });
    expect(duringActive.phase).toBe('active');
    expect(duringActive.hours).toBe(5);
    expect(duringActive.isExpired).toBe(false);

    // After end
    const afterEnd = calculateAuctionCountdown({
      startTimeUtc: startUtc,
      endTimeUtc: endUtc,
      serverNowMs: new Date('2026-11-02T10:00:01.000Z').getTime(),
    });
    expect(afterEnd.phase).toBe('ended');
    expect(afterEnd.isExpired).toBe(true);
  });

  it('3. Hashes passwords, verifies credentials, and signs tamper-proof session tokens', () => {
    const rawPass = 'StrongClubPass!2026';
    const hashed = hashPassword(rawPass);
    expect(verifyPassword(rawPass, hashed)).toBe(true);
    expect(verifyPassword('WrongPassword', hashed)).toBe(false);

    const token = createSignedSessionToken(USER1_ID);
    expect(verifySignedSessionToken(token)).toBe(USER1_ID);
    expect(verifySignedSessionToken(`${token}tampered`)).toBeNull();
  });

  it('4. Enforces user registration defaults (`role = user`) and blocks privilege escalation in PostgreSQL', async () => {
    const db = await createIsolatedTestPostgresEngine(true);

    // Register a new user in auth.users; even if raw_user_meta_data tries to pass role='admin', trigger must force 'user'
    const newUserRes = await db.query<{ id: string }>(
      `
      INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
      VALUES ('attacker@club.org', 'hash', '{"full_name": "Test User", "role": "admin"}'::jsonb)
      RETURNING id
      `
    );
    const newUserId = newUserRes.rows[0].id;

    const profileRes = await db.query<{ role: string }>(
      `SELECT role FROM public.profiles WHERE id = $1`,
      [newUserId]
    );
    expect(profileRes.rows[0]?.role).toBe('user');

    // Simulate non-admin user trying to update their own role to 'admin'
    await expect(
      db.query(`UPDATE public.profiles SET role = 'admin' WHERE id = $1`, [newUserId])
    ).rejects.toThrow(/Unauthorized/i);

    // Verify accepted bids are immutable and cannot be modified or deleted by users
    await expect(
      db.query(`UPDATE public.bids SET amount = 9999999`)
    ).rejects.toThrow(/Immutable record/i);

    await expect(
      db.query(`DELETE FROM public.bids`)
    ).rejects.toThrow(/Immutable record/i);
  });

  it('5. Restricts player creation, editing, publishing, and deletion strictly to administrators', async () => {
    const startIso = new Date(Date.now() - 3600 * 1000).toISOString();
    const endIso = new Date(Date.now() + 24 * 3600 * 1000).toISOString();

    // Regular user attempt must fail
    await expect(
      adminUpsertPlayer({
        full_name: 'Unauthorized Player',
        photo_url: '/players/default-player.svg',
        age: 22,
        nationality: 'Spain',
        position: 'Midfielder',
        current_club: 'Madrid Atletica',
        description: 'Should not be created by regular user.',
        starting_bid: 200000,
        minimum_bid_increment: 10000,
        auction_start_time: startIso,
        auction_end_time: endIso,
        is_published: true,
        admin_id: USER1_ID,
      })
    ).rejects.toThrow(/Unauthorized/i);

    // Admin attempt succeeds
    const created = await adminUpsertPlayer({
      full_name: 'Carlos Mendoza',
      photo_url: '/players/default-player.svg',
      age: 24,
      nationality: 'Spain',
      position: 'Midfielder',
      current_club: 'Real Iberia CF',
      description: 'Precision deep-lying playmaker with elite passing range and press resistance.',
      starting_bid: 300000,
      minimum_bid_increment: 20000,
      auction_start_time: startIso,
      auction_end_time: endIso,
      is_published: true,
      is_demo: false,
      admin_id: ADMIN_ID,
    });
    expect(created.id).toBeTruthy();

    // Regular user cannot unpublish or delete
    await expect(
      adminTogglePublishPlayer({
        playerId: created.id,
        isPublished: false,
        adminId: USER1_ID,
      })
    ).rejects.toThrow(/Unauthorized/i);

    await expect(
      adminDeletePlayer({
        playerId: created.id,
        adminId: USER1_ID,
      })
    ).rejects.toThrow(/Unauthorized/i);
  });

  it('6. Validates starting price, minimum increments, duplicate submissions, and concurrent bids', async () => {
    const startIso = new Date(Date.now() - 1800 * 1000).toISOString();
    const endIso = new Date(Date.now() + 10 * 3600 * 1000).toISOString();

    const { id: playerId } = await adminUpsertPlayer({
      full_name: 'Viktor Kovalenko',
      photo_url: '/players/default-player.svg',
      age: 25,
      nationality: 'Ukraine',
      position: 'Forward',
      current_club: 'Dynamo Kyiv Star',
      description: 'Clinical striker with rapid movement and aerial dominance.',
      starting_bid: 400000,
      minimum_bid_increment: 25000,
      auction_start_time: startIso,
      auction_end_time: endIso,
      is_published: true,
      is_demo: false,
      admin_id: ADMIN_ID,
    });

    // 1. Reject opening bid below starting price ($390,000 < $400,000)
    await expect(
      placeBidTransaction({
        auctionOrPlayerId: playerId,
        userId: USER1_ID,
        amount: 390000,
        idempotencyKey: 'test-low-open',
      })
    ).rejects.toThrow(/Minimum valid bid/i);

    // 2. Accept opening bid at starting price ($400,000)
    const firstBid = await placeBidTransaction({
      auctionOrPlayerId: playerId,
      userId: USER1_ID,
      amount: 400000,
      idempotencyKey: 'test-valid-open',
    });
    expect(firstBid.amount).toBe(400000);
    expect(firstBid.next_minimum_bid).toBe(425000);

    // 3. Reject duplicate submission with same idempotencyKey
    await expect(
      placeBidTransaction({
        auctionOrPlayerId: playerId,
        userId: USER1_ID,
        amount: 425000,
        idempotencyKey: 'test-valid-open',
      })
    ).rejects.toThrow(/Duplicate bid submission/i);

    // 4. Reject second bid that does not satisfy minimum increment ($410,000 < $425,000)
    await expect(
      placeBidTransaction({
        auctionOrPlayerId: playerId,
        userId: USER2_ID,
        amount: 410000,
        idempotencyKey: 'test-below-inc',
      })
    ).rejects.toThrow(/Minimum valid bid/i);

    // 5. Simulate simultaneous competing bids for the exact same amount ($425,000)
    // Only the first transaction lock succeeds; the second must be rejected because highest bid is now $425k (next min $450k)
    const competingResults = await Promise.allSettled([
      placeBidTransaction({
        auctionOrPlayerId: playerId,
        userId: USER2_ID,
        amount: 425000,
        idempotencyKey: 'compete-1',
      }),
      placeBidTransaction({
        auctionOrPlayerId: playerId,
        userId: USER1_ID,
        amount: 425000,
        idempotencyKey: 'compete-2',
      }),
    ]);

    const fulfilled = competingResults.filter((r) => r.status === 'fulfilled');
    const rejected = competingResults.filter((r) => r.status === 'rejected');
    expect(fulfilled.length).toBe(1);
    expect(rejected.length).toBe(1);

    // Verify complete bid history is preserved
    const history = await getBidsForPlayer(playerId);
    expect(history.length).toBe(2);
    expect(history[0].amount).toBe(425000);
    expect(history[1].amount).toBe(400000);
  });

  it('7. Prevents bids before auction start, after auction end, and on unpublished listings', async () => {
    // A. Unpublished draft listing
    const draft = await adminUpsertPlayer({
      full_name: 'Draft Prospect',
      photo_url: '/players/default-player.svg',
      age: 19,
      nationality: 'France',
      position: 'Defender',
      current_club: 'Lyon Academy',
      description: 'Unpublished prospect listing for internal scouting.',
      starting_bid: 100000,
      minimum_bid_increment: 5000,
      auction_start_time: new Date(Date.now() - 3600 * 1000).toISOString(),
      auction_end_time: new Date(Date.now() + 3600 * 1000).toISOString(),
      is_published: false,
      admin_id: ADMIN_ID,
    });

    await expect(
      placeBidTransaction({
        auctionOrPlayerId: draft.id,
        userId: USER1_ID,
        amount: 100000,
      })
    ).rejects.toThrow(/unpublished/i);

    // B. Upcoming auction (starts in +5 hours)
    const upcoming = await adminUpsertPlayer({
      full_name: 'Future Transfer Star',
      photo_url: '/players/default-player.svg',
      age: 22,
      nationality: 'Germany',
      position: 'Midfielder',
      current_club: 'Rhine SV',
      description: 'Scheduled for future auction window.',
      starting_bid: 250000,
      minimum_bid_increment: 10000,
      auction_start_time: new Date(Date.now() + 5 * 3600 * 1000).toISOString(),
      auction_end_time: new Date(Date.now() + 25 * 3600 * 1000).toISOString(),
      is_published: true,
      admin_id: ADMIN_ID,
    });

    await expect(
      placeBidTransaction({
        auctionOrPlayerId: upcoming.id,
        userId: USER1_ID,
        amount: 250000,
      })
    ).rejects.toThrow(/not started yet/i);

    // C. Bid submitted after auction end time (simulated via referenceTimeUtc after end_time)
    const pastEndRef = new Date(Date.now() + 30 * 3600 * 1000).toISOString();
    await expect(
      placeBidTransaction({
        auctionOrPlayerId: upcoming.id,
        userId: USER1_ID,
        amount: 250000,
        referenceTimeUtc: pastEndRef,
      })
    ).rejects.toThrow(/already ended/i);
  });

  it('8. Finalizes auctions idempotently into SOLD (with winner) or UNSOLD (when no bids exist)', async () => {
    const startIso = new Date(Date.now() - 2 * 3600 * 1000).toISOString();
    const endIso = new Date(Date.now() + 2 * 3600 * 1000).toISOString();

    // Create two live auctions: one receives bids, one receives zero bids
    const withBids = await adminUpsertPlayer({
      full_name: 'Sold Striker Test',
      photo_url: '/players/default-player.svg',
      age: 26,
      nationality: 'Italy',
      position: 'Forward',
      current_club: 'Milano Calcio',
      description: 'Striker who will receive valid bids and be finalized as sold.',
      starting_bid: 500000,
      minimum_bid_increment: 25000,
      auction_start_time: startIso,
      auction_end_time: endIso,
      is_published: true,
      admin_id: ADMIN_ID,
    });

    const withoutBids = await adminUpsertPlayer({
      full_name: 'Unsold Keeper Test',
      photo_url: '/players/default-player.svg',
      age: 29,
      nationality: 'Belgium',
      position: 'Goalkeeper',
      current_club: 'Antwerp United',
      description: 'Goalkeeper who receives zero bids during the window.',
      starting_bid: 200000,
      minimum_bid_increment: 10000,
      auction_start_time: startIso,
      auction_end_time: endIso,
      is_published: true,
      admin_id: ADMIN_ID,
    });

    await placeBidTransaction({
      auctionOrPlayerId: withBids.id,
      userId: USER2_ID,
      amount: 500000,
    });
    await placeBidTransaction({
      auctionOrPlayerId: withBids.id,
      userId: USER1_ID,
      amount: 550000,
    });

    const afterEndUtc = new Date(Date.now() + 3 * 3600 * 1000).toISOString();

    // Finalize `withBids` twice to verify idempotency
    const fin1 = await finalizeAuctionTransaction({
      auctionOrPlayerId: withBids.id,
      referenceTimeUtc: afterEndUtc,
    });
    const fin2 = await finalizeAuctionTransaction({
      auctionOrPlayerId: withBids.id,
      referenceTimeUtc: afterEndUtc,
    });

    expect(fin1?.outcome).toBe('sold');
    expect(fin1?.winner_id).toBe(USER1_ID);
    expect(Number(fin1?.final_amount)).toBe(550000);
    expect(fin2?.already_finalized).toBe(true);
    expect(fin2?.winner_id).toBe(USER1_ID);

    // Admin marks transaction completed
    await adminMarkTransactionSold({
      auctionOrPlayerId: withBids.id,
      adminId: ADMIN_ID,
      notes: 'Wire transfer verified.',
    });

    const { player: soldPlayer } = await getPlayerById(withBids.id, true);
    expect(soldPlayer?.effective_status).toBe('sold');
    expect(soldPlayer?.result?.transaction_completed).toBe(true);

    // Finalize `withoutBids`
    const finUnsold = await finalizeAuctionTransaction({
      auctionOrPlayerId: withoutBids.id,
      referenceTimeUtc: afterEndUtc,
    });
    expect(finUnsold?.outcome).toBe('unsold');
    expect(finUnsold?.winner_id).toBeNull();

    const { player: unsoldPlayer } = await getPlayerById(withoutBids.id, true);
    expect(unsoldPlayer?.effective_status).toBe('unsold');
  });

  it('9. Supports search, filtering, sorting, demo separation, and dashboard aggregations', async () => {
    const allPub = await getPlayers({ pageSize: 20 });
    expect(allPub.players.length).toBeGreaterThan(0);

    // Demo separation filter
    const realOnly = await getPlayers({ demoFilter: 'real_only', pageSize: 20 });
    expect(realOnly.players.every((p) => p.is_demo === false)).toBe(true);

    const demoOnly = await getPlayers({ demoFilter: 'demo_only', pageSize: 20 });
    expect(demoOnly.players.every((p) => p.is_demo === true)).toBe(true);

    // User & Admin dashboard summaries
    const userDash = await getUserDashboardData(USER1_ID);
    expect(userDash.summary.totalBidsPlaced).toBeGreaterThan(0);

    const adminDash = await getAdminDashboardData();
    expect(adminDash.stats.totalPlayers).toBeGreaterThan(0);
    expect(adminDash.stats.totalBids).toBeGreaterThan(0);
  });
});
