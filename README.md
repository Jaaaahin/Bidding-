# FootBid — Full-Stack Football Player Bidding Platform

**FootBid** is a production-ready football player auction and transfer bidding platform built with **TypeScript, Next.js (App Router), React, Tailwind CSS, Supabase (PostgreSQL, Auth, Storage, Realtime), and Vercel**.

---

## 1. Key Capabilities & Security Architecture

- **Role-Based Access Control (`admin` vs `user` vs `public visitor`)**:
  - **Public Visitors**: Browse published players, search/filter/sort listings, view player scouting profiles and live countdowns, and are prompted to sign in before placing bids.
  - **Registered Users (`user`)**: Register, sign in/out, place real-time bids on active (`live`) auctions, see whether they are currently the highest bidder, and view their personal bidding history and won auction results.
  - **Administrators (`admin`)**: Access the protected `/admin` command center to create, edit, publish, unpublish, and delete player listings, upload player photographs, configure starting bids and minimum increments, schedule auction start/end times, inspect all bids/bidders, finalize auctions, and mark completed transfer transactions as sold.
- **Concurrency-Safe Bidding (`public.place_bid`)**:
  - Uses PostgreSQL row-level locking (`SELECT ... FROM public.auctions WHERE id = p_auction_id FOR UPDATE`) inside a `SECURITY DEFINER` stored procedure to serialize simultaneous bids.
  - Validates caller authentication, idempotency key (preventing duplicate double-click submissions), publication state, active auction window against authoritative server UTC time, starting price, and minimum bid increment.
  - Accepted bids are permanent and protected by a PostgreSQL immutability trigger (`trg_prevent_bid_modification`) and Row Level Security (RLS).
- **Server-Authoritative Time & Asia/Dhaka Display**:
  - All timestamps are stored consistently in UTC (`TIMESTAMPTZ`).
  - Dates and schedules are displayed and entered in **Bangladesh Standard Time (`Asia/Dhaka`, UTC+06:00)**.
  - Countdowns calibrate against authoritative server UTC time (`/api/time`) rather than trusting the browser clock.
- **Demo vs Real Data Separation**:
  - Initial fictional sample players are flagged with `is_demo = true` so they remain clearly separated from real club records and can be filtered or removed independently.

---

## 2. Environment Variables (`.env.example`)

Copy `.env.example` to `.env.local` for local development. Never commit real keys or secrets to Git.

| Variable | Scope | Description |
| :--- | :--- | :--- |
| `NEXT_PUBLIC_SUPABASE_URL` | Public (Client & Server) | Your Supabase project URL (`https://<project-ref>.supabase.co`) |
| `NEXT_PUBLIC_SUPABASE_ANON_KEY` | Public (Client & Server) | Your Supabase public `anon` / publishable key |
| `SUPABASE_SERVICE_ROLE_KEY` | **Server-Only** | Supabase `service_role` secret key (never exposed to client code) |
| `ADMIN_BOOTSTRAP_SECRET` | **Server-Only** | Secret token used to bootstrap the first admin account |
| `NEXT_PUBLIC_SITE_URL` | Public | Canonical site URL (`http://localhost:3000` locally, or `https://your-app.vercel.app` in production) |
| `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` | Public | Storage bucket name for player photos (default: `player-photos`) |

---

## 3. Local Development Setup

1. **Install Dependencies**:
   ```bash
   npm install
   ```
2. **Configure Environment Variables**:
   ```bash
   cp .env.example .env.local
   ```
   *(Note: If you run `npm run dev` before adding cloud Supabase credentials to `.env.local`, FootBid automatically initializes a persistent local PostgreSQL database in `.data/footbid-pg` using `supabase/migrations/0001_footbid_schema.sql` and `supabase/seed.sql` so you can test all PostgreSQL functions, triggers, and workflows immediately.)*
3. **Start Development Server**:
   ```bash
   npm run dev
   ```
   Open `http://localhost:3000`.
4. **Run Automated Tests, Typecheck & Production Build**:
   ```bash
   npm test
   npm run typecheck
   npm run build
   ```

---

## 4. Supabase Project Setup Guide

