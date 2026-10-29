import React from 'react';
import { Settings } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { getSupabasePublicConfig } from '@/lib/supabase/config';
import { AdminSettingsClient } from '@/components/admin/AdminSettingsClient';

export const dynamic = 'force-dynamic';

export default async function AdminSettingsPage() {
  await requireAdminUser();
  const { isConfigured, bucket } = getSupabasePublicConfig();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <Settings className="h-4 w-4" />
          <span>System Governance</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          Platform Settings &amp; Admin Initialization
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Configure administrator roles, inspect Supabase database &amp; storage status, and review
          security rules.
        </p>
      </div>

      <AdminSettingsClient
        isSupabaseCloudConfigured={isConfigured}
        storageBucket={bucket}
      />
    </div>
  );
}
