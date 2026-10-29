import { createClient } from '@supabase/supabase-js';
import { getSupabasePublicConfig } from './config';

export function createServiceRoleSupabaseClient() {
  if (typeof window !== 'undefined') {
    throw new Error('Security Violation: Service role client must never be invoked in browser code.');
  }

  const { url, isConfigured } = getSupabasePublicConfig();
  const serviceRoleKey = process.env.SUPABASE_SERVICE_ROLE_KEY?.trim() || '';

  if (
    !isConfigured ||
    !serviceRoleKey ||
    serviceRoleKey === 'your-service-role-secret-key-placeholder'
  ) {
    return null;
  }

  return createClient(url, serviceRoleKey, {
    auth: {
      persistSession: false,
      autoRefreshToken: false,
    },
  });
}
