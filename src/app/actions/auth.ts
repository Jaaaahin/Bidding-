'use server';

import { revalidatePath } from 'next/cache';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { createServerSupabaseClient } from '@/lib/supabase/server';
import { withPgLock } from '@/lib/db/postgres-engine';
import {
  clearLocalSessionCookie,
  getCurrentUserProfile,
  hashPassword,
  setLocalSessionCookie,
  verifyPassword,
} from '@/lib/auth/session';
import { updateUserProfile } from '@/lib/db/repository';

export interface AuthActionResult {
  success: boolean;
  error?: string;
  redirectTo?: string;
  role?: 'user' | 'admin';
}

export async function registerUserAction(input: {
  fullName: string;
  email: string;
  password: string;
  favoriteClub?: string;
  phone?: string;
}): Promise<AuthActionResult> {
  try {
    const fullName = input.fullName?.trim() || '';
    const email = input.email?.trim().toLowerCase() || '';
    const password = input.password || '';
    const favoriteClub = input.favoriteClub?.trim() || null;
    const phone = input.phone?.trim() || null;

    if (fullName.length < 2) {
      return { success: false, error: 'Full name must be at least 2 characters.' };
    }
    if (!/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      return { success: false, error: 'Please provide a valid email address.' };
    }
    if (password.length < 8) {
      return { success: false, error: 'Password must be at least 8 characters long.' };
    }

    const { isConfigured } = getSupabasePublicConfig();

    if (isConfigured) {
      const supabase = await createServerSupabaseClient();
      if (!supabase) {
        return { success: false, error: 'Supabase client is unavailable.' };
      }

      const { data, error } = await supabase.auth.signUp({
        email,
        password,
        options: {
          data: {
            full_name: fullName,
          },
        },
      });

      if (error) {
        return { success: false, error: error.message };
      }

      if (data.user && (favoriteClub || phone)) {
        await supabase
          .from('profiles')
          .update({
            full_name: fullName,
            favorite_club: favoriteClub,
            phone,
          })
          .eq('id', data.user.id);
      }

      revalidatePath('/', 'layout');
      return {
        success: true,
        role: 'user',
        redirectTo: '/dashboard',
      };
    }

    // Local Persistent PostgreSQL Registration
    const userId = await withPgLock(async (db) => {
      const existing = await db.query<{ id: string }>(
        `SELECT id FROM auth.users WHERE lower(email) = lower($1) LIMIT 1`,
        [email]
      );
      if (existing.rows[0]) {
        throw new Error('An account with this email address already exists.');
      }

      const encryptedPassword = hashPassword(password);
      const metaJson = JSON.stringify({ full_name: fullName });

      // Inserting into auth.users fires `on_auth_user_created` which inserts into `public.profiles` with role = 'user'
      const insertUser = await db.query<{ id: string }>(
        `
        INSERT INTO auth.users (email, encrypted_password, raw_user_meta_data)
        VALUES ($1, $2, $3::jsonb)
        RETURNING id
        `,
        [email, encryptedPassword, metaJson]
      );

      const newId = insertUser.rows[0].id;

      if (favoriteClub || phone) {
        await db.query(
          `UPDATE public.profiles SET favorite_club = $1, phone = $2 WHERE id = $3`,
          [favoriteClub, phone, newId]
        );
      }

      return newId;
    });

    await setLocalSessionCookie(userId);
    revalidatePath('/', 'layout');

    return {
      success: true,
      role: 'user',
      redirectTo: '/dashboard',
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Registration failed. Please try again.',
    };
  }
}

export async function loginUserAction(input: {
  email: string;
  password: string;
  nextUrl?: string;
}): Promise<AuthActionResult> {
  try {
    const email = input.email?.trim().toLowerCase() || '';
    const password = input.password || '';

    if (!email || !password) {
      return { success: false, error: 'Email and password are required.' };
    }

    const { isConfigured } = getSupabasePublicConfig();

    if (isConfigured) {
      const supabase = await createServerSupabaseClient();
      if (!supabase) {
        return { success: false, error: 'Supabase client is unavailable.' };
      }

      const { data, error } = await supabase.auth.signInWithPassword({
        email,
        password,
      });

      if (error || !data.user) {
        return { success: false, error: error?.message || 'Invalid login credentials.' };
      }

      const { data: profile } = await supabase
        .from('profiles')
        .select('role')
        .eq('id', data.user.id)
        .single();

      const role = (profile?.role as 'user' | 'admin') || 'user';
      revalidatePath('/', 'layout');

      return {
        success: true,
        role,
        redirectTo: input.nextUrl || (role === 'admin' ? '/admin' : '/dashboard'),
      };
    }

    // Local Persistent PostgreSQL Login
    const authUser = await withPgLock(async (db) => {
      const res = await db.query<{
        id: string;
        email: string;
        encrypted_password: string | null;
        role: 'user' | 'admin';
      }>(
        `
        SELECT u.id, u.email, u.encrypted_password, p.role
        FROM auth.users u
        JOIN public.profiles p ON p.id = u.id
        WHERE lower(u.email) = lower($1)
        LIMIT 1
        `,
        [email]
      );
      return res.rows[0] || null;
    });

    if (!authUser || !verifyPassword(password, authUser.encrypted_password)) {
      return {
        success: false,
        error: 'Invalid email or password. Please check your credentials and try again.',
      };
    }

    await setLocalSessionCookie(authUser.id);
    revalidatePath('/', 'layout');

    const defaultRedirect = authUser.role === 'admin' ? '/admin' : '/dashboard';
    const safeNext =
      input.nextUrl && input.nextUrl.startsWith('/') && !input.nextUrl.startsWith('//')
        ? input.nextUrl
        : defaultRedirect;

    return {
      success: true,
      role: authUser.role,
      redirectTo: safeNext,
    };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Login failed. Please try again.',
    };
  }
}

export async function logoutUserAction(): Promise<{ success: boolean }> {
  const { isConfigured } = getSupabasePublicConfig();
  if (isConfigured) {
    const supabase = await createServerSupabaseClient();
    if (supabase) {
      await supabase.auth.signOut();
    }
  }
  await clearLocalSessionCookie();
  revalidatePath('/', 'layout');
  return { success: true };
}

export async function updateProfileAction(input: {
  fullName: string;
  phone?: string;
  favoriteClub?: string;
}): Promise<{ success: boolean; error?: string }> {
  try {
    const currentUser = await getCurrentUserProfile();
    if (!currentUser) {
      return { success: false, error: 'You must be logged in to update your profile.' };
    }

    await updateUserProfile({
      userId: currentUser.id,
      fullName: input.fullName,
      phone: input.phone,
      favoriteClub: input.favoriteClub,
    });

    revalidatePath('/dashboard');
    revalidatePath('/dashboard/profile');
    revalidatePath('/', 'layout');
    return { success: true };
  } catch (err) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update profile.',
    };
  }
}
