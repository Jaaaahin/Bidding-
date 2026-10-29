'use client';

import { createBrowserClient } from '@supabase/ssr';
import { getSupabasePublicConfig } from './config';

export function createBrowserSupabaseClient() {
  const { url, anonKey, isConfigured } = getSupabasePublicConfig();
  if (!isConfigured) {
    return null;
  }
  return createBrowserClient(url, anonKey);
}