### Step 1: Create a Supabase Project
1. Sign in to [https://supabase.com/dashboard](https://supabase.com/dashboard) and click **New Project**.
2. Choose an organization, enter **FootBid** as the project name, generate a strong database password, and select the closest region (e.g., Singapore `ap-southeast-1` for lowest latency to Bangladesh).
3. Once provisioned, navigate to **Project Settings → API** and copy:
   - **Project URL** → `NEXT_PUBLIC_SUPABASE_URL`
   - **`anon` `public` key** → `NEXT_PUBLIC_SUPABASE_ANON_KEY`
   - **`service_role` `secret` key** → `SUPABASE_SERVICE_ROLE_KEY`

### Step 2: Run SQL Migrations & Optional Demo Seed
1. Open **SQL Editor** in your Supabase Dashboard.
2. Paste and execute the contents of [`supabase/migrations/0001_footbid_schema.sql`](./supabase/migrations/0001_footbid_schema.sql).
   - This creates `profiles`, `players`, `auctions`, `bids`, and `auction_results`, along with all indexes, constraints, Row Level Security (RLS) policies, triggers, and the `place_bid`, `finalize_auction`, and `sync_auction_statuses` PostgreSQL functions.
3. *(Optional)* To populate initial fictional demo players (`is_demo = true`), run [`supabase/seed.sql`](./supabase/seed.sql) in the SQL Editor.

### Step 3: Initialize the First Admin Account
Public registration never grants `admin` privileges. To create your first administrator account:
1. Register your account normally on the website at `/register`.
2. Open the **Supabase SQL Editor** and execute the following trusted database operation:
   ```sql
   BEGIN;
   SELECT set_config('app.allow_role_change', 'true', true);
   UPDATE public.profiles
   SET role = 'admin', updated_at = now()
   WHERE email = 'your-admin-email@example.com';
   COMMIT;
   ```
3. Refresh your browser session — you now have full access to `/admin` and can promote additional administrators from `/admin/settings`.

### Step 4: Configure Supabase Auth Redirect & Site URLs
1. In the Supabase Dashboard, navigate to **Authentication → URL Configuration**.
2. Set **Site URL**:
   - Local development: `http://localhost:3000`
   - Production: `https://your-footbid-domain.vercel.app`
3. Add **Redirect URLs**:
   - `http://localhost:3000/**`
   - `https://your-footbid-domain.vercel.app/**`
   - `https://*-your-vercel-team.vercel.app/**` *(for Vercel preview deployments)*

### Step 5: Configure Supabase Storage Bucket (`player-photos`)
The migration `0001_footbid_schema.sql` automatically creates the public bucket `player-photos` (5MB limit, allowing `image/jpeg`, `image/png`, `image/webp`, `image/svg+xml`).
To verify or configure storage policies manually in **Storage → Policies** under `storage.objects`:
```sql
-- Public read access for player photos
CREATE POLICY "Public read access for player-photos"
ON storage.objects FOR SELECT
USING (bucket_id = 'player-photos');

-- Admin-only upload/update/delete access
CREATE POLICY "Admins can upload player-photos"
ON storage.objects FOR INSERT
TO authenticated
WITH CHECK (bucket_id = 'player-photos' AND public.is_admin());

CREATE POLICY "Admins can update player-photos"
ON storage.objects FOR UPDATE
TO authenticated
USING (bucket_id = 'player-photos' AND public.is_admin());

CREATE POLICY "Admins can delete player-photos"
ON storage.objects FOR DELETE
TO authenticated
USING (bucket_id = 'player-photos' AND public.is_admin());
```

### Step 6: Enable Supabase Realtime
In the Supabase Dashboard, go to **Database → Publications → `supabase_realtime`** and enable Realtime replication for the `players`, `auctions`, and `bids` tables so connected browsers receive instant live bid updates.

---

## 5. Vercel Production Deployment Guide

### Step 1: Push Repository to GitHub
```bash
git add .
git commit -m "feat: complete FootBid full-stack football player bidding platform"
git branch -M main
git remote add origin https://github.com/<your-username>/footbid.git
git push -u origin main
```

### Step 2: Import Repository into Vercel
1. Log in to [https://vercel.com/new](https://vercel.com/new).
2. Select your `footbid` GitHub repository and click **Import**.
3. Verify the preset is detected as **Next.js**.

### Step 3: Add Environment Variables in Vercel
In the Vercel project setup (or **Settings → Environment Variables**), add the following variables for **Production**, **Preview**, and **Development**:
- `NEXT_PUBLIC_SUPABASE_URL`
- `NEXT_PUBLIC_SUPABASE_ANON_KEY`
- `SUPABASE_SERVICE_ROLE_KEY`
- `ADMIN_BOOTSTRAP_SECRET`
- `NEXT_PUBLIC_SITE_URL` (set to your production Vercel domain, e.g., `https://footbid.vercel.app`)
- `NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET` (`player-photos`)

### Step 4: Configure Automatic Deployments & Redeployment Rules
- **Production Branch**: Under **Settings → Git**, ensure the Production Branch is set to `main`. Every push to `main` automatically builds and deploys to production.
- **When Redeployment is Required**:
  - Whenever you add or modify any environment variable in Vercel—especially `NEXT_PUBLIC_*` variables, which Next.js inlines into the client bundle at build time—you **must trigger a new deployment** (**Deployments → Redeploy**) for the updated values to take effect.

### Step 5: Deployment Troubleshooting
- **Build fails with TypeScript or ESLint errors**: Run `npm run typecheck` and `npm run build` locally before pushing to catch any type mismatches.
- **Auth login redirects to `localhost:3000` in production**: Update the **Site URL** and **Redirect URLs** in **Supabase Dashboard → Authentication → URL Configuration** to match your `https://*.vercel.app` domain, and update `NEXT_PUBLIC_SITE_URL` in Vercel followed by a Redeploy.
- **Bids fail with `function public.place_bid does not exist`**: Ensure you ran the entire `supabase/migrations/0001_footbid_schema.sql` script in the Supabase SQL Editor.
- **Image upload returns 403 Unauthorized**: Verify your user account has `role = 'admin'` in `public.profiles` and that `SUPABASE_SERVICE_ROLE_KEY` is set in Vercel Environment Variables.
