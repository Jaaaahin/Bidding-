import React from 'react';
import { UserCog } from 'lucide-react';
import { requireAuthenticatedUser } from '@/lib/auth/session';
import { ProfileSettingsForm } from '@/components/profile/ProfileSettingsForm';

export const dynamic = 'force-dynamic';

export default async function ProfileSettingsPage() {
  const user = await requireAuthenticatedUser('/dashboard/profile');

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <UserCog className="h-4 w-4" />
          <span>Account Management</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">Profile Settings</h1>
        <p className="mt-1 text-xs text-slate-400">
          View and update your profile information, club affiliation, and contact details.
        </p>
      </div>

      <ProfileSettingsForm profile={user} />
    </div>
  );
}
