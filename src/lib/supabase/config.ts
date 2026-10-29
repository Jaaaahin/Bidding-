export function getSupabasePublicConfig() {
  const url = process.env.NEXT_PUBLIC_SUPABASE_URL?.trim() || '';
  const anonKey = process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY?.trim() || '';
  const bucket = process.env.NEXT_PUBLIC_SUPABASE_STORAGE_BUCKET?.trim() || 'player-photos';

  const isConfigured =
    Boolean(url) &&
    Boolean(anonKey) &&
    url.startsWith('https://') &&
    !url.includes('your-project-ref.supabase.co') &&
    anonKey !== 'your-public-anon-key-placeholder';

  return {
    url,
    anonKey,
    bucket,
    isConfigured,
  };
}
