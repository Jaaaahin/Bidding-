import React from 'react';
import { UserPlus } from 'lucide-react';
import { requireAdminUser } from '@/lib/auth/session';
import { PlayerForm } from '@/components/admin/PlayerForm';

export const dynamic = 'force-dynamic';

export default async function AdminAddPlayerPage() {
  await requireAdminUser();

  return (
    <div className="space-y-6">
      <div className="border-b border-slate-800/80 pb-5">
        <div className="inline-flex items-center gap-2 text-xs font-extrabold uppercase tracking-wider text-electric-400">
          <UserPlus className="h-4 w-4" />
          <span>New Listing</span>
        </div>
        <h1 className="mt-1 text-2xl sm:text-3xl font-black text-white">
          Add New Football Player &amp; Auction Schedule
        </h1>
        <p className="mt-1 text-xs text-slate-400">
          Create a real database player listing, upload a player photograph, configure starting
          price and minimum bid increment, and schedule the auction window in Asia/Dhaka time.
        </p>
      </div>

      <PlayerForm />
    </div>
  );
}
