-- ============================================================================
-- FootBid: Full-Stack Football Player Bidding Platform
-- Migration: 0001_footbid_schema.sql
-- Database: Supabase PostgreSQL
-- Timezone Note: All timestamps are stored in UTC (TIMESTAMPTZ).
-- Presentation Layer formats timestamps in Asia/Dhaka (Bangladesh Standard Time).
-- ============================================================================

-- Note: `gen_random_uuid()` is built-in in PostgreSQL 13+ / Supabase.
DO $$
BEGIN
  CREATE EXTENSION IF NOT EXISTS "pgcrypto";
EXCEPTION WHEN OTHERS THEN
  NULL;
END $$;

-- ----------------------------------------------------------------------------
-- 0. Compatibility Bootstrap for Standalone PostgreSQL / Local Testing
-- (In Supabase Cloud, schema `auth` and roles already exist and are skipped)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF NOT EXISTS (SELECT 1 FROM pg_namespace WHERE nspname = 'auth') THEN
    CREATE SCHEMA auth;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'anon') THEN
    CREATE ROLE anon NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'authenticated') THEN
    CREATE ROLE authenticated NOLOGIN;
  END IF;
  IF NOT EXISTS (SELECT 1 FROM pg_roles WHERE rolname = 'service_role') THEN
    CREATE ROLE service_role NOLOGIN BYPASSRLS;
  END IF;
END $$;

CREATE TABLE IF NOT EXISTS auth.users (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  email TEXT UNIQUE NOT NULL,
  encrypted_password TEXT,
  raw_user_meta_data JSONB DEFAULT '{}'::jsonb,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'uid'
  ) THEN
    EXECUTE $func$
      CREATE FUNCTION auth.uid() RETURNS UUID
      LANGUAGE sql STABLE
      AS $body$
        SELECT NULLIF(current_setting('request.jwt.claim.sub', true), '')::UUID;
      $body$;
    $func$;
  END IF;

  IF NOT EXISTS (
    SELECT 1 FROM pg_proc p
    JOIN pg_namespace n ON p.pronamespace = n.oid
    WHERE n.nspname = 'auth' AND p.proname = 'role'
  ) THEN
    EXECUTE $func$
      CREATE FUNCTION auth.role() RETURNS TEXT
      LANGUAGE sql STABLE
      AS $body$
        SELECT COALESCE(NULLIF(current_setting('request.jwt.claim.role', true), ''), current_user);
      $body$;
    $func$;
  END IF;
END $$;

-- ----------------------------------------------------------------------------
-- 1. PROFILES TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  email TEXT NOT NULL UNIQUE,
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  avatar_url TEXT,
  phone TEXT,
  favorite_club TEXT,
  role TEXT NOT NULL DEFAULT 'user' CHECK (role IN ('user', 'admin')),
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_profiles_role ON public.profiles(role);
CREATE INDEX IF NOT EXISTS idx_profiles_email ON public.profiles(email);

-- Helper function to check if the current authenticated user is an admin
CREATE OR REPLACE FUNCTION public.is_admin()
RETURNS BOOLEAN
LANGUAGE sql
SECURITY DEFINER
SET search_path = public
STABLE
AS $$
  SELECT EXISTS (
    SELECT 1
    FROM public.profiles
    WHERE id = auth.uid()
      AND role = 'admin'
  );
$$;

-- Trigger function: Prevent non-admins from changing user roles (Privilege Escalation Guard)
CREATE OR REPLACE FUNCTION public.prevent_role_escalation()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF NEW.role IS DISTINCT FROM OLD.role THEN
    -- Allow ONLY if explicit server bootstrap config is enabled, service_role JWT, or verified admin
    IF current_setting('app.allow_role_change', true) = 'true'
       OR current_setting('request.jwt.claim.role', true) = 'service_role'
       OR public.is_admin() THEN
      NEW.updated_at := now();
      RETURN NEW;
    ELSE
      RAISE EXCEPTION 'Unauthorized: Users cannot modify account roles.';
    END IF;
  END IF;
  NEW.updated_at := now();
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_role_escalation ON public.profiles;
CREATE TRIGGER trg_prevent_role_escalation
BEFORE UPDATE ON public.profiles
FOR EACH ROW
EXECUTE FUNCTION public.prevent_role_escalation();

