import crypto from 'crypto';
import { cookies } from 'next/headers';
import { redirect } from 'next/navigation';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withPgLock } from '@/lib/db/postgres-engine';
import type { Profile } from '@/types/database';

const SESSION_COOKIE_NAME = 'footbid_session';

function getSessionSecret(): string {
  return (
    process.env.ADMIN_BOOTSTRAP_SECRET ||
    process.env.SUPABASE_SERVICE_ROLE_KEY ||
    'footbid-local-hmac-signing-key-2026-secure'
  );
}

export function hashPassword(password: string): string {
  const salt = crypto.randomBytes(16).toString('hex');
  const derived = crypto.scryptSync(password, salt, 64).toString('hex');
  return `scrypt:${salt}:${derived}`;
}

export function verifyPassword(password: string, storedHash: string | null): boolean {
  if (!storedHash) return false;
  // Support demo seed accounts with known test credentials
  if (storedHash === 'demo_hashed_admin_2026' && password === 'Admin@12345') return true;
  if (storedHash === 'demo_hashed_user1_2026' && password === 'Bidder@12345') return true;
  if (storedHash === 'demo_hashed_user2_2026' && password === 'Bidder@12345') return true;

  if (!storedHash.startsWith('scrypt:')) return false;
  const parts = storedHash.split(':');
  if (parts.length !== 3) return false;
  const [, salt, originalHex] = parts;
  const derivedHex = crypto.scryptSync(password, salt, 64).toString('hex');
  return crypto.timingSafeEqual(Buffer.from(originalHex, 'hex'), Buffer.from(derivedHex, 'hex'));
}

export function createSignedSessionToken(userId: string): string {
  const payload = JSON.stringify({
    sub: userId,
    iat: Date.now(),
  });
  const base64Payload = Buffer.from(payload).toString('base64url');
  const signature = crypto
    .createHmac('sha256', getSessionSecret())
    .update(base64Payload)
    .digest('base64url');
  return `${base64Payload}.${signature}`;
}

export function verifySignedSessionToken(token: string): string | null {
  try {
    const [base64Payload, signature] = token.split('.');
    if (!base64Payload || !signature) return null;

    const expectedSignature = crypto
      .createHmac('sha256', getSessionSecret())
      .update(base64Payload)
      .digest('base64url');

    if (
      signature.length !== expectedSignature.length ||
      !crypto.timingSafeEqual(Buffer.from(signature), Buffer.from(expectedSignature))
    ) {
      return null;
    }

    const decoded = JSON.parse(Buffer.from(base64Payload, 'base64url').toString('utf8'));
    return typeof decoded.sub === 'string' ? decoded.sub : null;
  } catch {
    return null;
  }
}

/**
 * Retrieves the currently authenticated user's profile from the server session.
 * Never trusts client-supplied role or user IDs.
 */
export async function getCurrentUserProfile(): Promise<Profile | null> {
  const { isConfigured } = getSupabasePublicConfig();

  if (isConfigured) {
    const supabase = await createServerSupabaseClient();
    if (!supabase) return null;

    const {
      data: { user },
      error,
    } = await supabase.auth.getUser();

    if (error || !user) return null;

    const { data: profile } = await supabase
      .from('profiles')
      .select('*')
      .eq('id', user.id)
      .single();

    if (!profile) {
      // Ensure profile row exists
      const fallbackName =
        (user.user_metadata?.full_name as string) || user.email?.split('@')[0] || 'FootBid User';
      const { data: created } = await supabase
        .from('profiles')
        .insert({
          id: user.id,
          email: user.email || '',
          full_name: fallbackName,
          role: 'user',
        })
        .select('*')
        .single();
      return (created as Profile) || null;
    }

    return profile as Profile;
  }

  // Local Persistent PostgreSQL Session Verification
  const cookieStore = await cookies();
  const token = cookieStore.get(SESSION_COOKIE_NAME)?.value;
  if (!token) return null;

  const userId = verifySignedSessionToken(token);
  if (!userId) return null;

  return withPgLock(async (db) => {
    const res = await db.query<Profile>(
      `SELECT id, email, full_name, avatar_url, phone, favorite_club, role, created_at, updated_at
       FROM public.profiles
       WHERE id = $1
       LIMIT 1`,
      [userId]
    );
    return res.rows[0] || null;
  });
}

/**
 * Enforces that a user is signed in. Redirects to `/login` if unauthenticated.
 */
export async function requireAuthenticatedUser(redirectTo?: string): Promise<Profile> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    const target = redirectTo ? `/login?next=${encodeURIComponent(redirectTo)}` : '/login';
    redirect(target);
  }
  return profile;
}

/**
 * Enforces that the current user is an authenticated administrator.
 * Redirects unauthenticated visitors to `/login` and non-admin users to `/dashboard`.
 */
export async function requireAdminUser(): Promise<Profile> {
  const profile = await getCurrentUserProfile();
  if (!profile) {
    redirect('/login?next=/admin');
  }
  if (profile.role !== 'admin') {
    redirect('/dashboard?error=admin_access_required');
  }
  return profile;
}

export async function setLocalSessionCookie(userId: string) {
  const cookieStore = await cookies();
  const token = createSignedSessionToken(userId);
  cookieStore.set(SESSION_COOKIE_NAME, token, {
    httpOnly: true,
    sameSite: 'lax',
    secure: process.env.NODE_ENV === 'production',
    path: '/',
    maxAge: 60 * 60 * 24 * 7, // 7 days
  });
}

export async function clearLocalSessionCookie() {
  const cookieStore = await cookies();
  cookieStore.delete(SESSION_COOKIE_NAME);
}
