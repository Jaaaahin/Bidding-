'use client';

import React, { useState } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldCheck, UserCheck, Database } from 'lucide-react';
import { promoteAdminBootstrapAction } from '@/app/actions/admin';
import { useToast } from '@/components/ui/ToastProvider';

interface AdminSettingsClientProps {
  isSupabaseCloudConfigured: boolean;
  storageBucket: string;
}

export function AdminSettingsClient({
  isSupabaseCloudConfigured,
  storageBucket,
}: AdminSettingsClientProps) {
  const router = useRouter();
  const { showToast } = useToast();
  const [targetEmail, setTargetEmail] = useState('');
  const [isPromoting, setIsPromoting] = useState(false);

  const handlePromote = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!targetEmail.trim()) return;
    setIsPromoting(true);
    try {
      const res = await promoteAdminBootstrapAction({
        targetEmail: targetEmail.trim(),
      });
      if (!res.success) {
        showToast({
          title: 'Promotion Failed',
          description: res.error || 'Could not promote user.',
          variant: 'error',
        });
        return;
      }
      setTargetEmail('');
      showToast({
        title: 'Administrator Granted',
        description: res.message || 'User promoted to admin.',
        variant: 'success',
      });
      router.refresh();
    } finally {
      setIsPromoting(false);
    }
  };

  return (
    <div className="space-y-6">
      {/* Database & Storage Telemetry */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <h2 className="flex items-center gap-2 text-lg font-extrabold text-white">
          <Database className="h-5 w-5 text-electric-400" />
          <span>Backend &amp; Storage Configuration</span>
        </h2>

        <div className="grid grid-cols-1 gap-4 sm:grid-cols-3 text-xs">
          <div className="rounded-xl border border-slate-800 bg-navy-950 p-4">
            <span className="text-slate-400 block">Database Engine</span>
            <strong className="mt-1 block text-sm text-electric-400">
              {isSupabaseCloudConfigured
                ? 'Supabase Cloud PostgreSQL'
                : 'Persistent Local PostgreSQL (0001_footbid_schema.sql)'}
            </strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-navy-950 p-4">
            <span className="text-slate-400 block">Storage Bucket</span>
            <strong className="mt-1 block text-sm text-white">{storageBucket}</strong>
          </div>
          <div className="rounded-xl border border-slate-800 bg-navy-950 p-4">
            <span className="text-slate-400 block">Authoritative Timezone</span>
            <strong className="mt-1 block text-sm text-sky-400">
              UTC Storage → Asia/Dhaka (BST) Display
            </strong>
          </div>
        </div>
      </div>

      {/* Promote Registered User to Admin */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-4">
        <div className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5 text-electric-400" />
          <h2 className="text-lg font-extrabold text-white">
            Grant Administrator Role to Registered User
          </h2>
        </div>
        <p className="text-xs text-slate-400">
          Public registration never grants admin access. As a verified administrator, you can
          elevate another registered account to <code>admin</code> using this server-side operation.
        </p>

        <form onSubmit={handlePromote} className="flex flex-col sm:flex-row gap-3 max-w-xl">
          <input
            type="email"
            required
            value={targetEmail}
            onChange={(e) => setTargetEmail(e.target.value)}
            placeholder="Enter registered user email..."
            className="flex-1 rounded-xl border border-slate-700 bg-navy-950 px-4 py-2.5 text-sm text-white placeholder-slate-500 focus:border-electric-500 focus:outline-none"
          />
          <button
            type="submit"
            disabled={isPromoting}
            className="inline-flex items-center justify-center gap-2 rounded-xl bg-electric-500 px-5 py-2.5 text-xs font-black uppercase tracking-wider text-navy-950 hover:bg-electric-400 disabled:opacity-50"
          >
            <UserCheck className="h-4 w-4" />
            <span>{isPromoting ? 'Promoting...' : 'Promote to Admin'}</span>
          </button>
        </form>
      </div>

      {/* Documented SQL Method for Initial Admin Creation */}
      <div className="rounded-2xl border border-slate-800 bg-navy-900/90 p-6 space-y-3">
        <h2 className="text-base font-extrabold text-white">
          Trusted Database SQL Method for Initial Admin Initialization
        </h2>
        <p className="text-xs text-slate-400">
          When setting up a fresh Supabase project in production, register your account via{' '}
          <code>/register</code>, then run this trusted SQL block in the Supabase SQL Editor to
          promote your account to <code>admin</code>:
        </p>
        <pre className="overflow-x-auto rounded-xl border border-slate-800 bg-navy-950 p-4 text-xs font-mono text-electric-400">
{`BEGIN;
SELECT set_config('app.allow_role_change', 'true', true);
UPDATE public.profiles
SET role = 'admin', updated_at = now()
WHERE email = 'your-admin-email@domain.com';
COMMIT;`}
        </pre>
      </div>
    </div>
  );
}