-- Trigger function: Automatically create a `user` profile upon Supabase Auth registration
-- Never trusts role metadata from client signup requests
CREATE OR REPLACE FUNCTION public.handle_new_auth_user()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_full_name TEXT;
BEGIN
  v_full_name := COALESCE(
    NULLIF(trim(NEW.raw_user_meta_data->>'full_name'), ''),
    split_part(NEW.email, '@', 1)
  );
  IF char_length(v_full_name) < 2 THEN
    v_full_name := 'FootBid Member';
  END IF;

  INSERT INTO public.profiles (id, email, full_name, role)
  VALUES (NEW.id, NEW.email, v_full_name, 'user')
  ON CONFLICT (id) DO NOTHING;

  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS on_auth_user_created ON auth.users;
CREATE TRIGGER on_auth_user_created
AFTER INSERT ON auth.users
FOR EACH ROW
EXECUTE FUNCTION public.handle_new_auth_user();

-- ----------------------------------------------------------------------------
-- 2. PLAYERS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.players (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  full_name TEXT NOT NULL CHECK (char_length(trim(full_name)) >= 2),
  photo_url TEXT NOT NULL,
  photo_storage_path TEXT,
  age INTEGER NOT NULL CHECK (age >= 15 AND age <= 55),
  nationality TEXT NOT NULL CHECK (char_length(trim(nationality)) >= 2),
  position TEXT NOT NULL CHECK (position IN ('Goalkeeper', 'Defender', 'Midfielder', 'Forward')),
  current_club TEXT NOT NULL CHECK (char_length(trim(current_club)) >= 2),
  description TEXT NOT NULL CHECK (char_length(trim(description)) >= 10),
  starting_bid NUMERIC(14, 2) NOT NULL CHECK (starting_bid > 0),
  minimum_bid_increment NUMERIC(14, 2) NOT NULL CHECK (minimum_bid_increment > 0),
  current_highest_bid NUMERIC(14, 2) CHECK (current_highest_bid IS NULL OR current_highest_bid >= starting_bid),
  auction_start_time TIMESTAMPTZ NOT NULL,
  auction_end_time TIMESTAMPTZ NOT NULL CHECK (auction_end_time > auction_start_time),
  auction_status TEXT NOT NULL DEFAULT 'upcoming' CHECK (
    auction_status IN ('draft', 'upcoming', 'live', 'ended', 'sold', 'unsold', 'cancelled')
  ),
  is_published BOOLEAN NOT NULL DEFAULT false,
  is_demo BOOLEAN NOT NULL DEFAULT false,
  created_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_players_published_status ON public.players(is_published, auction_status);
CREATE INDEX IF NOT EXISTS idx_players_nationality ON public.players(nationality);
CREATE INDEX IF NOT EXISTS idx_players_position ON public.players(position);
CREATE INDEX IF NOT EXISTS idx_players_starting_bid ON public.players(starting_bid);
CREATE INDEX IF NOT EXISTS idx_players_highest_bid ON public.players(current_highest_bid DESC NULLS LAST);
CREATE INDEX IF NOT EXISTS idx_players_end_time ON public.players(auction_end_time);
CREATE INDEX IF NOT EXISTS idx_players_is_demo ON public.players(is_demo);

-- ----------------------------------------------------------------------------
-- 3. AUCTIONS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auctions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  starting_bid NUMERIC(14, 2) NOT NULL CHECK (starting_bid > 0),
  minimum_bid_increment NUMERIC(14, 2) NOT NULL CHECK (minimum_bid_increment > 0),
  current_highest_bid NUMERIC(14, 2) CHECK (current_highest_bid IS NULL OR current_highest_bid >= starting_bid),
  highest_bidder_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  bid_count INTEGER NOT NULL DEFAULT 0 CHECK (bid_count >= 0),
  start_time TIMESTAMPTZ NOT NULL,
  end_time TIMESTAMPTZ NOT NULL CHECK (end_time > start_time),
  status TEXT NOT NULL DEFAULT 'upcoming' CHECK (
    status IN ('draft', 'upcoming', 'live', 'ended', 'sold', 'unsold', 'cancelled')
  ),
  is_published BOOLEAN NOT NULL DEFAULT false,
  finalized_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_auctions_status_times ON public.auctions(status, start_time, end_time);
CREATE INDEX IF NOT EXISTS idx_auctions_player_id ON public.auctions(player_id);
CREATE INDEX IF NOT EXISTS idx_auctions_highest_bidder ON public.auctions(highest_bidder_id);

-- Trigger: Automatically create or synchronize `public.auctions` when `public.players` is inserted/updated
CREATE OR REPLACE FUNCTION public.sync_player_to_auction()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
  IF TG_OP = 'INSERT' THEN
    INSERT INTO public.auctions (
      player_id,
      starting_bid,
      minimum_bid_increment,
      current_highest_bid,
      start_time,
      end_time,
      status,
      is_published
    ) VALUES (
      NEW.id,
      NEW.starting_bid,
      NEW.minimum_bid_increment,
      NEW.current_highest_bid,
      NEW.auction_start_time,
      NEW.auction_end_time,
      NEW.auction_status,
      NEW.is_published
    )
    ON CONFLICT (player_id) DO UPDATE SET
      starting_bid = EXCLUDED.starting_bid,
      minimum_bid_increment = EXCLUDED.minimum_bid_increment,
      start_time = EXCLUDED.start_time,
      end_time = EXCLUDED.end_time,
      status = EXCLUDED.status,
      is_published = EXCLUDED.is_published,
      updated_at = now();
  ELSIF TG_OP = 'UPDATE' THEN
    UPDATE public.auctions
    SET
      starting_bid = NEW.starting_bid,
      minimum_bid_increment = NEW.minimum_bid_increment,
      current_highest_bid = NEW.current_highest_bid,
      start_time = NEW.auction_start_time,
      end_time = NEW.auction_end_time,
      status = NEW.auction_status,
      is_published = NEW.is_published,
      updated_at = now()
    WHERE player_id = NEW.id;
  END IF;
  RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_sync_player_to_auction ON public.players;
CREATE TRIGGER trg_sync_player_to_auction
AFTER INSERT OR UPDATE ON public.players
FOR EACH ROW
EXECUTE FUNCTION public.sync_player_to_auction();

-- ----------------------------------------------------------------------------
-- 4. BIDS TABLE (Immutable Audit Trail)
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.bids (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL REFERENCES public.auctions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL REFERENCES public.players(id) ON DELETE CASCADE,
  bidder_id UUID NOT NULL REFERENCES public.profiles(id) ON DELETE RESTRICT,
  amount NUMERIC(14, 2) NOT NULL CHECK (amount > 0),
  previous_highest_bid NUMERIC(14, 2),
  idempotency_key TEXT UNIQUE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX IF NOT EXISTS idx_bids_auction_amount ON public.bids(auction_id, amount DESC, created_at ASC);
CREATE INDEX IF NOT EXISTS idx_bids_player_created ON public.bids(player_id, created_at DESC);
CREATE INDEX IF NOT EXISTS idx_bids_bidder_created ON public.bids(bidder_id, created_at DESC);

-- Trigger: Prevent any modification or deletion of accepted bids (unless cascading player delete by admin)
CREATE OR REPLACE FUNCTION public.prevent_bid_modification()
RETURNS TRIGGER
LANGUAGE plpgsql
AS $$
BEGIN
  IF TG_OP = 'UPDATE' THEN
    RAISE EXCEPTION 'Immutable record: Accepted bids cannot be altered.';
  END IF;
  IF TG_OP = 'DELETE' AND current_setting('app.allow_cascade_delete', true) IS DISTINCT FROM 'true' THEN
    RAISE EXCEPTION 'Immutable record: Accepted bids cannot be deleted.';
  END IF;
  RETURN OLD;
END;
$$;

DROP TRIGGER IF EXISTS trg_prevent_bid_modification ON public.bids;
CREATE TRIGGER trg_prevent_bid_modification
BEFORE UPDATE OR DELETE ON public.bids
FOR EACH ROW
EXECUTE FUNCTION public.prevent_bid_modification();

-- ----------------------------------------------------------------------------
-- 5. AUCTION RESULTS TABLE
-- ----------------------------------------------------------------------------
CREATE TABLE IF NOT EXISTS public.auction_results (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  auction_id UUID NOT NULL UNIQUE REFERENCES public.auctions(id) ON DELETE CASCADE,
  player_id UUID NOT NULL UNIQUE REFERENCES public.players(id) ON DELETE CASCADE,
  winning_bid_id UUID REFERENCES public.bids(id) ON DELETE RESTRICT,
  winner_id UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  final_amount NUMERIC(14, 2),
  outcome TEXT NOT NULL CHECK (outcome IN ('sold', 'unsold', 'pending_settlement')),
  transaction_completed BOOLEAN NOT NULL DEFAULT false,
  completed_by UUID REFERENCES public.profiles(id) ON DELETE SET NULL,
  completed_at TIMESTAMPTZ,
  finalized_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  notes TEXT
);

CREATE INDEX IF NOT EXISTS idx_auction_results_winner ON public.auction_results(winner_id);
CREATE INDEX IF NOT EXISTS idx_auction_results_outcome ON public.auction_results(outcome);

-- ----------------------------------------------------------------------------
-- 6. CONCURRENCY-SAFE BIDDING & FINALIZATION FUNCTIONS
-- ----------------------------------------------------------------------------

-- Function: Synchronize auction statuses based on authoritative server UTC time
CREATE OR REPLACE FUNCTION public.sync_auction_statuses(p_reference_time TIMESTAMPTZ DEFAULT NULL)
RETURNS INTEGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := COALESCE(p_reference_time, now());
  v_expired RECORD;
  v_updated_count INTEGER := 0;
BEGIN
  -- 1. Transition published 'upcoming' auctions whose start_time has arrived into 'live'
  UPDATE public.players p
  SET
    auction_status = 'live',
    updated_at = v_now
  WHERE p.is_published = true
    AND p.auction_status = 'upcoming'
    AND v_now >= p.auction_start_time
    AND v_now < p.auction_end_time;

  GET DIAGNOSTICS v_updated_count = ROW_COUNT;

  -- 2. Finalize any published 'upcoming' or 'live' auctions whose end_time has passed
  FOR v_expired IN
    SELECT a.id
    FROM public.auctions a
    WHERE a.is_published = true
      AND a.status IN ('upcoming', 'live', 'ended')
      AND v_now >= a.end_time
      AND NOT EXISTS (
        SELECT 1 FROM public.auction_results ar WHERE ar.auction_id = a.id
      )
  LOOP
    PERFORM public.finalize_auction(v_expired.id, false, v_now);
    v_updated_count := v_updated_count + 1;
  END LOOP;

  RETURN v_updated_count;
END;
$$;

-- Function: Finalize an auction idempotently with row-level locking
CREATE OR REPLACE FUNCTION public.finalize_auction(
  p_auction_id UUID,
  p_force_admin BOOLEAN DEFAULT false,
  p_reference_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_now TIMESTAMPTZ := COALESCE(p_reference_time, now());
  v_auction public.auctions%ROWTYPE;
  v_existing_result public.auction_results%ROWTYPE;
  v_winning_bid public.bids%ROWTYPE;
  v_final_status TEXT;
  v_outcome TEXT;
  v_result_id UUID;
BEGIN
  -- Lock the auction row to prevent race conditions when multiple requests finalize simultaneously
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'Auction not found.';
  END IF;

  -- If already finalized, return the existing result idempotently
  SELECT * INTO v_existing_result
  FROM public.auction_results
  WHERE auction_id = p_auction_id;

  IF FOUND THEN
    RETURN jsonb_build_object(
      'already_finalized', true,
      'auction_id', v_existing_result.auction_id,
      'player_id', v_existing_result.player_id,
      'outcome', v_existing_result.outcome,
      'winner_id', v_existing_result.winner_id,
      'final_amount', v_existing_result.final_amount,
      'transaction_completed', v_existing_result.transaction_completed
    );
  END IF;

  -- Verify the auction has reached its end time unless forced by an admin
  IF v_now < v_auction.end_time AND NOT p_force_admin THEN
    RAISE EXCEPTION 'Auction cannot be finalized before its scheduled end time.';
  END IF;

  -- Determine the highest valid bid placed within the valid auction window
  -- Tie-breaking rule: Highest amount wins; if amounts were ever identical, earliest timestamp wins.
  SELECT * INTO v_winning_bid
  FROM public.bids
  WHERE auction_id = p_auction_id
    AND created_at >= v_auction.start_time
    AND created_at <= v_auction.end_time
  ORDER BY amount DESC, created_at ASC
  LIMIT 1;

  IF FOUND THEN
    v_final_status := 'sold';
    v_outcome := 'sold';

    INSERT INTO public.auction_results (
      auction_id,
      player_id,
      winning_bid_id,
      winner_id,
      final_amount,
      outcome,
      transaction_completed,
      finalized_at
    ) VALUES (
      v_auction.id,
      v_auction.player_id,
      v_winning_bid.id,
      v_winning_bid.bidder_id,
      v_winning_bid.amount,
      v_outcome,
      false,
      v_now
    )
    RETURNING id INTO v_result_id;

    UPDATE public.players
    SET
      current_highest_bid = v_winning_bid.amount,
      auction_status = v_final_status,
      updated_at = v_now
    WHERE id = v_auction.player_id;

    UPDATE public.auctions
    SET
      current_highest_bid = v_winning_bid.amount,
      highest_bidder_id = v_winning_bid.bidder_id,
      status = v_final_status,
      finalized_at = v_now,
      updated_at = v_now
    WHERE id = v_auction.id;
  ELSE
    v_final_status := 'unsold';
    v_outcome := 'unsold';

    INSERT INTO public.auction_results (
      auction_id,
      player_id,
      winning_bid_id,
      winner_id,
      final_amount,
      outcome,
      transaction_completed,
      finalized_at
    ) VALUES (
      v_auction.id,
      v_auction.player_id,
      NULL,
      NULL,
      NULL,
      v_outcome,
      false,
      v_now
    )
    RETURNING id INTO v_result_id;

    UPDATE public.players
    SET
      auction_status = v_final_status,
      updated_at = v_now
    WHERE id = v_auction.player_id;

    UPDATE public.auctions
    SET
      status = v_final_status,
      finalized_at = v_now,
      updated_at = v_now
    WHERE id = v_auction.id;
  END IF;

  RETURN jsonb_build_object(
    'already_finalized', false,
    'result_id', v_result_id,
    'auction_id', v_auction.id,
    'player_id', v_auction.player_id,
    'outcome', v_outcome,
    'winner_id', v_winning_bid.bidder_id,
    'final_amount', v_winning_bid.amount,
    'transaction_completed', false
  );
END;
$$;

-- Function: Concurrency-Safe Bid Placement (`public.place_bid`)
-- Uses PostgreSQL row-level locking (`FOR UPDATE`) to serialize simultaneous bids.
CREATE OR REPLACE FUNCTION public.place_bid(
  p_auction_id UUID,
  p_bid_amount NUMERIC,
  p_idempotency_key TEXT DEFAULT NULL,
  p_caller_id UUID DEFAULT NULL,
  p_reference_time TIMESTAMPTZ DEFAULT NULL
)
RETURNS JSONB
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
DECLARE
  v_user_id UUID;
  v_now TIMESTAMPTZ := COALESCE(p_reference_time, now());
  v_auction public.auctions%ROWTYPE;
  v_profile public.profiles%ROWTYPE;
  v_min_required NUMERIC(14, 2);
  v_prev_highest NUMERIC(14, 2);
  v_new_bid public.bids%ROWTYPE;
BEGIN
  -- 1. Resolve and validate authenticated user
  v_user_id := COALESCE(auth.uid(), p_caller_id);
  IF v_user_id IS NULL THEN
    RAISE EXCEPTION 'Authentication required: Please sign in to place a bid.';
  END IF;

  SELECT * INTO v_profile
  FROM public.profiles
  WHERE id = v_user_id;

  IF NOT FOUND THEN
    RAISE EXCEPTION 'User profile not found.';
  END IF;

  -- 2. Check idempotency key to prevent accidental double submission
  IF p_idempotency_key IS NOT NULL AND char_length(trim(p_idempotency_key)) > 0 THEN
    IF EXISTS (SELECT 1 FROM public.bids WHERE idempotency_key = p_idempotency_key) THEN
      RAISE EXCEPTION 'Duplicate bid submission detected.';
    END IF;
  END IF;

  -- 3. Validate bid amount is a valid positive number
  IF p_bid_amount IS NULL OR p_bid_amount <= 0 THEN
    RAISE EXCEPTION 'Invalid bid amount.';
  END IF;

  -- 4. Acquire exclusive row lock on the target auction
  SELECT * INTO v_auction
  FROM public.auctions
  WHERE id = p_auction_id
  FOR UPDATE;

  IF NOT FOUND THEN
    -- Also allow passing player_id as p_auction_id for convenience
    SELECT * INTO v_auction
    FROM public.auctions
    WHERE player_id = p_auction_id
    FOR UPDATE;

    IF NOT FOUND THEN
      RAISE EXCEPTION 'Auction not found.';
    END IF;
  END IF;

  -- 5. Validate publication and status rules
  IF NOT v_auction.is_published THEN
    RAISE EXCEPTION 'Bidding is not permitted on unpublished listings.';
  END IF;

  IF v_auction.status IN ('draft', 'cancelled', 'ended', 'sold', 'unsold') THEN
    RAISE EXCEPTION 'This auction is % and no longer accepts bids.', v_auction.status;
  END IF;

  -- 6. Validate authoritative server time window
  IF v_now < v_auction.start_time THEN
    RAISE EXCEPTION 'Auction has not started yet. Bidding opens at %.', v_auction.start_time;
  END IF;

  IF v_now >= v_auction.end_time THEN
    -- Auto-finalize the expired auction and reject the late bid
    PERFORM public.finalize_auction(v_auction.id, false, v_now);
    RAISE EXCEPTION 'Auction has already ended. Late bids are not accepted.';
  END IF;

  -- 7. Calculate minimum required bid according to business rules
  v_prev_highest := v_auction.current_highest_bid;
  IF v_prev_highest IS NULL THEN
    v_min_required := v_auction.starting_bid;
  ELSE
    v_min_required := v_prev_highest + v_auction.minimum_bid_increment;
  END IF;

  IF p_bid_amount < v_min_required THEN
    RAISE EXCEPTION 'Bid rejected: Minimum valid bid is $%.', trim(to_char(v_min_required, '999,999,999,990.00'));
  END IF;

  -- 8. Record the accepted bid permanently
  INSERT INTO public.bids (
    auction_id,
    player_id,
    bidder_id,
    amount,
    previous_highest_bid,
    idempotency_key,
    created_at
  ) VALUES (
    v_auction.id,
    v_auction.player_id,
    v_user_id,
    p_bid_amount,
    v_prev_highest,
    NULLIF(trim(p_idempotency_key), ''),
    v_now
  )
  RETURNING * INTO v_new_bid;

  -- 9. Update auction and player state atomically
  UPDATE public.players
  SET
    current_highest_bid = p_bid_amount,
    auction_status = 'live',
    updated_at = v_now
  WHERE id = v_auction.player_id;

  UPDATE public.auctions
  SET
    current_highest_bid = p_bid_amount,
    highest_bidder_id = v_user_id,
    bid_count = bid_count + 1,
    status = 'live',
    updated_at = v_now
  WHERE id = v_auction.id;

  RETURN jsonb_build_object(
    'bid_id', v_new_bid.id,
    'auction_id', v_auction.id,
    'player_id', v_auction.player_id,
    'bidder_id', v_user_id,
    'bidder_name', v_profile.full_name,
    'amount', v_new_bid.amount,
    'previous_highest_bid', v_prev_highest,
    'next_minimum_bid', v_new_bid.amount + v_auction.minimum_bid_increment,
    'created_at', v_new_bid.created_at
  );
END;
$$;

-- ----------------------------------------------------------------------------
-- 7. ROW LEVEL SECURITY (RLS) POLICIES
-- ----------------------------------------------------------------------------
ALTER TABLE public.profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.players ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auctions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.bids ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.auction_results ENABLE ROW LEVEL SECURITY;

-- PROFILES POLICIES
DROP POLICY IF EXISTS "profiles_select_policy" ON public.profiles;
CREATE POLICY "profiles_select_policy"
ON public.profiles FOR SELECT
USING (true);

DROP POLICY IF EXISTS "profiles_insert_own" ON public.profiles;
CREATE POLICY "profiles_insert_own"
ON public.profiles FOR INSERT
WITH CHECK (auth.uid() = id AND role = 'user');

DROP POLICY IF EXISTS "profiles_update_own_or_admin" ON public.profiles;
CREATE POLICY "profiles_update_own_or_admin"
ON public.profiles FOR UPDATE
USING (auth.uid() = id OR public.is_admin())
WITH CHECK (auth.uid() = id OR public.is_admin());

-- PLAYERS POLICIES
DROP POLICY IF EXISTS "players_select_published_or_admin" ON public.players;
CREATE POLICY "players_select_published_or_admin"
ON public.players FOR SELECT
USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "players_admin_insert" ON public.players;
CREATE POLICY "players_admin_insert"
ON public.players FOR INSERT
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "players_admin_update" ON public.players;
CREATE POLICY "players_admin_update"
ON public.players FOR UPDATE
USING (public.is_admin())
WITH CHECK (public.is_admin());

DROP POLICY IF EXISTS "players_admin_delete" ON public.players;
CREATE POLICY "players_admin_delete"
ON public.players FOR DELETE
USING (public.is_admin());

-- AUCTIONS POLICIES
DROP POLICY IF EXISTS "auctions_select_published_or_admin" ON public.auctions;
CREATE POLICY "auctions_select_published_or_admin"
ON public.auctions FOR SELECT
USING (is_published = true OR public.is_admin());

DROP POLICY IF EXISTS "auctions_admin_all" ON public.auctions;
CREATE POLICY "auctions_admin_all"
ON public.auctions FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

-- BIDS POLICIES (Read allowed for published auctions/own bids/admin; Direct writes blocked)
DROP POLICY IF EXISTS "bids_select_policy" ON public.bids;
CREATE POLICY "bids_select_policy"
ON public.bids FOR SELECT
USING (
  bidder_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.auctions a
    WHERE a.id = bids.auction_id AND a.is_published = true
  )
);

-- AUCTION RESULTS POLICIES
DROP POLICY IF EXISTS "auction_results_select_policy" ON public.auction_results;
CREATE POLICY "auction_results_select_policy"
ON public.auction_results FOR SELECT
USING (
  winner_id = auth.uid()
  OR public.is_admin()
  OR EXISTS (
    SELECT 1 FROM public.auctions a
    WHERE a.id = auction_results.auction_id AND a.is_published = true
  )
);

DROP POLICY IF EXISTS "auction_results_admin_write" ON public.auction_results;
CREATE POLICY "auction_results_admin_write"
ON public.auction_results FOR ALL
USING (public.is_admin())
WITH CHECK (public.is_admin());

GRANT USAGE ON SCHEMA public TO anon, authenticated, service_role;
GRANT USAGE ON SCHEMA auth TO anon, authenticated, service_role;
GRANT SELECT, INSERT, UPDATE, DELETE ON ALL TABLES IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA public TO anon, authenticated, service_role;
GRANT EXECUTE ON ALL FUNCTIONS IN SCHEMA auth TO anon, authenticated, service_role;

-- ----------------------------------------------------------------------------
-- 8. SUPABASE STORAGE BUCKET & POLICIES (`player-photos`)
-- ----------------------------------------------------------------------------
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.tables
    WHERE table_schema = 'storage' AND table_name = 'buckets'
  ) THEN
    INSERT INTO storage.buckets (id, name, public, file_size_limit, allowed_mime_types)
    VALUES (
      'player-photos',
      'player-photos',
      true,
      5242880, -- 5MB limit
      ARRAY['image/jpeg', 'image/png', 'image/webp', 'image/svg+xml']
    )
    ON CONFLICT (id) DO UPDATE SET
      public = EXCLUDED.public,
      file_size_limit = EXCLUDED.file_size_limit,
      allowed_mime_types = EXCLUDED.allowed_mime_types;
  END IF;
END $$;
