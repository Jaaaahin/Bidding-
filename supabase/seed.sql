-- ============================================================================
-- FootBid: Initial Fictional Sample Data (Demo Seed)
-- Note: All demo records are flagged with `is_demo = true` so they remain
-- clearly separated from production database listings and can be filtered or
-- purged independently by administrators at any time.
-- ============================================================================

DO $$
DECLARE
  v_admin_id UUID := '00000000-0000-4000-a000-000000000001';
  v_user1_id UUID := '00000000-0000-4000-a000-000000000002';
  v_user2_id UUID := '00000000-0000-4000-a000-000000000003';

  v_p1_id UUID := '10000000-0000-4000-a000-000000000001';
  v_p2_id UUID := '10000000-0000-4000-a000-000000000002';
  v_p3_id UUID := '10000000-0000-4000-a000-000000000003';
  v_p4_id UUID := '10000000-0000-4000-a000-000000000004';
  v_p5_id UUID := '10000000-0000-4000-a000-000000000005';
  v_p6_id UUID := '10000000-0000-4000-a000-000000000006';
  v_p7_id UUID := '10000000-0000-4000-a000-000000000007';
  v_p8_id UUID := '10000000-0000-4000-a000-000000000008';

  v_a1_id UUID;
  v_a2_id UUID;
  v_a3_id UUID;
  v_a6_id UUID;
  v_a7_id UUID;
  v_winning_bid_id UUID;
BEGIN
  -- Allow role assignment during seed execution
  PERFORM set_config('app.allow_role_change', 'true', true);

  -- 1. Seed Demo Users in auth.users & public.profiles (if not present)
  INSERT INTO auth.users (id, email, encrypted_password, raw_user_meta_data)
  VALUES
    (v_admin_id, 'admin@footbid.club', 'demo_hashed_admin_2026', '{"full_name": "Tariq Rahman (Chief Director)"}'::jsonb),
    (v_user1_id, 'scout@dhakafc.club', 'demo_hashed_user1_2026', '{"full_name": "Rafiqul Islam (Sporting Scout)"}'::jsonb),
    (v_user2_id, 'director@bengalunited.club', 'demo_hashed_user2_2026', '{"full_name": "Arman Hossain (Club Director)"}'::jsonb)
  ON CONFLICT (id) DO NOTHING;

  INSERT INTO public.profiles (id, email, full_name, role, favorite_club, phone)
  VALUES
    (v_admin_id, 'admin@footbid.club', 'Tariq Rahman (Chief Director)', 'admin', 'FootBid Commission', '+880 1711-000100'),
    (v_user1_id, 'scout@dhakafc.club', 'Rafiqul Islam (Sporting Scout)', 'user', 'Dhaka Mariners FC', '+880 1711-000201'),
    (v_user2_id, 'director@bengalunited.club', 'Arman Hossain (Club Director)', 'user', 'Bengal United SC', '+880 1711-000302')
  ON CONFLICT (id) DO UPDATE SET
    role = EXCLUDED.role,
    full_name = EXCLUDED.full_name;

  -- 2. Seed Fictional Sample Players (`is_demo = true`)
  -- Player 1: LIVE Auction with active bids
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p1_id,
    'Mateo Valiente',
    '/players/mateo-valiente.svg',
    23,
    'Argentina',
    'Forward',
    'Atletico Rioplatense',
    'Explosive left-footed center-forward with clinical finishing inside the box, high-pressing work rate, and 24 goals in 31 domestic appearances.',
    450000.00,
    25000.00,
    NULL,
    now() - interval '3 hours',
    now() + interval '16 hours',
    'live',
    true,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Player 2: LIVE Auction with multiple competing bids
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p2_id,
    'Zayan Al-Mansoor',
    '/players/zayan-al-mansoor.svg',
    21,
    'Morocco',
    'Midfielder',
    'Casablanca Athletic',
    'Dynamic box-to-box playmaker renowned for line-breaking progressive passes, spatial awareness, and dead-ball precision from distance.',
    320000.00,
    15000.00,
    NULL,
    now() - interval '5 hours',
    now() + interval '9 hours',
    'live',
    true,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Player 3: LIVE Auction with no bids yet (ready for opening bid)
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p3_id,
    'Lukas Lindqvist',
    '/players/lukas-lindqvist.svg',
    25,
    'Sweden',
    'Defender',
    'Malmo Nordic FK',
    'Commanding 1.93m ball-playing center-back with 78% aerial duel success rate and composure under aggressive high lines.',
    280000.00,
    10000.00,
    NULL,
    now() - interval '1 hour',
    now() + interval '22 hours',
    'live',
    true,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Player 4: UPCOMING Auction
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p4_id,
    'Kenji Takahashi',
    '/players/kenji-takahashi.svg',
    22,
    'Japan',
    'Midfielder',
    'Yokohama Mariners SC',
    'Technically gifted attacking midfielder capable of operating in tight half-spaces with elite dribbling efficiency and tactical discipline.',
    390000.00,
    20000.00,
    NULL,
    now() + interval '6 hours',
    now() + interval '36 hours',
    'upcoming',
    true,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Player 5: UPCOMING Auction
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p5_id,
    'Diogo Monteiro',
    '/players/diogo-monteiro.svg',
    26,
    'Portugal',
    'Goalkeeper',
    'Braga Estrela CF',
    'Agile shot-stopper and sweeper-keeper with 15 clean sheets last season and pinpoint long distribution to initiate counter-attacks.',
    250000.00,
    10000.00,
    NULL,
    now() + interval '18 hours',
    now() + interval '60 hours',
    'upcoming',
    true,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Player 6: COMPLETED & SOLD Auction
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p6_id,
    'Kofi Mensah-Bonsu',
    '/players/kofi-mensah.svg',
    24,
    'Ghana',
    'Forward',
    'Accra Gold Stars',
    'Pacey right winger with blistering acceleration, direct 1v1 take-ons, and 14 assists across continental club competitions.',
    300000.00,
    15000.00,
    345000.00,
    now() - interval '48 hours',
    now() - interval '12 hours',
    'sold',
    true,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- Player 7: COMPLETED & UNSOLD Auction
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p7_id,
    'farhan-chowdhury':: text, -- replaced below with proper name
    '/players/farhan-chowdhury.svg',
    20,
    'Bangladesh',
    'Defender',
    'Dhaka Abahani Youth',
    'Promising modern right-back with overlapping stamina, accurate early crosses, and strong recovery tackles on transition.',
    150000.00,
    5000.00,
    NULL,
    now() - interval '72 hours',
    now() - interval '24 hours',
    'unsold',
    true,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  UPDATE public.players SET full_name = 'Farhan Chowdhury' WHERE id = v_p7_id;

  -- Player 8: DRAFT (Unpublished) Listing for Admin Review
  INSERT INTO public.players (
    id, full_name, photo_url, age, nationality, position, current_club,
    description, starting_bid, minimum_bid_increment, current_highest_bid,
    auction_start_time, auction_end_time, auction_status, is_published, is_demo, created_by
  ) VALUES (
    v_p8_id,
    'Rafael Silva Costa',
    '/players/rafael-costa.svg',
    24,
    'Brazil',
    'Forward',
    'Santos Litoral FC',
    'Creative second striker with flair, instinctive one-touch link-up play, and clinical execution from the edge of the penalty area.',
    520000.00,
    25000.00,
    NULL,
    now() + interval '24 hours',
    now() + interval '72 hours',
    'draft',
    false,
    true,
    v_admin_id
  ) ON CONFLICT (id) DO NOTHING;

  -- 3. Place Demo Bids on Live Auctions using `public.place_bid`
  SELECT id INTO v_a1_id FROM public.auctions WHERE player_id = v_p1_id;
  SELECT id INTO v_a2_id FROM public.auctions WHERE player_id = v_p2_id;
  SELECT id INTO v_a6_id FROM public.auctions WHERE player_id = v_p6_id;
  SELECT id INTO v_a7_id FROM public.auctions WHERE player_id = v_p7_id;

  IF v_a1_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bids WHERE auction_id = v_a1_id) THEN
    PERFORM public.place_bid(v_a1_id, 450000.00, 'seed-bid-a1-1', v_user1_id, now() - interval '2 hours');
    PERFORM public.place_bid(v_a1_id, 475000.00, 'seed-bid-a1-2', v_user2_id, now() - interval '90 minutes');
    PERFORM public.place_bid(v_a1_id, 500000.00, 'seed-bid-a1-3', v_user1_id, now() - interval '35 minutes');
  END IF;

  IF v_a2_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bids WHERE auction_id = v_a2_id) THEN
    PERFORM public.place_bid(v_a2_id, 320000.00, 'seed-bid-a2-1', v_user2_id, now() - interval '4 hours');
    PERFORM public.place_bid(v_a2_id, 335000.00, 'seed-bid-a2-2', v_user1_id, now() - interval '2 hours');
    PERFORM public.place_bid(v_a2_id, 355000.00, 'seed-bid-a2-3', v_user2_id, now() - interval '45 minutes');
  END IF;

  -- 4. Seed Historical Bids and Result for Completed Sold Auction (Player 6)
  IF v_a6_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.bids WHERE auction_id = v_a6_id) THEN
    INSERT INTO public.bids (auction_id, player_id, bidder_id, amount, previous_highest_bid, idempotency_key, created_at)
    VALUES
      (v_a6_id, v_p6_id, v_user2_id, 300000.00, NULL, 'seed-bid-a6-1', now() - interval '36 hours'),
      (v_a6_id, v_p6_id, v_user1_id, 315000.00, 300000.00, 'seed-bid-a6-2', now() - interval '28 hours');

    INSERT INTO public.bids (auction_id, player_id, bidder_id, amount, previous_highest_bid, idempotency_key, created_at)
    VALUES
      (v_a6_id, v_p6_id, v_user1_id, 345000.00, 315000.00, 'seed-bid-a6-3', now() - interval '15 hours')
    RETURNING id INTO v_winning_bid_id;

    UPDATE public.auctions
    SET current_highest_bid = 345000.00,
        highest_bidder_id = v_user1_id,
        bid_count = 3,
        status = 'sold',
        finalized_at = now() - interval '12 hours'
    WHERE id = v_a6_id;

    INSERT INTO public.auction_results (
      auction_id, player_id, winning_bid_id, winner_id, final_amount,
      outcome, transaction_completed, completed_by, completed_at, finalized_at, notes
    ) VALUES (
      v_a6_id, v_p6_id, v_winning_bid_id, v_user1_id, 345000.00,
      'sold', true, v_admin_id, now() - interval '10 hours', now() - interval '12 hours',
      'Transfer agreement settled and cleared by FootBid Transfer Committee.'
    ) ON CONFLICT (auction_id) DO NOTHING;
  END IF;

  -- 5. Seed Result for Completed Unsold Auction (Player 7)
  IF v_a7_id IS NOT NULL AND NOT EXISTS (SELECT 1 FROM public.auction_results WHERE auction_id = v_a7_id) THEN
    UPDATE public.auctions
    SET status = 'unsold',
        finalized_at = now() - interval '24 hours'
    WHERE id = v_a7_id;

    INSERT INTO public.auction_results (
      auction_id, player_id, winning_bid_id, winner_id, final_amount,
      outcome, transaction_completed, finalized_at, notes
    ) VALUES (
      v_a7_id, v_p7_id, NULL, NULL, NULL,
      'unsold', false, now() - interval '24 hours',
      'Auction closed with no valid bids received during the bidding window.'
    ) ON CONFLICT (auction_id) DO NOTHING;
  END IF;

  PERFORM set_config('app.allow_role_change', 'false', true);
END $$;
